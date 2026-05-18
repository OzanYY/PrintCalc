"use client"

import * as React from "react"
import {
  Area, AreaChart, Bar, BarChart, Pie, PieChart, Line, LineChart,
  CartesianGrid, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, Legend,
  RadialBarChart, RadialBar,
} from "recharts"
import {
  Printer, Package, ShoppingCart, DollarSign, Clock, TrendingUp,
  TrendingDown, Calendar, Download, RefreshCw, Award, CheckCircle2,
  Timer, Loader2, Zap, BarChart2, AlertTriangle, Activity, Target,
  Layers, ArrowUpRight, ArrowDownRight, Minus, Info, Star, Cpu,
  Box, FlaskConical, Hash, Percent, Banknote, Scale, ReceiptText, HelpCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

import { ordersAPI, downloadOrdersCSV } from "@/api/orders"
import type { OrderStatsResponse, Order } from "@/api/orders"
import { printersAPI } from "@/api/printers"
import type { Printer as PrinterType } from "@/api/printers"
import { materialsAPI } from "@/api/materials"
import type { Material } from "@/api/materials"

// ─── Types ─────────────────────────────────────────────────────────────────────

type Period = "all" | "week" | "month" | "year"

interface PrinterStat {
  id: number
  name: string
  type: string
  purchase_price: number
  print_lifetime_hours: number
  power_consumption: number
  orders: number
  revenue: number
  profit: number
  total_print_time_minutes: number
  total_weight_grams: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)

const fmtNum = (v: number) => new Intl.NumberFormat("ru-RU").format(v)

const fmtHours = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}

const fmtWeight = (grams: number) =>
  grams >= 1000 ? `${(grams / 1000).toFixed(2)} кг` : `${grams.toFixed(0)} г`

const toNum = (v: unknown) => {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

const median = (arr: number[]) => {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── Delta badge ───────────────────────────────────────────────────────────────

const Delta = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  if (value === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0{suffix}</span>
  const positive = value > 0
  return (
    <span className={`text-xs flex items-center gap-0.5 font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor?: string
  delta?: { value: number; suffix?: string }
  loading?: boolean
  accent?: string
  tooltip?: string
}

const StatCard = ({ title, value, sub, icon: Icon, iconColor = "text-muted-foreground", delta, loading, accent, tooltip }: StatCardProps) => {
  const [showTip, setShowTip] = React.useState(false)

  if (loading) return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32 mb-1.5" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
  return (
    <Card className={accent ? `border-l-4 ${accent}` : ""}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate">{title}</CardTitle>
          {tooltip && (
            <div className="relative shrink-0">
              <button
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                onFocus={() => setShowTip(true)}
                onBlur={() => setShowTip(false)}
                aria-label="Подробнее"
                tabIndex={0}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              {showTip && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 rounded-md bg-popover border border-border shadow-md px-3 py-2 text-xs text-popover-foreground leading-relaxed pointer-events-none">
                  {tooltip}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
                </div>
              )}
            </div>
          )}
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          {delta && <Delta value={delta.value} suffix={delta.suffix} />}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Chart configs ─────────────────────────────────────────────────────────────

const monthlyChartConfig = {
  orders_count: { label: "Заказы", color: "hsl(var(--chart-1))" },
  revenue: { label: "Выручка", color: "hsl(var(--chart-2))" },
  profit: { label: "Прибыль", color: "hsl(var(--chart-3))" },
  filament_used: { label: "Филамент (г)", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  in_progress: "#3b82f6",
  cancelled: "#ef4444",
}
const STATUS_LABELS: Record<string, string> = {
  completed: "Завершены",
  in_progress: "В работе",
  cancelled: "Отменены",
}
const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

// ─── ROI Tab Component ─────────────────────────────────────────────────────────

interface RoiTabProps {
  printers: PrinterType[]
  printerStats: PrinterStat[]
  materials: Material[]
  materialStats: ReturnType<typeof Array.prototype.map> extends (infer T)[] ? T[] : any[]
  totalRevenue: number
  totalProfit: number
  totalExpenses: number
  totalElectricityCost: number
  monthlyData: any[]
  isLoading: boolean
  fmt: (v: number) => string
  fmtNum: (v: number) => string
}

const RoiTab = ({
  printers, printerStats, materials, materialStats,
  totalRevenue, totalProfit, totalExpenses, totalElectricityCost,
  monthlyData, isLoading, fmt, fmtNum,
}: RoiTabProps) => {
  const toNum = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0 }

  // Total capital invested in printers
  const totalPrinterInvestment = printers.reduce((s, p) => s + toNum(p.purchase_price), 0)

  // Total capital in materials stock (quantity * price_per_kg)
  const totalMaterialInvestment = materials.reduce((s, m) => s + toNum(m.quantity) * toNum(m.price_per_kg), 0)

  // Total material spend (what was actually consumed in orders)
  const totalMaterialSpend = (materialStats as any[]).reduce((s: number, m: any) => s + toNum(m.material_cost), 0)

  // Total investments = printers + materials purchased (stocked)
  const totalInvestment = totalPrinterInvestment + totalMaterialInvestment

  // Net payback: profit minus printer investments and material stock value
  const netPayback = totalRevenue - totalExpenses - totalPrinterInvestment

  // ROI percentage
  const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

  // Payback period in months (based on avg monthly profit)
  const avgMonthlyProfit = monthlyData.length > 0
    ? monthlyData.reduce((s: number, m: any) => s + toNum(m.profit), 0) / monthlyData.length
    : 0
  const paybackMonths = avgMonthlyProfit > 0 ? totalPrinterInvestment / avgMonthlyProfit : null

  // Per-printer ROI
  const printerRoi = printerStats.map(p => {
    const invested = toNum(p.purchase_price)
    const roiPct = invested > 0 ? (p.profit / invested) * 100 : 0
    const monthsToPayback = avgMonthlyProfit > 0
      ? invested / Math.max(p.profit / Math.max(monthlyData.length, 1), 0.01)
      : null
    const earned = p.profit
    const remaining = invested - p.revenue
    const pct = invested > 0 ? Math.min((p.revenue / invested) * 100, 100) : 0
    return { ...p, invested, roiPct, monthsToPayback, earned, remaining, pct }
  }).sort((a, b) => b.roiPct - a.roiPct)

  // Breakdown of costs
  const costBreakdown = [
    { label: "Принтеры (капитал)", value: totalPrinterInvestment, color: "#3b82f6" },
    { label: "Материалы (запас)", value: totalMaterialInvestment, color: "#8b5cf6" },
    { label: "Расход материалов", value: totalMaterialSpend, color: "#f59e0b" },
    { label: "Электроэнергия", value: totalElectricityCost, color: "#ef4444" },
  ]

  // Monthly cumulative ROI data
  let cumRevenue = 0
  let cumCost = totalPrinterInvestment + totalMaterialInvestment
  const cumulativeData = monthlyData.map((m, i) => {
    cumRevenue += toNum(m.revenue)
    const operCost = toNum(m.revenue) * (1 - (totalProfit / Math.max(totalRevenue, 1)))
    cumCost += operCost
    const cumProfit = cumRevenue - totalPrinterInvestment - totalMaterialInvestment
    return {
      month: m.month,
      cumRevenue,
      cumProfit,
      breakeven: totalPrinterInvestment + totalMaterialInvestment,
    }
  })

  return (
    <>
      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Вложено в принтеры"
          value={fmt(totalPrinterInvestment)}
          sub={`${printers.length} принт.`}
          icon={Printer}
          iconColor="text-blue-500"
          loading={isLoading}
          accent="border-blue-400"
          tooltip="Суммарная стоимость покупки всех принтеров в вашем парке. Это капитальные вложения, которые необходимо отбить через выручку."
        />
        <StatCard
          title="Вложено в материалы"
          value={fmt(totalMaterialInvestment)}
          sub="остаток на складе"
          icon={Package}
          iconColor="text-purple-500"
          loading={isLoading}
          accent="border-purple-400"
          tooltip="Рыночная стоимость материалов, хранящихся на складе прямо сейчас (количество × цена/кг). Это замороженный капитал."
        />
        <StatCard
          title="Чистая прибыль"
          value={fmt(totalProfit)}
          sub={`из ${fmt(totalRevenue)} выручки`}
          icon={TrendingUp}
          iconColor={totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}
          loading={isLoading}
          accent={totalProfit >= 0 ? "border-emerald-400" : "border-red-400"}
          tooltip="Разница между выручкой и операционными затратами (материалы + электроэнергия + амортизация). Именно эта сумма идёт на покрытие капитальных вложений."
        />
        <StatCard
          title="ROI"
          value={`${roi.toFixed(1)}%`}
          sub={roi >= 0 ? "прибыль на вложения" : "убыток"}
          icon={Percent}
          iconColor={roi >= 0 ? "text-emerald-600" : "text-red-500"}
          loading={isLoading}
          accent={roi >= 100 ? "border-emerald-400" : roi >= 0 ? "border-yellow-400" : "border-red-400"}
          tooltip="Return on Investment — отношение чистой прибыли к суммарным вложениям (принтеры + склад). 100% означает, что вложения полностью отбиты."
        />
      </div>

      {/* Payback summary card */}
      <Card className={netPayback >= 0 ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20" : "border-orange-200 bg-orange-50 dark:bg-orange-950/20"}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-base flex items-center gap-2 ${netPayback >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-orange-700 dark:text-orange-400"}`}>
            <Scale className="h-4 w-4" />
            {netPayback >= 0 ? "Инвестиции окупились" : "Инвестиции ещё не окупились"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-0.5">Всего вложено</div>
            <div className="text-xl font-bold">{fmt(totalInvestment)}</div>
            <div className="text-xs text-muted-foreground">принтеры + склад материалов</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-0.5">Выручка за период</div>
            <div className="text-xl font-bold">{fmt(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground">все завершённые заказы</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-0.5">
              {paybackMonths != null ? "Срок окупаемости принтеров" : "Данных для расчёта нет"}
            </div>
            {paybackMonths != null ? (
              <>
                <div className="text-xl font-bold">
                  {paybackMonths < 1 ? "< 1 мес." : paybackMonths > 120 ? "> 10 лет" : `${paybackMonths.toFixed(1)} мес.`}
                </div>
                <div className="text-xs text-muted-foreground">при среднемесячной прибыли {fmt(avgMonthlyProfit)}</div>
              </>
            ) : (
              <div className="text-xl font-bold text-muted-foreground">—</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts row: cost breakdown + cumulative ROI */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cost breakdown pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Структура затрат</CardTitle>
            <CardDescription>Капитальные и операционные расходы</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
              : (
                <>
                  <ChartContainer config={{}} className="h-44 w-full">
                    <PieChart>
                      <Pie data={costBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                        {costBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [fmt(Number(v)), ""]} />
                    </PieChart>
                  </ChartContainer>
                  <div className="space-y-2 mt-2">
                    {costBreakdown.map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                          <span className="text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="font-medium">{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            }
          </CardContent>
        </Card>

        {/* Cumulative revenue vs investment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Накопительная выручка vs вложения</CardTitle>
            <CardDescription>Когда выручка превысит капитал</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
              : cumulativeData.length === 0
              ? <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Нет данных по месяцам</div>
              : (
                <ChartContainer config={{}} className="h-52 w-full">
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="gCumRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={65} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
                    <Tooltip formatter={(v: any, n: any) => [fmt(Number(v)), n === "cumRevenue" ? "Накопит. выручка" : "Вложения"]} />
                    <Area type="monotone" dataKey="cumRevenue" stroke="#10b981" fill="url(#gCumRev)" strokeWidth={2} name="cumRevenue" />
                    <Line type="monotone" dataKey="breakeven" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="breakeven" />
                  </AreaChart>
                </ChartContainer>
              )
            }
          </CardContent>
        </Card>
      </div>

      {/* Per-printer ROI table */}
      {printerRoi.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ReceiptText className="h-4 w-4" />
              Окупаемость по каждому принтеру
            </CardTitle>
            <CardDescription>Сколько принтер заработал относительно своей стоимости</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    {["Принтер", "Цена покупки", "Выручка", "Прибыль", "Прогресс окупаемости", "ROI %", "Статус"].map(h =>
                      <th key={h} className="pb-2 font-medium text-left">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {printerRoi.map(p => {
                    const paidOff = p.revenue >= p.invested
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2">{fmt(p.invested)}</td>
                        <td className="py-2 text-emerald-600">{fmt(p.revenue)}</td>
                        <td className={`py-2 font-medium ${p.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(p.profit)}</td>
                        <td className="py-2 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted">
                              <div
                                className={`h-2 rounded-full transition-all ${paidOff ? "bg-emerald-500" : "bg-blue-400"}`}
                                style={{ width: `${p.pct.toFixed(0)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{p.pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className={`py-2 font-medium ${p.roiPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {p.roiPct.toFixed(1)}%
                        </td>
                        <td className="py-2">
                          {p.orders === 0
                            ? <Badge variant="outline" className="text-muted-foreground">Нет заказов</Badge>
                            : paidOff
                            ? <Badge variant="outline" className="text-emerald-600 border-emerald-200">Окупился</Badge>
                            : <Badge variant="outline" className="text-blue-600 border-blue-200">В процессе</Badge>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material cost efficiency */}
      {(materialStats as any[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Эффективность материалов
            </CardTitle>
            <CardDescription>Выручка относительно стоимости израсходованного материала</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    {["Материал", "Цена/кг", "Израсходовано", "Стоимость расхода", "Выручка", "Множитель"].map(h =>
                      <th key={h} className="pb-2 font-medium text-left">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...(materialStats as any[])].filter((m: any) => m.orders > 0).sort((a: any, b: any) => b.revenue - a.revenue).map((m: any) => {
                    const multiplier = m.material_cost > 0 ? m.revenue / m.material_cost : 0
                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td className="py-2">{fmt(m.price_per_kg)}/кг</td>
                        <td className="py-2">{m.weight_used_g >= 1000 ? `${(m.weight_used_g / 1000).toFixed(2)} кг` : `${m.weight_used_g.toFixed(0)} г`}</td>
                        <td className="py-2 text-orange-600">{fmt(m.material_cost)}</td>
                        <td className="py-2 text-emerald-600">{fmt(m.revenue)}</td>
                        <td className={`py-2 font-bold ${multiplier >= 3 ? "text-emerald-600" : multiplier >= 1.5 ? "text-yellow-600" : "text-red-500"}`}>
                          ×{multiplier.toFixed(1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [period, setPeriod] = React.useState<Period>("month")
  const [activeTab, setActiveTab] = React.useState("overview")
  const [statsData, setStatsData] = React.useState<OrderStatsResponse | null>(null)
  const [allOrders, setAllOrders] = React.useState<Order[]>([])
  const [printers, setPrinters] = React.useState<PrinterType[]>([])
  const [materials, setMaterials] = React.useState<Material[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // ─── Data loading ──────────────────────────────────────────────────────────
  const fetchAll = React.useCallback(async (p: Period) => {
    setIsLoading(true)
    try {
      const [statsRes, ordersRes, printersRes, materialsRes] = await Promise.allSettled([
        ordersAPI.getStats(p),
        ordersAPI.getAll({ limit: 1000 }),
        printersAPI.getAll(),
        materialsAPI.getAll(),
      ])

      if (statsRes.status === "fulfilled") setStatsData(statsRes.value.data.data)
      if (ordersRes.status === "fulfilled") setAllOrders((ordersRes.value.data as any).data ?? [])
      if (printersRes.status === "fulfilled") setPrinters((printersRes.value.data as any).data ?? [])
      if (materialsRes.status === "fulfilled") setMaterials((materialsRes.value.data as any).data ?? [])
    } catch {
      toast.error("Ошибка загрузки данных", { position: "top-center" })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchAll(period) }, [period, fetchAll])

  // ─── Computed: summary ────────────────────────────────────────────────────
  const s = statsData?.summary
  const totalOrders = toNum(s?.total_orders)
  const inProgress = toNum(s?.in_progress_orders)
  const completed = toNum(s?.completed_orders)
  const cancelled = toNum(s?.cancelled_orders)
  const totalRevenue = toNum(s?.total_revenue)
  const totalProfit = toNum(s?.total_profit)
  const totalExpenses = toNum(s?.total_expenses)
  const totalFilament = toNum(s?.total_filament_used)
  const totalPrintTime = toNum(s?.total_print_time)
  const avgOrderValue = toNum(s?.avg_order_value)

  const cancellationRate = totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0
  const completionRate = totalOrders > 0 ? (completed / totalOrders) * 100 : 0
  const conversionRate = toNum(statsData?.analytics?.conversion_rate)
  const avgMargin = toNum(statsData?.analytics?.average_profit_margin)
  const avgCostPerGram = toNum(statsData?.analytics?.average_cost_per_gram)
  const grossMarginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0

  // ─── Computed: orders-based analytics ─────────────────────────────────────
  const completedOrders = React.useMemo(
    () => allOrders.filter(o => o.status === "completed"),
    [allOrders]
  )

  const prices = completedOrders.map(o => toNum(o.final_price))
  const medianPrice = median(prices)

  const avgCompletionDays = React.useMemo(() => {
    const withDates = completedOrders.filter(o => o.completed_at && o.created_at)
    if (!withDates.length) return 0
    const total = withDates.reduce((sum, o) => {
      const diff = new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()
      return sum + diff / (1000 * 60 * 60 * 24)
    }, 0)
    return total / withDates.length
  }, [completedOrders])

  // ─── Computed: printer analytics ─────────────────────────────────────────
  const printerStats: PrinterStat[] = React.useMemo(() => {
    return printers.map(p => {
      const printerOrders = allOrders.filter(o => o.printer_id === p.id)
      const doneOrders = printerOrders.filter(o => o.status === "completed")
      const revenue = doneOrders.reduce((s, o) => s + toNum(o.final_price), 0)
      const cost = doneOrders.reduce((s, o) => s + toNum(o.total_cost), 0)
      const printTime = printerOrders.reduce((s, o) => s + toNum(o.print_time_minutes), 0)
      const weight = doneOrders.reduce((s, o) => s + toNum(o.total_weight_grams), 0)
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        purchase_price: p.purchase_price,
        print_lifetime_hours: p.print_lifetime_hours,
        power_consumption: p.power_consumption,
        orders: printerOrders.length,
        revenue,
        profit: revenue - cost,
        total_print_time_minutes: printTime,
        total_weight_grams: weight,
      }
    })
  }, [printers, allOrders])

  const usedHours = React.useMemo(
    () => printerStats.reduce((s, p) => s + p.total_print_time_minutes / 60, 0),
    [printerStats]
  )
  const totalLifetime = printers.reduce((s, p) => s + p.print_lifetime_hours, 0)
  const avgWearPct = totalLifetime > 0 ? (usedHours / totalLifetime) * 100 : 0
  const unusedPrinters = printerStats.filter(p => p.orders === 0)
  const busiestPrinter = [...printerStats].sort((a, b) => b.orders - a.orders)[0]

  // Electricity costs from orders
  const totalElectricityCost = React.useMemo(() => {
    return allOrders.reduce((sum, o) => {
      const elec = (o.calc_result as any)?.electricity?.value ?? 0
      return sum + toNum(elec)
    }, 0)
  }, [allOrders])

  // ─── Computed: material analytics ────────────────────────────────────────
  const materialStats = React.useMemo(() => {
    return materials.map(m => {
      const matOrders = allOrders.filter(o => o.material_id === m.id)
      const doneOrders = matOrders.filter(o => o.status === "completed")
      const revenue = doneOrders.reduce((s, o) => s + toNum(o.final_price), 0)
      const weightUsed = doneOrders.reduce((s, o) => s + toNum(o.total_weight_grams), 0)
      const cost = (weightUsed / 1000) * m.price_per_kg
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        type: m.type,
        price_per_kg: m.price_per_kg,
        quantity: m.quantity,
        orders: matOrders.length,
        revenue,
        weight_used_g: weightUsed,
        material_cost: cost,
      }
    })
  }, [materials, allOrders])

  // Monthly filament forecast
  const monthlyFilamentAvg = React.useMemo(() => {
    if (!statsData?.monthly?.length) return 0
    const months = statsData.monthly
    const total = months.reduce((s, m) => s + toNum(m.filament_used), 0)
    return total / months.length
  }, [statsData])

  // When material runs out
  const materialRunout = React.useMemo(() => {
    if (!monthlyFilamentAvg) return null
    const total = materials.reduce((s, m) => s + m.quantity * 1000, 0) // grams
    if (!total) return null
    const months = total / monthlyFilamentAvg
    return months
  }, [materials, monthlyFilamentAvg])

  // ─── Chart data ────────────────────────────────────────────────────────────
  const monthlyData = React.useMemo(() => {
    if (!statsData?.monthly?.length) return []
    return statsData.monthly.map(m => ({
      month: MONTH_NAMES[(toNum(m.month) - 1)] ?? `М${m.month}`,
      orders_count: toNum(m.orders_count),
      revenue: toNum(m.revenue),
      profit: toNum(m.revenue) - (toNum(m.revenue) * (1 - avgMargin / 100)),
      filament_used: toNum(m.filament_used),
      completed: toNum(m.completed_count),
      cancelled: toNum(m.cancelled_count),
    }))
  }, [statsData, avgMargin])

  const pieData = React.useMemo(() => {
    if (!statsData?.by_status?.length) return []
    return statsData.by_status.map(s => ({
      name: STATUS_LABELS[s.status] ?? s.status,
      value: toNum(s.count),
      color: STATUS_COLORS[s.status] ?? "#94a3b8",
      status: s.status,
    }))
  }, [statsData])

  const printerTypeData = React.useMemo(() => {
    const map: Record<string, number> = {}
    printers.forEach(p => { map[p.type] = (map[p.type] ?? 0) + 1 })
    return Object.entries(map).map(([type, count]) => ({ type, count }))
  }, [printers])

  const materialCatData = React.useMemo(() => {
    const map: Record<string, { orders: number; revenue: number }> = {}
    materialStats.forEach(m => {
      if (!map[m.category]) map[m.category] = { orders: 0, revenue: 0 }
      map[m.category].orders += m.orders
      map[m.category].revenue += m.revenue
    })
    return Object.entries(map).map(([cat, v]) => ({ cat, ...v }))
  }, [materialStats])

  const periodLabel: Record<Period, string> = {
    all: "За всё время",
    week: "За неделю",
    month: "За месяц",
    year: "За год",
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Аналитика производства</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Полная статистика по заказам, принтерам и материалам</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={period} onValueChange={v => setPeriod(v as Period)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">За неделю</SelectItem>
              <SelectItem value="month">За месяц</SelectItem>
              <SelectItem value="year">За год</SelectItem>
              <SelectItem value="all">За всё время</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => downloadOrdersCSV()}>
            <Download className="h-4 w-4 mr-2" />Экспорт
          </Button>
          <Button variant="outline" size="icon" onClick={() => fetchAll(period)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="finance">Финансы</TabsTrigger>
          <TabsTrigger value="orders">Заказы</TabsTrigger>
          <TabsTrigger value="printers">Принтеры</TabsTrigger>
          <TabsTrigger value="materials">Материалы</TabsTrigger>
          <TabsTrigger value="roi">Окупаемость</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════ OVERVIEW ══════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">

          {/* KPI row 1 */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Всего заказов" value={fmtNum(totalOrders)} sub={`${inProgress} в работе`}
              icon={ShoppingCart} loading={isLoading} accent="border-blue-400"
              tooltip="Общее число заказов за выбранный период, включая завершённые, в работе и отменённые." />
            <StatCard title="Выручка" value={fmt(totalRevenue)} sub={`Ср. чек ${fmt(avgOrderValue)}`}
              icon={DollarSign} iconColor="text-emerald-600" loading={isLoading} accent="border-emerald-400"
              tooltip="Сумма финальных цен всех завершённых заказов за период. Не учитывает отменённые." />
            <StatCard title="Прибыль" value={fmt(totalProfit)} sub={`Маржа ${grossMarginPct.toFixed(1)}%`}
              icon={TrendingUp} iconColor="text-emerald-600" loading={isLoading} accent="border-emerald-400"
              delta={{ value: grossMarginPct - 30, suffix: "% vs 30%" }}
              tooltip="Выручка минус себестоимость (материалы + электроэнергия + амортизация). Стрелка показывает отклонение от целевой маржи 30%." />
            <StatCard title="Себестоимость" value={fmt(totalExpenses)} sub={`${avgCostPerGram} ₽/г`}
              icon={Package} loading={isLoading}
              tooltip="Суммарные операционные затраты: стоимость материалов, электроэнергия и амортизация принтеров по всем завершённым заказам." />
          </div>

          {/* KPI row 2 */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Конверсия" value={`${conversionRate}%`} sub="in_progress → completed"
              icon={Target} loading={isLoading}
              tooltip="Доля заказов, которые перешли из статуса «В работе» в «Завершён». Показывает эффективность выполнения принятых заказов." />
            <StatCard title="Завершено" value={`${completionRate.toFixed(1)}%`} sub={`${completed} заказов`}
              icon={CheckCircle2} iconColor="text-emerald-600" loading={isLoading}
              tooltip="Процент завершённых заказов от общего числа за период. Высокое значение говорит о надёжности производства." />
            <StatCard title="Отменено" value={`${cancellationRate.toFixed(1)}%`} sub={`${cancelled} заказов`}
              icon={AlertTriangle} iconColor="text-red-500" loading={isLoading}
              tooltip="Доля отменённых заказов. Высокий процент может сигнализировать о проблемах с приёмом заказов или производственных сбоях." />
            <StatCard title="Время печати" value={fmtHours(totalPrintTime)} sub={completed > 0 ? `~${fmtHours(Math.round(totalPrintTime / completed))} / заказ` : "—"}
              icon={Clock} loading={isLoading}
              tooltip="Суммарное время печати по всем заказам за период. В подписи — среднее время на один завершённый заказ." />
          </div>

          {/* Charts row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Статусы заказов</CardTitle>
                <CardDescription>{periodLabel[period]}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <div className="h-52 flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div> :
                  pieData.length === 0 ? <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Нет данных</div> : (
                    <ChartContainer config={{}} className="h-52 w-full">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [`${v} заказов`, n]} />
                      </PieChart>
                    </ChartContainer>
                  )}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map(s => (
                    <div key={s.status} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}:</span>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Finance bars */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Финансовый итог</CardTitle>
                <CardDescription>{periodLabel[period]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                  <>
                    {[
                      { label: "Выручка", value: totalRevenue, pct: 100, color: "bg-blue-500" },
                      { label: "Себестоимость", value: totalExpenses, pct: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0, color: "bg-orange-400" },
                      { label: "Прибыль", value: totalProfit, pct: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0, color: "bg-emerald-500" },
                    ].map(({ label, value, pct, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold">{fmt(value)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }} />
                        </div>
                        <div className="text-xs text-muted-foreground text-right mt-0.5">{pct.toFixed(1)}% от выручки</div>
                      </div>
                    ))}
                    <div className="pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Электроэнергия</span><span className="font-medium">{fmt(totalElectricityCost)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Средняя маржа</span><span className="font-medium text-emerald-600">{avgMargin}%</span></div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly trend */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Динамика выручки и заказов</CardTitle>
                <CardDescription>По месяцам</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={monthlyChartConfig} className="h-64 w-full">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                    <YAxis yAxisId="orders" orientation="left" tickLine={false} axisLine={false} width={30} fontSize={11} />
                    <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} width={65} fontSize={11}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v, n) =>
                      n === "revenue" ? [fmt(Number(v)), "Выручка"] :
                      n === "profit" ? [fmt(Number(v)), "Прибыль"] :
                      [v, "Заказы"]} />} />
                    <Bar yAxisId="orders" dataKey="orders_count" fill="var(--color-orders_count)" radius={[3,3,0,0]} maxBarSize={36} />
                    <Bar yAxisId="revenue" dataKey="revenue" fill="var(--color-revenue)" radius={[3,3,0,0]} maxBarSize={36} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════ FINANCE ══════════════════════════════ */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Общая выручка" value={fmt(totalRevenue)} icon={DollarSign} iconColor="text-emerald-600" loading={isLoading}
              tooltip="Суммарная сумма всех завершённых заказов за выбранный период." />
            <StatCard title="Общая себестоимость" value={fmt(totalExpenses)} icon={Package} loading={isLoading}
              tooltip="Совокупные затраты на выполнение заказов: материалы, электроэнергия и амортизация принтеров." />
            <StatCard title="Общая прибыль" value={fmt(totalProfit)} icon={TrendingUp} iconColor={totalProfit >= 0 ? "text-emerald-600" : "text-red-500"} loading={isLoading}
              accent={totalProfit >= 0 ? "border-emerald-400" : "border-red-400"}
              tooltip="Выручка минус себестоимость. Отражает реальный финансовый результат за период." />
            <StatCard title="Средняя маржинальность" value={`${avgMargin}%`} icon={Percent} iconColor="text-blue-600" loading={isLoading}
              tooltip="Средний процент прибыли в цене заказа. Показывает, какую долю от выручки вы оставляете себе после вычета всех затрат." />
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Средняя стоимость заказа" value={fmt(avgOrderValue)} icon={BarChart2} loading={isLoading}
              tooltip="Среднее значение суммы заказа по всем завершённым заказам за период." />
            <StatCard title="Медианная стоимость" value={fmt(medianPrice)} sub="50-й перцентиль" icon={Minus} loading={isLoading}
              tooltip="Медиана цен завершённых заказов. В отличие от среднего, не искажается единичными очень дорогими или очень дешёвыми заказами." />
            <StatCard title="Средний чек" value={fmt(avgOrderValue)} sub="по завершённым" icon={Star} loading={isLoading}
              tooltip="Средняя сумма одного завершённого заказа. Используется для планирования и сравнения с медианой." />
            <StatCard title="Затраты на электроэнергию" value={fmt(totalElectricityCost)} icon={Zap} iconColor="text-yellow-500" loading={isLoading}
              tooltip="Суммарные расходы на электроэнергию по всем заказам, рассчитанные на основе потребления принтеров и времени печати." />
          </div>

          {/* Revenue area chart */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Выручка и прибыль по месяцам</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={monthlyChartConfig} className="h-64 w-full">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={65} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
                    <Tooltip formatter={(v: any, n: any) => [fmt(v), n === "revenue" ? "Выручка" : "Прибыль"]} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="url(#gRevenue)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" stroke="var(--color-profit)" fill="url(#gProfit)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Monthly table */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Детали по месяцам</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        {["Месяц","Заказов","Завершено","Отменено","Выручка","Филамент"].map(h =>
                          <th key={h} className="pb-2 font-medium text-left last:text-right even:text-right">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map(row => (
                        <tr key={row.month} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 font-medium">{row.month}</td>
                          <td className="py-2 text-right">{row.orders_count}</td>
                          <td className="py-2 text-right text-emerald-600">{row.completed}</td>
                          <td className="py-2 text-right text-red-500">{row.cancelled}</td>
                          <td className="py-2 text-right">{fmt(row.revenue)}</td>
                          <td className="py-2 text-right">{fmtWeight(row.filament_used)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════ ORDERS ══════════════════════════════ */}
        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Всего заказов" value={fmtNum(totalOrders)} icon={ShoppingCart} loading={isLoading}
              tooltip="Общее количество заказов за выбранный период всех статусов." />
            <StatCard title="В работе" value={fmtNum(inProgress)} icon={Activity} iconColor="text-blue-600" loading={isLoading} accent="border-blue-400"
              tooltip="Заказы, которые сейчас находятся в процессе выполнения." />
            <StatCard title="Завершённые" value={fmtNum(completed)} icon={CheckCircle2} iconColor="text-emerald-600" loading={isLoading} accent="border-emerald-400"
              tooltip="Заказы, успешно выполненные и переданные клиенту за выбранный период." />
            <StatCard title="Отменённые" value={fmtNum(cancelled)} icon={AlertTriangle} iconColor="text-red-500" loading={isLoading} accent="border-red-400"
              tooltip="Заказы, которые были отменены. Учитываются в общем числе, но не включаются в выручку и прибыль." />
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Процент отмен" value={`${cancellationRate.toFixed(1)}%`} icon={TrendingDown} iconColor="text-red-500" loading={isLoading}
              tooltip="Доля отменённых заказов от общего числа. Высокий процент — сигнал для анализа причин отказов." />
            <StatCard title="Процент завершения" value={`${completionRate.toFixed(1)}%`} icon={TrendingUp} iconColor="text-emerald-600" loading={isLoading}
              tooltip="Доля успешно выполненных заказов от общего числа. Отражает стабильность и надёжность производства." />
            <StatCard title="Конверсия" value={`${conversionRate}%`} sub="in_progress → completed" icon={Target} loading={isLoading}
              tooltip="Процент заказов, которые дошли до финала из статуса «В работе». Помогает оценить потери на этапе производства." />
            <StatCard title="Среднее время выполнения" value={avgCompletionDays > 0 ? `${avgCompletionDays.toFixed(1)} дн` : "—"} icon={Timer} loading={isLoading}
              tooltip="Среднее количество дней от создания заказа до его завершения. Помогает планировать сроки для клиентов." />
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            <StatCard title="Общий расход материала" value={fmtWeight(totalFilament)} icon={Package} loading={isLoading}
              tooltip="Суммарный вес материала, использованного во всех завершённых заказах за период." />
            <StatCard title="Прогноз расхода в месяц" value={monthlyFilamentAvg > 0 ? fmtWeight(monthlyFilamentAvg) : "—"} sub="на основе истории" icon={FlaskConical} loading={isLoading}
              tooltip="Средний расход материала в месяц, рассчитанный по исторической динамике. Помогает планировать закупки." />
            <StatCard title="Общее время печати" value={fmtHours(totalPrintTime)} sub={completed > 0 ? `~${fmtHours(Math.round(totalPrintTime / completed))}/заказ` : "—"} icon={Clock} loading={isLoading}
              tooltip="Суммарное машинное время по всем заказам. В подписи — среднее время на один завершённый заказ." />
          </div>

          {/* Pending vs done progress */}
          <Card>
            <CardHeader><CardTitle className="text-base">Распределение заказов</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Завершены", value: completed, total: totalOrders, color: "bg-emerald-500" },
                { label: "В работе", value: inProgress, total: totalOrders, color: "bg-blue-500" },
                { label: "Отменены", value: cancelled, total: totalOrders, color: "bg-red-400" },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value} <span className="text-muted-foreground text-xs">({total > 0 ? ((value/total)*100).toFixed(1) : 0}%)</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: total > 0 ? `${(value/total)*100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════ PRINTERS ══════════════════════════════ */}
        <TabsContent value="printers" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Всего принтеров" value={fmtNum(printers.length)} icon={Printer} loading={isLoading}
              tooltip="Общее количество принтеров в вашем парке оборудования." />
            <StatCard title="Самый загруженный"
              value={busiestPrinter?.name ?? "—"}
              sub={busiestPrinter ? `${busiestPrinter.orders} заказов` : ""}
              icon={Star} iconColor="text-yellow-500" loading={isLoading}
              tooltip="Принтер с наибольшим числом заказов за период. Показывает, какое оборудование используется активнее всего." />
            <StatCard title="Не использовались" value={fmtNum(unusedPrinters.length)} icon={AlertTriangle} iconColor={unusedPrinters.length > 0 ? "text-orange-500" : "text-muted-foreground"} loading={isLoading}
              tooltip="Количество принтеров, у которых нет ни одного заказа за выбранный период. Простаивающее оборудование — повод пересмотреть загрузку." />
            <StatCard title="Среднее заказов/принтер" value={printers.length > 0 ? (totalOrders / printers.length).toFixed(1) : "—"} icon={Hash} loading={isLoading}
              tooltip="Среднее число заказов на один принтер за период. Помогает оценить равномерность загрузки парка." />
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Общий наработанный ресурс" value={`${usedHours.toFixed(0)} ч`} icon={Clock} loading={isLoading}
              tooltip="Суммарное количество часов, которые все принтеры проработали по заказам. Используется для расчёта износа." />
            <StatCard title="Остаточный ресурс" value={`${Math.max(0, totalLifetime - usedHours).toFixed(0)} ч`} icon={Activity} loading={isLoading}
              tooltip="Оставшийся ресурс всего парка принтеров до достижения заявленного производителем ресурса (print_lifetime_hours)." />
            <StatCard title="Средний износ" value={`${avgWearPct.toFixed(1)}%`} icon={Percent} iconColor={avgWearPct > 70 ? "text-red-500" : "text-muted-foreground"} loading={isLoading}
              tooltip="Средний процент выработанного ресурса по всем принтерам. Свыше 70% — рекомендуется планировать замену или обслуживание." />
            <StatCard title="Загрузка (ч/день)" value={totalPrintTime > 0 ? `${(totalPrintTime / 60 / 30).toFixed(1)}` : "—"} sub="за последние 30 дней" icon={Layers} loading={isLoading}
              tooltip="Среднесуточная загрузка всего парка принтеров в часах за последние 30 дней. Помогает оценить интенсивность использования." />
          </div>

          {/* Printer type distribution */}
          {printerTypeData.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Типы принтеров</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52 w-full">
                    <PieChart>
                      <Pie data={printerTypeData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={75} label={({ type, count }) => `${type}: ${count}`}>
                        {printerTypeData.map((_, i) => <Cell key={i} fill={["#3b82f6","#8b5cf6","#10b981","#f59e0b"][i % 4]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Выручка по принтерам</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52 w-full">
                    <BarChart data={printerStats.filter(p => p.revenue > 0)} layout="vertical" margin={{ left: 0 }}>
                      <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}к`} tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip formatter={(v: any) => [fmt(v), "Выручка"]} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0,3,3,0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Printer table */}
          {printerStats.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Детали по принтерам</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        {["Принтер","Тип","Заказов","Выручка","Прибыль","Время печати","Износ","Статус"].map(h =>
                          <th key={h} className="pb-2 font-medium text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {printerStats.map(p => {
                        const wearPct = p.print_lifetime_hours > 0 ? (p.total_print_time_minutes / 60 / p.print_lifetime_hours) * 100 : 0
                        const needsReplace = wearPct >= 80
                        return (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 font-medium">{p.name}</td>
                            <td className="py-2"><Badge variant="outline">{p.type}</Badge></td>
                            <td className="py-2">{p.orders}</td>
                            <td className="py-2">{fmt(p.revenue)}</td>
                            <td className={`py-2 ${p.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmt(p.profit)}</td>
                            <td className="py-2">{fmtHours(p.total_print_time_minutes)}</td>
                            <td className="py-2">
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-16 rounded-full bg-muted">
                                  <div className={`h-1.5 rounded-full ${needsReplace ? "bg-red-500" : wearPct > 50 ? "bg-orange-400" : "bg-emerald-500"}`}
                                    style={{ width: `${Math.min(wearPct, 100).toFixed(0)}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{wearPct.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="py-2">
                              {p.orders === 0
                                ? <Badge variant="outline" className="text-orange-500 border-orange-200">Не используется</Badge>
                                : needsReplace
                                ? <Badge variant="outline" className="text-red-500 border-red-200">Требует замены</Badge>
                                : <Badge variant="outline" className="text-emerald-600 border-emerald-200">В норме</Badge>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════ MATERIALS ══════════════════════════════ */}
        <TabsContent value="materials" className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <StatCard title="Материалов в парке" value={fmtNum(materials.length)} icon={Package} loading={isLoading}
              tooltip="Количество уникальных позиций материалов, добавленных в систему (включая материалы с нулевым остатком)." />
            <StatCard title="Общий расход" value={fmtWeight(totalFilament)} icon={FlaskConical} loading={isLoading}
              tooltip="Суммарный вес материала, израсходованного во всех завершённых заказах за выбранный период." />
            <StatCard title="Прогноз/месяц" value={monthlyFilamentAvg > 0 ? fmtWeight(monthlyFilamentAvg) : "—"} icon={TrendingUp} loading={isLoading}
              tooltip="Средний ежемесячный расход материала, рассчитанный на основе исторических данных. Используйте для планирования закупок." />
            <StatCard
              title="Остаток закончится через"
              value={materialRunout != null ? (materialRunout >= 12 ? `${(materialRunout / 12).toFixed(1)} г` : `${materialRunout.toFixed(1)} мес`) : "—"}
              sub="при текущем темпе"
              icon={AlertTriangle}
              iconColor={materialRunout != null && materialRunout < 2 ? "text-red-500" : "text-muted-foreground"}
              loading={isLoading}
              tooltip="Прогноз, через сколько месяцев закончится весь запас материалов на складе при сохранении текущего темпа расхода. Менее 2 месяцев — критично."
            />
          </div>

          {/* Top materials by revenue */}
          {materialStats.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Материалы с наибольшей выручкой</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52 w-full">
                    <BarChart data={[...materialStats].sort((a, b) => b.revenue - a.revenue).slice(0, 8)} layout="vertical">
                      <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}к`} tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} fontSize={10} />
                      <Tooltip formatter={(v: any) => [fmt(v), "Выручка"]} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0,3,3,0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Категории материалов</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-52 w-full">
                    <BarChart data={materialCatData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="cat" tickLine={false} axisLine={false} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} fontSize={11} width={35} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#10b981" radius={[3,3,0,0]} name="Заказов" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Material table */}
          {materialStats.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Детали по материалам</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        {["Материал","Кат.","Цена/кг","Остаток","Заказов","Использовано","Выручка","Статус"].map(h =>
                          <th key={h} className="pb-2 font-medium text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...materialStats].sort((a, b) => b.revenue - a.revenue).map(m => {
                        const remainKg = m.quantity
                        const monthsLeft = monthlyFilamentAvg > 0 ? (remainKg * 1000) / monthlyFilamentAvg : null
                        const lowStock = monthsLeft != null && monthsLeft < 1
                        return (
                          <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 font-medium">{m.name}</td>
                            <td className="py-2 text-muted-foreground text-xs">{m.category}</td>
                            <td className="py-2">{fmt(m.price_per_kg)}/кг</td>
                            <td className={`py-2 ${lowStock ? "text-red-500 font-medium" : ""}`}>{remainKg} шт</td>
                            <td className="py-2">{m.orders}</td>
                            <td className="py-2">{fmtWeight(m.weight_used_g)}</td>
                            <td className="py-2">{fmt(m.revenue)}</td>
                            <td className="py-2">
                              {m.orders === 0
                                ? <Badge variant="outline" className="text-muted-foreground">Не используется</Badge>
                                : lowStock
                                ? <Badge variant="outline" className="text-red-500 border-red-200">Заканчивается</Badge>
                                : <Badge variant="outline" className="text-emerald-600 border-emerald-200">ОК</Badge>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase recommendations */}
          {materialRunout != null && materialRunout < 3 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Рекомендация по закупке
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-orange-700 dark:text-orange-300">
                При текущем темпе расхода ({fmtWeight(monthlyFilamentAvg)}/мес) запасы закончатся
                примерно через <strong>{materialRunout.toFixed(1)} мес.</strong> Рекомендуем пополнить запасы.
                Оптимальный заказ: <strong>{fmtWeight(monthlyFilamentAvg * 3)}</strong> (на 3 месяца).
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════ ROI ══════════════════════════════ */}
        <TabsContent value="roi" className="space-y-6">
          <RoiTab
            printers={printers}
            printerStats={printerStats}
            materials={materials}
            materialStats={materialStats}
            totalRevenue={totalRevenue}
            totalProfit={totalProfit}
            totalExpenses={totalExpenses}
            totalElectricityCost={totalElectricityCost}
            monthlyData={monthlyData}
            isLoading={isLoading}
            fmt={fmt}
            fmtNum={fmtNum}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}