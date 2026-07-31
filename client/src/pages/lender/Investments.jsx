import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Eye,
  RefreshCw,
  Loader2,
  TrendingUp,
  Activity,
  History,
  ShieldCheck,
  ArrowRight,
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
import { calculateEMI } from '@/lib/emi'
import api from '@/lib/api'

export default function Investments() {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Selected investment for schedule detail view
  const [viewingInvestment, setViewingInvestment] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(false)

  const fetchInvestments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/loans/lender/investments')
      setInvestments(data)
    } catch (err) {
      toast.error('Failed to load investments portfolio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvestments()
  }, [])

  // Calculate statistics
  const stats = useMemo(() => {
    let totalInvested = 0
    let outstandingBalance = 0
    let activeCount = 0
    let completedCount = 0

    investments.forEach((item) => {
      totalInvested += item.fundedAmount
      outstandingBalance += item.outstandingBalance

      if (item.status === 'active' || item.status === 'repaying') {
        activeCount++
      } else if (item.status === 'completed') {
        completedCount++
      }
    })

    return { totalInvested, outstandingBalance, activeCount, completedCount }
  }, [investments])

  // Filter investments
  const filteredInvestments = useMemo(() => {
    if (activeTab === 'all') return investments
    if (activeTab === 'active') return investments.filter(item => item.status === 'active' || item.status === 'repaying')
    if (activeTab === 'completed') return investments.filter(item => item.status === 'completed')
    return investments
  }, [investments, activeTab])

  // Fetch instalment schedule when opening modal
  const handleOpenSchedule = async (inv) => {
    setViewingInvestment(inv)
    setScheduleLoading(true)
    try {
      const { data } = await api.get(`/repayments/lender/${inv._id}`)
      setSchedule(data)
    } catch (err) {
      toast.error('Failed to load repayment schedule')
      setViewingInvestment(null)
    } finally {
      setScheduleLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium font-mono text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED
          </Badge>
        )
      case 'active':
      case 'repaying':
      default:
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium font-mono text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> REPAYING
          </Badge>
        )
    }
  }

  const getRepayStatusBadge = (status) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 font-medium font-mono text-[9px]">
            OVERDUE
          </Badge>
        )
      case 'paid':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium font-mono text-[9px]">
            SETTLED
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge className="bg-warning/10 text-warning border-warning/30 font-medium font-mono text-[9px]">
            PENDING
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-8 text-foreground">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Investment Portfolios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track performance metrics of micro-loans funded by you and inspect monthly EMI repayment timelines.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInvestments}
          className="border-border bg-card hover:bg-muted text-foreground cursor-pointer h-9 px-3"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Stats Summary Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Total Capital Lent</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalInvested.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Gross capital deployed to borrowers</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Outstanding Principal</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.outstandingBalance.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Capital remaining to be collected</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Active Portfolios</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">
              {stats.activeCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Micro-loans yielding monthly EMIs</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Completed Portfolios</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">
              {stats.completedCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Fully recovered micro-loan investments</CardFooter>
        </Card>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Portfolios' },
            { id: 'active', label: 'Active Yielding' },
            { id: 'completed', label: 'Settled Portfolios' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Investments Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border bg-muted/50 animate-pulse h-52" />
          ))}
        </div>
      ) : filteredInvestments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border bg-background/80">
          <Activity className="w-10 h-10 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-bold text-foreground">No portfolios found</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            {activeTab === 'all'
              ? "You haven't funded any loan requests yet."
              : `No portfolios match the "${activeTab}" filter.`}
          </p>
          {activeTab === 'all' && (
            <Button
              onClick={() => navigate('/lender/marketplace')}
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer h-9 text-xs"
            >
              Browse Marketplace <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInvestments.map((inv) => {
            const emi = inv.loanRequestId
              ? calculateEMI(inv.fundedAmount, inv.loanRequestId.interestRate, inv.loanRequestId.tenure).emi
              : 0

            return (
              <Card key={inv._id} className="border-border bg-card hover:bg-card/80 transition-colors overflow-hidden flex flex-col justify-between">
                
                {/* Header */}
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground/70 font-mono">
                        REF: {inv._id.slice(-8).toUpperCase()}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground/90">
                          {inv.loanRequestId?.userId?.name || 'Anonymous Borrower'}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(inv.status)}
                  </div>
                </CardHeader>

                {/* Content */}
                <CardContent className="space-y-3 pb-6 flex-1">
                  <div className="grid grid-cols-3 gap-2 py-2.5 rounded-xl bg-background/50 border border-border/80 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-muted-foreground/70 block uppercase font-medium">Lent Amount</span>
                      <span className="text-xs font-bold text-foreground">₹{inv.fundedAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/70 block uppercase font-medium">Outstanding</span>
                      <span className="text-xs font-bold text-foreground/80">₹{inv.outstandingBalance.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground/70 block uppercase font-medium">Monthly EMI</span>
                      <span className="text-xs font-bold text-primary">₹{emi}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-muted-foreground space-y-1 leading-relaxed">
                    <span className="text-foreground/60 font-semibold flex items-center gap-1.5 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Application Purpose:
                    </span>
                    <p className="line-clamp-2 italic">"{inv.loanRequestId?.reason || 'Micro finance funding request.'}"</p>
                  </div>
                </CardContent>

                {/* Footer */}
                <CardFooter className="bg-background/30 border-t border-border/50 py-3 px-4 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/70 font-mono">
                    Funded on {new Date(inv.fundedAt).toLocaleDateString('en-IN')}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenSchedule(inv)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-xs cursor-pointer px-3"
                  >
                    <Eye className="w-4 h-4 mr-1.5" /> View Timeline
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Dialog: Repayment Timeline Checklist ── */}
      <Dialog open={!!viewingInvestment} onOpenChange={(open) => !open && setViewingInvestment(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg flex items-center justify-between pr-4">
              <span>Instalment Recovery Timeline</span>
              <span className="font-mono text-primary">
                ₹{viewingInvestment?.fundedAmount.toLocaleString('en-IN')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-mono">
              Borrower: {viewingInvestment?.loanRequestId?.userId?.name || 'Verified Member'}
            </DialogDescription>
          </DialogHeader>

          {scheduleLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground text-xs mt-3">Loading repayments checklist...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-background/60 p-3 rounded-xl border border-border/80 font-mono">
                <div>
                  <span className="text-muted-foreground/70 block uppercase font-medium">Interest Return</span>
                  <span className="font-semibold text-foreground">12.0% p.a. Fixed</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70 block uppercase font-medium">Tenure Duration</span>
                  <span className="font-semibold text-foreground">
                    {viewingInvestment?.loanRequestId?.tenure || schedule.length} Months
                  </span>
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground/70 block uppercase font-medium">Outstanding Principal</span>
                  <span className="font-semibold text-foreground/80 font-mono">₹{viewingInvestment?.outstandingBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground/70 block uppercase font-medium">Yield Recovered</span>
                  <span className="font-semibold text-primary font-mono">
                    ₹{schedule.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.emiAmount, 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Schedule List */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground/70 font-medium uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Instalments Checklist
                </span>
                
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {schedule.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-background/50 border border-border/40 font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-muted text-foreground/80 flex items-center justify-center text-[10px] font-bold">
                          {item.instalmentNumber}
                        </span>
                        <div className="text-left font-sans">
                          <p className="text-foreground/80 text-xs font-semibold">
                            ₹{item.emiAmount.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Due: {new Date(item.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getRepayStatusBadge(item.status)}
                        {item.status === 'paid' && (
                          <span className="text-[9px] text-muted-foreground/70 hidden sm:inline" title={`Paid on ${new Date(item.paidAt).toLocaleDateString('en-IN')}`}>
                            {item.stripePaymentIntentId?.slice(-6).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-background/40 border-t border-border/60 p-4">
            <Button
              variant="outline"
              onClick={() => setViewingInvestment(null)}
              className="border-border bg-card text-foreground hover:bg-muted cursor-pointer text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
