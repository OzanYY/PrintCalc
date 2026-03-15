import { useState } from 'react';
import { 
  Plus, 
  Printer, 
  Package, 
  Clock,
  DollarSign,
  Weight,
  Edit,
  Trash2,
  MoreVertical,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Progress } from '@/components/ui/progress';

// Типы
type OrderStatus = 'in_progress' | 'completed' | 'cancelled';

interface Printer {
  id: number;
  name: string;
  type: string;
  power_consumption: number;
}

interface Material {
  id: number;
  name: string;
  price_per_kg: number;
}

interface Order {
  id: number;
  user_id: number;
  printer_id: number | null;
  material_id: number | null;
  name: string;
  status: OrderStatus;
  
  model_weight_grams: number;
  support_weight_grams: number;
  total_weight_grams: number;
  print_time_minutes: number;
  
  material_cost: number;
  electricity_cost: number;
  depreciation_cost: number;
  labor_cost: number;
  additional_expenses: number;
  total_cost: number;
  margin_percent: number;
  final_price: number;
  
  notes: string;
  settings: Record<string, any>;
  
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Интерфейс для формы
interface OrderFormData {
  printer_id: string;
  material_id: string;
  name: string;
  status: OrderStatus;
  model_weight_grams: string;
  support_weight_grams: string;
  print_time_hours: string;
  print_time_minutes: string;
  material_cost: string;
  electricity_cost: string;
  depreciation_cost: string;
  labor_cost: string;
  additional_expenses: string;
  margin_percent: string;
  notes: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 1,
      user_id: 1,
      printer_id: 1,
      material_id: 1,
      name: 'Фигурка дракона',
      status: 'completed',
      model_weight_grams: 45.5,
      support_weight_grams: 12.3,
      total_weight_grams: 57.8,
      print_time_minutes: 360,
      material_cost: 144.5,
      electricity_cost: 12.6,
      depreciation_cost: 50,
      labor_cost: 300,
      additional_expenses: 0,
      total_cost: 507.1,
      margin_percent: 30,
      final_price: 659.23,
      notes: 'Подарок на день рождения',
      settings: {},
      created_at: '2024-03-01T10:30:00Z',
      updated_at: '2024-03-05T15:45:00Z',
      completed_at: '2024-03-05T15:45:00Z',
    },
    {
      id: 2,
      user_id: 1,
      printer_id: 2,
      material_id: 3,
      name: 'Шахматные фигуры',
      status: 'in_progress',
      model_weight_grams: 120.0,
      support_weight_grams: 25.5,
      total_weight_grams: 145.5,
      print_time_minutes: 720,
      material_cost: 654.75,
      electricity_cost: 8.4,
      depreciation_cost: 100,
      labor_cost: 500,
      additional_expenses: 50,
      total_cost: 1313.15,
      margin_percent: 25,
      final_price: 1641.44,
      notes: 'Черный цвет',
      settings: {},
      created_at: '2024-03-10T14:20:00Z',
      updated_at: '2024-03-12T09:15:00Z',
      completed_at: null,
    },
    {
      id: 3,
      user_id: 1,
      printer_id: 1,
      material_id: 2,
      name: 'Держатель для телефона',
      status: 'cancelled',
      model_weight_grams: 25.0,
      support_weight_grams: 5.0,
      total_weight_grams: 30.0,
      print_time_minutes: 180,
      material_cost: 96.0,
      electricity_cost: 6.3,
      depreciation_cost: 25,
      labor_cost: 150,
      additional_expenses: 0,
      total_cost: 277.3,
      margin_percent: 20,
      final_price: 332.76,
      notes: 'Клиент отказался',
      settings: {},
      created_at: '2024-02-25T11:00:00Z',
      updated_at: '2024-02-26T16:30:00Z',
      completed_at: null,
    },
  ]);

  const [printers] = useState<Printer[]>([
    { id: 1, name: 'Основной FDM', type: 'FDM', power_consumption: 350 },
    { id: 2, name: 'Смоляной принтер', type: 'SLA', power_consumption: 120 },
  ]);

  const [materials] = useState<Material[]>([
    { id: 1, name: 'PLA Basic', price_per_kg: 2500 },
    { id: 2, name: 'ABS Pro', price_per_kg: 3200 },
    { id: 3, name: 'Standard Resin', price_per_kg: 4500 },
  ]);

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const [formData, setFormData] = useState<OrderFormData>({
    printer_id: '',
    material_id: '',
    name: '',
    status: 'in_progress',
    model_weight_grams: '',
    support_weight_grams: '',
    print_time_hours: '',
    print_time_minutes: '',
    material_cost: '',
    electricity_cost: '',
    depreciation_cost: '',
    labor_cost: '',
    additional_expenses: '',
    margin_percent: '20',
    notes: '',
  });

  // Фильтрация заказов
  const filteredOrders = orders.filter(order => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.id.toString().includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  // Статистика
  const totalOrders = orders.length;
  const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.final_price, 0);
  const totalProfit = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.final_price - o.total_cost), 0);

  const getStatusBadge = (status: OrderStatus) => {
    switch(status) {
      case 'in_progress':
        return <Badge className="bg-blue-500">В процессе</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Завершен</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Отменен</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getPrinterName = (printerId: number | null) => {
    if (!printerId) return '—';
    return printers.find(p => p.id === printerId)?.name || 'Неизвестно';
  };

  const getMaterialName = (materialId: number | null) => {
    if (!materialId) return '—';
    return materials.find(m => m.id === materialId)?.name || 'Неизвестно';
  };

  const calculateProfit = (order: Order) => {
    return order.final_price - order.total_cost;
  };

  const getProgressValue = (order: Order) => {
    if (order.status === 'completed') return 100;
    if (order.status === 'cancelled') return 0;
    const created = new Date(order.created_at).getTime();
    const now = Date.now();
    const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
    return Math.min(Math.round(daysDiff * 20), 90);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      printer_id: '',
      material_id: '',
      name: '',
      status: 'in_progress',
      model_weight_grams: '',
      support_weight_grams: '',
      print_time_hours: '',
      print_time_minutes: '',
      material_cost: '',
      electricity_cost: '',
      depreciation_cost: '',
      labor_cost: '',
      additional_expenses: '',
      margin_percent: '20',
      notes: '',
    });
  };

  const calculateTotalCost = (data: OrderFormData) => {
    const materialCost = parseFloat(data.material_cost) || 0;
    const electricityCost = parseFloat(data.electricity_cost) || 0;
    const depreciation = parseFloat(data.depreciation_cost) || 0;
    const labor = parseFloat(data.labor_cost) || 0;
    const additional = parseFloat(data.additional_expenses) || 0;
    return materialCost + electricityCost + depreciation + labor + additional;
  };

  const handleCreateOrder = () => {
    const totalMinutes = (parseInt(formData.print_time_hours) || 0) * 60 + 
                        (parseInt(formData.print_time_minutes) || 0);
    
    const modelWeight = parseFloat(formData.model_weight_grams) || 0;
    const supportWeight = parseFloat(formData.support_weight_grams) || 0;
    const totalWeight = modelWeight + supportWeight;

    const materialCost = parseFloat(formData.material_cost) || 0;
    const electricityCost = parseFloat(formData.electricity_cost) || 0;
    const depreciation = parseFloat(formData.depreciation_cost) || 0;
    const labor = parseFloat(formData.labor_cost) || 0;
    const additional = parseFloat(formData.additional_expenses) || 0;
    const totalCost = materialCost + electricityCost + depreciation + labor + additional;
    
    const margin = parseInt(formData.margin_percent) || 0;
    const finalPrice = totalCost * (1 + margin / 100);

    const newOrder: Order = {
      id: Date.now(),
      user_id: 1,
      printer_id: formData.printer_id ? parseInt(formData.printer_id) : null,
      material_id: formData.material_id ? parseInt(formData.material_id) : null,
      name: formData.name,
      status: formData.status,
      model_weight_grams: modelWeight,
      support_weight_grams: supportWeight,
      total_weight_grams: totalWeight,
      print_time_minutes: totalMinutes,
      material_cost: materialCost,
      electricity_cost: electricityCost,
      depreciation_cost: depreciation,
      labor_cost: labor,
      additional_expenses: additional,
      total_cost: totalCost,
      margin_percent: margin,
      final_price: finalPrice,
      notes: formData.notes,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
    };

    setOrders(prev => [newOrder, ...prev]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditOrder = () => {
    if (!selectedOrder) return;

    const totalMinutes = (parseInt(formData.print_time_hours) || 0) * 60 + 
                        (parseInt(formData.print_time_minutes) || 0);
    
    const modelWeight = parseFloat(formData.model_weight_grams) || 0;
    const supportWeight = parseFloat(formData.support_weight_grams) || 0;
    const totalWeight = modelWeight + supportWeight;

    const materialCost = parseFloat(formData.material_cost) || 0;
    const electricityCost = parseFloat(formData.electricity_cost) || 0;
    const depreciation = parseFloat(formData.depreciation_cost) || 0;
    const labor = parseFloat(formData.labor_cost) || 0;
    const additional = parseFloat(formData.additional_expenses) || 0;
    const totalCost = materialCost + electricityCost + depreciation + labor + additional;
    
    const margin = parseInt(formData.margin_percent) || 0;
    const finalPrice = totalCost * (1 + margin / 100);

    const updatedOrders = orders.map(o => 
      o.id === selectedOrder.id 
        ? {
            ...o,
            printer_id: formData.printer_id ? parseInt(formData.printer_id) : null,
            material_id: formData.material_id ? parseInt(formData.material_id) : null,
            name: formData.name,
            status: formData.status,
            model_weight_grams: modelWeight,
            support_weight_grams: supportWeight,
            total_weight_grams: totalWeight,
            print_time_minutes: totalMinutes,
            material_cost: materialCost,
            electricity_cost: electricityCost,
            depreciation_cost: depreciation,
            labor_cost: labor,
            additional_expenses: additional,
            total_cost: totalCost,
            margin_percent: margin,
            final_price: finalPrice,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
            completed_at: formData.status === 'completed' ? new Date().toISOString() : o.completed_at,
          }
        : o
    );

    setOrders(updatedOrders);
    setIsEditDialogOpen(false);
    setSelectedOrder(null);
    resetForm();
  };

  const handleDeleteOrder = () => {
    if (!selectedOrder) return;
    setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
    setIsDeleteDialogOpen(false);
    setSelectedOrder(null);
  };

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);
    const hours = Math.floor(order.print_time_minutes / 60);
    const minutes = order.print_time_minutes % 60;

    setFormData({
      printer_id: order.printer_id?.toString() || '',
      material_id: order.material_id?.toString() || '',
      name: order.name,
      status: order.status,
      model_weight_grams: order.model_weight_grams.toString(),
      support_weight_grams: order.support_weight_grams.toString(),
      print_time_hours: hours.toString(),
      print_time_minutes: minutes.toString(),
      material_cost: order.material_cost.toString(),
      electricity_cost: order.electricity_cost.toString(),
      depreciation_cost: order.depreciation_cost.toString(),
      labor_cost: order.labor_cost.toString(),
      additional_expenses: order.additional_expenses.toString(),
      margin_percent: order.margin_percent.toString(),
      notes: order.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Заказы на печать</h1>
          <p className="text-muted-foreground">
            Управление заказами, отслеживание статусов и финансовый учет
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать заказ
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В процессе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} ₽</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalProfit.toLocaleString()} ₽</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-45">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="in_progress">В процессе</SelectItem>
            <SelectItem value="completed">Завершенные</SelectItem>
            <SelectItem value="cancelled">Отмененные</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            Карточки
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Таблица
          </Button>
        </div>
      </div>

      {/* Отображение заказов */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Заказы не найдены</p>
              <p className="text-sm mb-4">Попробуйте изменить параметры поиска или создайте новый заказ</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Создать заказ
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const profit = calculateProfit(order);
            return (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{order.name}</CardTitle>
                      <CardDescription>Заказ #{order.id}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditDialog(order)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => openDeleteDialog(order)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      {getStatusBadge(order.status)}
                      <span className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    
                    {order.status === 'in_progress' && (
                      <Progress value={getProgressValue(order)} className="h-2" />
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{getPrinterName(order.printer_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{getMaterialName(order.material_id)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span>{order.total_weight_grams} г</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatTime(order.print_time_minutes)}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Себестоимость:</span>
                        <span>{order.total_cost.toFixed(2)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Цена:</span>
                        <span className="font-medium">{order.final_price.toFixed(2)} ₽</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-muted-foreground">Прибыль:</span>
                        <span className={profit > 0 ? 'text-green-600' : 'text-red-600'}>
                          {profit > 0 ? '+' : ''}{profit.toFixed(2)} ₽
                        </span>
                      </div>
                    </div>

                    {order.notes && (
                      <>
                        <Separator />
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {order.notes}
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Принтер</TableHead>
                <TableHead>Материал</TableHead>
                <TableHead>Вес</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Стоимость</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Прибыль</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const profit = calculateProfit(order);
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.name}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPrinterName(order.printer_id)}</TableCell>
                    <TableCell>{getMaterialName(order.material_id)}</TableCell>
                    <TableCell>{order.total_weight_grams} г</TableCell>
                    <TableCell>{formatTime(order.print_time_minutes)}</TableCell>
                    <TableCell>{order.total_cost.toFixed(2)} ₽</TableCell>
                    <TableCell>{order.final_price.toFixed(2)} ₽</TableCell>
                    <TableCell className={profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      {profit > 0 ? '+' : ''}{profit.toFixed(2)} ₽
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(order)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(order)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Диалог создания заказа */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создание нового заказа</DialogTitle>
            <DialogDescription>
              Заполните информацию о заказе на 3D печать
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название заказа *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Например: Фигурка дракона"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">В процессе</SelectItem>
                    <SelectItem value="completed">Завершен</SelectItem>
                    <SelectItem value="cancelled">Отменен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="printer_id">Принтер</Label>
                <Select 
                  value={formData.printer_id} 
                  onValueChange={(value) => handleSelectChange('printer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите принтер" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map(printer => (
                      <SelectItem key={printer.id} value={printer.id.toString()}>
                        {printer.name} ({printer.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material_id">Материал</Label>
                <Select 
                  value={formData.material_id} 
                  onValueChange={(value) => handleSelectChange('material_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите материал" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map(material => (
                      <SelectItem key={material.id} value={material.id.toString()}>
                        {material.name} ({material.price_per_kg} ₽/кг)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Параметры модели</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model_weight_grams">Вес модели (г)</Label>
                  <Input
                    id="model_weight_grams"
                    name="model_weight_grams"
                    type="number"
                    step="0.01"
                    value={formData.model_weight_grams}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="support_weight_grams">Вес поддержек (г)</Label>
                  <Input
                    id="support_weight_grams"
                    name="support_weight_grams"
                    type="number"
                    step="0.01"
                    value={formData.support_weight_grams}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="print_time_hours">Часы печати</Label>
                  <Input
                    id="print_time_hours"
                    name="print_time_hours"
                    type="number"
                    min="0"
                    value={formData.print_time_hours}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="print_time_minutes">Минуты печати</Label>
                  <Input
                    id="print_time_minutes"
                    name="print_time_minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.print_time_minutes}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Финансы</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="material_cost">Стоимость материала (₽)</Label>
                  <Input
                    id="material_cost"
                    name="material_cost"
                    type="number"
                    step="0.01"
                    value={formData.material_cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="electricity_cost">Электричество (₽)</Label>
                  <Input
                    id="electricity_cost"
                    name="electricity_cost"
                    type="number"
                    step="0.01"
                    value={formData.electricity_cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depreciation_cost">Амортизация (₽)</Label>
                  <Input
                    id="depreciation_cost"
                    name="depreciation_cost"
                    type="number"
                    step="0.01"
                    value={formData.depreciation_cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="labor_cost">Работа (₽)</Label>
                  <Input
                    id="labor_cost"
                    name="labor_cost"
                    type="number"
                    step="0.01"
                    value={formData.labor_cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="additional_expenses">Доп. расходы (₽)</Label>
                  <Input
                    id="additional_expenses"
                    name="additional_expenses"
                    type="number"
                    step="0.01"
                    value={formData.additional_expenses}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="margin_percent">Маржа (%)</Label>
                  <Input
                    id="margin_percent"
                    name="margin_percent"
                    type="number"
                    value={formData.margin_percent}
                    onChange={handleInputChange}
                    placeholder="20"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateOrder}>Создать заказ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирование заказа</DialogTitle>
            <DialogDescription>
              Измените информацию о заказе
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название заказа *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">В процессе</SelectItem>
                    <SelectItem value="completed">Завершен</SelectItem>
                    <SelectItem value="cancelled">Отменен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-printer">Принтер</Label>
                <Select 
                  value={formData.printer_id} 
                  onValueChange={(value) => handleSelectChange('printer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map(printer => (
                      <SelectItem key={printer.id} value={printer.id.toString()}>
                        {printer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-material">Материал</Label>
                <Select 
                  value={formData.material_id} 
                  onValueChange={(value) => handleSelectChange('material_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map(material => (
                      <SelectItem key={material.id} value={material.id.toString()}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Параметры модели</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Вес модели (г)</Label>
                  <Input
                    name="model_weight_grams"
                    type="number"
                    value={formData.model_weight_grams}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Вес поддержек (г)</Label>
                  <Input
                    name="support_weight_grams"
                    type="number"
                    value={formData.support_weight_grams}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Часы печати</Label>
                  <Input
                    name="print_time_hours"
                    type="number"
                    value={formData.print_time_hours}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Минуты печати</Label>
                  <Input
                    name="print_time_minutes"
                    type="number"
                    value={formData.print_time_minutes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-3">Финансы</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Стоимость материала (₽)</Label>
                  <Input
                    name="material_cost"
                    type="number"
                    value={formData.material_cost}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Электричество (₽)</Label>
                  <Input
                    name="electricity_cost"
                    type="number"
                    value={formData.electricity_cost}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Амортизация (₽)</Label>
                  <Input
                    name="depreciation_cost"
                    type="number"
                    value={formData.depreciation_cost}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Работа (₽)</Label>
                  <Input
                    name="labor_cost"
                    type="number"
                    value={formData.labor_cost}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Доп. расходы (₽)</Label>
                  <Input
                    name="additional_expenses"
                    type="number"
                    value={formData.additional_expenses}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Маржа (%)</Label>
                  <Input
                    name="margin_percent"
                    type="number"
                    value={formData.margin_percent}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditOrder}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление заказа</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить заказ "{selectedOrder?.name}"? 
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}