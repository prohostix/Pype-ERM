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

  const studentsUrl = 'https://www.dsms-tims.in/backend/web/index.php?r=master/students/view&id=5369';
  const pRes = await client.get(studentsUrl);
  const $v = cheerio.load(pRes.data);
  
  const pHeaders = [];
  $v('table').eq(3).find('th').each((i, el) => {
    pHeaders.push($v(el).text().trim());
  });
  console.log("Payment Headers:", pHeaders);
  
  const pRow = [];
  $v('table').eq(3).find('tr').eq(1).find('td').each((i, td) => {
    pRow.push($v(td).text().trim().substring(0, 50));
  });
  console.log("Payment First Row:", pRow);
}
run().then(() => console.log('Done')).catch(console.error);
