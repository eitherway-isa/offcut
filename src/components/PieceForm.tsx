import { useState } from 'react'
import type { Grain, Piece, PieceKind, PieceStatus } from '../lib/types'

export type PieceEdits = Pick<Piece, 'kind' | 'material' | 'thickness_mm' | 'length_mm' | 'width_mm' | 'grain' | 'location' | 'notes' | 'status'>

export function PieceForm({ piece, onSave, onCancel }: { piece: Piece; onSave: (c: PieceEdits) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({
    kind: piece.kind, material: piece.material, thickness: String(piece.thickness_mm), length: String(piece.length_mm),
    width: String(piece.width_mm), grain: piece.grain, location: piece.location ?? '', notes: piece.notes ?? '', status: piece.status,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      kind: f.kind as PieceKind, material: f.material.trim(), thickness_mm: Number(f.thickness), length_mm: Number(f.length),
      width_mm: Number(f.width), grain: f.grain as Grain, location: f.location.trim() || null, notes: f.notes.trim() || null,
      status: f.status as PieceStatus,
    }).finally(() => setSaving(false))
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="grid2">
        <label>Material<input required list="materials" value={f.material} onChange={(e) => set('material', e.target.value)} /></label>
        <label>Thickness (mm)<input required inputMode="decimal" value={f.thickness} onChange={(e) => set('thickness', e.target.value)} /></label>
        <label>Length (mm)<input required inputMode="decimal" value={f.length} onChange={(e) => set('length', e.target.value)} /></label>
        <label>Width (mm)<input required inputMode="decimal" value={f.width} onChange={(e) => set('width', e.target.value)} /></label>
        <label>Type
          <select value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="offcut">Offcut</option><option value="sheet">Full sheet</option><option value="board">Board</option>
          </select>
        </label>
        <label>Grain runs along
          <select value={f.grain} onChange={(e) => set('grain', e.target.value)}>
            <option value="length">Length</option><option value="width">Width</option><option value="none">No grain</option>
          </select>
        </label>
        <label>Location<input value={f.location} onChange={(e) => set('location', e.target.value)} /></label>
        <label>Status
          <select value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="available">Available</option><option value="reserved">Reserved</option>
            <option value="used">Used</option><option value="discarded">Discarded</option>
          </select>
        </label>
        <label className="span2">Notes<textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      </div>
      <div className="row">
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
