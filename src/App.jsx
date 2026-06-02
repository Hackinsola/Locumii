import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth, useAuthListener } from '@/hooks/useAuth'
import Home from '@/pages/Home'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import Reset from '@/pages/auth/Reset'
import FacilityOnboarding from '@/pages/facility/Onboarding'
import DocumentUpload from '@/pages/professional/DocumentUpload'
import Onboarding from '@/pages/professional/Onboarding'

// Gates a route behind authentication. Pass allowedRoles to also restrict by role
// (omitted = any signed-in user). Waits for the initial session check so a refresh
// does not flash the login screen.
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isInitialized, role } = useAuth()
  if (!isInitialized) {
    return null
  }
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
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
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
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
          path="/facility/onboarding"
          element={
            <ProtectedRoute allowedRoles={['facility']}>
              <FacilityOnboarding />
            </ProtectedRoute>
          }
        />
        {/* Reset is reached from the email link with a recovery session active, so
            it must stay accessible even when "authenticated". */}
        <Route path="/auth/reset" element={<Reset />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
