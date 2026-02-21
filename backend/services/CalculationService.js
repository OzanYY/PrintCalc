// services/CalculationService.js
class CalculationService {
    /**
     * Расчет стоимости 3D-печати
     * @param {Object} params - Параметры для расчета
     * @returns {Object} - Результаты расчета в нужном формате
     */
    static calculate(params) {
        const {
            // Основные параметры
            modelWeight,           // вес модели (г)
            supportWeight,         // вес поддержек (г)
            filamentPrice,         // цена филамента (руб/кг)
            
            // Электричество
            powerConsumption,      // мощность принтера (Вт)
            printTime,            // время печати (мин)
            electricityPrice,     // стоимость электроэнергии (руб/кВт·ч)
            
            // Амортизация
            printerCost,          // стоимость принтера (руб)
            printResource,        // ресурс печати (часы)
            
            // Работа оператора
            hourlyRate,           // ставка оператора (руб/ч)
            workTime,             // время работы оператора (мин)
            
            // Дополнительно
            additionalExpensesPercent, // процент доп расходов
            marginPercent          // процент маржи
        } = params;

        // Валидация входных данных
        this.validateInput(params);

        // 1. РАСЧЕТ МАТЕРИАЛОВ
        const totalWeightGrams = modelWeight + supportWeight;
        const totalWeightKg = totalWeightGrams / 1000;
        
        // Стоимость материала для модели
        const modelMaterialCost = (modelWeight / 1000) * filamentPrice;
        
        // Стоимость материала для поддержек
        const supportMaterialCost = (supportWeight / 1000) * filamentPrice;
        
        // Общая стоимость материалов
        const totalMaterialsCost = totalWeightKg * filamentPrice;

        // 2. РАСЧЕТ ЭЛЕКТРОЭНЕРГИИ
        const printTimeHours = printTime / 60;
        const energyConsumptionKwh = (powerConsumption * printTimeHours) / 1000;
        const electricityCost = energyConsumptionKwh * electricityPrice;

        // 3. РАСЧЕТ АМОРТИЗАЦИИ
        const depreciationPerHour = printerCost / printResource;
        const depreciationCost = depreciationPerHour * printTimeHours;

        // 4. РАСЧЕТ РАБОТЫ ОПЕРАТОРА
        const workTimeHours = workTime / 60;
        const laborCost = hourlyRate * workTimeHours;

        // 5. СЕБЕСТОИМОСТЬ (без доп расходов)
        const primeCost = totalMaterialsCost + electricityCost + depreciationCost + laborCost;

        // 6. ДОПОЛНИТЕЛЬНЫЕ РАСХОДЫ
        const additionalExpenses = primeCost * (additionalExpensesPercent / 100);

        // 7. ПОЛНАЯ СЕБЕСТОИМОСТЬ (с доп расходами)
        const fullCost = primeCost + additionalExpenses;

        // 8. МАРЖА
        const marginAmount = fullCost * (marginPercent / 100);

        // 9. ИТОГОВАЯ ЦЕНА
        const finalPrice = fullCost + marginAmount;

        // 10. ЦЕНА ЗА ГРАММ
        const pricePerGram = finalPrice / totalWeightGrams;

        // Формируем ответ в нужном формате
        return {
            materials: {
                model: this.formatCurrency(modelMaterialCost),
                support: this.formatCurrency(supportMaterialCost),
                total: this.formatCurrency(totalMaterialsCost)
            },
            electricity: this.formatCurrency(electricityCost),
            depreciation: this.formatCurrency(depreciationCost),
            labor: this.formatCurrency(laborCost),
            primeCost: this.formatCurrency(primeCost),
            additionalExpenses: {
                ...this.formatCurrency(additionalExpenses),
                percent: `${additionalExpensesPercent}%`
            },
            fullCost: this.formatCurrency(fullCost),
            margin: {
                ...this.formatCurrency(marginAmount),
                percent: `${marginPercent}%`
            },
            finalPrice: this.formatCurrency(finalPrice),
            pricePerGram: this.formatPricePerGram(pricePerGram),
            totalWeight: {
                grams: Number(totalWeightGrams.toFixed(0)),
                kg: Number(totalWeightKg.toFixed(3))
            }
        };
    }

    /**
     * Форматирование валюты
     */
    static formatCurrency(value) {
        const roundedValue = Number(value.toFixed(2));
        return {
            value: roundedValue,
            formatted: `${roundedValue.toFixed(2)} ₽`,
            currency: 'RUB'
        };
    }

    /**
     * Форматирование цены за грамм
     */
    static formatPricePerGram(value) {
        const roundedValue = Number(value.toFixed(2));
        return {
            value: roundedValue,
            formatted: `${roundedValue.toFixed(2)} ₽/г`,
            unit: 'г'
        };
    }

    /**
     * Валидация входных параметров
     */
    static validateInput(params) {
        const {
            modelWeight, supportWeight, filamentPrice,
            powerConsumption, printTime, electricityPrice,
            printerCost, printResource,
            hourlyRate, workTime,
            additionalExpensesPercent, marginPercent
        } = params;

        // Проверка на отрицательные значения
        const negativeFields = [];
        if (modelWeight < 0) negativeFields.push('modelWeight');
        if (supportWeight < 0) negativeFields.push('supportWeight');
        if (filamentPrice < 0) negativeFields.push('filamentPrice');
        if (powerConsumption < 0) negativeFields.push('powerConsumption');
        if (printTime < 0) negativeFields.push('printTime');
        if (electricityPrice < 0) negativeFields.push('electricityPrice');
        if (printerCost < 0) negativeFields.push('printerCost');
        if (printResource < 0) negativeFields.push('printResource');
        if (hourlyRate < 0) negativeFields.push('hourlyRate');
        if (workTime < 0) negativeFields.push('workTime');
        if (additionalExpensesPercent < 0) negativeFields.push('additionalExpensesPercent');
        if (marginPercent < 0) negativeFields.push('marginPercent');

        if (negativeFields.length > 0) {
            throw new Error(`Поля не могут быть отрицательными: ${negativeFields.join(', ')}`);
        }

        // Проверка на нулевые значения в критических полях
        if (printResource === 0) {
            throw new Error('Ресурс печати не может быть равен 0');
        }

        return true;
    }

    /**
     * Расчет с подстановкой данных из БД
     */
    static async calculateWithPresets(params, dbData) {
        const calculationParams = {
            ...params,
            // Если есть принтер, подставляем его параметры
            ...(dbData.printer && {
                printerCost: dbData.printer.purchase_price,
                printResource: dbData.printer.print_lifetime_hours,
                powerConsumption: dbData.printer.power_consumption
            }),
            // Если есть материал, подставляем его цену
            ...(dbData.material && {
                filamentPrice: dbData.material.price_per_kg
            })
        };

        return this.calculate(calculationParams);
    }
}

module.exports = CalculationService;