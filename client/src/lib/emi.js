/**
 * Calculate monthly EMI using reducing balance formula.
 *
 * @param {number} principal - Loan amount in ₹
 * @param {number} annualRate - Interest rate per annum % (default 12)
 * @param {number} tenureMonths - Duration in months
 * @returns {{ emi: number, totalInterest: number, totalPayable: number }}
 */
export function calculateEMI(principal, annualRate = 12, tenureMonths = 6) {
  const p = Number(principal) || 0
  const n = Number(tenureMonths) || 1
  const r = annualRate / 100 / 12

  if (p <= 0 || n <= 0) {
    return { emi: 0, totalInterest: 0, totalPayable: 0 }
  }

  if (r === 0) {
    const emi = +(p / n).toFixed(2)
    return { emi, totalInterest: 0, totalPayable: p }
  }

  const emiVal = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const emi = +emiVal.toFixed(2)
  const totalPayable = +(emi * n).toFixed(2)
  const totalInterest = +(totalPayable - p).toFixed(2)

  return {
    emi,
    totalInterest: Math.max(0, totalInterest),
    totalPayable,
  }
}
