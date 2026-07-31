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
 * Clamp a due date to the end of the target month so that months with fewer
 * days never skip a calendar month (e.g. funding on Jan 31 must not produce
 * a Mar 3 due date for "Feb"). Uses local time to match how dates are shown.
 *
 * @param {Date} startDate - The base date (funding date)
 * @param {number} monthOffset - Number of months to add
 * @returns {Date} A date in the target month, never later than month-end
 */
export function addMonthsClamped(startDate, monthOffset) {
  const result = new Date(startDate);
  const day = startDate.getDate();
  result.setDate(1); // avoid rollover while shifting the month
  result.setMonth(result.getMonth() + monthOffset);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Generate a full repayment schedule (array of instalments) with a
 * per-instalment principal/interest split computed on the reducing balance.
 *
 * - The same rounded EMI is used for every instalment EXCEPT the final one,
 *   which is adjusted so the principal amortises to exactly ₹0.
 * - Interest for instalment i = outstandingPrincipal × monthlyRate.
 * - Principal for instalment i = EMI − interest (final instalment absorbs
 *   all rounding drift).
 *
 * @param {string} fundedLoanId - MongoDB ObjectId of the FundedLoan
 * @param {number} principal    - Loan amount
 * @param {number} annualRate   - Annual interest rate %
 * @param {number} tenureMonths - Number of months
 * @param {Date}   startDate    - Date funding was confirmed (first due = +1 month)
 * @returns {Array} Array of objects matching RepaymentSchedule shape
 */
export function generateSchedule(fundedLoanId, principal, annualRate, tenureMonths, startDate = new Date()) {
  const monthlyRate = annualRate / 100 / 12;
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const schedule = [];
  let outstanding = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = addMonthsClamped(startDate, i);

    // Final instalment: repay the exact remaining principal, with interest on it
    if (i === tenureMonths) {
      const finalInterest = Math.round(outstanding * monthlyRate * 100) / 100;
      const finalPrincipal = Math.round(outstanding * 100) / 100;
      const finalEmi = Math.round((finalPrincipal + finalInterest) * 100) / 100;
      schedule.push({
        fundedLoanId,
        instalmentNumber: i,
        dueDate,
        emiAmount: finalEmi,
        principalComponent: finalPrincipal,
        interestComponent: finalInterest,
        status: 'pending',
      });
      outstanding = 0;
      continue;
    }

    const interest = Math.round(outstanding * monthlyRate * 100) / 100;
    const principalPart = Math.round((emi - interest) * 100) / 100;
    outstanding = Math.round((outstanding - principalPart) * 100) / 100;

    schedule.push({
      fundedLoanId,
      instalmentNumber: i,
      dueDate,
      emiAmount: emi,
      principalComponent: principalPart,
      interestComponent: interest,
      status: 'pending',
    });
  }

  return schedule;
}
