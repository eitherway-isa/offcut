import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { listPieces, markLabelsPrinted, pieceUrl } from '../lib/pieces'
import type { Piece } from '../lib/types'

// Common A4 sticker sheets. Sizes in mm.
const SHEETS = {
  '3x8': { name: '3 × 8 (70 × 37 mm, e.g. Avery 3474 / Herma 4453)', cols: 3, rows: 8, w: 70, h: 37, top: 0.5, left: 0, gapX: 0, gapY: 0 },
  '3x7': { name: '3 × 7 (63.5 × 38.1 mm, e.g. Avery L7160)', cols: 3, rows: 7, w: 63.5, h: 38.1, top: 15.15, left: 7.2, gapX: 2.5, gapY: 0 },
  '2x7': { name: '2 × 7 (99.1 × 38.1 mm, e.g. Avery L7163)', cols: 2, rows: 7, w: 99.1, h: 38.1, top: 15.15, left: 4.65, gapX: 2.5, gapY: 0 },
} as const
type SheetKey = keyof typeof SHEETS

export function Labels() {
  const [pieces, setPieces] = useState<Piece[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sheetKey, setSheetKey] = useState<SheetKey>('3x8')
  const [skip, setSkip] = useState(0) // stickers already used on a partial sheet
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPieces().then((all) => {
      const available = all.filter((p) => p.status !== 'used')
      setPieces(available)
      setSelected(new Set(available.filter((p) => !p.label_printed_at).map((p) => p.id)))
    }, (e) => setError(e.message))
  }, [])

  const sheet = SHEETS[sheetKey]
  const chosen = useMemo(() => (pieces ?? []).filter((p) => selected.has(p.id)), [pieces, selected])
  const perPage = sheet.cols * sheet.rows
  const cells: (Piece | null)[] = [...Array(skip).fill(null), ...chosen]
  const pages: (Piece | null)[][] = []
  for (let i = 0; i < cells.length; i += perPage) pages.push(cells.slice(i, i + perPage))

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function print() {
    window.print()
    try {
      await markLabelsPrinted(chosen.map((p) => p.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (error) return <p className="error">{error}</p>
  if (!pieces) return <p>Loading…</p>

  return (
    <div className="stack">
      <div className="stack no-print">
        <h1>Labels</h1>
        <div className="card stack">
          <label>
            Sticker sheet
            <select value={sheetKey} onChange={(e) => setSheetKey(e.target.value as SheetKey)}>
              {Object.entries(SHEETS).map(([k, s]) => <option key={k} value={k}>{s.name}</option>)}
            </select>
          </label>
          <label>
            Skip stickers already used on the first sheet
            <input type="number" min={0} max={perPage - 1} value={skip} onChange={(e) => setSkip(Math.max(0, Number(e.target.value)))} />
          </label>
          <button onClick={print} disabled={chosen.length === 0}>Print {chosen.length} label{chosen.length === 1 ? '' : 's'}</button>
          <p className="muted">Print at 100% scale ("Actual size"), with no headers or footers.</p>
        </div>
        <ul className="plain card">
          {pieces.map((p) => (
            <li key={p.id}>
              <label className="check">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span><strong>{p.label}</strong> {p.material} {p.length_mm}×{p.width_mm}×{p.thickness_mm}{p.label_printed_at ? ' · printed' : ''}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="print-only">
        {pages.map((page, i) => (
          <div key={i} className="sheet" style={{ paddingTop: `${sheet.top}mm`, paddingLeft: `${sheet.left}mm`,
            gridTemplateColumns: `repeat(${sheet.cols}, ${sheet.w}mm)`, gridAutoRows: `${sheet.h}mm`,
            columnGap: `${sheet.gapX}mm`, rowGap: `${sheet.gapY}mm` }}>
            {page.map((p, j) => (
              <div key={j} className="sticker">
                {p && (
                  <>
                    <QRCodeSVG value={pieceUrl(p.label)} size={256} style={{ height: `${sheet.h - 8}mm`, width: 'auto' }} />
                    <div className="sticker-text">
                      <div className="sticker-id">{p.label}</div>
                      <div>{p.material}</div>
                      <div>{p.length_mm} × {p.width_mm}</div>
                      <div>{p.thickness_mm} mm{p.grain !== 'none' ? ` · grain ${p.grain === 'length' ? '↔' : '↕'}` : ''}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
