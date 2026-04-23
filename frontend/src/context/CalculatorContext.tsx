// contexts/CalculatorContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

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

  // Сохранение в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('calculator_materials', JSON.stringify(materials))
  }, [materials])

  useEffect(() => {
    localStorage.setItem('calculator_electricity', JSON.stringify(electricity))
  }, [electricity])

  useEffect(() => {
    localStorage.setItem('calculator_depreciation', JSON.stringify(depreciation))
  }, [depreciation])

  useEffect(() => {
    localStorage.setItem('calculator_labor', JSON.stringify(labor))
  }, [labor])

  useEffect(() => {
    localStorage.setItem('calculator_additional', JSON.stringify(additional))
  }, [additional])

  useEffect(() => {
    localStorage.setItem('calculator_hasCalculated', JSON.stringify(hasCalculated))
  }, [hasCalculated])

  // Сброс только значений (сохраняет hasCalculated)
  const resetToDefaults = () => {
    setMaterials(defaultMaterials)
    setElectricity(defaultElectricity)
    setDepreciation(defaultDepreciation)
    setLabor(defaultLabor)
    setAdditional(defaultAdditional)
    // Не сбрасываем hasCalculated здесь
  }

  // Полный сброс (включая статус расчета)
  const resetAll = () => {
    setMaterials(defaultMaterials)
    setElectricity(defaultElectricity)
    setDepreciation(defaultDepreciation)
    setLabor(defaultLabor)
    setAdditional(defaultAdditional)
    setHasCalculated(false)
  }

  return (
    <CalculatorContext.Provider
      value={{
        materials,
        setMaterials,
        electricity,
        setElectricity,
        depreciation,
        setDepreciation,
        labor,
        setLabor,
        additional,
        setAdditional,
        hasCalculated,
        setHasCalculated,
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