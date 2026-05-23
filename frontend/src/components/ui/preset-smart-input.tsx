// components/ui/preset-smart-input.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { evaluateMathExpression, formatDisplayValue, roundToPrecision } from '@/lib/math-evaluator'
import { ChevronDown, Check, X } from 'lucide-react'

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface PresetOption {
    id: number | string
    label: string          // название принтера / материала
    value: number          // числовое значение поля
    sublabel?: string      // доп. инфо (бренд, тип)
    color?: string         // цвет материала (hex)
    isDefault?: boolean
    ownerName?: string     // имя владельца (только для командных ресурсов)
    teamName?: string | null // название команды
}

interface PresetSmartInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value: number
    onChange: (value: number) => void
    unit?: string
    precision?: number
    presets?: PresetOption[]
    /** Показывать кнопку пресетов (только если user авторизован и presets переданы) */
    showPresets?: boolean
    /** Внешнее управление выбранным пресетом (id) — для сохранения состояния при смене вкладок */
    selectedPresetId?: number | string | null
    /** Вызывается при изменении выбранного пресета (null = сброс) */
    onPresetChange?: (id: number | string | null) => void
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export const PresetSmartInput = React.forwardRef<HTMLInputElement, PresetSmartInputProps>(
    (
        {
            value,
            onChange,
            unit,
            precision = 2,
            presets = [],
            showPresets = false,
            selectedPresetId,
            onPresetChange,
            className,
            disabled = false,
            step,
            id,
            ...props
        },
        _ref
    ) => {
        const [inputValue, setInputValue]   = useState('')
        const [isEditing, setIsEditing]     = useState(false)
        const [showTooltip, setShowTooltip] = useState(false)
        const [open, setOpen]               = useState(false)

        // Если пришёл selectedPresetId снаружи — используем его, иначе внутренний стейт
        const isControlled = selectedPresetId !== undefined
        const [internalAppliedId, setInternalAppliedId] = useState<number | string | null>(null)
        const appliedId    = isControlled ? (selectedPresetId ?? null) : internalAppliedId
        const setAppliedId = useCallback((id: number | string | null) => {
            if (!isControlled) setInternalAppliedId(id)
            onPresetChange?.(id)
        }, [isControlled, onPresetChange])

        const inputRef     = useRef<HTMLInputElement>(null)
        const dropdownRef  = useRef<HTMLDivElement>(null)
        const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

        // Sync display value when not editing
        useEffect(() => {
            if (!isEditing) setInputValue(formatDisplayValue(Number(value)))
        }, [value, isEditing])

        // Сброс «применено» если значение изменилось вручную.
        // Пропускаем если presets пустой — они ещё не загрузились с сервера.
        useEffect(() => {
            if (appliedId !== null && presets.length > 0) {
                const preset = presets.find(p => p.id === appliedId)
                if (!preset || preset.value !== value) setAppliedId(null)
            }
        }, [value, appliedId, presets])

        // Закрытие по клику вне
        useEffect(() => {
            if (!open) return
            const handler = (e: MouseEvent) => {
                if (
                    dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                    inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)
                ) setOpen(false)
            }
            document.addEventListener('mousedown', handler)
            return () => document.removeEventListener('mousedown', handler)
        }, [open])

        // ── SmartInput handlers ────────────────────────────────────────────────

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value)
            setIsEditing(true)
        }, [])

        const commit = useCallback(() => {
            setIsEditing(false)
            const calculated = evaluateMathExpression(inputValue)

            let fp = precision
            if (step) {
                const s = step.toString()
                if (s.includes('.')) fp = s.split('.')[1].length
                else if (parseFloat(s as string) < 1) fp = 1
                else fp = 0
            }

            const final = roundToPrecision(calculated, fp)
            setInputValue(formatDisplayValue(final))
            onChange(final)
        }, [inputValue, onChange, precision, step])

        const handleBlur = useCallback(() => {
            setTimeout(() => commit(), 80)
        }, [commit])

        const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setOpen(false)
        }, [])

        // ── Tooltip ────────────────────────────────────────────────────────────

        const handleMouseEnter = () => {
            tooltipTimer.current = setTimeout(() => setShowTooltip(true), 1000)
        }
        const handleMouseLeave = () => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
            setShowTooltip(false)
        }

        useEffect(() => () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current) }, [])

        // ── Применение пресета ─────────────────────────────────────────────────

        const applyPreset = (preset: PresetOption) => {
            const num = Number(preset.value)
            onChange(num)
            setInputValue(formatDisplayValue(num))
            setAppliedId(preset.id)
            setOpen(false)
        }

        const clearPreset = () => {
            setAppliedId(null)
        }

        const hasExpression    = inputValue && /[+\-*/()]/.test(inputValue)
        const hasPresetBtn     = showPresets && presets.length > 0
        const activePreset     = appliedId !== null ? presets.find(p => p.id === appliedId) : null
        const isPresetSelected = activePreset != null

        // Правый отступ инпута: крестик (если пресет) + кнопка пресета + unit
        const paddingRight = hasPresetBtn
            ? unit
                ? isPresetSelected ? 'pr-28' : 'pr-20'
                : isPresetSelected ? 'pr-16' : 'pr-9'
            : unit ? 'pr-10' : ''

        return (
            <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                {/* Когда пресет выбран — показываем div-заглушку вместо инпута,
                    чтобы текст нельзя было выделить. Инпут при этом скрыт через hidden. */}
                {isPresetSelected ? (
                    <div
                        className={cn(
                            'file:text-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs',
                            'md:text-sm flex items-center gap-1.5 overflow-hidden',
                            paddingRight,
                            className
                        )}
                    >
                        <span className="text-sm font-medium text-foreground truncate leading-none">
                            {activePreset!.label}
                        </span>
                        <span className="text-sm text-muted-foreground shrink-0 leading-none">
                            {formatDisplayValue(activePreset!.value)}{unit ? ` ${unit}` : ''}
                        </span>
                        {activePreset!.teamName && (
                            <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {activePreset!.teamName}
                            </span>
                        )}
                    </div>
                ) : (
                    <input
                        {...props}
                        ref={inputRef}
                        id={id}
                        type="text"
                        value={inputValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className={cn(
                            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none',
                            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                            'md:text-sm',
                            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                            paddingRight,
                            className
                        )}
                    />
                )}

                {/* Правая часть: unit + крестик + кнопка пресета */}
                <div className="absolute right-0 top-0 h-full flex items-center pointer-events-none">
                    {/* Индикатор вычисленной формулы (только если пресет не выбран) */}
                    {!isPresetSelected && !isEditing && hasExpression && (
                        <span className="text-xs text-green-600 mr-1">✓</span>
                    )}

                    {/* Единица измерения (скрывается когда пресет выбран — она уже в оверлее) */}
                    {unit && !isPresetSelected && (
                        <span className={cn(
                            'text-sm text-muted-foreground select-none',
                            hasPresetBtn ? 'mr-9' : 'mr-3'
                        )}>
                            {unit}
                        </span>
                    )}

                    {/* Крестик — сброс пресета, виден только когда пресет выбран */}
                    {isPresetSelected && (
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={clearPreset}
                            className={cn(
                                'pointer-events-auto h-full w-7 flex items-center justify-center',
                                'transition-colors focus-visible:outline-none group'
                            )}
                            aria-label="Сбросить пресет"
                        >
                            <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive transition-colors" />
                        </button>
                    )}

                    {/* Кнопка открытия пресетов */}
                    {hasPresetBtn && (
                        <button
                            type="button"
                            tabIndex={-1}
                            disabled={disabled}
                            onClick={() => setOpen(o => !o)}
                            className={cn(
                                'pointer-events-auto h-full w-8 flex items-center justify-center',
                                'border-l border-input rounded-r-md transition-colors',
                                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                'disabled:pointer-events-none disabled:opacity-50',
                                open ? 'bg-muted' : 'bg-transparent'
                            )}
                            aria-label="Выбрать из пресетов"
                        >
                            <ChevronDown className={cn(
                                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-150',
                                open && 'rotate-180'
                            )} />
                        </button>
                    )}
                </div>

                {/* Тултип формулы */}
                {showTooltip && !open && !isPresetSelected && (
                    <div className="absolute bottom-full left-0 mb-2 px-2 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
                        Пример: 500, 100+50, (200*1.5)/2
                        <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900" />
                    </div>
                )}

                {/* Дропдаун пресетов */}
                {open && hasPresetBtn && (
                    <div
                        ref={dropdownRef}
                        className={cn(
                            'absolute z-50 top-full mt-1 w-full min-w-50',
                            'rounded-md border border-border bg-popover text-popover-foreground shadow-md',
                            'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2',
                            'overflow-hidden'
                        )}
                    >

                        <div className="max-h-52 overflow-y-auto">
                            {presets.map(preset => {
                                const isActive = preset.id === appliedId
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onMouseDown={e => {
                                            e.preventDefault()
                                            applyPreset(preset)
                                        }}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-2 py-2 text-sm text-left',
                                            'transition-colors hover:bg-muted focus-visible:bg-muted outline-none',
                                            isActive && 'bg-muted/60'
                                        )}
                                    >
                                        {preset.color !== undefined && (
                                            <span
                                                className="shrink-0 w-3 h-3 rounded-full border border-border"
                                                style={{ background: preset.color || '#e5e7eb' }}
                                            />
                                        )}

                                        <span className="flex-1 min-w-0">
                                            <span className="flex items-center gap-1 flex-wrap font-medium leading-tight">
                                                <span className="truncate">{preset.label}</span>
                                                {preset.isDefault && (
                                                    <span className="shrink-0 inline-flex items-center rounded px-1 py-0 text-[10px] font-medium leading-4 bg-secondary text-secondary-foreground border border-border">
                                                        основной
                                                    </span>
                                                )}
                                                {preset.ownerName && (
                                                    <span className="shrink-0 inline-flex items-center rounded px-1 py-0 text-[10px] font-medium leading-4 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                        {preset.ownerName}
                                                    </span>
                                                )}
                                                {preset.teamName && (
                                                    <span className="shrink-0 inline-flex items-center rounded px-1 py-0 text-[10px] font-medium leading-4 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        {preset.teamName}
                                                    </span>
                                                )}
                                            </span>
                                            {preset.sublabel && (
                                                <span className="block truncate text-[11px] text-muted-foreground leading-tight">
                                                    {preset.sublabel}
                                                </span>
                                            )}
                                        </span>

                                        <span className="shrink-0 text-xs text-muted-foreground font-mono">
                                            {formatDisplayValue(preset.value)}
                                        </span>

                                        {isActive && (
                                            <Check className="shrink-0 h-3.5 w-3.5 text-green-500" />
                                        )}
                                    </button>
                                )
            })}
                        </div>
                    </div>
                )}
            </div>
        )
    }
)

PresetSmartInput.displayName = 'PresetSmartInput'