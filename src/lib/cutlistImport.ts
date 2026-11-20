// Parse a cut list pasted from a spreadsheet or loaded from a CSV file.
//
// Real-world sheets are messy, so this is forgiving:
// - title/address rows above the header are skipped (the header is the first
//   row, possibly merged with the row below it, that names length and width)
// - two-row headers like "Afmetingen" over "L | B | D" are merged
// - tab, semicolon (Belgian/Dutch Excel) or comma separators, quoted fields,
//   decimal commas
// - English or Dutch column names, single letters (L/B/D) as a last resort
// - a material written once at the top of a group applies to the rows below it
//   until an empty row; lines like "2500X1250" or "6 platen" under it are ignored
// - thickness falls back to the "18 MM" in the material name
// - a grain column with "B" (breedte) means grain runs along the width, so
//   length and width are swapped

export interface ImportedPart {
  row: number
  name: string
  material: string // as written in the sheet ('' if none)
  thickness_mm: number | null
  length_mm: number
  width_mm: number
  qty: number
  grain_matters: boolean | null // null = sheet doesn't say
  notes: string
  /** Marked ALT: an alternative to the row(s) with the same reference code. */
  alt: boolean
  /** First word of the reference (e.g. "WB-B"), used to pair ALT rows with their original. */
  code: string
}

export interface ImportResult {
  parts: ImportedPart[]
  problems: string[]
  headerRow: number
  /** The sheet has a RESTEN row: the shop sends the offcuts home. */
  offcutsComeHome: boolean
}

type Field = 'name' | 'code' | 'material' | 'thickness' | 'length' | 'width' | 'qty' | 'grain' | 'notes'

// Ordered by preference: full words first, so "LENGTE" wins over an edge-banding "L" column.
const ALIASES: Record<Field, string[]> = {
  name: ['name', 'part name', 'part', 'description', 'referentie', 'omschrijving', 'naam', 'onderdeel', 'label', 'ref', 'reference'],
  code: ['code', 'nr', 'nummer'],
  material: ['material', 'materiaal', 'material name', 'plaat'],
  thickness: ['thickness', 'cutting thickness', 'final thickness', 'dikte', 'thick', 'd', 't'],
  length: ['length', 'cutting length', 'final length', 'lengte', 'l'],
  width: ['width', 'cutting width', 'final width', 'breedte', 'b', 'w'],
  qty: ['qty', 'quantity', 'count', 'pcs', 'pieces', 'aantal', 'stuks', 'st', '#', 'n'],
  grain: ['grain', 'grain matters', 'grain direction', 'nerf', 'draad', 'draadrichting'],
  notes: ['notes', 'note', 'opmerkingen', 'opmerking', 'remarks', 'comments'],
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[:.]$/, '').replace(/\s*\(.*\)\s*$/, '').replace(/[_-]+/g, ' ')

function splitRows(text: string, sep: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === sep) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

function detectSeparator(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join('\n')
  const counts = ['\t', ';', ','].map((s) => [s, sample.split(s).length - 1] as const).sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

const num = (s: string) => {
  const t = s.trim().replace(/\s|mm/gi, '').replace(',', '.')
  return t === '' ? NaN : Number(t)
}
const isEmptyRow = (r: string[]) => r.every((f) => !f.trim())
const hasNumber = (r: string[]) => r.some((f) => f.trim() !== '' && !isNaN(num(f)))

function findColumns(header: string[]): Record<Field, number> {
  const h = header.map(norm)
  const used = new Set<number>()
  const out = {} as Record<Field, number>
  // Assign multi-letter matches first so single letters can't steal a column.
  const fields = Object.keys(ALIASES) as Field[]
  for (const pass of [0, 1]) {
    for (const f of fields) {
      if (out[f] !== undefined && out[f] >= 0) continue
      out[f] = -1
      for (const alias of ALIASES[f]) {
        if ((alias.length === 1) !== (pass === 1)) continue
        const i = h.findIndex((x, j) => x === alias && !used.has(j))
        if (i >= 0) { out[f] = i; used.add(i); break }
      }
    }
  }
  return out
}

// Material-column lines that describe the sheet, not a material: "2500X1250", "1 plaat", "6 platen".
const isSheetInfo = (s: string) => /^\d+\s*[x×*]\s*\d+$/i.test(s.trim()) || /^\d+\s*(plaat|platen|sheets?|stuks?)$/i.test(s.trim())
const thicknessFromMaterial = (s: string) => {
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*mm\b/i)
  return m ? num(m[1]) : null
}

export function parseCutList(text: string): ImportResult {
  const rows = splitRows(text, detectSeparator(text))
  const problems: string[] = []

  // Find the header: a row (optionally merged with the next, label-only row) naming length and width.
  let headerRow = -1, cols = {} as Record<Field, number>
  for (let i = 0; i < Math.min(rows.length, 30) && headerRow < 0; i++) {
    if (isEmptyRow(rows[i])) continue
    const candidates = [rows[i]]
    const next = rows[i + 1]
    if (next && !isEmptyRow(next) && !hasNumber(next)) {
      candidates.unshift(rows[i].map((c, j) => (next[j]?.trim() ? next[j] : c)).concat(next.slice(rows[i].length)))
    }
    for (const [k, cand] of candidates.entries()) {
      const c = findColumns(cand)
      if (c.length >= 0 && c.width >= 0) {
        cols = c
        headerRow = candidates.length === 2 && k === 0 ? i + 1 : i
        break
      }
    }
  }
  if (headerRow < 0) {
    return { offcutsComeHome: false, parts: [], problems: ["Couldn't find a header row with length and width columns (e.g. Length/Width, Lengte/Breedte or L/B)."], headerRow }
  }

  const parts: ImportedPart[] = []
  let groupMaterial = ''
  let skippedNoSize = 0
  let offcutsComeHome = false
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i]
    if (isEmptyRow(r)) { groupMaterial = ''; continue }
    const get = (f: Field) => (cols[f] >= 0 ? (r[cols[f]] ?? '').trim() : '')

    if (/^resten\b/i.test(get('name'))) { offcutsComeHome = true; continue }

    const mat = get('material')
    if (mat && !isSheetInfo(mat)) groupMaterial = mat

    let length = num(get('length')), width = num(get('width'))
    if (!(length > 0) || !(width > 0)) {
      if (get('name') || get('code')) skippedNoSize++
      continue
    }

    const grainText = get('grain').toLowerCase()
    let grain: boolean | null = cols.grain >= 0 ? grainText !== '' && !/^(no|n|nee|false|0|none|-)$/.test(grainText) : null
    if (/^(b|w|breedte|width)$/.test(grainText)) { [length, width] = [width, length]; grain = true }

    const t = num(get('thickness'))
    const name = [get('code'), get('name')].filter(Boolean).join(' ') || `Part ${parts.length + 1}`
    parts.push({
      row: i + 1,
      name,
      material: groupMaterial,
      thickness_mm: t > 0 ? t : thicknessFromMaterial(groupMaterial),
      length_mm: length,
      width_mm: width,
      qty: Math.max(1, Math.round(num(get('qty')) || 1)),
      grain_matters: grain,
      notes: /^alt$/i.test(get('notes')) ? '' : get('notes'),
      alt: /^alt\b/i.test(get('notes')),
      code: name.split(/\s+/)[0],
    })
  }
  if (skippedNoSize) problems.push(`${skippedNoSize} row${skippedNoSize === 1 ? '' : 's'} without a length and width were skipped.`)
  return { parts, problems, headerRow: headerRow + 1, offcutsComeHome }
}

export const TEMPLATE_CSV = 'Name;Material;Thickness;Length;Width;Qty;Grain;Notes\nSide panel;Birch plywood;18;600;300;2;yes;\nShelf;Birch plywood;18;564;280;3;yes;\nBack;MDF;6;600;564;1;no;groove 6 mm\n'
