import JSZip from 'jszip'

export interface Parse3mfResult {
  modelWeight?: number     // г (если support_weight известен → total - support, иначе total)
  supportWeight?: number   // г (если найдено отдельно)
  totalWeight?: number     // г (всегда total из слайсера)
  printTime?: number       // мин
  slicer?: string
}

// "1h 30m 15s" / "1h30m" / "90m 5s"
function parseTimeString(s: string): number | undefined {
  const h = s.match(/(\d+)\s*h/i)
  const m = s.match(/(\d+)\s*m(?!s)/i)
  const sec = s.match(/(\d+)\s*s/i)
  const total =
    (h ? parseInt(h[1]) * 60 : 0) +
    (m ? parseInt(m[1]) : 0) +
    (sec ? Math.round(parseInt(sec[1]) / 60) : 0)
  return total > 0 ? total : undefined
}

function parseGcode(text: string): Partial<Parse3mfResult> {
  const r: Partial<Parse3mfResult> = {}

  // PrusaSlicer / SuperSlicer
  const tw = text.match(/;\s*total filament used \[g\]\s*=\s*([\d.]+)/i)
  if (tw) r.totalWeight = parseFloat(tw[1])

  const sw = text.match(/;\s*support filament used \[g\]\s*=\s*([\d.]+)/i)
  if (sw) r.supportWeight = parseFloat(sw[1])

  const pt = text.match(/;\s*estimated printing time.*?=\s*(.+)/i)
  if (pt) r.printTime = parseTimeString(pt[1].trim())

  // Cura
  if (!r.printTime) {
    const ct = text.match(/;PRINT\.TIME:(\d+)/i)
    if (ct) r.printTime = Math.round(parseInt(ct[1]) / 60)
  }
  if (!r.totalWeight) {
    const cw = text.match(/;FILAMENT_WEIGHT[\d[\]]*:([\d.]+)/i)
    if (cw) r.totalWeight = parseFloat(cw[1])
  }

  return r
}

export async function parse3mf(file: File): Promise<Parse3mfResult> {
  const zip = await JSZip.loadAsync(file)
  const result: Parse3mfResult = {}

  // ── Bambu Studio / OrcaSlicer ──────────────────────────────────────────────
  const sliceFile = zip.file('Metadata/slice_info.config')
  if (sliceFile) {
    try {
      const json = JSON.parse(await sliceFile.async('text'))
      const plate = Array.isArray(json.plate) ? json.plate[0] : undefined
      if (plate) {
        if (typeof plate.weight === 'number' && plate.weight > 0)
          result.totalWeight = plate.weight
        if (typeof plate.support_weight === 'number' && plate.support_weight >= 0)
          result.supportWeight = plate.support_weight
        if (typeof plate.prediction === 'number' && plate.prediction > 0)
          result.printTime = Math.round(plate.prediction / 60)
        result.slicer = 'Bambu Studio / OrcaSlicer'
      }
    } catch { /* ignore */ }
  }

  // ── GCode комментарии (PrusaSlicer, SuperSlicer, Cura) ────────────────────
  if (!result.totalWeight || !result.printTime) {
    const gcodeNames = Object.keys(zip.files).filter(n => /\.gcode$/i.test(n))
    for (const name of gcodeNames.slice(0, 2)) {
      try {
        const buf = await zip.file(name)!.async('uint8array')
        // Читаем только первые 64 КБ — комментарии всегда в начале gcode
        const chunk = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 65536))
        const g = parseGcode(chunk)
        if (!result.totalWeight && g.totalWeight) result.totalWeight = g.totalWeight
        if (!result.supportWeight && g.supportWeight) result.supportWeight = g.supportWeight
        if (!result.printTime && g.printTime) result.printTime = g.printTime
        if (!result.slicer) result.slicer = 'GCode'
      } catch { /* ignore */ }
    }
  }

  // ── Вывести modelWeight ────────────────────────────────────────────────────
  if (result.totalWeight !== undefined) {
    if (result.supportWeight !== undefined) {
      result.modelWeight = Math.max(0, parseFloat((result.totalWeight - result.supportWeight).toFixed(2)))
    } else {
      result.modelWeight = result.totalWeight
    }
  }

  return result
}
