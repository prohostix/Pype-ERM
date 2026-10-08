import http from 'http';

http.get('http://localhost:5000/api/org/designations', {
  headers: {
    'Authorization': 'Bearer ' + (await require('./src/lib/prisma.js').default.user.findFirst({ where: { role: 'org_admin' } }).then((u: any) => u.id))
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const kochi = json.data.find((d: any) => d.title === 'BRANCH IN CHARGE KOCHI');
    console.log('API output for Kochi:', kochi);
  });
}).on('error', err => console.log(err));
