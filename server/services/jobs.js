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

    // ── Send overdue email alerts (fire and forget) ───────────────
    // TODO: Re-enable when email service is configured
    // Find overdue instalments that were just updated, with borrower info
    // const overdueSchedules = await RepaymentSchedule.find({
    //   status: 'overdue',
    //   dueDate: { $lt: now },
    // }).populate({
    //   path: 'fundedLoanId',
    //   populate: { path: 'borrowerId', select: 'name email' },
    // });
    //
    // const sentEmails = new Set();
    // for (const s of overdueSchedules) {
    //   const borrower = s.fundedLoanId?.borrowerId;
    //   if (borrower && !sentEmails.has(borrower.email)) {
    //     sentEmails.add(borrower.email);
    //     sendOverdueEmail({
    //       borrowerEmail: borrower.email,
    //       borrowerName: borrower.name,
    //       amount: s.emiAmount,
    //       dueDate: s.dueDate,
    //       instalmentNumber: s.instalmentNumber,
    //     });
    //   }
    // }
  });

  // ────────────────────────────────────────────────────────────────
  // Job: send-repayment-reminder — send email 3 days before due date
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
      populate: { path: 'borrowerId', select: 'name email' },
    });

    if (upcoming.length > 0) {
      console.log(
        `[Agenda] send-repayment-reminder: ${upcoming.length} instalment(s) due within 3 days`
      );
      for (const instalment of upcoming) {
        const borrower = instalment.fundedLoanId?.borrowerId;
        console.log(
          `  → ${borrower?.name || 'Unknown'} owes ₹${instalment.emiAmount} by ${instalment.dueDate.toISOString().split('T')[0]}`
        );
        // TODO: Re-enable when email service is configured
        // if (borrower) {
        //   sendRepaymentReminderEmail({
        //     borrowerEmail: borrower.email,
        //     borrowerName: borrower.name,
        //     amount: instalment.emiAmount,
        //     dueDate: instalment.dueDate,
        //     instalmentNumber: instalment.instalmentNumber,
        //   });
        // }
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
