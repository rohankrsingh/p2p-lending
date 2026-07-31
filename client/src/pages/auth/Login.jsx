import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Landmark, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Lock, TrendingUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

export default function Login() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setUser(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate(`/${data.user.role}/dashboard`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const handleFillDemo = (email, role) => {
    setForm({ email, password: 'password123' })
    toast.info(`Loaded demo credentials for ${role}`)
  }

  // Demo accounts are only shown in local development or when explicitly
  // enabled for a demo deployment (VITE_DEMO_CREDS=true). Never on prod.
  const showDemoCreds =
    import.meta.env.DEV || import.meta.env.VITE_DEMO_CREDS === 'true'

  return (
    <section className="min-h-screen bg-background p-3 text-foreground antialiased">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        
        {/* ── Left Column: Sign In Form ── */}
        <div className="auth-panel relative flex min-h-[640px] items-center justify-center overflow-hidden rounded-2xl px-6 py-12 lg:min-h-0 lg:px-14 lg:py-16 xl:px-20">
          <div className="mx-auto w-full max-w-[440px] space-y-8">
            
            {/* Header / Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground font-bold shadow-cta">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-tight text-foreground">P2P Lend</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
                Sign in to your account
              </h1>
              <p className="mt-2 text-sm text-foreground/60">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-primary hover:underline">
                  Create account
                </Link>
              </p>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="h-11 rounded-lg border-border bg-muted/40 px-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    className="h-11 rounded-lg border-border bg-muted/40 px-4 pr-10 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-primary/50 bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials Autofill */}
            {showDemoCreds && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-foreground/70 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" /> Demo Test Accounts
                  </span>
                  <span className="text-[10px] text-foreground/40">Click to autofill</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('borrower2@test.com', 'Borrower')}
                    className="rounded-lg border border-border bg-muted/40 p-2.5 text-left text-xs transition-colors hover:bg-muted hover:border-primary/40 cursor-pointer"
                  >
                    <p className="font-semibold text-foreground">Borrower</p>
                    <p className="text-[11px] text-foreground/50 truncate font-mono mt-0.5">borrower2@test.com</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('lender_day5@test.com', 'Lender')}
                    className="rounded-lg border border-border bg-muted/40 p-2.5 text-left text-xs transition-colors hover:bg-muted hover:border-primary/40 cursor-pointer"
                  >
                    <p className="font-semibold text-foreground">Lender / Investor</p>
                    <p className="text-[11px] text-foreground/50 truncate font-mono mt-0.5">lender_day5@test.com</p>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Right Column: Showcase & Testimonial ── */}
        <div className="auth-splash relative flex min-h-[640px] flex-col justify-between overflow-hidden rounded-2xl p-8 text-foreground sm:p-12 lg:min-h-0 lg:p-16">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Testimonial & Quote */}
          <div className="relative z-10 max-w-[460px] space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Borrower Story</span>
            </div>

            <blockquote className="text-2xl font-light leading-snug tracking-tight text-foreground/90 sm:text-3xl">
              "P2P Lend connected me directly with micro-investors in under 24 hours. The 12% p.a. rate is clear and transparent."
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-sm">
                PK
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Priya K.</p>
                <p className="text-xs text-foreground/60">Verified Borrower • ₹45,000 funded</p>
              </div>
            </div>
          </div>

          {/* Floating Live Platform Stats Preview Card */}
          <div className="auth-glass relative z-10 mt-8 rounded-xl p-5 backdrop-blur-xl shadow-(--shadow-pop) space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-border/60 pb-3">
              <span className="font-medium text-foreground/70 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Platform Security Standard
              </span>
              <span className="text-primary font-mono">12.0% p.a. Fixed</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-foreground/50 uppercase">Max Loan</p>
                <p className="text-sm font-bold text-foreground font-mono mt-0.5">₹50,000</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-foreground/50 uppercase">Tenure</p>
                <p className="text-sm font-bold text-foreground font-mono mt-0.5">3–24 Mos</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-foreground/50 uppercase">Disbursal</p>
                <p className="text-sm font-bold text-primary font-mono mt-0.5">Instant</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
