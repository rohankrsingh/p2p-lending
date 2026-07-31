import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '/home/rohan/Documents/p2p/server/.env' });

await mongoose.connect(process.env.MONGO_URI);
const StripeEvent = (await import('/home/rohan/Documents/p2p/server/models/StripeEvent.js')).default;

const events = await StripeEvent.find({}).sort({ processedAt: -1 }).limit(20).lean();
console.log(`=== StripeEvents (last ${events.length}) ===`);
for (const e of events) {
  console.log(`  ${e._id} | type: ${e.type} | processedAt: ${e.processedAt}`);
}
await mongoose.disconnect();
