import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { StockList } from './pages/StockList'
import { QuickAdd } from './pages/QuickAdd'
import { PieceDetail } from './pages/PieceDetail'
import { Labels } from './pages/Labels'

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
    <HashRouter>
      <nav className="topnav">
        <NavLink to="/" end>Stock</NavLink>
        <NavLink to="/add">Quick add</NavLink>
        <NavLink to="/labels">Labels</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<StockList />} />
          <Route path="/add" element={<QuickAdd />} />
          <Route path="/p/:label" element={<PieceDetail />} />
          <Route path="/labels" element={<Labels />} />
        </Routes>
      </main>
    </HashRouter>
  )
}
