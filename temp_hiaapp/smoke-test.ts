// No import needed for native fetch in Node 18+

async function smokeTest() {
  console.log('--- HIA Smoke Test ---');
  
  // 1. Check Health Endpoint
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const healthData = await healthRes.json();
    console.log('✅ Health Check:', healthData);
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
  }

  // 2. Check Environment Variables
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL ? '✅ Set' : '❌ Missing');

  // 3. Attempt to Register a Test User (if possible)
  try {
    const registerRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        displayName: 'Test User'
      })
    });
    const registerData = await registerRes.json();
    if (registerRes.ok) {
      console.log('✅ Registration Test: Success');
    } else {
      console.log('❌ Registration Test Failed:', registerData.error || registerData.details);
    }
  } catch (error) {
    console.error('❌ Registration Test Error:', error.message);
  }
}

smokeTest();
