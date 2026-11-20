import type { Part, Piece } from './types'
import { materialMatches } from './materials'

type PartSpec = Pick<Part, 'material' | 'thickness_mm' | 'length_mm' | 'width_mm' | 'grain_matters'>

const KIND_ORDER = { offcut: 0, board: 1, sheet: 2 } as const

/** Can this part be cut from this piece (one part per piece, no nesting)? */
export function fits(part: PartSpec, piece: Piece): boolean {
  if (!materialMatches(part.material, piece.material)) return false
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
 * Is a leftover worth keeping? Sheet goods: at least 45 wide (a hanging cleat) and 250 long,
 * or at least 0.05 m², or a strip of 30+ wide (spacer) when 600+ long.
 */
export function isKeepable(length_mm: number, width_mm: number): boolean {
  const l = Math.max(length_mm, width_mm), w = Math.min(length_mm, width_mm)
  return (w >= 45 && l >= 250) || l * w >= 50_000 || (w >= 30 && l >= 600)
}

export interface LeftoverSuggestion { length_mm: number; width_mm: number; grain: Piece['grain']; keepable: boolean }

/**
 * Leftovers after cutting a part from a corner of a piece: first a rip along the full
 * length, then a crosscut of the remaining strip. Each cut costs one kerf.
 */
export function suggestLeftovers(part: PartSpec, piece: Piece, kerf = 3): LeftoverSuggestion[] {
  const rotated = !(part.length_mm <= piece.length_mm && part.width_mm <= piece.width_mm) ||
    (part.grain_matters && piece.grain === 'width')
  const pl = rotated ? part.width_mm : part.length_mm
  const pw = rotated ? part.length_mm : part.width_mm
  const rects = [
    { a: piece.length_mm, b: piece.width_mm - pw - kerf },
    { a: piece.length_mm - pl - kerf, b: pw },
  ]
  return rects
    .filter((r) => r.a > 0 && r.b > 0)
    .map((r) => {
      // Store the longer side as length; grain follows the piece's length axis ("a").
      const swap = r.b > r.a
      const grain: Piece['grain'] = piece.grain === 'none' ? 'none' : swap === (piece.grain === 'length') ? 'width' : 'length'
      return {
        length_mm: Math.round(Math.max(r.a, r.b) * 10) / 10,
        width_mm: Math.round(Math.min(r.a, r.b) * 10) / 10,
        grain,
        keepable: isKeepable(r.a, r.b),
      }
    })
}
