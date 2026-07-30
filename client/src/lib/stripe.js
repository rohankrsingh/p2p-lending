/**
 * Stripe client initialiser.
 *
 * Singleton promise for loadStripe — import once and use everywhere.
 * The publishable key comes from VITE_STRIPE_PUBLISHABLE_KEY in .env.
 */
import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!publishableKey || publishableKey === 'pk_test_...') {
  console.warn(
    '[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set. ' +
    'Set it in client/.env for payment features to work.'
  )
}

export const stripePromise = loadStripe(publishableKey)
