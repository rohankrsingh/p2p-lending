import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CreditCard,
  History,
  ShieldCheck,
  TrendingDown,
  Info,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import api from '@/lib/api'

export default function Repayments() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // pending | paid

  // Selected instalment for simulated payment
  const [payingInstalment, setPayingInstalment] = useState(null)
  const [payLoading, setPayLoading] = useState(false)

  const fetchRepayments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/repayments/borrower')
      setSchedules(data)
    } catch (err) {
      toast.error('Failed to load repayment schedule')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRepayments()
  }, [])

  // Calculate statistics
  const stats = useMemo(() => {
    let outstandingBalance = 0
    let paidCount = 0
    let remainingCount = 0
    let nextDue = null

    // Track unique funded loans to sum their outstanding balances
    const uniqueLoans = {}

    schedules.forEach((item) => {
      if (item.fundedLoanId) {
        uniqueLoans[item.fundedLoanId._id] = item.fundedLoanId.outstandingBalance
      }

      if (item.status === 'paid') {
        paidCount++
      } else {
        remainingCount++
        // Find next due instalment (due in future or overdue, sorted by dueDate)
        if (!nextDue || new Date(item.dueDate) < new Date(nextDue.dueDate)) {
          nextDue = item
        }
      }
    })

    outstandingBalance = Object.values(uniqueLoans).reduce((sum, bal) => sum + bal, 0)

    return { outstandingBalance, paidCount, remainingCount, nextDue }
  }, [schedules])

  // Filter instalments by status
  const filteredInstalments = useMemo(() => {
    if (activeTab === 'pending') {
      return schedules.filter(item => item.status === 'pending' || item.status === 'overdue')
    }
    return schedules.filter(item => item.status === 'paid')
  }, [schedules, activeTab])

  // Handle pay confirmation
  const handlePayment = async () => {
    if (!payingInstalment) return
    setPayLoading(true)
    try {
      const { data } = await api.post(`/repayments/${payingInstalment._id}/pay`)
      toast.success(data.message || 'Instalment paid successfully')
      setPayingInstalment(null)
      fetchRepayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Repayment processing failed')
    } finally {
      setPayLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 font-medium font-mono text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" /> OVERDUE
          </Badge>
        )
      case 'paid':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium font-mono text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> SUCCESSFUL
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium font-mono text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> PENDING
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Repayments & EMIs</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your monthly micro-loan instalments, clear pending dues, and view past settlement history.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRepayments}
          className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-white cursor-pointer h-9 px-3"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Stats Summary Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              ₹{stats.outstandingBalance.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Principal remaining on active loans</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Instalments Settled</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400 font-mono">
              {stats.paidCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Completed monthly payments</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Remaining Dues</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400 font-mono">
              {stats.remainingCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-slate-500">Unsettled future monthly EMIs</CardFooter>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-medium">Next Due Amount</CardDescription>
            <CardTitle className="text-2xl font-bold text-white font-mono">
              ₹{stats.nextDue ? stats.nextDue.emiAmount.toLocaleString('en-IN') : '0'}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-amber-400 truncate">
            {stats.nextDue
              ? `Due on ${new Date(stats.nextDue.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
              : 'All caught up!'}
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Instalments Schedule list ── */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-slate-900 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Repayment Schedule</CardTitle>
                <CardDescription className="text-slate-400">List of monthly instalment schedules and payment triggers.</CardDescription>
              </div>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab('paid')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'paid'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paid History
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                  <p className="text-slate-400 text-sm mt-3">Loading schedules...</p>
                </div>
              ) : filteredInstalments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <CreditCard className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No repayment items found</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {activeTab === 'pending'
                      ? 'All outstanding instalments paid! Great job.'
                      : 'No past settlements recorded.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-900">
                  {filteredInstalments.map((item) => (
                    <div
                      key={item._id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            Instalment #{item.instalmentNumber}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">
                            ID: {item._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-white font-mono">
                          ₹{item.emiAmount.toLocaleString('en-IN')}
                        </p>
                        {item.fundedLoanId?.loanRequestId && (
                          <p className="text-xs text-slate-400 line-clamp-1 italic">
                            Purpose: "{item.fundedLoanId.loanRequestId.reason}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col sm:items-end justify-between sm:justify-center gap-3">
                        <div className="space-y-1 text-left sm:text-right">
                          <span className="text-[10px] text-slate-500 block uppercase font-medium">Due Date</span>
                          <span className="text-xs text-slate-300 font-mono">
                            {new Date(item.dueDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {getStatusBadge(item.status)}

                          {item.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => setPayingInstalment(item)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-8 text-xs px-3 shadow-md shadow-emerald-500/10 cursor-pointer"
                            >
                              Pay Now
                            </Button>
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

        {/* ── Right Column: Platform Disclosures & Transaction Log summary ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Security details card */}
          <Card className="border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" /> Auto-Debit Guarantee
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 space-y-3 leading-relaxed">
              <p>
                All micro-loans include <strong>Automated Clearing House (ACH) / NACH</strong> authorization. Dues are automatically debited on their scheduled date.
              </p>
              <p>
                To avoid <strong>overdue status</strong> or bank bounce fees, ensure your connected bank account is funded at least 24 hours prior to the due date.
              </p>
              <p className="text-emerald-400/90 font-medium">
                Tip: Paying early manually logs the transaction instantly and avoids any gateway delays.
              </p>
            </CardContent>
          </Card>

          {/* Settle timeline card */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <History className="w-4.5 h-4.5 text-emerald-400" /> Settle Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              {loading ? (
                <p className="text-slate-500">Checking logs...</p>
              ) : schedules.filter(s => s.status === 'paid').length === 0 ? (
                <p className="text-slate-500">No settled history found.</p>
              ) : (
                <div className="space-y-3">
                  {schedules
                    .filter(s => s.status === 'paid')
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item._id}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-850 space-y-1 font-mono text-[11px]"
                      >
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Instalment #{item.instalmentNumber}</span>
                          <span className="text-emerald-400 font-bold">₹{item.emiAmount}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>Paid on {new Date(item.paidAt).toLocaleDateString('en-IN')}</span>
                          <span className="truncate max-w-[100px]" title={item.stripePaymentIntentId}>
                            {item.stripePaymentIntentId?.slice(-8)}
                          </span>
                        </div>
                      </div>
                    ))}
                  {schedules.filter(s => s.status === 'paid').length > 3 && (
                    <p className="text-[10px] text-center text-slate-500 italic">
                      + {schedules.filter(s => s.status === 'paid').length - 3} more payments logged
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Payment Confirmation Dialog ── */}
      <Dialog open={!!payingInstalment} onOpenChange={(open) => !open && setPayingInstalment(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Confirm Instalment Payment</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Authorize payment for instalment #{payingInstalment?.instalmentNumber} of loan reference {payingInstalment?.fundedLoanId?._id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {payingInstalment && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Amount Due
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  ₹{payingInstalment.emiAmount.toLocaleString('en-IN')}
                </div>
                <p className="text-[10px] text-slate-400">
                  Due on {new Date(payingInstalment.dueDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div className="text-xs text-slate-400 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>Interest rate</span>
                  <span className="font-semibold text-white">12.0% p.a.</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span>Payment Gateway</span>
                  <span className="font-semibold text-emerald-400">Mock Stripe Intent</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-slate-950/40 border-t border-slate-800/60 p-4 -mx-4 -mb-4">
            <Button
              variant="ghost"
              onClick={() => setPayingInstalment(null)}
              className="text-slate-400 hover:text-white cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={payLoading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer text-xs h-10 px-4 shadow-lg shadow-emerald-500/10"
            >
              {payLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                'Confirm & Pay Now'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
