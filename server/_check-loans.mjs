import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/rohan/Documents/p2p/server/.env' });
import path from 'path';

await mongoose.connect(process.env.MONGO_URI);
const LoanRequest = (await import('/home/rohan/Documents/p2p/server/models/LoanRequest.js')).default;
const FundedLoan = (await import('/home/rohan/Documents/p2p/server/models/FundedLoan.js')).default;
const Transaction = (await import('/home/rohan/Documents/p2p/server/models/Transaction.js')).default;
const RepaymentSchedule = (await import('/home/rohan/Documents/p2p/server/models/RepaymentSchedule.js')).default;
const User = (await import('/home/rohan/Documents/p2p/server/models/User.js')).default;

const loans = await LoanRequest.find({}).populate('userId', 'name email').lean();
console.log('=== LoanRequests ===');
for (const l of loans) {
  console.log(`  ${l._id} | amount: ₹${l.amount} | status: ${l.status} | fundedBy: ${l.fundedBy || 'N/A'} | borrower: ${l.userId?.name} | reason: ${l.reason?.slice(0, 30)}`);
}
const funded = await FundedLoan.find({}).populate('lender', 'name email').lean();
console.log('=== FundedLoans ===');
for (const f of funded) {
  console.log(`  ${f._id} | loanId: ${f.loanId} | lender: ${f.lender?.name} (${f.lender?.email}) | amount: ₹${f.amount} | status: ${f.status}`);
}
const txns = await Transaction.find({}).sort({ createdAt: -1 }).limit(20).lean();
console.log('=== Recent Transactions (last 20) ===');
for (const t of txns) {
  console.log(`  ${t._id} | user: ${t.user} | type: ${t.type} | amount: ₹${t.amount} | status: ${t.status} | desc: ${t.description?.slice(0, 40)}`);
}
const sched = await RepaymentSchedule.find({}).lean();
console.log('=== RepaymentSchedules ===');
for (const s of sched) {
  console.log(`  ${s._id} | loanId: ${s.loanId} | fundedLoanId: ${s.fundedLoanId} | instalments: ${s.schedule?.length} | status: ${s.status}`);
}
const users = await User.find({}).lean();
console.log('=== Users ===');
for (const u of users) {
  console.log(`  ${u._id} | ${u.email} | role: ${u.role} | wallet: ₹${u.walletBalance} | kyc: ${u.kycStatus} | stripeVerified: ${u.stripeVerified}`);
}
await mongoose.disconnect();
