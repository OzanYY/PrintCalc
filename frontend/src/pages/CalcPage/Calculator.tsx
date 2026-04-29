import { useState, useEffect } from "react"
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
import { Calculator, Package, Zap, Cpu, User, Percent, Loader2, Info } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { calculationAPI, type CalculationParams, type CalculationResult } from "@/api/calculator"
import { ordersAPI, buildCreateOrderData } from "@/api/orders"
import { SmartInput } from '@/components/ui/smart-input'
import { useCalculator } from "@/context/CalculatorContext"
import { useAuth } from "@/context/AuthContext"

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
        resetToDefaults,
        resetAll,
    } = useCalculator()

    const { user } = useAuth()

    const [isLoading, setIsLoading]         = useState(false)
    const [serverError, setServerError]     = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [results, setResults]             = useState<CalculationResult | null>(null)

    // ─── Состояние модального окна сохранения ────────────────────────────────
    const [saveDialogOpen, setSaveDialogOpen]   = useState(false)
    const [orderTitle, setOrderTitle]           = useState('')      // доп. заголовок от пользователя
    const [isSaving, setIsSaving]               = useState(false)

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
            toast.error(serverError, { position: "top-center", duration: 5000 })
        }
    }, [serverError])

    useEffect(() => {
        if (successMessage) {
            toast.success(successMessage, { position: "top-center", duration: 3000 })
        }
    }, [successMessage])

    useEffect(() => {
        if (isLoading) {
            toast.loading("Выполняется расчет...", { position: "top-center", id: "calculation-loading" })
        } else {
            toast.dismiss("calculation-loading")
        }
    }, [isLoading])

    // ─── Обработчики полей ────────────────────────────────────────────────────
    const handleMaterialsChange    = (field: string, value: number) => setMaterials(prev => ({ ...prev, [field]: value }))
    const handleElectricityChange  = (field: string, value: number) => setElectricity(prev => ({ ...prev, [field]: value }))
    const handleDepreciationChange = (field: string, value: number) => setDepreciation(prev => ({ ...prev, [field]: value }))
    const handleLaborChange        = (field: string, value: number) => setLabor(prev => ({ ...prev, [field]: value }))
    const handleAdditionalChange   = (field: string, value: number) => setAdditional(prev => ({ ...prev, [field]: value }))

    // ─── Расчёт ───────────────────────────────────────────────────────────────
    const calculateCost = async () => {
        setServerError('')
        setSuccessMessage('')
        setIsLoading(true)

        const requestData: CalculationParams = {
            modelWeight:               materials.modelWeight,
            supportWeight:             materials.supportWeight,
            filamentPrice:             materials.filamentPrice,
            powerConsumption:          electricity.powerConsumption,
            printTime:                 electricity.printTime,
            electricityPrice:          electricity.electricityPrice,
            printerCost:               depreciation.printerCost,
            printResource:             depreciation.printResource,
            hourlyRate:                labor.hourlyRate,
            workTime:                  labor.workTime,
            additionalExpensesPercent: additional.additionalExpensesPercent,
            marginPercent:             additional.marginPercent,
        }

        try {
            const response = await calculationAPI.calculate(requestData)

            if (response.data.success && response.data.data) {
                setResults(response.data.data)
                setHasCalculated(true)
                localStorage.setItem('calculator_results', JSON.stringify(response.data.data))
                setSuccessMessage('Расчет успешно выполнен!')
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

    // ─── Открытие диалога сохранения ─────────────────────────────────────────
    const openSaveDialog = () => {
        setOrderTitle('')       // сбрасываем поле при каждом открытии
        setSaveDialogOpen(true)
    }

    // ─── Сохранение заказа ────────────────────────────────────────────────────
    const handleSaveOrder = async () => {
        if (!results) return

        // Итоговое имя: "Доп. заголовок — Заказ от 27.04.2026 14:35"
        // Если пользователь ничего не ввёл — только автогенерация
        const autoName   = generateOrderName()
        const finalName  = orderTitle.trim()
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
            )

            await ordersAPI.create(orderData)

            setSaveDialogOpen(false)
            toast.success('Заказ успешно сохранён', { position: "top-center", duration: 3000 })
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Ошибка при сохранении заказа'
            toast.error(errorMessage, { position: "top-center", duration: 5000 })
            console.error('Save order error:', err)
        } finally {
            setIsSaving(false)
        }
    }

    // ─── Сброс ────────────────────────────────────────────────────────────────
    const resetValues = () => {
        resetAll()
        setResults(null)
        setServerError('')
        setSuccessMessage('')
        localStorage.removeItem('calculator_results')
        toast.info("Значения сброшены к стандартным", { position: "top-center", duration: 2000 })
    }

    const resetFormOnly = () => {
        resetToDefaults()
        toast.info("Параметры сброшены, результаты сохранены", { position: "top-center", duration: 2000 })
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая колонка - форма */}
                <div className="lg:col-span-2">
                    <Card className="border">
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Введите параметры печати
                                </CardTitle>
                                <Button
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={resetValues}
                                    disabled={isLoading}>
                                    Сбросить
                                </Button>
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
                                                <div className="relative">
                                                    <SmartInput
                                                        id="filamentPrice"
                                                        min="0"
                                                        step="10"
                                                        value={materials.filamentPrice}
                                                        onChange={(value) => handleMaterialsChange('filamentPrice', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽/кг</span>
                                                </div>
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
                                                <div className="relative">
                                                    <SmartInput
                                                        id="powerConsumption"
                                                        min="0"
                                                        step="10"
                                                        value={electricity.powerConsumption}
                                                        onChange={(value) => handleElectricityChange('powerConsumption', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Вт</span>
                                                </div>
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
                                                <div className="relative">
                                                    <SmartInput
                                                        id="printerCost"
                                                        min="0"
                                                        step="1000"
                                                        value={depreciation.printerCost}
                                                        onChange={(value) => handleDepreciationChange('printerCost', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₽</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="printResource" className="flex items-center gap-2">
                                                    Ресурс печати
                                                    <Badge variant="outline" className="ml-auto">часов</Badge>
                                                </Label>
                                                <div className="relative">
                                                    <SmartInput
                                                        id="printResource"
                                                        min="0"
                                                        step="100"
                                                        value={depreciation.printResource}
                                                        onChange={(value) => handleDepreciationChange('printResource', value)}
                                                        className="pr-10"
                                                        disabled={isLoading}
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">часов</span>
                                                </div>
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
                                        <h3 className="text-sm font-medium text-gray-500 mb-2">Общий вес</h3>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {results.totalWeight.grams} г
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                ({results.totalWeight.kg} кг)
                                            </span>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Расходы по категориям */}
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-3">Расходы по категориям</h3>
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
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
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
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
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
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
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
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
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
                                                <div className="text-center p-3 bg-gray-50 rounded-lg cursor-default">
                                                    <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                                                        Стоимость печати за грамм
                                                    </div>
                                                    <div className="text-xl font-bold text-gray-900">
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
                                    <Calculator className="h-12 w-12 text-gray-300 mb-4" />
                                    <p className="text-gray-500 mb-2">Нет данных для отображения</p>
                                    <p className="text-sm text-gray-400">
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

            {/* ─── Модальное окно сохранения заказа ─────────────────────────────── */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Сохранить заказ</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Доп. заголовок */}
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
                                onKeyDown={(e) => e.key === 'Enter' && !isSaving && handleSaveOrder()}
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
        </div>
    )
}