import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Printer,
  Package,
  Clock,
  Weight,
  Edit,
  Trash2,
  MoreVertical,
  Filter,
  Search,
  Copy,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Tag as TagIco,
  CalendarDays,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderClientField }   from '@/components/orders/OrderClientField';
import { OrderTagsField }     from '@/components/orders/OrderTagsField';
import { OrderDeadlineField, OrderDeadlineBadge } from '@/components/orders/OrderDeadlineField';
import { OrderComments }      from '@/components/orders/OrderComments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrders } from '@/hooks/useOrders';
import { useContext } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Order, CreateOrderData } from '@/api/orders';
import { tagsAPI } from '@/api/tags';
import type { Tag } from '@/api/tags';
import { toast } from 'sonner';

// ─── Вспомогательные утилиты ──────────────────────────────────────────────────

type OrderStatus = 'in_progress' | 'completed' | 'cancelled';



/** Извлекает числовое значение из calc_result (JSONB может хранить числа как строки) */
const getCalcValue = (order: Order, path: string[]): number => {
  let node: any = order.calc_result;
  for (const key of path) {
    if (!node || typeof node !== 'object') return 0;
    node = node[key];
  }
  const n = Number(node);
  return isFinite(n) ? n : 0;
};

/** Postgres возвращает DECIMAL/BIGINT как строки — всегда приводим к number */
const toNum = (v: unknown): number => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

const getFinalPrice = (order: Order) =>
  toNum(order.final_price) || getCalcValue(order, ['finalPrice', 'value']);

const getTotalCost = (order: Order) =>
  toNum(order.total_cost) || getCalcValue(order, ['fullCost', 'value']);

const getProfit = (order: Order) => getFinalPrice(order) - getTotalCost(order);

const getPrintTimeMinutes = (order: Order): number =>
  toNum(order.print_time_minutes) || toNum(order.calc_electricity?.printTime);

const getTotalWeightGrams = (order: Order): number =>
  toNum(order.total_weight_grams) || getCalcValue(order, ['totalWeight', 'grams']);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
};

const formatMoney = (value: number) =>
  value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽';

const formatDeadline = (deadline: string) =>
  new Date(deadline).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

function getDeadlineBorderClass(deadline: string | null | undefined, status: string): string {
  if (!deadline || status !== 'in_progress') return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0)  return 'border-2 border-red-500 shadow-red-100 dark:shadow-red-950';
  if (diffDays <= 2) return 'border-2 border-orange-400 shadow-orange-100 dark:shadow-orange-950';
  if (diffDays <= 7) return 'border-2 border-yellow-400 shadow-yellow-100 dark:shadow-yellow-950';
  return '';
}


// ─── Форма заказа ─────────────────────────────────────────────────────────────

interface OrderFormData {
  name: string;
  notes: string;
  printer_id: string;
  material_id: string;
  // calc_materials
  modelWeight: string;
  supportWeight: string;
  filamentPrice: string;
  // calc_electricity
  powerConsumption: string;
  printTimeHours: string;
  printTimeMinutes: string;
  electricityPrice: string;
  // calc_depreciation
  printerCost: string;
  printResource: string;
  // calc_labor
  hourlyRate: string;
  workTime: string;
  // calc_additional
  additionalExpensesPercent: string;
  marginPercent: string;
}

const emptyForm = (): OrderFormData => ({
  name: '',
  notes: '',
  printer_id: '',
  material_id: '',
  modelWeight: '',
  supportWeight: '0',
  filamentPrice: '',
  powerConsumption: '',
  printTimeHours: '',
  printTimeMinutes: '',
  electricityPrice: '',
  printerCost: '',
  printResource: '',
  hourlyRate: '',
  workTime: '',
  additionalExpensesPercent: '0',
  marginPercent: '20',
});

const formFromOrder = (order: Order): OrderFormData => {
  const m  = order.calc_materials    || {};
  const e  = order.calc_electricity  || {};
  const d  = order.calc_depreciation || {};
  const l  = order.calc_labor        || {};
  const a  = order.calc_additional   || {};
  const printMin = e.printTime ?? 0;

  return {
    name:     order.name,
    notes:    order.notes ?? '',
    printer_id:  order.printer_id?.toString()  ?? '',
    material_id: order.material_id?.toString() ?? '',
    modelWeight:               (m.modelWeight   ?? '').toString(),
    supportWeight:             (m.supportWeight  ?? 0).toString(),
    filamentPrice:             (m.filamentPrice  ?? '').toString(),
    powerConsumption:          (e.powerConsumption ?? '').toString(),
    printTimeHours:            Math.floor(printMin / 60).toString(),
    printTimeMinutes:          (printMin % 60).toString(),
    electricityPrice:          (e.electricityPrice  ?? '').toString(),
    printerCost:               (d.printerCost   ?? '').toString(),
    printResource:             (d.printResource ?? '').toString(),
    hourlyRate:                (l.hourlyRate    ?? '').toString(),
    workTime:                  (l.workTime      ?? '').toString(),
    additionalExpensesPercent: (a.additionalExpensesPercent ?? 0).toString(),
    marginPercent:             (a.marginPercent ?? 20).toString(),
  };
};

/** Строит calc_result из формы. В реальном проекте вызывается CalculatorContext. */
const buildCalcResult = (f: OrderFormData) => {
  const modelW    = parseFloat(f.modelWeight)    || 0;
  const supportW  = parseFloat(f.supportWeight)  || 0;
  const filamentP = parseFloat(f.filamentPrice)  || 0;
  const printMin  = (parseInt(f.printTimeHours) || 0) * 60 + (parseInt(f.printTimeMinutes) || 0);
  const power     = parseFloat(f.powerConsumption) || 0;
  const elPrice   = parseFloat(f.electricityPrice)  || 0;
  const pCost     = parseFloat(f.printerCost)    || 0;
  const pRes      = parseFloat(f.printResource)  || 1;
  const rate      = parseFloat(f.hourlyRate)     || 0;
  const work      = parseFloat(f.workTime)       || 0;
  const addPct    = parseFloat(f.additionalExpensesPercent) || 0;
  const margin    = parseFloat(f.marginPercent)  || 0;

  const totalWeight = modelW + supportW;
  const matCost     = (totalWeight / 1000) * filamentP;
  const elCost      = (power / 1000) * (printMin / 60) * elPrice;
  const deprCost    = pRes > 0 ? (pCost / pRes) * (printMin / 60) : 0;
  const laborCost   = rate * (work / 60);
  const primeCost   = matCost + elCost + deprCost + laborCost;
  const addCost     = primeCost * (addPct / 100);
  const fullCost    = primeCost + addCost;
  const marginVal   = fullCost * (margin / 100);
  const finalPrice  = fullCost + marginVal;
  const pricePerGram = totalWeight > 0 ? finalPrice / totalWeight : 0;

  const fmt = (v: number) => ({ value: v, formatted: formatMoney(v), currency: '₽' });

  return {
    materials: {
      model:   fmt((modelW   / 1000) * filamentP),
      support: fmt((supportW / 1000) * filamentP),
      total:   fmt(matCost),
    },
    electricity:        fmt(elCost),
    depreciation:       fmt(deprCost),
    labor:              fmt(laborCost),
    primeCost:          fmt(primeCost),
    additionalExpenses: { ...fmt(addCost), percent: `${addPct}%` },
    fullCost:           fmt(fullCost),
    margin:             { ...fmt(marginVal), percent: `${margin}%` },
    finalPrice:         fmt(finalPrice),
    pricePerGram:       { value: pricePerGram, formatted: `${pricePerGram.toFixed(2)} ₽/г`, unit: '₽/г' },
    totalWeight:        { grams: totalWeight, kg: totalWeight / 1000 },
  };
};

const buildCreateData = (f: OrderFormData): CreateOrderData => {
  const printMin = (parseInt(f.printTimeHours) || 0) * 60 + (parseInt(f.printTimeMinutes) || 0);
  const calc_result = buildCalcResult(f);

  return {
    name: f.name,
    notes: f.notes || undefined,
    printer_id:  f.printer_id  ? parseInt(f.printer_id)  : null,
    material_id: f.material_id ? parseInt(f.material_id) : null,
    calc_materials: {
      modelWeight:   parseFloat(f.modelWeight)   || 0,
      supportWeight: parseFloat(f.supportWeight) || 0,
      filamentPrice: parseFloat(f.filamentPrice) || 0,
    },
    calc_electricity: {
      powerConsumption: parseFloat(f.powerConsumption) || 0,
      printTime:        printMin,
      electricityPrice: parseFloat(f.electricityPrice) || 0,
    },
    calc_depreciation: {
      printerCost:   parseFloat(f.printerCost)   || 0,
      printResource: parseFloat(f.printResource) || 0,
    },
    calc_labor: {
      hourlyRate: parseFloat(f.hourlyRate) || 0,
      workTime:   parseFloat(f.workTime)   || 0,
    },
    calc_additional: {
      additionalExpensesPercent: parseFloat(f.additionalExpensesPercent) || 0,
      marginPercent:             parseFloat(f.marginPercent) || 0,
    },
    calc_result,
  };
};

// ─── Бейджи статусов ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  if (status === 'in_progress') return <Badge className="bg-blue-500 text-white">В процессе</Badge>;
  if (status === 'completed')   return <Badge className="bg-green-500 text-white">Завершён</Badge>;
  return <Badge variant="destructive">Отменён</Badge>;
};

// ─── Форма ────────────────────────────────────────────────────────────────────

interface OrderFormProps {
  data: OrderFormData;
  onChange: (name: string, value: string) => void;
  printers?: { id: number; name: string; type: string }[];
  materials?: { id: number; name: string; price_per_kg: number }[];
  isEdit?: boolean;
}

const OrderForm = ({ data, onChange, printers = [], materials = [], isEdit }: OrderFormProps) => {
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(e.target.name, e.target.value);

  // Предварительный расчёт для отображения
  const preview = buildCalcResult(data);

  return (
    <div className="grid gap-4 py-4">
      {/* Основное */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Название заказа *</Label>
          <Input name="name" value={data.name} onChange={handle} placeholder="Например: Фигурка дракона" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Принтер</Label>
          <Select value={data.printer_id} onValueChange={v => onChange('printer_id', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите принтер" /></SelectTrigger>
            <SelectContent>
              {printers.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Материал</Label>
          <Select value={data.material_id} onValueChange={v => onChange('material_id', v)}>
            <SelectTrigger><SelectValue placeholder="Выберите материал" /></SelectTrigger>
            <SelectContent>
              {materials.map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.price_per_kg} ₽/кг)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Материал */}
      <div>
        <h3 className="text-sm font-medium mb-3">Материал</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Вес модели (г)</Label>
            <Input name="modelWeight" type="number" step="0.01" value={data.modelWeight} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Вес поддержек (г)</Label>
            <Input name="supportWeight" type="number" step="0.01" value={data.supportWeight} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Цена филамента (₽/кг)</Label>
            <Input name="filamentPrice" type="number" step="0.01" value={data.filamentPrice} onChange={handle} placeholder="0" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Электричество */}
      <div>
        <h3 className="text-sm font-medium mb-3">Электроэнергия</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Мощность принтера (Вт)</Label>
            <Input name="powerConsumption" type="number" value={data.powerConsumption} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Цена электричества (₽/кВт·ч)</Label>
            <Input name="electricityPrice" type="number" step="0.01" value={data.electricityPrice} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Часы печати</Label>
            <Input name="printTimeHours" type="number" min="0" value={data.printTimeHours} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Минуты печати</Label>
            <Input name="printTimeMinutes" type="number" min="0" max="59" value={data.printTimeMinutes} onChange={handle} placeholder="0" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Амортизация */}
      <div>
        <h3 className="text-sm font-medium mb-3">Амортизация</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Стоимость принтера (₽)</Label>
            <Input name="printerCost" type="number" value={data.printerCost} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Ресурс принтера (ч)</Label>
            <Input name="printResource" type="number" value={data.printResource} onChange={handle} placeholder="0" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Работа и маржа */}
      <div>
        <h3 className="text-sm font-medium mb-3">Работа и прибыль</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ставка (₽/ч)</Label>
            <Input name="hourlyRate" type="number" value={data.hourlyRate} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Время работы (мин)</Label>
            <Input name="workTime" type="number" value={data.workTime} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Доп. расходы (%)</Label>
            <Input name="additionalExpensesPercent" type="number" value={data.additionalExpensesPercent} onChange={handle} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Маржа (%)</Label>
            <Input name="marginPercent" type="number" value={data.marginPercent} onChange={handle} placeholder="20" />
          </div>
        </div>
      </div>

      {/* Превью расчёта */}
      {preview.finalPrice.value > 0 && (
        <>
          <Separator />
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <h3 className="font-medium mb-2">Предварительный расчёт</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Материал:</span>
              <span>{formatMoney(preview.materials.total.value)}</span>
              <span className="text-muted-foreground">Электричество:</span>
              <span>{formatMoney(preview.electricity.value)}</span>
              <span className="text-muted-foreground">Амортизация:</span>
              <span>{formatMoney(preview.depreciation.value)}</span>
              <span className="text-muted-foreground">Работа:</span>
              <span>{formatMoney(preview.labor.value)}</span>
              <span className="text-muted-foreground font-medium">Себестоимость:</span>
              <span className="font-medium">{formatMoney(preview.fullCost.value)}</span>
              <span className="text-muted-foreground font-bold">Итоговая цена:</span>
              <span className="font-bold text-green-600">{formatMoney(preview.finalPrice.value)}</span>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2">
        <Label>Примечания</Label>
        <Textarea name="notes" value={data.notes} onChange={handle} placeholder="Дополнительная информация..." rows={2} />
      </div>
    </div>
  );
};

// ─── Выбор тегов при создании заказа (без orderId) ───────────────────────────

interface CreateTagSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

const CreateTagSelector = ({ selectedIds, onChange }: CreateTagSelectorProps) => {
  const [allTags, setAllTags] = useState<{ id: number; name: string; color: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const ref = useRef<HTMLDivElement>(null);

  const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#64748b',
  ];

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

  const toggleTag = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  };

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
            <button
              onClick={e => { e.stopPropagation(); toggleTag(tag.id); }}
              className="hover:opacity-70 ml-0.5"
            >
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setCreating(true)}
                  type="button"
                >
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
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: newColor === c ? '2px solid currentColor' : 'none',
                        outlineOffset: '2px',
                      }}
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
};

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function OrdersPage() {
  const {
    orders,
    stats,
    pagination,
    isLoading,
    isMutating,
    error,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    createOrder,
    updateOrder,
    deleteOrder,
    cloneOrder,
    completeOrder,
    cancelOrder,
    updateStatus,
    exportCSV,
    clearError,
    refresh,
  } = useOrders({ autoFetch: true });

  const authCtx = useAuth();
  const currentUserId = authCtx?.user ? Number(authCtx.user.id) : null;

  // Показываем ошибки через toast
  useEffect(() => {
    if (error) {
      toast.error(error, { position: 'top-center', duration: 5000 });
    }
  }, [error]);

  // Локальные фильтры (поиск — только клиентский)
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // Диалоги
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen,   setIsEditOpen]   = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Форма
  const [formData, setFormData] = useState<OrderFormData>(emptyForm());

  // Поля для create-диалога
  const [clientId,    setClientId]    = useState<number | null>(null);
  const [clientName,  setClientName]  = useState<string | null>(null);
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [tagIds, setTagIds]     = useState<number[]>([]);

  // Поля для edit-диалога (независимые от selectedOrder, чтобы не ломать state при onChange)
  const [editClientId,   setEditClientId]   = useState<number | null>(null);
  const [editClientName, setEditClientName] = useState<string | null>(null);
  const [editClientPhone,setEditClientPhone]= useState<string | null>(null);
  const [editClientEmail,setEditClientEmail]= useState<string | null>(null);
  const [editDeadline,   setEditDeadline]   = useState<string | null>(null);
  const [editOrderTags,  setEditOrderTags]  = useState<import('@/api/tags').Tag[]>([]);

  // Фильтр по тегам
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [allTags, setAllTags] = useState<{ id: number; name: string; color: string }[]>([]);

  // Загружаем теги для фильтра при монтировании
  useEffect(() => {
    tagsAPI.getAll().then(r => setAllTags(r.data.data)).catch(() => {});
  }, []);

  const handleFormChange = (name: string, value: string) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  // ─── Диалоги ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setFormData(emptyForm());
    setClientId(null);
    setClientName(null);
    setClientPhone(null);
    setClientEmail(null);
    setDeadline(null);
    setTagIds([]);
    setIsCreateOpen(true);
  };

  const openEdit = async (order: Order) => {
    setSelectedOrder(order);
    setFormData(formFromOrder(order));
    // Инициализируем edit-state из данных заказа
    setEditClientId((order as any).client_id ?? null);
    setEditClientName((order as any).client_name ?? null);
    setEditClientPhone((order as any).client_phone ?? null);
    setEditClientEmail((order as any).client_email ?? null);
    setEditDeadline((order as any).deadline ?? null);
    // Загружаем теги заказа (они не приходят в списке)
    try {
      const r = await tagsAPI.getOrderTags(order.id);
      setEditOrderTags(r.data.data);
    } catch {
      setEditOrderTags([]);
    }
    setIsEditOpen(true);
  };

  const openDelete = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteOpen(true);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    const result = await createOrder({
      ...buildCreateData(formData),
      client_id: clientId ?? undefined,
      deadline:  deadline ?? undefined,
    } as any);
    if (result) {
      // После создания применяем теги если выбраны
      if (tagIds.length > 0) {
        try {
          await tagsAPI.setOrderTags((result as any).id, tagIds);
        } catch {
          toast.error('Заказ создан, но не удалось применить теги');
        }
      }
      setIsCreateOpen(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOrder || !formData.name.trim()) return;
    const data = buildCreateData(formData);
    const result = await updateOrder(selectedOrder.id, {
      name:              data.name,
      notes:             data.notes || null,
      printer_id:        data.printer_id,
      material_id:       data.material_id,
      calc_materials:    data.calc_materials,
      calc_electricity:  data.calc_electricity,
      calc_depreciation: data.calc_depreciation,
      calc_labor:        data.calc_labor,
      calc_additional:   data.calc_additional,
      calc_result:       data.calc_result,
      // Берём из edit-state (обновляется при каждом изменении в полях диалога)
      client_id: editClientId,
      deadline:  editDeadline,
    } as any);
    if (result) {
      setIsEditOpen(false);
      setSelectedOrder(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrder) return;
    const ok = await deleteOrder(selectedOrder.id);
    if (ok) {
      setIsDeleteOpen(false);
      setSelectedOrder(null);
    }
  };

  // ─── Фильтрация (клиентский поиск) ─────────────────────────────────────────

  const filteredOrders = orders.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toString().includes(searchQuery),
  );

  // ─── Статистика из хука ─────────────────────────────────────────────────────

  const summary = stats?.summary;
  const totalOrders     = parseInt(summary?.total_orders      ?? '0');
  const inProgress      = parseInt(summary?.in_progress_orders ?? '0');
  const completed       = parseInt(summary?.completed_orders   ?? '0');
  const totalRevenue    = parseFloat(summary?.total_revenue    ?? '0');
  const totalProfit     = parseFloat(summary?.total_profit     ?? '0');

  // ─── Пагинация ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  // ─── Рендер ────────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Заказы на печать</h1>
          <p className="text-muted-foreground">
            Управление заказами, отслеживание статусов и финансовый учёт
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={() => exportCSV(statusFilter ?? undefined)}>
            <Download className="mr-2 h-4 w-4" />
            Экспорт CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Создать заказ
          </Button>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex justify-between items-center">
            {error}
            <Button variant="ghost" size="sm" onClick={clearError}>✕</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        {[
          { label: 'Всего заказов',   value: totalOrders,                 color: '' },
          { label: 'В процессе',      value: inProgress,                  color: 'text-blue-600' },
          { label: 'Завершено',        value: completed,                   color: 'text-green-600' },
          { label: 'Выручка',         value: formatMoney(totalRevenue),   color: '' },
          { label: 'Прибыль',         value: formatMoney(totalProfit),    color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или номеру..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={statusFilter ?? 'all'}
          onValueChange={v => setStatusFilter(v === 'all' ? null : v as OrderStatus)}
        >
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="in_progress">В процессе</SelectItem>
            <SelectItem value="completed">Завершённые</SelectItem>
            <SelectItem value="cancelled">Отменённые</SelectItem>
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select
            value={filterTagId?.toString() ?? 'all'}
            onValueChange={v => setFilterTagId(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Все теги" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все теги</SelectItem>
              {allTags.map(t => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-1 border rounded-lg p-1">
          <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('cards')}>
            Карточки
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
            Таблица
          </Button>
        </div>
      </div>

      {/* Загрузка */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Пустое состояние */}
      {!isLoading && filteredOrders.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Заказы не найдены</p>
              <p className="text-sm mb-4">
                Попробуйте изменить параметры поиска или создайте новый заказ
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Создать заказ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Карточки */}
      {!isLoading && filteredOrders.length > 0 && viewMode === 'cards' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => {
            const profit     = getProfit(order);
            const finalPrice = getFinalPrice(order);
            const totalCost  = getTotalCost(order);
            const weight     = getTotalWeightGrams(order);
            const printTime  = getPrintTimeMinutes(order);

            const deadlineBorder = getDeadlineBorderClass((order as any).deadline, order.status);
            return (
              <Card key={order.id} className={`hover:shadow-lg transition-shadow flex flex-col ${deadlineBorder}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle
                        className="text-base leading-snug line-clamp-2 break-words"
                        title={order.name}
                      >
                        {order.name}
                      </CardTitle>
                      <CardDescription>Заказ #{order.id} · {formatDate(order.created_at)}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isMutating}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        {order.status === 'in_progress' && (
                          <DropdownMenuItem onClick={() => openEdit(order)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => cloneOrder(order.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Клонировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {order.status === 'in_progress' && (
                          <DropdownMenuItem onClick={() => completeOrder(order.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Завершить
                          </DropdownMenuItem>
                        )}
                        {order.status === 'in_progress' && (
                          <DropdownMenuItem onClick={() => cancelOrder(order.id)}>
                            <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                            Отменить
                          </DropdownMenuItem>
                        )}
                        {order.status !== 'completed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => openDelete(order)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-3">
                    <div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{order.printer_name ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{order.material_name ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{weight.toFixed(1)} г</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{formatTime(printTime)}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Себестоимость:</span>
                        <span>{formatMoney(totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Цена:</span>
                        <span className="font-medium">{formatMoney(finalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Прибыль:
                        </span>
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                        </span>
                      </div>
                    </div>

                    {order.notes && (
                      <>
                        <Separator />
                        <p className="text-sm text-muted-foreground line-clamp-2">{order.notes}</p>
                      </>
                    )}

                    {/* Клиент, дедлайн, теги */}
                    {((order as any).client_name || (order as any).deadline || ((order as any).tags?.length > 0)) && (
                      <>
                        <Separator />
                        <div className="space-y-1.5">
                          {(order as any).tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(order as any).tags.map((tag: any) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {(order as any).client_name && (
                            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                              <User className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{(order as any).client_name}</div>
                                {(order as any).client_phone && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{(order as any).client_phone}</span>
                                  </div>
                                )}
                                {(order as any).client_email && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{(order as any).client_email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {(order as any).deadline && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground justify-end align-bottom">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span>{formatDeadline((order as any).deadline)}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Таблица */}
      {!isLoading && filteredOrders.length > 0 && viewMode === 'table' && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Дедлайн / Клиент</TableHead>
                <TableHead>Принтер</TableHead>
                <TableHead>Материал</TableHead>
                <TableHead>Вес</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Себестоимость</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Прибыль</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map(order => {
                const profit     = getProfit(order);
                const finalPrice = getFinalPrice(order);
                const totalCost  = getTotalCost(order);
                const weight     = getTotalWeightGrams(order);
                const printTime  = getPrintTimeMinutes(order);

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell className="max-w-45 truncate">{order.name}</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(order as any).deadline && (
                          <OrderDeadlineBadge
                            deadline={(order as any).deadline}
                            status={order.status}
                          />
                        )}
                        {(order as any).client_name && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {(order as any).client_name}
                            </span>
                            {(order as any).client_phone && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {(order as any).client_phone}
                              </span>
                            )}
                            {(order as any).client_email && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {(order as any).client_email}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.printer_name ?? '—'}</TableCell>
                    <TableCell>{order.material_name ?? '—'}</TableCell>
                    <TableCell>{weight.toFixed(1)} г</TableCell>
                    <TableCell>{formatTime(printTime)}</TableCell>
                    <TableCell>{formatMoney(totalCost)}</TableCell>
                    <TableCell>{formatMoney(finalPrice)}</TableCell>
                    <TableCell className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {profit >= 0 ? '+' : ''}{formatMoney(profit)}
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isMutating}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status === 'in_progress' && (
                            <DropdownMenuItem onClick={() => openEdit(order)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => cloneOrder(order.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Клонировать
                          </DropdownMenuItem>
                          {order.status === 'in_progress' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => completeOrder(order.id)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Завершить
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => cancelOrder(order.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                                Отменить
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status !== 'completed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => openDelete(order)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Диалог создания */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создание нового заказа</DialogTitle>
            <DialogDescription>Заполните параметры заказа на 3D-печать</DialogDescription>
          </DialogHeader>
          <OrderForm data={formData} onChange={handleFormChange} />

          <div className="grid gap-4 pb-2">
            <Separator />
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />Клиент
              </Label>
              <OrderClientField
                clientId={clientId}
                clientName={clientName}
                clientPhone={clientPhone}
                clientEmail={clientEmail}
                onClientChange={(id, client) => {
                  setClientId(id);
                  setClientName(client?.name ?? null);
                  setClientPhone(client?.phone ?? null);
                  setClientEmail(client?.email ?? null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />Дедлайн
              </Label>
              <OrderDeadlineField
                deadline={deadline}
                status="in_progress"
                onChange={setDeadline}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <TagIco className="h-3.5 w-3.5" />Теги
              </Label>
              <CreateTagSelector selectedIds={tagIds} onChange={setTagIds} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={isMutating || !formData.name.trim()}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать заказ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование заказа #{selectedOrder?.id}</DialogTitle>
            <DialogDescription>Измените параметры заказа и пересчитайте стоимость</DialogDescription>
          </DialogHeader>
          <OrderForm data={formData} onChange={handleFormChange} isEdit />

          {selectedOrder && (
            <div className="grid gap-4 pb-2">
              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <TagIco className="h-3.5 w-3.5" />Теги
                </Label>
                {/* initialTags загружаются в openEdit — теги не приходят в списке заказов */}
                <OrderTagsField
                  orderId={selectedOrder.id}
                  initialTags={editOrderTags}
                  onChange={setEditOrderTags}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />Дедлайн
                </Label>
                <OrderDeadlineField
                  deadline={editDeadline}
                  status={selectedOrder.status}
                  onChange={setEditDeadline}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />Клиент
                </Label>
                <OrderClientField
                  clientId={editClientId}
                  clientName={editClientName}
                  clientPhone={editClientPhone}
                  clientEmail={editClientEmail}
                  onClientChange={(id, client) => {
                    setEditClientId(id);
                    setEditClientName(client?.name ?? null);
                    setEditClientPhone(client?.phone ?? null);
                    setEditClientEmail(client?.email ?? null);
                  }}
                />
              </div>

              <Separator />

              <OrderComments
                orderId={selectedOrder.id}
                currentUserId={currentUserId ?? 0}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Отмена</Button>
            <Button onClick={handleEdit} disabled={isMutating || !formData.name.trim()}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог удаления */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление заказа</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить заказ «{selectedOrder?.name}»?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isMutating}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}