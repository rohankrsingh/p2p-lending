import mongoose from 'mongoose';

const fundedLoanSchema = new mongoose.Schema(
  {
    loanRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanRequest',
      required: true,
      unique: true, // one funded loan per request
    },
    lenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Financials ─────────────────────────────────────────────
    fundedAmount: {
      type: Number,
      required: true,
    },
    outstandingBalance: {
      type: Number,
      required: true,
    },

    // ── Stripe ─────────────────────────────────────────────────
    stripePaymentIntentId: {
      type: String,
      required: true,
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'repaying', 'completed', 'defaulted'],
      default: 'active',
    },

    // ── Default tracking (grace + recovery history) ────────────
    // Number of instalments currently overdue for this loan. A loan is
    // only marked 'defaulted' once this reaches the default threshold.
    missedPayments: {
      type: Number,
      default: 0,
    },
    // When the loan became defaulted. Deliberately NOT cleared when a
    // borrower recovers — it remains as history of the default event.
    defaultedAt: {
      type: Date,
      default: null,
    },

    fundedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for dashboard queries
fundedLoanSchema.index({ lenderId: 1, status: 1 });
fundedLoanSchema.index({ borrowerId: 1, status: 1 });

export default mongoose.model('FundedLoan', fundedLoanSchema);
