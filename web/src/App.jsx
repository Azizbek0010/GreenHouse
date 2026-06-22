import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import Layout from './components/Layout'

import Login from './pages/Login'

import AdminHome       from './pages/admin/Home'
import AdminPartiyalar from './pages/admin/Partiyalar'
import AdminSotuvlar   from './pages/admin/Sotuvlar'
import AdminStatistika from './pages/admin/Statistika'
import AdminAtxod      from './pages/admin/Atxod'
import AdminFarq       from './pages/admin/FarqDetail'
import AdminUsers      from './pages/admin/Users'
import AdminSozlamalar from './pages/admin/Sozlamalar'
import AdminTarix      from './pages/admin/Tarix'

import TeplitsaHome    from './pages/teplitsa/Home'
import TeplitsaYuborish from './pages/teplitsa/Yuborish'
import TeplitsaTarix    from './pages/teplitsa/Tarix'

import KassaHome       from './pages/kassa/Home'
import KassaQabul      from './pages/kassa/Qabul'
import KassaSotuv      from './pages/kassa/Sotuv'
import KassaAtxod      from './pages/kassa/Atxod'
import KassaTarix      from './pages/kassa/Tarix'

import Profil          from './pages/Profil'

// Guard: faqat autentifikatsiya qilingan foydalanuvchi
function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cbg">
      <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />
  return <Layout>{children}</Layout>
}

// Logout redirect sahifa
function RoleRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}`} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Admin */}
            <Route path="/admin" element={<PrivateRoute role="admin"><AdminHome /></PrivateRoute>} />
            <Route path="/admin/partiyalar" element={<PrivateRoute role="admin"><AdminPartiyalar /></PrivateRoute>} />
            <Route path="/admin/sotuvlar"   element={<PrivateRoute role="admin"><AdminSotuvlar /></PrivateRoute>} />
            <Route path="/admin/statistika" element={<PrivateRoute role="admin"><AdminStatistika /></PrivateRoute>} />
            <Route path="/admin/atxod"      element={<PrivateRoute role="admin"><AdminAtxod /></PrivateRoute>} />
            <Route path="/admin/farq/:id"   element={<PrivateRoute role="admin"><AdminFarq /></PrivateRoute>} />
            <Route path="/admin/tarix"      element={<PrivateRoute role="admin"><AdminTarix /></PrivateRoute>} />
            <Route path="/admin/users"      element={<PrivateRoute role="admin"><AdminUsers /></PrivateRoute>} />
            <Route path="/admin/sozlamalar" element={<PrivateRoute role="admin"><AdminSozlamalar /></PrivateRoute>} />

            {/* Teplitsa */}
            <Route path="/teplitsa"          element={<PrivateRoute role="teplitsa"><TeplitsaHome /></PrivateRoute>} />
            <Route path="/teplitsa/yuborish" element={<PrivateRoute role="teplitsa"><TeplitsaYuborish /></PrivateRoute>} />
            <Route path="/teplitsa/tarix"    element={<PrivateRoute role="teplitsa"><TeplitsaTarix /></PrivateRoute>} />

            {/* Kassa */}
            <Route path="/kassa"        element={<PrivateRoute role="kassa"><KassaHome /></PrivateRoute>} />
            <Route path="/kassa/qabul"  element={<PrivateRoute role="kassa"><KassaQabul /></PrivateRoute>} />
            <Route path="/kassa/sotuv"  element={<PrivateRoute role="kassa"><KassaSotuv /></PrivateRoute>} />
            <Route path="/kassa/atxod"  element={<PrivateRoute role="kassa"><KassaAtxod /></PrivateRoute>} />
            <Route path="/kassa/tarix"  element={<PrivateRoute role="kassa"><KassaTarix /></PrivateRoute>} />

            {/* Profil (barcha rollar) */}
            <Route path="/profil" element={<PrivateRoute><Profil /></PrivateRoute>} />

            {/* 404 → role redirect */}
            <Route path="*" element={<RoleRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
