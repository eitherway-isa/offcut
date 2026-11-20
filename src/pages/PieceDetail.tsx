import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatSize, getPiece, updatePiece } from '../lib/pieces'
import { PieceForm, type PieceEdits } from '../components/PieceForm'
import type { Piece } from '../lib/types'

// Opened by scanning a piece's QR label (/p/OC-0042) or from the stock list.
export function PieceDetail() {
  const { label = '' } = useParams()
  const [piece, setPiece] = useState<Piece | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPiece(label).then(setPiece, (e) => setError(e.message))
  }, [label])

  async function save(changes: Partial<PieceEdits>) {
    if (!piece) return
    try {
      await updatePiece(piece.id, changes)
      setPiece({ ...piece, ...changes })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (piece === undefined) return error ? <p className="error">{error}</p> : <p>Loading…</p>
  if (piece === null) return <p>No piece with ID {label}.</p>

  return (
    <div className="card stack">
      <h1>{piece.label}</h1>
      {editing ? (
        <PieceForm piece={piece} onSave={save} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <p><strong>{piece.material}</strong> · {formatSize(piece)}</p>
          <p className="muted">
            {piece.kind} · grain {piece.grain === 'none' ? 'none' : `along ${piece.grain}`}
            {piece.location && ` · ${piece.location}`} · {piece.status}
          </p>
          {piece.notes && <p className="notes">{piece.notes}</p>}
          <div className="row">
            {piece.status !== 'used' && <button onClick={() => save({ status: 'used' })}>Mark as used</button>}
            {piece.status === 'used' && <button onClick={() => save({ status: 'available' })}>Back in stock</button>}
            <button className="ghost" onClick={() => setEditing(true)}>Edit</button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
