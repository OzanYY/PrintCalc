import { useState } from 'react'
import {
    Plus, Printer, Edit, Trash2, MoreVertical,
    Clock, Zap, DollarSign, Copy, Star, Loader2, RefreshCw,
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
import { PRINTER_TYPES, type Printer as PrinterType_, type CreatePrinterData } from '@/api/printers'
import { usePrinters } from '@/hooks/usePrinters'

// ─── Типы ─────────────────────────────────────────────────────────────────────

type PrinterTech = typeof PRINTER_TYPES[number]

interface PrinterFormData {
    name: string
    type: PrinterTech
    model: string
    purchase_price: string
    print_lifetime_hours: string
    power_consumption: string
    is_default: boolean
    settings: Record<string, string>
}

const EMPTY_FORM: PrinterFormData = {
    name: '', type: 'FDM', model: '',
    purchase_price: '', print_lifetime_hours: '', power_consumption: '',
    is_default: false, settings: getDefaultSettings('FDM'),
}

function getDefaultSettings(type: PrinterTech): Record<string, string> {
    switch (type) {
        case 'FDM':     return { nozzle_size: '0.4', max_temp: '260', build_volume: '220x220x250', filament_diameter: '1.75' }
        case 'SLA':     return { layer_height: '0.05', exposure_time: '2.5', build_volume: '192x120x245', resolution: '2K' }
        case 'SLS':     return { laser_power: '10', layer_thickness: '0.1', build_volume: '165x165x300', material: 'Nylon' }
        case 'PolyJet': return { resolution: '16μ', material_count: '2', build_volume: '300x200x150', layer_thickness: '0.016' }
    }
}

function getTypeColor(type: PrinterTech) {
    switch (type) {
        case 'FDM':     return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        case 'SLA':     return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
        case 'SLS':     return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        case 'PolyJet': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    }
}

function formToApiData(form: PrinterFormData): CreatePrinterData {
    return {
        name:                 form.name,
        type:                 form.type,
        model:                form.model || undefined,
        purchase_price:       parseFloat(form.purchase_price) || 0,
        print_lifetime_hours: parseInt(form.print_lifetime_hours) || 0,
        power_consumption:    parseFloat(form.power_consumption) || 0,
        is_default:           form.is_default,
        settings:             form.settings,
    }
}

// ─── Страница ─────────────────────────────────────────────────────────────────

export default function PrintersPage() {
    const {
        printers, isLoading, fetchPrinters,
        createPrinter, updatePrinter, deletePrinter,
        setDefaultPrinter, duplicatePrinter,
    } = usePrinters()

    const [activeTab, setActiveTab]               = useState('all')
    const [formData, setFormData]                 = useState<PrinterFormData>(EMPTY_FORM)
    const [isAddOpen, setIsAddOpen]               = useState(false)
    const [isEditOpen, setIsEditOpen]             = useState(false)
    const [isDeleteOpen, setIsDeleteOpen]         = useState(false)
    const [selectedPrinter, setSelectedPrinter]   = useState<PrinterType_ | null>(null)
    const [isSaving, setIsSaving]                 = useState(false)
    const [isDeleting, setIsDeleting]             = useState(false)

    // ─── Форма ────────────────────────────────────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleTypeChange = (value: PrinterTech) => {
        setFormData(prev => ({ ...prev, type: value, settings: getDefaultSettings(value) }))
    }

    const handleSettingChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }))
    }

    const resetForm = () => {
        setFormData(EMPTY_FORM)
        setSelectedPrinter(null)
    }

    const openEditDialog = (printer: PrinterType_) => {
        setSelectedPrinter(printer)
        setFormData({
            name:                 printer.name,
            type:                 printer.type,
            model:                printer.model ?? '',
            purchase_price:       printer.purchase_price.toString(),
            print_lifetime_hours: printer.print_lifetime_hours.toString(),
            power_consumption:    printer.power_consumption.toString(),
            is_default:           printer.is_default,
            settings:             { ...printer.settings },
        })
        setIsEditOpen(true)
    }

    const openDeleteDialog = (printer: PrinterType_) => {
        setSelectedPrinter(printer)
        setIsDeleteOpen(true)
    }

    // ─── Действия ─────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!formData.name.trim()) return
        setIsSaving(true)
        const ok = await createPrinter(formToApiData(formData))
        setIsSaving(false)
        if (ok) { setIsAddOpen(false); resetForm() }
    }

    const handleEdit = async () => {
        if (!selectedPrinter) return
        setIsSaving(true)
        const ok = await updatePrinter(selectedPrinter.id, formToApiData(formData))
        setIsSaving(false)
        if (ok) { setIsEditOpen(false); resetForm() }
    }

    const handleDelete = async () => {
        if (!selectedPrinter) return
        setIsDeleting(true)
        const ok = await deletePrinter(selectedPrinter.id)
        setIsDeleting(false)
        if (ok) { setIsDeleteOpen(false); setSelectedPrinter(null) }
    }

    // ─── Производные данные ───────────────────────────────────────────────────
    const filteredPrinters = activeTab === 'all'
        ? printers
        : printers.filter(p => p.type === activeTab)

    const totalLifetimeHours = printers.reduce((s, p) => s + p.print_lifetime_hours, 0)
    const totalInvestment    = printers.reduce((s, p) => s + p.purchase_price, 0)
    const defaultPrinter     = printers.find(p => p.is_default)

    // ─── Скелетон ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="container mx-auto p-6 max-w-7xl">
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 rounded-lg" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* ─── Заголовок ─────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">3D Принтеры</h1>
                    <p className="text-muted-foreground">
                        Управляйте вашими 3D принтерами и их настройками
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchPrinters} title="Обновить">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить принтер
                    </Button>
                </div>
            </div>

            {/* ─── Статистика ────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего принтеров</CardTitle>
                        <Printer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{printers.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {printers.filter(p => p.type === 'FDM').length} FDM ·{' '}
                            {printers.filter(p => p.type === 'SLA').length} SLA
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
                            Среднее:{' '}
                            {printers.length ? Math.round(totalLifetimeHours / printers.length) : 0} ч/принтер
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Общие инвестиции</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(totalInvestment - 0).toLocaleString()} ₽</div>
                        <p className="text-xs text-muted-foreground">
                            Средняя:{' '}
                            {printers.length ? Math.round(totalInvestment / printers.length).toLocaleString() : 0} ₽
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
                            {defaultPrinter?.name ?? 'Не выбран'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {defaultPrinter?.type ?? 'Установите основной принтер'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Фильтр по типу ────────────────────────────────────────────── */}
            <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">Все</TabsTrigger>
                    {PRINTER_TYPES.map(type => (
                        <TabsTrigger key={type} value={type}>{type}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* ─── Пустое состояние ──────────────────────────────────────────── */}
            {filteredPrinters.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Printer className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                        {activeTab === 'all' ? 'Принтеры не добавлены' : `Нет принтеров типа ${activeTab}`}
                    </p>
                    {activeTab === 'all' && (
                        <Button className="mt-4" onClick={() => { resetForm(); setIsAddOpen(true) }}>
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить первый принтер
                        </Button>
                    )}
                </div>
            )}

            {/* ─── Карточки принтеров ────────────────────────────────────────── */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPrinters.map(printer => (
                    <Card key={printer.id} className={printer.is_default ? 'border-primary' : ''}>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1 min-w-0 pr-2">
                                    <CardTitle className="flex items-center gap-2 flex-wrap">
                                        <span className="truncate">{printer.name}</span>
                                        {printer.is_default && (
                                            <Badge variant="default">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                Основной
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>{printer.model ?? '—'}</CardDescription>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => openEditDialog(printer)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Редактировать
                                        </DropdownMenuItem>
                                        {!printer.is_default && (
                                            <DropdownMenuItem onClick={() => setDefaultPrinter(printer.id)}>
                                                <Star className="mr-2 h-4 w-4" />
                                                Сделать основным
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => duplicatePrinter(printer)}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Дублировать
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
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
                                <Badge className={getTypeColor(printer.type)}>{printer.type}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Ресурс
                                    </span>
                                    <span className="font-medium">{printer.print_lifetime_hours} ч</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Zap className="h-3 w-3" /> Энергопотребление
                                    </span>
                                    <span className="font-medium">{printer.power_consumption} Вт</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> Цена
                                    </span>
                                    <span className="font-medium">{printer.purchase_price.toLocaleString()} ₽</span>
                                </div>

                                {Object.keys(printer.settings).length > 0 && (
                                    <>
                                        <Separator className="my-2" />
                                        <div>
                                            <span className="text-muted-foreground text-xs">Настройки</span>
                                            <div className="grid grid-cols-2 gap-1 mt-1">
                                                {Object.entries(printer.settings).map(([key, value]) => (
                                                    <div key={key} className="text-xs">
                                                        <span className="text-muted-foreground">{key}:</span>{' '}
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
                                <span>Добавлен: {new Date(printer.created_at).toLocaleDateString('ru-RU')}</span>
                                <span>ID: {printer.id}</span>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* ─── Диалог добавления ─────────────────────────────────────────── */}
            <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Добавить принтер</DialogTitle>
                        <DialogDescription>Заполните информацию о новом 3D принтере</DialogDescription>
                    </DialogHeader>
                    <PrinterForm
                        formData={formData}
                        onInputChange={handleInputChange}
                        onTypeChange={handleTypeChange}
                        onSettingChange={handleSettingChange}
                        onDefaultChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>
                            Отмена
                        </Button>
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
                        <DialogTitle>Редактировать принтер</DialogTitle>
                        <DialogDescription>Измените информацию о принтере</DialogDescription>
                    </DialogHeader>
                    <PrinterForm
                        formData={formData}
                        onInputChange={handleInputChange}
                        onTypeChange={handleTypeChange}
                        onSettingChange={handleSettingChange}
                        onDefaultChange={checked => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
                            Отмена
                        </Button>
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
                        <DialogTitle>Удалить принтер</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить принтер «{selectedPrinter?.name}»?
                            Это действие нельзя отменить.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
                            Отмена
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Удаление...</> : 'Удалить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Форма принтера ───────────────────────────────────────────────────────────

interface PrinterFormProps {
    formData: PrinterFormData
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onTypeChange: (value: PrinterTech) => void
    onSettingChange: (key: string, value: string) => void
    onDefaultChange: (checked: boolean) => void
}

function PrinterForm({ formData, onInputChange, onTypeChange, onSettingChange, onDefaultChange }: PrinterFormProps) {
    return (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Название *</Label>
                    <Input id="name" name="name" value={formData.name} onChange={onInputChange} placeholder="Основной FDM" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Тип технологии *</Label>
                    <Select value={formData.type} onValueChange={onTypeChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {PRINTER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="model">Модель</Label>
                <Input id="model" name="model" value={formData.model} onChange={onInputChange} placeholder="Creality Ender 3 V2" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="purchase_price">Цена (₽)</Label>
                    <Input id="purchase_price" name="purchase_price" type="number" value={formData.purchase_price} onChange={onInputChange} placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="power_consumption">Мощность (Вт)</Label>
                    <Input id="power_consumption" name="power_consumption" type="number" value={formData.power_consumption} onChange={onInputChange} placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="print_lifetime_hours">Ресурс (ч)</Label>
                    <Input id="print_lifetime_hours" name="print_lifetime_hours" type="number" value={formData.print_lifetime_hours} onChange={onInputChange} placeholder="0" />
                </div>
            </div>

            <Separator />

            <div>
                <Label className="mb-3 block">Настройки принтера</Label>
                <div className="grid grid-cols-2 gap-4">
                    {formData.type === 'FDM' && (
                        <>
                            <SettingField label="Диаметр сопла (мм)"    id="nozzle_size"       value={formData.settings.nozzle_size}       placeholder="0.4"        onChange={v => onSettingChange('nozzle_size', v)} />
                            <SettingField label="Макс. температура (°C)" id="max_temp"          value={formData.settings.max_temp}          placeholder="260"        onChange={v => onSettingChange('max_temp', v)} />
                            <SettingField label="Область построения (мм)"id="build_volume"      value={formData.settings.build_volume}      placeholder="220x220x250"onChange={v => onSettingChange('build_volume', v)} />
                            <SettingField label="Диаметр филамента (мм)" id="filament_diameter" value={formData.settings.filament_diameter} placeholder="1.75"       onChange={v => onSettingChange('filament_diameter', v)} />
                        </>
                    )}
                    {formData.type === 'SLA' && (
                        <>
                            <SettingField label="Высота слоя (мм)"       id="layer_height"   value={formData.settings.layer_height}   placeholder="0.05"       onChange={v => onSettingChange('layer_height', v)} />
                            <SettingField label="Время экспозиции (с)"   id="exposure_time"  value={formData.settings.exposure_time}  placeholder="2.5"        onChange={v => onSettingChange('exposure_time', v)} />
                            <SettingField label="Область построения (мм)"id="build_volume"   value={formData.settings.build_volume}   placeholder="192x120x245"onChange={v => onSettingChange('build_volume', v)} />
                            <SettingField label="Разрешение"             id="resolution"     value={formData.settings.resolution}     placeholder="4K"         onChange={v => onSettingChange('resolution', v)} />
                        </>
                    )}
                    {formData.type === 'SLS' && (
                        <>
                            <SettingField label="Мощность лазера (Вт)"  id="laser_power"      value={formData.settings.laser_power}      placeholder="10"         onChange={v => onSettingChange('laser_power', v)} />
                            <SettingField label="Толщина слоя (мм)"     id="layer_thickness"  value={formData.settings.layer_thickness}  placeholder="0.1"        onChange={v => onSettingChange('layer_thickness', v)} />
                            <SettingField label="Область построения (мм)"id="build_volume"    value={formData.settings.build_volume}    placeholder="165x165x300"onChange={v => onSettingChange('build_volume', v)} />
                            <SettingField label="Материал"              id="material"         value={formData.settings.material}         placeholder="Nylon"      onChange={v => onSettingChange('material', v)} />
                        </>
                    )}
                    {formData.type === 'PolyJet' && (
                        <>
                            <SettingField label="Разрешение"             id="resolution"      value={formData.settings.resolution}      placeholder="16μ"        onChange={v => onSettingChange('resolution', v)} />
                            <SettingField label="Кол-во материалов"     id="material_count"  value={formData.settings.material_count}  placeholder="2"          onChange={v => onSettingChange('material_count', v)} />
                            <SettingField label="Область построения (мм)"id="build_volume"   value={formData.settings.build_volume}   placeholder="300x200x150"onChange={v => onSettingChange('build_volume', v)} />
                            <SettingField label="Толщина слоя (мм)"     id="layer_thickness" value={formData.settings.layer_thickness} placeholder="0.016"      onChange={v => onSettingChange('layer_thickness', v)} />
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <Switch id="is_default" checked={formData.is_default} onCheckedChange={onDefaultChange} />
                <Label htmlFor="is_default">Сделать основным принтером</Label>
            </div>
        </div>
    )
}

// ─── Мини-компонент поля настройки ────────────────────────────────────────────

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