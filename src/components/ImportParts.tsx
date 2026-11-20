import { useMemo, useState } from 'react'
import { addParts } from '../lib/projects'
import { parseCutList, TEMPLATE_CSV } from '../lib/cutlistImport'

const NO_MATERIAL = '(no material in sheet)'

export function ImportParts({ projectId, onAdded, stockMaterials }: { projectId: string; onAdded: () => void; stockMaterials: string[] }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [thickness, setThickness] = useState('18')
  const [grain, setGrain] = useState(true)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = useMemo(() => (text.trim() ? parseCutList(text) : null), [text])
  const parts = useMemo(() => result?.parts ?? [], [result])
  const sheetMaterials = useMemo(() => [...new Set(parts.map((p) => p.material || NO_MATERIAL))], [parts])
  const needsThickness = parts.some((p) => p.thickness_mm === null)
  const needsGrain = parts.some((p) => p.grain_matters === null)

  // Default mapping: keep the sheet's name if it already matches stock (ignoring case), else leave as written.
  const mapped = (m: string) => {
    if (mapping[m] !== undefined) return mapping[m]
    if (m === NO_MATERIAL) return ''
    return stockMaterials.find((s) => s.toLowerCase() === m.toLowerCase()) ?? m
  }
  const chosen = parts.filter((p) => !excluded.has(p.row))
  const total = chosen.reduce((n, p) => n + p.qty, 0)
  const missingMaterial = sheetMaterials.some((m) => !mapped(m).trim() && chosen.some((p) => (p.material || NO_MATERIAL) === m))

  function setText2(t: string) {
    setText(t)
    setMapping({})
    setExcluded(new Set())
  }

  async function loadFile(file: File) {
    if (/\.xlsx?$/i.test(file.name)) {
      setError("Excel files can't be read directly yet. Select the cells in Excel and paste them below, or save as CSV.")
      return
    }
    setError(null)
    setText2(await file.text())
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'cutlist-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importAll() {
    setBusy(true)
    setError(null)
    try {
      await addParts(chosen.flatMap((p) => {
        const base = {
          project_id: projectId,
          material: mapped(p.material || NO_MATERIAL).trim(),
          thickness_mm: p.thickness_mm ?? Number(thickness),
          length_mm: p.length_mm,
          width_mm: p.width_mm,
          grain_matters: p.grain_matters ?? grain,
          notes: p.notes || null,
        }
        return Array.from({ length: p.qty }, (_, i) => ({ ...base, name: p.qty > 1 ? `${p.name} ${i + 1}` : p.name }))
      }))
      setText2('')
      setOpen(false)
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <button className="ghost" onClick={() => setOpen(true)}>Import cut list (CSV or paste from a spreadsheet)</button>

  return (
    <div className="card stack">
      <div className="row spread">
        <h2>Import cut list</h2>
        <button className="small ghost" onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="muted">
        Select the whole sheet in Excel or Google Sheets (title rows are fine), copy, and paste below. Or choose a CSV file.
        It recognises columns like Materiaal, Aantal/#, Lengte/L, Breedte/B, Dikte/D, Nerf, Referentie and Opmerkingen, in English too.{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate() }}><u>Download a template</u></a>.
      </p>
      <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
      <textarea rows={5} placeholder="Paste here" value={text} onChange={(e) => setText2(e.target.value)} />
      {result?.problems.map((p) => <p key={p} className="muted">{p}</p>)}

      {parts.length > 0 && (
        <>
          <h2>Materials</h2>
          <p className="muted">Match each material in the sheet to the name you use in your stock, so "Match from stock" can find offcuts.</p>
          <div className="stack">
            {sheetMaterials.map((m) => (
              <label key={m} className="map-row">
                <span>{m}</span>
                <input list="stock-materials" value={mapped(m)} placeholder="Material" onChange={(e) => setMapping((s) => ({ ...s, [m]: e.target.value }))} />
              </label>
            ))}
            <datalist id="stock-materials">{stockMaterials.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          {(needsThickness || needsGrain) && (
            <div className="grid2">
              {needsThickness && <label>Thickness where the sheet has none (mm)<input inputMode="decimal" value={thickness} onChange={(e) => setThickness(e.target.value)} /></label>}
              {needsGrain && <label className="check"><input type="checkbox" checked={grain} onChange={(e) => setGrain(e.target.checked)} />Grain matters where the sheet doesn't say</label>}
            </div>
          )}
          <div className="preview-wrap">
            <table className="preview">
              <thead><tr><th></th><th>Name</th><th>Material</th><th>T</th><th>L</th><th>W</th><th>Qty</th><th>Grain</th><th>Notes</th></tr></thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.row} className={excluded.has(p.row) ? 'excluded' : ''}>
                    <td><input type="checkbox" checked={!excluded.has(p.row)} onChange={() => setExcluded((s) => { const n = new Set(s); if (n.has(p.row)) n.delete(p.row); else n.add(p.row); return n })} /></td>
                    <td>{p.name}</td>
                    <td>{mapped(p.material || NO_MATERIAL) || <span className="error">?</span>}</td>
                    <td>{p.thickness_mm ?? thickness}</td>
                    <td>{p.length_mm}</td>
                    <td>{p.width_mm}</td>
                    <td>{p.qty}</td>
                    <td>{(p.grain_matters ?? grain) ? 'yes' : 'no'}</td>
                    <td className="notes-cell">{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button disabled={busy || missingMaterial || total === 0} onClick={importAll}>
            {missingMaterial ? 'Fill in every material first' : busy ? 'Importing…' : `Import ${total} part${total === 1 ? '' : 's'}`}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
