import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  IndianRupee,
  Calendar,
  Clock,
  Filter,
  ArrowUpDown,
  FileText,
  User,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function Marketplace() {
  const navigate = useNavigate()

  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 6, pages: 1 })

  // Filters State
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [tenure, setTenure] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  // Selected Loan for Detail View and Invest
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [loanDetails, setLoanDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [investLoading, setInvestLoading] = useState(false)

  const fetchMarketplace = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 6)
      params.append('sort', sort)

      if (minAmount) params.append('minAmount', minAmount)
      if (maxAmount) params.append('maxAmount', maxAmount)
      if (tenure) params.append('tenure', tenure)

      const { data } = await api.get(`/loans/marketplace?${params.toString()}`)
      setLoans(data.loans)
      setPagination(data.pagination)
    } catch (err) {
      toast.error('Failed to load marketplace listings')
    } finally {
      setLoading(false)
    }
  }

  // Trigger fetch when parameters or page change
  useEffect(() => {
    fetchMarketplace()
  }, [page, sort, tenure])

  // Fetch full details of selected loan
  const handleViewDetails = async (loan) => {
    setSelectedLoan(loan)
    setDetailsLoading(true)
    try {
      const { data } = await api.get(`/loans/${loan._id}`)
      setLoanDetails(data)
    } catch (err) {
      toast.error('Failed to load loan details')
      setSelectedLoan(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  // Handle funding/investment action
  const handleFundLoan = async () => {
    if (!selectedLoan) return
    setInvestLoading(true)
    try {
      const { data } = await api.post(`/loans/${selectedLoan._id}/invest`)
      toast.success('Loan successfully funded!', {
        description: `Stripe Transfer ID: ${data.fundedLoan.stripePaymentIntentId.slice(-8).toUpperCase()}`,
      })
      setSelectedLoan(null)
      setLoanDetails(null)
      fetchMarketplace()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Investment failed to process')
    } finally {
      setInvestLoading(false)
    }
  }

  const handleResetFilters = () => {
    setMinAmount('')
    setMaxAmount('')
    setTenure('')
    setSort('newest')
    setPage(1)
    setTimeout(() => fetchMarketplace(), 50)
  }

  return (
    <div className="space-y-8 text-white">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
            Lending Hub
          </Badge>
          <span className="text-xs text-slate-400">• High Yield Returns</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Lending Marketplace</h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Fund loan requests submitted by verified borrowers. Spread your risk across multiple profiles and earn a fixed 12.0% p.a. monthly interest payout.
        </p>
      </div>

      {/* ── Filters Section ── */}
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col md:flex-row items-stretch md:items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            {/* Min Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase font-semibold">Min Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">₹</span>
                <Input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="pl-6 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500 h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Max Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase font-semibold">Max Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">₹</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="pl-6 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-emerald-500 h-10 text-xs rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Tenure */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase font-semibold">Tenure</Label>
              <select
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 h-10 text-xs focus:border-emerald-500 outline-none"
              >
                <option value="">All Tenures</option>
                {TENURE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt} Months</option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400 uppercase font-semibold">Sort By</Label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2 h-10 text-xs focus:border-emerald-500 outline-none"
              >
                <option value="newest">Newest Requests</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
                <option value="shortest">Shortest Tenure</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={fetchMarketplace}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-10 text-xs px-4 cursor-pointer flex-1 md:flex-none"
            >
              <Filter className="w-3.5 h-3.5 mr-2" /> Apply
            </Button>
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-white border border-slate-800 bg-slate-950/40 h-10 text-xs px-3 cursor-pointer"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Marketplace Grid List ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-slate-800 bg-slate-900/40 animate-pulse h-64" />
          ))}
        </div>
      ) : loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border border-slate-900 bg-slate-900/20">
          <Info className="w-10 h-10 text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white">No loan requests matching filters</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            Check back later for new borrower applications or adjust your filter query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loans.map((loan) => (
            <Card key={loan._id} className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        {loan.userId?.name || 'Anonymous Borrower'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      ID: {loan._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                    12% P.A.
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-white font-mono pt-3">
                  ₹{loan.amount.toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 pb-6 flex-1">
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-850 font-mono">
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Tenure</span>
                    <span className="font-semibold text-white">{loan.tenure} Months</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Monthly EMI</span>
                    <span className="font-semibold text-white">₹{loan.emi || calculateEMI(loan.amount, loan.interestRate, loan.tenure).emi}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
                  <span className="text-white/60 font-semibold flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Application Purpose:
                  </span>
                  <p className="line-clamp-3 italic">"{loan.reason}"</p>
                </div>
              </CardContent>

              <CardFooter className="bg-slate-950/30 border-t border-slate-800/50 py-3 px-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Applied {new Date(loan.createdAt).toLocaleDateString('en-IN')}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleViewDetails(loan)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-8 text-xs cursor-pointer px-3"
                >
                  Details & Invest
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-slate-400 hover:text-white border border-slate-850 bg-slate-950/40 cursor-pointer text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-xs text-slate-400 font-semibold font-mono">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="text-slate-400 hover:text-white border border-slate-850 bg-slate-950/40 cursor-pointer text-xs"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ── Dialog: Loan Details & Repayment Schedule Timeline ── */}
      <Dialog open={!!selectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center justify-between pr-4">
              <span>Investment Assessment</span>
              <span className="font-mono text-emerald-400">
                ₹{selectedLoan?.amount.toLocaleString('en-IN')}
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-mono">
              Borrower Profile: {selectedLoan?.userId?.name || 'Verified Member'}
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
              <p className="text-slate-400 text-xs mt-3">Generating repayment schedule breakdown...</p>
            </div>
          ) : (
            loanDetails && (
              <div className="space-y-4 pt-2">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono">
                  <div>
                    <span className="text-slate-500 block uppercase font-medium">Interest Return</span>
                    <span className="font-semibold text-emerald-400">12.0% p.a. Fixed</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase font-medium">Tenure Duration</span>
                    <span className="font-semibold text-white">{loanDetails.tenure} Months</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-slate-500 block uppercase font-medium">Monthly Inflow (EMI)</span>
                    <span className="font-semibold text-white font-mono">₹{loanDetails.emi.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-slate-500 block uppercase font-medium">Expected Yield</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      + ₹{((loanDetails.emi * loanDetails.tenure) - loanDetails.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-500 font-medium uppercase flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Borrower Purpose Statement
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/30 p-2.5 rounded-lg border border-slate-850">
                    "{loanDetails.reason}"
                  </p>
                </div>

                <Separator className="bg-slate-800" />

                {/* Schedule preview */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-500 font-medium uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Projected Payout Schedule
                  </span>
                  
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {loanDetails.schedulePreview.map((item) => (
                      <div
                        key={item.instalmentNumber}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/50 border border-slate-800/40 font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-850 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            {item.instalmentNumber}
                          </span>
                          <span className="text-slate-400 font-sans">
                            {new Date(item.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-400">₹{item.emiAmount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-normal flex items-start gap-2 pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    By funding this loan request, ₹{loanDetails.amount.toLocaleString('en-IN')} will be transferred to the borrower's wallet. Monthly EMIs will be deposited into your wallet starting next month.
                  </span>
                </div>
              </div>
            )
          )}

          <DialogFooter className="bg-slate-950/40 border-t border-slate-800/60 p-4 -mx-4 -mb-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedLoan(null)}
              className="text-slate-400 hover:text-white cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFundLoan}
              disabled={investLoading || detailsLoading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer text-xs h-10 px-4 shadow-lg shadow-emerald-500/10"
            >
              {investLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying Capital...
                </>
              ) : (
                'Confirm & Fund Loan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
