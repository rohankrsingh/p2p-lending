import express from 'express';
import stripe from '../services/stripe.js';
import LoanRequest from '../models/LoanRequest.js';
import FundedLoan from '../models/FundedLoan.js';
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { protect, requireRole } from '../middleware/auth.js';
import { calculateEMI, generateSchedule } from '../utils/emi.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// BORROWER routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/loans/borrower/dashboard
 * Borrower dashboard — summary cards, active loans with progress, upcoming EMIs, overdue alert
 */
router.get('/borrower/dashboard', protect, requireRole('borrower'), async (req, res) => {
  try {
    const userId = req.user.id;

    const fundedLoans = await FundedLoan.find({ borrowerId: userId }).populate({
      path: 'loanRequestId',
      select: 'amount tenure interestRate reason',
    });

    const fundedLoanIds = fundedLoans.map((l) => l._id);
    const schedules = await RepaymentSchedule.find({
      fundedLoanId: { $in: fundedLoanIds },
    }).sort({ dueDate: 1 });

    const pendingLoans = await LoanRequest.find({
      userId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    let totalBorrowed = 0;
    let totalOutstanding = 0;
    let activeLoanCount = 0;
    let overdueCount = 0;
    const upcoming = [];

    fundedLoans.forEach((fl) => {
      totalBorrowed += fl.fundedAmount || 0;
      totalOutstanding += fl.outstandingBalance || 0;
      if (fl.status === 'active' || fl.status === 'repaying') activeLoanCount++;
    });

    schedules.forEach((s) => {
      if (s.status === 'overdue') overdueCount++;
      if (s.status !== 'paid' && upcoming.length < 3) {
        upcoming.push({
          _id: s._id,
          instalmentNumber: s.instalmentNumber,
          dueDate: s.dueDate,
          emiAmount: s.emiAmount,
          status: s.status,
          fundedLoanId: s.fundedLoanId,
        });
      }
    });

    const activeLoanDetails = fundedLoans
      .filter((fl) => fl.status === 'active' || fl.status === 'repaying')
      .map((fl) => {
        const loanSchedules = schedules.filter(
          (s) => s.fundedLoanId.toString() === fl._id.toString()
        );
        const totalInstalments = loanSchedules.length;
        const paidInstalments = loanSchedules.filter((s) => s.status === 'paid').length;
        const progress = totalInstalments > 0 ? Math.round((paidInstalments / totalInstalments) * 100) : 0;
        return {
          _id: fl._id,
          fundedAmount: fl.fundedAmount,
          outstandingBalance: fl.outstandingBalance,
          status: fl.status,
          fundedAt: fl.fundedAt,
          tenure: fl.loanRequestId?.tenure || 0,
          interestRate: fl.loanRequestId?.interestRate || 12,
          reason: fl.loanRequestId?.reason || '',
          progress,
          totalInstalments,
          paidInstalments,
          emiAmount: loanSchedules.length > 0 ? loanSchedules[0].emiAmount : 0,
        };
      });

    res.json({
      stats: { totalBorrowed, totalOutstanding, activeLoanCount, overdueCount, pendingLoanCount: pendingLoans.length },
      activeLoans: activeLoanDetails,
      upcomingRepayments: upcoming,
      pendingLoans,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

    res.json({ loans: loansWithEmi });
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
    let totalInterestEarned = 0; // interest-only, from paid instalments

    fundedLoans.forEach((loan) => {
      totalInvested += loan.fundedAmount;
      if (loan.status === 'active' || loan.status === 'repaying') {
        activeInvestments++;
        // Expected monthly payout uses the actual first instalment's EMI
        // (falls back to a fresh calculation for legacy data without schedules)
        const emi = calculateEMI(loan.fundedAmount, loan.loanRequestId?.interestRate || 12, loan.loanRequestId?.tenure || 6);
        expectedMonthlyPayout += emi;
      }
    });

    // Interest earned = sum of the INTEREST components of paid instalments
    // (the repayment transaction amount is NET of the 2% platform fee, so it
    // must never be used as "interest earned").
    const fundedLoanIds = fundedLoans.map((fl) => fl._id);
    const paidSchedules = await RepaymentSchedule.find({
      fundedLoanId: { $in: fundedLoanIds },
      status: 'paid',
    });
    paidSchedules.forEach((s) => {
      if (typeof s.interestComponent === 'number' && s.interestComponent > 0) {
        totalInterestEarned += s.interestComponent;
      } else {
        // Legacy schedules: interest ≈ EMI − principal portion estimated from
        // reducing balance at the funded loan's rate (best-effort fallback).
        const fl = fundedLoans.find((f) => f._id.toString() === s.fundedLoanId.toString());
        const rate = fl?.loanRequestId?.interestRate || 12;
        const monthlyRate = rate / 100 / 12;
        const estInterest = Math.round(s.emiAmount * (monthlyRate / (1 + monthlyRate)) * 100) / 100;
        totalInterestEarned += estInterest;
      }
    });
    totalInterestEarned = Math.round(totalInterestEarned * 100) / 100;

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
 * GET /api/loans/lender/investments
 * Fetch all funded loans (investments) for the logged-in lender
 */
router.get('/lender/investments', protect, requireRole('lender'), async (req, res) => {
  try {
    const lenderId = req.user.id;
    const fundedLoans = await FundedLoan.find({ lenderId })
      .populate({
        path: 'loanRequestId',
        select: 'amount tenure reason interestRate status',
        populate: {
          path: 'userId',
          select: 'name email',
        },
      })
      .sort({ createdAt: -1 });

    res.json(fundedLoans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/loans/:id/fund
 * Initiates funding for a pending loan request via Stripe PaymentIntent
 * Lender only
 */
router.post('/:id/fund', protect, requireRole('lender'), async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ message: 'Loan request not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending loans can be funded' });
    }

    if (loan.userId.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot fund your own loan request' });
    }

    if (!Number.isInteger(loan.amount)) {
      return res.status(400).json({ message: 'Loan amount must be a whole number (₹)' });
    }

    // The borrower must have a verified Stripe Connect account so the
    // disbursement can actually be transferred to them after funding.
    const borrower = await User.findById(loan.userId);
    if (!borrower?.stripeAccountId) {
      return res.status(400).json({
        message: 'This borrower has not completed Stripe Connect onboarding yet. Funding is paused until they add their bank account.',
      });
    }

    // Create a Stripe PaymentIntent
    // amount is in paise (INR)
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: loan.amount * 100,
        currency: 'inr',
        payment_method_types: ['card'],
        metadata: {
          loanRequestId: loan._id.toString(),
          lenderId: req.user.id,
          borrowerId: loan.userId.toString(),
        },
      },
      { idempotencyKey: `fund-loan-${loan._id}-${req.user.id}` }
    );

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/loans/:id/schedule
 * Full repayment schedule for a specific loan — lender or borrower (owner)
 */
router.get('/:id/schedule', protect, async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    // Borrowers can only see their own loan schedules
    if (
      req.user.role === 'borrower' &&
      loan.userId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const fundedLoan = await FundedLoan.findOne({ loanRequestId: loan._id });

    if (!fundedLoan) {
      return res.status(404).json({ message: 'Loan has not been funded yet' });
    }

    // Lenders can only see schedules for loans they funded
    if (
      req.user.role === 'lender' &&
      fundedLoan.lenderId.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const schedules = await RepaymentSchedule.find({
      fundedLoanId: fundedLoan._id,
    }).sort({ instalmentNumber: 1 });

    res.json({
      loan,
      fundedLoan,
      schedules,
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

    // Lenders may preview PENDING loans (marketplace), but a funded loan is
    // only visible to the lender who actually funded it — this prevents
    // enumerating borrower PII (email) for loans you don't own.
    if (req.user.role === 'lender' && loan.status !== 'pending') {
      const fundedLoan = await FundedLoan.findOne({
        loanRequestId: loan._id,
        lenderId: req.user.id,
      });
      if (!fundedLoan) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // Lenders never need the borrower's email before funding; expose name only.
    const loanObject = loan.toObject();
    if (req.user.role === 'lender' && loan.status === 'pending') {
      if (loanObject.userId) {
        loanObject.userId = { name: loanObject.userId.name };
      }
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

    res.json({ ...loanObject, emi, schedulePreview });
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
