import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LoanRequest from '../models/LoanRequest.js';
import FundedLoan from '../models/FundedLoan.js';
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import Transaction from '../models/Transaction.js';
import { generateSchedule } from '../utils/emi.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Ensure indexes (unique loanRequestId on FundedLoan) are built before tests
  await FundedLoan.init();
}, 120000); // 2min timeout for first-time MongoDB binary download

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Loan Lifecycle Integration (money invariants)', () => {
  let borrowerId;
  let lenderId;
  let loanRequest;
  let fundedLoan;

  it('1. should create a loan request (borrower)', async () => {
    borrowerId = new mongoose.Types.ObjectId();
    loanRequest = await LoanRequest.create({
      userId: borrowerId,
      amount: 10000,
      tenure: 6,
      reason: 'Test loan',
      interestRate: 12,
      status: 'pending',
    });

    expect(loanRequest).toBeDefined();
    expect(loanRequest.status).toBe('pending');
    expect(loanRequest.amount).toBe(10000);
    expect(loanRequest.tenure).toBe(6);
  });

  it('2. should fund the loan — FundedLoan with a schedule whose principal amortises to exactly ₹0', async () => {
    lenderId = new mongoose.Types.ObjectId();

    // Simulate what the funding webhook does (minus Stripe calls)
    loanRequest.status = 'funded';
    await loanRequest.save();

    fundedLoan = await FundedLoan.create({
      loanRequestId: loanRequest._id,
      lenderId,
      borrowerId,
      fundedAmount: loanRequest.amount,
      outstandingBalance: loanRequest.amount,
      stripePaymentIntentId: 'pi_test_' + Date.now(),
      status: 'active',
    });

    expect(fundedLoan.fundedAmount).toBe(10000);
    expect(fundedLoan.outstandingBalance).toBe(10000);
    expect(fundedLoan.status).toBe('active');

    // Generate the schedule the same way the webhook does
    const instalments = generateSchedule(
      fundedLoan._id,
      loanRequest.amount,
      loanRequest.interestRate,
      loanRequest.tenure
    );
    await RepaymentSchedule.insertMany(instalments);

    const scheduleCount = await RepaymentSchedule.countDocuments({ fundedLoanId: fundedLoan._id });
    expect(scheduleCount).toBe(6);

    // Principal components must sum to exactly the funded amount (no drift)
    const principalSum = instalments.reduce((s, i) => s + i.principalComponent, 0);
    expect(principalSum).toBe(10000);
  });

  it('3. should repay all instalments — outstandingBalance tracks principal only, and 100% of each EMI is booked (98% lender + 2% fee)', async () => {
    const schedules = await RepaymentSchedule.find({
      fundedLoanId: fundedLoan._id,
    }).sort({ instalmentNumber: 1 });

    expect(schedules).toHaveLength(6);

    for (const instalment of schedules) {
      const emiAmount = instalment.emiAmount;
      const platformFee = Math.round(emiAmount * 0.02 * 100) / 100;
      const lenderPayout = Math.round((emiAmount - platformFee) * 100) / 100;

      // Money invariant: fee + payout = full EMI. Nothing disappears.
      expect(lenderPayout + platformFee).toBeCloseTo(emiAmount, 2);

      // Mark repayment as paid (as the webhook does)
      instalment.status = 'paid';
      instalment.paidAt = new Date();
      instalment.stripePaymentIntentId = 'pi_repay_' + Date.now();
      await instalment.save();

      // outstandingBalance decreases by the PRINCIPAL component only —
      // interest is income, it must NOT reduce the outstanding principal.
      const before = fundedLoan.outstandingBalance;
      fundedLoan.outstandingBalance =
        Math.max(0, Math.round((before - instalment.principalComponent) * 100) / 100);
      await fundedLoan.save();

      // Repayment transaction = 98% lender payout (matches the actual transfer)
      await Transaction.create({
        fromUserId: borrowerId,
        toUserId: lenderId,
        amount: lenderPayout,
        type: 'repayment',
        stripeId: instalment.stripePaymentIntentId,
        fundedLoanId: fundedLoan._id,
        repaymentScheduleId: instalment._id,
      });

      // Fee transaction = 2% platform fee
      if (platformFee > 0) {
        await Transaction.create({
          fromUserId: borrowerId,
          toUserId: null,
          amount: platformFee,
          type: 'fee',
          stripeId: instalment.stripePaymentIntentId,
          fundedLoanId: fundedLoan._id,
          repaymentScheduleId: instalment._id,
        });
      }
    }

    // After the final instalment the principal is fully recovered
    expect(fundedLoan.outstandingBalance).toBe(0);
  });

  it('4. should auto-complete the loan AND sync LoanRequest status', async () => {
    const remainingUnpaid = await RepaymentSchedule.countDocuments({
      fundedLoanId: fundedLoan._id,
      status: { $ne: 'paid' },
    });

    expect(remainingUnpaid).toBe(0);

    // Simulate the webhook's completion logic
    if (remainingUnpaid === 0) {
      fundedLoan.status = 'completed';
      loanRequest.status = 'completed';
      await fundedLoan.save();
      await loanRequest.save();
    }

    const reloadedLoan = await FundedLoan.findById(fundedLoan._id);
    expect(reloadedLoan.status).toBe('completed');
    expect(reloadedLoan.outstandingBalance).toBe(0);

    // LoanRequest must be in sync — no drift between the two collections
    const reloadedRequest = await LoanRequest.findById(loanRequest._id);
    expect(reloadedRequest.status).toBe('completed');
  });

  it('5. ledger must reconcile — every EMI is booked as fee + lender payout', async () => {
    const repaymentTxns = await Transaction.find({ type: 'repayment' });
    const feeTxns = await Transaction.find({ type: 'fee' });
    expect(repaymentTxns).toHaveLength(6);
    expect(feeTxns).toHaveLength(6);

    const totalEmiPaid = (await RepaymentSchedule.find({ status: 'paid' }))
      .reduce((sum, s) => sum + s.emiAmount, 0);

    const totalLenderPayout = repaymentTxns.reduce((sum, t) => sum + t.amount, 0);
    const totalPlatformFee = feeTxns.reduce((sum, t) => sum + t.amount, 0);

    // 98 + 2 = 100: the full amount the borrower paid is fully accounted for
    expect(totalLenderPayout + totalPlatformFee).toBeCloseTo(totalEmiPaid, 2);

    // Lender received (98% of EMIs) — includes interest income on top of principal
    expect(totalLenderPayout).toBeGreaterThan(10000);

    // Platform earned exactly 2% of all EMIs
    expect(totalPlatformFee).toBeCloseTo(totalEmiPaid * 0.02, 2);
  });

  it('6. a loan request can only be funded once (unique loanRequestId)', async () => {
    await expect(
      FundedLoan.create({
        loanRequestId: loanRequest._id,
        lenderId: new mongoose.Types.ObjectId(),
        borrowerId,
        fundedAmount: 10000,
        outstandingBalance: 10000,
        stripePaymentIntentId: 'pi_test_dup',
        status: 'active',
      })
    ).rejects.toThrow(); // duplicate key on unique index
  });
});
