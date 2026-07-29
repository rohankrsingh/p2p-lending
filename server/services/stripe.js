/**
 * Stripe service initializer.
 *
 * Import `stripe` from this file everywhere in the server —
 * ensures a single configured Stripe client is shared.
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY env variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

export default stripe;
