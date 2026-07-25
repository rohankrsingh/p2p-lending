import express from 'express';
import LoanRequest from '../models/LoanRequest.js';
import FundedLoan from '../models/FundedLoan.js';
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import Transaction from '../models/Transaction.js';
import { protect, requireRole } from '../middleware/auth.js';
import { calculateEMI, generateSchedule } from '../utils/emi.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// BORROWER routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/loans
 * Create a new loan request — borrower only
 */
router.post('/', protect, requireRole('borrower'), async (req, res) => {
  try {
    const { amount, tenure, reason } = req.body;

    // Server always sets the interest rate — never trust the client
    const interestRate = 12; // 12% p.a. platform rate

    const loan = await LoanRequest.create({
      userId: req.user.id,
      amount,
      tenure,
      reason,
      interestRate,
    });

    // Attach EMI preview in the response
    const emi = calculateEMI(amount, interestRate, tenure);

    res.status(201).json({ loan, emi });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/loans/my
 * Borrower's own loan requests (all statuses)
 * Must be defined BEFORE /:id to avoid route conflict
 */
router.get('/my', protect, requireRole('borrower'), async (req, res) => {
  try {
    const loans = await LoanRequest.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    // Attach EMI to each loan for frontend display
    const loansWithEmi = loans.map((loan) => ({
      ...loan.toObject(),
      emi: calculateEMI(loan.amount, loan.interestRate, loan.tenure),
    }));

    res.json(loansWithEmi);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LENDER routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/loans/marketplace
 * All pending loans — paginated, filterable by amount & tenure, sortable
 * Lender only
 *
 * Query params:
 *   page       (default 1)
 *   limit      (default 10, max 50)
 *   minAmount  filter minimum loan amount
 *   maxAmount  filter maximum loan amount
 *   tenure     filter by exact tenure (months)
 *   sort       newest | highest | lowest | shortest (default: newest)
 */
router.get('/marketplace', protect, requireRole('lender'), async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    // ── Filters ──────────────────────────────────────────────
    const filter = { status: 'pending' };

    if (req.query.minAmount || req.query.maxAmount) {
      filter.amount = {};
      if (req.query.minAmount) filter.amount.$gte = Number(req.query.minAmount);
      if (req.query.maxAmount) filter.amount.$lte = Number(req.query.maxAmount);
    }
    if (req.query.tenure) {
      filter.tenure = Number(req.query.tenure);
    }

    // ── Sorting ───────────────────────────────────────────────
    const sortMap = {
      newest:   { createdAt: -1 },
      highest:  { amount: -1 },
      lowest:   { amount: 1 },
      shortest: { tenure: 1 },
    };
    const sortKey = req.query.sort || 'newest';
    const sort = sortMap[sortKey] || sortMap.newest;

    const [loans, total] = await Promise.all([
      LoanRequest.find(filter)
        .populate('userId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      LoanRequest.countDocuments(filter),
    ]);

    const loansWithEmi = loans.map((loan) => ({
      ...loan.toObject(),
      emi: calculateEMI(loan.amount, loan.interestRate, loan.tenure),
    }));

    res.json({
      loans: loansWithEmi,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LENDER routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/loans/lender/dashboard
 * Lender portfolio statistics, recent investments, and recent transactions
 */
router.get('/lender/dashboard', protect, requireRole('lender'), async (req, res) => {
  try {
    const lenderId = req.user.id;

    // 1. Fetch all funded loans for this lender
    const fundedLoans = await FundedLoan.find({ lenderId }).populate({
      path: 'loanRequestId',
      select: 'amount tenure reason interestRate status',
      populate: {
        path: 'userId',
        select: 'name email',
      },
    });

    // 2. Fetch recent transactions for this lender (either as sender or receiver)
    const recentTransactions = await Transaction.find({
      $or: [{ fromUserId: lenderId }, { toUserId: lenderId }],
    })
      .populate('fromUserId', 'name role')
      .populate('toUserId', 'name role')
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate stats
    let totalInvested = 0;
    let activeInvestments = 0;
    let expectedMonthlyPayout = 0;
    let totalInterestEarned = 0; // calculated from paid repayments

    fundedLoans.forEach((loan) => {
      totalInvested += loan.fundedAmount;
      if (loan.status === 'active' || loan.status === 'repaying') {
        activeInvestments++;
        // Expected monthly payout is the EMI of the loan
        const emi = calculateEMI(loan.fundedAmount, loan.loanRequestId?.interestRate || 12, loan.loanRequestId?.tenure || 6);
        expectedMonthlyPayout += emi;
      }
    });

    // Calculate total interest earned by fetching all completed repayments transactions
    const repaymentTransactions = await Transaction.find({
      toUserId: lenderId,
      type: 'repayment',
    }).populate('repaymentScheduleId');

    repaymentTransactions.forEach((tx) => {
      // EMI = principal + interest. For mock simplicity, we can assume interest is a fraction, 
      // or just track full settled transaction amounts as returns
      totalInterestEarned += tx.amount;
    });

    res.json({
      stats: {
        totalInvested,
        activeInvestments,
        expectedMonthlyPayout,
        totalInterestEarned,
      },
      recentInvestments: fundedLoans.slice(-5).reverse(),
      recentTransactions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/loans/:id/invest
 * Fund a pending loan request - lender locks funding, creates FundedLoan, repayment schedule, and transaction log
 */
router.post('/:id/invest', protect, requireRole('lender'), async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan request not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending loans can be funded' });
    }

    // Verify lender is not the borrower
    if (loan.userId.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot fund your own loan request' });
    }

    // Update LoanRequest status
    loan.status = 'funded';
    await loan.save();

    // Create FundedLoan
    const stripePaymentIntentId = `pi_mock_${Math.random().toString(36).substr(2, 9)}`;
    const fundedLoan = await FundedLoan.create({
      loanRequestId: loan._id,
      lenderId: req.user.id,
      borrowerId: loan.userId,
      fundedAmount: loan.amount,
      outstandingBalance: loan.amount,
      stripePaymentIntentId,
      status: 'active',
    });

    // Generate RepaymentSchedule instalments
    const instalments = generateSchedule(
      fundedLoan._id,
      loan.amount,
      loan.interestRate,
      loan.tenure,
      new Date()
    );
    await RepaymentSchedule.insertMany(instalments);

    // Create Transaction Log
    const transaction = await Transaction.create({
      fromUserId: req.user.id,
      toUserId: loan.userId,
      amount: loan.amount,
      type: 'funding',
      stripeId: stripePaymentIntentId,
      loanRequestId: loan._id,
      fundedLoanId: fundedLoan._id,
    });

    res.status(201).json({
      message: 'Loan successfully funded',
      fundedLoan,
      transaction,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/loans/:id
 * Full loan detail with EMI preview + month-by-month schedule — lender or borrower (owner)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id).populate(
      'userId',
      'name email'
    );

    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    // Borrowers can only see their own loans
    if (
      req.user.role === 'borrower' &&
      loan.userId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const emi = calculateEMI(loan.amount, loan.interestRate, loan.tenure);

    // Generate a preview schedule (not persisted — just for display)
    // First instalment due one month from today for preview purposes
    const schedulePreview = generateSchedule(
      loan._id,
      loan.amount,
      loan.interestRate,
      loan.tenure,
      new Date()
    ).map((item, idx) => ({
      instalmentNumber: item.instalmentNumber,
      dueDate: item.dueDate,
      emiAmount: item.emiAmount,
    }));

    res.json({ ...loan.toObject(), emi, schedulePreview });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/loans/:id
 * Edit a PENDING loan request — borrower (owner) only
 */
router.put('/:id', protect, requireRole('borrower'), async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id);

    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (loan.userId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });
    if (loan.status !== 'pending')
      return res
        .status(400)
        .json({ message: 'Only pending loans can be edited' });

    const { amount, tenure, reason } = req.body;
    if (amount !== undefined) loan.amount = amount;
    if (tenure !== undefined) loan.tenure = tenure;
    if (reason !== undefined) loan.reason = reason;

    await loan.save();

    const emi = calculateEMI(loan.amount, loan.interestRate, loan.tenure);
    res.json({ loan, emi });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/loans/:id
 * Cancel a PENDING loan request — borrower (owner) only
 */
router.delete('/:id', protect, requireRole('borrower'), async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id);

    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (loan.userId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });
    if (loan.status !== 'pending')
      return res
        .status(400)
        .json({ message: 'Only pending loans can be cancelled' });

    await loan.deleteOne();
    res.json({ message: 'Loan request cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
