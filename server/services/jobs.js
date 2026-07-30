/**
 * Agenda job definitions for P2P Lending Platform.
 *
 * ── Day 21 ────────────────────────────────────────────────
 * mark-overdue              →  daily at 9:00 AM
 * send-repayment-reminder   →  daily at 9:00 AM (shared tick)
 */
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import FundedLoan from '../models/FundedLoan.js';

export default function registerJobs(agenda) {
  // ────────────────────────────────────────────────────────────────
  // Job: mark-overdue — set status to 'overdue' on past-due instalments
  // ────────────────────────────────────────────────────────────────
  agenda.define('mark-overdue', async (job) => {
    const now = new Date();

    const result = await RepaymentSchedule.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: now },
      },
      {
        $set: { status: 'overdue' },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Agenda] mark-overdue: ${result.modifiedCount} instalment(s) marked overdue`
      );
    }

    // Also update parent FundedLoan statuses
    const overdueLoanIds = await RepaymentSchedule.distinct('fundedLoanId', {
      status: 'overdue',
    });

    if (overdueLoanIds.length > 0) {
      await FundedLoan.updateMany(
        { _id: { $in: overdueLoanIds }, status: { $ne: 'defaulted' } },
        { $set: { status: 'defaulted' } }
      );
      console.log(
        `[Agenda] mark-overdue: ${overdueLoanIds.length} FundedLoan(s) marked defaulted`
      );
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Job: send-repayment-reminder — log upcoming due instalments
  // ────────────────────────────────────────────────────────────────
  agenda.define('send-repayment-reminder', async (job) => {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const upcoming = await RepaymentSchedule.find({
      status: 'pending',
      dueDate: {
        $gte: now,
        $lte: threeDaysLater,
      },
    }).populate({
      path: 'fundedLoanId',
      populate: [
        { path: 'borrowerId', select: 'name email' },
        { path: 'lenderId', select: 'name email' },
      ],
    });

    if (upcoming.length > 0) {
      console.log(
        `[Agenda] send-repayment-reminder: ${upcoming.length} instalment(s) due within 3 days`
      );
      for (const instalment of upcoming) {
        console.log(
          `  → ${instalment.fundedLoanId?.borrowerId?.name || 'Unknown'} owes ₹${instalment.emiAmount} by ${instalment.dueDate.toISOString().split('T')[0]}`
        );
      }
    } else {
      console.log('[Agenda] send-repayment-reminder: no upcoming instalments');
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Schedule the recurring jobs: daily at 9:00 AM
  // ────────────────────────────────────────────────────────────────
  (async () => {
    await agenda.every('0 9 * * *', 'mark-overdue');
    await agenda.every('0 9 * * *', 'send-repayment-reminder');
    console.log('[Agenda] Recurring jobs registered: mark-overdue, send-repayment-reminder (daily 9am)');
  })();
}
