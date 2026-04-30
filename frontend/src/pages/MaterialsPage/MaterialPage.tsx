// pages/MaterialsPage.tsx
import { useState } from 'react'
import {
    Plus, Package, Edit, Trash2, MoreVertical, Star,
    Copy, Droplet, Ruler, Weight, Award, CircleDot,
    Beaker, Loader2, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
    MATERIAL_CATEGORIES, MATERIAL_TYPES, CATEGORY_LABELS,
    type Material, type MaterialCategory, type CreateMaterialData,
} from '@/api/materials'
import { useMaterials } from '@/hooks/useMaterials'

// ─── Типы формы ───────────────────────────────────────────────────────────────

interface MaterialFormData {
    name: string
    category: MaterialCategory
    type: string
    brand: string
    color: string
    price_per_kg: string
    density: string
    diameter: string
    is_default: boolean
    settings: Record<string, string>
}

const EMPTY_FORM: MaterialFormData = {
    name: '', category: 'filament', type: 'pla',
    brand: '', color: '#000000',
    price_per_kg: '', density: '', diameter: '1.75',
    is_default: false, settings: getDefaultSettings('filament'),
}

function getDefaultSettings(category: MaterialCategory): Record<string, string> {
    switch (category) {
        case 'filament': return { recommended_temp: '200-220', bed_temp: '60', drying_temp: '45', drying_time: '4' }
        case 'resin':    return { recommended_temp: '25-35', viscosity: '200-300', wavelength: '405', exposure_time: '2.5' }
        case 'powder':   return { particle_size: '50-80', melting_point: '178', recommended_temp: '170-180', layer_thickness: '0.1' }
        case 'other':    return { notes: '', storage_temp: '20-25', shelf_life: '12' }
    }
}

function formToApiData(form: MaterialFormData): CreateMaterialData {
    return {
        name:        form.name,
        category:    form.category,
        type:        form.type,
        brand:       form.brand   || undefined,
        color:       form.color   || undefined,
        price_per_kg: parseFloat(form.price_per_kg) || 0,
        density:     form.density  ? parseFloat(form.density)  : undefined,
        diameter:    form.diameter ? parseFloat(form.diameter) : undefined,
        is_default:  form.is_default,
        settings:    form.settings,
    }
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function getCategoryIcon(category: MaterialCategory) {
    switch (category) {
        case 'filament': return <CircleDot className="h-3 w-3" />
        case 'resin':    return <Droplet className="h-3 w-3" />
        case 'powder':   return <Beaker className="h-3 w-3" />
        case 'other':    return <Package className="h-3 w-3" />
    }
}

function getCategoryColor(category: MaterialCategory) {
    switch (category) {
        case 'filament': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        case 'resin':    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        case 'powder':   return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        case 'other':    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
}

const SETTING_LABELS: Record<string, string> = {
    recommended_temp: 'Температура',
    bed_temp:         'Стол',
    drying_temp:      'Сушка',
    drying_time:      'Время сушки',
    viscosity:        'Вязкость',
    wavelength:       'Длина волны',
    exposure_time:    'Экспозиция',
    particle_size:    'Частицы',
    melting_point:    'Плавление',
    layer_thickness:  'Слой',
    notes:            'Примечания',
    storage_temp:     'Хранение',
    shelf_life:       'Срок',
}

// ─── Страница ─────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
    const {
        materials, isLoading, fetchMaterials,
        createMaterial, updateMaterial, deleteMaterial,
        setDefaultMaterial, duplicateMaterial,
    } = useMaterials()

    const [activeTab, setActiveTab]             = useState<MaterialCategory | 'all'>('all')
    const [formData, setFormData]               = useState<MaterialFormData>(EMPTY_FORM)
    const [isAddOpen, setIsAddOpen]             = useState(false)
    const [isEditOpen, setIsEditOpen]           = useState(false)
    const [isDeleteOpen, setIsDeleteOpen]       = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
    const [isSaving, setIsSaving]               = useState(false)
    const [isDeleting, setIsDeleting]           = useState(false)

    // ─── Форма ────────────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCategoryChange = (value: MaterialCategory) => {
        setFormData(prev => ({
            ...prev,
            category: value,
            type:     MATERIAL_TYPES[value][0],
            diameter: value === 'filament' ? '1.75' : '',
            settings: getDefaultSettings(value),
        }))
    }

    const handleTypeChange = (value: string) => {
        setFormData(prev => ({ ...prev, type: value }))
    }

    const handleSettingChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }))
    }

    const resetForm = () => { setFormData(EMPTY_FORM); setSelectedMaterial(null) }

    const openEditDialog = (material: Material) => {
        setSelectedMaterial(material)
        setFormData({
            name:         material.name,
            category:     material.category,
            type:         material.type,
            brand:        material.brand    ?? '',
            color:        material.color    ?? '#000000',
            price_per_kg: material.price_per_kg.toString(),
            density:      material.density?.toString()  ?? '',
            diameter:     material.diameter?.toString() ?? '',
            is_default:   material.is_default,
            settings:     { ...material.settings },
        })
        setIsEditOpen(true)
    }

    // ─── Действия ─────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!formData.name.trim()) return
        setIsSaving(true)
        const ok = await createMaterial(formToApiData(formData))
        setIsSaving(false)
        if (ok) { setIsAddOpen(false); resetForm() }
    }

    const handleEdit = async () => {
        if (!selectedMaterial) return
        setIsSaving(true)
        const ok = await updateMaterial(selectedMaterial.id, formToApiData(formData))
        setIsSaving(false)
        if (ok) { setIsEditOpen(false); resetForm() }
    }

    const handleDelete = async () => {
        if (!selectedMaterial) return
        setIsDeleting(true)
        const ok = await deleteMaterial(selectedMaterial.id)
        setIsDeleting(false)
        if (ok) { setIsDeleteOpen(false); setSelectedMaterial(null) }
    }

    // ─── Производные данные ───────────────────────────────────────────────────
    const filtered = activeTab === 'all' ? materials : materials.filter(m => m.category === activeTab)
    const totalPrice = materials.reduce((s, m) => s + m.price_per_kg, 0)
    const avgPrice   = materials.length ? Math.round(totalPrice / materials.length) : 0
    const minPrice   = materials.length ? Math.min(...materials.map(m => m.price_per_kg)) : 0
    const maxPrice   = materials.length ? Math.max(...materials.map(m => m.price_per_kg)) : 0
    const diameters  = [...new Set(materials.filter(m => m.diameter).map(m => m.diameter))]
    const defaultMat = materials.find(m => m.is_default)

    // ─── Скелетон ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="container mx-auto p-6 max-w-7xl">
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-72" /></div>
                    <Skeleton className="h-10 w-44" />
                </div>
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* ─── Заголовок ─────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Материалы для печати</h1>
                    <p className="text-muted-foreground">Управляйте материалами и их характеристиками</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchMaterials()} title="Обновить">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить материал
                    </Button>
                </div>
            </div>

            {/* ─── Статистика ────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего материалов</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{materials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {materials.filter(m => m.category === 'filament').length} филамент ·{' '}
                            {materials.filter(m => m.category === 'resin').length} смола
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Средняя цена</CardTitle>
                        <Weight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgPrice.toLocaleString()} ₽/кг</div>
                        <p className="text-xs text-muted-foreground">
                            От {minPrice.toLocaleString()} до {maxPrice.toLocaleString()} ₽
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
                            {diameters.length ? diameters.join(', ') + ' мм' : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">Доступные диаметры филамента</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Основной материал</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{defaultMat?.name ?? 'Не выбран'}</div>
                        <p className="text-xs text-muted-foreground">
                            {defaultMat?.type ?? 'Установите основной материал'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Фильтр ────────────────────────────────────────────────────── */}
            <Tabs defaultValue="all" className="mb-6" onValueChange={v => setActiveTab(v as MaterialCategory | 'all')}>
                <TabsList>
                    <TabsTrigger value="all">Все</TabsTrigger>
                    {MATERIAL_CATEGORIES.map(cat => (
                        <TabsTrigger key={cat} value={cat}>{CATEGORY_LABELS[cat]}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* ─── Пустое состояние ──────────────────────────────────────────── */}
            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                        {activeTab === 'all' ? 'Материалы не добавлены' : `Нет материалов категории «${CATEGORY_LABELS[activeTab as MaterialCategory]}»`}
                    </p>
                    {activeTab === 'all' && (
                        <Button className="mt-4" onClick={() => { resetForm(); setIsAddOpen(true) }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить первый материал
                        </Button>
                    )}
                </div>
            )}

            {/* ─── Карточки ──────────────────────────────────────────────────── */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(material => (
                    <Card key={material.id} className={material.is_default ? 'border-primary' : ''}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 min-w-0 pr-2">
                                    <CardTitle className="flex items-center gap-2 flex-wrap">
                                        {material.color && (
                                            <div className="w-4 h-4 rounded-full shrink-0 border border-border"
                                                style={{ backgroundColor: material.color }} />
                                        )}
                                        <span className="truncate">{material.name}</span>
                                        {material.is_default && (
                                            <Badge variant="default">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                Основной
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {[material.brand, material.type.toUpperCase()].filter(Boolean).join(' · ')}
                                    </CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => openEditDialog(material)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Редактировать
                                        </DropdownMenuItem>
                                        {!material.is_default && (
                                            <DropdownMenuItem onClick={() => setDefaultMaterial(material.id)}>
                                                <Star className="mr-2 h-4 w-4" />
                                                Сделать основным
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => duplicateMaterial(material)}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Дублировать
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => { setSelectedMaterial(material); setIsDeleteOpen(true) }}
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
                                    <span className="ml-1">{CATEGORY_LABELS[material.category]}</span>
                                </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Цена</span>
                                    <span className="font-medium">{material.price_per_kg.toLocaleString()} ₽/кг</span>
                                </div>
                                {material.density && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Плотность</span>
                                        <span className="font-medium">{material.density} г/см³</span>
                                    </div>
                                )}
                                {material.diameter && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Диаметр</span>
                                        <span className="font-medium">{material.diameter} мм</span>
                                    </div>
                                )}

                                {Object.keys(material.settings).length > 0 && (
                                    <>
                                        <Separator className="my-2" />
                                        <div>
                                            <span className="text-muted-foreground text-xs">Характеристики</span>
                                            <div className="grid grid-cols-2 gap-1 mt-1">
                                                {Object.entries(material.settings).map(([key, value]) => (
                                                    <div key={key} className="text-xs">
                                                        <span className="text-muted-foreground">
                                                            {SETTING_LABELS[key] ?? key}:
                                                        </span>{' '}
                                                        <span className="font-medium">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="text-xs text-muted-foreground border-t pt-3">
                            <div className="flex justify-between w-full">
                                <span>Добавлен: {new Date(material.created_at).toLocaleDateString('ru-RU')}</span>
                                <span>ID: {material.id}</span>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* ─── Диалог добавления ─────────────────────────────────────────── */}
            <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Добавить материал</DialogTitle>
                        <DialogDescription>Заполните информацию о новом материале для 3D печати</DialogDescription>
                    </DialogHeader>
                    <MaterialForm
                        formData={formData}
                        onInputChange={handleInputChange}
                        onCategoryChange={handleCategoryChange}
                        onTypeChange={handleTypeChange}
                        onSettingChange={handleSettingChange}
                        onDefaultChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Отмена</Button>
                        <Button onClick={handleAdd} disabled={isSaving || !formData.name.trim()}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Добавить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Диалог редактирования ─────────────────────────────────────── */}
            <Dialog open={isEditOpen} onOpenChange={open => { setIsEditOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Редактировать материал</DialogTitle>
                        <DialogDescription>Измените информацию о материале</DialogDescription>
                    </DialogHeader>
                    <MaterialForm
                        formData={formData}
                        onInputChange={handleInputChange}
                        onCategoryChange={handleCategoryChange}
                        onTypeChange={handleTypeChange}
                        onSettingChange={handleSettingChange}
                        onDefaultChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Отмена</Button>
                        <Button onClick={handleEdit} disabled={isSaving || !formData.name.trim()}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Диалог удаления ───────────────────────────────────────────── */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить материал</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить материал «{selectedMaterial?.name}»?
                            Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Отмена</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Удаление...</> : 'Удалить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Форма материала ──────────────────────────────────────────────────────────

interface MaterialFormProps {
    formData: MaterialFormData
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onCategoryChange: (v: MaterialCategory) => void
    onTypeChange: (v: string) => void
    onSettingChange: (key: string, value: string) => void
    onDefaultChange: (checked: boolean) => void
}

function MaterialForm({ formData, onInputChange, onCategoryChange, onTypeChange, onSettingChange, onDefaultChange }: MaterialFormProps) {
    return (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Название *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={onInputChange} placeholder="PLA Basic" />
                </div>
                <div className="space-y-2">
                    <Label>Категория *</Label>
                    <Select value={formData.category} onValueChange={onCategoryChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Label>Тип материала *</Label>
                    <Select value={formData.type} onValueChange={onTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {MATERIAL_TYPES[formData.category].map(t => (
                                <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="brand">Бренд</Label>
                    <Input id="brand" name="brand" value={formData.brand} onChange={onInputChange} placeholder="FilamentPro" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="color">Цвет</Label>
                    <div className="flex gap-2">
                        <Input id="color" name="color" type="color" value={formData.color} onChange={onInputChange} className="w-14 p-1" />
                        <Input name="color" value={formData.color} onChange={onInputChange} placeholder="#000000" className="flex-1" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price_per_kg">Цена за кг (₽) *</Label>
                    <Input id="price_per_kg" name="price_per_kg" type="number" value={formData.price_per_kg} onChange={onInputChange} placeholder="0" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="density">Плотность (г/см³)</Label>
                    <Input id="density" name="density" type="number" step="0.01" value={formData.density} onChange={onInputChange} placeholder="1.24" />
                </div>
                {formData.category === 'filament' && (
                    <div className="space-y-2">
                        <Label>Диаметр (мм)</Label>
                        <Select
                            value={formData.diameter}
                            onValueChange={v => onInputChange({ target: { name: 'diameter', value: v } } as any)}
                        >
                            <SelectTrigger><SelectValue placeholder="Выберите диаметр" /></SelectTrigger>
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
                <Label className="mb-3 block">Технические характеристики</Label>
                <div className="grid grid-cols-2 gap-4">
                    {formData.category === 'filament' && (
                        <>
                            <SettingField label="Температура печати (°C)" id="recommended_temp" value={formData.settings.recommended_temp} placeholder="200-220" onChange={v => onSettingChange('recommended_temp', v)} />
                            <SettingField label="Температура стола (°C)"  id="bed_temp"          value={formData.settings.bed_temp}          placeholder="60"      onChange={v => onSettingChange('bed_temp', v)} />
                            <SettingField label="Температура сушки (°C)"  id="drying_temp"      value={formData.settings.drying_temp}       placeholder="45"      onChange={v => onSettingChange('drying_temp', v)} />
                            <SettingField label="Время сушки (ч)"         id="drying_time"      value={formData.settings.drying_time}       placeholder="4"       onChange={v => onSettingChange('drying_time', v)} />
                        </>
                    )}
                    {formData.category === 'resin' && (
                        <>
                            <SettingField label="Температура (°C)"        id="recommended_temp" value={formData.settings.recommended_temp} placeholder="25-35"   onChange={v => onSettingChange('recommended_temp', v)} />
                            <SettingField label="Вязкость (cPs)"          id="viscosity"        value={formData.settings.viscosity}        placeholder="200-300" onChange={v => onSettingChange('viscosity', v)} />
                            <SettingField label="Длина волны (нм)"        id="wavelength"       value={formData.settings.wavelength}       placeholder="405"     onChange={v => onSettingChange('wavelength', v)} />
                            <SettingField label="Время экспозиции (с)"    id="exposure_time"    value={formData.settings.exposure_time}    placeholder="2.5"     onChange={v => onSettingChange('exposure_time', v)} />
                        </>
                    )}
                    {formData.category === 'powder' && (
                        <>
                            <SettingField label="Размер частиц (мкм)"     id="particle_size"    value={formData.settings.particle_size}    placeholder="50-80"   onChange={v => onSettingChange('particle_size', v)} />
                            <SettingField label="Температура плавления"   id="melting_point"    value={formData.settings.melting_point}    placeholder="178"     onChange={v => onSettingChange('melting_point', v)} />
                            <SettingField label="Температура печати (°C)" id="recommended_temp" value={formData.settings.recommended_temp} placeholder="170-180" onChange={v => onSettingChange('recommended_temp', v)} />
                            <SettingField label="Толщина слоя (мм)"       id="layer_thickness"  value={formData.settings.layer_thickness}  placeholder="0.1"     onChange={v => onSettingChange('layer_thickness', v)} />
                        </>
                    )}
                    {formData.category === 'other' && (
                        <>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="notes">Примечания</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.settings.notes ?? ''}
                                    onChange={e => onSettingChange('notes', e.target.value)}
                                    placeholder="Дополнительная информация о материале"
                                />
                            </div>
                            <SettingField label="Температура хранения (°C)" id="storage_temp" value={formData.settings.storage_temp} placeholder="20-25" onChange={v => onSettingChange('storage_temp', v)} />
                            <SettingField label="Срок годности (мес)"       id="shelf_life"   value={formData.settings.shelf_life}   placeholder="12"    onChange={v => onSettingChange('shelf_life', v)} />
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Switch id="is_default" checked={formData.is_default} onCheckedChange={onDefaultChange} />
                <Label htmlFor="is_default">Сделать основным материалом</Label>
            </div>
        </div>
    )
}

function SettingField({ label, id, value, placeholder, onChange }: {
    label: string; id: string; value?: string; placeholder: string; onChange: (v: string) => void
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        </div>
    )
}