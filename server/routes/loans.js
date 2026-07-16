import express from 'express';
import LoanRequest from '../models/LoanRequest.js';
import { protect, requireRole } from '../middleware/auth.js';
import { calculateEMI } from '../utils/emi.js';

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
// LENDER routes (built Day 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/loans/marketplace
 * All pending loans — paginated + filterable — lender only
 * Stub: implemented fully on Day 5
 */
router.get('/marketplace', protect, requireRole('lender'), async (req, res) => {
  res.status(501).json({ message: 'Coming Day 5' });
});

/**
 * GET /api/loans/:id
 * Full loan detail with EMI preview — lender or borrower (owner)
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
    res.json({ ...loan.toObject(), emi });
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
