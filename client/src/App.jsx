import { Routes, Route, Navigate } from 'react-router-dom'

// Auth pages
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'

// Borrower pages (stubs — built out Week 1 Day 6+)
import BorrowerDashboard from '@/pages/borrower/Dashboard'
import BorrowerCreateLoan from '@/pages/borrower/CreateLoan'
import BorrowerMyLoans from '@/pages/borrower/MyLoans'
import BorrowerRepayments from '@/pages/borrower/Repayments'

// Lender pages (stubs — built out Week 1 Day 10+)
import LenderDashboard from '@/pages/lender/Dashboard'
import LenderMarketplace from '@/pages/lender/Marketplace'
import LenderInvestments from '@/pages/lender/Investments'

// Guards
import RoleGuard from '@/components/layout/RoleGuard'
import { useAuthStore } from '@/store/useAuthStore'

export default function App() {
  const user = useAuthStore((s) => s.user)

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Borrower routes */}
      <Route element={<RoleGuard role="borrower" />}>
        <Route path="/borrower/dashboard" element={<BorrowerDashboard />} />
        <Route path="/borrower/create-loan" element={<BorrowerCreateLoan />} />
        <Route path="/borrower/my-loans" element={<BorrowerMyLoans />} />
        <Route path="/borrower/repayments" element={<BorrowerRepayments />} />
      </Route>

      {/* Lender routes */}
      <Route element={<RoleGuard role="lender" />}>
        <Route path="/lender/dashboard" element={<LenderDashboard />} />
        <Route path="/lender/marketplace" element={<LenderMarketplace />} />
        <Route path="/lender/investments" element={<LenderInvestments />} />
      </Route>

      {/* Default redirect */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={`/${user.role}/dashboard`} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
