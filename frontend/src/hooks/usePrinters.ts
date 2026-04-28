import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { printersAPI, type Printer, type CreatePrinterData, type UpdatePrinterData, type PrinterType } from '@/api/printers'

export function usePrinters() {
    const [printers, setPrinters]   = useState<Printer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError]         = useState<string | null>(null)

    // ─── Загрузка ─────────────────────────────────────────────────────────────
    const fetchPrinters = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await printersAPI.getAll()
            setPrinters(res.data.data)
        } catch (err: any) {
            const msg = err.response?.data?.message ?? 'Ошибка загрузки принтеров'
            setError(msg)
            toast.error(msg, { position: 'top-center' })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchPrinters() }, [fetchPrinters])

    // ─── Создание ─────────────────────────────────────────────────────────────
    const createPrinter = useCallback(async (data: CreatePrinterData): Promise<boolean> => {
        try {
            const res = await printersAPI.create(data)
            // Если новый принтер — основной, сбрасываем флаг у остальных локально
            setPrinters(prev => {
                const updated = data.is_default
                    ? prev.map(p => ({ ...p, is_default: false }))
                    : [...prev]
                return [...updated, res.data.data]
            })
            toast.success('Принтер успешно добавлен', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при создании принтера', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Обновление ───────────────────────────────────────────────────────────
    const updatePrinter = useCallback(async (id: number, data: UpdatePrinterData): Promise<boolean> => {
        try {
            const res = await printersAPI.update(id, data)
            setPrinters(prev => {
                let updated = prev.map(p => p.id === id ? res.data.data : p)
                if (data.is_default) {
                    updated = updated.map(p => p.id === id ? p : { ...p, is_default: false })
                }
                return updated
            })
            toast.success('Принтер успешно обновлён', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при обновлении принтера', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Удаление ─────────────────────────────────────────────────────────────
    const deletePrinter = useCallback(async (id: number): Promise<boolean> => {
        try {
            await printersAPI.delete(id)
            setPrinters(prev => prev.filter(p => p.id !== id))
            toast.success('Принтер удалён', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при удалении принтера', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Установить по умолчанию ──────────────────────────────────────────────
    const setDefaultPrinter = useCallback(async (id: number): Promise<boolean> => {
        try {
            await printersAPI.setDefault(id)
            setPrinters(prev => prev.map(p => ({ ...p, is_default: p.id === id })))
            toast.success('Основной принтер установлен', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при установке принтера', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Дублировать ──────────────────────────────────────────────────────────
    const duplicatePrinter = useCallback(async (printer: Printer): Promise<boolean> => {
        return createPrinter({
            name:                 `${printer.name} (копия)`,
            type:                 printer.type,
            model:                printer.model ?? undefined,
            purchase_price:       printer.purchase_price,
            print_lifetime_hours: printer.print_lifetime_hours,
            power_consumption:    printer.power_consumption,
            is_default:           false,
            settings:             printer.settings,
        })
    }, [createPrinter])

    return {
        printers,
        isLoading,
        error,
        fetchPrinters,
        createPrinter,
        updatePrinter,
        deletePrinter,
        setDefaultPrinter,
        duplicatePrinter,
    }
}