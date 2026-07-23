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

  return (
    <section className="min-h-screen bg-[#050508] p-3 text-white antialiased">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        
        {/* ── Left Column: Sign In Form ── */}
        <div className="flex min-h-[640px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0e] px-6 py-12 lg:min-h-0 lg:px-14 lg:py-16 xl:px-20 relative overflow-hidden">
          <div className="mx-auto w-full max-w-[440px] space-y-8">
            
            {/* Header / Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">P2P Lend</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-white">
                Sign in to your account
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-emerald-400 hover:underline">
                  Create account
                </Link>
              </p>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-white/70">
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
                  className="h-11 rounded-lg border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-white/70">
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
                    className="h-11 rounded-lg border-white/15 bg-white/5 px-4 pr-10 text-sm text-white placeholder:text-white/30 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials Autofill */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-white/70 font-medium">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Demo Test Accounts
                </span>
                <span className="text-[10px] text-white/40">Click to autofill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillDemo('borrower2@test.com', 'Borrower')}
                  className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-left text-xs transition-colors hover:bg-white/10 hover:border-white/20 cursor-pointer"
                >
                  <p className="font-semibold text-white">Borrower</p>
                  <p className="text-[11px] text-white/50 truncate font-mono mt-0.5">borrower2@test.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('lender_day5@test.com', 'Lender')}
                  className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-left text-xs transition-colors hover:bg-white/10 hover:border-white/20 cursor-pointer"
                >
                  <p className="font-semibold text-white">Lender / Investor</p>
                  <p className="text-[11px] text-white/50 truncate font-mono mt-0.5">lender_day5@test.com</p>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Right Column: Showcase & Testimonial ── */}
        <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#050508] p-8 text-white sm:p-12 lg:min-h-0 lg:p-16 justify-between border border-white/10">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Testimonial & Quote */}
          <div className="relative z-10 max-w-[460px] space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Borrower Story</span>
            </div>

            <blockquote className="text-2xl font-light leading-snug tracking-tight text-white/90 sm:text-3xl">
              "P2P Lend connected me directly with micro-investors in under 24 hours. The 12% p.a. rate is clear and transparent."
            </blockquote>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-sm">
                PK
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Priya K.</p>
                <p className="text-xs text-white/60">Verified Borrower • ₹45,000 funded</p>
              </div>
            </div>
          </div>

          {/* Floating Live Platform Stats Preview Card */}
          <div className="relative z-10 mt-8 rounded-xl border border-white/15 bg-black/60 p-5 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
              <span className="font-medium text-white/70 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Platform Security Standard
              </span>
              <span className="text-emerald-400 font-mono">12.0% p.a. Fixed</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase">Max Loan</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">₹50,000</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase">Tenure</p>
                <p className="text-sm font-bold text-white font-mono mt-0.5">3–24 Mos</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase">Disbursal</p>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">Instant</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
