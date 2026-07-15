import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = platform/Stripe as source
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = platform/Stripe as destination
    },

    amount: {
      type: Number,
      required: true,
    },

    // Type of money movement
    type: {
      type: String,
      enum: ['funding', 'repayment', 'payout', 'fee'],
      required: true,
    },

    // Stripe PaymentIntent or Transfer ID
    stripeId: {
      type: String,
      default: null,
    },

    // Optional reference to the loan or repayment schedule
    loanRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanRequest',
      default: null,
    },
    fundedLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundedLoan',
      default: null,
    },
    repaymentScheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepaymentSchedule',
      default: null,
    },
  },
  { timestamps: true } // createdAt doubles as transaction timestamp
);

// Dashboard queries — lender payout history, borrower repayment history
transactionSchema.index({ fromUserId: 1, createdAt: -1 });
transactionSchema.index({ toUserId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
