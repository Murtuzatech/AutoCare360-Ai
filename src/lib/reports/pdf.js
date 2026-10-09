import { jsPDF } from 'jspdf'
import * as AT from 'jspdf-autotable'

// Resolve the plugin function across bundler/CJS interop differences
const autoTable = [AT.autoTable, AT.default?.autoTable, AT.default?.default, AT.default].find((f) => typeof f === 'function')

const BRAND = [15, 110, 122]
const INK = [20, 26, 33]
const MUTED = [95, 107, 120]
const M = 14

// Standard PDF fonts only cover Latin-1; replace anything else instead of printing garbage.
const clean = (t) => String(t ?? '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014\u2212]/g, '-')
  .replace(/[\u2022\u00b7]/g, '-').replace(/\u2026/g, '...').replace(/\u00a0/g, ' ')
  .replace(/[^\t\n\r\x20-\x7E\u00A1-\u00FF]/g, '?')

export function renderPdf(model) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  doc.setFillColor(...BRAND).rect(0, 0, W, 26, 'F')
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(17).text(clean(model.title), M, 12)
  doc.setFont('helvetica', 'normal').setFontSize(9.5).text(clean(model.subtitle), M, 19.5, { maxWidth: W - M * 2 })

  let y = 36
  const ensure = (need) => { if (y + need > H - 20) { doc.addPage(); y = 20 } }
  const heading = (text) => {
    ensure(18)
    doc.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(12).text(clean(text), M, y)
    y += 4
  }
  const common = { margin: { left: M, right: M, top: 20, bottom: 20 }, styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: INK, overflow: 'linebreak' } }

  for (const s of model.sections) {
    if (s.type === 'note') {
      ensure(16)
      doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(...MUTED)
      const lines = doc.splitTextToSize(clean(s.text), W - M * 2)
      doc.text(lines, M, y); y += lines.length * 4 + 6
      continue
    }
    heading(s.heading)
    if (s.type === 'text') {
      doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(...MUTED)
      const lines = doc.splitTextToSize(clean(s.text), W - M * 2)
      ensure(lines.length * 4.5 + 4)
      doc.text(lines, M, y + 3)
      y += lines.length * 4.5 + 10
    } else if (s.type === 'kv') {
      autoTable(doc, { ...common, startY: y, theme: 'plain', body: s.rows.map(([k, v]) => [clean(k), clean(v)]),
        columnStyles: { 0: { cellWidth: 48, textColor: MUTED }, 1: { fontStyle: 'bold' } } })
      y = doc.lastAutoTable.finalY + 9
    } else {
      const columnStyles = {}
      Object.entries(s.align || {}).forEach(([i, a]) => { columnStyles[i] = { halign: a } })
      autoTable(doc, { ...common, startY: y, head: [s.columns.map(clean)], body: s.rows.map((r) => r.map(clean)), columnStyles,
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [244, 247, 249] } })
      y = doc.lastAutoTable.finalY + 9
    }
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(216, 223, 230).line(M, H - 14, W - M, H - 14)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    doc.text('AutoCare 360. Based on records entered by the vehicle owner; not an inspection or professional diagnosis.', M, H - 9)
    doc.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: 'right' })
  }
  return doc
}

export const downloadReport = (model) => renderPdf(model).save(model.filename)
