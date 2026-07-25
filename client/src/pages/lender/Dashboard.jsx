import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Store,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import api from '@/lib/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const response = await api.get('/loans/lender/dashboard')
      setData(response.data)
    } catch (err) {
      toast.error('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm mt-3">Loading investment portfolio...</p>
      </div>
    )
  }

  const { stats, recentInvestments, recentTransactions } = data || {
    stats: { totalInvested: 0, activeInvestments: 0, expectedMonthlyPayout: 0, totalInterestEarned: 0 },
    recentInvestments: [],
    recentTransactions: [],
  }

  return (
    <div className="space-y-8 text-white">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              Investor Desk
            </Badge>
            <span className="text-xs text-slate-400">• Portfolio Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Lender Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Overview of your active investments, interest returns, and capital allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/lender/marketplace')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-9 text-xs px-4 shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            Invest Capital <Store className="w-3.5 h-3.5 ml-2" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-white cursor-pointer h-9 px-3"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Active Portfolio Value</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              ₹{stats.totalInvested.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Total capital deployed to borrowers</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Interest & Yield Earned</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400 font-mono">
              ₹{stats.totalInterestEarned.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Gross interest returns collected</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Active Micro-Loans</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              {stats.activeInvestments}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Lent profiles in repaying state</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Expected Monthly Inflow</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              ₹{stats.expectedMonthlyPayout.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Projected EMI settlements this month</CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── Left Side: Active Portfolios ── */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Active Deployed Capital</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Overview of recent micro-loans funded by you.</CardDescription>
                </div>
                <Link to="/lender/investments" className="text-xs text-emerald-400 hover:underline font-semibold flex items-center">
                  All Portfolios <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvestments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Activity className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No investments funded yet</p>
                  <p className="text-xs text-slate-600 mt-1">Visit the marketplace to fund your first loan request.</p>
                  <Button
                    onClick={() => navigate('/lender/marketplace')}
                    className="mt-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs h-8 cursor-pointer"
                  >
                    Browse Marketplace
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-900">
                  {recentInvestments.map((inv) => (
                    <div key={inv._id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {inv.loanRequestId?.userId?.name || 'Anonymous Borrower'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {inv._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-base font-bold text-white font-mono">
                          ₹{inv.fundedAmount.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          Outstanding: ₹{inv.outstandingBalance.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-[10px] text-slate-500 font-mono uppercase">
                          {inv.loanRequestId?.tenure} Mos @ {inv.loanRequestId?.interestRate || 12}%
                        </div>
                        <div>
                          {inv.status === 'active' || inv.status === 'repaying' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-mono font-medium">
                              REPAYING
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-mono font-medium">
                              COMPLETED
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Side: Recent Transactions ── */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900">
              <CardTitle className="text-base font-semibold">Recent Wallet Movement</CardTitle>
              <CardDescription className="text-slate-400 text-xs">Funding outflows and repayment inflows.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <p className="p-6 text-slate-500 text-xs text-center">No recent wallet transactions.</p>
              ) : (
                <div className="divide-y divide-slate-900">
                  {recentTransactions.map((tx) => {
                    const isOutflow = tx.type === 'funding';
                    return (
                      <div key={tx._id} className="p-4 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isOutflow ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {isOutflow ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {isOutflow ? 'Capital Outflow' : 'EMI Settlement'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {isOutflow 
                                ? `Funded loan ${tx.fundedLoanId?.toString().slice(-6).toUpperCase()}` 
                                : `From ${tx.fromUserId?.name || 'Borrower'}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <p className={`font-bold ${isOutflow ? 'text-slate-300' : 'text-emerald-400'}`}>
                            {isOutflow ? '-' : '+'}₹{tx.amount}
                          </p>
                          <p className="text-[9px] text-slate-600">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
