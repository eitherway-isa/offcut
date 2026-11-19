import type { Part, Piece } from './types'

type PartSpec = Pick<Part, 'material' | 'thickness_mm' | 'length_mm' | 'width_mm' | 'grain_matters'>

const KIND_ORDER = { offcut: 0, board: 1, sheet: 2 } as const

const sameMaterial = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Can this part be cut from this piece (one part per piece, no nesting)? */
export function fits(part: PartSpec, piece: Piece): boolean {
  if (!sameMaterial(part.material, piece.material)) return false
  if (Math.abs(part.thickness_mm - piece.thickness_mm) > 0.5) return false
  const { length_mm: pl, width_mm: pw } = part
  const { length_mm: L, width_mm: W } = piece
  const straight = pl <= L && pw <= W
  const rotated = pl <= W && pw <= L
  if (!part.grain_matters || piece.grain === 'none') return straight || rotated
  // Part length must run along the piece's grain.
  return piece.grain === 'length' ? straight : rotated
}

/** Candidates for a part: offcuts first, then the smallest piece that fits (least waste). */
export function candidates(part: PartSpec, pieces: Piece[]): Piece[] {
  return pieces
    .filter((p) => p.status === 'available' && fits(part, p))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.length_mm * a.width_mm - b.length_mm * b.width_mm)
}

/**
 * Greedy auto-assignment: biggest parts pick first (they have the fewest options),
 * each takes its best candidate not yet taken. Returns partId -> pieceId.
 */
export function autoAssign(parts: Part[], pieces: Piece[]): Map<string, string> {
  const taken = new Set(parts.map((p) => p.piece_id).filter(Boolean) as string[])
  const result = new Map<string, string>()
  const open = parts.filter((p) => !p.piece_id).sort((a, b) => b.length_mm * b.width_mm - a.length_mm * a.width_mm)
  for (const part of open) {
    const best = candidates(part, pieces).find((c) => !taken.has(c.id))
    if (best) {
      taken.add(best.id)
      result.set(part.id, best.id)
    }
  }
  return result
}

/**
 * Suggested leftovers after cutting a part from a corner of a piece (one guillotine cut
 * across the full length, then one across the remaining strip). Tiny strips are dropped.
 */
export function suggestLeftovers(part: PartSpec, piece: Piece, minMm = 50): { length_mm: number; width_mm: number }[] {
  const rotated = !(part.length_mm <= piece.length_mm && part.width_mm <= piece.width_mm) ||
    (part.grain_matters && piece.grain === 'width')
  const pl = rotated ? part.width_mm : part.length_mm
  const pw = rotated ? part.length_mm : part.width_mm
  const kerf = 3
  const out = [
    { length_mm: piece.length_mm, width_mm: piece.width_mm - pw - kerf },
    { length_mm: piece.length_mm - pl - kerf, width_mm: pw },
  ]
  return out
    .filter((r) => r.length_mm >= minMm && r.width_mm >= minMm)
    .map((r) => ({ length_mm: Math.max(r.length_mm, r.width_mm), width_mm: Math.min(r.length_mm, r.width_mm) }))
}
