import api from "./axios";

export interface CalculationParams {
  // Материалы
  modelWeight: number;        // вес модели (г)
  supportWeight: number;      // вес поддержек (г)
  filamentPrice: number;      // цена филамента (руб/кг)
  
  // Электричество
  powerConsumption: number;   // мощность принтера (Вт)
  printTime: number;          // время печати (мин)
  electricityPrice: number;   // стоимость электроэнергии (руб/кВт·ч)
  
  // Амортизация
  printerCost: number;        // стоимость принтера (руб)
  printResource: number;      // ресурс печати (часы)
  
  // Работа оператора
  hourlyRate: number;         // ставка оператора (руб/ч)
  workTime: number;           // время работы оператора (мин)
  
  // Дополнительно
  additionalExpensesPercent: number;  // процент доп расходов
  marginPercent: number;              // процент маржи
}

export interface CalculationResult {
  materials: {
    model: { value: number; formatted: string; currency: string };
    support: { value: number; formatted: string; currency: string };
    total: { value: number; formatted: string; currency: string };
  };
  electricity: { value: number; formatted: string; currency: string };
  depreciation: { value: number; formatted: string; currency: string };
  labor: { value: number; formatted: string; currency: string };
  primeCost: { value: number; formatted: string; currency: string };
  additionalExpenses: {
    value: number;
    formatted: string;
    currency: string;
    percent: string;
  };
  fullCost: { value: number; formatted: string; currency: string };
  margin: {
    value: number;
    formatted: string;
    currency: string;
    percent: string;
  };
  finalPrice: { value: number; formatted: string; currency: string };
  pricePerGram: { value: number; formatted: string; unit: string };
  totalWeight: {
    grams: number;
    kg: number;
  };
}

export interface CalculationResponse {
  success: boolean;
  data?: CalculationResult;
  error?: string;
}

export interface CalculationWithPresetsParams extends CalculationParams {
  printerId?: number;
  materialId?: number;
}

export interface CalculationWithPresetsResponse extends CalculationResponse {
  usedPresets?: {
    printer: { id: number; name: string } | null;
    material: { id: number; name: string } | null;
  };
}

export const calculationAPI = {
  /**
   * Расчет стоимости 3D-печати
   */
  calculate: (params: CalculationParams) =>
    api.post<CalculationResponse>("/calculate", params),

  /**
   * Расчет с использованием принтера и материала из БД
   */
  calculateWithPresets: (params: CalculationWithPresetsParams) =>
    api.post<CalculationWithPresetsResponse>("/calculate/with-presets", params),
};