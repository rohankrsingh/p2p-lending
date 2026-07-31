/**
 * StripeOnboardingBanner — persistent banner across all lender pages
 * when the lender hasn't completed Stripe Connect onboarding.
 *
 * Dismissible per session. Fetches status on mount to stay in sync.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Banknote,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/useAuthStore'
import api from '@/lib/api'

export default function StripeOnboardingBanner() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const navigate = useNavigate()

  const [dismissed, setDismissed] = useState(false)
  const [status, setStatus] = useState({ loading: true, hasAccount: false, stripeVerified: false })
  const [refreshing, setRefreshing] = useState(false)

  // Don't show for non-lenders or already verified
  const isLender = user?.role === 'lender'

  const fetchStatus = async (silent = false) => {
    if (!silent) setStatus((s) => ({ ...s, loading: true }))
    try {
      const { data } = await api.get('/stripe/account-status')
      setStatus({
        loading: false,
        hasAccount: data.hasAccount,
        stripeVerified: data.stripeVerified,
      })
      // Sync back to auth store regardless
      if (data.stripeVerified) {
        updateUser({ stripeVerified: true })
      }
    } catch {
      if (!silent) setStatus({ loading: false, hasAccount: false, stripeVerified: false })
    }
  }

  useEffect(() => {
    if (isLender) fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLender])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus(true)
    setRefreshing(false)
  }

  // Conditions to hide the banner
  if (!isLender) return null
  if (status.loading) return null
  if (status.stripeVerified) return null
  if (dismissed) return null

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/15 via-muted to-primary/15 shadow-pop mb-6">
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMjBoNDBNMjAgMHY0MCIgc3Ryb2tlPSIjMzhhZGY4IiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDYiLz48L3N2Zz4=')] opacity-40" />

      <div className="relative flex items-start gap-4 p-4 sm:p-5">
        {/* Icon */}
        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center shrink-0 mt-0.5">
          {status.hasAccount ? (
            <AlertCircle className="w-5 h-5 text-warning" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {status.hasAccount
                ? 'Stripe verification incomplete'
                : 'Set up payouts to start earning'}
            </span>
            <Badge
              variant="outline"
              className="border-warning/30 text-warning bg-warning/10 text-[10px] font-mono"
            >
              ACTION REQUIRED
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
            {status.hasAccount
              ? 'Your Stripe Connect account is pending additional verification. Submit your details to receive borrower repayments and fund loans.'
              : 'Connect a bank account via Stripe to fund loan requests and receive monthly EMI payouts directly to your account.'}
          </p>

          {/* Quick stats row */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Banknote className="w-3 h-3 text-foreground" /> 2% platform fee
            </span>
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3 text-foreground" /> Secure Stripe hosted UI
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => navigate('/lender/onboarding')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 px-4 shadow-cta cursor-pointer"
            >
              {status.hasAccount ? 'Complete Verification' : 'Start Onboarding'}
              <ArrowRight className="w-3 h-3 ml-1.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-muted-foreground hover:text-foreground hover:bg-muted text-xs h-8 px-2 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-muted-foreground/50 hover:text-foreground/80 transition-colors cursor-pointer p-1 rounded-md hover:bg-muted/50"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}