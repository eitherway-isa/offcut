import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { addPiece, formatSize, listPieces, updatePiece } from '../lib/pieces'
import { addParts, assignPiece, deletePart, getProject, updateProject } from '../lib/projects'
import { autoAssign, candidates, suggestLeftovers } from '../lib/matching'
import type { Part, Piece, Project } from '../lib/types'
import { ImportParts } from '../components/ImportParts'

interface Leftover { key: string; fromPieceId: string; material: string; thickness_mm: number; length_mm: number; width_mm: number; grain: Piece['grain']; keep: boolean }

export function ProjectDetail() {
  const { id = '' } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [pieces, setPieces] = useState<Piece[]>([])
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [{ project, parts }, pieces] = await Promise.all([getProject(id), listPieces()])
      setProject(project)
      setParts(parts)
      setPieces(pieces)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const byId = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces])
  const run = (fn: () => Promise<unknown>) => fn().then(reload, (e) => setError(e instanceof Error ? e.message : String(e)))

  async function assign(part: Part, pieceId: string | null) {
    if (part.piece_id) await updatePiece(part.piece_id, { status: 'available' })
    if (pieceId) await updatePiece(pieceId, { status: 'reserved' })
    await assignPiece(part.id, pieceId)
  }

  async function auto() {
    const map = autoAssign(parts, pieces)
    for (const [partId, pieceId] of map) await assign(parts.find((p) => p.id === partId)!, pieceId)
    if (project?.status === 'planning') await updateProject(id, { status: 'in_progress' })
  }

  if (error) return <p className="error">{error}</p>
  if (!project) return <p>Loading…</p>
  const done = project.status === 'done'
  const assigned = parts.filter((p) => p.piece_id).length

  return (
    <div className="stack">
      <h1>{project.name}</h1>
      {!done && <AddParts projectId={id} onAdded={reload} lastPart={parts[parts.length - 1]} />}
      {!done && <ImportParts projectId={id} onAdded={reload} stockMaterials={[...new Set(pieces.map((p) => p.material))].sort()} />}
      <div className="card stack">
        <div className="row spread">
          <h2>Cut list ({assigned}/{parts.length} from stock)</h2>
          {!done && parts.length > 0 && <button className="small" onClick={() => run(auto)}>Match from stock</button>}
        </div>
        {parts.length === 0 && <p className="muted">Add the parts you need above.</p>}
        <ul className="plain stack">
          {parts.map((part) => {
            const current = part.piece_id ? byId.get(part.piece_id) : undefined
            const options = candidates(part, pieces.filter((p) => p.status === 'available' || p.id === part.piece_id)
              .map((p) => (p.id === part.piece_id ? { ...p, status: 'available' as const } : p)))
              .filter((p) => p.id === part.piece_id || !parts.some((q) => q.piece_id === p.id))
            return (
              <li key={part.id} className="part">
                <div>
                  <strong>{part.name}</strong> {part.material} {formatSize(part)}
                  {part.grain_matters ? '' : <span className="muted"> · any grain</span>}
                  {part.notes && <div className="muted">{part.notes}</div>}
                </div>
                {done ? (
                  <div className="muted">{current ? `From ${current.label}` : 'New material'}</div>
                ) : (
                  <div className="row">
                    <select value={part.piece_id ?? ''} onChange={(e) => run(() => assign(part, e.target.value || null))}>
                      <option value="">{options.length ? 'Buy new / not chosen' : 'No stock fits, buy new'}</option>
                      {options.map((p) => (
                        <option key={p.id} value={p.id}>{p.label} · {p.kind} · {p.length_mm}×{p.width_mm}{p.location ? ` · ${p.location}` : ''}</option>
                      ))}
                      {current && !options.some((o) => o.id === current.id) && <option value={current.id}>{current.label}</option>}
                    </select>
                    <button className="small ghost" onClick={() => run(async () => { await assign(part, null); await deletePart(part.id) })}>✕</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      {!done && assigned > 0 && !finishing && (
        <button onClick={() => setFinishing(true)}>Project finished: update stock</button>
      )}
      {finishing && (
        <FinishProject project={project} parts={parts} byId={byId} onDone={() => { setFinishing(false); reload() }} />
      )}
    </div>
  )
}

function AddParts({ projectId, onAdded, lastPart }: { projectId: string; onAdded: () => void; lastPart?: Part }) {
  const [f, setF] = useState({ name: '', material: lastPart?.material ?? '', thickness: String(lastPart?.thickness_mm ?? 18), length: '', width: '', qty: '1', grain: true })
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const qty = Math.max(1, Number(f.qty) || 1)
    const base = { project_id: projectId, material: f.material.trim(), thickness_mm: Number(f.thickness), length_mm: Number(f.length), width_mm: Number(f.width), grain_matters: f.grain }
    try {
      await addParts(Array.from({ length: qty }, (_, i) => ({ ...base, name: qty > 1 ? `${f.name} ${i + 1}` : f.name })))
      setF((s) => ({ ...s, name: '', length: '', width: '', qty: '1' }))
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Add part</h2>
      <div className="grid2">
        <label className="span2">Name<input required value={f.name} placeholder="e.g. Side panel" onChange={(e) => set('name', e.target.value)} /></label>
        <label>Material<input required list="materials" value={f.material} onChange={(e) => set('material', e.target.value)} /></label>
        <label>Thickness (mm)<input required inputMode="decimal" value={f.thickness} onChange={(e) => set('thickness', e.target.value)} /></label>
        <label>Length (mm){f.grain && ' along grain'}<input required inputMode="decimal" value={f.length} onChange={(e) => set('length', e.target.value)} /></label>
        <label>Width (mm)<input required inputMode="decimal" value={f.width} onChange={(e) => set('width', e.target.value)} /></label>
        <label>Quantity<input required inputMode="numeric" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={f.grain} onChange={(e) => set('grain', e.target.checked)} />Grain matters</label>
      </div>
      <button type="submit">Add</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

function FinishProject({ project, parts, byId, onDone }: { project: Project; parts: Part[]; byId: Map<string, Piece>; onDone: () => void }) {
  const used = parts.filter((p) => p.piece_id && byId.has(p.piece_id))
  const [wentToPlan, setWentToPlan] = useState<boolean | null>(null)
  const [usedIds, setUsedIds] = useState(() => new Set(used.map((p) => p.piece_id!)))
  const [leftovers, setLeftovers] = useState<Leftover[]>(() =>
    used.flatMap((part) => {
      const piece = byId.get(part.piece_id!)!
      return suggestLeftovers(part, piece).map((r, i) => ({
        key: `${piece.id}-${i}`, fromPieceId: piece.id, material: piece.material, thickness_mm: piece.thickness_mm,
        grain: piece.grain, keep: true, ...r,
      }))
    }),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edit = (key: string, changes: Partial<Leftover>) => setLeftovers((ls) => ls.map((l) => (l.key === key ? { ...l, ...changes } : l)))

  async function save() {
    setSaving(true)
    try {
      for (const part of used) {
        await updatePiece(part.piece_id!, { status: usedIds.has(part.piece_id!) ? 'used' : 'available' })
      }
      for (const l of leftovers.filter((l) => l.keep && usedIds.has(l.fromPieceId))) {
        await addPiece({ kind: 'offcut', material: l.material, thickness_mm: l.thickness_mm, length_mm: l.length_mm, width_mm: l.width_mm, grain: l.grain, location: byId.get(l.fromPieceId)?.location ?? null, source_project_id: project.id })
      }
      await updateProject(project.id, { status: 'done', finished_at: new Date().toISOString() })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  return (
    <div className="card stack">
      <h2>Did everything go to plan?</h2>
      <div className="row">
        <button className={wentToPlan === true ? '' : 'ghost'} onClick={() => setWentToPlan(true)}>Yes</button>
        <button className={wentToPlan === false ? '' : 'ghost'} onClick={() => setWentToPlan(false)}>Not quite</button>
      </div>
      {wentToPlan === false && (
        <>
          <p className="muted">Untick the pieces you didn't cut. They go back to available stock.</p>
          {used.map((part) => (
            <label key={part.id} className="check">
              <input type="checkbox" checked={usedIds.has(part.piece_id!)} onChange={(e) => setUsedIds((s) => { const n = new Set(s); if (e.target.checked) n.add(part.piece_id!); else n.delete(part.piece_id!); return n })} />
              {byId.get(part.piece_id!)?.label} → {part.name}
            </label>
          ))}
        </>
      )}
      {wentToPlan !== null && (
        <>
          <h2>New offcuts</h2>
          <p className="muted">Suggested from what's left of each piece. Adjust the sizes to what you actually have, or untick scraps you binned.</p>
          {leftovers.filter((l) => usedIds.has(l.fromPieceId)).map((l) => (
            <div key={l.key} className="row leftover">
              <input type="checkbox" checked={l.keep} onChange={(e) => edit(l.key, { keep: e.target.checked })} />
              <span className="muted">{byId.get(l.fromPieceId)?.label}</span>
              <input inputMode="decimal" value={l.length_mm} onChange={(e) => edit(l.key, { length_mm: Number(e.target.value) })} />
              ×
              <input inputMode="decimal" value={l.width_mm} onChange={(e) => edit(l.key, { width_mm: Number(e.target.value) })} />
            </div>
          ))}
          <button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Update stock and close project'}</button>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </div>
  )
}
