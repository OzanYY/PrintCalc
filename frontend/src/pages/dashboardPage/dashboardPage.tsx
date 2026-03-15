"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import { 
  Printer, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  RefreshCw,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Factory,
  Timer,
  Weight,
  Zap
} from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

// Типы данных
interface DailyStats {
  date: string
  orders: number
  revenue: number
  profit: number
  printTime: number
  materialUsed: number
}

interface PrinterStats {
  name: string
  orders: number
  revenue: number
  utilization: number
  failureRate: number
}

interface MaterialStats {
  name: string
  type: string
  used: number
  cost: number
}

// Генерация данных для графиков
const generateDailyData = (days: number): DailyStats[] => {
  const data = []
  const endDate = new Date("2024-06-30")
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      orders: Math.floor(Math.random() * 30) + 10,
      revenue: Math.floor(Math.random() * 50000) + 20000,
      profit: Math.floor(Math.random() * 15000) + 5000,
      printTime: Math.floor(Math.random() * 100) + 50,
      materialUsed: Math.floor(Math.random() * 5000) + 1000,
    })
  }
  return data
}

// Данные по принтерам
const printerData: PrinterStats[] = [
  { name: "Creality Ender 3", orders: 156, revenue: 425000, utilization: 85, failureRate: 8 },
  { name: "Anycubic Photon", orders: 98, revenue: 380000, utilization: 72, failureRate: 12 },
  { name: "Prusa MK4", orders: 142, revenue: 395000, utilization: 92, failureRate: 5 },
  { name: "Formlabs Form 3", orders: 67, revenue: 295000, utilization: 68, failureRate: 7 },
  { name: "EOS P396", orders: 45, revenue: 520000, utilization: 78, failureRate: 4 },
]

// Данные по материалам
const materialData: MaterialStats[] = [
  { name: "PLA Basic", type: "filament", used: 12500, cost: 312500 },
  { name: "ABS Pro", type: "filament", used: 5600, cost: 179200 },
  { name: "Standard Resin", type: "resin", used: 3200, cost: 144000 },
  { name: "Nylon 12", type: "powder", used: 850, cost: 102000 },
  { name: "PETG", type: "filament", used: 3800, cost: 114000 },
]

// Статусы заказов
const orderStatusData = [
  { name: "Завершены", value: 987, color: "#10b981" },
  { name: "В процессе", value: 198, color: "#3b82f6" },
  { name: "Отменены", value: 60, color: "#ef4444" },
]

// Конфигурация для графиков
const chartConfig = {
  orders: {
    label: "Заказы",
    color: "hsl(var(--chart-1))",
  },
  revenue: {
    label: "Выручка",
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Прибыль",
    color: "hsl(var(--chart-3))",
  },
  printTime: {
    label: "Время печати",
    color: "hsl(var(--chart-4))",
  },
  materialUsed: {
    label: "Использовано материалов",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

export default function StatisticsPage() {
  const [timeRange, setTimeRange] = React.useState("90d")
  const [activeTab, setActiveTab] = React.useState("overview")
  
  // Генерация данных в зависимости от выбранного периода
  const daysToGenerate = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
  const chartData = React.useMemo(() => generateDailyData(daysToGenerate), [daysToGenerate])

  // Фильтрация данных по дате
  const filteredData = React.useMemo(() => {
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    return chartData.filter((item) => {
      const date = new Date(item.date)
      return date >= startDate
    })
  }, [timeRange, chartData])

  // Расчет суммарных показателей
  const totalStats = React.useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        orders: acc.orders + curr.orders,
        revenue: acc.revenue + curr.revenue,
        profit: acc.profit + curr.profit,
        printTime: acc.printTime + curr.printTime,
        materialUsed: acc.materialUsed + curr.materialUsed,
      }),
      { orders: 0, revenue: 0, profit: 0, printTime: 0, materialUsed: 0 }
    )
  }, [filteredData])

  // Форматирование валюты
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Форматирование чисел
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value)
  }

  // Форматирование времени
  const formatTime = (hours: number) => {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}д ${remainingHours}ч`
  }


  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Статистика производства</h1>
          <p className="text-muted-foreground">
            Аналитика и мониторинг всех показателей 3D печати
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Карточки с основными показателями */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.orders)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="mr-1">
                +{Math.round(totalStats.orders / filteredData.length)} в день
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.revenue)}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+12.5% к прошлому периоду</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.profit)}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Маржа {Math.round((totalStats.profit / totalStats.revenue) * 100)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Время печати</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalStats.printTime)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Timer className="h-3 w-3 mr-1" />
              <span>Среднее {Math.round(totalStats.printTime / totalStats.orders)} ч/заказ</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Основной график */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Динамика производства</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Заказы, выручка и прибыль за выбранный период
            </span>
            <span className="@[540px]/card:hidden">Основные показатели</span>
          </CardDescription>
          <CardAction>
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(value) => value && setTimeRange(value)}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
            >
              <ToggleGroupItem value="90d">3 месяца</ToggleGroupItem>
              <ToggleGroupItem value="30d">30 дней</ToggleGroupItem>
              <ToggleGroupItem value="7d">7 дней</ToggleGroupItem>
            </ToggleGroup>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Выберите период"
              >
                <SelectValue placeholder="3 месяца" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  3 месяца
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  30 дней
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  7 дней
                </SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[350px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-orders)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-orders)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-profit)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-profit)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="orders"
                type="monotone"
                fill="url(#fillOrders)"
                stroke="var(--color-orders)"
                stackId="1"
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                stackId="2"
              />
              <Area
                dataKey="profit"
                type="monotone"
                fill="url(#fillProfit)"
                stroke="var(--color-profit)"
                stackId="3"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Дополнительные графики */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="printers">Принтеры</TabsTrigger>
          <TabsTrigger value="materials">Материалы</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* График статусов заказов */}
            <Card>
              <CardHeader>
                <CardTitle>Статусы заказов</CardTitle>
                <CardDescription>Распределение по текущему состоянию</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="aspect-square h-[250px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => [
                            `${value} заказов`,
                            name,
                          ]}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 mt-4">
                  {orderStatusData.map((status) => (
                    <div key={status.name} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                      <span className="text-xs">{status.name}: {status.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* График использования материалов */}
            <Card>
              <CardHeader>
                <CardTitle>Использование материалов</CardTitle>
                <CardDescription>По категориям</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materialData.slice(0, 3).map((material) => (
                    <div key={material.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{material.name}</span>
                        <span className="font-medium">{material.used} г</span>
                      </div>
                      <Progress value={material.used / 200} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Затраты: {formatCurrency(material.cost)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="printers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Производительность принтеров</CardTitle>
              <CardDescription>Статистика по каждому устройству</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {printerData.map((printer) => (
                  <div key={printer.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{printer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {printer.orders} заказов · {formatCurrency(printer.revenue)}
                        </p>
                      </div>
                      <Badge variant={printer.utilization > 80 ? "default" : "secondary"}>
                        Загрузка {printer.utilization}%
                      </Badge>
                    </div>
                    <Progress value={printer.utilization} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Успешность {100 - printer.failureRate}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        В работе
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Расход материалов</CardTitle>
              <CardDescription>Детальная информация по материалам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {materialData.map((material) => (
                  <div key={material.name} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="font-medium">{material.name}</p>
                      <p className="text-sm text-muted-foreground">{material.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{material.used} г</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(material.cost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Дополнительная информация */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние заказы</CardTitle>
            <CardDescription>Недавняя активность</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors">
                  <div>
                    <p className="font-medium">Заказ #ORD-{2024000 + i}</p>
                    <p className="text-xs text-muted-foreground">Фигурка дракона</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50">Завершен</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Рекомендации</CardTitle>
            <CardDescription>На основе анализа данных</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-3 items-start p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Увеличьте производство SLS</p>
                  <p className="text-sm text-muted-foreground">Спрос вырос на 25% за последний месяц</p>
                </div>
              </div>
              <div className="flex gap-3 items-start p-2 bg-green-50 dark:bg-green-950/50 rounded-lg">
                <Package className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Закупка PLA оптом</p>
                  <p className="text-sm text-muted-foreground">Экономия до 15% при закупке от 50 кг</p>
                </div>
              </div>
              <div className="flex gap-3 items-start p-2 bg-orange-50 dark:bg-orange-950/50 rounded-lg">
                <Printer className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Обслуживание принтера Photon</p>
                  <p className="text-sm text-muted-foreground">Повышенный процент брака, требуется калибровка</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}