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
  AlertCircle,
} from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe'
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
import { useAuthStore } from '@/store/useAuthStore'

// ── Inner Stripe form (lives inside <Elements>) ──────────────────
function PaymentForm({ instalment, clientSecret, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setErrorMessage('')

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: {
          billing_details: {
            name: user?.name || 'Borrower',
            ...(user?.email ? { email: user.email } : {}),
          },
        },
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.')
      setSubmitting(false)
      return
    }

    // Payment succeeded — the webhook marks this instalment as paid
    toast.success('Instalment paid successfully!', {
      description: `Instalment #${instalment.instalmentNumber} settled via Stripe.`,
    })
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-1">
        <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
          Amount Due
        </span>
        <div className="text-2xl font-extrabold text-primary font-mono">
          ₹{instalment.emiAmount.toLocaleString('en-IN')}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Due on {new Date(instalment.dueDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: 'never' },
        }}
      />

      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive/80">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment…
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ₹{instalment.emiAmount.toLocaleString('en-IN')}
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Secured by Stripe · Your card will be charged immediately
      </p>
    </form>
  )
}

export default function Repayments() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // pending | paid

  // Selected instalment for payment
  const [payingInstalment, setPayingInstalment] = useState(null)
  const [step, setStep] = useState('confirm') // 'confirm' | 'payment'
  const [clientSecret, setClientSecret] = useState(null)
  const [initLoading, setInitLoading] = useState(false)
  const [initError, setInitError] = useState('')

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

  // Reset the dialog state when it closes
  useEffect(() => {
    if (!payingInstalment) {
      const t = setTimeout(() => {
        setStep('confirm')
        setClientSecret(null)
        setInitLoading(false)
        setInitError('')
      }, 200)
      return () => clearTimeout(t)
    }
  }, [payingInstalment])

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

  // Step 1: create the PaymentIntent for this instalment
  const handleInitiatePayment = async () => {
    if (!payingInstalment) return
    setInitLoading(true)
    setInitError('')
    try {
      const { data } = await api.post(`/repayments/${payingInstalment._id}/pay`)
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate payment. Please try again.'
      setInitError(msg)
      toast.error(msg)
    } finally {
      setInitLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setPayingInstalment(null)
    fetchRepayments()
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 font-medium font-mono text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" /> OVERDUE
          </Badge>
        )
      case 'paid':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30 font-medium font-mono text-[10px]">
            <CheckCircle2 className="w-3 h-3 mr-1" /> SUCCESSFUL
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge className="bg-warning/10 text-warning border-warning/30 font-medium font-mono text-[10px]">
            <Clock className="w-3 h-3 mr-1" /> PENDING
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-8 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Repayments & EMIs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your monthly micro-loan instalments, clear pending dues, and view past settlement history.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRepayments}
          className="border-border bg-card hover:bg-muted text-foreground cursor-pointer h-9 px-3"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Stats Summary Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.outstandingBalance.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Principal remaining on active loans</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Instalments Settled</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary font-mono">
              {stats.paidCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Completed monthly payments</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Remaining Dues</CardDescription>
            <CardTitle className="text-2xl font-bold text-warning font-mono">
              {stats.remainingCount}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">Unsettled future monthly EMIs</CardFooter>
        </Card>

        <Card className="border-border bg-card shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-medium">Next Due Amount</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground font-mono">
              ₹{stats.nextDue ? stats.nextDue.emiAmount.toLocaleString('en-IN') : '0'}
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-0 text-[10px] text-warning truncate">
            {stats.nextDue
              ? `Due on ${new Date(stats.nextDue.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
              : 'All caught up!'}
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Left Column: Instalments Schedule list ── */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border bg-muted/50 backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Repayment Schedule</CardTitle>
                <CardDescription className="text-muted-foreground">List of monthly instalment schedules and payment triggers.</CardDescription>
              </div>
              <div className="flex gap-1 bg-background p-1 rounded-lg border border-border">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab('paid')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeTab === 'paid'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Paid History
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground text-sm mt-3">Loading schedules...</p>
                </div>
              ) : filteredInstalments.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground/70">
                  <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No repayment items found</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {activeTab === 'pending'
                      ? 'All outstanding instalments paid! Great job.'
                      : 'No past settlements recorded.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredInstalments.map((item) => (
                    <div
                      key={item._id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            Instalment #{item.instalmentNumber}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 font-mono">
                            ID: {item._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-foreground font-mono">
                          ₹{item.emiAmount.toLocaleString('en-IN')}
                        </p>
                        {item.fundedLoanId?.loanRequestId && (
                          <p className="text-xs text-muted-foreground line-clamp-1 italic">
                            Purpose: "{item.fundedLoanId.loanRequestId.reason}"
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row sm:flex-col sm:items-end justify-between sm:justify-center gap-3">
                        <div className="space-y-1 text-left sm:text-right">
                          <span className="text-[10px] text-muted-foreground/70 block uppercase font-medium">Due Date</span>
                          <span className="text-xs text-foreground/80 font-mono">
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
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 text-xs px-3 cursor-pointer"
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
          <Card className="border-border bg-gradient-to-b from-card to-muted/70 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-primary" /> Secure Card Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
              <p>
                Instalments are paid securely via <strong>Stripe Payment Intents</strong> — your card is
                charged only when you confirm a payment.
              </p>
              <p>
                Repayments are processed <strong>in order</strong>: each instalment unlocks after the
                previous one is settled, keeping your amortisation schedule accurate.
              </p>
              <p className="text-primary/90 font-medium">
                Tip: Paying on time keeps your loan in good standing and avoids overdue status.
              </p>
            </CardContent>
          </Card>

          {/* Settle timeline card */}
          <Card className="border-border bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <History className="w-4.5 h-4.5 text-primary" /> Settle Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3">
              {loading ? (
                <p className="text-muted-foreground/70">Checking logs...</p>
              ) : schedules.filter(s => s.status === 'paid').length === 0 ? (
                <p className="text-muted-foreground/70">No settled history found.</p>
              ) : (
                <div className="space-y-3">
                  {schedules
                    .filter(s => s.status === 'paid')
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item._id}
                        className="p-2.5 rounded-lg bg-background/60 border border-border space-y-1 font-mono text-[11px]"
                      >
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Instalment #{item.instalmentNumber}</span>
                          <span className="text-primary font-bold">₹{item.emiAmount}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground/70">
                          <span>Paid on {new Date(item.paidAt).toLocaleDateString('en-IN')}</span>
                          <span className="truncate max-w-[100px]" title={item.stripePaymentIntentId}>
                            {item.stripePaymentIntentId?.slice(-8)}
                          </span>
                        </div>
                      </div>
                    ))}
                  {schedules.filter(s => s.status === 'paid').length > 3 && (
                    <p className="text-[10px] text-center text-muted-foreground/70 italic">
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
        <DialogContent className="bg-card border-border text-foreground max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg">Confirm Instalment Payment</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Authorize payment for instalment #{payingInstalment?.instalmentNumber} of loan reference {payingInstalment?.fundedLoanId?._id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {step === 'confirm' ? (
            <>
              {payingInstalment && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-xl bg-background border border-border text-center space-y-1">
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
                      Amount Due
                    </span>
                    <div className="text-2xl font-extrabold text-primary font-mono">
                      ₹{payingInstalment.emiAmount.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Due on {new Date(payingInstalment.dueDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-2">
                    <div className="flex justify-between py-1 border-b border-border/80">
                      <span>Interest rate</span>
                      <span className="font-semibold text-foreground">12.0% p.a.</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/80">
                      <span>Payment Gateway</span>
                      <span className="font-semibold text-primary">Stripe Secure Checkout</span>
                    </div>
                  </div>

                  {initError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive/80">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{initError}</span>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="bg-background/40 border-t border-border/60 p-4 -mx-4 -mb-4">
                <Button
                  variant="ghost"
                  onClick={() => setPayingInstalment(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiatePayment}
                  disabled={initLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer text-xs h-10 px-4"
                >
                  {initLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing Checkout…
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm instalment={payingInstalment} onSuccess={handlePaymentSuccess} />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
