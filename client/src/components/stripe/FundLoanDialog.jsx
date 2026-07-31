/**
 * FundLoanDialog — complete loan funding flow with Stripe PaymentElement.
 *
 * Flow: AlertDialog confirm → create PaymentIntent → Stripe card form → confirm
 *
 * Props:
 *   loan       — the LoanRequest object
 *   open       — boolean (controlled by parent)
 *   onOpenChange — sets open state
 *   onSuccess  — callback after successful funding
 */
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, AlertCircle, CreditCard, ArrowRight } from 'lucide-react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe'
import { calculateEMI } from '@/lib/emi'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

// ── Inner form that lives inside <Elements> context ───────────────
function PaymentForm({ loan, _clientSecret, onSuccess, onError }) {
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

    const billingDetails = {
      name: user?.name || 'Lender',
      ...(user?.email ? { email: user.email } : {}),
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
        payment_method_data: {
          billing_details: billingDetails,
        },
      },
      redirect: 'if_required',
    })

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.')
      setSubmitting(false)
      onError?.(error)
      return
    }

    // Payment succeeded (no redirect needed)
    toast.success('Loan funded successfully!', {
      description: `₹${loan.amount.toLocaleString('en-IN')} deployed to ${loan.userId?.name || 'borrower'}.`,
    })
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount summary */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center space-y-1">
        <p className="text-[10px] text-muted-foreground/70 uppercase font-semibold tracking-wide">
          Payment Amount
        </p>
        <p className="text-2xl font-bold text-foreground font-mono">
          ₹{loan.amount.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-muted-foreground">
          One-time {loan.tenure}-month loan funding
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
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 shadow-cta cursor-pointer"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing Payment…
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ₹{loan.amount.toLocaleString('en-IN')}
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground/50 text-center">
        Secured by Stripe · Your card will be charged immediately
      </p>
    </form>
  )
}

// ── Main orchestrator ─────────────────────────────────────────────
export default function FundLoanDialog({ loan, open, onOpenChange, onSuccess }) {
  const [step, setStep] = useState('confirm') // 'confirm' | 'payment'
  const [clientSecret, setClientSecret] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Delay reset so exit animation plays
      const t = setTimeout(() => {
        setStep('confirm')
        setClientSecret(null)
        setLoading(false)
        setError('')
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // Handle confirmation — create PaymentIntent
  const handleConfirm = async () => {
    if (!loan) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/loans/${loan._id}/fund`)
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate payment. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  const handlePaymentError = () => {
    // Let user retry — keep dialog open
  }

  // ── Step 1: Confirmation (AlertDialog) ──────────────────────────
  if (step === 'confirm') {
    const emi = loan ? calculateEMI(loan.amount, loan.interestRate, loan.tenure) : { emi: 0, totalInterest: 0 }

    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <AlertDialogTitle className="text-foreground text-base font-bold">
              Confirm Loan Funding
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              You are about to fund this loan request. The amount will be charged to your card via Stripe.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Investment summary card */}
          <div className="space-y-3 bg-background/60 rounded-xl border border-border/80 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Loan Amount</span>
              <span className="font-bold text-foreground font-mono">
                ₹{loan.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tenure</span>
              <span className="font-semibold text-foreground">{loan.tenure} months</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="font-semibold text-primary">12% p.a.</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Monthly EMI</span>
              <span className="font-semibold text-foreground font-mono">₹{emi.emi.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground">Total Interest Earned</span>
              <span className="font-semibold text-primary font-mono">
                +₹{emi.totalInterest.toLocaleString('en-IN')}
              </span>
            </div>

            {loan.userId?.name && (
              <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground/70">
                <Badge className="bg-muted text-foreground/80 text-[10px] font-mono border-0">
                  Borrower: {loan.userId.name}
                </Badge>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive/80">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={loading}
              className="text-muted-foreground hover:text-foreground border-border cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing Payment…
                </>
              ) : (
                <>
                  Fund ₹{loan.amount.toLocaleString('en-IN')}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // ── Step 2: Stripe Payment (Dialog) ────────────────────────────
  if (step === 'payment') {
    if (!clientSecret) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bg-card border-border text-foreground sm:max-w-sm">
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Initialising payment session…</p>
            </div>
          </DialogContent>
        </Dialog>
      )
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Complete Payment
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Enter your card details to fund this loan securely.
            </DialogDescription>
          </DialogHeader>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: 'var(--primary)',
                  colorBackground: 'var(--card)',
                  colorText: 'var(--foreground)',
                  colorDanger: 'var(--destructive)',
                  fontFamily: 'Geist, system-ui, sans-serif',
                  borderRadius: '12px',
                },
              },
            }}
          >
            <PaymentForm
              loan={loan}
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
