import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatSize, listPieces, updatePiece, updatePieces } from '../lib/pieces'
import type { Piece } from '../lib/types'

type SortKey = 'label' | 'material' | 'thickness_mm' | 'length_mm' | 'width_mm' | 'location' | 'status'
const COLUMNS: [SortKey, string][] = [
  ['label', 'ID'], ['material', 'Material'], ['thickness_mm', 'T'], ['length_mm', 'L'], ['width_mm', 'W'],
  ['location', 'Location'], ['status', 'Status'],
]

export function StockList() {
  const [pieces, setPieces] = useState<Piece[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('available')
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'label', asc: false })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const reload = useCallback(() => listPieces().then(setPieces, (e) => setError(e.message)), [])
  useEffect(() => { reload() }, [reload])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (pieces ?? []).filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!q || [p.label, p.material, p.location ?? '', p.notes ?? '', String(p.thickness_mm)].some((f) => f.toLowerCase().includes(q))),
    )
    const { key, asc } = sort
    return list.sort((a, b) => {
      const x = a[key] ?? '', y = b[key] ?? ''
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
      return asc ? c : -c
    })
  }, [pieces, query, status, sort])

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.id))
  const toggleAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map((p) => p.id)))
  const sortBy = (key: SortKey) => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))

  if (error) return <p className="error">{error}</p>
  if (!pieces) return <p>Loading…</p>

  return (
    <div className="stack">
      <h1>Stock <span className="muted">({shown.length})</span></h1>
      <div className="row">
        <input type="search" placeholder="Search material, ID, location, notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="used">Used</option>
          <option value="all">All</option>
        </select>
      </div>
      {selected.size > 0 && (
        <BulkEdit
          pieces={pieces.filter((p) => selected.has(p.id))}
          onDone={() => { setSelected(new Set()); reload() }}
          onCancel={() => setSelected(new Set())}
        />
      )}
      {shown.length === 0 ? (
        <p className="muted">No pieces here. <Link to="/add">Add some</Link>.</p>
      ) : (
        <>
          {/* Laptop and tablet: table */}
          <table className="stock-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all" checked={allShownSelected} onChange={toggleAll} /></th>
                {COLUMNS.map(([key, title]) => (
                  <th key={key} onClick={() => sortBy(key)} className="sortable">
                    {title}{sort.key === key ? (sort.asc ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
                <th>Grain</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={selected.has(p.id) ? 'selected' : ''} onClick={() => navigate(`/p/${p.label}`)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td><strong>{p.label}</strong></td>
                  <td>{p.material}</td>
                  <td className="num">{p.thickness_mm}</td>
                  <td className="num">{p.length_mm}</td>
                  <td className="num">{p.width_mm}</td>
                  <td>{p.location}</td>
                  <td>{p.status}</td>
                  <td>{p.grain === 'none' ? '–' : p.grain}</td>
                  <td className="notes-cell">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Phone: cards */}
          <ul className="plain cards stock-cards">
            {shown.map((p) => (
              <li key={p.id} className={`card card-row ${selected.has(p.id) ? 'selected' : ''}`}>
                <input type="checkbox" aria-label={`Select ${p.label}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <Link to={`/p/${p.label}`}>
                  <strong>{p.label}</strong> · {p.material}
                  <div>{formatSize(p)}</div>
                  <div className="muted">
                    {p.kind}
                    {p.grain !== 'none' && ` · grain along ${p.grain}`}
                    {p.location && ` · ${p.location}`}
                  </div>
                  {p.notes && <div className="muted">{p.notes}</div>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )

}

function BulkEdit({ pieces, onDone, onCancel }: { pieces: Piece[]; onDone: () => void; onCancel: () => void }) {
  // Empty field = leave unchanged.
  const [f, setF] = useState({ material: '', thickness: '', kind: '', grain: '', location: '', status: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  const ids = pieces.map((p) => p.id)
  const withLocation = pieces.filter((p) => p.location)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function apply(e: React.FormEvent) {
    e.preventDefault()
    const changes: Partial<Piece> = {}
    if (f.material.trim()) changes.material = f.material.trim()
    if (f.thickness.trim()) changes.thickness_mm = Number(f.thickness)
    if (f.kind) changes.kind = f.kind as Piece['kind']
    if (f.grain) changes.grain = f.grain as Piece['grain']
    if (f.location.trim()) changes.location = f.location === '-' ? null : f.location.trim()
    if (f.status) changes.status = f.status as Piece['status']
    if (f.notes.trim()) changes.notes = f.notes === '-' ? null : f.notes.trim()
    if (Object.keys(changes).length === 0) return
    run(() => updatePieces(ids, changes))
  }

  // For pieces where the location field was used for notes.
  function moveLocationToNotes() {
    run(async () => {
      for (const p of withLocation) {
        const notes = [p.notes, p.location].filter(Boolean).join(' · ')
        await updatePiece(p.id, { notes, location: null })
      }
    })
  }

  return (
    <form className="card stack bulk" onSubmit={apply}>
      <div className="row spread">
        <h2>Edit {pieces.length} selected</h2>
        <button type="button" className="small ghost" onClick={onCancel}>Clear selection</button>
      </div>
      <p className="muted">Fill in only what you want to change. Type "-" to empty a location or notes.</p>
      <div className="bulk-grid">
        <label>Material<input list="materials" value={f.material} onChange={(e) => set('material', e.target.value)} /></label>
        <label>Thickness (mm)<input inputMode="decimal" value={f.thickness} onChange={(e) => set('thickness', e.target.value)} /></label>
        <label>Location<input value={f.location} onChange={(e) => set('location', e.target.value)} /></label>
        <label>Type
          <select value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="">Unchanged</option><option value="offcut">Offcut</option><option value="sheet">Full sheet</option><option value="board">Board</option>
          </select>
        </label>
        <label>Grain
          <select value={f.grain} onChange={(e) => set('grain', e.target.value)}>
            <option value="">Unchanged</option><option value="length">Along length</option><option value="width">Along width</option><option value="none">No grain</option>
          </select>
        </label>
        <label>Status
          <select value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">Unchanged</option><option value="available">Available</option><option value="reserved">Reserved</option>
            <option value="used">Used</option><option value="discarded">Discarded</option>
          </select>
        </label>
        <label className="bulk-notes">Notes (replaces)<input value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      </div>
      <div className="row wrap">
        <button type="submit" disabled={busy}>Apply to {pieces.length}</button>
        {withLocation.length > 0 && (
          <button type="button" className="ghost" disabled={busy} onClick={moveLocationToNotes}>
            Move location into notes ({withLocation.length})
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
