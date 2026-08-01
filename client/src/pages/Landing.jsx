import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Landmark,
  ArrowRight,
  ShieldCheck,
  Lock,
  TrendingUp,
  Wallet,
  FileText,
  CheckCircle2,
  Star,
  Sparkles,
  BadgeCheck,
  PieChart,
  Clock,
  RefreshCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'

/* ───────────────────────────────────────────────────────────────────────────
   P2P Lend — Landing page
   Uses ONLY theme tokens (--background, --primary, --money, --shadow-*, …)
   so it adapts automatically to all 3 design directions × light/dark.
   ─────────────────────────────────────────────────────────────────────────── */

const fmtINR = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

const fmtEMI = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

/* ── Reusable section header ─────────────────────────────────────────────── */
function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
      <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-base leading-relaxed text-foreground/60">{sub}</p>
      )}
    </div>
  )
}

/* ── Nav ────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '#how-it-works', label: 'How it works' },
    { href: '#featured', label: 'Featured loans' },
    { href: '#trust', label: 'Trust & safety' },
    { href: '#testimonials', label: 'Stories' },
  ]

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-cta">
            <Landmark className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            P2P Lend
          </span>
        </a>

        {/* Links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-4"
            render={<Link to="/login" />}
          >
            Log in
          </Button>
          <Button
            size="sm"
            className="rounded-full px-4 shadow-cta"
            render={<Link to="/register" />}
          >
            Get started
          </Button>
        </div>
      </nav>
    </header>
  )
}

/* ── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  const reduce = useReducedMotion()

  const bars = useMemo(() => {
    const seed = [42, 68, 51, 88, 74, 96]
    return seed
  }, [])

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Soft radial glow — theme aware */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_10%,var(--splash-glow),transparent_70%)]"
      />

      <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-32 md:grid-cols-2 md:items-center md:gap-10 md:px-6 md:pb-28 md:pt-40">
        {/* ── Left: copy ── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Badge
            variant="outline"
            className="mb-5 gap-1.5 rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            12% fixed p.a. · No hidden fees · Stripe-secured
          </Badge>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Peer-to-peer lending,
            <br />
            <span className="text-primary">without the bank.</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-foreground/60 md:text-lg">
            Borrow ₹1,000–₹50,000 with transparent terms — or fund verified
            borrowers and earn a fixed 12% p.a. Every rupee is tracked on an
            open, Stripe-secured ledger.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 rounded-full px-7 text-base shadow-cta"
              render={<Link to="/register?role=borrower" />}
            >
              Apply for a loan
              <ArrowRight className="ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-full px-7 text-base"
              render={<Link to="/register?role=lender" />}
            >
              <TrendingUp className="mr-1.5" />
              Fund loans · 12% p.a.
            </Button>
          </div>

          {/* Trust row */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-foreground/50">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-money" />
              Money held on Stripe Connect
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-money" />
              98% of repayments go to lenders
            </span>
          </div>
        </motion.div>

        {/* ── Right: visual ── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          {/* Loan offer card */}
          <div className="relative z-10 rounded-2xl border border-border bg-card p-6 shadow-pop">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                  Active loan offer
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
                  {fmtINR(25000)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-money-soft text-money">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-foreground/50">
              <span>12 months · 12% p.a.</span>
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Funded
              </span>
            </div>

            {/* EMI bars */}
            <div className="mt-4 flex h-24 items-end gap-1.5 rounded-xl bg-muted/60 p-3">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{
                    delay: 0.5 + i * 0.09,
                    type: 'spring',
                    stiffness: 120,
                    damping: 16,
                  }}
                  className={`flex-1 rounded-md ${
                    i === bars.length - 1
                      ? 'bg-money'
                      : 'bg-primary/60'
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
              {[
                ['EMI', fmtEMI(2221)],
                ['Lenders', '12'],
                ['Progress', '94%'],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/40">
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating chip: payout */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="absolute -right-3 -top-5 z-20 hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-pop sm:flex"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-money-soft text-money">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold text-foreground">
                {fmtINR(29412)} repaid
              </p>
              <p className="text-[10px] text-foreground/50">
                {fmtINR(28824)} returned to lenders
              </p>
            </div>
          </motion.div>

          {/* Floating chip: disbursal */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            className="absolute -bottom-5 -left-3 z-20 hidden items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-pop sm:flex"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Stripe Connect</p>
              <p className="text-[10px] text-foreground/50">
                Disbursed &amp; settled automatically
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats strip */}
      <div className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4"
        >
          {[
            ['₹4.2L+', 'lent to borrowers'],
            ['120+', 'loans funded'],
            ['85+', 'active lenders'],
            ['12%', 'fixed p.a. return'],
          ].map(([value, label]) => (
            <div
              key={label}
              className="bg-card px-6 py-7 text-center transition-colors hover:bg-muted/40"
            >
              <p className="font-mono text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {value}
              </p>
              <p className="mt-1.5 text-xs text-foreground/50">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ── How it works ───────────────────────────────────────────────────────── */
const steps = [
  {
    icon: FileText,
    step: '01',
    title: 'Apply in minutes',
    desc: 'Tell us how much you need (₹1,000–₹50,000) and why. No paperwork, no branch visits — the platform sets a fair 12% p.a. rate.',
  },
  {
    icon: Wallet,
    step: '02',
    title: 'Get funded by peers',
    desc: 'Lenders browse your request and fund it. The full amount is disbursed to your Stripe Connect account the moment it fills.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Repay & earn',
    desc: 'You repay in fixed monthly EMIs. 98% flows straight to lenders, 2% is the platform fee. Lenders watch their principal come back with interest.',
  },
]

function HowItWorks() {
  const reduce = useReducedMotion()

  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="How it works"
          title="Three steps. Zero bank queues."
          sub="A direct, transparent marketplace that connects borrowers and lenders — with Stripe handling the money rails end to end."
        />

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          {/* Connector line */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-10 hidden h-px bg-linear-to-r from-transparent via-border to-transparent md:block"
          />

          {steps.map(({ icon: Icon, step, title, desc }, i) => (
            <motion.div
              key={step}
              custom={i}
              variants={fadeUp}
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="relative text-center md:px-2"
            >
              <div className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-card">
                <Icon className="h-8 w-8 text-primary" />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-money-soft text-xs font-bold text-money shadow-cta">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/60">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Featured loans ─────────────────────────────────────────────────────── */
function FeaturedLoans() {
  const reduce = useReducedMotion()
  const [loans, setLoans] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .get('/loans/featured')
      .then(({ data }) => alive && setLoans(data.loans || []))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  return (
    <section
      id="featured"
      className="scroll-mt-20 border-y border-border bg-muted/30 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="Featured loans"
          title="Real requests, right now"
          sub="Live pending requests from borrowers on the platform. Fund one — or list your own need in minutes."
        />

        {error ? (
          <p className="text-center text-sm text-foreground/50">
            Couldn't load requests right now.
          </p>
        ) : loans === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
        ) : loans.length === 0 ? (
          <p className="text-center text-sm text-foreground/50">
            No open requests at the moment — be the first to fund one.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loans.map((loan, i) => (
              <motion.article
                key={loan._id}
                custom={i}
                variants={fadeUp}
                initial={reduce ? false : 'hidden'}
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                {/* Borrower */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {loan.borrowerName
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {loan.borrowerName}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-foreground/50">
                      <BadgeCheck className="h-3.5 w-3.5 text-money" />
                      Verified borrower
                    </p>
                  </div>
                </div>

                {/* Amount + terms */}
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-foreground/40">
                      Requesting
                    </p>
                    <p className="mt-0.5 font-mono text-2xl font-semibold text-foreground">
                      {fmtINR(loan.amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-foreground/40">
                      EMI
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-money">
                      {fmtEMI(loan.emi)}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs text-foreground/50">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {loan.tenure} months
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <PieChart className="h-3.5 w-3.5" />
                    {loan.interestRate}% p.a.
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-foreground/60">
                  “{loan.reason}”
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-5 w-full rounded-full transition-colors group-hover:border-primary/40 group-hover:text-primary"
                  render={<Link to="/register?role=lender" />}
                >
                  Fund this loan
                </Button>
              </motion.article>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button
            className="rounded-full px-7 shadow-cta"
            render={<Link to="/register?role=lender" />}
          >
            Browse the full marketplace
            <ArrowRight className="ml-1.5" />
          </Button>
        </div>
      </div>
    </section>
  )
}

/* ── Trust & safety ─────────────────────────────────────────────────────── */
const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Stripe Connect money rails',
    desc: 'Funds never sit in a platform wallet. Every payment is a Stripe-managed transfer between verified bank accounts.',
  },
  {
    icon: RefreshCcw,
    title: 'Transparent 98 / 2 split',
    desc: 'Borrowers repay fixed EMIs; 98% is routed straight to lenders and 2% covers platform operations. No hidden fees.',
  },
  {
    icon: Lock,
    title: 'Disbursal on funding',
    desc: 'The moment a loan fills, the full principal is disbursed to the borrower\'s Connect account — automatically, on-chain to Stripe.',
  },
  {
    icon: PieChart,
    title: 'Fixed, fair pricing',
    desc: 'One interest rate — 12% p.a. — set by the platform for every loan. No haggling, no predatory terms.',
  },
]

function TrustSafety() {
  const reduce = useReducedMotion()

  const ledger = [
    ['#T-1024', 'Disbursal · Kavya S.', '−₹25,000'],
    ['#T-1025', 'Repayment · EMI 1/12', '+₹2,221'],
    ['#T-1026', 'Lender payout · 98%', '−₹2,177'],
    ['#T-1027', 'Platform fee · 2%', '−₹44'],
    ['#T-1028', 'Repayment · EMI 2/12', '+₹2,221'],
  ]

  return (
    <section id="trust" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 md:grid-cols-2 md:gap-10 md:px-6">
        {/* Copy */}
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Trust &amp; safety
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Built like a bank.
            <br />
            <span className="text-primary">Transparent like a ledger.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/60">
            Every rupee that moves through P2P Lend is recorded — you can see
            exactly where money came from, where it went, and what it earned.
          </p>

          <ul className="mt-8 space-y-5">
            {trustPoints.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-money-soft text-money">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/60">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Ledger card */}
        <motion.div
          initial={reduce ? false : { opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-pop">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Loan #T-1024
                  </p>
                  <p className="text-[11px] text-foreground/50">
                    Stripe Connect · live
                  </p>
                </div>
              </div>
              <Badge className="bg-success/15 text-success hover:bg-success/15">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />
                Settled
              </Badge>
            </div>

            <ul className="divide-y divide-border">
              {ledger.map(([id, label, amt]) => (
                <li
                  key={id}
                  className="flex items-center justify-between py-3 font-mono text-xs"
                >
                  <span className="text-foreground/40">{id}</span>
                  <span className="flex-1 truncate px-3 text-foreground/70">
                    {label}
                  </span>
                  <span
                    className={
                      amt.startsWith('+') ? 'font-semibold text-success' : 'text-foreground'
                    }
                  >
                    {amt}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <span className="text-xs text-foreground/50">
                Returned to lenders (98%)
              </span>
              <span className="font-mono text-sm font-semibold text-success">
                +{fmtINR(28824)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Testimonials ───────────────────────────────────────────────────────── */
const testimonials = [
  {
    name: 'Kavya Sharma',
    role: 'Borrower · ₹25,000 for inventory',
    initials: 'KS',
    quote:
      'I needed working capital before a festival sale. The loan filled in two days, and the EMI plan was clear from day one. No fine print, no surprises.',
  },
  {
    name: 'Rohit Mehta',
    role: 'Lender · 14 loans funded',
    initials: 'RM',
    quote:
      'The 12% is real — every repayment lands in my Connect account the same day the borrower pays. I can watch my returns accrue on the ledger.',
  },
  {
    name: 'Ananya Iyer',
    role: 'Borrower · ₹12,000 for equipment',
    initials: 'AI',
    quote:
      'As a freelancer, banks never took me seriously. Here my request was funded by three lenders in under 24 hours. It changed how I run my studio.',
  },
]

function Testimonials() {
  const reduce = useReducedMotion()

  return (
    <section
      id="testimonials"
      className="scroll-mt-20 border-y border-border bg-muted/30 py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="Stories"
          title="Borrowers and lenders, side by side"
          sub="Real people funding real needs — and earning while they do it."
        />

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map(({ name, role, initials, quote }, i) => (
            <motion.figure
              key={name}
              custom={i}
              variants={fadeUp}
              initial={reduce ? false : 'hidden'}
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div className="flex gap-1 text-warning">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/70">
                “{quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{name}</p>
                  <p className="text-xs text-foreground/50">{role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Final CTA ──────────────────────────────────────────────────────────── */
function FinalCTA() {
  const reduce = useReducedMotion()

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Borrower card */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card transition-all hover:shadow-card-hover md:p-10"
          >
            <div
              aria-hidden
              className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 opacity-80 blur-2xl transition-opacity group-hover:opacity-100"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
              Need money, fast?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              Borrow ₹1,000–₹50,000 at a fixed 12% p.a. Apply in minutes and get
              funded by real people — not a bank.
            </p>
            <Button
              size="lg"
              className="mt-8 h-12 rounded-full px-7 shadow-cta"
              render={<Link to="/register?role=borrower" />}
            >
              Become a borrower
              <ArrowRight className="ml-1.5" />
            </Button>
          </motion.div>

          {/* Lender card */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card transition-all hover:shadow-card-hover md:p-10"
          >
            <div
              aria-hidden
              className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-money/10 blur-2xl"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-money-soft text-money">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
              Grow your money, peer to peer
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              Earn a fixed 12% p.a. by funding verified borrowers. Your returns
              are routed straight to you — 98% of every EMI.
            </p>
            <Button
              variant="outline"
              size="lg"
              className="mt-8 h-12 rounded-full px-7"
              render={<Link to="/register?role=lender" />}
            >
              Become a lender
              <ArrowRight className="ml-1.5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 md:flex-row md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">P2P Lend</p>
            <p className="text-xs text-foreground/50">
              Peer-to-peer micro-lending on Stripe Connect
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground/50">
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#featured" className="transition-colors hover:text-foreground">
            Featured loans
          </a>
          <a href="#trust" className="transition-colors hover:text-foreground">
            Trust &amp; safety
          </a>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link to="/register" className="transition-colors hover:text-foreground">
            Get started
          </Link>
        </nav>

        <p className="flex items-center gap-1.5 text-xs text-foreground/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Demo product · Funds held via Stripe Connect
        </p>
      </div>
    </footer>
  )
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturedLoans />
        <TrustSafety />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
