import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Login } from './components/Login'
import { StockList } from './pages/StockList'
import { QuickAdd } from './pages/QuickAdd'
import { PieceDetail } from './pages/PieceDetail'
import { Labels } from './pages/Labels'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Account } from './pages/Account'
import { MATERIALS } from './lib/materials'

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
        <NavLink to="/projects">Projects</NavLink>
        <NavLink to="/labels">Labels</NavLink>
        <NavLink to="/account">Account</NavLink>
      </nav>
      <datalist id="materials">
        {MATERIALS.map((m) => <option key={m} value={m} />)}
      </datalist>
      <main>
        <Routes>
          <Route path="/" element={<StockList />} />
          <Route path="/add" element={<QuickAdd />} />
          <Route path="/p/:label" element={<PieceDetail />} />
          <Route path="/labels" element={<Labels />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>
    </HashRouter>
  )
}
