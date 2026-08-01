import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Landmark, ArrowRight, TrendingUp, ShieldCheck, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'

const roles = [
  {
    id: 'borrower',
    icon: ShieldCheck,
    title: 'Borrower',
    subtitle: 'Apply for micro-loans up to ₹50,000',
    accent: 'border-border bg-muted/40 text-foreground hover:border-primary/50',
    activeAccent: 'border-primary bg-primary/15 text-foreground ring-1 ring-primary/40',
    badge: 'Borrower Desk',
  },
  {
    id: 'lender',
    icon: TrendingUp,
    title: 'Investor / Lender',
    subtitle: 'Fund loans & earn 12% annual returns',
    accent: 'border-border bg-muted/40 text-foreground hover:border-primary/50',
    activeAccent: 'border-primary bg-primary/15 text-foreground ring-1 ring-primary/40',
    badge: 'Capital Partner',
  },
]

export default function Register() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  // Preselect a role when arriving from the landing page CTAs
  // (/register?role=borrower | /register?role=lender)
  const [searchParams] = useSearchParams()
  const requestedRole = searchParams.get('role')

  const [role, setRole] = useState(
    requestedRole === 'borrower' || requestedRole === 'lender' ? requestedRole : ''
  )
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!role) {
      toast.error('Please select your account type (Borrower or Investor)')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { ...form, role })
      setUser(data.user, data.token)
      toast.success(`Welcome to P2P Lend, ${data.user.name}!`)
      navigate(`/${data.user.role}/dashboard`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-background p-3 text-foreground antialiased">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        
        {/* ── Left Column: Sign Up Form ── */}
        <div className="auth-panel relative flex min-h-160 items-center justify-center overflow-hidden rounded-2xl px-6 py-12 lg:min-h-0 lg:px-14 lg:py-16 xl:px-20">
          <div className="mx-auto w-full max-w-115 space-y-8">
            
            {/* Header / Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground font-bold shadow-cta">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-tight text-foreground">P2P Lend</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
                Create an account
              </h1>
              <p className="mt-2 text-sm text-foreground/60">
                Already registered?{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account Type Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                  Select account type <span className="text-primary">*</span>
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map(({ id, icon: Icon, title, subtitle, accent, activeAccent, badge }) => {
                    const isActive = role === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        aria-pressed={isActive}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative',
                          isActive ? activeAccent : accent
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-foreground/60')} />
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-muted/60 border border-border text-foreground/70">
                            {badge}
                          </span>
                        </div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-foreground/50 mt-0.5 leading-snug">{subtitle}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-foreground/70">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Rohan Singh"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="h-11 rounded-lg border-border bg-muted/40 px-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:ring-primary/20"
                  />
                </div>

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
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={handleChange}
                    className="h-11 rounded-lg border-border bg-muted/40 px-4 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:ring-primary/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !role}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-primary/50 bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
                ) : (
                  <>Complete Registration <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>

          </div>
        </div>

        {/* ── Right Column: Showcase & Platform Features ── */}
        <div className="auth-splash relative flex min-h-160 flex-col justify-between overflow-hidden rounded-2xl p-8 text-foreground sm:p-12 lg:min-h-0 lg:p-16">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-100 h-100 bg-primary/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Testimonial & Quote */}
          <div className="relative z-10 max-w-115 space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Peer-to-Peer Direct Credit</span>
            </div>

            <blockquote className="text-2xl font-light leading-snug tracking-tight text-foreground/90 sm:text-3xl">
              "Simple, transparent peer lending with automated monthly payouts and zero hidden fees."
            </blockquote>

            <div className="space-y-3 pt-2">
              {[
                'Fixed 12.0% annual interest rate',
                'Transparent 2% platform processing fee',
                'Direct loan funding by verified lenders',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 text-xs text-foreground/70 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Platform Card Preview */}
          <div className="auth-glass relative z-10 mt-8 rounded-xl p-5 backdrop-blur-xl shadow-pop space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-border/60 pb-3">
              <span className="font-medium text-foreground/70 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Platform Financial Guarantees
              </span>
              <span className="text-primary font-mono">100% Transparent</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-foreground/50 uppercase font-medium">Borrower Desk</p>
                <p className="text-sm font-bold text-foreground mt-1">₹1,000 to ₹50,000</p>
                <p className="text-[10px] text-primary mt-0.5">Flexible 3 to 24 mos</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-foreground/50 uppercase font-medium">Investor Desk</p>
                <p className="text-sm font-bold text-primary mt-1">12% Fixed Returns</p>
                <p className="text-[10px] text-foreground/50 mt-0.5">Monthly EMI Payouts</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
