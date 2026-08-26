import axios from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

async function run() {
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));
  
  const loginUrl = 'https://www.dsms-tims.in/backend/web/index.php?r=site%2Flogin';
  const response = await client.get(loginUrl);
  const $ = cheerio.load(response.data);
  const csrfToken = $('meta[name="csrf-token"]').attr('content');

  const loginData = new URLSearchParams();
  loginData.append('_csrf', csrfToken || '');
  loginData.append('LoginForm[username]', 'shameemtims25');
  loginData.append('LoginForm[password]', '859010');
  loginData.append('LoginForm[rememberMe]', '0');
  loginData.append('login-button', '');

  await client.post(loginUrl, loginData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': loginUrl }
  });

  const studentsUrl = 'https://www.dsms-tims.in/backend/web/index.php?r=master/students';
  const pRes = await client.get(studentsUrl);
  const $p = cheerio.load(pRes.data);
  
  const viewHref = $p('table.table tbody tr').first().find('a[title="View"]').attr('href');
  if (!viewHref) throw new Error("No view href found");

  const vUrl = 'https://www.dsms-tims.in' + (viewHref.startsWith('/') ? viewHref : '/' + viewHref);
  console.log("Visiting:", vUrl);
  
  const vRes = await client.get(vUrl);
  const $v = cheerio.load(vRes.data);
  
  $v('table').each((i, table) => {
    console.log(`Table ${i} Headers:`, $v(table).find('th').map((_, el) => $v(el).text().trim()).get());
  });

}
run().then(() => console.log('Done')).catch(console.error);
