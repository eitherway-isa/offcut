import { useMemo, useState } from 'react'
import { addParts } from '../lib/projects'
import { parseCutList, TEMPLATE_CSV } from '../lib/cutlistImport'

export function ImportParts({ projectId, onAdded }: { projectId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [material, setMaterial] = useState('')
  const [thickness, setThickness] = useState('18')
  const [grain, setGrain] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = useMemo(
    () => (text.trim() ? parseCutList(text, { material: material.trim(), thickness_mm: Number(thickness), grain_matters: grain }) : null),
    [text, material, thickness, grain],
  )
  const total = result?.parts.reduce((n, p) => n + p.qty, 0) ?? 0
  const needsMaterial = !!result?.missing.material && !material.trim()

  async function loadFile(file: File) {
    if (/\.xlsx?$/i.test(file.name)) {
      setError('Excel files can\'t be read directly yet. In Excel, select the cells and paste them below, or save as CSV.')
      return
    }
    setError(null)
    setText(await file.text())
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
    if (!result) return
    setBusy(true)
    setError(null)
    try {
      await addParts(result.parts.flatMap(({ qty, ...p }) =>
        Array.from({ length: qty }, (_, i) => ({ ...p, project_id: projectId, name: qty > 1 ? `${p.name} ${i + 1}` : p.name }))))
      setText('')
      setOpen(false)
      onAdded()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return <button className="ghost" onClick={() => setOpen(true)}>Import cut list (CSV or paste from Excel)</button>

  return (
    <div className="card stack">
      <div className="row spread">
        <h2>Import cut list</h2>
        <button className="small ghost" onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="muted">
        Copy the cells from Excel or Google Sheets (including the header row) and paste them below, or choose a CSV file.
        Columns it understands: Name, Material, Thickness, Length, Width, Qty, Grain. Only Length and Width are required.{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate() }}><u>Download a template</u></a>.
      </p>
      <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
      <textarea rows={6} placeholder={'Name\tMaterial\tThickness\tLength\tWidth\tQty\nSide\tBirch plywood\t18\t600\t300\t2'} value={text} onChange={(e) => setText(e.target.value)} />
      {result && (result.missing.material || result.missing.thickness) && (
        <div className="grid2">
          {result.missing.material && <label>Material for all parts<input list="materials" value={material} onChange={(e) => setMaterial(e.target.value)} /></label>}
          {result.missing.thickness && <label>Thickness for all parts (mm)<input inputMode="decimal" value={thickness} onChange={(e) => setThickness(e.target.value)} /></label>}
        </div>
      )}
      {result && <label className="check"><input type="checkbox" checked={grain} onChange={(e) => setGrain(e.target.checked)} />Grain matters (when there's no Grain column)</label>}
      {result?.problems.map((p) => <p key={p} className="error">{p}</p>)}
      {result && result.parts.length > 0 && (
        <table className="preview">
          <thead><tr><th>Name</th><th>Material</th><th>T</th><th>L</th><th>W</th><th>Qty</th><th>Grain</th></tr></thead>
          <tbody>
            {result.parts.map((p, i) => (
              <tr key={i}><td>{p.name}</td><td>{p.material || <span className="error">?</span>}</td><td>{p.thickness_mm}</td><td>{p.length_mm}</td><td>{p.width_mm}</td><td>{p.qty}</td><td>{p.grain_matters ? 'yes' : 'no'}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {result && result.parts.length > 0 && (
        <button disabled={busy || needsMaterial} onClick={importAll}>
          {needsMaterial ? 'Fill in a material first' : busy ? 'Importing…' : `Import ${total} part${total === 1 ? '' : 's'}`}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
