import type { Part } from './types'

// "Still to buy" list in the Zaaglijst atelier layout, so it can go straight into a shop order.
// Parts with the same material, thickness, size, grain and notes are merged into one row.
// Names like "Shelf 1", "Shelf 2" (from a quantity) collapse back to "Shelf".

const baseName = (n: string) => n.replace(/\s+\d+$/, '')

export function toBuyRows(parts: Part[]): string[][] {
  const unassigned = parts.filter((p) => !p.piece_id)
  const groups = new Map<string, { label: string; rows: Map<string, { p: Part; qty: number; names: string[] }> }>()
  for (const p of unassigned) {
    const label = `${p.material.toUpperCase()} ${p.thickness_mm} MM`
    if (!groups.has(label)) groups.set(label, { label, rows: new Map() })
    const key = [p.length_mm, p.width_mm, p.grain_matters, p.notes ?? ''].join('|')
    const g = groups.get(label)!.rows
    const existing = g.get(key)
    if (existing) { existing.qty++; existing.names.push(p.name) }
    else g.set(key, { p, qty: 1, names: [p.name] })
  }
  const out: string[][] = [
    ['', '', '', '', '', 'VK', 'AK', 'Li', 'Re', '', ''],
    ['MATERIAAL', 'NERF', 'AANTAL', 'LENGTE', 'BREEDTE', 'L', 'L', 'B', 'B', 'REFERENTIE', 'OPMERKINGEN'],
  ]
  let first = true
  for (const { label, rows } of groups.values()) {
    if (!first) out.push([])
    first = false
    let i = 0
    for (const { p, qty, names } of rows.values()) {
      const name = names.length === 1 ? names[0] : [...new Set(names.map(baseName))].join(', ')
      out.push([i++ === 0 ? label : '', p.grain_matters ? 'L' : '', String(qty), String(p.length_mm), String(p.width_mm), '', '', '', '', name, p.notes ?? ''])
    }
  }
  return out
}

const csvCell = (c: string) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)
export const toCsv = (rows: string[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n'
export const toTsv = (rows: string[][]) => rows.map((r) => r.map((c) => c.replace(/[\t\n]/g, ' ')).join('\t')).join('\n')
