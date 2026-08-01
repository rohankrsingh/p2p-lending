import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  IndianRupee,
  Calendar,
  FileText,
  ArrowRight,
  ShieldCheck,
  Info,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { calculateEMI } from '@/lib/emi'
import api from '@/lib/api'

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000]
const TENURE_OPTIONS = [3, 6, 9, 12, 18, 24]

const REASON_TEMPLATES = [
  'Medical / Emergency Expenses',
  'Education & Skill Courses',
  'Small Business Equipment',
  'Home Refurbishment',
  'Vehicle Maintenance',
]

export default function CreateLoan() {
  const navigate = useNavigate()

  const [amount, setAmount] = useState(10000)
  const [tenure, setTenure] = useState(6)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)

  const interestRate = 12 // Fixed 12% p.a.

  // Real-time financial metrics
  const { emi, totalInterest, totalPayable } = useMemo(
    () => calculateEMI(amount, interestRate, tenure),
    [amount, interestRate, tenure]
  )

  // Per-EMI platform fee: 2% of each instalment is retained by the platform
  const perEmiFee = Math.round(emi * 0.02)
  const lenderPayoutPerEmi = emi - perEmiFee

  // Simulated schedule breakdown
  const scheduleItems = useMemo(() => {
    const items = []
    const today = new Date()
    for (let i = 1; i <= Math.min(tenure, 6); i++) {
      const dueDate = new Date(today)
      dueDate.setMonth(dueDate.getMonth() + i)
      items.push({
        num: i,
        date: dueDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        amount: emi,
      })
    }
    return items
  }, [tenure, emi])

  const handleAmountInput = (e) => {
    const raw = e.target.value
    // Allow clearing the field while typing
    if (raw === '') {
      setAmount(0)
      return
    }
    const val = Number(raw)
    if (Number.isNaN(val) || val < 0) return
    // Clamp typed input to the slider's valid range (₹1,000 – ₹50,000)
    setAmount(Math.min(50000, Math.max(1000, val)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (amount < 1000 || amount > 50000) {
      toast.error('Loan amount must be between ₹1,000 and ₹50,000')
      return
    }

    if (reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters)')
      return
    }

    setLoading(true)

    try {
      const { data } = await api.post('/loans', {
        amount,
        tenure,
        reason: reason.trim(),
      })

      toast.success('Loan request submitted successfully!', {
        description: `Request ID: ${data.loan._id.slice(-6).toUpperCase()}`,
      })

      navigate('/borrower/my-loans')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit loan request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
            Borrower Desk
          </Badge>
          <span className="text-xs text-muted-foreground">• Fast Approval</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Apply for a Micro-Loan
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Set your required loan amount and tenure. Peer investors fund approved applications directly with fixed 12% p.a. interest.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Form Controls ── */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Card 1: Loan Amount */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  Select Loan Amount
                </span>
                <span className="text-xl font-bold text-primary font-mono">
                  ₹{amount.toLocaleString('en-IN')}
                </span>
              </CardTitle>
              <CardDescription>
                Choose an amount from ₹1,000 to ₹50,000
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Slider */}
              <div className="space-y-4 pt-2">
                <Slider
                  value={[amount]}
                  min={1000}
                  max={50000}
                  step={500}
                  onValueChange={([val]) => setAmount(val)}
                  className="cursor-pointer"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>₹1,000</span>
                  <span>₹25,000</span>
                  <span>₹50,000</span>
                </div>
              </div>

              {/* Direct Input & Quick Presets */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min={1000}
                    max={50000}
                    step={500}
                    value={amount || ''}
                    onChange={handleAmountInput}
                    className="pl-7 font-mono font-semibold text-base"
                    placeholder="Enter custom amount"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {PRESET_AMOUNTS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={amount === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAmount(preset)}
                      className="text-xs font-mono shrink-0 h-9"
                    >
                      ₹{(preset / 1000).toFixed(0)}k
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Tenure Selection */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Repayment Tenure
              </CardTitle>
              <CardDescription>
                Select your preferred loan duration in months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TENURE_OPTIONS.map((m) => {
                  const isSelected = tenure === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTenure(m)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary'
                          : 'border-border bg-card text-card-foreground hover:bg-accent/50 hover:border-muted-foreground/30'
                      )}
                    >
                      <span className="text-base font-mono">{m}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">Months</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Loan Purpose / Reason */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Purpose of Loan
                </span>
                <span className="text-xs text-muted-foreground">
                  {reason.length} / 10 chars min
                </span>
              </CardTitle>
              <CardDescription>
                Help lenders understand why you need this capital
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">Quick suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {REASON_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setReason(tmpl)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    >
                      + {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain how you intend to use the funds and your repayment strategy..."
                rows={3}
                className="resize-none text-sm"
                required
              />
            </CardContent>
          </Card>

          {/* Submit Action Button */}
          <Button
            type="submit"
            size="lg"
            disabled={loading || reason.trim().length < 10 || amount < 1000 || amount > 50000}
            className="w-full text-base font-semibold py-6 shadow-md"
          >
            {loading ? (
              'Submitting Request...'
            ) : (
              <>
                Submit Loan Application <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        {/* ── Right Column: Realtime Financial Breakdown ── */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          <Card className="border-primary/20 bg-linear-to-b from-card via-card to-primary/5 shadow-md relative overflow-hidden">
            {/* Top Accent Stripe */}
            <div className="h-1.5 bg-linear-to-r from-primary to-emerald-500" />

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs font-semibold">
                  Live EMI Calculator
                </Badge>
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Instant Quote</span>
                </div>
              </div>
              <CardTitle className="text-xl pt-2">Financial Breakdown</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Primary Metric: EMI Display */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Monthly Installment (EMI)
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-primary font-mono tracking-tight">
                  ₹{emi.toLocaleString('en-IN')}
                  <span className="text-xs text-muted-foreground font-normal"> / mo</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  For {tenure} months @ 12% p.a. interest
                </p>
              </div>

              {/* Line items summary */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Principal Loan Amount</span>
                  <span className="font-semibold font-mono text-foreground">
                    ₹{amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Annual Interest Rate
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                  </span>
                  <span className="font-semibold font-mono text-primary">
                    12.0% p.a.
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Tenure Duration</span>
                  <span className="font-semibold font-mono text-foreground">
                    {tenure} Months
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Interest Payable</span>
                  <span className="font-semibold font-mono text-foreground">
                    ₹{totalInterest.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Amount Disbursed on Funding</span>
                  <span className="font-semibold font-mono text-primary">
                    ₹{amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Platform Fee
                    <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                  </span>
                  <span className="font-semibold font-mono text-muted-foreground">
                    2% of each EMI (₹{perEmiFee.toLocaleString('en-IN')}/mo)
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 bg-muted/50 rounded-lg px-2.5">
                  <span className="text-xs font-semibold text-foreground">Lender Receives Per EMI</span>
                  <span className="font-bold font-mono text-primary text-base">
                    ₹{lenderPayoutPerEmi.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 text-base pt-2">
                  <span className="font-bold text-foreground">Total Repayment Amount</span>
                  <span className="font-extrabold font-mono text-foreground text-lg">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Repayment Schedule Accordion Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowSchedule((prev) => !prev)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Preview Instalment Timeline ({tenure} months)
                  </span>
                  {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSchedule && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {scheduleItems.map((item) => (
                      <div
                        key={item.num}
                        className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/40 border border-border/40 font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                            {item.num}
                          </span>
                          <span className="text-muted-foreground font-sans">{item.date}</span>
                        </div>
                        <span className="font-semibold text-foreground">₹{item.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {tenure > 6 && (
                      <p className="text-[10px] text-center text-muted-foreground italic pt-1">
                        + {tenure - 6} more monthly instalments
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 border-t border-border/50 py-3 text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>No hidden charges. Automated EMI collection, secured by Stripe.</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
