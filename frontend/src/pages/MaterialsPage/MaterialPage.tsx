import { useState } from 'react';
import { 
  Plus, 
  Package, 
  Edit, 
  Trash2, 
  MoreVertical,
  Star,
  Copy,
  Droplet,
  Ruler,
  Weight,
  Palette,
  Factory,
  CircleDot,
  Beaker,
  FlaskConical,
  Award
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
import { Textarea } from '@/components/ui/textarea';

// Категории материалов
const MATERIAL_CATEGORIES = ['filament', 'resin', 'powder', 'other'] as const;
type MaterialCategory = typeof MATERIAL_CATEGORIES[number];

// Типы материалов для каждой категории
const MATERIAL_TYPES = {
  filament: ['PLA', 'ABS', 'PETG', 'TPU', 'Nylon', 'Polycarbonate', 'PEEK', 'Other'],
  resin: ['Standard', 'Tough', 'Flexible', 'High Temp', 'Dental', 'Castable', 'Clear', 'Other'],
  powder: ['Nylon 12', 'Nylon 11', 'TPU', 'Alumide', 'Steel', 'Titanium', 'Aluminum', 'Other'],
  other: ['Wax', 'Support', 'Cleaning', 'Adhesive', 'Coating', 'Other']
};

// Интерфейс для материала
interface Material {
  id: number;
  user_id: number;
  name: string;
  category: MaterialCategory;
  type: string;
  brand: string;
  color: string;
  price_per_kg: number;
  density: number | null;
  diameter: number | null;
  is_default: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Интерфейс для формы
interface MaterialFormData {
  name: string;
  category: MaterialCategory;
  type: string;
  brand: string;
  color: string;
  price_per_kg: string;
  density: string;
  diameter: string;
  is_default: boolean;
  settings: {
    recommended_temp?: string;
    bed_temp?: string;
    drying_temp?: string;
    drying_time?: string;
    viscosity?: string;
    wavelength?: string;
    particle_size?: string;
    melting_point?: string;
    [key: string]: any;
  };
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([
    {
      id: 1,
      user_id: 1,
      name: 'PLA Basic',
      category: 'filament',
      type: 'PLA',
      brand: 'FilamentPro',
      color: '#FF5733',
      price_per_kg: 2500,
      density: 1.24,
      diameter: 1.75,
      is_default: true,
      settings: {
        recommended_temp: '200-220',
        bed_temp: '60',
        drying_temp: '45',
        drying_time: '4',
      },
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-03-15T14:30:00Z',
    },
    {
      id: 2,
      user_id: 1,
      name: 'ABS Professional',
      category: 'filament',
      type: 'ABS',
      brand: 'TechFil',
      color: '#3498DB',
      price_per_kg: 3200,
      density: 1.04,
      diameter: 1.75,
      is_default: false,
      settings: {
        recommended_temp: '230-250',
        bed_temp: '100',
        drying_temp: '65',
        drying_time: '3',
      },
      created_at: '2024-01-15T11:20:00Z',
      updated_at: '2024-03-10T09:15:00Z',
    },
    {
      id: 3,
      user_id: 1,
      name: 'Standard Resin',
      category: 'resin',
      type: 'Standard',
      brand: 'Anycubic',
      color: '#27AE60',
      price_per_kg: 4500,
      density: 1.1,
      diameter: null,
      is_default: false,
      settings: {
        recommended_temp: '25-35',
        viscosity: '200-300',
        wavelength: '405',
      },
      created_at: '2024-02-01T15:45:00Z',
      updated_at: '2024-03-12T16:20:00Z',
    },
    {
      id: 4,
      user_id: 1,
      name: 'Nylon 12 Powder',
      category: 'powder',
      type: 'Nylon 12',
      brand: 'EOS',
      color: '#F1C40F',
      price_per_kg: 12000,
      density: 0.95,
      diameter: null,
      is_default: false,
      settings: {
        particle_size: '50-80',
        melting_point: '178',
        recommended_temp: '170-180',
      },
      created_at: '2024-02-10T09:30:00Z',
      updated_at: '2024-03-14T11:45:00Z',
    },
    {
      id: 5,
      user_id: 1,
      name: 'Support Material',
      category: 'other',
      type: 'Support',
      brand: 'Generic',
      color: '#95A5A6',
      price_per_kg: 1800,
      density: 1.2,
      diameter: 1.75,
      is_default: false,
      settings: {
        soluble: 'true',
        dissolution_time: '2',
      },
      created_at: '2024-02-20T13:15:00Z',
      updated_at: '2024-03-13T10:30:00Z',
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [activeTab, setActiveTab] = useState<MaterialCategory | 'all'>('all');

  const [formData, setFormData] = useState<MaterialFormData>({
    name: '',
    category: 'filament',
    type: 'PLA',
    brand: '',
    color: '#000000',
    price_per_kg: '',
    density: '',
    diameter: '',
    is_default: false,
    settings: {},
  });

  // Обработчики формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: MaterialCategory) => {
    setFormData(prev => ({ 
      ...prev, 
      category: value,
      type: MATERIAL_TYPES[value][0],
      diameter: value === 'filament' ? '1.75' : '',
      settings: getDefaultSettings(value, MATERIAL_TYPES[value][0])
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      type: value,
      settings: getDefaultSettings(prev.category, value)
    }));
  };

  const handleSettingChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  const getDefaultSettings = (category: MaterialCategory, _type: string) => {
    switch(category) {
      case 'filament':
        return {
          recommended_temp: '200-220',
          bed_temp: '60',
          drying_temp: '45',
          drying_time: '4',
        };
      case 'resin':
        return {
          recommended_temp: '25-35',
          viscosity: '200-300',
          wavelength: '405',
          exposure_time: '2.5',
        };
      case 'powder':
        return {
          particle_size: '50-80',
          melting_point: '178',
          recommended_temp: '170-180',
          layer_thickness: '0.1',
        };
      case 'other':
        return {
          notes: '',
          storage_temp: '20-25',
          shelf_life: '12',
        };
      default:
        return {};
    }
  };

  const handleAddMaterial = () => {
    const newMaterial: Material = {
      id: Date.now(),
      user_id: 1,
      name: formData.name,
      category: formData.category,
      type: formData.type,
      brand: formData.brand,
      color: formData.color,
      price_per_kg: parseFloat(formData.price_per_kg) || 0,
      density: formData.density ? parseFloat(formData.density) : null,
      diameter: formData.diameter ? parseFloat(formData.diameter) : null,
      is_default: formData.is_default,
      settings: formData.settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMaterials(prev => [...prev, newMaterial]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditMaterial = () => {
    if (!selectedMaterial) return;

    const updatedMaterials = materials.map(m => 
      m.id === selectedMaterial.id 
        ? { 
            ...m, 
            ...formData,
            price_per_kg: parseFloat(formData.price_per_kg) || 0,
            density: formData.density ? parseFloat(formData.density) : null,
            diameter: formData.diameter ? parseFloat(formData.diameter) : null,
            updated_at: new Date().toISOString(),
          }
        : m
    );

    setMaterials(updatedMaterials);
    setIsEditDialogOpen(false);
    resetForm();
  };

  const handleDeleteMaterial = () => {
    if (!selectedMaterial) return;
    setMaterials(prev => prev.filter(m => m.id !== selectedMaterial.id));
    setIsDeleteDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'filament',
      type: 'PLA',
      brand: '',
      color: '#000000',
      price_per_kg: '',
      density: '',
      diameter: '',
      is_default: false,
      settings: getDefaultSettings('filament', 'PLA'),
    });
    setSelectedMaterial(null);
  };

  const openEditDialog = (material: Material) => {
    setSelectedMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      type: material.type,
      brand: material.brand || '',
      color: material.color || '#000000',
      price_per_kg: material.price_per_kg.toString(),
      density: material.density?.toString() || '',
      diameter: material.diameter?.toString() || '',
      is_default: material.is_default,
      settings: material.settings,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (material: Material) => {
    setSelectedMaterial(material);
    setIsDeleteDialogOpen(true);
  };

  const setAsDefault = (materialId: number) => {
    setMaterials(prev => prev.map(m => ({
      ...m,
      is_default: m.id === materialId,
    })));
  };

  const getCategoryIcon = (category: MaterialCategory) => {
    switch(category) {
      case 'filament': return <CircleDot className="h-4 w-4" />;
      case 'resin': return <Droplet className="h-4 w-4" />;
      case 'powder': return <Beaker className="h-4 w-4" />;
      case 'other': return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: MaterialCategory) => {
    switch(category) {
      case 'filament': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'resin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'powder': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'other': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return '';
    }
  };

  const getCategoryLabel = (category: MaterialCategory) => {
    switch(category) {
      case 'filament': return 'Филамент';
      case 'resin': return 'Смола';
      case 'powder': return 'Порошок';
      case 'other': return 'Другое';
    }
  };

  const filteredMaterials = activeTab === 'all' 
    ? materials 
    : materials.filter(m => m.category === activeTab);

  // Статистика по материалам
  const totalMaterials = materials.length;
  const averagePrice = Math.round(materials.reduce((sum, m) => sum + m.price_per_kg, 0) / totalMaterials);
  const filamentCount = materials.filter(m => m.category === 'filament').length;
  const resinCount = materials.filter(m => m.category === 'resin').length;
  const defaultMaterial = materials.find(m => m.is_default);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Заголовок */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Материалы для печати</h1>
          <p className="text-muted-foreground">
            Управляйте материалами и их характеристиками
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить материал
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Добавить новый материал</DialogTitle>
              <DialogDescription>
                Заполните информацию о новом материале для 3D печати
              </DialogDescription>
            </DialogHeader>
            <MaterialForm 
              formData={formData}
              onInputChange={handleInputChange}
              onCategoryChange={handleCategoryChange}
              onTypeChange={handleTypeChange}
              onSettingChange={handleSettingChange}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddMaterial}>Добавить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего материалов</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaterials}</div>
            <p className="text-xs text-muted-foreground">
              {filamentCount} филамент · {resinCount} смола
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средняя цена</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePrice.toLocaleString()} ₽/кг</div>
            <p className="text-xs text-muted-foreground">
              От {Math.min(...materials.map(m => m.price_per_kg)).toLocaleString()} до {Math.max(...materials.map(m => m.price_per_kg)).toLocaleString()} ₽
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Диаметры</CardTitle>
            <Ruler className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(materials.filter(m => m.diameter).map(m => m.diameter))].join(', ')} мм
            </div>
            <p className="text-xs text-muted-foreground">
              Доступные диаметры филамента
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Основной материал</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {defaultMaterial?.name || 'Не выбран'}
            </div>
            <p className="text-xs text-muted-foreground">
              {defaultMaterial?.type || 'Установите основной материал'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Табы для фильтрации */}
      <Tabs defaultValue="all" className="mb-6" onValueChange={(value) => setActiveTab(value as MaterialCategory | 'all')}>
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          {MATERIAL_CATEGORIES.map(category => (
            <TabsTrigger key={category} value={category}>
              {getCategoryLabel(category)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Список материалов */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredMaterials.map((material) => (
          <Card key={material.id} className={material.is_default ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: material.color }}
                    />
                    {material.name}
                    {material.is_default && (
                      <Badge variant="default" className="ml-2">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Основной
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{material.brand} · {material.type}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Действия</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openEditDialog(material)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAsDefault(material.id)}>
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
                      onClick={() => openDeleteDialog(material)}
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
                <Badge className={getCategoryColor(material.category)}>
                  {getCategoryIcon(material.category)}
                  <span className="ml-1">{getCategoryLabel(material.category)}</span>
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Цена:</span>
                  <span className="font-medium">{material.price_per_kg.toLocaleString()} ₽/кг</span>
                </div>
                
                {material.density && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Плотность:</span>
                    <span className="font-medium">{material.density} г/см³</span>
                  </div>
                )}
                
                {material.diameter && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Диаметр:</span>
                    <span className="font-medium">{material.diameter} мм</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div>
                  <span className="text-muted-foreground text-xs">Характеристики:</span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {Object.entries(material.settings).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">{getSettingLabel(key)}:</span>{' '}
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-3">
              <div className="flex justify-between w-full">
                <span>Добавлен: {new Date(material.created_at).toLocaleDateString()}</span>
                <span>ID: {material.id}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать материал</DialogTitle>
            <DialogDescription>
              Измените информацию о материале
            </DialogDescription>
          </DialogHeader>
          <MaterialForm 
            formData={formData}
            onInputChange={handleInputChange}
            onCategoryChange={handleCategoryChange}
            onTypeChange={handleTypeChange}
            onSettingChange={handleSettingChange}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEditMaterial}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить материал</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить материал "{selectedMaterial?.name}"? 
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteMaterial}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Компонент формы материала
function MaterialForm({ 
  formData, 
  onInputChange, 
  onCategoryChange,
  onTypeChange,
  onSettingChange 
}: { 
  formData: MaterialFormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCategoryChange: (value: MaterialCategory) => void;
  onTypeChange: (value: string) => void;
  onSettingChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Название материала *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            placeholder="Например: PLA Basic"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Категория *</Label>
          <Select value={formData.category} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filament">Филамент</SelectItem>
              <SelectItem value="resin">Смола</SelectItem>
              <SelectItem value="powder">Порошок</SelectItem>
              <SelectItem value="other">Другое</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Тип материала *</Label>
          <Select value={formData.type} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите тип" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES[formData.category].map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">Бренд</Label>
          <Input
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={onInputChange}
            placeholder="Например: FilamentPro"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Цвет</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              name="color"
              type="color"
              value={formData.color}
              onChange={onInputChange}
              className="w-16 p-1"
            />
            <Input
              value={formData.color}
              onChange={onInputChange}
              name="color"
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price_per_kg">Цена за кг (₽) *</Label>
          <Input
            id="price_per_kg"
            name="price_per_kg"
            type="number"
            value={formData.price_per_kg}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="density">Плотность (г/см³)</Label>
          <Input
            id="density"
            name="density"
            type="number"
            step="0.01"
            value={formData.density}
            onChange={onInputChange}
            placeholder="1.24"
          />
        </div>

        {formData.category === 'filament' && (
          <div className="space-y-2">
            <Label htmlFor="diameter">Диаметр (мм)</Label>
            <Select 
              value={formData.diameter} 
              onValueChange={(value) => 
                onInputChange({ target: { name: 'diameter', value } } as any)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите диаметр" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.75">1.75 мм</SelectItem>
                <SelectItem value="2.85">2.85 мм</SelectItem>
                <SelectItem value="3.00">3.00 мм</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <Label className="mb-2 block">Технические характеристики</Label>
        <div className="grid grid-cols-2 gap-4">
          {formData.category === 'filament' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recommended_temp">Температура печати (°C)</Label>
                <Input
                  id="recommended_temp"
                  value={formData.settings.recommended_temp || ''}
                  onChange={(e) => onSettingChange('recommended_temp', e.target.value)}
                  placeholder="200-220"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed_temp">Температура стола (°C)</Label>
                <Input
                  id="bed_temp"
                  value={formData.settings.bed_temp || ''}
                  onChange={(e) => onSettingChange('bed_temp', e.target.value)}
                  placeholder="60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drying_temp">Температура сушки (°C)</Label>
                <Input
                  id="drying_temp"
                  value={formData.settings.drying_temp || ''}
                  onChange={(e) => onSettingChange('drying_temp', e.target.value)}
                  placeholder="45"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drying_time">Время сушки (ч)</Label>
                <Input
                  id="drying_time"
                  value={formData.settings.drying_time || ''}
                  onChange={(e) => onSettingChange('drying_time', e.target.value)}
                  placeholder="4"
                />
              </div>
            </>
          )}

          {formData.category === 'resin' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recommended_temp_resin">Температура (°C)</Label>
                <Input
                  id="recommended_temp_resin"
                  value={formData.settings.recommended_temp || ''}
                  onChange={(e) => onSettingChange('recommended_temp', e.target.value)}
                  placeholder="25-35"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="viscosity">Вязкость (cPs)</Label>
                <Input
                  id="viscosity"
                  value={formData.settings.viscosity || ''}
                  onChange={(e) => onSettingChange('viscosity', e.target.value)}
                  placeholder="200-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wavelength">Длина волны (нм)</Label>
                <Input
                  id="wavelength"
                  value={formData.settings.wavelength || ''}
                  onChange={(e) => onSettingChange('wavelength', e.target.value)}
                  placeholder="405"
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
            </>
          )}

          {formData.category === 'powder' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="particle_size">Размер частиц (мкм)</Label>
                <Input
                  id="particle_size"
                  value={formData.settings.particle_size || ''}
                  onChange={(e) => onSettingChange('particle_size', e.target.value)}
                  placeholder="50-80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="melting_point">Температура плавления (°C)</Label>
                <Input
                  id="melting_point"
                  value={formData.settings.melting_point || ''}
                  onChange={(e) => onSettingChange('melting_point', e.target.value)}
                  placeholder="178"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recommended_temp_powder">Температура печати (°C)</Label>
                <Input
                  id="recommended_temp_powder"
                  value={formData.settings.recommended_temp || ''}
                  onChange={(e) => onSettingChange('recommended_temp', e.target.value)}
                  placeholder="170-180"
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
            </>
          )}

          {formData.category === 'other' && (
            <>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={formData.settings.notes || ''}
                  onChange={(e: { target: { value: string; }; }) => onSettingChange('notes', e.target.value)}
                  placeholder="Дополнительная информация о материале"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storage_temp">Температура хранения (°C)</Label>
                <Input
                  id="storage_temp"
                  value={formData.settings.storage_temp || ''}
                  onChange={(e) => onSettingChange('storage_temp', e.target.value)}
                  placeholder="20-25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shelf_life">Срок годности (мес)</Label>
                <Input
                  id="shelf_life"
                  value={formData.settings.shelf_life || ''}
                  onChange={(e) => onSettingChange('shelf_life', e.target.value)}
                  placeholder="12"
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
        <Label htmlFor="is_default">Сделать основным материалом</Label>
      </div>
    </div>
  );
}

// Вспомогательная функция для получения метки настройки
function getSettingLabel(key: string): string {
  const labels: Record<string, string> = {
    recommended_temp: 'Температура',
    bed_temp: 'Стол',
    drying_temp: 'Сушка',
    drying_time: 'Время сушки',
    viscosity: 'Вязкость',
    wavelength: 'Длина волны',
    exposure_time: 'Экспозиция',
    particle_size: 'Частицы',
    melting_point: 'Плавление',
    layer_thickness: 'Слой',
    notes: 'Примечания',
    storage_temp: 'Хранение',
    shelf_life: 'Срок',
  };
  return labels[key] || key;
}

// Вспомогательная функция для обновления состояния формы
function setFormData(updater: (prev: MaterialFormData) => MaterialFormData) {
  // Эта функция будет передана из родительского компонента
  // Здесь для примера, в реальном коде нужно передавать через props
}