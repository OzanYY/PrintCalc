import { useState } from 'react';
import { 
  Plus, 
  Printer, 
  Edit, 
  Trash2, 
  MoreVertical,
  Check,
  Wrench,
  Clock,
  Zap,
  DollarSign,
  Copy,
  Star,
  Info,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// Типы принтеров
const PRINTER_TYPES = ['FDM', 'SLA', 'SLS', 'PolyJet'] as const;
type PrinterType = typeof PRINTER_TYPES[number];

// Интерфейс для принтера
interface Printer {
  id: number;
  user_id: number;
  name: string;
  type: PrinterType;
  model: string;
  purchase_price: number;
  print_lifetime_hours: number;
  power_consumption: number;
  is_default: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Интерфейс для формы
interface PrinterFormData {
  name: string;
  type: PrinterType;
  model: string;
  purchase_price: string;
  print_lifetime_hours: string;
  power_consumption: string;
  is_default: boolean;
  settings: {
    nozzle_size?: string;
    max_temp?: string;
    build_volume?: string;
    filament_diameter?: string;
    [key: string]: any;
  };
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([
    {
      id: 1,
      user_id: 1,
      name: 'Основной FDM принтер',
      type: 'FDM',
      model: 'Creality Ender 3 V2',
      purchase_price: 25000,
      print_lifetime_hours: 1250,
      power_consumption: 350,
      is_default: true,
      settings: {
        nozzle_size: '0.4',
        max_temp: '260',
        build_volume: '220x220x250',
        filament_diameter: '1.75',
      },
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-03-20T15:30:00Z',
    },
    {
      id: 2,
      user_id: 1,
      name: 'Смоляной принтер',
      type: 'SLA',
      model: 'Anycubic Photon Mono X',
      purchase_price: 45000,
      print_lifetime_hours: 850,
      power_consumption: 120,
      is_default: false,
      settings: {
        layer_height: '0.05',
        exposure_time: '2.5',
        build_volume: '192x120x245',
        resolution: '4K',
      },
      created_at: '2024-02-01T14:20:00Z',
      updated_at: '2024-03-18T09:45:00Z',
    },
    {
      id: 3,
      user_id: 1,
      name: 'Промышленный SLS',
      type: 'SLS',
      model: 'Formlabs Fuse 1',
      purchase_price: 450000,
      print_lifetime_hours: 450,
      power_consumption: 1500,
      is_default: false,
      settings: {
        laser_power: '10',
        layer_thickness: '0.1',
        build_volume: '165x165x300',
        material: 'Nylon',
      },
      created_at: '2024-02-15T11:00:00Z',
      updated_at: '2024-03-19T16:20:00Z',
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState<PrinterFormData>({
    name: '',
    type: 'FDM',
    model: '',
    purchase_price: '',
    print_lifetime_hours: '',
    power_consumption: '',
    is_default: false,
    settings: {},
  });

  // Обработчики формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: PrinterType) => {
    setFormData(prev => ({ 
      ...prev, 
      type: value,
      settings: getDefaultSettings(value)
    }));
  };

  const handleSettingChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  const getDefaultSettings = (type: PrinterType) => {
    switch(type) {
      case 'FDM':
        return {
          nozzle_size: '0.4',
          max_temp: '260',
          build_volume: '220x220x250',
          filament_diameter: '1.75',
        };
      case 'SLA':
        return {
          layer_height: '0.05',
          exposure_time: '2.5',
          build_volume: '192x120x245',
          resolution: '2K',
        };
      case 'SLS':
        return {
          laser_power: '10',
          layer_thickness: '0.1',
          build_volume: '165x165x300',
          material: 'Nylon',
        };
      case 'PolyJet':
        return {
          resolution: '16μ',
          material_count: '2',
          build_volume: '300x200x150',
          layer_thickness: '0.016',
        };
      default:
        return {};
    }
  };

  const handleAddPrinter = () => {
    const newPrinter: Printer = {
      id: Date.now(),
      user_id: 1,
      name: formData.name,
      type: formData.type,
      model: formData.model,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      print_lifetime_hours: parseInt(formData.print_lifetime_hours) || 0,
      power_consumption: parseFloat(formData.power_consumption) || 0,
      is_default: formData.is_default,
      settings: formData.settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPrinters(prev => [...prev, newPrinter]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditPrinter = () => {
    if (!selectedPrinter) return;

    const updatedPrinters = printers.map(p => 
      p.id === selectedPrinter.id 
        ? { 
            ...p, 
            ...formData,
            purchase_price: parseFloat(formData.purchase_price) || 0,
            print_lifetime_hours: parseInt(formData.print_lifetime_hours) || 0,
            power_consumption: parseFloat(formData.power_consumption) || 0,
            updated_at: new Date().toISOString(),
          }
        : p
    );

    setPrinters(updatedPrinters);
    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleDeletePrinter = () => {
    if (!selectedPrinter) return;
    setPrinters(prev => prev.filter(p => p.id !== selectedPrinter.id));
    setIsDeleteDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'FDM',
      model: '',
      purchase_price: '',
      print_lifetime_hours: '',
      power_consumption: '',
      is_default: false,
      settings: getDefaultSettings('FDM'),
    });
    setSelectedPrinter(null);
  };

  const openEditDialog = (printer: Printer) => {
    setSelectedPrinter(printer);
    setFormData({
      name: printer.name,
      type: printer.type,
      model: printer.model,
      purchase_price: printer.purchase_price.toString(),
      print_lifetime_hours: printer.print_lifetime_hours.toString(),
      power_consumption: printer.power_consumption.toString(),
      is_default: printer.is_default,
      settings: printer.settings,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (printer: Printer) => {
    setSelectedPrinter(printer);
    setIsDeleteDialogOpen(true);
  };

  const setAsDefault = (printerId: number) => {
    setPrinters(prev => prev.map(p => ({
      ...p,
      is_default: p.id === printerId,
    })));
  };

  const getTypeColor = (type: PrinterType) => {
    switch(type) {
      case 'FDM': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'SLA': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'SLS': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'PolyJet': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return '';
    }
  };

  const filteredPrinters = activeTab === 'all' 
    ? printers 
    : printers.filter(p => p.type === activeTab);

  // Статистика по принтерам
  const totalPrinters = printers.length;
  const totalLifetimeHours = printers.reduce((sum, p) => sum + p.print_lifetime_hours, 0);
  const totalInvestment = printers.reduce((sum, p) => sum + p.purchase_price, 0);
  const defaultPrinter = printers.find(p => p.is_default);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">3D Принтеры</h1>
          <p className="text-muted-foreground">
            Управляйте вашими 3D принтерами и их настройками
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить принтер
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Добавить новый принтер</DialogTitle>
              <DialogDescription>
                Заполните информацию о новом 3D принтере
              </DialogDescription>
            </DialogHeader>
            <PrinterForm 
              formData={formData}
              onInputChange={handleInputChange}
              onTypeChange={handleTypeChange}
              onSettingChange={handleSettingChange}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddPrinter}>Добавить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего принтеров</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrinters}</div>
            <p className="text-xs text-muted-foreground">
              {printers.filter(p => p.type === 'FDM').length} FDM · {printers.filter(p => p.type === 'SLA').length} SLA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий ресурс</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLifetimeHours} ч</div>
            <p className="text-xs text-muted-foreground">
              Среднее: {Math.round(totalLifetimeHours / totalPrinters)} ч/принтер
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общие инвестиции</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvestment.toLocaleString()} ₽</div>
            <p className="text-xs text-muted-foreground">
              Средняя стоимость: {Math.round(totalInvestment / totalPrinters).toLocaleString()} ₽
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Основной принтер</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {defaultPrinter?.name || 'Не выбран'}
            </div>
            <p className="text-xs text-muted-foreground">
              {defaultPrinter?.type || 'Установите основной принтер'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы для фильтрации */}
      <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          {PRINTER_TYPES.map(type => (
            <TabsTrigger key={type} value={type}>{type}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Список принтеров */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPrinters.map((printer) => (
          <Card key={printer.id} className={printer.is_default ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {printer.name}
                    {printer.is_default && (
                      <Badge variant="default" className="ml-2">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Основной
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{printer.model}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Действия</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openEditDialog(printer)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAsDefault(printer.id)}>
                      <Star className="mr-2 h-4 w-4" />
                      Сделать основным
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Дублировать
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => openDeleteDialog(printer)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getTypeColor(printer.type)}>
                  {printer.type}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ресурс:</span>
                  <span className="font-medium">{printer.print_lifetime_hours} ч</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Энергопотребление:</span>
                  <span className="font-medium">{printer.power_consumption} Вт</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Цена:</span>
                  <span className="font-medium">{printer.purchase_price.toLocaleString()} ₽</span>
                </div>
                
                <Separator className="my-2" />
                
                <div>
                  <span className="text-muted-foreground text-xs">Настройки:</span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {Object.entries(printer.settings).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">{key}:</span>{' '}
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-3">
              <div className="flex justify-between w-full">
                <span>Добавлен: {new Date(printer.created_at).toLocaleDateString()}</span>
                <span>ID: {printer.id}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать принтер</DialogTitle>
            <DialogDescription>
              Измените информацию о принтере
            </DialogDescription>
          </DialogHeader>
          <PrinterForm 
            formData={formData}
            onInputChange={handleInputChange}
            onTypeChange={handleTypeChange}
            onSettingChange={handleSettingChange}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditPrinter}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить принтер</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить принтер "{selectedPrinter?.name}"? 
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeletePrinter}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Компонент формы принтера
function PrinterForm({ 
  formData, 
  onInputChange, 
  onTypeChange,
  onSettingChange 
}: { 
  formData: PrinterFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTypeChange: (value: PrinterType) => void;
  onSettingChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Название принтера *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            placeholder="Например: Основной FDM"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Тип технологии *</Label>
          <Select value={formData.type} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {PRINTER_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Модель</Label>
        <Input
          id="model"
          name="model"
          value={formData.model}
          onChange={onInputChange}
          placeholder="Например: Creality Ender 3 V2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchase_price">Цена покупки (₽)</Label>
          <Input
            id="purchase_price"
            name="purchase_price"
            type="number"
            value={formData.purchase_price}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="power_consumption">Энергопотребление (Вт)</Label>
          <Input
            id="power_consumption"
            name="power_consumption"
            type="number"
            value={formData.power_consumption}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="print_lifetime_hours">Ресурс печати (часы)</Label>
        <Input
          id="print_lifetime_hours"
          name="print_lifetime_hours"
          type="number"
          value={formData.print_lifetime_hours}
          onChange={onInputChange}
          placeholder="0"
        />
      </div>

      <Separator />

      <div>
        <Label className="mb-2 block">Настройки принтера</Label>
        <div className="grid grid-cols-2 gap-4">
          {formData.type === 'FDM' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nozzle_size">Диаметр сопла (мм)</Label>
                <Input
                  id="nozzle_size"
                  value={formData.settings.nozzle_size || ''}
                  onChange={(e) => onSettingChange('nozzle_size', e.target.value)}
                  placeholder="0.4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_temp">Макс. температура (°C)</Label>
                <Input
                  id="max_temp"
                  value={formData.settings.max_temp || ''}
                  onChange={(e) => onSettingChange('max_temp', e.target.value)}
                  placeholder="260"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build_volume">Область построения (мм)</Label>
                <Input
                  id="build_volume"
                  value={formData.settings.build_volume || ''}
                  onChange={(e) => onSettingChange('build_volume', e.target.value)}
                  placeholder="220x220x250"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filament_diameter">Диаметр филамента (мм)</Label>
                <Input
                  id="filament_diameter"
                  value={formData.settings.filament_diameter || ''}
                  onChange={(e) => onSettingChange('filament_diameter', e.target.value)}
                  placeholder="1.75"
                />
              </div>
            </>
          )}

          {formData.type === 'SLA' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="layer_height">Высота слоя (мм)</Label>
                <Input
                  id="layer_height"
                  value={formData.settings.layer_height || ''}
                  onChange={(e) => onSettingChange('layer_height', e.target.value)}
                  placeholder="0.05"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exposure_time">Время экспозиции (с)</Label>
                <Input
                  id="exposure_time"
                  value={formData.settings.exposure_time || ''}
                  onChange={(e) => onSettingChange('exposure_time', e.target.value)}
                  placeholder="2.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build_volume_sla">Область построения (мм)</Label>
                <Input
                  id="build_volume_sla"
                  value={formData.settings.build_volume || ''}
                  onChange={(e) => onSettingChange('build_volume', e.target.value)}
                  placeholder="192x120x245"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution">Разрешение</Label>
                <Input
                  id="resolution"
                  value={formData.settings.resolution || ''}
                  onChange={(e) => onSettingChange('resolution', e.target.value)}
                  placeholder="4K"
                />
              </div>
            </>
          )}

          {formData.type === 'SLS' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="laser_power">Мощность лазера (Вт)</Label>
                <Input
                  id="laser_power"
                  value={formData.settings.laser_power || ''}
                  onChange={(e) => onSettingChange('laser_power', e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="layer_thickness">Толщина слоя (мм)</Label>
                <Input
                  id="layer_thickness"
                  value={formData.settings.layer_thickness || ''}
                  onChange={(e) => onSettingChange('layer_thickness', e.target.value)}
                  placeholder="0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build_volume_sls">Область построения (мм)</Label>
                <Input
                  id="build_volume_sls"
                  value={formData.settings.build_volume || ''}
                  onChange={(e) => onSettingChange('build_volume', e.target.value)}
                  placeholder="165x165x300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Материал</Label>
                <Input
                  id="material"
                  value={formData.settings.material || ''}
                  onChange={(e) => onSettingChange('material', e.target.value)}
                  placeholder="Nylon"
                />
              </div>
            </>
          )}

          {formData.type === 'PolyJet' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="resolution_poly">Разрешение</Label>
                <Input
                  id="resolution_poly"
                  value={formData.settings.resolution || ''}
                  onChange={(e) => onSettingChange('resolution', e.target.value)}
                  placeholder="16μ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material_count">Кол-во материалов</Label>
                <Input
                  id="material_count"
                  value={formData.settings.material_count || ''}
                  onChange={(e) => onSettingChange('material_count', e.target.value)}
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build_volume_poly">Область построения (мм)</Label>
                <Input
                  id="build_volume_poly"
                  value={formData.settings.build_volume || ''}
                  onChange={(e) => onSettingChange('build_volume', e.target.value)}
                  placeholder="300x200x150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="layer_thickness_poly">Толщина слоя (мм)</Label>
                <Input
                  id="layer_thickness_poly"
                  value={formData.settings.layer_thickness || ''}
                  onChange={(e) => onSettingChange('layer_thickness', e.target.value)}
                  placeholder="0.016"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => 
            setFormData(prev => ({ ...prev, is_default: checked }))
          }
        />
        <Label htmlFor="is_default">Сделать основным принтером</Label>
      </div>
    </div>
  );
}

// Вспомогательная функция для обновления состояния формы
function setFormData(updater: (prev: PrinterFormData) => PrinterFormData) {
  // Эта функция будет передана из родительского компонента
  // Здесь для примера, в реальном коде нужно передавать через props
}