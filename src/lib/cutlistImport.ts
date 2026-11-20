// Parse a cut list pasted from a spreadsheet or loaded from a CSV file.
// Handles tab, semicolon (Belgian/Dutch Excel) and comma separators, quoted
// fields, decimal commas, and English or Dutch column names. Exports from
// OpenCutList and CutList Optimizer use similar headers.

export interface ImportedPart {
  name: string
  material: string
  thickness_mm: number
  length_mm: number
  width_mm: number
  qty: number
  grain_matters: boolean
}

export interface ImportResult {
  parts: ImportedPart[]
  problems: string[]
  missing: { material: boolean; thickness: boolean }
}

const ALIASES: Record<keyof ImportedPart, string[]> = {
  name: ['name', 'part', 'part name', 'description', 'label', 'naam', 'onderdeel', 'omschrijving'],
  material: ['material', 'materiaal', 'material name'],
  thickness_mm: ['thickness', 't', 'thick', 'cutting thickness', 'final thickness', 'dikte'],
  length_mm: ['length', 'l', 'cutting length', 'final length', 'lengte'],
  width_mm: ['width', 'w', 'cutting width', 'final width', 'breedte'],
  qty: ['qty', 'quantity', 'count', 'pcs', 'pieces', 'aantal', 'stuks'],
  grain_matters: ['grain', 'grain matters', 'grain direction', 'nerf', 'draad'],
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '').replace(/[_-]+/g, ' ')

function splitRows(text: string, sep: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f.trim()))
}

function detectSeparator(firstLine: string): string {
  const counts = ['\t', ';', ','].map((s) => [s, firstLine.split(s).length - 1] as const)
  return counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ','
}

const num = (s: string) => Number(s.trim().replace(/\s|mm/gi, '').replace(',', '.'))
const yes = (s: string) => !/^(no|n|nee|false|0|none|-)$/i.test(s.trim())

export function parseCutList(text: string, defaults: { material: string; thickness_mm: number; grain_matters: boolean }): ImportResult {
  const sep = detectSeparator(text.split(/\r?\n/)[0] ?? '')
  const rows = splitRows(text, sep)
  const problems: string[] = []
  if (rows.length < 2) return { parts: [], problems: ['Need a header row and at least one part.'], missing: { material: true, thickness: true } }

  const header = rows[0].map(norm)
  const col = Object.fromEntries(
    (Object.keys(ALIASES) as (keyof ImportedPart)[]).map((k) => [k, header.findIndex((h) => ALIASES[k].includes(h))]),
  ) as Record<keyof ImportedPart, number>
  if (col.length_mm < 0 || col.width_mm < 0) {
    return { parts: [], problems: [`Couldn't find length and width columns. Found: ${rows[0].join(', ')}`], missing: { material: true, thickness: true } }
  }

  const parts: ImportedPart[] = []
  rows.slice(1).forEach((r, i) => {
    const get = (k: keyof ImportedPart) => (col[k] >= 0 ? (r[col[k]] ?? '').trim() : '')
    const length = num(get('length_mm')), width = num(get('width_mm'))
    const thickness = get('thickness_mm') ? num(get('thickness_mm')) : defaults.thickness_mm
    if (!(length > 0) || !(width > 0) || !(thickness > 0)) {
      problems.push(`Row ${i + 2} skipped: size not readable (${r.join(' | ')})`)
      return
    }
    parts.push({
      name: get('name') || `Part ${i + 1}`,
      material: get('material') || defaults.material,
      thickness_mm: thickness,
      length_mm: length,
      width_mm: width,
      qty: Math.max(1, Math.round(num(get('qty')) || 1)),
      grain_matters: get('grain_matters') ? yes(get('grain_matters')) : defaults.grain_matters,
    })
  })
  return { parts, problems, missing: { material: col.material < 0, thickness: col.thickness_mm < 0 } }
}

export const TEMPLATE_CSV = 'Name;Material;Thickness;Length;Width;Qty;Grain\nSide panel;Birch plywood;18;600;300;2;yes\nShelf;Birch plywood;18;564;280;3;yes\nBack;MDF;6;600;564;1;no\n'
