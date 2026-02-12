import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator, Package, Zap, Cpu, User, Percent } from 'lucide-react'

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

    // Расчет стоимости
    const calculateCost = () => {
        // 1. Материалы
        const totalWeightGrams = materials.modelWeight + materials.supportWeight
        const totalWeightKg = totalWeightGrams / 1000
        const modelCost = materials.modelWeight / 1000 * materials.filamentPrice
        const supportCost = materials.supportWeight / 1000 * materials.filamentPrice
        const materialsCost = totalWeightKg * materials.filamentPrice

        // 2. Электроэнергия
        const printTimeHours = electricity.printTime / 60
        const energyConsumptionKwh = (electricity.powerConsumption * printTimeHours) / 1000
        const electricityCost = energyConsumptionKwh * electricity.electricityPrice

        // 3. Амортизация
        const depreciationPerHour = depreciation.printerCost / depreciation.printResource
        const depreciationCost = depreciationPerHour * printTimeHours

        // 4. Работа оператора
        const workTimeHours = labor.workTime / 60
        const laborCost = labor.hourlyRate * workTimeHours

        // 5. Себестоимость
        const primeCost = materialsCost + electricityCost + depreciationCost + laborCost

        // 6. Дополнительные расходы
        const additionalExpenses = primeCost * (additional.additionalExpensesPercent / 100)

        // 7. Полная себестоимость
        const fullCost = primeCost + additionalExpenses

        // 8. Цена с наценкой
        const marginAmount = fullCost * (additional.marginPercent / 100)
        const finalPrice = fullCost + marginAmount

        return {
            materialsCost,
            electricityCost,
            depreciationCost,
            laborCost,
            primeCost,
            additionalExpenses,
            fullCost,
            marginAmount,
            finalPrice,
            totalWeightGrams,
            modelCost,
            supportCost
        }
    }

    const results = calculateCost()
    
    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Заголовок */}
                <div className="flex justify-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 ml-8">
                        Калькулятор стоимости 3D-печати
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Левая колонка - форма */}
                    <div className="lg:col-span-2">
                        <Card className="border-2 shadow-lg">
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
                            </CardContent>
                        </Card>
                    </div>

                    {/* Правая колонка - результаты */}
                    <div>
                        <Card className="border-2 shadow-lg h-full">
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Вес */}
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 mb-2">Общий вес</h3>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {results.totalWeightGrams.toFixed(1)} г
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                ({(results.totalWeightGrams / 1000).toFixed(3)} кг)
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
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm flex items-center gap-2">
                                                            <Package className="h-4 w-4" />
                                                            Материалы
                                                        </span>
                                                        <span className="font-medium">{results.materialsCost.toFixed(2)} ₽</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm pl-4 relative">
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
                                                        <span className="text-sm pl-1 text-muted-foreground">Модель</span>
                                                        <span className="font-medium text-muted-foreground">{results.modelCost.toFixed(2)} ₽</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm pl-4 relative">
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
                                                        <span className="flex items-center gap-2 pl-1 text-muted-foreground">Поддержки</span>
                                                        <span className="text-muted-foreground">{results.supportCost.toFixed(2)} ₽</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm flex items-center gap-2">
                                                        <Zap className="h-4 w-4" />
                                                        Электричество
                                                    </span>
                                                    <span className="font-medium">{results.electricityCost.toFixed(2)} ₽</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm flex items-center gap-2">
                                                        <Cpu className="h-4 w-4" />
                                                        Амортизация
                                                    </span>
                                                    <span className="font-medium">{results.depreciationCost.toFixed(2)} ₽</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm flex items-center gap-2">
                                                        <User className="h-4 w-4" />
                                                        Оператор
                                                    </span>
                                                    <span className="font-medium">{results.laborCost.toFixed(2)} ₽</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Себестоимость */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold">Полная себестоимость</span>
                                                <span className="font-bold">{results.fullCost.toFixed(2)} ₽</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm pl-4 relative">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300 "></div>
                                                <span className="text-sm text-muted-foreground pl-1">Себестоимость</span>
                                                <span className="font-medium text-muted-foreground">{results.primeCost.toFixed(2)} ₽</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm pl-4 relative">
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-px bg-gray-300"></div>
                                                <span className="flex items-center gap-2 text-muted-foreground pl-1">
                                                    <Percent className="h-3 w-3" />
                                                    Доп. расходы ({additional.additionalExpensesPercent}%)
                                                </span>
                                                <span className="text-muted-foreground">+{results.additionalExpenses.toFixed(2)} ₽</span>
                                            </div>
                                        </div>
                                        <Separator />

                                        {/* Итоговая цена */}
                                        <div className="bg-primary/5 p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold">Маржа ({additional.marginPercent}%)</span>
                                                <span className="font-bold text-primary">+{results.marginAmount.toFixed(2)} ₽</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-3 border-t border-primary/20">
                                                <span className="text-lg font-bold">Итоговая цена</span>
                                                <span className="text-2xl font-bold text-primary">{results.finalPrice.toFixed(2)} ₽</span>
                                            </div>
                                        </div>

                                        {/* Стоимость за грамм */}
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm text-gray-600">Стоимость печати за грамм</div>
                                            <div className="text-xl font-bold text-gray-900">
                                                {(results.finalPrice / results.totalWeightGrams).toFixed(2)} ₽/г
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Кнопки действий */}
                <div className="mt-6 flex justify-center gap-4">
                    <Button variant="outline" size="lg" onClick={() => {
                        // Сброс значений к стандартным
                        setMaterials({ modelWeight: 100, supportWeight: 20, filamentPrice: 1500 })
                        setElectricity({ powerConsumption: 200, printTime: 300, electricityPrice: 6.5 })
                        setDepreciation({ printerCost: 50000, printResource: 5000 })
                        setLabor({ hourlyRate: 500, workTime: 60 })
                        setAdditional({ additionalExpensesPercent: 15, marginPercent: 30 })
                    }}>
                        Сбросить значения
                    </Button>
                    <Button size="lg" onClick={() => window.print()}>
                        Распечатать расчет
                    </Button>
                </div>
            </div>
        </div>
    )
}