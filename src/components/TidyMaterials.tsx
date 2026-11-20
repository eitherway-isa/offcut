import { useEffect, useState } from 'react'
import { listPieces, updatePieces } from '../lib/pieces'
import { MATERIALS, normalizeMaterial } from '../lib/materials'
import type { Piece } from '../lib/types'

// One-off helper: rename existing stock to the standard material names.
export function TidyMaterials() {
  const [pieces, setPieces] = useState<Piece[] | null>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPieces().then((ps) => {
      setPieces(ps)
      const t: Record<string, string> = {}
      for (const m of new Set(ps.map((p) => p.material))) if (!MATERIALS.includes(m)) t[m] = normalizeMaterial(m)
      setTargets(t)
    }, (e) => setError(e.message))
  }, [])

  const names = Object.keys(targets).sort()
  const count = (m: string) => pieces?.filter((p) => p.material === m).length ?? 0

  async function apply() {
    if (!pieces) return
    setBusy(true)
    setError(null)
    try {
      let n = 0
      for (const [from, to] of Object.entries(targets)) {
        if (!to.trim() || to === from) continue
        const ids = pieces.filter((p) => p.material === from).map((p) => p.id)
        await updatePieces(ids, { material: to.trim() })
        n += ids.length
      }
      setMessage(`Renamed ${n} piece${n === 1 ? '' : 's'}.`)
      setTargets({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!pieces) return null
  return (
    <div className="card stack">
      <h2>Material names</h2>
      {message && <p>{message}</p>}
      {names.length === 0 ? (
        !message && <p className="muted">All your stock already uses the standard names.</p>
      ) : (
        <>
          <p className="muted">These names in your stock aren't standard yet. Check the new name for each, then rename them all at once.</p>
          {names.map((m) => (
            <label key={m} className="map-row">
              <span>{m} <span className="muted">({count(m)})</span></span>
              <input list="materials" value={targets[m]} onChange={(e) => setTargets((t) => ({ ...t, [m]: e.target.value }))} />
            </label>
          ))}
          <button disabled={busy} onClick={apply}>{busy ? 'Renaming…' : 'Rename'}</button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
