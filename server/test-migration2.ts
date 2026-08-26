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
  
  const el = $p('table.table tbody tr').first();
  const tds = $p(el).find('td');
  
  console.log("Admission No:", $p(tds[1]).text().trim());
  console.log("Name:", $p(tds[2]).text().trim());
  
  const viewHref = $p(el).find('a[title="View"]').attr('href') || $p(el).find('a').first().attr('href');
  if (viewHref) {
    const vUrl = `https://www.dsms-tims.in${viewHref}`;
    const vRes = await client.get(vUrl);
    const $v = cheerio.load(vRes.data);
    
    const meta: any = {};
    $v('table').eq(1).find('tr').each((i: number, el: any) => {
      const key = $v(el).find('th').text().trim();
      const val = $v(el).find('td').text().trim();
      if (key && val) {
        meta[key] = val;
      }
    });
    console.log("Extracted Meta:", meta);
  }
}
run().then(() => console.log('Done')).catch(console.error);
