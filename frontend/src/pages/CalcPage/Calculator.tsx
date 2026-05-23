import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import { Calculator, Package, Zap, Cpu, User, Percent, Loader2, Tag as TagIco, CalendarDays, CheckCircle, XCircle, Plus, History, RotateCcw, X, ArrowLeftRight, FileUp } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { calculationAPI, type CalculationParams, type CalculationResult } from "@/api/calculator"
import { ordersAPI, buildCreateOrderData } from "@/api/orders"
import { tagsAPI } from "@/api/tags"
import { OrderClientField } from "@/components/orders/OrderClientField"
import { OrderDeadlineField } from "@/components/orders/OrderDeadlineField"
import { PresetSmartInput, type PresetOption } from '@/components/ui/preset-smart-input'
import { SmartInput } from '@/components/ui/smart-input'
import { useCalculator } from "@/context/CalculatorContext"
import { useAuth } from "@/context/AuthContext"
import { printersAPI } from "@/api/printers"
import { materialsAPI, CATEGORY_UNIT_CONFIG } from "@/api/materials"
import { parse3mf, type Parse3mfResult } from '@/utils/parse3mf'

// ─── Выбор тегов при сохранении заказа из калькулятора ────────────────────────

interface CreateTagSelectorProps {
    selectedIds: number[];
    onChange: (ids: number[]) => void;
}

const PRESET_TAG_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#64748b',
];

function CreateTagSelector({ selectedIds, onChange }: CreateTagSelectorProps) {
    const [allTags, setAllTags] = useState<{ id: number; name: string; color: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#6366f1');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        tagsAPI.getAll().then(r => setAllTags(r.data.data));
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setCreating(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleTag = (id: number) =>
        onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

    const handleCreateTag = async () => {
        if (!newName.trim()) return;
        try {
            const r = await tagsAPI.create({ name: newName.trim(), color: newColor });
            const tag = r.data.data;
            setAllTags(prev => [...prev, tag]);
            onChange([...selectedIds, tag.id]);
            setNewName('');
            setCreating(false);
        } catch {
            toast.error('Ошибка создания тега');
        }
    };

    const selectedTags = allTags.filter(t => selectedIds.includes(t.id));

    return (
        <div ref={ref} className="relative">
            <div className="flex flex-wrap gap-1 min-h-[28px]">
                {selectedTags.map(tag => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                    >
                        {tag.name}
                        <button onClick={e => { e.stopPropagation(); toggleTag(tag.id); }} className="hover:opacity-70 ml-0.5">
                            <XCircle className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setOpen(v => !v)}
                    type="button"
                >
                    <TagIco className="h-3 w-3 mr-1" />
                    {selectedTags.length === 0 ? 'Добавить теги' : <Plus className="h-3 w-3" />}
                </Button>
            </div>

            {open && (
                <div className="absolute z-50 mt-1 w-64 rounded-lg border bg-popover shadow-md">
                    {!creating ? (
                        <>
                            <div className="max-h-48 overflow-y-auto p-1">
                                {allTags.length === 0 && (
                                    <div className="py-2 text-center text-sm text-muted-foreground">Нет тегов</div>
                                )}
                                {allTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm"
                                        type="button"
                                    >
                                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                        <span className="flex-1 text-left">{tag.name}</span>
                                        {selectedIds.includes(tag.id) && <CheckCircle className="h-3 w-3 text-primary" />}
                                    </button>
                                ))}
                            </div>
                            <div className="p-2 border-t">
                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setCreating(true)} type="button">
                                    <Plus className="h-4 w-4 mr-2" />Создать тег
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 space-y-3">
                            <div className="font-medium text-sm">Новый тег</div>
                            <Input
                                placeholder="Название"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                                autoFocus
                            />
                            <div>
                                <div className="text-xs text-muted-foreground mb-1.5">Цвет</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRESET_TAG_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewColor(c)}
                                            className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                                            style={{ backgroundColor: c, outline: newColor === c ? '2px solid currentColor' : 'none', outlineOffset: '2px' }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleCreateTag} disabled={!newName.trim()} type="button">Создать</Button>
                                <Button size="sm" variant="ghost" onClick={() => setCreating(false)} type="button">Отмена</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── История расчётов ──────────────────────────────────────────────────────────

interface HistoryEntry {
    id: string
    timestamp: string
    materials: { modelWeight: number; supportWeight: number; filamentPrice: number }
    electricity: { powerConsumption: number; printTime: number; electricityPrice: number }
    depreciation: { printerCost: number; printResource: number }
    labor: { hourlyRate: number; workTime: number }
    additional: { additionalExpensesPercent: number; marginPercent: number }
    selectedPresets: Record<string, number | string | null>
    result: CalculationResult
}

const HISTORY_KEY = 'calculator_history'
const HISTORY_MAX = 20

// ─── Строка таблицы параметров сравнения ──────────────────────────────────────

function CompareRow({ label, unit, aVal, bVal, onA, onB, step = '1' }: {
    label: string; unit: string; step?: string
    aVal: number; bVal: number
    onA: (v: number) => void; onB: (v: number) => void
}) {
    const diff = Math.abs(aVal - bVal) > 0.0001
    return (
        <tr className={diff ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
            <td className="py-1.5 pr-3 text-sm text-muted-foreground whitespace-nowrap">{label}</td>
            <td className="py-1.5 px-2">
                <div className="relative">
                    <SmartInput min="0" step={step} value={aVal} onChange={onA} className="h-8 text-sm pr-10" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{unit}</span>
                </div>
            </td>
            <td className="py-1.5 px-2">
                <div className={`relative ${diff ? 'ring-1 ring-amber-400/60 rounded-md' : ''}`}>
                    <SmartInput min="0" step={step} value={bVal} onChange={onB} className="h-8 text-sm pr-10" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{unit}</span>
                </div>
            </td>
        </tr>
    )
}

// ─── Строка таблицы результатов сравнения ─────────────────────────────────────

function ResultCompareRow({ label, aRaw, bRaw, aFmt, bFmt, bold = false }: {
    label: string; aRaw: number; bRaw: number; aFmt: string; bFmt: string; bold?: boolean
}) {
    const diff = bRaw - aRaw
    const same = Math.abs(diff) < 0.005
    const pct = aRaw !== 0 ? (diff / Math.abs(aRaw)) * 100 : 0
    return (
        <tr className={`border-b last:border-0 ${!same ? 'bg-muted/30' : ''}`}>
            <td className={`py-2 pr-4 text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</td>
            <td className={`py-2 px-2 text-right text-sm ${bold ? 'font-semibold' : ''}`}>{aFmt}</td>
            <td className={`py-2 px-2 text-right text-sm ${bold ? 'font-semibold' : ''}`}>{bFmt}</td>
            <td className={`py-2 pl-2 text-right text-xs tabular-nums ${same ? 'text-muted-foreground' : diff > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-blue-500 dark:text-blue-400'}`}>
                {same ? '—' : `${diff > 0 ? '+' : ''}${pct.toFixed(1)}%`}
            </td>
        </tr>
    )
}

// Генерирует базовое имя заказа по текущей дате и времени
function generateOrderName(): string {
    const now = new Date()
    const date = now.toLocaleDateString('ru-RU')           // 27.04.2026
    const time = now.toLocaleTimeString('ru-RU', {        // 14:35
        hour: '2-digit',
        minute: '2-digit',
    })
    return `Заказ от ${date} ${time}`
}

export default function Calc() {
    const {
        materials,
        setMaterials,
        electricity,
        setElectricity,
        depreciation,
        setDepreciation,
        labor,
        setLabor,
        additional,
        setAdditional,
        hasCalculated,
        setHasCalculated,
        selectedPresets,
        setSelectedPreset,
        setSelectedPrinter,
        resetToDefaults,
        resetAll,
    } = useCalculator()

    const { user } = useAuth()

    // ─── Пресеты (принтеры и материалы) ──────────────────────────────────────
    const [printerPresets, setPrinterPresets] = useState<{
        power: PresetOption[]
        cost: PresetOption[]
        hours: PresetOption[]
    }>({ power: [], cost: [], hours: [] })

    const [materialPresets, setMaterialPresets] = useState<PresetOption[]>([])
    const [materialsData, setMaterialsData] = useState<import('@/api/materials').Material[]>([])
    const materialsDataRef = useRef<import('@/api/materials').Material[]>([])

    const loadPresets = useCallback(async () => {
        try {
            const [pRes, mRes] = await Promise.all([
                printersAPI.getAll(),
                materialsAPI.getAll(),
            ])
            const printers = pRes.data.data
            const materials = mRes.data.data

            setPrinterPresets({
                power: printers.map(p => ({
                    id: p.id,
                    label: p.name,
                    value: Number(p.power_consumption),
                    sublabel: p.model ?? p.type,
                    isDefault: p.is_default,
                })),
                cost: printers.map(p => ({
                    id: p.id,
                    label: p.name,
                    value: Number(p.purchase_price),
                    sublabel: p.model ?? p.type,
                    isDefault: p.is_default,
                })),
                hours: printers.map(p => ({
                    id: p.id,
                    label: p.name,
                    value: Number(p.print_lifetime_hours),
                    sublabel: p.model ?? p.type,
                    isDefault: p.is_default,
                })),
            })

            setMaterialsData(materials)
            materialsDataRef.current = materials
            setMaterialPresets(materials.map(m => ({
                id: m.id,
                label: m.name,
                value: Number(m.price_per_kg),
                sublabel: [m.brand, m.type.toUpperCase()].filter(Boolean).join(' · '),
                color: m.color ?? '',
                isDefault: m.is_default,
            })))

            // ── Автоприменение дефолтных пресетов при первом входе ────────────
            // Применяем только если пользователь ещё ничего не выбирал (null).
            const defaultPrinter = printers.find(p => p.is_default)
            const defaultMaterial = materials.find(m => m.is_default)

            // Читаем актуальный selectedPresets напрямую из localStorage,
            // чтобы не зависеть от замыкания на стейт (он ещё не обновился).
            const savedPresets = localStorage.getItem('calculator_selectedPresets')
            const currentPresets = savedPresets ? JSON.parse(savedPresets) : {}

            if (defaultPrinter && currentPresets.powerConsumption == null) {
                setSelectedPrinter(defaultPrinter.id)
                setElectricity(e => {
                    const updated = { ...e, powerConsumption: Number(defaultPrinter.power_consumption) }
                    localStorage.setItem('calculator_electricity', JSON.stringify(updated))
                    return updated
                })
                setDepreciation(d => {
                    const updated = {
                        ...d,
                        printerCost: Number(defaultPrinter.purchase_price),
                        printResource: Number(defaultPrinter.print_lifetime_hours),
                    }
                    localStorage.setItem('calculator_depreciation', JSON.stringify(updated))
                    return updated
                })
            }

            if (defaultMaterial && currentPresets.filamentPrice == null) {
                setSelectedPreset('filamentPrice', defaultMaterial.id)
                setMaterials(m => {
                    const updated = { ...m, filamentPrice: Number(defaultMaterial.price_per_kg) }
                    localStorage.setItem('calculator_materials', JSON.stringify(updated))
                    return updated
                })
            }
        } catch {
            // Тихая ошибка — пресеты необязательны
        }
    }, [setSelectedPrinter, setSelectedPreset, setElectricity, setDepreciation, setMaterials])

    useEffect(() => {
        if (user) loadPresets()
    }, [user, loadPresets])

    /**
     * Когда пресеты загружены и уже выбран принтер (из localStorage) —
     * синхронизируем все три значения из пресета.
     * Это нужно при первом рендере после перезагрузки страницы.
     */
    useEffect(() => {
        const printerId = selectedPresets.powerConsumption
        if (printerId == null) return

        const power = printerPresets.power.find(p => p.id === printerId)
        const cost = printerPresets.cost.find(p => p.id === printerId)
        const hours = printerPresets.hours.find(p => p.id === printerId)

        if (power) handleElectricityChange('powerConsumption', power.value)
        if (cost) handleDepreciationChange('printerCost', cost.value)
        if (hours) handleDepreciationChange('printResource', hours.value)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [printerPresets])

    const [isLoading, setIsLoading] = useState(false)
    const [serverError, setServerError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [results, setResults] = useState<CalculationResult | null>(null)

    // ─── Состояние модального окна сохранения ────────────────────────────────
    const [saveDialogOpen, setSaveDialogOpen] = useState(false)
    const [stockWarning, setStockWarning] = useState<{
        type: 'impossible' | 'low'
        message: string
        detail: string
    } | null>(null)
    const [orderTitle, setOrderTitle] = useState('')      // доп. заголовок от пользователя
    const [saveNotes, setSaveNotes] = useState('')
    const [saveClientId, setSaveClientId] = useState<number | null>(null)
    const [saveClientName, setSaveClientName] = useState<string | null>(null)
    const [saveClientPhone, setSaveClientPhone] = useState<string | null>(null)
    const [saveClientEmail, setSaveClientEmail] = useState<string | null>(null)
    const [saveDeadline, setSaveDeadline] = useState<string | null>(null)
    const [saveTagIds, setSaveTagIds] = useState<number[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // ─── История расчётов ─────────────────────────────────────────────────────
    const [history, setHistory] = useState<HistoryEntry[]>(() => {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
    })
    const [historyOpen, setHistoryOpen] = useState(false)

    // ─── Режим сравнения ──────────────────────────────────────────────────────
    const [compareActive, setCompareActive] = useState(false)
    const [compareParams, setCompareParams] = useState({
        materials:    { modelWeight: 100, supportWeight: 20, filamentPrice: 1500 },
        electricity:  { powerConsumption: 200, printTime: 300, electricityPrice: 6.5 },
        depreciation: { printerCost: 50000, printResource: 5000 },
        labor:        { hourlyRate: 500, workTime: 60 },
        additional:   { additionalExpensesPercent: 15, marginPercent: 30 },
    })
    const [compareResults, setCompareResults] = useState<CalculationResult | null>(null)

    // ─── Импорт .3mf ─────────────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [import3mfResult, setImport3mfResult] = useState<Parse3mfResult | null>(null)
    const [import3mfFileName, setImport3mfFileName] = useState('')
    const [import3mfLoading, setImport3mfLoading] = useState(false)
    const [import3mfOpen, setImport3mfOpen] = useState(false)
    const [applyModelWeight, setApplyModelWeight] = useState(true)
    const [applySupportWeight, setApplySupportWeight] = useState(true)
    const [applyPrintTime, setApplyPrintTime] = useState(true)
    const [import3mfModelWEdit, setImport3mfModelWEdit] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const dragCounterRef = useRef(0)

    // При монтировании восстанавливаем результаты из localStorage
    useEffect(() => {
        if (hasCalculated) {
            const savedResults = localStorage.getItem('calculator_results')
            if (savedResults) {
                try {
                    setResults(JSON.parse(savedResults))
                } catch (error) {
                    console.error('Error loading saved results:', error)
                }
            }
        }
    }, [hasCalculated])

    useEffect(() => {
        if (serverError) {
            toast.error(serverError, { duration: 5000 })
        }
    }, [serverError])

    useEffect(() => {
        if (successMessage) {
            toast.success(successMessage, { duration: 3000 })
        }
    }, [successMessage])

    useEffect(() => {
        if (isLoading) {
            toast.loading("Выполняется расчет...", { id: "calculation-loading" })
        } else {
            toast.dismiss("calculation-loading")
        }
    }, [isLoading])

    // ─── Обработчики полей (Вариант А) ───────────────────────────────────────
    const handleMaterialsChange = (field: string, value: number) => setMaterials(prev => ({ ...prev, [field]: value }))
    const handleElectricityChange = (field: string, value: number) => setElectricity(prev => ({ ...prev, [field]: value }))
    const handleDepreciationChange = (field: string, value: number) => setDepreciation(prev => ({ ...prev, [field]: value }))
    const handleLaborChange = (field: string, value: number) => setLabor(prev => ({ ...prev, [field]: value }))
    const handleAdditionalChange = (field: string, value: number) => setAdditional(prev => ({ ...prev, [field]: value }))

    // ─── Обработчики полей (Вариант Б) ───────────────────────────────────────
    const handleCompareMat  = (f: string, v: number) => setCompareParams(p => ({ ...p, materials:    { ...p.materials,    [f]: v } }))
    const handleCompareElec = (f: string, v: number) => setCompareParams(p => ({ ...p, electricity:  { ...p.electricity,  [f]: v } }))
    const handleCompareDepr = (f: string, v: number) => setCompareParams(p => ({ ...p, depreciation: { ...p.depreciation, [f]: v } }))
    const handleCompareLab  = (f: string, v: number) => setCompareParams(p => ({ ...p, labor:        { ...p.labor,        [f]: v } }))
    const handleCompareAdd  = (f: string, v: number) => setCompareParams(p => ({ ...p, additional:   { ...p.additional,   [f]: v } }))

    /**
     * При выборе пресета принтера в любом из полей — синхронизируем все три поля
     * (powerConsumption, printerCost, printResource) сразу из пресетов.
     */
    const handlePrinterPresetChange = (
        id: number | string | null,
    ) => {
        // Синхронизируем selectedPreset для всех трёх полей принтера
        setSelectedPrinter(id)

        if (id == null) return

        // Находим принтер в каждом массиве пресетов и обновляем все три значения
        const power = printerPresets.power.find(p => p.id === id)
        const cost = printerPresets.cost.find(p => p.id === id)
        const hours = printerPresets.hours.find(p => p.id === id)

        if (power) handleElectricityChange('powerConsumption', power.value)
        if (cost) handleDepreciationChange('printerCost', cost.value)
        if (hours) handleDepreciationChange('printResource', hours.value)
    }

    // ─── Расчёт ───────────────────────────────────────────────────────────────
    const doCalculate = async () => {
        setServerError('')
        setSuccessMessage('')
        setIsLoading(true)

        const requestData: CalculationParams = {
            modelWeight: materials.modelWeight,
            supportWeight: materials.supportWeight,
            filamentPrice: materials.filamentPrice,
            powerConsumption: electricity.powerConsumption,
            printTime: electricity.printTime,
            electricityPrice: electricity.electricityPrice,
            printerCost: depreciation.printerCost,
            printResource: depreciation.printResource,
            hourlyRate: labor.hourlyRate,
            workTime: labor.workTime,
            additionalExpensesPercent: additional.additionalExpensesPercent,
            marginPercent: additional.marginPercent,
        }

        try {
            const response = await calculationAPI.calculate(requestData)

            if (response.data.success && response.data.data) {
                const newResult = response.data.data
                setResults(newResult)
                setHasCalculated(true)
                localStorage.setItem('calculator_results', JSON.stringify(newResult))
                setSuccessMessage('Расчет успешно выполнен!')

                const entry: HistoryEntry = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    materials: { ...materials },
                    electricity: { ...electricity },
                    depreciation: { ...depreciation },
                    labor: { ...labor },
                    additional: { ...additional },
                    selectedPresets: { ...selectedPresets },
                    result: newResult,
                }
                setHistory(prev => {
                    const updated = [entry, ...prev].slice(0, HISTORY_MAX)
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
                    return updated
                })
            } else {
                throw new Error(response.data.error || 'Ошибка при расчете стоимости')
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Произошла ошибка при подключении к серверу'
            setServerError(errorMessage)
            console.error('Calculation error:', err)
        } finally {
            setIsLoading(false)
        }
    }

    // ─── Проверка остатка и запуск расчёта ──────────────────────────────────────
    const calculateCost = () => {

        if (selectedPresets.filamentPrice != null) {
            const mat = materialsDataRef.current.find(m => Number(m.id) === Number(selectedPresets.filamentPrice))
            if (mat) {
                const cfg = CATEGORY_UNIT_CONFIG[mat.category]
                const stock = Number(mat.stock_grams) - Number(mat.reserved_grams)
                const needed = (Number(materials.modelWeight) || 0) + (Number(materials.supportWeight) || 0)
                const spoolW = Number(mat.weight_per_spool_grams) || 1000
                const fmt = (g: number) => cfg.unit === 'ml'
                    ? (g < 1000 ? `${g.toFixed(0)} мл` : `${(g / 1000).toFixed(2)} л`)
                    : (g < 1000 ? `${g.toFixed(0)} г` : `${(g / 1000).toFixed(3)} кг`)

                if (needed > 0 && stock < needed) {
                    setStockWarning({
                        type: 'impossible',
                        message: 'Недостаточно материала',
                        detail: `Для печати нужно ${fmt(needed)}, а на складе доступно только ${fmt(Math.max(0, stock))}. Рекомендуем пополнить остаток.`,
                    })
                    // Информационное предупреждение — расчёт выполняется сразу
                } else if (needed > 0 && stock - needed < spoolW * 0.1) {
                    setStockWarning({
                        type: 'low',
                        message: 'Материал заканчивается',
                        detail: `После печати останется ${fmt(stock - needed)} — менее 10% упаковки. Рекомендуем пополнить склад.`,
                    })
                    // Информационное предупреждение — расчёт выполняется сразу
                } else if (needed === 0 && stock < spoolW * 0.1) {
                    setStockWarning({
                        type: 'low',
                        message: 'Материал заканчивается',
                        detail: `На складе доступно ${fmt(Math.max(0, stock))} — менее 10% упаковки. Рекомендуем пополнить склад.`,
                    })
                    // Информационное предупреждение — расчёт выполняется сразу
                }
            }
        }
        doCalculate()
    }

    // ─── Открытие диалога сохранения ─────────────────────────────────────────
    const openSaveDialog = () => {
        setOrderTitle('')
        setSaveNotes('')
        setSaveClientId(null)
        setSaveClientName(null)
        setSaveClientPhone(null)
        setSaveClientEmail(null)
        setSaveDeadline(null)
        setSaveTagIds([])
        setSaveDialogOpen(true)
    }

    // ─── Сохранение заказа ────────────────────────────────────────────────────
    const handleSaveOrder = async () => {
        if (!results) return

        // Итоговое имя: "Доп. заголовок — Заказ от 27.04.2026 14:35"
        // Если пользователь ничего не ввёл — только автогенерация
        const autoName = generateOrderName()
        const finalName = orderTitle.trim()
            ? `${orderTitle.trim()} — ${autoName}`
            : autoName

        setIsSaving(true)
        try {
            const orderData = buildCreateOrderData(
                finalName,
                results,
                materials,
                electricity,
                depreciation,
                labor,
                additional,
                {
                    printer_id: selectedPresets.powerConsumption != null
                        ? Number(selectedPresets.powerConsumption)
                        : null,
                    material_id: selectedPresets.filamentPrice != null
                        ? Number(selectedPresets.filamentPrice)
                        : null,
                    notes: saveNotes.trim() || undefined,
                },
            )

            const response = await ordersAPI.create({
                ...orderData,
                client_id: saveClientId,
                deadline: saveDeadline,
            })

            if (saveTagIds.length > 0 && response.data.data?.id) {
                try {
                    await tagsAPI.setOrderTags(response.data.data.id, saveTagIds)
                } catch {
                    // теги необязательны, ошибку не показываем
                }
            }

            setSaveDialogOpen(false)
            toast.success('Заказ успешно сохранён', { duration: 3000 })
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при сохранении заказа'
            toast.error(errorMessage, { duration: 5000 })
            console.error('Save order error:', err)
        } finally {
            setIsSaving(false)
        }
    }

    // ─── Режим сравнения ──────────────────────────────────────────────────────
    const activateCompare = () => {
        setCompareParams({
            materials:    { ...materials },
            electricity:  { ...electricity },
            depreciation: { ...depreciation },
            labor:        { ...labor },
            additional:   { ...additional },
        })
        setCompareResults(null)
        setCompareActive(true)
    }

    const calculateBoth = async () => {
        setIsLoading(true)
        const buildReq = (p: typeof compareParams) => ({
            modelWeight: p.materials.modelWeight, supportWeight: p.materials.supportWeight,
            filamentPrice: p.materials.filamentPrice,
            powerConsumption: p.electricity.powerConsumption, printTime: p.electricity.printTime,
            electricityPrice: p.electricity.electricityPrice,
            printerCost: p.depreciation.printerCost, printResource: p.depreciation.printResource,
            hourlyRate: p.labor.hourlyRate, workTime: p.labor.workTime,
            additionalExpensesPercent: p.additional.additionalExpensesPercent,
            marginPercent: p.additional.marginPercent,
        })
        const paramsA = { materials, electricity, depreciation, labor, additional }
        try {
            const [resA, resB] = await Promise.allSettled([
                calculationAPI.calculate(buildReq(paramsA as typeof compareParams)),
                calculationAPI.calculate(buildReq(compareParams)),
            ])
            if (resA.status === 'fulfilled' && resA.value.data.success && resA.value.data.data) {
                const r = resA.value.data.data
                setResults(r)
                setHasCalculated(true)
                localStorage.setItem('calculator_results', JSON.stringify(r))
            }
            if (resB.status === 'fulfilled' && resB.value.data.success && resB.value.data.data) {
                setCompareResults(resB.value.data.data)
            }
            if (resA.status === 'rejected' || resB.status === 'rejected') {
                toast.error('Ошибка при расчёте')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // ─── Восстановление из истории ────────────────────────────────────────────
    const restoreFromHistory = (entry: HistoryEntry) => {
        setMaterials(entry.materials)
        setElectricity(entry.electricity)
        setDepreciation(entry.depreciation)
        setLabor(entry.labor)
        setAdditional(entry.additional)
        setResults(entry.result)
        setHasCalculated(true)
        localStorage.setItem('calculator_results', JSON.stringify(entry.result))
        if (entry.selectedPresets.powerConsumption != null) {
            setSelectedPrinter(entry.selectedPresets.powerConsumption)
        } else {
            setSelectedPrinter(null)
        }
        setSelectedPreset('filamentPrice', entry.selectedPresets.filamentPrice ?? null)
        toast.success('Параметры восстановлены')
    }

    // ─── Сброс ────────────────────────────────────────────────────────────────
    const resetValues = () => {
        resetAll()
        loadPresets()
        setResults(null)
        setServerError('')
        setSuccessMessage('')
        localStorage.removeItem('calculator_results')
        toast.info("Значения сброшены к стандартным", { duration: 2000 })
    }

    const resetFormOnly = () => {
        resetToDefaults()
        toast.info("Параметры сброшены, результаты сохранены", { duration: 2000 })
    }

    // ─── Импорт .3mf ─────────────────────────────────────────────────────────
    const handleImport3mfClick = () => fileInputRef.current?.click()

    const processImport3mf = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.3mf')) {
            toast.error('Поддерживаются только файлы .3mf')
            return
        }
        setImport3mfLoading(true)
        try {
            const parsed = await parse3mf(file)
            if (parsed.modelWeight === undefined && parsed.printTime === undefined) {
                if (parsed.isUnslicedProject) {
                    toast.error(
                        'Файл не содержит данных нарезки. В OrcaSlicer нарежьте модель, затем: Файл → Экспорт → Экспортировать нарезанную плиту',
                        { duration: 8000 }
                    )
                } else {
                    toast.error('Не удалось извлечь данные из файла')
                }
                return
            }
            setImport3mfFileName(file.name)
            setImport3mfResult(parsed)
            setImport3mfModelWEdit(parsed.modelWeight ?? 0)
            setApplyModelWeight(parsed.modelWeight !== undefined)
            setApplySupportWeight(parsed.supportWeight !== undefined)
            setApplyPrintTime(parsed.printTime !== undefined)
            setImport3mfOpen(true)
        } catch {
            toast.error('Ошибка при чтении .3mf файла')
        } finally {
            setImport3mfLoading(false)
        }
    }

    const handleImport3mfFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        processImport3mf(file)
    }

    // Храним актуальную ссылку на processImport3mf, чтобы useEffect не устарел
    const processImport3mfRef = useRef(processImport3mf)
    useEffect(() => { processImport3mfRef.current = processImport3mf })

    useEffect(() => {
        const onDragEnter = (e: DragEvent) => {
            e.preventDefault()
            dragCounterRef.current++
            if (e.dataTransfer?.types.includes('Files')) setIsDragging(true)
        }
        const onDragLeave = (e: DragEvent) => {
            e.preventDefault()
            dragCounterRef.current--
            if (dragCounterRef.current === 0) setIsDragging(false)
        }
        const onDragOver = (e: DragEvent) => { e.preventDefault() }
        const onDrop = (e: DragEvent) => {
            e.preventDefault()
            dragCounterRef.current = 0
            setIsDragging(false)
            const file = e.dataTransfer?.files[0]
            if (file) processImport3mfRef.current(file)
        }
        document.addEventListener('dragenter', onDragEnter)
        document.addEventListener('dragleave', onDragLeave)
        document.addEventListener('dragover', onDragOver)
        document.addEventListener('drop', onDrop)
        return () => {
            document.removeEventListener('dragenter', onDragEnter)
            document.removeEventListener('dragleave', onDragLeave)
            document.removeEventListener('dragover', onDragOver)
            document.removeEventListener('drop', onDrop)
        }
    }, [])

    const confirmImport3mf = () => {
        if (!import3mfResult) return
        const derivedMode = import3mfResult.totalWeight !== undefined && import3mfResult.supportWeight === undefined
        if (derivedMode) {
            if (applyModelWeight) handleMaterialsChange('modelWeight', import3mfModelWEdit)
            if (applySupportWeight) {
                const derived = Math.max(0, parseFloat((import3mfResult.totalWeight! - import3mfModelWEdit).toFixed(2)))
                handleMaterialsChange('supportWeight', derived)
            }
        } else {
            if (applyModelWeight && import3mfResult.modelWeight !== undefined)
                handleMaterialsChange('modelWeight', import3mfResult.modelWeight)
            if (applySupportWeight && import3mfResult.supportWeight !== undefined)
                handleMaterialsChange('supportWeight', import3mfResult.supportWeight)
        }
        if (applyPrintTime && import3mfResult.printTime !== undefined)
            handleElectricityChange('printTime', import3mfResult.printTime)
        setImport3mfOpen(false)
        toast.success('Параметры из .3mf применены')
    }

    const handlePrint = () => {
        if (!results) return

        const printContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <title>Расчёт стоимости печати</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; font-size: 14px; color: #111; padding: 32px; }
        h1 { font-size: 18px; font-weight: 700; margin-bottom: 20px; }
        .section-title { font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
        .weight { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .weight span { font-size: 14px; font-weight: 400; color: #6b7280; margin-left: 6px; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
        .row .label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
        .row .value { font-weight: 600; font-size: 13px; }
        .sub { padding-left: 20px; border-left: 2px solid #e5e7eb; margin: 2px 0 2px 6px; }
        .sub .label { color: #6b7280; font-size: 12px; }
        .sub .value { color: #6b7280; font-size: 12px; }
        .box { background: #f3f4f6; border-radius: 8px; padding: 14px; margin-top: 8px; }
        .box-primary { background: #eff6ff; border-radius: 8px; padding: 14px; }
        .final-price { font-size: 22px; font-weight: 700; color: #2563eb; }
        .per-gram { text-align: center; background: #f9fafb; border-radius: 8px; padding: 10px; margin-top: 10px; }
        .per-gram .pg-label { font-size: 12px; color: #6b7280; }
        .per-gram .pg-value { font-size: 18px; font-weight: 700; }
        .meta { font-size: 11px; color: #9ca3af; margin-top: 24px; }
    </style>
</head>
<body>
    <h1>Расчёт стоимости 3D-печати</h1>

    <div class="section-title">Общий вес</div>
    <div class="weight">
        ${results.totalWeight.grams} г
        <span>(${results.totalWeight.kg} кг)</span>
    </div>

    <hr />

    <div class="section-title">Расходы по категориям</div>

    <div class="row">
        <span class="label">📦 Материалы</span>
        <span class="value">${results.materials.total.formatted}</span>
    </div>
    <div class="sub">
        <div class="row">
            <span class="label">Модель</span>
            <span class="value">${results.materials.model.formatted}</span>
        </div>
        <div class="row">
            <span class="label">Поддержки</span>
            <span class="value">${results.materials.support.formatted}</span>
        </div>
    </div>
    <div class="row">
        <span class="label">⚡ Электричество</span>
        <span class="value">${results.electricity.formatted}</span>
    </div>
    <div class="row">
        <span class="label">🖨 Амортизация</span>
        <span class="value">${results.depreciation.formatted}</span>
    </div>
    <div class="row">
        <span class="label">👤 Оператор</span>
        <span class="value">${results.labor.formatted}</span>
    </div>

    <hr />

    <div class="box">
        <div class="row">
            <span class="label" style="font-weight:600">Полная себестоимость</span>
            <span class="value">${results.fullCost.formatted}</span>
        </div>
        <div class="sub">
            <div class="row">
                <span class="label">Себестоимость</span>
                <span class="value">${results.primeCost.formatted}</span>
            </div>
            <div class="row">
                <span class="label">Доп. расходы (${results.additionalExpenses.percent})</span>
                <span class="value">+${results.additionalExpenses.formatted}</span>
            </div>
        </div>
    </div>

    <div class="box-primary" style="margin-top:12px">
        <div class="row">
            <span class="label" style="font-weight:600">Маржа (${results.margin.percent})</span>
            <span class="value" style="color:#2563eb">+${results.margin.formatted}</span>
        </div>
        <hr style="border-color:#bfdbfe; margin: 10px 0" />
        <div class="row">
            <span class="label" style="font-size:16px; font-weight:700">Итоговая цена</span>
            <span class="final-price">${results.finalPrice.formatted}</span>
        </div>
    </div>

    <div class="per-gram">
        <div class="pg-label">Стоимость печати за грамм</div>
        <div class="pg-value">${results.pricePerGram.formatted}</div>
    </div>

    <div class="meta">Распечатано: ${new Date().toLocaleString('ru-RU')}</div>
</body>
</html>`

        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.top = '-9999px'
        iframe.style.left = '-9999px'
        iframe.style.width = '0'
        iframe.style.height = '0'
        document.body.appendChild(iframe)

        const doc = iframe.contentWindow?.document
        if (!doc) return

        doc.open()
        doc.write(printContent)
        doc.close()

        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()

        // Удаляем iframe после печати
        setTimeout(() => document.body.removeChild(iframe), 1000)
    }

    return (
        <div className="max-w-7xl mx-auto pt-4 md:pt-8">
            {/* ─── Полноэкранный overlay drag & drop ────────────────────────────── */}
            {isDragging && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm pointer-events-none">
                    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary bg-primary/5 px-16 py-12">
                        <FileUp className="h-14 w-14 text-primary" />
                        <p className="text-lg font-semibold text-primary">Отпустите для импорта .3mf</p>
                    </div>
                </div>
            )}
            {/* ─── Режим сравнения ────────────────────────────────────────────────── */}
        {compareActive && (
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5" />
                        Режим сравнения
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setCompareActive(false); setCompareResults(null) }}>
                            Выйти
                        </Button>
                        <Button size="sm" onClick={calculateBoth} disabled={isLoading}>
                            {isLoading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                            Рассчитать оба
                        </Button>
                    </div>
                </div>

                {/* Таблица параметров */}
                <Card>
                    <CardContent className="pt-4 overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-3">Параметр</th>
                                    <th className="pb-2 px-2">
                                        <div className="flex items-center gap-1.5 text-sm font-medium">
                                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                            Вариант А
                                        </div>
                                    </th>
                                    <th className="pb-2 px-2">
                                        <div className="flex items-center gap-1.5 text-sm font-medium">
                                            <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                            Вариант Б
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colSpan={3} className="pt-4 pb-1"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Package className="h-3 w-3" />Материалы</span></td></tr>
                                <CompareRow label="Вес модели" unit="г" step="0.1" aVal={materials.modelWeight} bVal={compareParams.materials.modelWeight} onA={v => handleMaterialsChange('modelWeight', v)} onB={v => handleCompareMat('modelWeight', v)} />
                                <CompareRow label="Вес поддержек" unit="г" step="0.1" aVal={materials.supportWeight} bVal={compareParams.materials.supportWeight} onA={v => handleMaterialsChange('supportWeight', v)} onB={v => handleCompareMat('supportWeight', v)} />
                                <CompareRow label="Цена филамента" unit="₽/кг" step="10" aVal={materials.filamentPrice} bVal={compareParams.materials.filamentPrice} onA={v => handleMaterialsChange('filamentPrice', v)} onB={v => handleCompareMat('filamentPrice', v)} />

                                <tr><td colSpan={3} className="pt-4 pb-1"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Zap className="h-3 w-3" />Электричество</span></td></tr>
                                <CompareRow label="Мощность принтера" unit="Вт" step="10" aVal={electricity.powerConsumption} bVal={compareParams.electricity.powerConsumption} onA={v => handleElectricityChange('powerConsumption', v)} onB={v => handleCompareElec('powerConsumption', v)} />
                                <CompareRow label="Время печати" unit="мин" step="1" aVal={electricity.printTime} bVal={compareParams.electricity.printTime} onA={v => handleElectricityChange('printTime', v)} onB={v => handleCompareElec('printTime', v)} />
                                <CompareRow label="Цена электричества" unit="₽/кВт·ч" step="0.1" aVal={electricity.electricityPrice} bVal={compareParams.electricity.electricityPrice} onA={v => handleElectricityChange('electricityPrice', v)} onB={v => handleCompareElec('electricityPrice', v)} />

                                <tr><td colSpan={3} className="pt-4 pb-1"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Cpu className="h-3 w-3" />Амортизация</span></td></tr>
                                <CompareRow label="Стоимость принтера" unit="₽" step="1000" aVal={depreciation.printerCost} bVal={compareParams.depreciation.printerCost} onA={v => handleDepreciationChange('printerCost', v)} onB={v => handleCompareDepr('printerCost', v)} />
                                <CompareRow label="Ресурс печати" unit="ч" step="100" aVal={depreciation.printResource} bVal={compareParams.depreciation.printResource} onA={v => handleDepreciationChange('printResource', v)} onB={v => handleCompareDepr('printResource', v)} />

                                <tr><td colSpan={3} className="pt-4 pb-1"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><User className="h-3 w-3" />Оператор</span></td></tr>
                                <CompareRow label="Ставка оператора" unit="₽/ч" step="50" aVal={labor.hourlyRate} bVal={compareParams.labor.hourlyRate} onA={v => handleLaborChange('hourlyRate', v)} onB={v => handleCompareLab('hourlyRate', v)} />
                                <CompareRow label="Время работы" unit="мин" step="5" aVal={labor.workTime} bVal={compareParams.labor.workTime} onA={v => handleLaborChange('workTime', v)} onB={v => handleCompareLab('workTime', v)} />

                                <tr><td colSpan={3} className="pt-4 pb-1"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Percent className="h-3 w-3" />Дополнительно</span></td></tr>
                                <CompareRow label="Доп. расходы" unit="%" step="1" aVal={additional.additionalExpensesPercent} bVal={compareParams.additional.additionalExpensesPercent} onA={v => handleAdditionalChange('additionalExpensesPercent', v)} onB={v => handleCompareAdd('additionalExpensesPercent', v)} />
                                <CompareRow label="Маржа" unit="%" step="5" aVal={additional.marginPercent} bVal={compareParams.additional.marginPercent} onA={v => handleAdditionalChange('marginPercent', v)} onB={v => handleCompareAdd('marginPercent', v)} />
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Таблица результатов */}
                {results && compareResults && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Результаты сравнения</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4">Показатель</th>
                                        <th className="text-right text-sm font-medium pb-2 px-2">
                                            <span className="flex items-center justify-end gap-1"><div className="h-2 w-2 rounded-full bg-primary" />А</span>
                                        </th>
                                        <th className="text-right text-sm font-medium pb-2 px-2">
                                            <span className="flex items-center justify-end gap-1"><div className="h-2 w-2 rounded-full bg-orange-500" />Б</span>
                                        </th>
                                        <th className="text-right text-xs font-medium text-muted-foreground pb-2 pl-2 w-16">Δ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <ResultCompareRow label="Материалы"           aRaw={results.materials.total.value}  bRaw={compareResults.materials.total.value}  aFmt={results.materials.total.formatted}  bFmt={compareResults.materials.total.formatted} />
                                    <ResultCompareRow label="Электричество"        aRaw={results.electricity.value}      bRaw={compareResults.electricity.value}      aFmt={results.electricity.formatted}      bFmt={compareResults.electricity.formatted} />
                                    <ResultCompareRow label="Амортизация"          aRaw={results.depreciation.value}     bRaw={compareResults.depreciation.value}     aFmt={results.depreciation.formatted}     bFmt={compareResults.depreciation.formatted} />
                                    <ResultCompareRow label="Оператор"             aRaw={results.labor.value}            bRaw={compareResults.labor.value}            aFmt={results.labor.formatted}            bFmt={compareResults.labor.formatted} />
                                    <ResultCompareRow label="Себестоимость"        aRaw={results.primeCost.value}        bRaw={compareResults.primeCost.value}        aFmt={results.primeCost.formatted}        bFmt={compareResults.primeCost.formatted} bold />
                                    <ResultCompareRow label="+ Доп. расходы"       aRaw={results.fullCost.value}         bRaw={compareResults.fullCost.value}         aFmt={results.fullCost.formatted}         bFmt={compareResults.fullCost.formatted} />
                                    <ResultCompareRow label="Маржа"                aRaw={results.margin.value}           bRaw={compareResults.margin.value}           aFmt={results.margin.formatted}           bFmt={compareResults.margin.formatted} />
                                    <ResultCompareRow label="Итоговая цена"        aRaw={results.finalPrice.value}       bRaw={compareResults.finalPrice.value}       aFmt={results.finalPrice.formatted}       bFmt={compareResults.finalPrice.formatted} bold />
                                    <ResultCompareRow label="Цена за грамм"        aRaw={results.pricePerGram.value}     bRaw={compareResults.pricePerGram.value}     aFmt={results.pricePerGram.formatted}     bFmt={compareResults.pricePerGram.formatted} />
                                    <ResultCompareRow label="Общий вес"            aRaw={results.totalWeight.grams}      bRaw={compareResults.totalWeight.grams}      aFmt={`${results.totalWeight.grams} г`}   bFmt={`${compareResults.totalWeight.grams} г`} />
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {(results && !compareResults) || (!results && !compareResults) ? (
                    <p className="text-center text-sm text-muted-foreground">
                        Нажмите «Рассчитать оба» чтобы увидеть сравнение результатов
                    </p>
                ) : null}
            </div>
        )}

        {/* ─── Обычный режим ──────────────────────────────────────────────────── */}
        {!compareActive && (<><div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая колонка - форма */}
                <div className="lg:col-span-2">
                    <Card className="border">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="relative h-8 w-8 p-0"
                                        onClick={() => setHistoryOpen(true)}
                                        title="История расчётов"
                                    >
                                        <History className="h-4 w-4" />
                                        {history.length > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold leading-none">
                                                {history.length > 9 ? '9+' : history.length}
                                            </span>
                                        )}
                                    </Button>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calculator className="h-5 w-5" />
                                        Калькулятор 3D печати
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".3mf"
                                        className="hidden"
                                        onChange={handleImport3mfFile}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={handleImport3mfClick}
                                        disabled={import3mfLoading || isLoading}
                                        title="Импортировать параметры из .3mf файла"
                                    >
                                        {import3mfLoading
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <FileUp className="h-3.5 w-3.5" />
                                        }
                                        .3mf
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={activateCompare}
                                        title="Сравнить два варианта параметров"
                                    >
                                        <ArrowLeftRight className="h-3.5 w-3.5" />
                                        Сравнить
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={resetValues}
                                        disabled={isLoading}>
                                        Сбросить
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="materials" className="w-fits">
                                <TabsList className="grid grid-cols-5 mb-6 w-full">
                                    <TabsTrigger value="materials" className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        <span className="hidden sm:inline">Материалы</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="electricity" className="flex items-center gap-2">
                                        <Zap className="h-4 w-4" />
                                        <span className="hidden sm:inline">Электричество</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="depreciation" className="flex items-center gap-2">
                                        <Cpu className="h-4 w-4" />
                                        <span className="hidden sm:inline">Амортизация</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="labor" className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="hidden sm:inline">Оператор</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="additional" className="flex items-center gap-2">
                                        <Percent className="h-4 w-4" />
                                        <span className="hidden sm:inline">Дополнительно</span>
                                    </TabsTrigger>
                                </TabsList>

                                {/* Материалы */}
                                <TabsContent value="materials">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="modelWeight" className="flex items-center gap-2">
                                                    Вес модели
                                                    <Badge variant="outline" className="ml-auto">г</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="modelWeight"
                                                        min="0"
                                                        step="0.1"
                                                        value={materials.modelWeight}
                                                        onChange={(value) => handleMaterialsChange('modelWeight', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">г</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="supportWeight" className="flex items-center gap-2">
                                                    Вес поддержек
                                                    <Badge variant="outline" className="ml-auto">г</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="supportWeight"
                                                        min="0"
                                                        step="0.1"
                                                        value={materials.supportWeight}
                                                        onChange={(value) => handleMaterialsChange('supportWeight', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">г</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="filamentPrice" className="flex items-center gap-2">
                                                    Цена филамента
                                                    <Badge variant="outline" className="ml-auto">₽/кг</Badge>
                                                </Label>
                                                <PresetSmartInput
                                                    id="filamentPrice"
                                                    min="0"
                                                    step="10"
                                                    value={materials.filamentPrice}
                                                    onChange={(value) => handleMaterialsChange('filamentPrice', value)}
                                                    unit="₽/кг"
                                                    presets={materialPresets}
                                                    showPresets={!!user}
                                                    disabled={isLoading}
                                                    selectedPresetId={selectedPresets.filamentPrice}
                                                    onPresetChange={(id) => setSelectedPreset('filamentPrice', id)}
                                                />

                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Электричество */}
                                <TabsContent value="electricity">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="powerConsumption" className="flex items-center gap-2">
                                                    Мощность принтера
                                                    <Badge variant="outline" className="ml-auto">Вт</Badge>
                                                </Label>
                                                <PresetSmartInput
                                                    id="powerConsumption"
                                                    min="0"
                                                    step="10"
                                                    value={electricity.powerConsumption}
                                                    onChange={(value) => handleElectricityChange('powerConsumption', value)}
                                                    unit="Вт"
                                                    presets={printerPresets.power}
                                                    showPresets={!!user}
                                                    disabled={isLoading}
                                                    selectedPresetId={selectedPresets.powerConsumption}
                                                    onPresetChange={(id) => handlePrinterPresetChange(id)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="printTime" className="flex items-center gap-2">
                                                    Время печати
                                                    <Badge variant="outline" className="ml-auto">мин</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="printTime"
                                                        min="0"
                                                        step="1"
                                                        value={electricity.printTime}
                                                        onChange={(value) => handleElectricityChange('printTime', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">мин</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="electricityPrice" className="flex items-center gap-2">
                                                    Стоимость электроэнергии
                                                    <Badge variant="outline" className="ml-auto">₽/кВт·ч</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="electricityPrice"
                                                        min="0"
                                                        step="0.1"
                                                        value={electricity.electricityPrice}
                                                        onChange={(value) => handleElectricityChange('electricityPrice', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽/кВт·ч</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Амортизация */}
                                <TabsContent value="depreciation">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="printerCost" className="flex items-center gap-2">
                                                    Стоимость принтера
                                                    <Badge variant="outline" className="ml-auto">₽</Badge>
                                                </Label>
                                                <PresetSmartInput
                                                    id="printerCost"
                                                    min="0"
                                                    step="1000"
                                                    value={depreciation.printerCost}
                                                    onChange={(value) => handleDepreciationChange('printerCost', value)}
                                                    unit="₽"
                                                    presets={printerPresets.cost}
                                                    showPresets={!!user}
                                                    disabled={isLoading}
                                                    selectedPresetId={selectedPresets.printerCost}
                                                    onPresetChange={(id) => handlePrinterPresetChange(id)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="printResource" className="flex items-center gap-2">
                                                    Ресурс печати
                                                    <Badge variant="outline" className="ml-auto">часов</Badge>
                                                </Label>
                                                <PresetSmartInput
                                                    id="printResource"
                                                    min="0"
                                                    step="100"
                                                    value={depreciation.printResource}
                                                    onChange={(value) => handleDepreciationChange('printResource', value)}
                                                    unit="ч"
                                                    presets={printerPresets.hours}
                                                    showPresets={!!user}
                                                    disabled={isLoading}
                                                    selectedPresetId={selectedPresets.printResource}
                                                    onPresetChange={(id) => handlePrinterPresetChange(id)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Работа оператора */}
                                <TabsContent value="labor">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="hourlyRate" className="flex items-center gap-2">
                                                    Ставка оператора
                                                    <Badge variant="outline" className="ml-auto">₽/ч</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="hourlyRate"
                                                        min="0"
                                                        step="50"
                                                        value={labor.hourlyRate}
                                                        onChange={(value) => handleLaborChange('hourlyRate', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽/ч</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="workTime" className="flex items-center gap-2">
                                                    Время работы
                                                    <Badge variant="outline" className="ml-auto">мин</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="workTime"
                                                        min="0"
                                                        step="5"
                                                        value={labor.workTime}
                                                        onChange={(value) => handleLaborChange('workTime', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">мин</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Дополнительно */}
                                <TabsContent value="additional">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="additionalExpensesPercent" className="flex items-center gap-2">
                                                    Доп. расходы
                                                    <Badge variant="outline" className="ml-auto">%</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="additionalExpensesPercent"
                                                        min="0"
                                                        max="100"
                                                        step="1"
                                                        value={additional.additionalExpensesPercent}
                                                        onChange={(value) => handleAdditionalChange('additionalExpensesPercent', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="marginPercent" className="flex items-center gap-2">
                                                    Маржа
                                                    <Badge variant="outline" className="ml-auto">%</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="marginPercent"
                                                        min="0"
                                                        max="500"
                                                        step="5"
                                                        value={additional.marginPercent}
                                                        onChange={(value) => handleAdditionalChange('marginPercent', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            {/* Кнопка расчёта */}
                            <div className="mt-6">
                                <Button
                                    size="lg"
                                    className="w-full"
                                    onClick={calculateCost}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Выполняется расчет...
                                        </>
                                    ) : (
                                        'Рассчитать стоимость'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Правая колонка - результаты */}
                <div>
                    <Card className="border h-full">
                        <CardContent>
                            {results ? (
                                <div className="space-y-6">
                                    {/* Вес */}
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Общий вес</h3>
                                        <div className="text-2xl font-bold text-foreground">
                                            {results.totalWeight.grams} г
                                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                                ({results.totalWeight.kg} кг)
                                            </span>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Расходы по категориям */}
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-muted-foreground mb-3">Расходы по категориям</h3>
                                            <TooltipProvider delayDuration={200}>
                                                <div className="space-y-3">
                                                    {/* Материалы */}
                                                    <div className="space-y-1">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex justify-between items-center cursor-default">
                                                                    <span className="text-sm flex items-center gap-2">
                                                                        <Package className="h-4 w-4" />
                                                                        Материалы
                                                                    </span>
                                                                    <span className="font-medium">{results.materials.total.formatted}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-xs">
                                                                <p className="font-medium mb-1">Итого по материалам</p>
                                                                <p className="text-xs">стоимость модели + стоимость поддержек</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex justify-between items-center text-sm pl-4 relative cursor-default">
                                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-border"></div>
                                                                    <span className="text-sm pl-1 text-muted-foreground flex items-center gap-1">
                                                                        Модель
                                                                    </span>
                                                                    <span className="font-medium text-muted-foreground">{results.materials.model.formatted}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-xs">
                                                                <p className="font-mono text-xs">вес модели (г) × цена <br></br>филамента (₽/кг) ÷ 1000</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex justify-between items-center text-sm pl-4 relative cursor-default">
                                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-border"></div>
                                                                    <span className="flex items-center gap-1 pl-1 text-muted-foreground">
                                                                        Поддержки
                                                                    </span>
                                                                    <span className="text-muted-foreground">{results.materials.support.formatted}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="right" className="max-w-xs">
                                                                <p className="font-mono text-xs">вес поддержек (г) × цена <br></br>филамента (₽/кг) ÷ 1000</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>

                                                    {/* Электричество */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex justify-between items-center cursor-default">
                                                                <span className="text-sm flex items-center gap-2">
                                                                    <Zap className="h-4 w-4" />
                                                                    Электричество
                                                                </span>
                                                                <span className="font-medium">{results.electricity.formatted}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-xs">
                                                            <p className="font-mono text-xs">мощность (Вт) × время печати (мин) ÷ 60 <br></br>÷ 1000 × цена электричества (₽/кВт·ч)</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    {/* Амортизация */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex justify-between items-center cursor-default">
                                                                <span className="text-sm flex items-center gap-2">
                                                                    <Cpu className="h-4 w-4" />
                                                                    Амортизация
                                                                </span>
                                                                <span className="font-medium">{results.depreciation.formatted}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-xs">
                                                            <p className="font-mono text-xs">стоимость принтера (₽) ÷ ресурс <br></br>принтера (ч) × время печати (мин) ÷ 60</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    {/* Оператор */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex justify-between items-center cursor-default">
                                                                <span className="text-sm flex items-center gap-2">
                                                                    <User className="h-4 w-4" />
                                                                    Оператор
                                                                </span>
                                                                <span className="font-medium">{results.labor.formatted}</span>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-xs">
                                                            <p className="font-mono text-xs">ставка оператора <br></br>(₽/ч) × время работы (мин) ÷ 60</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TooltipProvider>
                                        </div>

                                        <Separator />

                                        {/* Себестоимость */}
                                        <TooltipProvider delayDuration={200}>
                                            <div className="space-y-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex justify-between items-center cursor-default">
                                                            <span className="font-semibold flex items-center gap-1">
                                                                Полная себестоимость
                                                            </span>
                                                            <span className="font-bold">{results.fullCost.formatted}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        <p className="font-mono text-xs">себестоимость + доп. расходы (%)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex justify-between items-center text-sm pl-4 relative cursor-default">
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-border"></div>
                                                            <span className="text-sm text-muted-foreground pl-1 flex items-center gap-1">
                                                                Себестоимость
                                                            </span>
                                                            <span className="font-medium text-muted-foreground">{results.primeCost.formatted}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        <p className="font-mono text-xs">материалы + электричество <br></br>+ амортизация + оператор</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex justify-between items-center text-sm pl-4 relative cursor-default">
                                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-border"></div>
                                                            <span className="flex items-center gap-1 text-muted-foreground pl-1">
                                                                <Percent className="h-3 w-3" />
                                                                Доп. расходы ({results.additionalExpenses.percent})
                                                            </span>
                                                            <span className="text-muted-foreground">+{results.additionalExpenses.formatted}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        <p className="font-mono text-xs">себестоимость × доп. расходы (%)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <Separator />

                                            {/* Итоговая цена */}
                                            <div className="bg-primary/5 p-4 rounded-lg">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex justify-between items-center mb-2 cursor-default">
                                                            <span className="font-semibold flex items-center gap-1">
                                                                Маржа ({results.margin.percent})
                                                            </span>
                                                            <span className="font-bold text-primary">+{results.margin.formatted}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        <p className="font-mono text-xs">полная себестоимость × маржа (%)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex justify-between items-center pt-3 border-t border-primary/20 cursor-default">
                                                            <span className="text-lg font-bold flex items-center gap-1">
                                                                Итоговая цена
                                                            </span>
                                                            <span className="text-2xl font-bold text-primary">{results.finalPrice.formatted}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        <p className="font-mono text-xs">полная себестоимость + маржа</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>

                                            {/* Стоимость за грамм */}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-center p-3 bg-muted/50 rounded-lg cursor-default">
                                                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                                                            Стоимость печати за грамм
                                                        </div>
                                                        <div className="text-xl font-bold text-foreground">
                                                            {results.pricePerGram.formatted}
                                                        </div>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="max-w-xs">
                                                    <p className="font-mono text-xs">итоговая цена ÷ общий вес (г)</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Calculator className="h-12 w-12 text-muted mb-4" />
                                    <p className="text-muted-foreground mb-2">Нет данных для отображения</p>
                                    <p className="text-sm text-muted-foreground/70">
                                        Заполните параметры и нажмите "Рассчитать стоимость"
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Кнопки действий */}
            {results && (
                <div className="mt-6 flex justify-center gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={openSaveDialog}
                        disabled={isLoading}
                    >
                        Сохранить заказ
                    </Button>
                    <Button
                        size="lg"
                        onClick={handlePrint}
                        disabled={isLoading}
                    >
                        Распечатать расчет
                    </Button>
                </div>
            )}
        </>)}

            {/* ─── История расчётов: drawer ─────────────────────────────────────── */}
            {historyOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40"
                    onClick={() => setHistoryOpen(false)}
                />
            )}
            <div className={`fixed top-0 left-0 h-full w-80 bg-background border-r shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${historyOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        <History className="h-4 w-4" />
                        История расчётов
                        {history.length > 0 && (
                            <Badge variant="secondary">{history.length}</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {history.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground h-7 px-2"
                                onClick={() => { setHistory([]); localStorage.removeItem(HISTORY_KEY) }}
                            >
                                Очистить
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setHistoryOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                            <History className="h-8 w-8 opacity-30" />
                            Нет сохранённых расчётов
                        </div>
                    ) : (
                        history.map(entry => (
                            <div
                                key={entry.id}
                                className="rounded-md border px-3 py-2.5 space-y-1.5 hover:bg-muted/40 transition-colors"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm">{entry.result.finalPrice.formatted}</span>
                                    <span className="text-xs text-muted-foreground">{entry.result.totalWeight.grams} г · {entry.electricity.printTime} мин</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(entry.timestamp).toLocaleString('ru-RU', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-7 text-xs mt-0.5"
                                    onClick={() => { restoreFromHistory(entry); setHistoryOpen(false) }}
                                >
                                    <RotateCcw className="h-3 w-3 mr-1.5" />
                                    Восстановить параметры
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ─── Модальное окно сохранения заказа ─────────────────────────────── */}
            {/* Диалог предупреждения об остатке */}
            <Dialog open={stockWarning !== null} onOpenChange={open => { if (!open) setStockWarning(null) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${stockWarning?.type === 'impossible' ? 'text-red-600' : 'text-orange-600'}`}>
                            {stockWarning?.type === 'impossible' ? '🚫' : '⚠️'} {stockWarning?.message}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">{stockWarning?.detail}</p>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button>Понятно</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Сохранить заказ</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Название */}
                        <div className="space-y-2">
                            <Label htmlFor="orderTitle">
                                Название заказа
                                <span className="text-muted-foreground font-normal ml-1">(необязательно)</span>
                            </Label>
                            <Input
                                id="orderTitle"
                                placeholder="Например: Корпус для робота"
                                value={orderTitle}
                                onChange={(e) => setOrderTitle(e.target.value)}
                                disabled={isSaving}
                                autoFocus
                            />
                        </div>

                        {/* Превью итогового имени */}
                        <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Имя заказа: </span>
                            {orderTitle.trim()
                                ? `${orderTitle.trim()} — ${generateOrderName()}`
                                : generateOrderName()
                            }
                        </div>

                        <Separator />

                        {/* Клиент */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />Клиент
                                <span className="text-muted-foreground font-normal">(необязательно)</span>
                            </Label>
                            <OrderClientField
                                clientId={saveClientId}
                                clientName={saveClientName}
                                clientPhone={saveClientPhone}
                                clientEmail={saveClientEmail}
                                onClientChange={(id, client) => {
                                    setSaveClientId(id)
                                    setSaveClientName(client?.name ?? null)
                                    setSaveClientPhone(client?.phone ?? null)
                                    setSaveClientEmail(client?.email ?? null)
                                }}
                            />
                        </div>

                        {/* Дедлайн */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />Дедлайн
                                <span className="text-muted-foreground font-normal">(необязательно)</span>
                            </Label>
                            <OrderDeadlineField
                                deadline={saveDeadline}
                                status="in_progress"
                                onChange={setSaveDeadline}
                            />
                        </div>

                        {/* Теги */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5">
                                <TagIco className="h-3.5 w-3.5" />Теги
                                <span className="text-muted-foreground font-normal">(необязательно)</span>
                            </Label>
                            <CreateTagSelector selectedIds={saveTagIds} onChange={setSaveTagIds} />
                        </div>

                        {/* Примечания */}
                        <div className="space-y-2">
                            <Label htmlFor="saveNotes">
                                Примечания
                                <span className="text-muted-foreground font-normal ml-1">(необязательно)</span>
                            </Label>
                            <Textarea
                                id="saveNotes"
                                placeholder="Дополнительная информация..."
                                value={saveNotes}
                                onChange={(e) => setSaveNotes(e.target.value)}
                                disabled={isSaving}
                                rows={2}
                            />
                        </div>

                        <Separator />

                        {/* Краткая сводка расчёта */}
                        {results && (
                            <div className="rounded-md border px-3 py-2 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Итоговая цена</span>
                                    <span className="font-semibold">{results.finalPrice.formatted}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Себестоимость</span>
                                    <span>{results.fullCost.formatted}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Общий вес</span>
                                    <span>{results.totalWeight.grams} г</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" disabled={isSaving}>
                                Отмена
                            </Button>
                        </DialogClose>
                        <Button onClick={handleSaveOrder} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Сохранение...
                                </>
                            ) : (
                                'Сохранить'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ─── Диалог импорта .3mf ──────────────────────────────────────────── */}
            <Dialog open={import3mfOpen} onOpenChange={setImport3mfOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileUp className="h-4 w-4" />
                            Импорт параметров из .3mf
                        </DialogTitle>
                    </DialogHeader>

                    {import3mfResult && (
                        <div className="space-y-4 py-1">
                            <div className="text-xs text-muted-foreground truncate" title={import3mfFileName}>
                                {import3mfFileName}
                            </div>

                            {import3mfResult.slicer && (
                                <Badge variant="secondary" className="text-xs">{import3mfResult.slicer}</Badge>
                            )}

                            {(() => {
                                const derivedMode = import3mfResult.totalWeight !== undefined && import3mfResult.supportWeight === undefined
                                const derivedSupport = derivedMode
                                    ? Math.max(0, parseFloat((import3mfResult.totalWeight! - import3mfModelWEdit).toFixed(2)))
                                    : undefined
                                return (
                                    <>
                                        <div className="space-y-3 rounded-md border p-3">
                                            {import3mfResult.modelWeight !== undefined && (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={applyModelWeight}
                                                        onChange={e => setApplyModelWeight(e.target.checked)}
                                                        className="accent-primary h-4 w-4 shrink-0"
                                                    />
                                                    <span className="text-sm flex-1">Вес модели</span>
                                                    {derivedMode ? (
                                                        <div className="relative w-28">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={import3mfResult.totalWeight}
                                                                step={0.1}
                                                                value={import3mfModelWEdit}
                                                                onChange={e => setImport3mfModelWEdit(Math.max(0, parseFloat(e.target.value) || 0))}
                                                                className="h-7 text-sm pr-6 font-mono"
                                                            />
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">г</span>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="font-mono tabular-nums">
                                                            {import3mfResult.modelWeight} г
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                            {import3mfResult.supportWeight !== undefined ? (
                                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={applySupportWeight}
                                                        onChange={e => setApplySupportWeight(e.target.checked)}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <span className="text-sm flex-1">Вес поддержек</span>
                                                    <Badge variant="outline" className="font-mono tabular-nums">
                                                        {import3mfResult.supportWeight} г
                                                    </Badge>
                                                </label>
                                            ) : derivedMode ? (
                                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={applySupportWeight}
                                                        onChange={e => setApplySupportWeight(e.target.checked)}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <span className="text-sm flex-1 text-muted-foreground">Вес поддержек <span className="text-xs">(вычислен)</span></span>
                                                    <Badge variant="outline" className="font-mono tabular-nums text-muted-foreground">
                                                        {derivedSupport} г
                                                    </Badge>
                                                </label>
                                            ) : null}
                                            {import3mfResult.printTime !== undefined && (
                                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={applyPrintTime}
                                                        onChange={e => setApplyPrintTime(e.target.checked)}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <span className="text-sm flex-1">Время печати</span>
                                                    <Badge variant="outline" className="font-mono tabular-nums">
                                                        {import3mfResult.printTime} мин
                                                    </Badge>
                                                </label>
                                            )}
                                        </div>

                                        {derivedMode && (
                                            <p className="text-xs text-muted-foreground">
                                                Общий вес: {import3mfResult.totalWeight} г. Поддержки не найдены в файле — введите вес модели, вес поддержек вычислится автоматически.
                                            </p>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Отмена</Button>
                        </DialogClose>
                        <Button
                            onClick={confirmImport3mf}
                            disabled={!applyModelWeight && !applySupportWeight && !applyPrintTime}
                        >
                            Применить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}