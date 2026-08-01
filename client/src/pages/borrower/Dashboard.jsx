import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Plus,
  Wallet,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import api from '@/lib/api'

const STATUS_MAP = {
  pending: 'PENDING',
  funded: 'FUNDED',
  repaying: 'REPAYING',
  completed: 'COMPLETED',
  defaulted: 'DEFAULTED',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/loans/borrower/dashboard')
      setData(data)
    } catch (err) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm mt-3">Loading your financial snapshot...</p>
      </div>
    )
  }

  const { stats, activeLoans, upcomingRepayments, pendingLoans } = data || {
    stats: { totalBorrowed: 0, totalOutstanding: 0, activeLoanCount: 0, overdueCount: 0, pendingLoanCount: 0 },
    activeLoans: [],
    upcomingRepayments: [],
    pendingLoans: [],
  }

  return (
    <div className="space-y-8 text-foreground">
      {/* Overdue alert banner */}
      {stats.overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-destructive/20 border border-destructive/30 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-destructive/80 font-semibold">
              {stats.overdueCount} instalment{stats.overdueCount > 1 ? 's' : ''} overdue
            </p>
            <p className="text-destructive/70 mt-0.5 text-xs">
              Pay immediately to avoid additional fees and credit impact.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/borrower/repayments')}
            className="bg-destructive hover:bg-destructive/90 text-foreground text-xs h-8 px-3 cursor-pointer shrink-0"
          >
            Pay Now <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
              Borrower Desk
            </Badge>
            <span className="text-xs text-muted-foreground">• Loan Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your loans, repayments, and financial health at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/borrower/create-loan')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs px-4 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Loan Request
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            aria-label="Refresh"
            className="border-border bg-card hover:bg-muted text-foreground cursor-pointer h-9 px-3"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Total Borrowed</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalBorrowed.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Total capital borrowed across all loans</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalOutstanding.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Remaining principal to repay</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Active Loans</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">{stats.activeLoanCount}</CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Loans currently in repayment</CardFooter>
        </Card>

          <Card className={`border-border bg-card shadow-md ${stats.overdueCount > 0 ? 'ring-1 ring-destructive/30' : ''}`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Pending Requests</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold text-foreground font-mono">{stats.pendingLoanCount}</CardTitle>
              {stats.overdueCount > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-mono">
                  {stats.overdueCount} OVERDUE
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">
            {stats.overdueCount > 0
              ? `${stats.overdueCount} overdue instalment${stats.overdueCount > 1 ? 's' : ''}`
              : 'Loan requests awaiting lender review'}
          </CardFooter>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Loans with Progress */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border bg-muted/50 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">My Active Loans</CardTitle>
                  <CardDescription className="text-muted-foreground text-xs">
                    Repayment progress across all your loans.
                  </CardDescription>
                </div>
                <Link
                  to="/borrower/my-loans"
                  className="text-xs text-primary hover:underline font-semibold flex items-center cursor-pointer"
                >
                  All Loans <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeLoans.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground/70">
                  <Wallet className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No active loans yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Create a loan request to get started.</p>
                  <Button
                    onClick={() => navigate('/borrower/create-loan')}
                    className="mt-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs h-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Request a Loan
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeLoans.map((loan) => (
                    <div key={loan._id} className="p-5 space-y-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground font-mono">
                            ₹{loan.fundedAmount.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 font-mono">
                            {loan.tenure} months @ {loan.interestRate}% p.a.
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono font-medium">
                            {loan.paidInstalments}/{loan.totalInstalments} PAID
                          </Badge>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            EMI: ₹{loan.emiAmount.toLocaleString('en-IN')}/mo
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground/70">
                          <span>{loan.progress}% complete</span>
                          <span>₹{loan.outstandingBalance.toLocaleString('en-IN')} remaining</span>
                        </div>
                        <Progress value={loan.progress} className="h-2 bg-muted [&>div]:bg-primary" />
                      </div>

                      {loan.reason && (
                        <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-1">
                          "{loan.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Upcoming Repayments + Pending Loans */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Repayments */}
          <Card className="border-border bg-muted/50 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Upcoming Repayments</CardTitle>
                <Link
                  to="/borrower/repayments"
                  className="text-xs text-primary hover:underline font-semibold flex items-center cursor-pointer"
                >
                  View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
              <CardDescription className="text-muted-foreground text-xs">Next 3 instalments due.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingRepayments.length === 0 ? (
                <p className="p-6 text-muted-foreground/70 text-xs text-center">No upcoming repayments — all caught up!</p>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingRepayments.map((inst) => {
                    const isOverdue = inst.status === 'overdue'
                    const daysUntilDue = Math.ceil(
                      (new Date(inst.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <div key={inst._id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isOverdue
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {isOverdue ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground font-mono">
                              ₹{inst.emiAmount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70">
                              Instalment #{inst.instalmentNumber}
                              {isOverdue
                                ? ` — overdue by ${Math.abs(daysUntilDue)}d`
                                : daysUntilDue <= 0
                                  ? ' — due today'
                                  : ` — due in ${daysUntilDue}d`}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate('/borrower/repayments')}
                          className={
                            isOverdue
                              ? 'bg-destructive hover:bg-destructive/90 text-foreground text-xs h-8 px-3 cursor-pointer'
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 cursor-pointer'
                          }
                        >
                          {isOverdue ? 'Pay Overdue' : 'Pay Now'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Loan Requests */}
          {pendingLoans.length > 0 && (
            <Card className="border-border bg-muted/50 backdrop-blur-md">
              <CardHeader className="pb-4 border-b border-border">
                <CardTitle className="text-base font-semibold">Pending Requests</CardTitle>
                <CardDescription className="text-muted-foreground text-xs">
                  Loan requests awaiting a lender match.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pendingLoans.slice(0, 3).map((loan) => (
                    <div key={loan._id} className="p-4 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-foreground font-mono">
                          ₹{loan.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">{loan.tenure} months</p>
                      </div>
                      <Badge className="bg-warning/10 text-warning border-warning/30 text-[10px] font-mono">
                        <Clock className="w-3 h-3 mr-1" /> PENDING
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info Card */}
          <Card className="border-border bg-linear-to-b from-card to-muted/70 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-primary" /> Loan at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span>Interest Rate</span>
                <span className="font-semibold text-foreground">12% p.a. fixed</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span>Platform Fee</span>
                <span className="font-semibold text-primary">2% per repayment</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span>Late Penalty</span>
                <span className="font-semibold text-warning">1.5% monthly</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
