import JSZip from 'jszip'

export interface Parse3mfResult {
  modelWeight?: number     // г — только модель (без поддержек)
  supportWeight?: number   // г — только поддержки
  totalWeight?: number     // г — model + support
  printTime?: number       // мин
  filamentPrice?: number   // ₽/кг — цена филамента (filament_cost)
  timeCost?: number        // ₽/ч — стоимость машино-часа (time_cost)
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

  // OrcaSlicer/BambuStudio: settings dump in gcode tail
  // filament_cost = price per kg (NOT "filament cost" with space = calculated spend)
  const fc = text.match(/^;\s*filament_cost\s*=\s*([\d.]+)/m)
  if (fc) { const v = parseFloat(fc[1]); if (v > 0) r.filamentPrice = v }

  const tc = text.match(/^;\s*time_cost\s*=\s*([\d.]+)/m)
  if (tc) { const v = parseFloat(tc[1]); if (v > 0) r.timeCost = v }

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
        const plate = Array.isArray(json.plate) ? json.plate[0] : (json.plate ?? undefined)
        if (plate) {
          // weight = model filament (вес только модели, без поддержек)
          const mw = parseFloat(plate.weight)
          if (!isNaN(mw) && mw > 0) result.modelWeight = mw

          const sw = parseFloat(plate.support_weight)
          if (!isNaN(sw) && sw >= 0) result.supportWeight = sw

          const pred = parseFloat(plate.prediction)
          if (!isNaN(pred) && pred > 0) result.printTime = Math.round(pred / 60)

          // Фоллбэк: суммируем из filament[], если plate.weight отсутствует
          if (result.modelWeight === undefined && Array.isArray(plate.filament)) {
            const total = (plate.filament as any[]).reduce((sum: number, f: any) => {
              const g = parseFloat(f.used_g)
              return sum + (isNaN(g) ? 0 : g)
            }, 0)
            if (total > 0) result.modelWeight = parseFloat(total.toFixed(2))
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
          // weight = model filament (вес только модели, без поддержек)
          const mw = parseFloat(getMeta(plate, 'weight') ?? '')
          if (!isNaN(mw) && mw > 0) { result.modelWeight = mw; foundData = true }

          const sw = parseFloat(getMeta(plate, 'support_weight') ?? '')
          if (!isNaN(sw) && sw >= 0) { result.supportWeight = sw; foundData = true }

          const pred = parseFloat(getMeta(plate, 'prediction') ?? '')
          if (!isNaN(pred) && pred > 0) { result.printTime = Math.round(pred / 60); foundData = true }

          // Фоллбэк: суммируем из <filament used_g="...">
          if (!foundData) {
            let total = 0
            plate.querySelectorAll('filament').forEach(f => {
              const g = parseFloat(f.getAttribute('used_g') ?? '')
              if (!isNaN(g)) total += g
            })
            if (total > 0) { result.modelWeight = parseFloat(total.toFixed(2)); foundData = true }
          }
        })

        if (foundData) result.slicer = 'OrcaSlicer'
      } catch { /* ignore */ }

      // Если XML есть, но данных нарезки нет — это проект без нарезки
      if (result.modelWeight === undefined && result.printTime === undefined) {
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
  if (!result.modelWeight || !result.printTime || !result.filamentPrice) {
    const gcodeNames = Object.keys(zip.files).filter(n => /\.gcode$/i.test(n))
    for (const name of gcodeNames.slice(0, 2)) {
      try {
        const buf = await zip.file(name)!.async('uint8array')
        const dec = new TextDecoder('utf-8', { fatal: false })
        const head = dec.decode(buf.slice(0, 65536))
        const g = parseGcode(head)
        // Конец файла (OrcaSlicer, BambuStudio размещают метаданные в хвосте)
        if (!g.totalWeight || !g.printTime || !g.filamentPrice) {
          const tail = dec.decode(buf.slice(Math.max(0, buf.length - 65536)))
          const gt = parseGcode(tail)
          if (!g.totalWeight && gt.totalWeight) g.totalWeight = gt.totalWeight
          if (!g.supportWeight && gt.supportWeight) g.supportWeight = gt.supportWeight
          if (!g.printTime && gt.printTime) g.printTime = gt.printTime
          if (!g.filamentPrice && gt.filamentPrice) g.filamentPrice = gt.filamentPrice
          if (!g.timeCost && gt.timeCost) g.timeCost = gt.timeCost
        }
        // В gcode total = model + support; раскладываем по полям
        if (!result.modelWeight && g.totalWeight) {
          if (g.supportWeight) {
            result.modelWeight = Math.max(0, parseFloat((g.totalWeight - g.supportWeight).toFixed(2)))
            result.supportWeight = g.supportWeight
          } else {
            result.modelWeight = g.totalWeight
          }
        }
        if (!result.printTime && g.printTime) result.printTime = g.printTime
        if (!result.filamentPrice && g.filamentPrice) result.filamentPrice = g.filamentPrice
        if (!result.timeCost && g.timeCost) result.timeCost = g.timeCost
        if (!result.slicer) result.slicer = 'GCode'
      } catch { /* ignore */ }
    }
  }

  // ── project_settings.config — cost params (OrcaSlicer/BambuStudio) ───────
  if (result.filamentPrice === undefined || result.timeCost === undefined) {
    const psFile = zip.file('Metadata/project_settings.config')
    if (psFile) {
      try {
        const ps = JSON.parse(await psFile.async('text'))
        if (result.filamentPrice === undefined) {
          const fc = Array.isArray(ps.filament_cost)
            ? parseFloat(ps.filament_cost[0])
            : parseFloat(ps.filament_cost)
          if (!isNaN(fc) && fc > 0) result.filamentPrice = fc
        }
        if (result.timeCost === undefined) {
          const tc = parseFloat(ps.time_cost)
          if (!isNaN(tc) && tc > 0) result.timeCost = tc
        }
      } catch { /* ignore */ }
    }
  }

  // ── totalWeight = model + support ─────────────────────────────────────────
  if (result.modelWeight !== undefined) {
    result.totalWeight = parseFloat(
      (result.modelWeight + (result.supportWeight ?? 0)).toFixed(2)
    )
  }

  return result
}
