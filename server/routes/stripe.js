/**
 * Stripe Connect routes
 *
 * Day 12 — POST /api/stripe/create-connect-account
 *   Create a Stripe Express Connected Account and save stripeAccountId to user.
 *
 * Day 13 — POST /api/stripe/onboarding-link
 *            GET  /api/stripe/onboarding-return
 *   Generate onboarding link and handle the return redirect.
 *
 * Day 14 — POST /api/stripe/webhook
 *   Verify webhook signature and handle Stripe events.
 */
import express from 'express';
import mongoose from 'mongoose';
import stripe from '../services/stripe.js';
import User from '../models/User.js';
import StripeEvent from '../models/StripeEvent.js';
import LoanRequest from '../models/LoanRequest.js';
import FundedLoan from '../models/FundedLoan.js';
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import Transaction from '../models/Transaction.js';
import { generateSchedule } from '../utils/emi.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────
// Day 12: Create Stripe Connect Express account
// POST /api/stripe/create-connect-account
// ─────────────────────────────────────────────────────────
router.post(
  '/create-connect-account',
  protect,
  requireRole('lender'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      // Idempotent — return existing account if already created
      if (user.stripeAccountId) {
        return res.json({
          stripeAccountId: user.stripeAccountId,
          alreadyExists: true,
        });
      }

      // Create a Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'IN',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId: user._id.toString(),
        },
      });

      // Save account ID to user
      user.stripeAccountId = account.id;
      await user.save();

      return res.status(201).json({
        stripeAccountId: account.id,
        alreadyExists: false,
      });
    } catch (err) {
      console.error('[Stripe] create-connect-account error:', err.message);
      return res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────
// Day 13: Generate onboarding link
// POST /api/stripe/onboarding-link
// ─────────────────────────────────────────────────────────
router.post(
  '/onboarding-link',
  protect,
  requireRole('lender'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user.stripeAccountId) {
        return res
          .status(400)
          .json({ message: 'Create a Stripe account first.' });
      }

      const CLIENT_URL =
        process.env.CLIENT_URL || 'http://localhost:5173';

      const accountLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${CLIENT_URL}/lender/onboarding?status=refresh`,
        return_url:  `${CLIENT_URL}/lender/onboarding?status=return`,
        type: 'account_onboarding',
      });

      return res.json({ url: accountLink.url });
    } catch (err) {
      console.error('[Stripe] onboarding-link error:', err.message);
      return res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────
// Day 13: Check onboarding return — mark user as verified
// GET /api/stripe/onboarding-return
// ─────────────────────────────────────────────────────────
router.get(
  '/onboarding-return',
  protect,
  requireRole('lender'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user.stripeAccountId) {
        return res
          .status(400)
          .json({ message: 'No Stripe account on file.' });
      }

      // Retrieve the account from Stripe to check details_submitted
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      if (account.details_submitted && account.charges_enabled) {
        user.stripeVerified = true;
        await user.save();
      }

      return res.json({
        stripeVerified: user.stripeVerified,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
      });
    } catch (err) {
      console.error('[Stripe] onboarding-return error:', err.message);
      return res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────
// Day 13: Get account status (used by frontend banner)
// GET /api/stripe/account-status
// ─────────────────────────────────────────────────────────
router.get(
  '/account-status',
  protect,
  requireRole('lender'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user.stripeAccountId) {
        return res.json({
          hasAccount: false,
          stripeVerified: false,
        });
      }

      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      return res.json({
        hasAccount: true,
        stripeAccountId: user.stripeAccountId,
        stripeVerified: user.stripeVerified,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (err) {
      console.error('[Stripe] account-status error:', err.message);
      return res.status(500).json({ message: err.message });
    }
  }
);

// ─────────────────────────────────────────────────────────
// Day 14: Webhook handler — signature verification
// POST /api/stripe/webhook
// Note: Must be mounted BEFORE express.json() in index.js
//       because it needs the raw body for signature check.
// ─────────────────────────────────────────────────────────
export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency check
  const alreadyProcessed = await StripeEvent.findById(event.id);
  if (alreadyProcessed) {
    console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
    return res.json({ received: true, skipped: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;
        if (account.details_submitted && account.charges_enabled) {
          await User.findOneAndUpdate(
            { stripeAccountId: account.id },
            { stripeVerified: true }
          );
          console.log(`[Stripe Webhook] Verified account ${account.id}`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { loanRequestId, lenderId, borrowerId } = paymentIntent.metadata;

        if (!loanRequestId) {
          console.log('[Stripe Webhook] payment_intent.succeeded without loanRequestId metadata');
          break;
        }

        const session = await mongoose.startSession();

        try {
          await session.withTransaction(async () => {
            // 1. Update LoanRequest status to funded
            const loanRequest = await LoanRequest.findByIdAndUpdate(
              loanRequestId,
              { status: 'funded' },
              { session, new: true }
            );

            if (!loanRequest) {
              throw new Error(`LoanRequest ${loanRequestId} not found`);
            }

            // 2. Create FundedLoan
            const fundedLoan = await FundedLoan.create(
              [{
                loanRequestId: loanRequest._id,
                lenderId: lenderId,
                borrowerId: borrowerId,
                fundedAmount: loanRequest.amount,
                outstandingBalance: loanRequest.amount,
                stripePaymentIntentId: paymentIntent.id,
                status: 'active',
              }],
              { session }
            );
            const fundedLoanDoc = fundedLoan[0];

            // 3. Generate RepaymentSchedule instalments
            // generateSchedule is already imported at the top
            const instalments = generateSchedule(
              fundedLoanDoc._id,
              loanRequest.amount,
              loanRequest.interestRate,
              loanRequest.tenure,
              new Date()
            );
            await RepaymentSchedule.insertMany(instalments, { session });

            // 4. Create Transaction Log
            await Transaction.create(
              [{
                fromUserId: lenderId,
                toUserId: borrowerId,
                amount: loanRequest.amount,
                type: 'funding',
                stripeId: paymentIntent.id,
                loanRequestId: loanRequest._id,
                fundedLoanId: fundedLoanDoc._id,
              }],
              { session }
            );
          });
        } catch (transactionErr) {
          console.error('[Stripe Webhook] Transaction failed:', transactionErr.message);
          throw transactionErr;
        } finally {
          await session.endSession();
        }
        console.log(`[Stripe Webhook] Successfully funded loan ${loanRequestId}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await StripeEvent.create({ _id: event.id, type: event.type });
    return res.json({ received: true });
  } catch (handlerErr) {
    console.error('[Stripe Webhook] Handler error:', handlerErr.message);
    return res.status(500).json({ message: 'Webhook handler error' });
  }
};

export default router;
