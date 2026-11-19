import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatSize, listPieces } from '../lib/pieces'
import type { Piece } from '../lib/types'

export function StockList() {
  const [pieces, setPieces] = useState<Piece[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('available')

  useEffect(() => {
    listPieces().then(setPieces, (e) => setError(e.message))
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (pieces ?? []).filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!q || [p.label, p.material, p.location ?? '', String(p.thickness_mm)].some((f) => f.toLowerCase().includes(q))),
    )
  }, [pieces, query, status])

  if (error) return <p className="error">{error}</p>
  if (!pieces) return <p>Loading…</p>

  return (
    <div className="stack">
      <h1>Stock</h1>
      <div className="row">
        <input type="search" placeholder="Search material, ID, location…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="used">Used</option>
          <option value="all">All</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="muted">No pieces yet. <Link to="/add">Add some</Link>.</p>
      ) : (
        <ul className="plain cards">
          {shown.map((p) => (
            <li key={p.id} className="card">
              <Link to={`/p/${p.label}`}>
                <strong>{p.label}</strong> · {p.material}
                <div>{formatSize(p)}</div>
                <div className="muted">
                  {p.kind}
                  {p.grain !== 'none' && ` · grain along ${p.grain}`}
                  {p.location && ` · ${p.location}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
