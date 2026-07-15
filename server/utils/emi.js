/**
 * Calculate monthly EMI using the standard reducing-balance formula.
 *
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 *
 * @param {number} principal  - Loan amount in ₹
 * @param {number} annualRate - Annual interest rate in % (e.g. 12 for 12%)
 * @param {number} tenureMonths - Number of monthly instalments
 * @returns {number} EMI rounded to 2 decimal places
 */
export function calculateEMI(principal, annualRate, tenureMonths) {
  const r = annualRate / 100 / 12; // monthly rate
  const n = tenureMonths;

  if (r === 0) return +(principal / n).toFixed(2); // 0% edge case

  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return +emi.toFixed(2);
}

/**
 * Generate a full repayment schedule (array of instalments).
 *
 * @param {string} fundedLoanId - MongoDB ObjectId of the FundedLoan
 * @param {number} principal    - Loan amount
 * @param {number} annualRate   - Annual interest rate %
 * @param {number} tenureMonths - Number of months
 * @param {Date}   startDate    - Date funding was confirmed (first due = +1 month)
 * @returns {Array} Array of objects matching RepaymentSchedule shape
 */
export function generateSchedule(fundedLoanId, principal, annualRate, tenureMonths, startDate = new Date()) {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const schedule = [];

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      fundedLoanId,
      instalmentNumber: i,
      dueDate,
      emiAmount: emi,
      status: 'pending',
    });
  }

  return schedule;
}
