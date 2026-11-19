export type PieceKind = 'sheet' | 'board' | 'offcut'
export type Grain = 'length' | 'width' | 'none'
export type PieceStatus = 'available' | 'reserved' | 'used' | 'discarded'

export interface Piece {
  id: string
  label: string
  kind: PieceKind
  material: string
  thickness_mm: number
  length_mm: number
  width_mm: number
  grain: Grain
  location: string | null
  status: PieceStatus
  notes: string | null
  source_project_id: string | null
  label_printed_at: string | null
  created_at: string
  updated_at: string
}

export type NewPiece = Pick<Piece, 'kind' | 'material' | 'thickness_mm' | 'length_mm' | 'width_mm' | 'grain'> &
  Partial<Pick<Piece, 'location' | 'notes' | 'source_project_id'>>
