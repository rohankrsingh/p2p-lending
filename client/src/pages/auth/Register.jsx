import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    accent: 'border-white/10 bg-white/5 text-white hover:border-blue-500/50',
    activeAccent: 'border-blue-500 bg-blue-500/20 text-white ring-1 ring-blue-500',
    badge: 'Borrower Desk',
  },
  {
    id: 'lender',
    icon: TrendingUp,
    title: 'Investor / Lender',
    subtitle: 'Fund loans & earn 12% annual returns',
    accent: 'border-white/10 bg-white/5 text-white hover:border-emerald-500/50',
    activeAccent: 'border-emerald-500 bg-emerald-500/20 text-white ring-1 ring-emerald-500',
    badge: 'Capital Partner',
  },
]

export default function Register() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [role, setRole] = useState('')
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
    <section className="min-h-screen bg-[#050508] p-3 text-white antialiased">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        
        {/* ── Left Column: Sign Up Form ── */}
        <div className="flex min-h-[640px] items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0e] px-6 py-12 lg:min-h-0 lg:px-14 lg:py-16 xl:px-20 relative overflow-hidden">
          <div className="mx-auto w-full max-w-[460px] space-y-8">
            
            {/* Header / Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                  <Landmark className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">P2P Lend</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-white">
                Create an account
              </h1>
              <p className="mt-2 text-sm text-white/60">
                Already registered?{' '}
                <Link to="/login" className="font-medium text-emerald-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account Type Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-white/70">
                  Select account type <span className="text-emerald-400">*</span>
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map(({ id, icon: Icon, title, subtitle, accent, activeAccent, badge }) => {
                    const isActive = role === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer relative',
                          isActive ? activeAccent : accent
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={cn('w-5 h-5', isActive ? 'text-emerald-400' : 'text-white/60')} />
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">
                            {badge}
                          </span>
                        </div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-white/50 mt-0.5 leading-snug">{subtitle}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-white/70">
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
                    className="h-11 rounded-lg border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>

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
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    value={form.password}
                    onChange={handleChange}
                    className="h-11 rounded-lg border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !role}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
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
        <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-[#0a0f1d] to-[#050508] p-8 text-white sm:p-12 lg:min-h-0 lg:p-16 justify-between border border-white/10">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Testimonial & Quote */}
          <div className="relative z-10 max-w-[460px] space-y-6 pt-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Peer-to-Peer Direct Credit</span>
            </div>

            <blockquote className="text-2xl font-light leading-snug tracking-tight text-white/90 sm:text-3xl">
              "Simple, transparent peer lending with automated monthly payouts and zero hidden fees."
            </blockquote>

            <div className="space-y-3 pt-2">
              {[
                'Fixed 12.0% annual interest rate',
                'Transparent 2% platform processing fee',
                'Direct loan funding by verified lenders',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 text-xs text-white/70 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Platform Card Preview */}
          <div className="relative z-10 mt-8 rounded-xl border border-white/15 bg-black/60 p-5 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
              <span className="font-medium text-white/70 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Platform Financial Guarantees
              </span>
              <span className="text-emerald-400 font-mono">100% Transparent</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase font-medium">Borrower Desk</p>
                <p className="text-sm font-bold text-white mt-1">₹1,000 to ₹50,000</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Flexible 3 to 24 mos</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-white/50 uppercase font-medium">Investor Desk</p>
                <p className="text-sm font-bold text-emerald-400 mt-1">12% Fixed Returns</p>
                <p className="text-[10px] text-white/50 mt-0.5">Monthly EMI Payouts</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
