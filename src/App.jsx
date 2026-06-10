import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, useAuthListener } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'

// Pages are lazy-loaded so each route ships as its own chunk: a signed-out visitor
// on the landing page never downloads the admin/facility/professional bundles. The
// shared chrome (AppLayout) stays eager so nav renders instantly while a page chunk
// loads behind the Suspense fallback below.
const Landing = lazy(() => import('@/pages/Landing'))
const Waitlist = lazy(() => import('@/pages/Waitlist'))
const ProfessionalDashboard = lazy(() => import('@/pages/professional/Dashboard'))
const FacilityDashboard = lazy(() => import('@/pages/facility/Dashboard'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const Reset = lazy(() => import('@/pages/auth/Reset'))
const Suspended = lazy(() => import('@/pages/auth/Suspended'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const CredentialQueue = lazy(() => import('@/pages/admin/CredentialQueue'))
const FacilityQueue = lazy(() => import('@/pages/admin/FacilityQueue'))
const UserManager = lazy(() => import('@/pages/admin/UserManager'))
const AdminWaitlist = lazy(() => import('@/pages/admin/Waitlist'))
const Settings = lazy(() => import('@/pages/Settings'))
const ManageBids = lazy(() => import('@/pages/facility/ManageBids'))
const MyShifts = lazy(() => import('@/pages/facility/MyShifts'))
const FacilityOnboarding = lazy(() => import('@/pages/facility/Onboarding'))
const PostShift = lazy(() => import('@/pages/facility/PostShift'))
const FacilityProfile = lazy(() => import('@/pages/facility/FacilityProfile'))
const FacilityMyProfile = lazy(() => import('@/pages/facility/MyProfile'))
const FacilityTransactions = lazy(() => import('@/pages/facility/Transactions'))
const DocumentUpload = lazy(() => import('@/pages/professional/DocumentUpload'))
const Earnings = lazy(() => import('@/pages/professional/Earnings'))
const MyProfile = lazy(() => import('@/pages/professional/MyProfile'))
const ProfessionalMyShifts = lazy(() => import('@/pages/professional/MyShifts'))
const Onboarding = lazy(() => import('@/pages/professional/Onboarding'))
const ProfessionalProfile = lazy(() => import('@/pages/professional/ProfessionalProfile'))
const ShiftDetail = lazy(() => import('@/pages/professional/ShiftDetail'))
const ShiftFeed = lazy(() => import('@/pages/professional/ShiftFeed'))

// Shown while a lazy page chunk is downloading. Minimal by design — a centered
// spinner on the app background — so route transitions don't flash empty content.
function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

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
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public marketing landing (signed-out) / dashboard redirect (signed-in). */}
        <Route path="/" element={<RootRoute />} />

        {/* Pre-launch waitlist capture — where the landing's "Get started" points until
            the real account signup goes live. Signed-out only. */}
        <Route
          path="/waitlist"
          element={
            <PublicOnlyRoute>
              <Waitlist />
            </PublicOnlyRoute>
          }
        />

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
        <Route
          path="/admin/waitlist"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminWaitlist />
            </ProtectedRoute>
          }
        />
        {/* Account settings — any signed-in user (no role restriction). */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
