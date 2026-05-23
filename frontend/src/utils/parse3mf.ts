import JSZip from 'jszip'

export interface Parse3mfResult {
  modelWeight?: number     // г (если support_weight известен → total - support, иначе total)
  supportWeight?: number   // г (если найдено отдельно)
  totalWeight?: number     // г (всегда total из слайсера)
  printTime?: number       // мин
  slicer?: string
  /** true — файл опознан как проект OrcaSlicer/BambuStudio без данных нарезки */
  isUnslicedProject?: boolean
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
    const rawText = await sliceFile.async('text')

    // Новые версии OrcaSlicer сохраняют slice_info.config как XML, не JSON
    const isXml = rawText.trimStart().startsWith('<')

    if (!isXml) {
      // Старый формат BambuStudio: JSON
      try {
        const json = JSON.parse(rawText)
        // plate может быть массивом или объектом в разных версиях
        const plate = Array.isArray(json.plate) ? json.plate[0] : (json.plate ?? undefined)
        if (plate) {
          const w = parseFloat(plate.weight)
          if (!isNaN(w) && w > 0) result.totalWeight = w

          const sw = parseFloat(plate.support_weight)
          if (!isNaN(sw) && sw >= 0) result.supportWeight = sw

          const pred = parseFloat(plate.prediction)
          if (!isNaN(pred) && pred > 0) result.printTime = Math.round(pred / 60)

          if (result.totalWeight === undefined && Array.isArray(plate.filament)) {
            const total = (plate.filament as any[]).reduce((sum, f) => {
              const g = parseFloat(f.used_g)
              return sum + (isNaN(g) ? 0 : g)
            }, 0)
            if (total > 0) result.totalWeight = parseFloat(total.toFixed(2))
          }

          result.slicer = 'Bambu Studio / OrcaSlicer'
        }
      } catch { /* ignore */ }
    } else {
      // Новый XML формат OrcaSlicer 2.x
      try {
        const doc = new DOMParser().parseFromString(rawText, 'text/xml')
        const getMeta = (parent: Element, key: string) =>
          parent.querySelector(`metadata[key="${key}"]`)?.getAttribute('value') ?? undefined

        let foundData = false
        doc.querySelectorAll('plate').forEach(plate => {
          const w = parseFloat(getMeta(plate, 'weight') ?? '')
          if (!isNaN(w) && w > 0) { result.totalWeight = w; foundData = true }

          const sw = parseFloat(getMeta(plate, 'support_weight') ?? '')
          if (!isNaN(sw) && sw >= 0) { result.supportWeight = sw; foundData = true }

          const pred = parseFloat(getMeta(plate, 'prediction') ?? '')
          if (!isNaN(pred) && pred > 0) { result.printTime = Math.round(pred / 60); foundData = true }

          if (!foundData) {
            // Суммируем из filament элементов
            let total = 0
            plate.querySelectorAll('filament').forEach(f => {
              const g = parseFloat(f.getAttribute('used_g') ?? '')
              if (!isNaN(g)) total += g
            })
            if (total > 0) { result.totalWeight = parseFloat(total.toFixed(2)); foundData = true }
          }
        })

        if (foundData) result.slicer = 'OrcaSlicer'
      } catch { /* ignore */ }

      // Если XML есть, но данных нарезки нет — это проект без нарезки
      if (result.totalWeight === undefined && result.printTime === undefined) {
        const hasProjectConfig = !!zip.file('Metadata/project_settings.config')
        const hasGcode = Object.keys(zip.files).some(n => /\.gcode$/i.test(n))
        if (hasProjectConfig && !hasGcode) {
          result.isUnslicedProject = true
          result.slicer = 'OrcaSlicer'
        }
      }
    }
  }

  // ── GCode комментарии (PrusaSlicer, SuperSlicer, Cura) ────────────────────
  if (!result.totalWeight || !result.printTime) {
    const gcodeNames = Object.keys(zip.files).filter(n => /\.gcode$/i.test(n))
    for (const name of gcodeNames.slice(0, 2)) {
      try {
        const buf = await zip.file(name)!.async('uint8array')
        const dec = new TextDecoder('utf-8', { fatal: false })
        // Начало файла (PrusaSlicer, SuperSlicer, Cura)
        const head = dec.decode(buf.slice(0, 65536))
        const g = parseGcode(head)
        // Конец файла (OrcaSlicer, BambuStudio размещают метаданные в хвосте)
        if (!g.totalWeight || !g.printTime) {
          const tail = dec.decode(buf.slice(Math.max(0, buf.length - 65536)))
          const gt = parseGcode(tail)
          if (!g.totalWeight && gt.totalWeight) g.totalWeight = gt.totalWeight
          if (!g.supportWeight && gt.supportWeight) g.supportWeight = gt.supportWeight
          if (!g.printTime && gt.printTime) g.printTime = gt.printTime
        }
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
