import { useState } from 'react'
import {
    Plus, Printer, Edit, Trash2, MoreVertical,
    Clock, Zap, DollarSign, Copy, Star, Loader2, RefreshCw,
    X, PlusCircle, Settings2, Users, User,
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
import { useAuth } from '@/context/AuthContext'

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
}

const SUGGESTED_PARAMS: Record<PrinterTech, SuggestedParam[]> = {
    FDM: [
        { key: 'nozzle_size',       label: 'Диаметр сопла (мм)',    placeholder: '0.4'         },
        { key: 'max_temp',          label: 'Макс. температура (°C)', placeholder: '260'         },
        { key: 'build_volume',      label: 'Область построения',     placeholder: '220x220x250' },
        { key: 'filament_diameter', label: 'Диаметр филамента (мм)', placeholder: '1.75'        },
    ],
    SLA: [
        { key: 'layer_height',  label: 'Высота слоя (мм)',     placeholder: '0.05'        },
        { key: 'exposure_time', label: 'Время экспозиции (с)', placeholder: '2.5'         },
        { key: 'build_volume',  label: 'Область построения',   placeholder: '192x120x245' },
        { key: 'resolution',    label: 'Разрешение',           placeholder: '4K'          },
    ],
    SLS: [
        { key: 'laser_power',     label: 'Мощность лазера (Вт)', placeholder: '10'          },
        { key: 'layer_thickness', label: 'Толщина слоя (мм)',    placeholder: '0.1'         },
        { key: 'build_volume',    label: 'Область построения',   placeholder: '165x165x300' },
        { key: 'material',        label: 'Материал',             placeholder: 'Nylon'       },
    ],
    PolyJet: [
        { key: 'resolution',      label: 'Разрешение',           placeholder: '16μ'         },
        { key: 'material_count',  label: 'Кол-во материалов',    placeholder: '2'           },
        { key: 'build_volume',    label: 'Область построения',   placeholder: '300x200x150' },
        { key: 'layer_thickness', label: 'Толщина слоя (мм)',    placeholder: '0.016'       },
    ],
}

const PARAM_LABELS: Record<string, string> = {
    nozzle_size:       'Сопло',
    max_temp:          'Макс. t°',
    build_volume:      'Область',
    filament_diameter: 'Филамент',
    layer_height:      'Слой',
    exposure_time:     'Экспозиция',
    resolution:        'Разрешение',
    laser_power:       'Лазер',
    layer_thickness:   'Слой',
    material:          'Материал',
    material_count:    'Материалов',
}

function getParamLabel(key: string): string {
    return PARAM_LABELS[key] ?? key
}

let _idCounter = 0
function uid() { return String(++_idCounter) }

function settingsToEntries(settings: Record<string, string>): SettingEntry[] {
    return Object.entries(settings).map(([key, value]) => ({ id: uid(), key, value }))
}

function getEmptySuggestions(type: PrinterTech): SettingEntry[] {
    return SUGGESTED_PARAMS[type].map(p => ({
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

const EMPTY_FORM: PrinterFormData = {
    name: '', type: 'FDM', model: '',
    purchase_price: '', print_lifetime_hours: '', power_consumption: '',
    is_default: false, settings: {},
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

export default function PrintersPage() {
    const {
        printers, isLoading, fetchPrinters,
        createPrinter, updatePrinter, deletePrinter,
        setDefaultPrinter, duplicatePrinter,
    } = usePrinters()

    const authCtx = useAuth()
    const currentUserId = authCtx?.user ? Number(authCtx.user.id) : null

    const [activeTab, setActiveTab]             = useState('all')
    const [ownerFilter, setOwnerFilter]         = useState<'all' | 'mine' | 'team'>('all')
    const [formData, setFormData]               = useState<PrinterFormData>(EMPTY_FORM)
    const [settingEntries, setSettingEntries]   = useState<SettingEntry[]>([])
    const [isAddOpen, setIsAddOpen]             = useState(false)
    const [isEditOpen, setIsEditOpen]           = useState(false)
    const [isDeleteOpen, setIsDeleteOpen]       = useState(false)
    const [isViewOpen, setIsViewOpen]           = useState(false)
    const [viewPrinter, setViewPrinter]         = useState<PrinterType_ | null>(null)
    const [selectedPrinter, setSelectedPrinter] = useState<PrinterType_ | null>(null)
    const [isSaving, setIsSaving]               = useState(false)
    const [isDeleting, setIsDeleting]           = useState(false)

    const openViewDialog = (printer: PrinterType_) => {
        setViewPrinter(printer)
        setIsViewOpen(true)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleTypeChange = (value: PrinterTech) => {
        setFormData(prev => ({ ...prev, type: value }))
        setSettingEntries(getEmptySuggestions(value))
    }

    const resetForm = () => {
        setFormData(EMPTY_FORM)
        setSettingEntries([])
        setSelectedPrinter(null)
    }

    const openAddDialog = () => {
        resetForm()
        setSettingEntries(getEmptySuggestions('FDM'))
        setIsAddOpen(true)
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
        const existing = settingsToEntries(printer.settings)
        const existingKeys = new Set(existing.map(e => e.key))
        const extra = SUGGESTED_PARAMS[printer.type]
            .filter(p => !existingKeys.has(p.key))
            .map(p => ({ id: uid(), key: p.key, value: '', suggested: true }))
        setSettingEntries([...existing, ...extra])
        setIsEditOpen(true)
    }

    const openDeleteDialog = (printer: PrinterType_) => {
        setSelectedPrinter(printer)
        setIsDeleteOpen(true)
    }

    const handleEntryKeyChange   = (id: string, key: string) =>
        setSettingEntries(prev => prev.map(e => e.id === id ? { ...e, key, suggested: false } : e))
    const handleEntryValueChange = (id: string, value: string) =>
        setSettingEntries(prev => prev.map(e => e.id === id ? { ...e, value } : e))
    const handleEntryRemove      = (id: string) =>
        setSettingEntries(prev => prev.filter(e => e.id !== id))
    const handleEntryAdd         = () =>
        setSettingEntries(prev => [...prev, { id: uid(), key: '', value: '', suggested: false }])

    const buildFormWithSettings = (): PrinterFormData => ({
        ...formData,
        settings: entriesToSettings(settingEntries),
    })

    const handleAdd = async () => {
        if (!formData.name.trim()) return
        setIsSaving(true)
        const ok = await createPrinter(formToApiData(buildFormWithSettings()))
        setIsSaving(false)
        if (ok) { setIsAddOpen(false); resetForm() }
    }

    const handleEdit = async () => {
        if (!selectedPrinter) return
        setIsSaving(true)
        const ok = await updatePrinter(selectedPrinter.id, formToApiData(buildFormWithSettings()))
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

    const isOwnPrinter = (p: PrinterType_) => currentUserId !== null && Number(p.user_id) === currentUserId
    const hasTeamPrinters = printers.some(p => !isOwnPrinter(p))

    const filteredPrinters = printers.filter(p => {
        if (activeTab !== 'all' && p.type !== activeTab) return false
        if (ownerFilter === 'mine')  return isOwnPrinter(p)
        if (ownerFilter === 'team')  return !isOwnPrinter(p)
        return true
    })
    const ownPrinters        = printers.filter(isOwnPrinter)
    const totalLifetimeHours = ownPrinters.reduce((s, p) => s + Number(p.print_lifetime_hours), 0)
    const totalInvestment    = ownPrinters.reduce((s, p) => s + Number(p.purchase_price), 0)
    const defaultPrinter     = ownPrinters.find(p => p.is_default)

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
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">3D Принтеры</h1>
                    <p className="text-muted-foreground">Управляйте вашими 3D принтерами и их настройками</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchPrinters} title="Обновить">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Добавить принтер
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Всего принтеров</CardTitle>
                        <Printer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{printers.length}</div>
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
                            Среднее: {ownPrinters.length ? Math.round(totalLifetimeHours / ownPrinters.length) : 0} ч/принтер
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
                            Средняя: {ownPrinters.length ? Math.round(totalInvestment / ownPrinters.length).toLocaleString() : 0} ₽
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Основной принтер</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{defaultPrinter?.name ?? 'Не выбран'}</div>
                        <p className="text-xs text-muted-foreground">{defaultPrinter?.type ?? 'Установите основной принтер'}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Tabs defaultValue="all" onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">Все</TabsTrigger>
                        {PRINTER_TYPES.map(type => <TabsTrigger key={type} value={type}>{type}</TabsTrigger>)}
                    </TabsList>
                </Tabs>

                {hasTeamPrinters && (
                    <div className="flex gap-1 border rounded-lg p-1">
                        <Button variant={ownerFilter === 'all'  ? 'default' : 'ghost'} size="sm" onClick={() => setOwnerFilter('all')}>Все</Button>
                        <Button variant={ownerFilter === 'mine' ? 'default' : 'ghost'} size="sm" onClick={() => setOwnerFilter('mine')}>
                            <User className="h-3.5 w-3.5 mr-1" />Мои
                        </Button>
                        <Button variant={ownerFilter === 'team' ? 'default' : 'ghost'} size="sm" onClick={() => setOwnerFilter('team')}>
                            <Users className="h-3.5 w-3.5 mr-1" />Команды
                        </Button>
                    </div>
                )}
            </div>

            {filteredPrinters.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Printer className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                        {activeTab === 'all' ? 'Принтеры не добавлены' : `Нет принтеров типа ${activeTab}`}
                    </p>
                    {activeTab === 'all' && (
                        <Button className="mt-4" onClick={openAddDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить первый принтер
                        </Button>
                    )}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPrinters.map(printer => (
                    <PrinterCard
                        key={printer.id}
                        printer={printer}
                        isOwn={isOwnPrinter(printer)}
                        onView={() => openViewDialog(printer)}
                        onEdit={() => openEditDialog(printer)}
                        onDelete={() => openDeleteDialog(printer)}
                        onSetDefault={() => setDefaultPrinter(printer.id)}
                        onDuplicate={() => duplicatePrinter(printer)}
                    />
                ))}
            </div>

            {/* Диалог просмотра */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    {viewPrinter && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
                                    {viewPrinter.name}
                                    {viewPrinter.is_default && (
                                        <Badge variant="default">
                                            <Star className="h-3 w-3 mr-1 fill-current" />Основной
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <DialogDescription>{viewPrinter.model ?? '—'}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={getTypeColor(viewPrinter.type)}>{viewPrinter.type}</Badge>
                                    {!isOwnPrinter(viewPrinter) && viewPrinter.owner_username && (
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                                            <Users className="h-3 w-3" />{viewPrinter.owner_username}
                                            {viewPrinter.team_name && <span className="text-violet-500"> · {viewPrinter.team_name}</span>}
                                        </span>
                                    )}
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">Ресурс:</span>
                                        <span className="font-medium">{Number(viewPrinter.print_lifetime_hours)} ч</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">Мощность:</span>
                                        <span className="font-medium">{Number(viewPrinter.power_consumption)} Вт</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">Стоимость:</span>
                                        <span className="font-medium">{Number(viewPrinter.purchase_price).toLocaleString()} ₽</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-muted-foreground">ID:</span>
                                        <span className="font-medium">{viewPrinter.id}</span>
                                    </div>
                                </div>
                                {Object.keys(viewPrinter.settings).length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <div className="flex items-center gap-1 mb-2 text-sm font-medium">
                                                <Settings2 className="h-4 w-4 text-muted-foreground" />
                                                Параметры
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(viewPrinter.settings).map(([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs"
                                                    >
                                                        <span className="text-muted-foreground">{getParamLabel(key)}:</span>
                                                        <span className="font-medium">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <Separator />
                                <p className="text-xs text-muted-foreground">
                                    Добавлен: {new Date(viewPrinter.created_at).toLocaleDateString('ru-RU')}
                                </p>
                            </div>
                            <DialogFooter>
                                {isOwnPrinter(viewPrinter) && (
                                    <Button variant="outline" onClick={() => { setIsViewOpen(false); openEditDialog(viewPrinter) }}>
                                        <Edit className="mr-2 h-4 w-4" />Редактировать
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => setIsViewOpen(false)}>Закрыть</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Диалог добавления */}
            <Dialog open={isAddOpen} onOpenChange={open => { setIsAddOpen(open); if (!open) resetForm() }}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Добавить принтер</DialogTitle>
                        <DialogDescription>Заполните информацию о новом 3D принтере</DialogDescription>
                    </DialogHeader>
                    <PrinterForm
                        formData={formData}
                        settingEntries={settingEntries}
                        onInputChange={handleInputChange}
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
                        <DialogTitle>Редактировать принтер</DialogTitle>
                        <DialogDescription>Измените информацию о принтере</DialogDescription>
                    </DialogHeader>
                    <PrinterForm
                        formData={formData}
                        settingEntries={settingEntries}
                        onInputChange={handleInputChange}
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
                        <DialogTitle>Удалить принтер</DialogTitle>
                        <DialogDescription>
                            Вы уверены, что хотите удалить принтер «{selectedPrinter?.name}»? Это действие нельзя отменить.
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

// ─── Карточка принтера ────────────────────────────────────────────────────────

interface PrinterCardProps {
    printer: PrinterType_
    isOwn: boolean
    onView: () => void
    onEdit: () => void
    onDelete: () => void
    onSetDefault: () => void
    onDuplicate: () => void
}

function PrinterCard({ printer, isOwn, onView, onEdit, onDelete, onSetDefault, onDuplicate }: PrinterCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const settingsEntries = Object.entries(printer.settings)
    const hasSettings = settingsEntries.length > 0

    return (
        <Card className={`${printer.is_default ? 'border-primary' : ''} cursor-pointer hover:shadow-lg transition-shadow`} onClick={onView} onContextMenu={e => { e.preventDefault(); setMenuOpen(true) }}>
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
                    <div onClick={e => e.stopPropagation()}>
                    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            {isOwn && (
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="mr-2 h-4 w-4" />Редактировать
                                </DropdownMenuItem>
                            )}
                            {isOwn && !printer.is_default && (
                                <DropdownMenuItem onClick={onSetDefault}>
                                    <Star className="mr-2 h-4 w-4" />Сделать основным
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={onDuplicate}>
                                <Copy className="mr-2 h-4 w-4" />Дублировать
                            </DropdownMenuItem>
                            {isOwn && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                                        <Trash2 className="mr-2 h-4 w-4" />Удалить
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pb-3">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge className={getTypeColor(printer.type)}>{printer.type}</Badge>
                    {!isOwn && printer.owner_username && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                            <Users className="h-3 w-3" />{printer.owner_username}
                            {printer.team_name && <span className="text-violet-500"> · {printer.team_name}</span>}
                        </span>
                    )}
                </div>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Ресурс
                        </span>
                        <span className="font-medium">{Number(printer.print_lifetime_hours)} ч</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Мощность
                        </span>
                        <span className="font-medium">{Number(printer.power_consumption)} Вт</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Стоимость
                        </span>
                        <span className="font-medium">{Number(printer.purchase_price).toLocaleString()} ₽</span>
                    </div>
                </div>

                {hasSettings && (
                    <>
                        <Separator className="my-3" />
                        <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
                            <Settings2 className="h-3 w-3" />
                            <span>Параметры</span>
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
                    <span>Добавлен: {new Date(printer.created_at).toLocaleDateString('ru-RU')}</span>
                    <span>ID: {printer.id}</span>
                </div>
            </CardFooter>
        </Card>
    )
}

// ─── Форма принтера ───────────────────────────────────────────────────────────

interface PrinterFormProps {
    formData: PrinterFormData
    settingEntries: SettingEntry[]
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onTypeChange: (value: PrinterTech) => void
    onDefaultChange: (checked: boolean) => void
    onEntryKeyChange: (id: string, key: string) => void
    onEntryValueChange: (id: string, value: string) => void
    onEntryRemove: (id: string) => void
    onEntryAdd: () => void
}

function PrinterForm({
    formData, settingEntries,
    onInputChange, onTypeChange, onDefaultChange,
    onEntryKeyChange, onEntryValueChange, onEntryRemove, onEntryAdd,
}: PrinterFormProps) {
    const suggestions = SUGGESTED_PARAMS[formData.type]

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

            {/* Секция параметров */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <Label className="block">Параметры принтера</Label>
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
                        Нет параметров. Нажмите «Добавить» для создания.
                    </p>
                )}

                <div className="space-y-2 mt-3">
                    {settingEntries.map(entry => {
                        const hint = suggestions.find(s => s.key === entry.key)
                        return (
                            <div key={entry.id} className="flex items-center gap-2">
                                {/* Ключ */}
                                <div className="w-[45%]">
                                    {entry.suggested && hint ? (
                                        <div className="flex h-9 items-center rounded-md border border-dashed bg-muted/30 px-3 text-sm text-muted-foreground select-none">
                                            {hint.label}
                                        </div>
                                    ) : (
                                        <Input
                                            value={entry.key}
                                            placeholder="название параметра"
                                            onChange={e => onEntryKeyChange(entry.id, e.target.value)}
                                        />
                                    )}
                                </div>
                                {/* Значение */}
                                <div className="flex-1">
                                    <Input
                                        value={entry.value}
                                        placeholder={hint?.placeholder ?? 'значение'}
                                        onChange={e => onEntryValueChange(entry.id, e.target.value)}
                                    />
                                </div>
                                {/* Удалить */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 text-muted-foreground hover:text-destructive"
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
                <Label htmlFor="is_default">Сделать основным принтером</Label>
            </div>
        </div>
    )
}