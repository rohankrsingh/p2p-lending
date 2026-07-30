import express from 'express';
import stripe from '../services/stripe.js';
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import FundedLoan from '../models/FundedLoan.js';
import Transaction from '../models/Transaction.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/repayments/borrower
 * Fetch all repayment instalments for the logged-in borrower
 */
router.get('/borrower', protect, requireRole('borrower'), async (req, res) => {
  try {
    const fundedLoans = await FundedLoan.find({ borrowerId: req.user.id });
    const fundedLoanIds = fundedLoans.map((l) => l._id);

    const schedules = await RepaymentSchedule.find({
      fundedLoanId: { $in: fundedLoanIds },
    })
      .populate({
        path: 'fundedLoanId',
        populate: {
          path: 'loanRequestId',
          select: 'amount tenure reason interestRate',
        },
      })
      .sort({ dueDate: 1 });

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/repayments/:scheduleId/pay
 * Borrower initiates an EMI PaymentIntent via Stripe
 */
router.post('/:scheduleId/pay', protect, requireRole('borrower'), async (req, res) => {
  try {
    const repayment = await RepaymentSchedule.findById(req.params.scheduleId);
    if (!repayment) {
      return res.status(404).json({ message: 'Repayment instalment not found' });
    }

    if (repayment.status === 'paid') {
      return res.status(400).json({ message: 'Instalment is already paid' });
    }

    const fundedLoan = await FundedLoan.findById(repayment.fundedLoanId);
    if (!fundedLoan) {
      return res.status(404).json({ message: 'Associated funded loan not found' });
    }

    if (fundedLoan.borrowerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not your loan' });
    }

    // Create a Stripe PaymentIntent for this EMI
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(repayment.emiAmount * 100),
      currency: 'inr',
      payment_method_types: ['card'],
      metadata: {
        type: 'repayment',
        repaymentScheduleId: repayment._id.toString(),
        fundedLoanId: fundedLoan._id.toString(),
        borrowerId: req.user.id,
        lenderId: fundedLoan.lenderId.toString(),
        instalmentNumber: String(repayment.instalmentNumber),
        emiAmount: String(repayment.emiAmount),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      instalment: repayment.instalmentNumber,
      emiAmount: repayment.emiAmount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/repayments/lender/:fundedLoanId
 * Fetch all repayment instalments for a specific funded loan (Lender only)
 */
router.get('/lender/:fundedLoanId', protect, requireRole('lender'), async (req, res) => {
  try {
    const fundedLoan = await FundedLoan.findById(req.params.fundedLoanId);
    if (!fundedLoan) {
      return res.status(404).json({ message: 'Funded loan not found' });
    }

    // Verify lender ownership
    if (fundedLoan.lenderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not your investment' });
    }

    const schedules = await RepaymentSchedule.find({
      fundedLoanId: req.params.fundedLoanId,
    }).sort({ instalmentNumber: 1 });

    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
