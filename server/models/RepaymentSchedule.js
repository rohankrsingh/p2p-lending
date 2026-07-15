import mongoose from 'mongoose';

const repaymentScheduleSchema = new mongoose.Schema(
  {
    fundedLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FundedLoan',
      required: true,
    },

    // Instalment number (1-based, e.g. 1 of 6)
    instalmentNumber: {
      type: Number,
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    // EMI amount calculated at funding time (never recalculated from client)
    emiAmount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },

    // Filled when status → 'paid'
    paidAt: {
      type: Date,
      default: null,
    },

    // Stripe PaymentIntent used for this instalment
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Agenda mark-overdue job: find pending instalments past due date
repaymentScheduleSchema.index({ fundedLoanId: 1, instalmentNumber: 1 });
repaymentScheduleSchema.index({ dueDate: 1, status: 1 });

export default mongoose.model('RepaymentSchedule', repaymentScheduleSchema);
