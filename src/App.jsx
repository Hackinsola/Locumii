import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, useAuthListener } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Landing from '@/pages/Landing'
import ProfessionalDashboard from '@/pages/professional/Dashboard'
import FacilityDashboard from '@/pages/facility/Dashboard'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Reset from '@/pages/auth/Reset'
import Suspended from '@/pages/auth/Suspended'
import AdminDashboard from '@/pages/admin/Dashboard'
import CredentialQueue from '@/pages/admin/CredentialQueue'
import FacilityQueue from '@/pages/admin/FacilityQueue'
import UserManager from '@/pages/admin/UserManager'
import ManageBids from '@/pages/facility/ManageBids'
import MyShifts from '@/pages/facility/MyShifts'
import FacilityOnboarding from '@/pages/facility/Onboarding'
import PostShift from '@/pages/facility/PostShift'
import FacilityProfile from '@/pages/facility/FacilityProfile'
import FacilityMyProfile from '@/pages/facility/MyProfile'
import FacilityTransactions from '@/pages/facility/Transactions'
import DocumentUpload from '@/pages/professional/DocumentUpload'
import Earnings from '@/pages/professional/Earnings'
import MyProfile from '@/pages/professional/MyProfile'
import ProfessionalMyShifts from '@/pages/professional/MyShifts'
import Onboarding from '@/pages/professional/Onboarding'
import ProfessionalProfile from '@/pages/professional/ProfessionalProfile'
import ShiftDetail from '@/pages/professional/ShiftDetail'
import ShiftFeed from '@/pages/professional/ShiftFeed'

// Gates a route behind authentication. Pass allowedRoles to also restrict by role
// (omitted = any signed-in user). Waits for the initial session check so a refresh
// does not flash the login screen.
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isInitialized, role, status } = useAuth()
  if (!isInitialized) {
    return null
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }
  // Suspended accounts are blocked from the whole app. 'pending'/'active' pass
  // through — only an admin suspension gates access (see 06-admin-panel decision).
  if (status === 'suspended') {
    return <Navigate to="/auth/suspended" replace />
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
}

// The "/" entry point: signed-out visitors see the marketing landing page; signed-in
// users are routed to their role's dashboard. Lives outside the app chrome so the
// landing renders without the authenticated nav.
function RootRoute() {
  const { role, isInitialized, isAuthenticated } = useAuth()
  if (!isInitialized) {
    return null
  }
  if (!isAuthenticated) {
    return <Landing />
  }
  if (role === 'professional') {
    return <Navigate to="/professional/dashboard" replace />
  }
  if (role === 'facility') {
    return <Navigate to="/facility/dashboard" replace />
  }
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }
  return <Navigate to="/auth/login" replace />
}

// Auth pages are for signed-out users; redirect anyone already signed in to home.
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isInitialized } = useAuth()
  if (!isInitialized) {
    return null
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  // Keep the auth store in sync with the Supabase session for the whole app.
  useAuthListener()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public marketing landing (signed-out) / dashboard redirect (signed-in). */}
        <Route path="/" element={<RootRoute />} />

        {/* Auth pages — no app chrome, signed-out only. */}
        <Route
          path="/auth/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/auth/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPassword />
            </PublicOnlyRoute>
          }
        />
        {/* Reset is reached from the email link with a recovery session active, so
            it must stay accessible even when "authenticated". */}
        <Route path="/auth/reset" element={<Reset />} />
        {/* Reachable by a signed-in but suspended user; must stay outside
            ProtectedRoute, which redirects suspended accounts here. */}
        <Route path="/auth/suspended" element={<Suspended />} />

        {/* Authenticated app — shared nav chrome wraps every page below. */}
        <Route element={<AppLayout />}>
        <Route
          path="/professional/dashboard"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <ProfessionalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/onboarding"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/documents"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <DocumentUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/shifts"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <ShiftFeed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/profile"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <MyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/earnings"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <Earnings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/my-shifts"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <ProfessionalMyShifts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/professional/shifts/:shiftId"
          element={
            <ProtectedRoute allowedRoles={['professional']}>
              <ShiftDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/dashboard"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <FacilityDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/onboarding"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <FacilityOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/post-shift"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <PostShift />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/profile"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <FacilityMyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/transactions"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <FacilityTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/shifts"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <MyShifts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facility/shifts/:shiftId/bids"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <ManageBids />
            </ProtectedRoute>
          }
        />
        {/* Profile views are cross-role: a facility views a professional and vice
            versa, so they are gated on auth only (RLS allows reading any profile). */}
        <Route
          path="/professionals/:userId"
          element={
            <ProtectedRoute>
              <ProfessionalProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facilities/:userId"
          element={
            <ProtectedRoute>
              <FacilityProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/credentials"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CredentialQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/facilities"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <FacilityQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManager />
            </ProtectedRoute>
          }
        />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
