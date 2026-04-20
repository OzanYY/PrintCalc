// utils/mathEvaluator.ts

/**
 * Безопасное вычисление математического выражения
 * @param expression - Выражение для вычисления (строка или число)
 * @returns Результат вычисления
 */
export const evaluateMathExpression = (expression: string | number): number => {
    // Если это уже число, возвращаем его
    if (typeof expression === 'number') {
        return expression;
    }

    // Если пустая строка, возвращаем 0
    if (!expression || typeof expression !== 'string' || expression.trim() === '') {
        return 0;
    }

    try {
        // Очищаем выражение от лишних пробелов
        const cleanExpression = expression.trim();
        
        // Проверяем, что выражение содержит только разрешенные символы
        const allowedPattern = /^[\d\s\+\-\*\/\(\)\.]+$/;
        if (!allowedPattern.test(cleanExpression)) {
            throw new Error('Выражение содержит недопустимые символы');
        }

        // Заменяем запятые на точки для десятичных чисел
        const normalizedExpression = cleanExpression.replace(/,/g, '.');
        
        // Используем Function вместо eval для большей безопасности
        const calculate = new Function(`return (${normalizedExpression})`);
        const result = calculate();
        
        // Проверяем, что результат - конечное число
        if (!isFinite(result)) {
            throw new Error('Результат вычисления не является конечным числом');
        }
        
        return result;
    } catch (error) {
        console.warn('Ошибка вычисления выражения:', expression, error);
        // Если не удалось вычислить, пробуем преобразовать как обычное число
        const numericValue = parseFloat(expression);
        return isNaN(numericValue) ? 0 : numericValue;
    }
};

/**
 * Форматирует значение для отображения в поле ввода
 * @param value - Числовое значение
 * @returns Отформатированная строка
 */
export const formatDisplayValue = (value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '0';
    }
    // Убираем лишние нули после запятой
    return value.toString();
};

/**
 * Округляет число до указанной точности
 * @param value - Исходное число
 * @param precision - Количество знаков после запятой
 * @returns Округленное число
 */
export const roundToPrecision = (value: number, precision: number): number => {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
};