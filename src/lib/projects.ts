import { supabase } from './supabase'
import type { Part, Project } from './types'

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data as Project[]
}

export async function getProject(id: string): Promise<{ project: Project; parts: Part[] }> {
  const [p, parts] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('project_parts').select('*').eq('project_id', id).order('created_at'),
  ])
  if (p.error) throw p.error
  if (parts.error) throw parts.error
  return { project: p.data as Project, parts: parts.data as Part[] }
}

export async function createProject(name: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').insert({ name }).select().single()
  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, changes: Partial<Project>): Promise<void> {
  const { error } = await supabase.from('projects').update(changes).eq('id', id)
  if (error) throw error
}

export async function addParts(parts: Omit<Part, 'id' | 'piece_id'>[]): Promise<Part[]> {
  // Older databases may not have the notes column yet (migration 0005); retry without it.
  const first = await supabase.from('project_parts').insert(parts).select()
  if (first.error && /notes/.test(first.error.message)) {
    parts = parts.map(({ notes: _n, ...p }) => { void _n; return p })
  } else {
    if (first.error) throw first.error
    return first.data as Part[]
  }
  const { data, error } = await supabase.from('project_parts').insert(parts).select()
  if (error) throw error
  return data as Part[]
}

export async function deletePart(id: string): Promise<void> {
  const { error } = await supabase.from('project_parts').delete().eq('id', id)
  if (error) throw error
}

export async function assignPiece(partId: string, pieceId: string | null): Promise<void> {
  const { error } = await supabase.from('project_parts').update({ piece_id: pieceId }).eq('id', partId)
  if (error) throw error
}
