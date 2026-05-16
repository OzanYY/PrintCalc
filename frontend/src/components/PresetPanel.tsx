import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Printer, Package, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import { printersAPI, type Printer as PrinterType } from '@/api/printers'
import { materialsAPI, type Material } from '@/api/materials'
import { toast } from 'sonner'

interface AppliedPresets {
    printerId: number | null
    materialId: number | null
}

interface PresetPanelProps {
    onApplyPrinter: (printer: PrinterType) => void
    onApplyMaterial: (material: Material) => void
}

export function PresetPanel({ onApplyPrinter, onApplyMaterial }: PresetPanelProps) {
    const [printers, setPrinters]           = useState<PrinterType[]>([])
    const [materials, setMaterials]         = useState<Material[]>([])
    const [loadingPrinters, setLoadingPrinters] = useState(true)
    const [loadingMaterials, setLoadingMaterials] = useState(true)

    const [selectedPrinterId, setSelectedPrinterId] = useState<string>('')
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')

    // Отслеживаем, что уже было применено (для индикаторов)
    const [applied, setApplied] = useState<AppliedPresets>({ printerId: null, materialId: null })

    // ── Загрузка ─────────────────────────────────────────────────────────────
    const loadPrinters = useCallback(async () => {
        setLoadingPrinters(true)
        try {
            const res = await printersAPI.getAll()
            const list = res.data.data
            setPrinters(list)
            // Предвыбираем принтер по умолчанию
            const def = list.find(p => p.is_default)
            if (def) setSelectedPrinterId(String(def.id))
        } catch {
            toast.error('Не удалось загрузить принтеры', { position: 'top-center' })
        } finally {
            setLoadingPrinters(false)
        }
    }, [])

    const loadMaterials = useCallback(async () => {
        setLoadingMaterials(true)
        try {
            const res = await materialsAPI.getAll()
            const list = res.data.data
            setMaterials(list)
            // Предвыбираем материал по умолчанию
            const def = list.find(m => m.is_default)
            if (def) setSelectedMaterialId(String(def.id))
        } catch {
            toast.error('Не удалось загрузить материалы', { position: 'top-center' })
        } finally {
            setLoadingMaterials(false)
        }
    }, [])

    useEffect(() => {
        loadPrinters()
        loadMaterials()
    }, [loadPrinters, loadMaterials])

    // ── Применение принтера ───────────────────────────────────────────────────
    const handleApplyPrinter = () => {
        const printer = printers.find(p => String(p.id) === selectedPrinterId)
        if (!printer) return
        onApplyPrinter(printer)
        setApplied(prev => ({ ...prev, printerId: printer.id }))
        toast.success(
            `Параметры принтера «${printer.name}» применены`,
            { position: 'top-center', duration: 2500 }
        )
    }

    // ── Применение материала ──────────────────────────────────────────────────
    const handleApplyMaterial = () => {
        const material = materials.find(m => String(m.id) === selectedMaterialId)
        if (!material) return
        onApplyMaterial(material)
        setApplied(prev => ({ ...prev, materialId: material.id }))
        toast.success(
            `Параметры материала «${material.name}» применены`,
            { position: 'top-center', duration: 2500 }
        )
    }

    // Сбрасываем «применено», когда пользователь выбирает другой пресет
    const handlePrinterChange = (val: string) => {
        setSelectedPrinterId(val)
        setApplied(prev => ({ ...prev, printerId: null }))
    }

    const handleMaterialChange = (val: string) => {
        setSelectedMaterialId(val)
        setApplied(prev => ({ ...prev, materialId: null }))
    }

    const selectedPrinter = printers.find(p => String(p.id) === selectedPrinterId)
    const selectedMaterial = materials.find(m => String(m.id) === selectedMaterialId)

    const printerApplied  = applied.printerId  !== null && applied.printerId  === selectedPrinter?.id
    const materialApplied = applied.materialId !== null && applied.materialId === selectedMaterial?.id

    return (
        <div className="rounded-xl border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Подставить из пресетов
            </p>

            {/* ── Принтер ────────────────────────────────────────────────── */}
            <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                    Принтер
                </div>

                {loadingPrinters ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Загрузка...
                    </div>
                ) : printers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Нет сохранённых принтеров.{' '}
                        <a href="/printers" className="underline underline-offset-2 hover:text-foreground">
                            Добавить
                        </a>
                    </p>
                ) : (
                    <>
                        <Select value={selectedPrinterId} onValueChange={handlePrinterChange}>
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Выберите принтер" />
                            </SelectTrigger>
                            <SelectContent>
                                {printers.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        <span className="flex items-center gap-2">
                                            {p.name}
                                            {p.is_default && (
                                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                    основной
                                                </Badge>
                                            )}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Превью параметров выбранного принтера */}
                        {selectedPrinter && (
                            <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
                                <p>Мощность: <span className="text-foreground font-medium">{selectedPrinter.power_consumption} Вт</span></p>
                                <p>Стоимость: <span className="text-foreground font-medium">{selectedPrinter.purchase_price.toLocaleString('ru-RU')} ₽</span></p>
                                <p>Ресурс: <span className="text-foreground font-medium">{selectedPrinter.print_lifetime_hours.toLocaleString('ru-RU')} ч</span></p>
                            </div>
                        )}

                        <Button
                            size="sm"
                            variant={printerApplied ? 'secondary' : 'outline'}
                            className={`w-full h-7 text-xs gap-1.5 ${printerApplied ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' : ''}`}
                            disabled={!selectedPrinterId || printerApplied}
                            onClick={handleApplyPrinter}
                        >
                            {printerApplied ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Применено
                                </>
                            ) : (
                                <>
                                    Применить
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </>
                            )}
                        </Button>
                    </>
                )}
            </div>

            <Separator />

            {/* ── Материал ───────────────────────────────────────────────── */}
            <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    Филамент / Материал
                </div>

                {loadingMaterials ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Загрузка...
                    </div>
                ) : materials.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Нет сохранённых материалов.{' '}
                        <a href="/materials" className="underline underline-offset-2 hover:text-foreground">
                            Добавить
                        </a>
                    </p>
                ) : (
                    <>
                        <Select value={selectedMaterialId} onValueChange={handleMaterialChange}>
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Выберите материал" />
                            </SelectTrigger>
                            <SelectContent>
                                {materials.map(m => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        <span className="flex items-center gap-2">
                                            {m.name}
                                            {m.color && (
                                                <span
                                                    className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                                                    style={{ background: m.color }}
                                                />
                                            )}
                                            {m.is_default && (
                                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                    основной
                                                </Badge>
                                            )}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Превью параметров выбранного материала */}
                        {selectedMaterial && (
                            <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
                                <p>Цена: <span className="text-foreground font-medium">{selectedMaterial.price_per_kg.toLocaleString('ru-RU')} ₽/кг</span></p>
                                {selectedMaterial.brand && (
                                    <p>Бренд: <span className="text-foreground font-medium">{selectedMaterial.brand}</span></p>
                                )}
                                <p>Тип: <span className="text-foreground font-medium uppercase">{selectedMaterial.type}</span></p>
                            </div>
                        )}

                        <Button
                            size="sm"
                            variant={materialApplied ? 'secondary' : 'outline'}
                            className={`w-full h-7 text-xs gap-1.5 ${materialApplied ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-50 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' : ''}`}
                            disabled={!selectedMaterialId || materialApplied}
                            onClick={handleApplyMaterial}
                        >
                            {materialApplied ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Применено
                                </>
                            ) : (
                                <>
                                    Применить
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </>
                            )}
                        </Button>
                    </>
                )}
            </div>
        </div>
    )
}