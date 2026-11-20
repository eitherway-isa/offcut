import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TidyMaterials } from '../components/TidyMaterials'

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
      <TidyMaterials />
      <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}
