// contexts/CalculatorContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface MaterialsState {
  modelWeight: number
  supportWeight: number
  filamentPrice: number
}

interface ElectricityState {
  powerConsumption: number
  printTime: number
  electricityPrice: number
}

interface DepreciationState {
  printerCost: number
  printResource: number
}

interface LaborState {
  hourlyRate: number
  workTime: number
}

interface AdditionalState {
  additionalExpensesPercent: number
  marginPercent: number
}

export type SelectedPresetsState = Record<string, number | string | null>

interface CalculatorContextType {
  materials: MaterialsState
  setMaterials: (value: MaterialsState | ((prev: MaterialsState) => MaterialsState)) => void
  electricity: ElectricityState
  setElectricity: (value: ElectricityState | ((prev: ElectricityState) => ElectricityState)) => void
  depreciation: DepreciationState
  setDepreciation: (value: DepreciationState | ((prev: DepreciationState) => DepreciationState)) => void
  labor: LaborState
  setLabor: (value: LaborState | ((prev: LaborState) => LaborState)) => void
  additional: AdditionalState
  setAdditional: (value: AdditionalState | ((prev: AdditionalState) => AdditionalState)) => void
  hasCalculated: boolean
  setHasCalculated: (value: boolean) => void
  selectedPresets: SelectedPresetsState
  setSelectedPreset: (field: string, id: number | string | null) => void
  /** Выбрать принтер сразу во всех трёх полях (powerConsumption, printerCost, printResource) */
  setSelectedPrinter: (id: number | string | null) => void
  resetToDefaults: () => void
  resetAll: () => void // Новая функция для полного сброса
}

const defaultMaterials: MaterialsState = {
  modelWeight: 100,
  supportWeight: 20,
  filamentPrice: 1500,
}

const defaultElectricity: ElectricityState = {
  powerConsumption: 200,
  printTime: 300,
  electricityPrice: 6.5,
}

const defaultDepreciation: DepreciationState = {
  printerCost: 50000,
  printResource: 5000,
}

const defaultLabor: LaborState = {
  hourlyRate: 500,
  workTime: 60,
}

const defaultAdditional: AdditionalState = {
  additionalExpensesPercent: 15,
  marginPercent: 30,
}

const defaultSelectedPresets: SelectedPresetsState = {
  filamentPrice:    null,
  powerConsumption: null,
  printerCost:      null,
  printResource:    null,
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined)

export function CalculatorProvider({ children }: { children: ReactNode }) {
  // Загрузка из localStorage или использование значений по умолчанию
  const [materials, setMaterials] = useState<MaterialsState>(() => {
    const saved = localStorage.getItem('calculator_materials')
    return saved ? JSON.parse(saved) : defaultMaterials
  })

  const [electricity, setElectricity] = useState<ElectricityState>(() => {
    const saved = localStorage.getItem('calculator_electricity')
    return saved ? JSON.parse(saved) : defaultElectricity
  })

  const [depreciation, setDepreciation] = useState<DepreciationState>(() => {
    const saved = localStorage.getItem('calculator_depreciation')
    return saved ? JSON.parse(saved) : defaultDepreciation
  })

  const [labor, setLabor] = useState<LaborState>(() => {
    const saved = localStorage.getItem('calculator_labor')
    return saved ? JSON.parse(saved) : defaultLabor
  })

  const [additional, setAdditional] = useState<AdditionalState>(() => {
    const saved = localStorage.getItem('calculator_additional')
    return saved ? JSON.parse(saved) : defaultAdditional
  })

  // Статус, был ли произведен расчет
  const [hasCalculated, setHasCalculated] = useState<boolean>(() => {
    const saved = localStorage.getItem('calculator_hasCalculated')
    return saved ? JSON.parse(saved) : false
  })

  // Выбранные пресеты
  const [selectedPresets, setSelectedPresets] = useState<SelectedPresetsState>(() => {
    const saved = localStorage.getItem('calculator_selectedPresets')
    return saved ? JSON.parse(saved) : defaultSelectedPresets
  })
  const setSelectedPreset = useCallback((field: string, id: number | string | null) => {
    setSelectedPresets(prev => {
      const next = { ...prev, [field]: id }
      localStorage.setItem('calculator_selectedPresets', JSON.stringify(next))
      return next
    })
  }, [])

  /**
   * Синхронизирует выбор принтера сразу во всех трёх пресетных полях.
   * Вызывается при выборе принтера в любой из вкладок.
   */
  const setSelectedPrinter = useCallback((id: number | string | null) => {
    setSelectedPresets(prev => {
      const next = {
        ...prev,
        powerConsumption: id,
        printerCost:      id,
        printResource:    id,
      }
      localStorage.setItem('calculator_selectedPresets', JSON.stringify(next))
      return next
    })
  }, [])

  // Обёртки над сеттерами — пишут в localStorage сразу при вызове
  const updateMaterials = useCallback((value: MaterialsState | ((prev: MaterialsState) => MaterialsState)) => {
    setMaterials(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      localStorage.setItem('calculator_materials', JSON.stringify(next))
      return next
    })
  }, [])

  const updateElectricity = useCallback((value: ElectricityState | ((prev: ElectricityState) => ElectricityState)) => {
    setElectricity(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      localStorage.setItem('calculator_electricity', JSON.stringify(next))
      return next
    })
  }, [])

  const updateDepreciation = useCallback((value: DepreciationState | ((prev: DepreciationState) => DepreciationState)) => {
    setDepreciation(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      localStorage.setItem('calculator_depreciation', JSON.stringify(next))
      return next
    })
  }, [])

  const updateLabor = useCallback((value: LaborState | ((prev: LaborState) => LaborState)) => {
    setLabor(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      localStorage.setItem('calculator_labor', JSON.stringify(next))
      return next
    })
  }, [])

  const updateAdditional = useCallback((value: AdditionalState | ((prev: AdditionalState) => AdditionalState)) => {
    setAdditional(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      localStorage.setItem('calculator_additional', JSON.stringify(next))
      return next
    })
  }, [])

  const updateHasCalculated = useCallback((value: boolean) => {
    setHasCalculated(value)
    localStorage.setItem('calculator_hasCalculated', JSON.stringify(value))
  }, [])

  const updateSelectedPresets = useCallback((value: SelectedPresetsState) => {
    setSelectedPresets(value)
    localStorage.setItem('calculator_selectedPresets', JSON.stringify(value))
  }, [])

  // Сброс только значений (сохраняет hasCalculated)
  const resetToDefaults = () => {
    updateMaterials(defaultMaterials)
    updateElectricity(defaultElectricity)
    updateDepreciation(defaultDepreciation)
    updateLabor(defaultLabor)
    updateAdditional(defaultAdditional)
    updateSelectedPresets(defaultSelectedPresets)
    // Не сбрасываем hasCalculated здесь
  }

  // Полный сброс (включая статус расчета)
  const resetAll = () => {
    updateMaterials(defaultMaterials)
    updateElectricity(defaultElectricity)
    updateDepreciation(defaultDepreciation)
    updateLabor(defaultLabor)
    updateAdditional(defaultAdditional)
    updateSelectedPresets(defaultSelectedPresets)
    updateHasCalculated(false)
  }

  return (
    <CalculatorContext.Provider
      value={{
        materials,
        setMaterials: updateMaterials,
        electricity,
        setElectricity: updateElectricity,
        depreciation,
        setDepreciation: updateDepreciation,
        labor,
        setLabor: updateLabor,
        additional,
        setAdditional: updateAdditional,
        hasCalculated,
        setHasCalculated: updateHasCalculated,
        selectedPresets,
        setSelectedPreset,
        setSelectedPrinter,
        resetToDefaults,
        resetAll,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  )
}

export function useCalculator() {
  const context = useContext(CalculatorContext)
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider')
  }
  return context
}