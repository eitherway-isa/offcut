import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { StockList } from './pages/StockList'
import { QuickAdd } from './pages/QuickAdd'
import { PieceDetail } from './pages/PieceDetail'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <main><Login /></main>

  return (
    <BrowserRouter>
      <nav className="topnav">
        <NavLink to="/" end>Stock</NavLink>
        <NavLink to="/add">Quick add</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<StockList />} />
          <Route path="/add" element={<QuickAdd />} />
          <Route path="/p/:label" element={<PieceDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
