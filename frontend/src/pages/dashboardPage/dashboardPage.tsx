"use client"

import * as React from "react"
import {
  Area, AreaChart, Bar, BarChart, Pie, PieChart,
  CartesianGrid, XAxis, YAxis, Cell, ResponsiveContainer,
} from "recharts"
import {
  Printer, Package, ShoppingCart, DollarSign, Clock,
  TrendingUp, Calendar, Download, RefreshCw, Award,
  CheckCircle2, Timer, Loader2,
} from "lucide-react"
import { toast } from "sonner"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction,
} from "@/components/ui/card"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

import { ordersAPI, downloadOrdersCSV } from "@/api/orders"
import type { OrderStatsResponse } from "@/api/orders"
import { useOrders } from "@/hooks/useOrders"

// ─── Типы ─────────────────────────────────────────────────────────────────────

type Period = "all" | "week" | "month" | "year"

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value)

const formatHours = (totalHours: number) => {
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days === 0) return `${hours}ч`
  return `${days}д ${hours}ч`
}

const toNum = (v: unknown) => {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

// ─── Конфигурация графиков ────────────────────────────────────────────────────

const chartConfig = {
  orders_count: { label: "Заказы",   color: "hsl(var(--chart-1))" },
  revenue:      { label: "Выручка",  color: "hsl(var(--chart-2))" },
  completed:    { label: "Завершены",color: "hsl(var(--chart-3))" },
  cancelled:    { label: "Отменены", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig

const STATUS_COLORS: Record<string, string> = {
  completed:   "#10b981",
  in_progress: "#3b82f6",
  cancelled:   "#ef4444",
}
const STATUS_LABELS: Record<string, string> = {
  completed:   "Завершены",
  in_progress: "В процессе",
  cancelled:   "Отменены",
}

// ─── Скелетон-карточка ────────────────────────────────────────────────────────

const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-4 w-28" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-36 mb-2" />
      <Skeleton className="h-3 w-24" />
    </CardContent>
  </Card>
)

// ─── Компонент страницы ───────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [period, setPeriod] = React.useState<Period>("month")
  const [activeTab, setActiveTab] = React.useState("overview")
  const [statsData, setStatsData] = React.useState<OrderStatsResponse | null>(null)
  const [isStatsLoading, setIsStatsLoading] = React.useState(false)

  // Последние заказы берём из useOrders
  const { orders: recentOrders, isLoading: isOrdersLoading } = useOrders({
    autoFetch: true,
    pageSize: 5,
  })

  // ─── Загрузка статистики ──────────────────────────────────────────────────
  const fetchStats = React.useCallback(async (p: Period) => {
    setIsStatsLoading(true)
    try {
      const res = await ordersAPI.getStats(p)
      setStatsData(res.data.data)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Ошибка загрузки статистики", {
        position: "top-center",
        duration: 5000,
      })
    } finally {
      setIsStatsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchStats(period)
  }, [period, fetchStats])

  // ─── Производные данные ───────────────────────────────────────────────────
  const summary = statsData?.summary

  const totalOrders    = toNum(summary?.total_orders)
  const inProgress     = toNum(summary?.in_progress_orders)
  const completed      = toNum(summary?.completed_orders)
  const cancelled      = toNum(summary?.cancelled_orders)
  const totalRevenue   = toNum(summary?.total_revenue)
  const totalProfit    = toNum(summary?.total_profit)
  const totalExpenses  = toNum(summary?.total_expenses)
  const totalFilament  = toNum(summary?.total_filament_used)
  const totalPrintTime = toNum(summary?.total_print_time) // минуты
  const avgOrderValue  = toNum(summary?.avg_order_value)

  const marginPercent = totalRevenue > 0
    ? ((totalProfit / totalRevenue) * 100).toFixed(1)
    : "0"

  const conversionRate    = statsData?.analytics?.conversion_rate    ?? "0"
  const avgProfitMargin   = statsData?.analytics?.average_profit_margin ?? "0"
  const avgCostPerGram    = statsData?.analytics?.average_cost_per_gram ?? "0"

  // Данные для кольцевой диаграммы статусов
  const pieData = React.useMemo(() => {
    if (!statsData?.by_status?.length) return []
    return statsData.by_status.map(s => ({
      name:   STATUS_LABELS[s.status] ?? s.status,
      value:  toNum(s.count),
      color:  STATUS_COLORS[s.status] ?? "#94a3b8",
      status: s.status,
      total_value: toNum(s.total_value),
    }))
  }, [statsData])

  // Данные для барного графика по месяцам
  const monthlyData = React.useMemo(() => {
    if (!statsData?.monthly?.length) return []
    const monthNames = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"]
    return statsData.monthly.map(m => ({
      month:         monthNames[(toNum(m.month) - 1)] ?? `М${m.month}`,
      orders_count:  toNum(m.orders_count),
      revenue:       toNum(m.revenue),
      completed:     toNum(m.completed_count),
      cancelled:     toNum(m.cancelled_count),
      filament_used: toNum(m.filament_used),
    }))
  }, [statsData])

  // ─── Экспорт ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const id = "stats-export"
    toast.loading("Подготовка экспорта...", { position: "top-center", id })
    const result = await downloadOrdersCSV()
    if (result.success) {
      toast.success("CSV скачан", { position: "top-center", duration: 3000, id })
    } else {
      toast.error("Ошибка экспорта", { position: "top-center", duration: 5000, id })
    }
  }

  const periodLabel: Record<Period, string> = {
    all:   "За всё время",
    week:  "За неделю",
    month: "За месяц",
    year:  "За год",
  }

  // ─── Рендер ───────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6 max-w-7xl">

      {/* Заголовок */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Статистика производства</h1>
          <p className="text-muted-foreground">
            Аналитика и мониторинг всех показателей 3D-печати
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">За неделю</SelectItem>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="year">За год</SelectItem>
              <SelectItem value="all">За всё время</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchStats(period)}
            disabled={isStatsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isStatsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI-карточки */}
      {isStatsLoading && !statsData ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalOrders)}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {inProgress} в работе
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
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <span>Средний чек: {formatCurrency(avgOrderValue)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
              <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>Маржа {marginPercent}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Время печати</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatHours(Math.floor(totalPrintTime / 60))}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Timer className="h-3 w-3 mr-1" />
                <span>
                  {completed > 0
                    ? `~${Math.round(totalPrintTime / 60 / completed)} ч/заказ`
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Аналитика — вторая строка KPI */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Конверсия</CardTitle>
            <CardDescription>Завершённые / все заказы</CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading && !statsData
              ? <Skeleton className="h-8 w-24" />
              : <>
                  <div className="text-2xl font-bold">{conversionRate}%</div>
                  <Progress value={toNum(conversionRate)} className="h-2 mt-2" />
                </>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Средняя маржа</CardTitle>
            <CardDescription>По завершённым заказам</CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading && !statsData
              ? <Skeleton className="h-8 w-24" />
              : <div className="text-2xl font-bold text-green-600">{avgProfitMargin}%</div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Расход филамента</CardTitle>
            <CardDescription>По завершённым заказам</CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading && !statsData
              ? <Skeleton className="h-8 w-24" />
              : <>
                  <div className="text-2xl font-bold">
                    {totalFilament >= 1000
                      ? `${(totalFilament / 1000).toFixed(2)} кг`
                      : `${totalFilament.toFixed(0)} г`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ~{avgCostPerGram} ₽/г средняя стоимость
                  </div>
                </>
            }
          </CardContent>
        </Card>
      </div>

      {/* Табы с графиками */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="monthly">По месяцам</TabsTrigger>
        </TabsList>

        {/* Обзор — статусы + расходы */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">

            {/* Пирог статусов */}
            <Card>
              <CardHeader>
                <CardTitle>Статусы заказов</CardTitle>
                <CardDescription>{periodLabel[period]}</CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading && !statsData ? (
                  <div className="flex justify-center items-center h-[250px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pieData.length === 0 ? (
                  <div className="flex justify-center items-center h-[250px] text-muted-foreground text-sm">
                    Нет данных
                  </div>
                ) : (
                  <>
                    <ChartContainer config={chartConfig} className="aspect-square h-[220px] w-full">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => [`${value} заказов`, name]}
                            />
                          }
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {pieData.map(s => (
                        <div key={s.status} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-muted-foreground">{s.name}:</span>
                          <span className="font-medium">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Разбивка расходов */}
            <Card>
              <CardHeader>
                <CardTitle>Финансовый итог</CardTitle>
                <CardDescription>{periodLabel[period]}</CardDescription>
              </CardHeader>
              <CardContent>
                {isStatsLoading && !statsData ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: "Выручка",     value: totalRevenue,  color: "bg-chart-2", pct: 100 },
                      { label: "Себестоимость", value: totalExpenses, color: "bg-chart-5",
                        pct: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0 },
                      { label: "Прибыль",     value: totalProfit,   color: "bg-chart-3",
                        pct: totalRevenue > 0 ? (totalProfit  / totalRevenue) * 100 : 0 },
                    ].map(({ label, value, color, pct }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{formatCurrency(value)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`${color} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 text-right">
                          {pct.toFixed(1)}% от выручки
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 border-t space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Завершено заказов</span>
                        <span className="font-medium text-green-600">{completed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Отменено заказов</span>
                        <span className="font-medium text-red-500">{cancelled}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* График по месяцам */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Динамика по месяцам</CardTitle>
              <CardDescription>Заказы и выручка</CardDescription>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              {isStatsLoading && !statsData ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="flex justify-center items-center h-[300px] text-muted-foreground text-sm">
                  Нет данных за выбранный период
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="left"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={35}
                    />
                    <YAxis
                      yAxisId="revenue"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={70}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}к`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            if (name === "revenue") return [formatCurrency(Number(value)), "Выручка"]
                            return [value, name === "orders_count" ? "Заказы" : name]
                          }}
                        />
                      }
                    />
                    <Bar
                      yAxisId="orders"
                      dataKey="orders_count"
                      fill="var(--color-orders_count)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      yAxisId="revenue"
                      dataKey="revenue"
                      fill="var(--color-revenue)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Таблица по месяцам */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Детали по месяцам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2 font-medium">Месяц</th>
                        <th className="text-right pb-2 font-medium">Заказов</th>
                        <th className="text-right pb-2 font-medium">Завершено</th>
                        <th className="text-right pb-2 font-medium">Отменено</th>
                        <th className="text-right pb-2 font-medium">Выручка</th>
                        <th className="text-right pb-2 font-medium">Филамент</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map(row => (
                        <tr key={row.month} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2 font-medium">{row.month}</td>
                          <td className="py-2 text-right">{row.orders_count}</td>
                          <td className="py-2 text-right text-green-600">{row.completed}</td>
                          <td className="py-2 text-right text-red-500">{row.cancelled}</td>
                          <td className="py-2 text-right">{formatCurrency(row.revenue)}</td>
                          <td className="py-2 text-right">{row.filament_used.toFixed(0)} г</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Последние заказы + итог */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Последние заказы</CardTitle>
            <CardDescription>Недавняя активность</CardDescription>
          </CardHeader>
          <CardContent>
            {isOrdersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Нет заказов</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.slice(0, 5).map(order => {
                  const finalPrice = toNum(order.final_price) ||
                    toNum((order.calc_result as any)?.finalPrice?.value)
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{order.name}</p>
                        <p className="text-xs text-muted-foreground">
                          #{order.id} · {new Date(order.created_at).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-medium">{formatCurrency(finalPrice)}</span>
                        <Badge
                          variant="outline"
                          className={
                            order.status === "completed" ? "text-green-600 border-green-200" :
                            order.status === "in_progress" ? "text-blue-600 border-blue-200" :
                            "text-red-500 border-red-200"
                          }
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сводка периода</CardTitle>
            <CardDescription>{periodLabel[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {isStatsLoading && !statsData ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { icon: ShoppingCart,  label: "Всего заказов",      value: formatNumber(totalOrders) },
                  { icon: CheckCircle2,  label: "Завершено",           value: formatNumber(completed),   cls: "text-green-600" },
                  { icon: DollarSign,    label: "Выручка",             value: formatCurrency(totalRevenue) },
                  { icon: TrendingUp,    label: "Прибыль",             value: formatCurrency(totalProfit), cls: "text-green-600" },
                  { icon: Package,       label: "Использовано материала",
                    value: totalFilament >= 1000
                      ? `${(totalFilament / 1000).toFixed(2)} кг`
                      : `${totalFilament.toFixed(0)} г` },
                  { icon: Clock,         label: "Суммарное время",
                    value: formatHours(Math.floor(totalPrintTime / 60)) },
                ].map(({ icon: Icon, label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </div>
                    <span className={`text-sm font-semibold ${cls ?? ""}`}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}