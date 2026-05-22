// frontend/src/components/orders/OrderDeadlineField.tsx
import { CalendarDays, AlertTriangle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
    deadline: string | null;         // ISO 'YYYY-MM-DD' или 'YYYY-MM-DDTHH:mm:ss.sssZ'
    status: 'in_progress' | 'completed' | 'cancelled';
    onChange: (deadline: string | null) => void;
    readOnly?: boolean;
}

type DeadlineState = 'overdue' | 'urgent' | 'upcoming' | 'ok' | 'none';

/** Нормализует дату к формату YYYY-MM-DD.
 *  Принимает строку YYYY-MM-DD, ISO-строку или JS Date.
 *  Всегда использует UTC-компоненты чтобы избежать сдвига в UTC+ зонах. */
const normalizeDate = (date: string | null | Date): string => {
    if (!date) return '';
    if (date instanceof Date) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(date).slice(0, 10);
};

/**
 * Парсит строку YYYY-MM-DD как локальное время (без Z).
 * new Date('2025-06-15') трактуется как UTC и съезжает на день в UTC+ зонах.
 * new Date('2025-06-15T00:00:00') трактуется как локальное время — корректно.
 */
const parseLocalDate = (dateStr: string): Date => {
    return new Date(dateStr + 'T00:00:00');
};

function getDeadlineState(deadline: string | null, status: string): DeadlineState {
    if (!deadline) return 'none';
    if (status !== 'in_progress') return 'ok';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = parseLocalDate(normalizeDate(deadline));
    const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0)  return 'overdue';
    if (diffDays <= 2) return 'urgent';
    if (diffDays <= 7) return 'upcoming';
    return 'ok';
}

const STATE_CONFIG = {
    overdue:  { icon: AlertTriangle, label: 'Просрочен',  className: 'text-destructive bg-destructive/10 border-destructive/30' },
    urgent:   { icon: Clock,         label: 'Горит',       className: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800' },
    upcoming: { icon: CalendarDays,  label: '',            className: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' },
    ok:       { icon: CalendarDays,  label: '',            className: 'text-muted-foreground' },
    none:     { icon: CalendarDays,  label: '',            className: 'text-muted-foreground' },
};

export function OrderDeadlineBadge({ deadline, status }: Pick<Props, 'deadline' | 'status'>) {
    if (!deadline) return null;
    const state = getDeadlineState(deadline, status);
    const { icon: Icon, label, className } = STATE_CONFIG[state];
    const formatted = parseLocalDate(normalizeDate(deadline)).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <span className={cn('inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium', className)}>
            <Icon className="h-3 w-3" />
            {formatted}
            {label && <span className="font-semibold">{label}</span>}
        </span>
    );
}

export function OrderDeadlineField({ deadline, status, onChange, readOnly }: Props) {
    const state = getDeadlineState(deadline, status);
    const { icon: Icon, label, className } = STATE_CONFIG[state];

    if (readOnly) {
        return deadline ? <OrderDeadlineBadge deadline={deadline} status={status} /> : null;
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="date"
                        className="pl-9"
                        value={normalizeDate(deadline)}
                        onChange={e => onChange(e.target.value || null)}
                    />
                </div>
                {deadline && (
                    <button
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onChange(null)}
                    >
                        ✕
                    </button>
                )}
            </div>
            {deadline && state !== 'ok' && state !== 'none' && (
                <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded border', className)}>
                    <Icon className="h-3.5 w-3.5" />
                    {state === 'overdue'  && 'Дедлайн прошёл'}
                    {state === 'urgent'   && 'Осталось менее 2 дней!'}
                    {state === 'upcoming' && 'Дедлайн на этой неделе'}
                    {label && ` — ${label}`}
                </div>
            )}
        </div>
    );
}