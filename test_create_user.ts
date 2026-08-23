async function run() {
  try {
    const loginRes = await fetch('http://13.232.188.79:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@pype.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));

    const token = loginData.token;

    const res = await fetch('http://13.232.188.79:5000/api/v1/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'testuser123@pype.com',
        password: 'password123',
        role: 'employee',
        designation: 'Tester',
        departmentId: undefined,
        subDepartmentId: undefined,
        reportingTo: undefined,
        branchId: undefined
      })
    });
    
    console.log(res.status);
    console.log(await res.text());
  } catch (err: any) {
    console.error(err);
  }
}
run();
