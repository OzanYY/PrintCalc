// hooks/useMaterials.ts
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
    materialsAPI,
    type Material,
    type MaterialCategory,
    type CreateMaterialData,
    type UpdateMaterialData,
} from '@/api/materials'

export function useMaterials(initialCategory?: MaterialCategory) {
    const [materials, setMaterials]   = useState<Material[]>([])
    const [isLoading, setIsLoading]   = useState(true)
    const [error, setError]           = useState<string | null>(null)

    // ─── Загрузка ─────────────────────────────────────────────────────────────
    const fetchMaterials = useCallback(async (category?: MaterialCategory) => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await materialsAPI.getAll(category)
            setMaterials(res.data.data)
        } catch (err: any) {
            const msg = err.response?.data?.message ?? 'Ошибка загрузки материалов'
            console.log(err.response?.data?.message);
            setError(msg)
            toast.error(msg, { position: 'top-center' })
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { fetchMaterials(initialCategory) }, [fetchMaterials, initialCategory])

    // ─── Создание ─────────────────────────────────────────────────────────────
    const createMaterial = useCallback(async (data: CreateMaterialData): Promise<boolean> => {
        try {
            const res = await materialsAPI.create(data)
            setMaterials(prev => {
                const updated = data.is_default
                    ? prev.map(m => ({ ...m, is_default: false }))
                    : [...prev]
                return [...updated, res.data.data]
            })
            toast.success('Материал успешно добавлен', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при создании материала', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Обновление ───────────────────────────────────────────────────────────
    const updateMaterial = useCallback(async (id: number, data: UpdateMaterialData): Promise<boolean> => {
        try {
            const res = await materialsAPI.update(id, data)
            setMaterials(prev => {
                let updated = prev.map(m => m.id === id ? res.data.data : m)
                if (data.is_default) {
                    updated = updated.map(m => m.id === id ? m : { ...m, is_default: false })
                }
                return updated
            })
            toast.success('Материал успешно обновлён', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при обновлении материала', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Удаление ─────────────────────────────────────────────────────────────
    const deleteMaterial = useCallback(async (id: number): Promise<boolean> => {
        try {
            await materialsAPI.delete(id)
            setMaterials(prev => prev.filter(m => m.id !== id))
            toast.success('Материал удалён', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при удалении материала', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Установить по умолчанию ──────────────────────────────────────────────
    const setDefaultMaterial = useCallback(async (id: number): Promise<boolean> => {
        try {
            await materialsAPI.setDefault(id)
            setMaterials(prev => prev.map(m => ({ ...m, is_default: m.id === id })))
            toast.success('Основной материал установлен', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при установке материала', { position: 'top-center' })
            return false
        }
    }, [])

    // ─── Дублировать ──────────────────────────────────────────────────────────
    const duplicateMaterial = useCallback(async (material: Material): Promise<boolean> => {
        try {
            const res = await materialsAPI.duplicate(material.id, `${material.name} (копия)`)
            setMaterials(prev => [...prev, res.data.data])
            toast.success('Материал скопирован', { position: 'top-center' })
            return true
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? 'Ошибка при копировании материала', { position: 'top-center' })
            return false
        }
    }, [])

    return {
        materials,
        isLoading,
        error,
        fetchMaterials,
        createMaterial,
        updateMaterial,
        deleteMaterial,
        setDefaultMaterial,
        duplicateMaterial,
    }
}