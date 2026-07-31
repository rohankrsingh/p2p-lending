import 'dotenv/config';
import mongoose from 'mongoose';

// SAFETY GUARD — this script registers a real user against the DEPLOYED
// backend (and writes to the production database). It must never run
// silently. Set ALLOW_DEPLOYED_TEST=true to explicitly opt in.
if (process.env.ALLOW_DEPLOYED_TEST !== 'true') {
  console.error(
    'Refusing to run: _test-deployed.mjs hits the DEPLOYED API and writes to the production DB.\n' +
    'Set ALLOW_DEPLOYED_TEST=true to run this smoke test deliberately.'
  );
  process.exit(1);
}

const BASE = 'https://p2p-server-six.vercel.app/api';
const email = `mkt-test-${Date.now()}@example.com`;

try {
  // 1. Register test lender
  const reg = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Marketplace Tester', email, password: 'Test@12345', role: 'lender' }),
  });
  const regData = await reg.json();
  console.log('register:', reg.status, regData.user?.email || regData.message);

  // 2. Login
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Test@12345' }),
  });
  const loginData = await login.json();
  console.log('login:', login.status, loginData.user?.role || loginData.message);

  // 3. Fetch marketplace with token
  const mkt = await fetch(`${BASE}/loans/marketplace?page=1&limit=6&sort=newest`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const mktData = await mkt.json();
  console.log('marketplace:', mkt.status, 'loans:', mktData.loans?.length, 'total:', mktData.pagination?.total);
  if (mktData.loans?.length) {
    console.log('first loan:', JSON.stringify({ id: mktData.loans[0]._id, amount: mktData.loans[0].amount, tenure: mktData.loans[0].tenure, status: mktData.loans[0].status }));
  }

  // 4. Loan detail (schedulePreview used by the dialog)
  if (mktData.loans?.length) {
    const id = mktData.loans[0]._id;
    const detail = await fetch(`${BASE}/loans/${id}`, {
      headers: { Authorization: `Bearer ${loginData.token}` },
    });
    const detailData = await detail.json();
    console.log('detail:', detail.status, 'has schedulePreview:', Array.isArray(detailData.schedulePreview), 'emi:', detailData.emi);
  }

  // 5. Cleanup: delete test user from DB
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({ email: String }, { strict: false }));
  await User.deleteOne({ email });
  console.log('cleanup: removed test user');
  await mongoose.disconnect();
} catch (err) {
  console.error('ERROR:', err.message);
  process.exitCode = 1;
}
