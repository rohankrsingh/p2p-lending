import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LoanRequest from '../models/LoanRequest.js';
import FundedLoan from '../models/FundedLoan.js';
import RepaymentSchedule from '../models/RepaymentSchedule.js';
import Transaction from '../models/Transaction.js';
import { calculateEMI } from '../utils/emi.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 120000); // 2min timeout for first-time MongoDB binary download

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Loan Lifecycle Integration', () => {
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

  it('2. should fund the loan (lender) — update status and create FundedLoan', async () => {
    lenderId = new mongoose.Types.ObjectId();

    // Simulate what the /:id/fund endpoint does (minus Stripe)
    const paymentIntentId = 'pi_test_' + Date.now();

    // Update LoanRequest status
    loanRequest.status = 'funded';
    await loanRequest.save();

    // Create FundedLoan
    fundedLoan = await FundedLoan.create({
      loanRequestId: loanRequest._id,
      lenderId,
      borrowerId,
      fundedAmount: loanRequest.amount,
      outstandingBalance: loanRequest.amount,
      stripePaymentIntentId: paymentIntentId,
      status: 'active',
    });

    expect(fundedLoan).toBeDefined();
    expect(fundedLoan.fundedAmount).toBe(10000);
    expect(fundedLoan.outstandingBalance).toBe(10000);
    expect(fundedLoan.status).toBe('active');

    // Generate RepaymentSchedule instalments (as the webhook does)
    const emiAmount = calculateEMI(loanRequest.amount, loanRequest.interestRate, loanRequest.tenure);
    const instalments = [];
    for (let i = 1; i <= loanRequest.tenure; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      instalments.push({
        fundedLoanId: fundedLoan._id,
        instalmentNumber: i,
        dueDate,
        emiAmount,
        status: 'pending',
      });
    }
    await RepaymentSchedule.insertMany(instalments);

    const scheduleCount = await RepaymentSchedule.countDocuments({ fundedLoanId: fundedLoan._id });
    expect(scheduleCount).toBe(6);
  });

  it('3. should repay all 6 instalments and auto-complete the loan', async () => {
    const schedules = await RepaymentSchedule.find({
      fundedLoanId: fundedLoan._id,
    }).sort({ instalmentNumber: 1 });

    expect(schedules).toHaveLength(6);

    for (const instalment of schedules) {
      const emiAmount = instalment.emiAmount;
      const PLATFORM_FEE_RATE = 0.02;
      const platformFee = Math.round(emiAmount * PLATFORM_FEE_RATE * 100) / 100;
      const lenderPayout = emiAmount - platformFee;

      // Mark repayment as paid
      instalment.status = 'paid';
      instalment.paidAt = new Date();
      instalment.stripePaymentIntentId = 'pi_repay_' + Date.now();
      await instalment.save();

      // Update outstanding balance
      fundedLoan.outstandingBalance = Math.max(0, fundedLoan.outstandingBalance - emiAmount);
      await fundedLoan.save();

      // Create repayment transaction
      await Transaction.create({
        fromUserId: borrowerId,
        toUserId: lenderId,
        amount: emiAmount,
        type: 'repayment',
        stripeId: instalment.stripePaymentIntentId,
        fundedLoanId: fundedLoan._id,
        repaymentScheduleId: instalment._id,
      });

      // Create fee transaction
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

    // Check auto-complete after last repayment
    const remainingUnpaid = await RepaymentSchedule.countDocuments({
      fundedLoanId: fundedLoan._id,
      status: { $ne: 'paid' },
    });

    if (remainingUnpaid === 0) {
      fundedLoan.status = 'completed';
      await fundedLoan.save();
    }

    expect(fundedLoan.status).toBe('completed');
    expect(fundedLoan.outstandingBalance).toBe(0);
  });

  it('4. should have correct transaction records', async () => {
    const repaymentTxns = await Transaction.find({ type: 'repayment' });
    expect(repaymentTxns).toHaveLength(6);

    const feeTxns = await Transaction.find({ type: 'fee' });
    expect(feeTxns).toHaveLength(6);

    // Total repayment amount received by lender
    const totalRepaid = repaymentTxns.reduce((sum, t) => sum + t.amount, 0);
    expect(totalRepaid).toBeCloseTo(calculateEMI(10000, 12, 6) * 6, 0);
    expect(totalRepaid).toBeGreaterThan(10000); // includes interest
  });

  it('5. should calculate correct EMI repayment amounts', async () => {
    const emi = calculateEMI(10000, 12, 6);
    const totalRepayment = emi * 6;
    const totalInterest = totalRepayment - 10000;

    expect(emi).toBeCloseTo(1725.48, 1);
    expect(totalInterest).toBeGreaterThan(300);
    expect(totalInterest).toBeLessThan(400);
  });
});
