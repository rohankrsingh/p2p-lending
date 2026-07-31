/**
 * Agenda job definitions for P2P Lending Platform.
 *
 * ── Daily at 9:00 AM ──────────────────────────────────────────
 * mark-overdue            → grace period, missed counter, defaults
 * send-repayment-reminder → 3-day reminder emails (deduped)
 */
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import FundedLoan from '../models/FundedLoan.js';
import LoanRequest from '../models/LoanRequest.js';
import { sendOverdueEmail, sendRepaymentReminderEmail } from './resend.js';

// A payment only becomes 'overdue' after this many days past due
const GRACE_DAYS = 3;
// A loan is 'defaulted' only after this many instalments are overdue
const DEFAULT_THRESHOLD = 2;

export default function registerJobs(agenda) {
  // ────────────────────────────────────────────────────────────────
  // Job: mark-overdue — grace period → overdue → missed counter → default
  // ────────────────────────────────────────────────────────────────
  agenda.define('mark-overdue', async (job) => {
    const now = new Date();
    const graceCutoff = new Date(now);
    graceCutoff.setDate(graceCutoff.getDate() - GRACE_DAYS);

    // 1. Mark 'pending' instalments overdue ONLY after the grace period
    const result = await RepaymentSchedule.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: graceCutoff },
      },
      {
        $set: { status: 'overdue', overdueAt: now },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Agenda] mark-overdue: ${result.modifiedCount} instalment(s) marked overdue`
      );
    }

    // 2. Recompute the missed-payment counter for every loan with an
    //    overdue instalment (count of overdue instalments = missed payments,
    //    since repayments are enforced in order).
    const overdueCounts = await RepaymentSchedule.aggregate([
      { $match: { status: 'overdue' } },
      { $group: { _id: '$fundedLoanId', missed: { $sum: 1 } } },
    ]);

    if (overdueCounts.length > 0) {
      const writes = overdueCounts.map(({ _id, missed }) => ({
        updateOne: {
          filter: { _id, status: { $ne: 'defaulted' } },
          update: { $set: { missedPayments: missed } },
        },
      }));
      await FundedLoan.bulkWrite(writes);

      // 3. Default loans that crossed the threshold (keeps history via defaultedAt)
      const toDefault = overdueCounts
        .filter(({ missed }) => missed >= DEFAULT_THRESHOLD)
        .map(({ _id }) => _id);

      if (toDefault.length > 0) {
        const defaultRes = await FundedLoan.updateMany(
          { _id: { $in: toDefault }, status: { $ne: 'defaulted' } },
          { $set: { status: 'defaulted', defaultedAt: now } }
        );
        if (defaultRes.modifiedCount > 0) {
          console.log(
            `[Agenda] mark-overdue: ${defaultRes.modifiedCount} FundedLoan(s) marked defaulted`
          );
        }

        // Keep LoanRequest in sync (M5): mirror the defaulted status
        const defaultedLoans = await FundedLoan.find(
          { _id: { $in: toDefault }, status: 'defaulted' },
          'loanRequestId'
        );
        const defaultedReqIds = defaultedLoans.map((l) => l.loanRequestId);
        if (defaultedReqIds.length > 0) {
          await LoanRequest.updateMany(
            { _id: { $in: defaultedReqIds }, status: { $ne: 'defaulted' } },
            { $set: { status: 'defaulted' } }
          );
        }
      }
    }

    // 4. Send overdue email alerts (fire and forget)
    const overdueSchedules = await RepaymentSchedule.find({
      status: 'overdue',
      overdueAt: { $exists: true },
    }).populate({
      path: 'fundedLoanId',
      populate: { path: 'borrowerId', select: 'name email' },
    });

    const sentEmails = new Set();
    for (const s of overdueSchedules) {
      const borrower = s.fundedLoanId?.borrowerId;
      if (borrower && !sentEmails.has(borrower.email)) {
        sentEmails.add(borrower.email);
        sendOverdueEmail({
          borrowerEmail: borrower.email,
          borrowerName: borrower.name,
          amount: s.emiAmount,
          dueDate: s.dueDate,
          instalmentNumber: s.instalmentNumber,
        });
      }
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Job: send-repayment-reminder — send email 3 days before due date
  // (idempotent: remindedAt prevents re-sending on subsequent runs)
  // ────────────────────────────────────────────────────────────────
  agenda.define('send-repayment-reminder', async (job) => {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const upcoming = await RepaymentSchedule.find({
      status: 'pending',
      remindedAt: null, // never reminded before
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
        if (borrower) {
          sendRepaymentReminderEmail({
            borrowerEmail: borrower.email,
            borrowerName: borrower.name,
            amount: instalment.emiAmount,
            dueDate: instalment.dueDate,
            instalmentNumber: instalment.instalmentNumber,
          });
          // Mark as reminded so the next daily run skips it
          await RepaymentSchedule.updateOne(
            { _id: instalment._id },
            { $set: { remindedAt: now } }
          );
        }
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

