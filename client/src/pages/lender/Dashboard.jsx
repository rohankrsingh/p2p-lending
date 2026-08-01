import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Store,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Landmark,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

// ── Animation variants (inspired by 21st.dev Financial Dashboard) ──
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
}

const statsCardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.08, duration: 0.35, ease: 'easeOut' },
  }),
}

// ── Icon wrapper helper ──
function IconWrap({ icon: Icon, className = '' }) {
  return (
    <div className={`p-2 rounded-full flex items-center justify-center ${className}`}>
      <Icon className="w-5 h-5" />
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await api.get('/loans/lender/dashboard')
      setData(res.data)
    } catch (err) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm mt-3">Loading portfolio...</p>
      </div>
    )
  }

  const { stats, recentInvestments, recentTransactions } = data || {
    stats: { totalInvested: 0, activeInvestments: 0, expectedMonthlyPayout: 0, totalInterestEarned: 0 },
    recentInvestments: [],
    recentTransactions: [],
  }

  const filteredInvestments = recentInvestments.filter((inv) =>
    !searchQuery ||
    inv.loanRequestId?.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv._id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 text-foreground"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
              Investor Desk
            </Badge>
            <span className="text-xs text-muted-foreground">• Portfolio Control</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            Lender Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your active investments, interest returns, and capital allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/lender/marketplace')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs px-4 cursor-pointer"
          >
            Invest Capital <Store className="w-3.5 h-3.5 ml-2" />
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={fetchDashboard}
            className="border-border bg-card hover:bg-muted text-foreground cursor-pointer h-9 px-3"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid — staggered card entrance */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Portfolio Value', value: `₹${stats.totalInvested.toLocaleString('en-IN')}`, desc: 'Total capital deployed', icon: Landmark, color: 'text-foreground' },
          { label: 'Interest & Yield Earned', value: `₹${stats.totalInterestEarned.toLocaleString('en-IN')}`, desc: 'Gross interest returns', icon: TrendingUp, color: 'text-primary' },
          { label: 'Active Micro-Loans', value: `${stats.activeInvestments}`, desc: 'Lent profiles in repaying state', icon: Users, color: 'text-foreground' },
          { label: 'Expected Monthly Inflow', value: `₹${stats.expectedMonthlyPayout.toLocaleString('en-IN')}`, desc: 'Projected EMI settlements', icon: DollarSign, color: 'text-foreground' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={statsCardVariants}
          >
            <Card className="border-border bg-card shadow-md hover:border-border transition-all">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardDescription className="text-muted-foreground text-xs uppercase font-medium">
                  {card.label}
                </CardDescription>
                <IconWrap icon={card.icon} className="bg-primary/10 text-primary" />
              </CardHeader>
              <CardContent className="pb-2">
                <CardTitle className={`text-2xl font-bold font-mono ${card.color}`}>
                  {card.value}
                </CardTitle>
              </CardContent>
              <CardFooter className="pt-0 text-[10px] text-muted-foreground/70">{card.desc}</CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Search bar - inspired by 21st.dev Financial Dashboard */}
      <motion.div variants={itemVariants} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input
          type="text"
          aria-label="Search investments by borrower name"
          placeholder="Search investments by borrower name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none transition-all"
        />
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Active Portfolios */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-muted/50 backdrop-blur-md">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Active Deployed Capital</CardTitle>
                    <CardDescription className="text-muted-foreground text-xs">Overview of recent micro-loans funded by you.</CardDescription>
                  </div>
                  <Link to="/lender/investments" className="text-xs text-primary hover:underline font-semibold flex items-center">
                    All Portfolios <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredInvestments.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground/70">
                    <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-semibold">{searchQuery ? 'No matching investments' : 'No investments yet'}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {searchQuery ? 'Try a different search term.' : 'Visit the marketplace to fund your first loan.'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => navigate('/lender/marketplace')}
                        className="mt-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs h-8 cursor-pointer">
                        Browse Marketplace
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredInvestments.map((inv) => {
                      const borrowerName = inv.loanRequestId?.userId?.name || 'Anonymous'
                      return (
                        <motion.div
                          key={inv._id}
                          className="p-5 flex items-center justify-between gap-4 transition-colors rounded-lg hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3">
                            <IconWrap icon={Users} className="bg-primary/10 text-primary shrink-0" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-foreground/90">{borrowerName}</span>
                                <span className="text-[10px] text-muted-foreground/70 font-mono">ID: {inv._id.slice(-6).toUpperCase()}</span>
                              </div>
                              <p className="text-base font-bold text-foreground font-mono">₹{inv.fundedAmount.toLocaleString('en-IN')}</p>
                              <p className="text-xs text-muted-foreground font-mono">Outstanding: ₹{inv.outstandingBalance.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-[10px] text-muted-foreground/70 font-mono uppercase">
                              {inv.loanRequestId?.tenure} Mos @ {inv.loanRequestId?.interestRate || 12}%
                            </div>
                            <Badge className={
                              inv.status === 'defaulted'
                                ? 'bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-mono'
                                : inv.status === 'completed'
                                  ? 'bg-success/10 text-success border-success/30 text-[10px] font-mono'
                                  : 'bg-primary/10 text-primary border-primary/30 text-[10px] font-mono'
                            }>
                              {inv.status === 'defaulted' ? 'DEFAULTED' : inv.status === 'completed' ? 'COMPLETED' : 'REPAYING'}
                            </Badge>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-muted/50 backdrop-blur-md">
              <CardHeader className="pb-4 border-b border-border">
                <CardTitle className="text-base font-semibold">Recent Wallet Movement</CardTitle>
                <CardDescription className="text-muted-foreground text-xs">Funding outflows and repayment inflows.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {recentTransactions.length === 0 ? (
                  <p className="p-6 text-muted-foreground/70 text-xs text-center">No recent wallet transactions.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {recentTransactions.map((tx) => {
                      const isOutflow = tx.type === 'funding'
                      return (
                        <motion.div
                          key={tx._id}
                          className="p-4 flex items-center justify-between gap-3 text-xs rounded-lg transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isOutflow ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                            }`}>
                              {isOutflow ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">
                                {isOutflow ? 'Capital Outflow' : 'EMI Settlement'}
                              </p>
                              <p className="text-[10px] text-muted-foreground/70">
                                {isOutflow
                                  ? `Funded loan ${tx.fundedLoanId?.toString().slice(-6).toUpperCase()}`
                                  : `From ${tx.fromUserId?.name || 'Borrower'}`}
                              </p>
                            </div>
                          </div>
                          <div className={`text-right font-mono ${isOutflow ? '' : 'bg-primary/10 px-2 py-1 rounded-lg'}`}>
                            <p className={`font-bold ${isOutflow ? 'text-foreground/80' : 'text-primary'}`}>
                              {isOutflow ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[9px] text-muted-foreground/50">
                              {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick stats summary - inspired by 21st.dev service cards */}
          <motion.div variants={itemVariants}>
            <Card className="border-border bg-linear-to-b from-card to-muted/70 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Portfolio at a Glance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/60 border border-border/60">
                  <span className="text-muted-foreground">Active loans</span>
                  <span className="font-semibold font-mono text-foreground">{stats.activeInvestments}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/60 border border-border/60">
                  <span className="text-muted-foreground">Expected monthly</span>
                  <span className="font-semibold font-mono text-primary">₹{stats.expectedMonthlyPayout.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/60 border border-border/60">
                  <span className="text-muted-foreground">Total invested</span>
                  <span className="font-semibold font-mono text-foreground">₹{stats.totalInvested.toLocaleString('en-IN')}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
