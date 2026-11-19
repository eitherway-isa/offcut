import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatSize, getPiece, updatePiece } from '../lib/pieces'
import type { Piece, PieceStatus } from '../lib/types'

// Opened by scanning a piece's QR label (/p/OC-0042).
export function PieceDetail() {
  const { label = '' } = useParams()
  const [piece, setPiece] = useState<Piece | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPiece(label).then(setPiece, (e) => setError(e.message))
  }, [label])

  async function setStatus(status: PieceStatus) {
    if (!piece) return
    try {
      await updatePiece(piece.id, { status })
      setPiece({ ...piece, status })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (error) return <p className="error">{error}</p>
  if (piece === undefined) return <p>Loading…</p>
  if (piece === null) return <p>No piece with ID {label}.</p>

  return (
    <div className="card stack">
      <h1>{piece.label}</h1>
      <p><strong>{piece.material}</strong> · {formatSize(piece)}</p>
      <p className="muted">
        {piece.kind} · grain {piece.grain === 'none' ? 'none' : `along ${piece.grain}`}
        {piece.location && ` · ${piece.location}`}
      </p>
      {piece.notes && <p>{piece.notes}</p>}
      <label>
        Status
        <select value={piece.status} onChange={(e) => setStatus(e.target.value as PieceStatus)}>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="used">Used</option>
          <option value="discarded">Discarded</option>
        </select>
      </label>
    </div>
  )
}
