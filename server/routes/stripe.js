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
import { sendLoanFundedEmail, sendRepaymentReceivedEmail } from '../services/resend.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * Resolve the platform's SETTLEMENT currency + amount for a PaymentIntent.
 *
 * Test platforms are US-based, so INR charges are auto-converted by Stripe
 * (e.g. ₹10,000 -> $104.69). Connect transfers must be created in the
 * settlement currency — the platform's available balance only ever holds
 * that currency, so `currency: 'inr'` transfers always fail.
 */
// Stripe creates the charge's balance_transaction slightly AFTER the
// payment_intent.succeeded event is dispatched — a well-known race. Retry a
// few times so the FIRST webhook delivery succeeds instead of returning 500
// (which then depends on Stripe's backoff retry to eventually process the
// repayment). If it still isn't ready we throw; the 500 response makes Stripe
// retry the webhook, and the handler's idempotency guards prevent double work.
async function getSettlementAmount(paymentIntent) {
  if (!paymentIntent.latest_charge) {
    throw new Error(`PaymentIntent ${paymentIntent.id} has no latest_charge`);
  }
  const chargeId = paymentIntent.latest_charge;

  let charge;
  for (let attempt = 1; attempt <= 6; attempt++) {
    charge = await stripe.charges.retrieve(chargeId);
    if (charge.balance_transaction) break;
    if (attempt < 6) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!charge?.balance_transaction) {
    throw new Error(`Charge ${chargeId} has no balance_transaction after retries`);
  }
  const bt = await stripe.balanceTransactions.retrieve(charge.balance_transaction);
  return { amount: bt.amount, currency: bt.currency };
}

// ─────────────────────────────────────────────────────────
// Day 12: Create Stripe Connect Express account
// POST /api/stripe/create-connect-account
// Note: available to BOTH lenders (receive payouts) and
//       borrowers (receive loan disbursements).
// ─────────────────────────────────────────────────────────
router.post(
  '/create-connect-account',
  protect,
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
      // Note: country must match the platform's supported region.
      // Test platforms may be US-based; adjust for production.
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
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

      // Redirect back to the correct onboarding page for the user's role
      const onboardingPath =
        user.role === 'borrower'
          ? '/borrower/onboarding'
          : '/lender/onboarding';

      const accountLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${CLIENT_URL}${onboardingPath}?status=refresh`,
        return_url:  `${CLIENT_URL}${onboardingPath}?status=return`,
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

        // Verified only when BOTH details submitted AND charges enabled.
        // If requirements are no longer met, revoke the flag (no one-way lock).
        const verified = Boolean(account.details_submitted && account.charges_enabled);
        await User.findOneAndUpdate(
          { stripeAccountId: account.id },
          { stripeVerified: verified }
        );
        console.log(
          `[Stripe Webhook] Account ${account.id} verified=${verified}`
        );
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { loanRequestId, lenderId, borrowerId, type } = paymentIntent.metadata;

        // ── Loan funding payment ───────────────────────────────────
        if (type !== 'repayment') {
          if (!loanRequestId) {
            console.log('[Stripe Webhook] payment_intent.succeeded without loanRequestId metadata');
            break;
          }

          const session = await mongoose.startSession();

          try {
            await session.withTransaction(async () => {
              // Idempotency guard #1: only a loan still in 'pending' can be funded.
              // If this returns null the loan was already funded (webhook retry) —
              // verify a FundedLoan exists so we can skip instead of crashing.
              const loanRequest = await LoanRequest.findOneAndUpdate(
                { _id: loanRequestId, status: 'pending' },
                { status: 'funded' },
                { session, new: true }
              );

              if (!loanRequest) {
                const alreadyFunded = await FundedLoan.findOne({ loanRequestId }).session(session);
                if (alreadyFunded) {
                  console.log(`[Stripe Webhook] Loan ${loanRequestId} already funded, skipping (retry).`);
                  return; // committed no-op — prevents double-funding on webhook retry
                }
                throw new Error(`LoanRequest ${loanRequestId} not found or not pending`);
              }

              // Guard #2: amount charged must match the loan amount exactly
              const chargedAmount = Math.round(paymentIntent.amount || 0) / 100;
              if (chargedAmount !== loanRequest.amount) {
                throw new Error(
                  `Funding amount mismatch: charged ₹${chargedAmount}, loan ₹${loanRequest.amount}`
                );
              }

              // Guard #3: borrower must never fund their own loan
              if (loanRequest.userId.toString() === lenderId) {
                throw new Error('Self-funding is not allowed');
              }

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

              const instalments = generateSchedule(
                fundedLoanDoc._id,
                loanRequest.amount,
                loanRequest.interestRate,
                loanRequest.tenure,
                new Date()
              );
              await RepaymentSchedule.insertMany(instalments, { session });

              // Guard #4: borrower must have a Connect account to receive the
              // disbursement. Funding is gated at /loans/:id/fund, this is
              // defence-in-depth so the ledger never books an unreal transfer.
              const borrowerUser = await User.findById(borrowerId).session(session);
              if (!borrowerUser?.stripeAccountId) {
                throw new Error(`Borrower ${borrowerId} has no Stripe Connect account for disbursement`);
              }

              // Disbursement: real transfer of the principal to the borrower's
              // Connect account (platform acts as escrow between lender & borrower).
              // Amount/currency come from the charge's balance transaction — the
              // platform settles in USD (INR charges auto-convert), so an INR
              // transfer would always fail with "insufficient available funds".
              const settle = await getSettlementAmount(paymentIntent);
              const disbursalTransfer = await stripe.transfers.create(
                {
                  amount: settle.amount,
                  currency: settle.currency,
                  destination: borrowerUser.stripeAccountId,
                  transfer_group: fundedLoanDoc._id.toString(),
                  metadata: {
                    type: 'loan_disbursal',
                    loanRequestId: loanRequest._id.toString(),
                    fundedLoanId: fundedLoanDoc._id.toString(),
                  },
                },
                // Key includes the fundedLoan id so that a webhook retry that
                // re-creates the FundedLoan (fresh ObjectId) doesn't collide
                // with a previously-cached idempotency key from a failed run.
                { idempotencyKey: `disbursal-${paymentIntent.id}-${fundedLoanDoc._id.toString()}` }
              );

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

              // Platform → borrower payout (the actual disbursement)
              await Transaction.create(
                [{
                  fromUserId: null, // platform escrow
                  toUserId: borrowerId,
                  amount: loanRequest.amount,
                  type: 'payout',
                  stripeId: disbursalTransfer.id,
                  loanRequestId: loanRequest._id,
                  fundedLoanId: fundedLoanDoc._id,
                }],
                { session }
              );
            });
          } catch (transactionErr) {
            console.error('[Stripe Webhook] Funding transaction failed:', transactionErr.message);
            throw transactionErr;
          } finally {
            await session.endSession();
          }
          console.log(`[Stripe Webhook] Successfully funded loan ${loanRequestId}`);

          // Send loan-funded email to borrower (fire and forget)
          User.findById(borrowerId).then(async (user) => {
            if (user) {
              const loanReq = await LoanRequest.findById(loanRequestId).catch(() => null);
              sendLoanFundedEmail({
                borrowerEmail: user.email,
                borrowerName: user.name,
                amount: Math.round(paymentIntent.amount || 0) / 100,
                tenure: loanReq?.tenure,
              });
            }
          }).catch(() => {});
        }

        // ── Repayment payment ─────────────────────────────────────
        else {
          const { repaymentScheduleId, fundedLoanId, borrowerId: rb, lenderId: rl, emiAmount } = paymentIntent.metadata;

          if (!repaymentScheduleId) {
            console.log('[Stripe Webhook] repayment payment without repaymentScheduleId metadata');
            break;
          }

          const repaymentAmount = parseFloat(emiAmount || '0');
          const PLATFORM_FEE_RATE = 0.02; // 2% platform fee
          const platformFee = Math.round(repaymentAmount * PLATFORM_FEE_RATE * 100) / 100;
          const lenderPayout = repaymentAmount - platformFee;

          const session = await mongoose.startSession();

          try {
            await session.withTransaction(async () => {
              const repayment = await RepaymentSchedule.findById(repaymentScheduleId).session(session);
              if (!repayment) throw new Error(`RepaymentSchedule ${repaymentScheduleId} not found`);

              if (repayment.status === 'paid') {
                console.log(`[Stripe Webhook] Repayment ${repaymentScheduleId} already paid, skipping`);
                return;
              }

              // 1. Mark schedule as paid
              repayment.status = 'paid';
              repayment.paidAt = new Date();
              repayment.stripePaymentIntentId = paymentIntent.id;
              await repayment.save({ session });

              // 2. Update FundedLoan outstanding balance using the PRINCIPAL
              //    component of this instalment (not the full EMI, which
              //    includes interest and would understate the balance).
              const fundedLoan = await FundedLoan.findById(fundedLoanId).session(session);
              if (!fundedLoan) throw new Error(`FundedLoan ${fundedLoanId} not found`);

              const principalPaid =
                typeof repayment.principalComponent === 'number' && repayment.principalComponent > 0
                  ? repayment.principalComponent
                  : repaymentAmount; // legacy schedules without split: fall back to old behaviour
              fundedLoan.outstandingBalance = Math.max(
                0,
                Math.round((fundedLoan.outstandingBalance - principalPaid) * 100) / 100
              );

              // Recovery: a payment after default flips the loan back to
              // 'repaying'. defaultedAt is kept as history of the event.
              if (fundedLoan.status !== 'completed') {
                fundedLoan.status = 'repaying';
                fundedLoan.missedPayments = Math.max(0, (fundedLoan.missedPayments || 0) - 1);
              }
              await fundedLoan.save({ session });

              // 3. Transfer lender payout (98% of EMI) to the lender's
              //    STRIPE CONNECT ACCOUNT (never a Mongo id!). Idempotency key
              //    makes retries after a crash safe.
              if (lenderPayout > 0) {
                const lenderUser = await User.findById(rl).session(session);
                if (!lenderUser?.stripeAccountId) {
                  throw new Error(`Lender ${rl} has no Stripe Connect account — cannot pay out`);
                }

                // Transfers must be in the platform's settlement currency.
                // The 98/2 split is applied to the settled (converted) amount.
                const settle = await getSettlementAmount(paymentIntent);
                const lenderPayoutSettled = Math.round(settle.amount * (1 - PLATFORM_FEE_RATE));
                const platformFeeSettled = settle.amount - lenderPayoutSettled;

                await stripe.transfers.create(
                  {
                    amount: lenderPayoutSettled,
                    currency: settle.currency,
                    destination: lenderUser.stripeAccountId,
                    transfer_group: repaymentScheduleId,
                    metadata: {
                      type: 'repayment_payout',
                      repaymentScheduleId,
                      fundedLoanId,
                    },
                  },
                  { idempotencyKey: `repayment-payout-${repaymentScheduleId}-${paymentIntent.id}` }
                );
                console.log(
                  `[Stripe Webhook] Repayment payout ${settle.currency} ${lenderPayoutSettled} (fee ${platformFeeSettled}) sent to lender ${lenderUser.stripeAccountId}`
                );
              }

              // 4. Create repayment transaction (borrower → lender, NET of fee)
              //    so the ledger books exactly 100%: 98% to lender + 2% platform fee.
              await Transaction.create(
                [{
                  fromUserId: rb,
                  toUserId: rl,
                  amount: lenderPayout,
                  type: 'repayment',
                  stripeId: paymentIntent.id,
                  fundedLoanId: fundedLoan._id,
                  repaymentScheduleId: repayment._id,
                }],
                { session }
              );

              // 5. Create platform fee transaction (borrower → platform)
              if (platformFee > 0) {
                await Transaction.create(
                  [{
                    fromUserId: rb,
                    toUserId: null, // platform fee
                    amount: platformFee,
                    type: 'fee',
                    stripeId: paymentIntent.id,
                    fundedLoanId: fundedLoan._id,
                    repaymentScheduleId: repayment._id,
                  }],
                  { session }
                );
              }

              // ── Auto-complete loan when every instalment is paid ──
              const remainingUnpaid = await RepaymentSchedule.countDocuments({
                fundedLoanId: fundedLoan._id,
                status: { $ne: 'paid' },
              }).session(session);

              if (remainingUnpaid === 0) {
                fundedLoan.status = 'completed';
                await fundedLoan.save({ session });

                // Keep LoanRequest in sync with FundedLoan (M5)
                await LoanRequest.findByIdAndUpdate(
                  fundedLoan.loanRequestId,
                  { status: 'completed' },
                  { session }
                );
                console.log(`[Stripe Webhook] Loan ${fundedLoanId} fully repaid and completed`);
              } else if (fundedLoan.status !== 'completed') {
                // Keep LoanRequest in sync during the repayment phase
                await LoanRequest.findByIdAndUpdate(
                  fundedLoan.loanRequestId,
                  { status: 'repaying' },
                  { session }
                );
              }
            });
          } catch (transactionErr) {
            console.error('[Stripe Webhook] Repayment transaction failed:', transactionErr.message);
            throw transactionErr;
          } finally {
            await session.endSession();
          }
          console.log(`[Stripe Webhook] Successfully processed repayment ${repaymentScheduleId}`);

          // Send repayment-received email to lender (fire and forget)
          const lenderUser = await User.findById(rl);
          const borrowerUser = await User.findById(rb);
          if (lenderUser) {
            sendRepaymentReceivedEmail({
              lenderEmail: lenderUser.email,
              lenderName: lenderUser.name,
              amount: lenderPayout,
              borrowerName: borrowerUser?.name || 'Borrower',
              instalmentNumber: parseInt(paymentIntent.metadata.instalmentNumber || '0'),
            });
          }
        }
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
