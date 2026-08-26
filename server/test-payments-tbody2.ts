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

  const vUrl = 'https://www.dsms-tims.in/backend/web/index.php?r=master%2Fstudents%2Fview&ccid=2&admission_number=5369';
  const vRes = await client.get(vUrl);
  const $v = cheerio.load(vRes.data);
  
  const trs = $v('table').eq(4).find('tbody tr');
  console.log("tbody trs count:", trs.length);
}
run().then(() => console.log('Done')).catch(console.error);
