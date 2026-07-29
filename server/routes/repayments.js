import express from 'express';
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
    // 1. Find all funded loans for this borrower
    const fundedLoans = await FundedLoan.find({ borrowerId: req.user.id });
    const fundedLoanIds = fundedLoans.map((l) => l._id);

    // 2. Find all repayment schedule items matching these loans
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
 * POST /api/repayments/:id/pay
 * Pay a single repayment instalment (simulated/mock payment for Day 10)
 */
router.post('/:id/pay', protect, requireRole('borrower'), async (req, res) => {
  try {
    const repayment = await RepaymentSchedule.findById(req.params.id);
    if (!repayment) {
      return res.status(404).json({ message: 'Repayment instalment not found' });
    }

    if (repayment.status === 'paid') {
      return res.status(400).json({ message: 'Instalment is already paid' });
    }

    // Find the funded loan associated with this repayment
    const fundedLoan = await FundedLoan.findById(repayment.fundedLoanId);
    if (!fundedLoan) {
      return res.status(404).json({ message: 'Associated funded loan not found' });
    }

    // Verify ownership
    if (fundedLoan.borrowerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: not your loan' });
    }

    // Perform simulated payment updates
    repayment.status = 'paid';
    repayment.paidAt = new Date();
    repayment.stripePaymentIntentId = `pi_mock_${Math.random().toString(36).substr(2, 9)}`;
    await repayment.save();

    // Update FundedLoan outstanding balance
    const newBalance = Math.max(0, fundedLoan.outstandingBalance - repayment.emiAmount);
    fundedLoan.outstandingBalance = newBalance;

    // Check if the loan is fully completed
    const remainingUnpaidCount = await RepaymentSchedule.countDocuments({
      fundedLoanId: fundedLoan._id,
      status: { $ne: 'paid' },
    });

    if (remainingUnpaidCount === 0 || newBalance === 0) {
      fundedLoan.status = 'completed';
    } else {
      fundedLoan.status = 'repaying';
    }
    await fundedLoan.save();

    // Log the transaction
    const transaction = await Transaction.create({
      fromUserId: req.user.id,
      toUserId: fundedLoan.lenderId,
      amount: repayment.emiAmount,
      type: 'repayment',
      stripeId: repayment.stripePaymentIntentId,
      fundedLoanId: fundedLoan._id,
      repaymentScheduleId: repayment._id,
    });

    res.json({
      message: 'Repayment instalment paid successfully (mocked)',
      repayment,
      transaction,
      outstandingBalance: fundedLoan.outstandingBalance,
      loanStatus: fundedLoan.status,
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
