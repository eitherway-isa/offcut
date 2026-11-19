import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject, listProjects } from '../lib/projects'
import type { Project } from '../lib/types'

const STATUS_TEXT = { planning: 'Planning', in_progress: 'In progress', done: 'Done' }

export function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    listProjects().then(setProjects, (e) => setError(e.message))
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    try {
      const p = await createProject(name.trim())
      navigate(`/projects/${p.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="stack">
      <h1>Projects</h1>
      <form className="row" onSubmit={create}>
        <input required placeholder="New project, e.g. Shoe rack" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="small">Create</button>
      </form>
      {error && <p className="error">{error}</p>}
      {!projects ? <p>Loading…</p> : (
        <ul className="plain cards">
          {projects.map((p) => (
            <li key={p.id} className="card">
              <Link to={`/projects/${p.id}`}><strong>{p.name}</strong> <span className="muted">· {STATUS_TEXT[p.status]}</span></Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
