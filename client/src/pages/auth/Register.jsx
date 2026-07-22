import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Landmark, ArrowRight, TrendingUp, ShieldCheck, Loader2 } from 'lucide-react'
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
    title: 'I need a loan',
    subtitle: 'Apply for micro-loans funded by real investors',
    accent: 'from-blue-500/20 to-blue-600/10 border-blue-500/40',
    activeAccent: 'from-blue-500/30 to-blue-600/20 border-blue-400',
    iconColor: 'text-blue-400',
  },
  {
    id: 'lender',
    icon: TrendingUp,
    title: 'I want to invest',
    subtitle: 'Fund loans and earn monthly returns',
    accent: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/40',
    activeAccent: 'from-emerald-500/30 to-emerald-600/20 border-emerald-400',
    iconColor: 'text-emerald-400',
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
      toast.error('Please select your role to continue')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { ...form, role })
      setUser(data.user, data.token)
      toast.success(`Welcome, ${data.user.name}!`)
      navigate(`/${data.user.role}/dashboard`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-background border-r border-border relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 rounded-full bg-chart-2/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 relative z-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
            <Landmark className="w-4.5 h-4.5" />
          </div>
          <span className="font-semibold text-lg">P2P Lend</span>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              Peer-to-Peer Lending
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground">
              Direct finance,<br />without the middleman.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
              Connect borrowers and investors directly. Transparent rates, real returns, real impact.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Platform Rate', value: '12% p.a.' },
              { label: 'Max Loan', value: '₹50,000' },
              { label: 'Min Tenure', value: '3 months' },
              { label: 'Platform Fee', value: '2% only' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-muted/60 border border-border">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground relative z-10">
          Secured platform · End-to-end encrypted
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="font-semibold">P2P Lend</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Already have one?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">I want to…</p>
            <div className="grid grid-cols-2 gap-3">
              {roles.map(({ id, icon: Icon, title, subtitle, accent, activeAccent, iconColor }) => {
                const isActive = role === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className={cn(
                      'relative text-left p-4 rounded-xl border bg-gradient-to-br transition-all duration-200 cursor-pointer group',
                      isActive
                        ? cn(activeAccent, 'shadow-md ring-1 ring-current ring-offset-0')
                        : cn(accent, 'hover:opacity-90')
                    )}
                  >
                    <Icon className={cn('w-5 h-5 mb-2', iconColor)} />
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
                    {isActive && (
                      <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Rohan Singh"
                required
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="rohan@example.com"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Min. 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            By creating an account you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
