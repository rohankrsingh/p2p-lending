/**
 * Lender Stripe Connect Onboarding page
 *
 * Handles the full onboarding flow:
 * 1. Create Stripe Express account (if not yet created)
 * 2. Generate onboarding link → redirect to Stripe hosted UI
 * 3. Handle return URL (?status=return) → verify account status
 * 4. Handle refresh URL (?status=refresh) → prompt to re-start
 *
 * Route: /lender/onboarding
 */
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Banknote,
  BadgeCheck,
  Clock,
  Lock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

// Stripe account status states
const STATUS = {
  LOADING: 'loading',
  NO_ACCOUNT: 'no_account',
  PENDING: 'pending',
  VERIFIED: 'verified',
  ERROR: 'error',
}

export default function LenderOnboarding() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const updateUser = useAuthStore((s) => s.updateUser)
  const urlStatus = searchParams.get('status') // 'return' | 'refresh' | null

  const [status, setStatus] = useState(STATUS.LOADING)
  const [accountData, setAccountData] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch current account status ────────────────────────────────
  const fetchStatus = async () => {
    setStatus(STATUS.LOADING)
    try {
      const { data } = await api.get('/stripe/account-status')
      setAccountData(data)

      if (data.stripeVerified) {
        setStatus(STATUS.VERIFIED)
        // Sync to auth store so the banner disappears across the app
        updateUser({ stripeVerified: true })
      } else if (data.hasAccount) {
        setStatus(STATUS.PENDING)
      } else {
        setStatus(STATUS.NO_ACCOUNT)
      }
    } catch (err) {
      setStatus(STATUS.ERROR)
      toast.error('Could not retrieve account status')
    }
  }

  // On mount or return from Stripe
  useEffect(() => {
    if (urlStatus === 'return') {
      // Try to mark verified via the return endpoint then refetch
      api.get('/stripe/onboarding-return').finally(fetchStatus)
    } else {
      fetchStatus()
    }
  }, [urlStatus])

  // ── Create account + get onboarding link ────────────────────────
  const handleStartOnboarding = async () => {
    setSubmitting(true)
    try {
      // Step 1: Create account (idempotent)
      await api.post('/stripe/create-connect-account')

      // Step 2: Get onboarding link
      const { data } = await api.post('/stripe/onboarding-link')
      window.location.href = data.url
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Onboarding failed. Try again.')
      setSubmitting(false)
    }
  }

  // ── Resume onboarding (refresh case) ────────────────────────────
  const handleResumeOnboarding = async () => {
    setSubmitting(true)
    try {
      const { data } = await api.post('/stripe/onboarding-link')
      window.location.href = data.url
    } catch (err) {
      toast.error('Failed to resume onboarding.')
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Render states
  // ─────────────────────────────────────────────────────────────────

  if (status === STATUS.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Checking account status…</p>
      </div>
    )
  }

  if (status === STATUS.VERIFIED) {
    return (
      <div className="max-w-xl mx-auto pt-12 px-4">
        <Card className="border-primary/30 bg-primary/20 shadow-xl">
          <CardHeader className="pb-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <BadgeCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-foreground text-2xl font-bold">You're Verified!</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your Stripe Connect account is fully set up and ready to receive payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center pb-6">
            <Badge className="bg-primary/10 text-primary border-primary/30 font-mono text-xs px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> STRIPE CONNECT ACTIVE
            </Badge>

            <div className="grid grid-cols-2 gap-3 text-left mt-4 text-xs bg-background/50 p-4 rounded-xl border border-border">
              <div>
                <span className="text-muted-foreground/70 block uppercase font-medium">Account ID</span>
                <span className="font-mono text-foreground/90">{accountData?.stripeAccountId?.slice(-10)}</span>
              </div>
              <div>
                <span className="text-muted-foreground/70 block uppercase font-medium">Payouts</span>
                <span className="text-primary font-semibold">
                  {accountData?.payoutsEnabled ? 'Enabled' : 'Pending'}
                </span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/lender/marketplace')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold w-full mt-2 cursor-pointer"
            >
              Browse Marketplace <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // STATUS.NO_ACCOUNT | STATUS.PENDING | STATUS.ERROR
  const isPending = status === STATUS.PENDING
  const isRefresh = urlStatus === 'refresh'

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-12 px-4 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {isPending ? 'Complete Your Verification' : 'Stripe Connect Onboarding'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isPending
            ? 'Your account is created but needs additional info before you can fund loans or receive payouts.'
            : 'Connect your bank account to start funding loans and receiving monthly repayment payouts.'}
        </p>
      </div>

      {/* Refresh / pending alert */}
      {isRefresh && (
        <div className="flex items-start gap-3 bg-warning/20 border border-warning/30 rounded-xl p-4 text-sm">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-warning/80 font-semibold">Session expired</p>
            <p className="text-warning/70 mt-0.5">
              Your onboarding session timed out. Click below to continue where you left off.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <Card className="border-border bg-card shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> How it works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                icon: Banknote,
                title: 'Create your account',
                desc: 'We set up a Stripe Express account linked to your lender profile. Fully encrypted.',
              },
              {
                icon: ExternalLink,
                title: 'Submit verification details',
                desc: 'Stripe will collect your PAN, bank account, and business info via their secure hosted UI.',
              },
              {
                icon: Lock,
                title: 'Receive payouts automatically',
                desc: 'When borrowers repay EMIs, 98% is transferred directly to your connected bank account.',
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">{step.title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status card */}
      <Card className="border-border bg-card shadow-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-foreground font-semibold text-sm">Account Status</span>
            {isPending ? (
              <Badge className="bg-warning/10 text-warning border-warning/30 font-mono text-[10px]">
                <Clock className="w-3 h-3 mr-1" /> PENDING VERIFICATION
              </Badge>
            ) : (
              <Badge className="bg-muted/50 text-muted-foreground border-border font-mono text-[10px]">
                NOT STARTED
              </Badge>
            )}
          </div>

          {isPending && accountData?.stripeAccountId && (
            <p className="text-muted-foreground/70 font-mono text-xs mb-4">
              Account: {accountData.stripeAccountId.slice(-12).toUpperCase()}
            </p>
          )}

          {/* Action button */}
          {isPending || isRefresh ? (
            <Button
              onClick={handleResumeOnboarding}
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer h-11"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {submitting ? 'Redirecting to Stripe…' : 'Continue Verification'}
            </Button>
          ) : (
            <Button
              onClick={handleStartOnboarding}
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer h-11"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {submitting ? 'Setting up account…' : 'Start Stripe Onboarding'}
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground/50 text-center mt-3 font-mono">
            Powered by Stripe · Your financial data is handled by Stripe directly.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
