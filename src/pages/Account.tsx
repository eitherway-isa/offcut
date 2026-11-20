import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TidyMaterials } from '../components/TidyMaterials'
import { getSettings, saveSettings } from '../lib/settings'

export function Account() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else {
      setMessage('Password saved. From now on you can sign in with your email and password.')
      setPassword('')
    }
  }

  return (
    <div className="stack">
      <h1>Account</h1>
      <form className="card stack" onSubmit={save}>
        {/* Hidden username field so password managers store email + password together */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <p className="muted">Signed in as {email}</p>
        <label>
          Set a password
          <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit">Save password</button>
        {message && <p>{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>
      <Workshop />
      <TidyMaterials />
      <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}

function Workshop() {
  const [kerf, setKerf] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => { getSettings().then((s) => setKerf(String(s.kerf_mm))) }, [])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      await saveSettings({ kerf_mm: Number(kerf) })
      setMessage('Saved.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    }
  }
  return (
    <form className="card stack" onSubmit={save}>
      <h2>Workshop</h2>
      <label>Saw kerf (mm), used when calculating leftovers<input inputMode="decimal" required value={kerf} onChange={(e) => setKerf(e.target.value)} /></label>
      <button type="submit">Save</button>
      {message && <p className="muted">{message}</p>}
    </form>
  )
}
