import mongoose from 'mongoose';

const loanRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Loan terms ─────────────────────────────────────────────
    amount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [1000, 'Minimum loan amount is ₹1,000'],
      max: [50000, 'Maximum loan amount is ₹50,000'],
    },
    tenure: {
      type: Number,
      enum: {
        values: [3, 6, 9, 12, 24],
        message: 'Tenure must be 3, 6, 9, 12, or 24 months',
      },
      required: [true, 'Tenure is required'],
    },
    // Platform-set interest rate (% per annum, e.g. 12 = 12% p.a.)
    interestRate: {
      type: Number,
      default: 12,
    },
    reason: {
      type: String,
      required: [true, 'Reason for loan is required'],
      maxlength: [300, 'Reason cannot exceed 300 characters'],
      trim: true,
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'funded', 'repaying', 'completed', 'defaulted'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Index for marketplace queries (lenders browsing pending loans)
loanRequestSchema.index({ status: 1, createdAt: -1 });
loanRequestSchema.index({ userId: 1 });

export default mongoose.model('LoanRequest', loanRequestSchema);
