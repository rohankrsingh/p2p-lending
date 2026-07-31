import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const path = '/home/rohan/Documents/p2p/server';

await mongoose.connect(process.env.MONGO_URI);
const StripeEvent = (await import(`${path}/models/StripeEvent.js`)).default;

const events = await StripeEvent.find({}).sort({ createdAt: -1 }).limit(20).lean();
console.log(`=== StripeEvents (total ${events.length}) ===`);
for (const e of events) {
  console.log(`  ${e._id} | type: ${e.type} | createdAt: ${e.createdAt} | data: ${JSON.stringify(e.data).slice(0, 200)}`);
}
await mongoose.disconnect();
