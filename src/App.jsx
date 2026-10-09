import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/auth/RouteGuards'
import { AppShell } from '@/components/layout/AppShell'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Profile = lazy(() => import('@/pages/Profile'))
const Settings = lazy(() => import('@/pages/Settings'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Vehicles = lazy(() => import('@/pages/Vehicles'))
const VehicleForm = lazy(() => import('@/pages/VehicleForm'))
const VehicleDetail = lazy(() => import('@/pages/VehicleDetail'))
const Service = lazy(() => import('@/pages/Service'))
const Analyzer = lazy(() => import('@/pages/Analyzer'))
const Documents = lazy(() => import('@/pages/Documents'))
const Reports = lazy(() => import('@/pages/Reports'))

const Expenses = lazy(() => import('@/pages/Expenses'))
const Assistant = lazy(() => import('@/pages/Assistant'))
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/new" element={<VehicleForm />} />
          <Route path="vehicles/:id" element={<VehicleDetail />} />
          <Route path="vehicles/:id/edit" element={<VehicleForm />} />
          <Route path="service" element={<Service />} />
          <Route path="analyzer" element={<Analyzer />} />
          <Route path="documents" element={<Documents />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
