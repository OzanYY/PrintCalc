import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── PasswordInput ────────────────────────────────────────────────────────────

interface PasswordInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    /** Показывать индикатор силы пароля */
    showStrength?: boolean;
    /** Сообщение об ошибке (подсвечивает поле красным) */
    error?: string;
}

export function PasswordInput({
    id,
    value,
    onChange,
    placeholder = '••••••••',
    className,
    showStrength = false,
    error,
}: PasswordInputProps) {
    const [show, setShow] = useState(false);

    return (
        <div className="space-y-1">
            <div className="relative">
                <Input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={cn(
                        'pr-10',
                        '[&::-ms-reveal]:hidden [&::-ms-clear]:hidden',   // ← Edge
                        error && 'border-red-500',
                        className,
                    )}
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {showStrength && <PasswordStrength password={value} />}
        </div>
    );
}

// ─── PasswordStrength ─────────────────────────────────────────────────────────

interface PasswordStrengthProps {
    password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
    if (!password) return null;

    const checks = [
        { label: 'Мин. 8 символов', ok: password.length >= 8 },
        { label: 'Заглавная буква', ok: /[A-ZА-Я]/.test(password) },
        { label: 'Цифра', ok: /\d/.test(password) },
        { label: 'Спецсимвол', ok: /[^A-Za-zА-Яа-я0-9]/.test(password) },
    ];

    const score = checks.filter(c => c.ok).length;

    const barColors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
    const textColors = ['text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'];
    const labels = ['Слабый', 'Средний', 'Хороший', 'Надёжный'];

    return (
        <div className="space-y-2">
            {/* Полоска */}
            <div className="flex gap-1">
                {barColors.map((color, i) => (
                    <div
                        key={i}
                        className={cn(
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            i < score ? color : 'bg-muted',
                        )}
                    />
                ))}
            </div>

            {/* Уровень */}
            {score > 0 && (
                <p className={cn('text-xs font-medium', textColors[score - 1])}>
                    {labels[score - 1]}
                </p>
            )}

            {/* Чеклист */}
            <div className="grid grid-cols-2 gap-1">
                {checks.map(({ label, ok }) => (
                    <div
                        key={label}
                        className={cn(
                            'flex items-center gap-1 text-xs',
                            ok ? 'text-green-600' : 'text-muted-foreground',
                        )}
                    >
                        <div className={cn('w-1.5 h-1.5 rounded-full', ok ? 'bg-green-500' : 'bg-muted-foreground/40')} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}