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

  const studentsUrl = 'https://www.dsms-tims.in/backend/web/index.php?r=master/students&page=2';
  const pRes = await client.get(studentsUrl);
  const $p = cheerio.load(pRes.data);
  
  const el = $p('table.table tbody tr').first();
  const tds = $p(el).find('td');
  
  console.log("Page 2 Admission No:", $p(tds[1]).text().trim());
  console.log("Page 2 Name:", $p(tds[2]).text().trim());

  const studentsUrl2 = 'https://www.dsms-tims.in/backend/web/index.php?r=master/students&page=3';
  const pRes2 = await client.get(studentsUrl2);
  const $p2 = cheerio.load(pRes2.data);
  
  const el2 = $p2('table.table tbody tr').first();
  const tds2 = $p2(el2).find('td');
  
  console.log("Page 3 Admission No:", $p2(tds2[1]).text().trim());
  console.log("Page 3 Name:", $p2(tds2[2]).text().trim());

  // Also check enquiry
  const enqUrl = 'https://www.dsms-tims.in/backend/web/index.php?r=enquiry/enquiry&page=2';
  const enqRes = await client.get(enqUrl);
  const $enq = cheerio.load(enqRes.data);
  const enqEl = $enq('table.table tbody tr').first();
  const enqTds = $enq(enqEl).find('td');
  console.log("Enquiry Page 2 Sl No:", $enq(enqTds[0]).text().trim(), "Name:", $enq(enqTds[1]).text().trim());
}
run().then(() => console.log('Done')).catch(console.error);
