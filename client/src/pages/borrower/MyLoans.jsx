import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import {
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Edit2,
  Trash2,
  Eye,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Loader2,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

const TENURE_OPTIONS = [3, 6, 9, 12, 18, 24]

export default function MyLoans() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Selected loan for viewing schedule/details
  const [viewingLoan, setViewingLoan] = useState(null)
  
  // Selected loan for editing
  const [editingLoan, setEditingLoan] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', tenure: '', reason: '' })
  const [editLoading, setEditLoading] = useState(false)

  // Selected loan for cancellation
  const [cancellingLoan, setCancellingLoan] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const fetchLoans = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/loans/my')
      setLoans(data)
    } catch (err) {
      toast.error('Failed to fetch your loans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [])

  // Calculate high-level stats
  const stats = useMemo(() => {
    let totalBorrowed = 0
    let activeCount = 0
    let pendingCount = 0
    let totalMonthlyEmi = 0

    loans.forEach((loan) => {
      if (loan.status !== 'cancelled') {
        totalBorrowed += loan.amount
      }
      if (loan.status === 'active' || loan.status === 'funded') {
        activeCount++
        totalMonthlyEmi += loan.emi || 0
      }
      if (loan.status === 'pending') {
        pendingCount++
      }
    });

    return { totalBorrowed, activeCount, pendingCount, totalMonthlyEmi }
  }, [loans])

  // Filter loans by tab selection
  const filteredLoans = useMemo(() => {
    if (activeTab === 'all') return loans
    if (activeTab === 'pending') return loans.filter(l => l.status === 'pending')
    if (activeTab === 'active') return loans.filter(l => l.status === 'active' || l.status === 'funded')
    if (activeTab === 'completed') return loans.filter(l => l.status === 'completed' || l.status === 'paid')
    return loans
  }, [loans, activeTab])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/30 font-medium">
            <Clock className="w-3 h-3 mr-1" /> Pending Funding
          </Badge>
        )
      case 'funded':
      case 'active':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
          </Badge>
        )
      case 'completed':
      case 'paid':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Fully Repaid
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-muted text-muted-foreground border-border font-medium">
            <XCircle className="w-3 h-3 mr-1" /> Cancelled
          </Badge>
        )
      default:
        return <Badge className="bg-muted text-foreground/80 capitalize">{status}</Badge>
    }
  }

  // Handle Edit Loan Modal opening
  const openEditModal = (loan) => {
    setEditingLoan(loan)
    setEditForm({
      amount: loan.amount,
      tenure: loan.tenure,
      reason: loan.reason,
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (editForm.amount < 1000 || editForm.amount > 50000) {
      toast.error('Amount must be between ₹1,000 and ₹50,000')
      return
    }
    if (editForm.reason.trim().length < 10) {
      toast.error('Please enter a detailed reason')
      return
    }

    setEditLoading(true)
    try {
      await api.put(`/loans/${editingLoan._id}`, {
        amount: Number(editForm.amount),
        tenure: Number(editForm.tenure),
        reason: editForm.reason.trim(),
      })
      toast.success('Loan request updated successfully')
      setEditingLoan(null)
      fetchLoans()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update loan request')
    } finally {
      setEditLoading(false)
    }
  }

  // Handle Cancel Loan confirmation
  const handleCancelConfirm = async () => {
    setCancelLoading(true)
    try {
      await api.delete(`/loans/${cancellingLoan._id}`)
      toast.success('Loan request cancelled successfully')
      setCancellingLoan(null)
      fetchLoans()
    } catch (err) {
      toast.error('Failed to cancel loan request')
    } finally {
      setCancelLoading(false)
    }
  }

  // Generate simulated schedule preview for detailed view
  const previewSchedule = useMemo(() => {
    if (!viewingLoan) return []
    const schedule = []
    const baseDate = new Date(viewingLoan.createdAt)
    const emiAmount = viewingLoan.emi || calculateEMI(viewingLoan.amount, viewingLoan.interestRate, viewingLoan.tenure).emi

    for (let i = 1; i <= viewingLoan.tenure; i++) {
      const dueDate = new Date(baseDate)
      dueDate.setMonth(dueDate.getMonth() + i)
      schedule.push({
        instalmentNumber: i,
        dueDate: dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        emiAmount,
      })
    }
    return schedule
  }, [viewingLoan])

  return (
    <div className="space-y-8 text-foreground">
      {/* Page Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">My Loans & Portfolios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track active loan progress, monitor repayment schedules, and update pending credit requests.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLoans}
          className="border-border bg-card hover:bg-muted text-foreground cursor-pointer h-9 px-3"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Total Borrowed Amount</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalBorrowed.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Excludes cancelled requests</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Active Loans</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">
              {stats.activeCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Currently generating EMIs</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Pending Requests</CardDescription>
            <CardTitle className="text-2xl font-bold text-warning font-mono">
              {stats.pendingCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Awaiting peer investor match</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Monthly Outflow (EMI)</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.totalMonthlyEmi.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Total EMI for all active loans</CardFooter>
        </Card>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending Match' },
            { id: 'active', label: 'Active Loans' },
            { id: 'completed', label: 'Completed' },
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

      {/* ── Loans Grid List ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border bg-muted/50 animate-pulse h-52" />
          ))}
        </div>
      ) : filteredLoans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border bg-background/80">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-bold text-foreground">No loan requests found</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            {activeTab === 'all'
              ? "You haven't submitted any loan requests yet."
              : `No requests match the "${activeTab}" filter right now.`}
          </p>
          {activeTab === 'all' && (
            <Button
              onClick={() => navigate('/borrower/create-loan')}
              className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer h-9 text-xs"
            >
              Apply for a Loan <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLoans.map((loan) => (
            <Card key={loan._id} className="border-border bg-card hover:bg-card/80 transition-colors overflow-hidden flex flex-col justify-between">
              
              {/* Card Header & Badges */}
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground/70 font-mono">
                      ID: {loan._id.slice(-8).toUpperCase()}
                    </p>
                    <CardTitle className="text-lg font-bold text-foreground font-mono">
                      ₹{loan.amount.toLocaleString('en-IN')}
                    </CardTitle>
                  </div>
                  {getStatusBadge(loan.status)}
                </div>
              </CardHeader>

              {/* Card Body */}
              <CardContent className="space-y-3 pb-6 flex-1">
                <div className="grid grid-cols-3 gap-2 py-2.5 rounded-xl bg-background/50 border border-border/80 text-center font-mono">
                  <div>
                    <span className="text-[9px] text-muted-foreground/70 block uppercase font-medium">Tenure</span>
                    <span className="text-xs font-bold text-foreground">{loan.tenure} Mos</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/70 block uppercase font-medium">Interest</span>
                    <span className="text-xs font-bold text-primary">12% p.a.</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground/70 block uppercase font-medium">Monthly EMI</span>
                    <span className="text-xs font-bold text-foreground">₹{loan.emi || calculateEMI(loan.amount, loan.interestRate, loan.tenure).emi}</span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-muted-foreground space-y-1 leading-relaxed">
                  <span className="text-foreground/60 font-semibold flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Loan Purpose:
                  </span>
                  <p className="line-clamp-2 italic">"{loan.reason}"</p>
                </div>
              </CardContent>

              {/* Card Actions Footer */}
              <CardFooter className="bg-background/30 border-t border-border/50 py-3 px-4 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground/70 font-mono">
                  Applied on {new Date(loan.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingLoan(loan)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                    title="View Details & Schedule"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  {loan.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(loan)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg cursor-pointer"
                        title="Edit Application"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCancellingLoan(loan)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg cursor-pointer"
                        title="Cancel Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* ── Dialog 1: View Loan Details & Instalment Schedule ── */}
      <Dialog open={!!viewingLoan} onOpenChange={(open) => !open && setViewingLoan(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg flex items-center justify-between pr-4">
              <span>Loan Details</span>
              <span className="font-mono text-primary">
                ₹{viewingLoan?.amount.toLocaleString('en-IN')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-mono">
              Loan Reference: {viewingLoan?._id}
            </DialogDescription>
          </DialogHeader>

          {viewingLoan && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-background/60 p-3 rounded-xl border border-border/80">
                <div>
                  <span className="text-muted-foreground/70 block uppercase font-medium">Interest Rate</span>
                  <span className="font-semibold text-foreground">12.0% p.a. Fixed</span>
                </div>
                <div>
                  <span className="text-muted-foreground/70 block uppercase font-medium">Tenure Duration</span>
                  <span className="font-semibold text-foreground">{viewingLoan.tenure} Months</span>
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground/70 block uppercase font-medium">Monthly EMI</span>
                  <span className="font-semibold text-primary font-mono">₹{viewingLoan.emi || calculateEMI(viewingLoan.amount, viewingLoan.interestRate, viewingLoan.tenure).emi}</span>
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground/70 block uppercase font-medium">Current Status</span>
                  <span className="font-semibold capitalize text-foreground">{viewingLoan.status}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground/70 font-medium uppercase">Purpose</span>
                <p className="text-xs text-foreground/80 leading-relaxed italic bg-background/30 p-2.5 rounded-lg border border-border">
                  "{viewingLoan.reason}"
                </p>
              </div>

              <Separator className="bg-muted" />

              {/* Schedule List */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground/70 font-medium uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Estimated Instalment Timeline
                </span>
                
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {previewSchedule.map((item) => (
                    <div
                      key={item.instalmentNumber}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-background/50 border border-border/40 font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-muted text-foreground/80 flex items-center justify-center text-[10px] font-bold">
                          {item.instalmentNumber}
                        </span>
                        <span className="text-muted-foreground font-sans">{item.dueDate}</span>
                      </div>
                      <span className="font-semibold text-foreground">₹{item.emiAmount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="bg-background/40 border-t border-border/60 p-4">
            <Button
              variant="outline"
              onClick={() => setViewingLoan(null)}
              className="border-border bg-card text-foreground hover:bg-muted cursor-pointer text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Edit Pending Loan ── */}
      <Dialog open={!!editingLoan} onOpenChange={(open) => !open && setEditingLoan(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">Edit Loan Application</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Update details for pending application {editingLoan?._id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount" className="text-xs text-foreground/80 uppercase">Loan Amount (₹)</Label>
              <Input
                id="edit-amount"
                type="number"
                min={1000}
                max={50000}
                value={editForm.amount}
                onChange={(e) => setEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-primary-500/20 text-sm h-10 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-tenure" className="text-xs text-foreground/80 uppercase">Tenure (Months)</Label>
              <select
                id="edit-tenure"
                value={editForm.tenure}
                onChange={(e) => setEditForm(prev => ({ ...prev, tenure: Number(e.target.value) }))}
                className="w-full bg-background border border-border text-foreground rounded-lg p-2 h-10 text-sm focus:border-primary focus:ring-primary-500/20 outline-none"
              >
                {TENURE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt} Months</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-reason" className="text-xs text-foreground/80 uppercase">Purpose of Loan</Label>
              <Textarea
                id="edit-reason"
                rows={3}
                value={editForm.reason}
                onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-background border-border text-foreground focus:border-primary focus:ring-primary-500/20 text-sm rounded-lg resize-none"
                placeholder="Explain purpose of loan..."
              />
            </div>

            <DialogFooter className="bg-background/40 border-t border-border/60 p-4 -mx-4 -mb-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingLoan(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer text-xs"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: Confirm Cancellation ── */}
      <Dialog open={!!cancellingLoan} onOpenChange={(open) => !open && setCancellingLoan(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Cancel Loan Request?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Are you sure you want to cancel this pending loan request for ₹{cancellingLoan?.amount.toLocaleString('en-IN')}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="bg-background/40 border-t border-border/60 p-4 -mx-4 -mb-4">
            <Button
              variant="ghost"
              onClick={() => setCancellingLoan(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
            >
              Keep Request
            </Button>
            <Button
              onClick={handleCancelConfirm}
              disabled={cancelLoading}
              className="bg-destructive hover:bg-destructive text-foreground font-semibold cursor-pointer text-xs"
            >
              {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
