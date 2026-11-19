import { supabase } from './supabase'
import type { NewPiece, Piece } from './types'

export async function listPieces(): Promise<Piece[]> {
  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .neq('status', 'discarded')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Piece[]
}

export async function getPiece(label: string): Promise<Piece | null> {
  const { data, error } = await supabase.from('pieces').select('*').eq('label', label).maybeSingle()
  if (error) throw error
  return data as Piece | null
}

export async function addPiece(piece: NewPiece): Promise<Piece> {
  const { data, error } = await supabase.from('pieces').insert(piece).select().single()
  if (error) throw error
  return data as Piece
}

export async function updatePiece(id: string, changes: Partial<Piece>): Promise<void> {
  const { error } = await supabase
    .from('pieces')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export function formatSize(p: Pick<Piece, 'length_mm' | 'width_mm' | 'thickness_mm'>): string {
  return `${p.length_mm} × ${p.width_mm} × ${p.thickness_mm} mm`
}
