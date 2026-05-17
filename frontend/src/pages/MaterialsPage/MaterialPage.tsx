import { useState } from 'react'
import {
    Plus, Package, Edit, Trash2, MoreVertical, Star,
    Copy, Droplet, Ruler, Weight, Award, CircleDot,
    Beaker, Loader2, RefreshCw, X, PlusCircle, Settings2,
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

// ─── Типы ─────────────────────────────────────────────────────────────────────

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

interface SettingEntry {
    id: string
    key: string
    value: string
    suggested?: boolean
}

interface SuggestedParam {
    key: string
    label: string
    placeholder: string
    textarea?: boolean
}

// ─── Предложения по умолчанию ────────────────────────────────────────────────

const SUGGESTED_PARAMS: Record<MaterialCategory, SuggestedParam[]> = {
    filament: [
        { key: 'recommended_temp', label: 'Температура печати (°C)', placeholder: '200-220' },
        { key: 'bed_temp',         label: 'Температура стола (°C)',  placeholder: '60'      },
        { key: 'drying_temp',      label: 'Температура сушки (°C)',  placeholder: '45'      },
        { key: 'drying_time',      label: 'Время сушки (ч)',         placeholder: '4'       },
    ],
    resin: [
        { key: 'recommended_temp', label: 'Рабочая температура (°C)', placeholder: '25-35'   },
        { key: 'viscosity',        label: 'Вязкость (cPs)',           placeholder: '200-300' },
        { key: 'wavelength',       label: 'Длина волны (нм)',         placeholder: '405'     },
        { key: 'exposure_time',    label: 'Время экспозиции (с)',     placeholder: '2.5'     },
    ],
    powder: [
        { key: 'particle_size',    label: 'Размер частиц (мкм)',      placeholder: '50-80'   },
        { key: 'melting_point',    label: 'Температура плавления (°C)',placeholder: '178'     },
        { key: 'recommended_temp', label: 'Температура печати (°C)',  placeholder: '170-180' },
        { key: 'layer_thickness',  label: 'Толщина слоя (мм)',        placeholder: '0.1'     },
    ],
    other: [
        { key: 'storage_temp', label: 'Температура хранения (°C)', placeholder: '20-25' },
        { key: 'shelf_life',   label: 'Срок годности (мес)',        placeholder: '12'    },
        { key: 'notes',        label: 'Примечания',                 placeholder: 'Дополнительная информация', textarea: true },
    ],
}

// Читаемые метки для карточки
const PARAM_LABELS: Record<string, string> = {
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
    notes:            'Заметки',
    storage_temp:     'Хранение',
    shelf_life:       'Срок',
}

function getParamLabel(key: string): string {
    return PARAM_LABELS[key] ?? key
}

// ─── entries <-> settings ─────────────────────────────────────────────────────

let _idCounter = 0
function uid() { return String(++_idCounter) }

function settingsToEntries(settings: Record<string, string>): SettingEntry[] {
    return Object.entries(settings).map(([key, value]) => ({ id: uid(), key, value }))
}

function getEmptySuggestions(category: MaterialCategory): SettingEntry[] {
    return SUGGESTED_PARAMS[category].map(p => ({
        id: uid(), key: p.key, value: '', suggested: true,
    }))
}

function entriesToSettings(entries: SettingEntry[]): Record<string, string> {
    const result: Record<string, string> = {}
    for (const e of entries) {
        const k = e.key.trim()
        const v = e.value.trim()
        if (k && v) result[k] = v
    }
    return result
}

// ─── Прочие утилиты ───────────────────────────────────────────────────────────

const EMPTY_FORM: MaterialFormData = {
    name: '', category: 'filament', type: 'pla',
    brand: '', color: '#000000',
    price_per_kg: '', density: '', diameter: '1.75',
    is_default: false, settings: {},
}

function formToApiData(form: MaterialFormData): CreateMaterialData {
    return {
        name:         form.name,
        category:     form.category,
        type:         form.type,
        brand:        form.brand    || undefined,
        color:        form.color    || undefined,
        price_per_kg: parseFloat(form.price_per_kg) || 0,
        density:      form.density  ? parseFloat(form.density)  : undefined,
        diameter:     form.diameter ? parseFloat(form.diameter) : undefined,
        is_default:   form.is_default,
        settings:     form.settings,
    }
}

function getCategoryIcon(category: MaterialCategory) {
    switch (category) {
        case 'filament': return <CircleDot className="h-3 w-3" />
        case 'resin':    return <Droplet   className="h-3 w-3" />
        case 'powder':   return <Beaker    className="h-3 w-3" />
        case 'other':    return <Package   className="h-3 w-3" />
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

// ─── Страница ─────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
    const {
        materials, isLoading, fetchMaterials,
        createMaterial, updateMaterial, deleteMaterial,
        setDefaultMaterial, duplicateMaterial,
    } = useMaterials()

    const [activeTab, setActiveTab]               = useState<MaterialCategory | 'all'>('all')
    const [formData, setFormData]                 = useState<MaterialFormData>(EMPTY_FORM)
    const [settingEntries, setSettingEntries]     = useState<SettingEntry[]>([])
    const [isAddOpen, setIsAddOpen]               = useState(false)
    const [isEditOpen, setIsEditOpen]             = useState(false)
    const [isDeleteOpen, setIsDeleteOpen]         = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
    const [isSaving, setIsSaving]                 = useState(false)
    const [isDeleting, setIsDeleting]             = useState(false)

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
        }))
        setSettingEntries(getEmptySuggestions(value))
    }

    const handleTypeChange = (value: string) => {
        setFormData(prev => ({ ...prev, type: value }))
    }

    const resetForm = () => {
        setFormData(EMPTY_FORM)
        setSettingEntries([])
        setSelectedMaterial(null)
    }

    const openAddDialog = () => {
        resetForm()
        setSettingEntries(getEmptySuggestions('filament'))
        setIsAddOpen(true)
    }

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
        const existing = settingsToEntries(material.settings)
        const existingKeys = new Set(existing.map(e => e.key))
        const extra = SUGGESTED_PARAMS[material.category]
            .filter(p => !existingKeys.has(p.key))
            .map(p => ({ id: uid(), key: p.key, value: '', suggested: true }))
        setSettingEntries([...existing, ...extra])
        setIsEditOpen(true)
    }

    // ─── Entries ──────────────────────────────────────────────────────────────
    const handleEntryKeyChange   = (id: string, key: string) =>
        setSettingEntries(prev => prev.map(e => e.id === id ? { ...e, key, suggested: false } : e))
    const handleEntryValueChange = (id: string, value: string) =>
        setSettingEntries(prev => prev.map(e => e.id === id ? { ...e, value } : e))
    const handleEntryRemove      = (id: string) =>
        setSettingEntries(prev => prev.filter(e => e.id !== id))
    const handleEntryAdd         = () =>
        setSettingEntries(prev => [...prev, { id: uid(), key: '', value: '', suggested: false }])

    const buildFormWithSettings = (): MaterialFormData => ({
        ...formData,
        settings: entriesToSettings(settingEntries),
    })

    // ─── Действия ─────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!formData.name.trim()) return
        setIsSaving(true)
        const ok = await createMaterial(formToApiData(buildFormWithSettings()))
        setIsSaving(false)
        if (ok) { setIsAddOpen(false); resetForm() }
    }

    const handleEdit = async () => {
        if (!selectedMaterial) return
        setIsSaving(true)
        const ok = await updateMaterial(selectedMaterial.id, formToApiData(buildFormWithSettings()))
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
    const filtered   = activeTab === 'all' ? materials : materials.filter(m => m.category === activeTab)
    const prices     = materials.map(m => Number(m.price_per_kg))
    const totalPrice = prices.reduce((s, p) => s + p, 0)
    const avgPrice   = materials.length ? Math.round(totalPrice / materials.length) : 0
    const minPrice   = prices.length ? Math.min(...prices) : 0
    const maxPrice   = prices.length ? Math.max(...prices) : 0
    const diameters  = [...new Set(materials.filter(m => m.diameter).map(m => m.diameter))]
    const defaultMat = materials.find(m => m.is_default)

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
            {/* Заголовок */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Материалы для печати</h1>
                    <p className="text-muted-foreground">Управляйте материалами и их характеристиками</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => fetchMaterials()} title="Обновить">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить материал
                    </Button>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего материалов</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{materials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {materials.filter(m => m.category === 'filament').length} фил ·{' '}
                            {materials.filter(m => m.category === 'resin').length} смол ·{' '}
                            {materials.filter(m => m.category === 'powder').length} пор ·{' '}
                            {materials.filter(m => m.category === 'other').length} др
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

            {/* Фильтр */}
            <Tabs defaultValue="all" className="mb-6" onValueChange={v => setActiveTab(v as MaterialCategory | 'all')}>
                <TabsList>
                    <TabsTrigger value="all">Все</TabsTrigger>
                    {MATERIAL_CATEGORIES.map(cat => (
                        <TabsTrigger key={cat} value={cat}>{CATEGORY_LABELS[cat]}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Пустое состояние */}
            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                        {activeTab === 'all'
                            ? 'Материалы не добавлены'
                            : `Нет материалов категории «${CATEGORY_LABELS[activeTab as MaterialCategory]}»`
                        }
                    </p>
                    {activeTab === 'all' && (
                        <Button className="mt-4" onClick={openAddDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить первый материал
                        </Button>
                    )}
                </div>
            )}

            {/* Карточки */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(material => (
                    <MaterialCard
                        key={material.id}
                        material={material}
                        onEdit={() => openEditDialog(material)}
                        onDelete={() => { setSelectedMaterial(material); setIsDeleteOpen(true) }}
                        onSetDefault={() => setDefaultMaterial(material.id)}
                        onDuplicate={() => duplicateMaterial(material)}
                    />
                ))}
            </div>

            {/* Диалог добавления */}
            <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Добавить материал</DialogTitle>
                        <DialogDescription>Заполните информацию о новом материале для 3D печати</DialogDescription>
                    </DialogHeader>
                    <MaterialForm
                        formData={formData}
                        settingEntries={settingEntries}
                        onInputChange={handleInputChange}
                        onCategoryChange={handleCategoryChange}
                        onTypeChange={handleTypeChange}
                        onDefaultChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                        onEntryKeyChange={handleEntryKeyChange}
                        onEntryValueChange={handleEntryValueChange}
                        onEntryRemove={handleEntryRemove}
                        onEntryAdd={handleEntryAdd}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Отмена</Button>
                        <Button onClick={handleAdd} disabled={isSaving || !formData.name.trim()}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Добавить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог редактирования */}
            <Dialog open={isEditOpen} onOpenChange={open => { setIsEditOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Редактировать материал</DialogTitle>
                        <DialogDescription>Измените информацию о материале</DialogDescription>
                    </DialogHeader>
                    <MaterialForm
                        formData={formData}
                        settingEntries={settingEntries}
                        onInputChange={handleInputChange}
                        onCategoryChange={handleCategoryChange}
                        onTypeChange={handleTypeChange}
                        onDefaultChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                        onEntryKeyChange={handleEntryKeyChange}
                        onEntryValueChange={handleEntryValueChange}
                        onEntryRemove={handleEntryRemove}
                        onEntryAdd={handleEntryAdd}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Отмена</Button>
                        <Button onClick={handleEdit} disabled={isSaving || !formData.name.trim()}>
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</> : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог удаления */}
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

// ─── Карточка материала ───────────────────────────────────────────────────────

interface MaterialCardProps {
    material: Material
    onEdit: () => void
    onDelete: () => void
    onSetDefault: () => void
    onDuplicate: () => void
}

function MaterialCard({ material, onEdit, onDelete, onSetDefault, onDuplicate }: MaterialCardProps) {
    const settingsEntries = Object.entries(material.settings)
    const hasSettings = settingsEntries.length > 0

    return (
        <Card className={material.is_default ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 min-w-0 pr-2">
                        <CardTitle className="flex items-center gap-2 flex-wrap">
                            {material.color && (
                                <div
                                    className="w-4 h-4 rounded-full shrink-0 border border-border"
                                    style={{ backgroundColor: material.color }}
                                />
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
                            <DropdownMenuItem onClick={onEdit}>
                                <Edit className="mr-2 h-4 w-4" />Редактировать
                            </DropdownMenuItem>
                            {!material.is_default && (
                                <DropdownMenuItem onClick={onSetDefault}>
                                    <Star className="mr-2 h-4 w-4" />Сделать основным
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={onDuplicate}>
                                <Copy className="mr-2 h-4 w-4" />Дублировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                                <Trash2 className="mr-2 h-4 w-4" />Удалить
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
                        <span className="font-medium">{Number(material.price_per_kg).toLocaleString()} ₽/кг</span>
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
                </div>

                {hasSettings && (
                    <>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                            <Settings2 className="h-3 w-3" />
                            <span>Характеристики</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {settingsEntries.map(([key, value]) => (
                                <div
                                    key={key}
                                    className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs"
                                    title={key}
                                >
                                    <span className="text-muted-foreground">{getParamLabel(key)}:</span>
                                    <span className="font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>

            <CardFooter className="text-xs text-muted-foreground border-t pt-3">
                <div className="flex justify-between w-full">
                    <span>Добавлен: {new Date(material.created_at).toLocaleDateString('ru-RU')}</span>
                    <span>ID: {material.id}</span>
                </div>
            </CardFooter>
        </Card>
    )
}

// ─── Форма материала ──────────────────────────────────────────────────────────

interface MaterialFormProps {
    formData: MaterialFormData
    settingEntries: SettingEntry[]
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onCategoryChange: (v: MaterialCategory) => void
    onTypeChange: (v: string) => void
    onDefaultChange: (checked: boolean) => void
    onEntryKeyChange: (id: string, key: string) => void
    onEntryValueChange: (id: string, value: string) => void
    onEntryRemove: (id: string) => void
    onEntryAdd: () => void
}

function MaterialForm({
    formData, settingEntries,
    onInputChange, onCategoryChange, onTypeChange, onDefaultChange,
    onEntryKeyChange, onEntryValueChange, onEntryRemove, onEntryAdd,
}: MaterialFormProps) {
    const suggestions = SUGGESTED_PARAMS[formData.category]

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

            {/* Секция характеристик */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <Label className="block">Технические характеристики</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Необязательно. Незаполненные строки не сохраняются.
                        </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={onEntryAdd}>
                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                        Добавить
                    </Button>
                </div>

                {settingEntries.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md mt-3">
                        Нет характеристик. Нажмите «Добавить» для создания.
                    </p>
                )}

                <div className="space-y-2 mt-3">
                    {settingEntries.map(entry => {
                        const hint = suggestions.find(s => s.key === entry.key)
                        const isTextarea = hint?.textarea && entry.suggested

                        return (
                            <div key={entry.id} className="flex items-start gap-2">
                                {/* Ключ */}
                                <div className="w-[45%]">
                                    {entry.suggested && hint ? (
                                        <div className="flex h-9 items-center rounded-md border border-dashed bg-muted/30 px-3 text-sm text-muted-foreground select-none">
                                            {hint.label}
                                        </div>
                                    ) : (
                                        <Input
                                            value={entry.key}
                                            placeholder="название"
                                            onChange={e => onEntryKeyChange(entry.id, e.target.value)}
                                        />
                                    )}
                                </div>

                                {/* Значение */}
                                <div className="flex-1">
                                    {isTextarea ? (
                                        <Textarea
                                            value={entry.value}
                                            placeholder={hint?.placeholder ?? 'значение'}
                                            className="min-h-[36px] resize-none"
                                            rows={2}
                                            onChange={e => onEntryValueChange(entry.id, e.target.value)}
                                        />
                                    ) : (
                                        <Input
                                            value={entry.value}
                                            placeholder={hint?.placeholder ?? 'значение'}
                                            onChange={e => onEntryValueChange(entry.id, e.target.value)}
                                        />
                                    )}
                                </div>

                                {/* Удалить */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-muted-foreground hover:text-destructive mt-0"
                                    onClick={() => onEntryRemove(entry.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Switch id="is_default" checked={formData.is_default} onCheckedChange={onDefaultChange} />
                <Label htmlFor="is_default">Сделать основным материалом</Label>
            </div>
        </div>
    )
}