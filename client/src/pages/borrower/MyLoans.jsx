import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, IndianRupee, Edit, XCircle, CreditCard, AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import api from '@/lib/api'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', count: 0 },
  { value: 'pending', label: 'Pending', count: 0 },
  { value: 'funded', label: 'Funded', count: 0 },
  { value: 'repaying', label: 'Repaying', count: 0 },
  { value: 'completed', label: 'Completed', count: 0 },
  { value: 'defaulted', label: 'Defaulted', count: 0 },
]

export default function MyLoans() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedTab, setSelectedTab] = useState('all')
  const [error, setError] = useState(null)

  const fetchLoans = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/loans/my')
      setLoans(data)
      setError(null)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch loans'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoans()
  }, [])

  const handleCancel = async (loanId) => {
    if (!confirm('Are you sure you want to cancel this loan request? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading(loanId)
      await api.delete(`/loans/${loanId}`)
      toast.success('Loan request cancelled successfully')
      fetchLoans()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to cancel loan'
      toast.error(message)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePayNow = async (loanId) => {
    try {
      setActionLoading(loanId)
      await api.post(`/loans/${loanId}/fund`)
      toast.success('Payment initiated successfully')
      fetchLoans()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to initiate payment'
      toast.error(message)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredLoans = selectedTab === 'all' 
    ? loans 
    : loans.filter(loan => loan.status === selectedTab)

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        variant: 'outline',
        className: 'border-amber-500/40 text-amber-500 bg-amber-500/10',
        icon: Clock,
      },
      funded: {
        variant: 'outline',
        className: 'border-blue-500/40 text-blue-500 bg-blue-500/10',
        icon: CreditCard,
      },
      repaying: {
        variant: 'outline',
        className: 'border-purple-500/40 text-purple-500 bg-purple-500/10',
        icon: Loader2,
      },
      completed: {
        variant: 'outline',
        className: 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10',
        icon: CheckCircle2,
      },
      defaulted: {
        variant: 'outline',
        className: 'border-rose-500/40 text-rose-500 bg-rose-500/10',
        icon: AlertTriangle,
      },
    }

    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getDaysRemaining = (tenure) => {
    return Math.max(0, tenure - 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your loans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-semibold">Failed to Load Loans</h2>
          <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
          <Button onClick={fetchLoans} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="border-blue-500/40 text-blue-500 bg-blue-500/10">
            Borrower Desk
          </Badge>
          <span className="text-xs text-muted-foreground">• Your Active Loans</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          My Loans
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Manage all your loan requests and track their current status, from pending approval to successful completion.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {STATUS_OPTIONS.map((tab) => {
          const tabCount = tab.value === 'all' 
            ? loans.length 
            : loans.filter(l => l.status === tab.value).length

          return (
            <button
              key={tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${selectedTab === tab.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
            >
              {tab.label}
              {tabCount > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${selectedTab === tab.value
                    ? 'bg-primary-foreground/20'
                    : 'bg-muted-foreground/20'
                  }`}
                >
                  {tabCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filteredLoans.length === 0 ? (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {selectedTab === 'all' ? 'No Loans Yet' : `No ${selectedTab} Loans`}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {selectedTab === 'all'
                    ? "You haven't applied for any loans yet. Start your first loan request today!"
                    : `You don't have any ${selectedTab} loans at the moment.`
                  }
                </p>
              </div>
              {selectedTab === 'all' && (
                <Button onClick={() => navigate('/borrower/create-loan')}>
                  Create New Loan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLoans.map((loan) => {
            const emi = loan.emi || { emi: 0, totalInterest: 0, totalPayable: 0 }

            return (
              <Card key={loan._id} className="border-border/50 hover:border-border/80 transition-colors">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                          <IndianRupee className="w-4 h-4 text-primary" />
                        </div>
                        Loan #{loan._id.slice(-6).toUpperCase()}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {loan.tenure} months
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(loan.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Loan Amount</p>
                      <p className="text-lg font-bold font-mono text-foreground">
                        ₹{loan.amount.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                      <p className="text-lg font-bold font-mono text-primary">
                        ₹{emi.emi.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                      <p className="text-sm font-medium font-mono">
                        ₹{emi.totalInterest.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                      <p className="text-sm font-medium">
                        {getDaysRemaining(loan.tenure)} / {loan.tenure} months
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Purpose</p>
                    <p className="text-sm line-clamp-2" title={loan.reason}>
                      {loan.reason}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <div className="flex items-center justify-between w-full gap-3">
                    <div className="text-xs text-muted-foreground">
                      Updated: {loan.updatedAt ? new Date(loan.updatedAt).toLocaleDateString() : 'N/A'}
                    </div>
                    <div className="flex gap-2">
                      {(loan.status === 'pending' || loan.status === 'funded') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/borrower/loans/${loan._id}/edit`)}
                          className="text-xs h-8"
                          disabled={actionLoading === loan._id}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                      )}

                      {loan.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(loan._id)}
                          className="text-xs h-8"
                          disabled={actionLoading === loan._id}
                        >
                          {actionLoading === loan._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {actionLoading === loan._id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      )}

                      {loan.status === 'funded' && (
                        <Button
                          size="sm"
                          onClick={() => handlePayNow(loan._id)}
                          className="text-xs h-8"
                          disabled={actionLoading === loan._id}
                        >
                          {actionLoading === loan._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {actionLoading === loan._id ? 'Processing...' : 'Pay Now'}
                        </Button>
                      )}

                      {loan.status === 'repaying' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/borrower/repayments')}
                          className="text-xs h-8"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          View Repayments
                        </Button>
                      )}

                      {loan.status === 'completed' && (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-xs h-8">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
