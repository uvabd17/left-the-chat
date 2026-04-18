import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SlamBook from './pages/SlamBook'
import Messages from './pages/Messages'
import Awards from './pages/Awards'
import Superlatives from './pages/Superlatives'
import UnsentWall from './pages/UnsentWall'
import FutureSelf from './pages/FutureSelf'
import AdminPanel from './pages/AdminPanel'
import PinSetup from './pages/PinSetup'
import PinVerify from './pages/PinVerify'
import { getSession, clearSession, isPinTrusted } from './utils/auth'
import { getStudent } from './appwrite/db'

function ProtectedRoute({ children }) {
  const [state, setState] = useState({ loading: true, redirect: null })

  useEffect(() => {
    async function checkAccess() {
      const session = getSession()
      if (!session) {
        setState({ loading: false, redirect: '/login' })
        return
      }

      if (isPinTrusted(session.rollNo)) {
        setState({ loading: false, redirect: null })
        return
      }

      const student = await getStudent(session.rollNo)
      if (!student) {
        clearSession()
        setState({ loading: false, redirect: '/login' })
        return
      }

      if (student.pinHash) {
        setState({ loading: false, redirect: '/pin-verify' })
      } else {
        setState({ loading: false, redirect: '/pin-setup' })
      }
    }

    checkAccess()
  }, [])

  if (state.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontWeight: 800, textTransform: 'uppercase' }}>Checking access...</p>
      </div>
    )
  }

  if (state.redirect) {
    return <Navigate to={state.redirect} replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pin-setup" element={<PinSetup />} />
        <Route path="/pin-verify" element={<PinVerify />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/slam" element={<ProtectedRoute><SlamBook /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/awards" element={<ProtectedRoute><Awards /></ProtectedRoute>} />
        <Route path="/superlatives" element={<ProtectedRoute><Superlatives /></ProtectedRoute>} />
        <Route path="/unsent" element={<ProtectedRoute><UnsentWall /></ProtectedRoute>} />
        <Route path="/future" element={<ProtectedRoute><FutureSelf /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  )
}
