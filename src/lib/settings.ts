import { supabase } from './supabase'

export interface Settings { kerf_mm: number }
export const DEFAULT_SETTINGS: Settings = { kerf_mm: 3 }

/** Falls back to defaults if the settings table doesn't exist yet (migration 0006). */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('user_settings').select('kerf_mm').maybeSingle()
  if (error || !data) return DEFAULT_SETTINGS
  return { kerf_mm: Number(data.kerf_mm) }
}

export async function saveSettings(s: Settings): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('user_settings').upsert({ owner_id: u.user?.id, ...s })
  if (error) throw error
}
