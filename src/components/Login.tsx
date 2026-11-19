import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) return <p className="card">Check your inbox for a sign-in link.</p>

  return (
    <form className="card stack" onSubmit={submit}>
      <h1>Offcut Stock</h1>
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <button type="submit">Send sign-in link</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
