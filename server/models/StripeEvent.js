import mongoose from 'mongoose';

const stripeEventSchema = new mongoose.Schema(
  {
    _id: {
      type: String, // Stripe event IDs are strings, we use them as primary keys
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('StripeEvent', stripeEventSchema);
