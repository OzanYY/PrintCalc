// components/ui/smart-input.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { evaluateMathExpression, formatDisplayValue, roundToPrecision } from '@/lib/math-evaluator';

interface SmartInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
    value: number;
    onChange: (value: number) => void;
    onCalculated?: (value: number) => void;
    precision?: number;
}

export const SmartInput: React.FC<SmartInputProps> = ({ 
    value, 
    onChange, 
    onCalculated,
    precision = 2,
    className = '',
    disabled = false,
    step,
    ...props 
}) => {
    const [inputValue, setInputValue] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [showTooltip, setShowTooltip] = useState<boolean>(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isEditing) {
            setInputValue(formatDisplayValue(value));
        }
    }, [value, isEditing]);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 1000); // 1 секунды задержки
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setShowTooltip(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsEditing(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        const calculated = evaluateMathExpression(inputValue);
        
        let finalPrecision = precision;
        if (step) {
            const stepStr = step.toString();
            if (stepStr.includes('.')) {
                finalPrecision = stepStr.split('.')[1].length;
            } else if (parseFloat(step as string) < 1) {
                finalPrecision = 1;
            } else {
                finalPrecision = 0;
            }
        }
        
        const finalValue = roundToPrecision(calculated, finalPrecision);
        setInputValue(formatDisplayValue(finalValue));
        
        onChange(finalValue);
        onCalculated?.(finalValue);
    }, [inputValue, onChange, onCalculated, precision, step]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }, []);

    const hasExpression = inputValue && /[\+\-\*\/\(\)]/.test(inputValue);

    return (
        <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Input
                {...props}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`${className} ${!isEditing && hasExpression ? 'pr-6' : ''}`}
                disabled={disabled}
            />
            {!isEditing && hasExpression && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600">
                    ✓
                </div>
            )}
            
            {showTooltip && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                    Пример: 500, 100+50, (200*1.5)/2
                    <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
};