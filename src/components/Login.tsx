import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials'
        ? 'Wrong email or password. No password yet? Use "Email me a link" once, then set one under Account.'
        : error.message)
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL, shouldCreateUser: false },
      })
      if (error) setError(error.message)
      else setSent(true)
    }
  }

  if (sent) return <p className="card">Check your inbox for a sign-in link. Open it in the same browser as this page.</p>

  return (
    <form className="card stack" onSubmit={submit}>
      <h1>Offcut Stock</h1>
      <label>
        Email
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {mode === 'password' && (
        <label>
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      )}
      <button type="submit">{mode === 'password' ? 'Sign in' : 'Email me a sign-in link'}</button>
      <button type="button" className="ghost" onClick={() => setMode(mode === 'password' ? 'link' : 'password')}>
        {mode === 'password' ? 'Email me a link instead' : 'Use my password'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
