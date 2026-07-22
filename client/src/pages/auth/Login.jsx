import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Landmark, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
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
      // Role-based redirect
      navigate(`/${data.user.role}/dashboard`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-background border-r border-border relative overflow-hidden">
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
              Welcome back
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground">
              Your money,<br />working harder.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
              Track your loans, repayments, and investments — all in one place.
            </p>
          </div>

          {/* Testimonial card */}
          <div className="p-5 rounded-2xl bg-muted/50 border border-border space-y-3">
            <p className="text-sm text-foreground leading-relaxed">
              "Funded my first loan in under 10 minutes. The returns have been consistent every month."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                PK
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Priya K.</p>
                <p className="text-xs text-muted-foreground">Lender · ₹45,000 invested</p>
              </div>
            </div>
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
            <h2 className="text-2xl font-bold text-foreground">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Don't have one?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Test accounts</p>
            <p>Borrower: <span className="font-mono">borrower2@test.com</span> / <span className="font-mono">password123</span></p>
            <p>Lender: <span className="font-mono">lender_day5@test.com</span> / <span className="font-mono">password123</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
