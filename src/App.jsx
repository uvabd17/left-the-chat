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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/slam" element={<SlamBook />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/superlatives" element={<Superlatives />} />
        <Route path="/unsent" element={<UnsentWall />} />
        <Route path="/future" element={<FutureSelf />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  )
}
