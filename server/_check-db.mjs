import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI);

const LoanRequest = mongoose.model('LoanRequest', new mongoose.Schema({ status: String }, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({ role: String }, { strict: false }));

const byStatus = await LoanRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
const users = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);

console.log('LoanRequests by status:', JSON.stringify(byStatus));
console.log('Users by role:', JSON.stringify(users));

const pending = await LoanRequest.find({ status: 'pending' }).limit(2).select('amount tenure reason createdAt');
console.log('Sample pending loans:', JSON.stringify(pending));

await mongoose.disconnect();
