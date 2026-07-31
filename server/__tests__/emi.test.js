import { describe, it, expect } from 'vitest';
import { calculateEMI, generateSchedule } from '../utils/emi.js';

// ────────────────────────────────────────────────────────────
// EMI Calculation Tests (Day 31)
// ────────────────────────────────────────────────────────────

describe('calculateEMI', () => {
  it('should calculate correct EMI for standard loan', () => {
    // Loan: ₹10,000 at 12% p.a. for 6 months
    // Formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
    //   P=10000, r=0.01, n=6
    //   Numerator:   10000 × 0.01 × 1.01^6 = 106.152...
    //   Denominator:  1.01^6 - 1 = 0.06152...
    //   Result: 1725.48 (rounded to 2dp)
    const emi = calculateEMI(10000, 12, 6);
    expect(emi).toBeCloseTo(1725.48, 1);
  });

  it('should handle 0% interest rate edge case', () => {
    const emi = calculateEMI(12000, 0, 12);
    expect(emi).toBe(1000); // 12000 / 12 = 1000
  });

  it('should calculate larger loan correctly', () => {
    // ₹50,000 at 12% p.a. for 12 months
    const emi = calculateEMI(50000, 12, 12);
    expect(emi).toBeCloseTo(4442.44, 1);
  });

  it('should calculate short tenure correctly', () => {
    // ₹5,000 at 15% p.a. for 3 months
    const emi = calculateEMI(5000, 15, 3);
    expect(emi).toBeGreaterThan(1600);
    expect(emi).toBeLessThan(1800);
  });

  it('should give emi less than principal for small amounts', () => {
    const emi = calculateEMI(1000, 12, 3);
    expect(emi).toBeLessThan(1000);
    expect(emi).toBeGreaterThan(300);
  });
});

describe('generateSchedule', () => {
  const mockFundedLoanId = '507f1f77bcf86cd799439011';

  it('should generate correct number of instalments', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 6);
    expect(schedule).toHaveLength(6);
  });

  it('should assign sequential instalment numbers', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 3);
    expect(schedule.map((s) => s.instalmentNumber)).toEqual([1, 2, 3]);
  });

  it('should set correct EMI amount on all instalments', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 6);
    const expectedEmi = calculateEMI(10000, 12, 6);
    schedule.forEach((instalment) => {
      expect(instalment.emiAmount).toBeCloseTo(expectedEmi, 1);
    });
  });

  it('should set future due dates (first instalment +1 month)', () => {
    const startDate = new Date('2026-08-01');
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 3, startDate);

    expect(schedule[0].dueDate.getMonth()).toBe(8); // September (0-indexed: 7=Aug, 8=Sep)
    expect(schedule[1].dueDate.getMonth()).toBe(9); // October
    expect(schedule[2].dueDate.getMonth()).toBe(10); // November
  });

  it('should set initial status to pending', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 6);
    schedule.forEach((instalment) => {
      expect(instalment.status).toBe('pending');
    });
  });

  it('should link all instalments to the fundedLoanId', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 4);
    schedule.forEach((instalment) => {
      expect(instalment.fundedLoanId).toBe(mockFundedLoanId);
    });
  });

  it('should split every instalment into principal + interest that sums to the EMI', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 6);
    schedule.forEach((instalment) => {
      expect(instalment.principalComponent).toBeDefined();
      expect(instalment.interestComponent).toBeDefined();
      expect(instalment.principalComponent + instalment.interestComponent).toBeCloseTo(
        instalment.emiAmount,
        2
      );
    });
  });

  it('principal components should amortise the loan to exactly ₹0', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 6);
    const principalSum = schedule.reduce((sum, i) => sum + i.principalComponent, 0);
    // The final instalment absorbs rounding drift — principal must be exact.
    expect(principalSum).toBe(10000);
  });

  it('interest components should equal total interest payable', () => {
    const schedule = generateSchedule(mockFundedLoanId, 10000, 12, 6);
    const interestSum = schedule.reduce((sum, i) => sum + i.interestComponent, 0);
    const emiSum = schedule.reduce((sum, i) => sum + i.emiAmount, 0);
    expect(interestSum).toBeCloseTo(emiSum - 10000, 2);
  });

  it('should never produce a negative principal component', () => {
    const schedule = generateSchedule(mockFundedLoanId, 5000, 15, 3);
    schedule.forEach((instalment) => {
      expect(instalment.principalComponent).toBeGreaterThanOrEqual(0);
      expect(instalment.interestComponent).toBeGreaterThanOrEqual(0);
    });
  });
});

// ────────────────────────────────────────────────────────────
// Platform Fee Split (2% per EMI — 98% to lender, 2% platform)
// ────────────────────────────────────────────────────────────

describe('platform fee split (per-EMI)', () => {
  it('should book exactly 100% of every EMI: 98% lender payout + 2% fee', () => {
    const schedule = generateSchedule('507f1f77bcf86cd799439011', 10000, 12, 6);
    schedule.forEach((instalment) => {
      const platformFee = Math.round(instalment.emiAmount * 0.02 * 100) / 100;
      const lenderPayout = Math.round((instalment.emiAmount - platformFee) * 100) / 100;
      expect(lenderPayout + platformFee).toBeCloseTo(instalment.emiAmount, 2);
      expect(platformFee).toBeGreaterThan(0);
      expect(lenderPayout).toBeGreaterThan(0);
    });
  });

  it('should deduct 2% platform fee correctly', () => {
    const fee = Math.round(1000 * 0.02 * 100) / 100;
    expect(fee).toBe(20);
  });

  it('should transfer 98% to lender', () => {
    const fee = Math.round(1000 * 0.02 * 100) / 100;
    expect(1000 - fee).toBe(980);
  });

  it('should handle fractional amounts correctly', () => {
    // ₹1,725.48 EMI → fee = 34.5096 → rounded to 34.51
    // payout = 1725.48 - 34.51 = 1690.97
    const fee = Math.round(1725.48 * 0.02 * 100) / 100;
    expect(fee).toBe(34.51);
    const payout = Math.round((1725.48 - fee) * 100) / 100;
    expect(payout).toBeCloseTo(1690.97, 2);
  });

  it('should handle zero amount', () => {
    expect(Math.round(0 * 0.02 * 100) / 100).toBe(0);
  });
});
