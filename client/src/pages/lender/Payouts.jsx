/**
 * Lender Payouts page
 *
 * Shows:
 * - Stripe Connect account status + payout balance
 * - Recent payout transactions (from FundedLoan + RepaymentSchedule history)
 * - Link to complete onboarding if not verified
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  BadgeCheck,
  Landmark,
  TrendingUp,
  ExternalLink,
  IndianRupee,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import api from '@/lib/api'

export default function Payouts() {
  const navigate = useNavigate()

  const [accountStatus, setAccountStatus] = useState(null)
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statusRes, investRes] = await Promise.all([
        api.get('/stripe/account-status'),
        api.get('/loans/lender/investments'),
      ])
      setAccountStatus(statusRes.data)
      setInvestments(investRes.data)
    } catch (err) {
      toast.error('Failed to load payout data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Derive payout statistics from investments
  const stats = investments.reduce(
    (acc, inv) => {
      acc.totalLent += inv.fundedAmount
      acc.totalOutstanding += inv.outstandingBalance
      acc.totalCollected += (inv.fundedAmount - inv.outstandingBalance)
      return acc
    },
    { totalLent: 0, totalOutstanding: 0, totalCollected: 0 }
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading payout dashboard…</p>
      </div>
    )
  }

  const isVerified = accountStatus?.stripeVerified
  const hasAccount = accountStatus?.hasAccount

  return (
    <div className="space-y-8 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Payouts & Earnings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your monthly EMI inflows and Stripe Connect payout account status.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-border bg-card hover:bg-muted text-foreground cursor-pointer h-9 px-3"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Stripe Account Status Banner ── */}
      {!isVerified ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold text-sm">
                {hasAccount ? 'Stripe Verification Incomplete' : 'Stripe Account Not Connected'}
              </p>
              <p className="text-amber-200/70 text-xs mt-0.5">
                {hasAccount
                  ? 'Complete your Stripe onboarding to receive EMI payouts directly to your bank account.'
                  : 'Connect a Stripe account to start receiving loan repayment payouts automatically.'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/lender/onboarding')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-4 cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            {hasAccount ? 'Complete Verification' : 'Connect Stripe'}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="text-primary font-semibold text-sm">Stripe Connect Active</p>
              <p className="text-muted-foreground text-xs font-mono">
                Account: {accountStatus.stripeAccountId?.slice(-12).toUpperCase()} · 
                Payouts {accountStatus.payoutsEnabled ? 'Enabled' : 'Pending'}
              </p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30 font-mono text-[10px]">
            VERIFIED
          </Badge>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" /> Total Capital Lent
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalLent.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">
            Gross principal deployed to borrowers
          </CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> EMIs Collected
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">
              ₹{stats.totalCollected.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">
            Principal recovered via monthly repayments
          </CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Outstanding Balance
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalOutstanding.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">
            Principal yet to be recovered
          </CardFooter>
        </Card>
      </div>

      {/* ── Investment Payout Breakdown ── */}
      <Card className="border-border bg-muted/50 backdrop-blur-md">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-base font-semibold">Portfolio Payout Breakdown</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Per-loan repayment collection summary across your investment portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {investments.length === 0 ? (
            <div className="p-12 text-center">
              <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No investments yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Fund a loan in the marketplace to start earning repayment payouts.
              </p>
              <Button
                onClick={() => navigate('/lender/marketplace')}
                className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 cursor-pointer"
              >
                Browse Marketplace <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {investments.map((inv) => {
                const collected = inv.fundedAmount - inv.outstandingBalance
                const progressPct = inv.fundedAmount > 0
                  ? Math.round((collected / inv.fundedAmount) * 100)
                  : 0
                const isCompleted = inv.status === 'completed'

                return (
                  <div key={inv._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-accent/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground font-mono">
                          ₹{inv.fundedAmount.toLocaleString('en-IN')}
                        </span>
                        {isCompleted ? (
                          <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED
                          </Badge>
                        ) : (
                          <Badge className="bg-warning/10 text-warning border-warning/30 text-[10px] font-mono">
                            <Clock className="w-3 h-3 mr-1" /> REPAYING
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 font-mono">
                        Ref: {inv._id.slice(-8).toUpperCase()} · Borrower: {inv.loanRequestId?.userId?.name || 'N/A'}
                      </p>
                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">
                          {progressPct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col sm:items-end gap-4 sm:gap-1 text-right shrink-0">
                      <div>
                        <span className="text-[10px] text-muted-foreground/70 uppercase font-medium block">Collected</span>
                        <span className="text-sm font-bold text-primary font-mono">
                          ₹{collected.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground/70 uppercase font-medium block">Remaining</span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          ₹{inv.outstandingBalance.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── How Payouts Work ── */}
      <Card className="border-border bg-gradient-to-b from-card to-muted/70 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-primary" /> How Payouts Work
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
            <p>Borrowers repay their monthly EMI via Stripe Payment.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
            <p>Platform deducts <strong className="text-foreground">2% fee</strong>. Remaining 98% is transferred to your Stripe Connect account via automatic transfer.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
            <p>Stripe settles the funds to your linked bank account on their standard payout schedule (typically T+2 business days).</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
