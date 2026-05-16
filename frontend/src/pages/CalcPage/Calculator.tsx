import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, Package, Zap, Cpu, User, Percent, Loader2, HelpCircle } from 'lucide-react'
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { calculationAPI, type CalculationParams, type CalculationResult } from "@/api/calculator"

export default function Calc() {
    // Состояния для всех полей ввода
    const [materials, setMaterials] = useState({
        modelWeight: 100,
        supportWeight: 20,
        filamentPrice: 1500,
    })

    const [electricity, setElectricity] = useState({
        powerConsumption: 200,
        printTime: 300,
        electricityPrice: 6.5,
    })

    const [depreciation, setDepreciation] = useState({
        printerCost: 50000,
        printResource: 5000,
    })

    const [labor, setLabor] = useState({
        hourlyRate: 500,
        workTime: 60,
    })

    const [additional, setAdditional] = useState({
        additionalExpensesPercent: 15,
        marginPercent: 30,
    })

    // Состояния для уведомлений
    const [isLoading, setIsLoading] = useState(false)
    const [serverError, setServerError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [results, setResults] = useState<CalculationResult | null>(null)

    // Эффекты для уведомлений
    useEffect(() => {
        if (serverError) {
            toast.error(serverError, {
                position: "top-center",
                duration: 5000,
            })
        }
    }, [serverError])

    useEffect(() => {
        if (successMessage) {
            toast.success(successMessage, {
                position: "top-center",
                duration: 3000,
            })
        }
    }, [successMessage])

    useEffect(() => {
        if (isLoading) {
            toast.loading("Выполняется расчет...", {
                position: "top-center",
                id: "calculation-loading",
            })
        } else {
            toast.dismiss("calculation-loading")
        }
    }, [isLoading])

    // Обработчики изменения полей
    const handleMaterialsChange = (field: string, value: number) => {
        setMaterials({ ...materials, [field]: value })
    }

    const handleElectricityChange = (field: string, value: number) => {
        setElectricity({ ...electricity, [field]: value })
    }

    const handleDepreciationChange = (field: string, value: number) => {
        setDepreciation({ ...depreciation, [field]: value })
    }

    const handleLaborChange = (field: string, value: number) => {
        setLabor({ ...labor, [field]: value })
    }

    const handleAdditionalChange = (field: string, value: number) => {
        setAdditional({ ...additional, [field]: value })
    }

    // Отправка запроса на сервер
    const calculateCost = async () => {
        // Очищаем предыдущие сообщения
        setServerError('')
        setSuccessMessage('')
        setIsLoading(true)

        const requestData: CalculationParams = {
            // Материалы
            modelWeight: materials.modelWeight,
            supportWeight: materials.supportWeight,
            filamentPrice: materials.filamentPrice,
            
            // Электричество
            powerConsumption: electricity.powerConsumption,
            printTime: electricity.printTime,
            electricityPrice: electricity.electricityPrice,
            
            // Амортизация
            printerCost: depreciation.printerCost,
            printResource: depreciation.printResource,
            
            // Работа оператора
            hourlyRate: labor.hourlyRate,
            workTime: labor.workTime,
            
            // Дополнительно
            additionalExpensesPercent: additional.additionalExpensesPercent,
            marginPercent: additional.marginPercent
        }

        try {
            const response = await calculationAPI.calculate(requestData)
            
            if (response.data.success && response.data.data) {
                setResults(response.data.data)
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

    // Сброс всех значений
    const resetValues = () => {
        setMaterials({ modelWeight: 100, supportWeight: 20, filamentPrice: 1500 })
        setElectricity({ powerConsumption: 200, printTime: 300, electricityPrice: 6.5 })
        setDepreciation({ printerCost: 50000, printResource: 5000 })
        setLabor({ hourlyRate: 500, workTime: 60 })
        setAdditional({ additionalExpensesPercent: 15, marginPercent: 30 })
        setResults(null)
        setServerError('')
        setSuccessMessage('')
        
        toast.info("Значения сброшены к стандартным", {
            position: "top-center",
            duration: 2000,
        })
    }

    // Обработчик печати
    const handlePrint = () => {
        if (results) {
            window.print()
            toast.info("Подготовка к печати...", {
                position: "top-center",
                duration: 2000,
            })
        }
    }

    // Компонент для отображения цены с подсказкой
    const PriceWithTooltip = ({ label, value, formula, hint }: { 
        label: string; 
        value: string; 
        formula: string;
        hint?: string;
    }) => (
        <div className="flex justify-between items-center group">
            <div className="flex items-center gap-1">
                <span className="text-sm">{label}</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-gray-200 text-white p-3">
                            <div className="space-y-2">
                                <p className="font-semibold text-sm text-black">Формула расчета:</p>
                                <p className="text-xs font-mono bg-gray-300 p-2 rounded text-black">{formula}</p>
                                {hint && (
                                    <>
                                        <p className="font-semibold text-sm mt-2 text-black">Пояснение:</p>
                                        <p className="text-xs text-black">{hint}</p>
                                    </>
                                )}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <span className="font-medium">{value}</span>
        </div>
    )

    // Компонент для отображения подраздела с подсказкой
    const SubPriceWithTooltip = ({ label, value, formula }: { 
        label: string; 
        value: string; 
        formula: string;
    }) => (
        <div className="flex justify-between items-center text-sm pl-4 relative group">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
            <div className="flex items-center gap-1 pl-1">
                <span className="text-muted-foreground">{label}</span>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-200 text-white p-3">
                            <div className="space-y-2">
                                <p className="font-semibold text-sm text-black">Формула расчета:</p>
                                <p className="text-xs font-mono bg-gray-300 p-2 rounded text-black">{formula}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <span className="font-medium text-muted-foreground">{value}</span>
        </div>
    )

    return (
        <TooltipProvider>
            <div className="max-w-7xl mx-auto pt-4 md:pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Левая колонка - форма */}
                    <div className="lg:col-span-2">
                        <Card className="border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Введите параметры печати
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="materials" className="w-full">
                                    <TabsList className="grid grid-cols-5 mb-6">
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
                                                        <Input
                                                            id="modelWeight"
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={materials.modelWeight}
                                                            onChange={(e) => handleMaterialsChange('modelWeight', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            г
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="supportWeight" className="flex items-center gap-2">
                                                        Вес поддержек
                                                        <Badge variant="outline" className="ml-auto">г</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="supportWeight"
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={materials.supportWeight}
                                                            onChange={(e) => handleMaterialsChange('supportWeight', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            г
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="filamentPrice" className="flex items-center gap-2">
                                                        Цена филамента
                                                        <Badge variant="outline" className="ml-auto">₽/кг</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="filamentPrice"
                                                            type="number"
                                                            min="0"
                                                            step="10"
                                                            value={materials.filamentPrice}
                                                            onChange={(e) => handleMaterialsChange('filamentPrice', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            ₽/кг
                                                        </span>
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
                                                        <Input
                                                            id="powerConsumption"
                                                            type="number"
                                                            min="0"
                                                            step="10"
                                                            value={electricity.powerConsumption}
                                                            onChange={(e) => handleElectricityChange('powerConsumption', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            Вт
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="printTime" className="flex items-center gap-2">
                                                        Время печати
                                                        <Badge variant="outline" className="ml-auto">мин</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="printTime"
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={electricity.printTime}
                                                            onChange={(e) => handleElectricityChange('printTime', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            мин
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="electricityPrice" className="flex items-center gap-2">
                                                        Стоимость электроэнергии
                                                        <Badge variant="outline" className="ml-auto">₽/кВт·ч</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="electricityPrice"
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={electricity.electricityPrice}
                                                            onChange={(e) => handleElectricityChange('electricityPrice', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            ₽/кВт·ч
                                                        </span>
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
                                                        <Input
                                                            id="printerCost"
                                                            type="number"
                                                            min="0"
                                                            step="1000"
                                                            value={depreciation.printerCost}
                                                            onChange={(e) => handleDepreciationChange('printerCost', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            ₽
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="printResource" className="flex items-center gap-2">
                                                        Ресурс печати
                                                        <Badge variant="outline" className="ml-auto">часов</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="printResource"
                                                            type="number"
                                                            min="0"
                                                            step="100"
                                                            value={depreciation.printResource}
                                                            onChange={(e) => handleDepreciationChange('printResource', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            часов
                                                        </span>
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
                                                        <Input
                                                            id="hourlyRate"
                                                            type="number"
                                                            min="0"
                                                            step="50"
                                                            value={labor.hourlyRate}
                                                            onChange={(e) => handleLaborChange('hourlyRate', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            ₽/ч
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="workTime" className="flex items-center gap-2">
                                                        Время работы
                                                        <Badge variant="outline" className="ml-auto">мин</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="workTime"
                                                            type="number"
                                                            min="0"
                                                            step="5"
                                                            value={labor.workTime}
                                                            onChange={(e) => handleLaborChange('workTime', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            мин
                                                        </span>
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
                                                        <Input
                                                            id="additionalExpensesPercent"
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            value={additional.additionalExpensesPercent}
                                                            onChange={(e) => handleAdditionalChange('additionalExpensesPercent', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            %
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="marginPercent" className="flex items-center gap-2">
                                                        Маржа
                                                        <Badge variant="outline" className="ml-auto">%</Badge>
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="marginPercent"
                                                            type="number"
                                                            min="0"
                                                            max="500"
                                                            step="5"
                                                            value={additional.marginPercent}
                                                            onChange={(e) => handleAdditionalChange('marginPercent', parseFloat(e.target.value) || 0)}
                                                            className="pr-10"
                                                            disabled={isLoading}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                            %
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {/* Кнопка расчета */}
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
                                            <>
                                                <Calculator className="mr-2 h-4 w-4" />
                                                Рассчитать стоимость
                                            </>
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
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <PriceWithTooltip
                                                            label="Материалы"
                                                            value={results.materials.total.formatted}
                                                            formula="(Вес модели + Вес поддержек) / 1000 × Цена филамента"
                                                            hint="Общая стоимость пластика, использованного для печати модели и поддержек"
                                                        />
                                                        <SubPriceWithTooltip
                                                            label="Модель"
                                                            value={results.materials.model.formatted}
                                                            formula="Вес модели / 1000 × Цена филамента"
                                                        />
                                                        <SubPriceWithTooltip
                                                            label="Поддержки"
                                                            value={results.materials.support.formatted}
                                                            formula="Вес поддержек / 1000 × Цена филамента"
                                                        />
                                                    </div>
                                                    
                                                    <PriceWithTooltip
                                                        label="Электричество"
                                                        value={results.electricity.formatted}
                                                        formula="(Мощность принтера × Время печати в часах) / 1000 × Стоимость электроэнергии"
                                                        hint="Время печати в часах = Время печати в минутах / 60"
                                                    />
                                                    
                                                    <PriceWithTooltip
                                                        label="Амортизация"
                                                        value={results.depreciation.formatted}
                                                        formula="(Стоимость принтера / Ресурс печати в часах) × Время печати в часах"
                                                        hint="Амортизация принтера за время печати"
                                                    />
                                                    
                                                    <PriceWithTooltip
                                                        label="Оператор"
                                                        value={results.labor.formatted}
                                                        formula="Ставка оператора × (Время работы в минутах / 60)"
                                                        hint="Оплата работы оператора за подготовку и обслуживание печати"
                                                    />
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Себестоимость */}
                                            <div className="space-y-1">
                                                <PriceWithTooltip
                                                    label="Полная себестоимость"
                                                    value={results.fullCost.formatted}
                                                    formula="Себестоимость + Дополнительные расходы"
                                                    hint="Итоговая себестоимость с учетом всех затрат"
                                                />
                                                <SubPriceWithTooltip
                                                    label="Себестоимость"
                                                    value={results.primeCost.formatted}
                                                    formula="Материалы + Электричество + Амортизация + Оператор"
                                                />
                                                <SubPriceWithTooltip
                                                    label={`Доп. расходы (${results.additionalExpenses.percent})`}
                                                    value={`+${results.additionalExpenses.formatted}`}
                                                    formula="Себестоимость × (Процент дополнительных расходов / 100)"
                                                />
                                            </div>
                                            
                                            <Separator />

                                            {/* Итоговая цена */}
                                            <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                                                <PriceWithTooltip
                                                    label={`Маржа (${results.margin.percent})`}
                                                    value={`+${results.margin.formatted}`}
                                                    formula="Полная себестоимость × (Процент маржи / 100)"
                                                    hint="Прибыль с продажи"
                                                />
                                                <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                                                    <span className="text-lg font-bold">Итоговая цена</span>
                                                    <span className="text-2xl font-bold text-primary">{results.finalPrice.formatted}</span>
                                                </div>
                                            </div>

                                            {/* Стоимость за грамм */}
                                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                                                <PriceWithTooltip
                                                    label="Стоимость печати за грамм"
                                                    value={results.pricePerGram.formatted}
                                                    formula="Итоговая цена / Общий вес в граммах"
                                                    hint="Стоимость одного грамма напечатанного изделия"
                                                />
                                            </div>
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
                <div className="mt-6 flex justify-center gap-4">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={resetValues}
                        disabled={isLoading}
                    >
                        Сбросить значения
                    </Button>
                    {results && (
                        <Button 
                            size="lg" 
                            onClick={handlePrint}
                            disabled={isLoading}
                        >
                            Распечатать расчет
                        </Button>
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}