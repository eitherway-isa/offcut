import { useEffect, useRef, useState } from 'react'
import { addPieces, formatSize } from '../lib/pieces'
import type { Grain, Piece, PieceKind } from '../lib/types'

// Sticky fields are remembered between entries (and between visits) so that
// measuring a pile of offcuts of the same sheet only needs length and width.
const STICKY_KEY = 'quickadd.sticky'
interface Sticky {
  kind: PieceKind
  material: string
  thickness: string
  grain: Grain
  location: string
}
const defaultSticky: Sticky = { kind: 'offcut', material: '', thickness: '18', grain: 'length', location: '' }

function loadSticky(): Sticky {
  try {
    return { ...defaultSticky, ...JSON.parse(localStorage.getItem(STICKY_KEY) ?? '{}') }
  } catch {
    return defaultSticky
  }
}

export function QuickAdd() {
  const [sticky, setSticky] = useState<Sticky>(loadSticky)
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState<Piece[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const lengthRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STICKY_KEY, JSON.stringify(sticky))
    } catch {
      /* storage unavailable: fine */
    }
  }, [sticky])

  const set = <K extends keyof Sticky>(k: K, v: Sticky[K]) => setSticky((s) => ({ ...s, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const l = Number(length)
      const w = Number(width)
      // Store the longer side as length; grain is stated relative to length.
      const piece = {
        kind: sticky.kind,
        material: sticky.material.trim(),
        thickness_mm: Number(sticky.thickness),
        length_mm: Math.max(l, w),
        width_mm: Math.min(l, w),
        grain: l < w && sticky.grain !== 'none' ? (sticky.grain === 'length' ? 'width' : 'length') : sticky.grain,
        location: sticky.location.trim() || null,
        notes: notes.trim() || null,
      } as const
      const count = Math.min(50, Math.max(1, Math.round(Number(qty)) || 1))
      const saved = await addPieces(Array.from({ length: count }, () => piece))
      setAdded((a) => [...saved.reverse(), ...a])
      setQty('1')
      setNotes('')
      setLength('')
      setWidth('')
      lengthRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <h1>Quick add</h1>
      <form className="card stack" onSubmit={submit}>
        <fieldset className="grid2">
          <label>
            Material
            <input required list="materials" value={sticky.material} onChange={(e) => set('material', e.target.value)} />
          </label>
          <label>
            Thickness (mm)
            <input required inputMode="decimal" value={sticky.thickness} onChange={(e) => set('thickness', e.target.value)} />
          </label>
          <label>
            Type
            <select value={sticky.kind} onChange={(e) => set('kind', e.target.value as PieceKind)}>
              <option value="offcut">Offcut</option>
              <option value="sheet">Full sheet</option>
              <option value="board">Board</option>
            </select>
          </label>
          <label>
            Grain runs along
            <select value={sticky.grain} onChange={(e) => set('grain', e.target.value as Grain)}>
              <option value="length">First measurement</option>
              <option value="width">Second measurement</option>
              <option value="none">No grain (MDF etc.)</option>
            </select>
          </label>
          <label className="span2">
            Location
            <input value={sticky.location} placeholder="e.g. Rack A" onChange={(e) => set('location', e.target.value)} />
          </label>
        </fieldset>
        <div className="grid2 big">
          <label>
            Length (mm)
            <input ref={lengthRef} required autoFocus inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} />
          </label>
          <label>
            Width (mm)
            <input required inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
        </div>
        <div className="grid2">
          <label>
            Quantity
            <input required inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          <label>
            Notes
            <input value={notes} placeholder="optional" onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : Number(qty) > 1 ? `Save ${qty} pieces and next` : 'Save and next'}</button>
        {error && <p className="error">{error}</p>}
      </form>
      {added.length > 0 && (
        <div className="card">
          <h2>Added this session ({added.length})</h2>
          <ul className="plain">
            {added.map((p) => (
              <li key={p.id}>
                <strong>{p.label}</strong> {p.material} {formatSize(p)}{p.notes && <span className="muted"> · {p.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
