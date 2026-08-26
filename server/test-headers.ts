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
  
  const headers = [];
  $p('table.table thead th').each((i, el) => {
    headers.push($p(el).text().trim());
  });
  console.log("Headers:", headers);
  
  const el = $p('table.table tbody tr').first();
  const tds = $p(el).find('td');
  
  const row = [];
  tds.each((i, td) => {
    row.push($p(td).text().trim().substring(0, 50));
  });
  console.log("First Row:", row);
}
run().then(() => console.log('Done')).catch(console.error);
