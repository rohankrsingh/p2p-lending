import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  IndianRupee,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Calendar,
  Plus,
  Banknote,
  Wallet,
  CreditCard,
  Percent,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm mt-3">Loading your financial snapshot...</p>
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
    <div className="space-y-8 text-white">
      {/* Overdue alert banner */}
      {stats.overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 font-semibold">
              {stats.overdueCount} instalment{stats.overdueCount > 1 ? 's' : ''} overdue
            </p>
            <p className="text-red-200/70 mt-0.5 text-xs">
              Pay immediately to avoid additional fees and credit impact.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/borrower/repayments')}
            className="bg-red-500 hover:bg-red-400 text-white text-xs h-8 px-3 cursor-pointer shrink-0"
          >
            Pay Now <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              Borrower Desk
            </Badge>
            <span className="text-xs text-slate-400">• Loan Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">My Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your loans, repayments, and financial health at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/borrower/create-loan')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-9 text-xs px-4 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Loan Request
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-white cursor-pointer h-9 px-3"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Total Borrowed</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              ₹{stats.totalBorrowed.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Total capital borrowed across all loans</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              ₹{stats.totalOutstanding.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Remaining principal to repay</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Active Loans</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400 font-mono">{stats.activeLoanCount}</CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Loans currently in repayment</CardFooter>
        </Card>

        <Card className={`border-slate-800 bg-slate-900/60 shadow-md ${stats.overdueCount > 0 ? 'ring-1 ring-red-500/30' : ''}`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Pending Requests</CardDescription>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold text-white font-mono">{stats.pendingLoanCount}</CardTitle>
              {stats.overdueCount > 0 && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] font-mono">
                  {stats.overdueCount} OVERDUE
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">
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
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">My Active Loans</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Repayment progress across all your loans.
                  </CardDescription>
                </div>
                <span
                  onClick={() => navigate('/borrower/loans')}
                  className="text-xs text-emerald-400 hover:underline font-semibold flex items-center cursor-pointer"
                >
                  All Loans <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeLoans.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Wallet className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No active loans yet</p>
                  <p className="text-xs text-slate-600 mt-1">Create a loan request to get started.</p>
                  <Button
                    onClick={() => navigate('/borrower/create-loan')}
                    className="mt-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs h-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Request a Loan
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-900">
                  {activeLoans.map((loan) => (
                    <div key={loan._id} className="p-5 space-y-3 hover:bg-slate-900/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-white font-mono">
                            ₹{loan.fundedAmount.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {loan.tenure} months @ {loan.interestRate}% p.a.
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-medium">
                            {loan.paidInstalments}/{loan.totalInstalments} PAID
                          </Badge>
                          <p className="text-[10px] text-slate-500 mt-1">
                            EMI: ₹{loan.emiAmount.toLocaleString('en-IN')}/mo
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>{loan.progress}% complete</span>
                          <span>₹{loan.outstandingBalance.toLocaleString('en-IN')} remaining</span>
                        </div>
                        <Progress value={loan.progress} className="h-2 bg-slate-800 [&>div]:bg-emerald-500" />
                      </div>

                      {loan.reason && (
                        <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-1">
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
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Upcoming Repayments</CardTitle>
                <span
                  onClick={() => navigate('/borrower/repayments')}
                  className="text-xs text-emerald-400 hover:underline font-semibold flex items-center cursor-pointer"
                >
                  View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
              <CardDescription className="text-slate-400 text-xs">Next 3 instalments due.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingRepayments.length === 0 ? (
                <p className="p-6 text-slate-500 text-xs text-center">No upcoming repayments — all caught up!</p>
              ) : (
                <div className="divide-y divide-slate-900">
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
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {isOverdue ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white font-mono">
                              ₹{inst.emiAmount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-slate-500">
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
                              ? 'bg-red-500 hover:bg-red-400 text-white text-xs h-8 px-3 cursor-pointer'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 px-3 cursor-pointer'
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
            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="pb-4 border-b border-slate-900">
                <CardTitle className="text-base font-semibold">Pending Requests</CardTitle>
                <CardDescription className="text-slate-400 text-xs">
                  Loan requests awaiting a lender match.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-900">
                  {pendingLoans.slice(0, 3).map((loan) => (
                    <div key={loan._id} className="p-4 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white font-mono">
                          ₹{loan.amount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-500">{loan.tenure} months</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-mono">
                        <Clock className="w-3 h-3 mr-1" /> PENDING
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info Card */}
          <Card className="border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" /> Loan at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span>Interest Rate</span>
                <span className="font-semibold text-white">12% p.a. fixed</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span>Platform Fee</span>
                <span className="font-semibold text-emerald-400">2% per repayment</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span>Late Penalty</span>
                <span className="font-semibold text-amber-400">1.5% monthly</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
