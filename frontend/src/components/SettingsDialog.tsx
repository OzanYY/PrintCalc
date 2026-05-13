import { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Monitor, Smartphone, Globe, Clock, Loader2,
    LogOut, ShieldAlert, Trash2, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { authAPI } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface Session {
    id: string;
    user_agent: string;
    ip_address: string;
    created_at: string;
    last_used_at?: string;
    is_current?: boolean;
}

interface SettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const getDeviceIcon = (userAgent: string) => {
    if (!userAgent) return Globe;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
    return Monitor;
};

const getDeviceLabel = (userAgent: string) => {
    if (!userAgent) return 'Неизвестное устройство';
    const ua = userAgent.toLowerCase();
    let browser = 'Браузер';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';

    let os = '';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    return os ? `${browser} · ${os}` : browser;
};

const formatSessionDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHour < 24) return `${diffHour} ч. назад`;
    if (diffDay < 7) return `${diffDay} д. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

// ─── Компонент ────────────────────────────────────────────────────────────────

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const { setUser } = useAuth();

    // ── Сессии ────────────────────────────────────────────────────────────────
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [terminatingId, setTerminatingId] = useState<string | null>(null);
    const [terminatingOthers, setTerminatingOthers] = useState(false);
    const [terminatingAll, setTerminatingAll] = useState(false);

    // ── Удаление аккаунта ─────────────────────────────────────────────────────
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Подтверждение завершения всех сессий ──────────────────────────────────
    const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);

    // ─── Загрузка сессий ──────────────────────────────────────────────────────
    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const res = await authAPI.getSessions();
            setSessions(res.data.sessions ?? []);
        } catch {
            toast.error('Не удалось загрузить сессии', { position: 'top-center' });
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) loadSessions();
    }, [open, loadSessions]);

    // ─── Завершить конкретную сессию ──────────────────────────────────────────
    const handleTerminateSession = async (sessionId: string) => {
        setTerminatingId(sessionId);
        try {
            await authAPI.terminateSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success('Сессия завершена', { position: 'top-center' });
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Не удалось завершить сессию', {
                position: 'top-center',
            });
        } finally {
            setTerminatingId(null);
        }
    };

    // ─── Завершить все остальные сессии ───────────────────────────────────────
    const handleTerminateOthers = async () => {
        setTerminatingOthers(true);
        try {
            // Получаем refreshToken из cookie — он недоступен из JS (httpOnly),
            // поэтому бэкенд должен сам определить «текущую» по куке.
            // Предполагаем что эндпойнт принимает пустое тело и использует куку.
            await authAPI.terminateOtherSessions();
            toast.success('Все остальные сессии завершены', { position: 'top-center' });
            await loadSessions();
        } catch {
            toast.error('Не удалось завершить сессии', { position: 'top-center' });
        } finally {
            setTerminatingOthers(false);
        }
    };

    // ─── Завершить все сессии (выйти со всех устройств) ──────────────────────
    const handleTerminateAll = async () => {
        setTerminatingAll(true);
        try {
            await authAPI.logoutAll();
            setUser(null);
            toast.success('Выход выполнен на всех устройствах', { position: 'top-center' });
            onOpenChange(false);
        } catch {
            toast.error('Не удалось завершить все сессии', { position: 'top-center' });
        } finally {
            setTerminatingAll(false);
            setLogoutAllDialogOpen(false);
        }
    };

    // ─── Удалить аккаунт ──────────────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        if (!deletePassword) return;
        setIsDeleting(true);
        try {
            await authAPI.deleteAccount(deletePassword);
            setUser(null);
            toast.success('Аккаунт удалён', { position: 'top-center' });
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка удаления аккаунта', {
                position: 'top-center',
                duration: 5000,
            });
        } finally {
            setIsDeleting(false);
            setDeletePassword('');
            setDeleteDialogOpen(false);
        }
    };

    const otherSessions = sessions.filter(s => !s.is_current);
    const currentSession = sessions.find(s => s.is_current);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Настройки</DialogTitle>
                        <DialogDescription>Управление аккаунтом и безопасностью</DialogDescription>
                    </DialogHeader>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-6 py-2">

                        {/* ── Активные сессии ── */}
                        <section className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Активные сессии</h3>
                                <Button
                                    variant="ghost" size="sm"
                                    className="h-7 text-xs text-muted-foreground"
                                    onClick={loadSessions}
                                    disabled={sessionsLoading}
                                >
                                    {sessionsLoading
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <RefreshCw className="h-3 w-3" />
                                    }
                                    <span className="ml-1">Обновить</span>
                                </Button>
                            </div>

                            {sessionsLoading ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">Загрузка сессий…</span>
                                </div>
                            ) : sessions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    Нет активных сессий
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {/* Текущая сессия */}
                                    {currentSession && (
                                        <SessionCard
                                            session={currentSession}
                                            isCurrent
                                            isTerminating={terminatingId === currentSession.id}
                                            onTerminate={() => handleTerminateSession(currentSession.id)}
                                        />
                                    )}
                                    {/* Остальные сессии */}
                                    {otherSessions.map(session => (
                                        <SessionCard
                                            key={session.id}
                                            session={session}
                                            isCurrent={false}
                                            isTerminating={terminatingId === session.id}
                                            onTerminate={() => handleTerminateSession(session.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        <Separator />

                        {/* ── Управление сессиями ── */}
                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold">Управление сессиями</h3>
                            <p className="text-xs text-muted-foreground">
                                Завершите сессии на других устройствах, если заметили подозрительную активность.
                            </p>

                            <div className="flex flex-col gap-2 pt-1">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    disabled={terminatingOthers || otherSessions.length === 0}
                                    onClick={handleTerminateOthers}
                                >
                                    {terminatingOthers
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        : <LogOut className="mr-2 h-4 w-4" />
                                    }
                                    Завершить все остальные сессии
                                    {otherSessions.length > 0 && (
                                        <Badge variant="secondary" className="ml-auto">
                                            {otherSessions.length}
                                        </Badge>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 border-orange-200 dark:border-orange-900"
                                    disabled={terminatingAll}
                                    onClick={() => setLogoutAllDialogOpen(true)}
                                >
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Выйти на всех устройствах
                                </Button>
                            </div>
                        </section>

                        <Separator />

                        {/* ── Опасная зона ── */}
                        <section className="space-y-2">
                            <h3 className="text-sm font-semibold text-red-600">Опасная зона</h3>
                            <p className="text-xs text-muted-foreground">
                                Удаление аккаунта необратимо. Все данные будут уничтожены.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить аккаунт
                            </Button>
                        </section>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── AlertDialog: выход со всех устройств ── */}
            <AlertDialog open={logoutAllDialogOpen} onOpenChange={setLogoutAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Выйти на всех устройствах?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Все активные сессии будут завершены, включая текущую. Вам потребуется войти заново.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={terminatingAll}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleTerminateAll}
                            disabled={terminatingAll}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {terminatingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Выйти везде
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── AlertDialog: удаление аккаунта ── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={open => {
                setDeleteDialogOpen(open);
                if (!open) setDeletePassword('');
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600">Удалить аккаунт?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие <strong>необратимо</strong>. Все ваши данные, принтеры, материалы и заказы
                            будут удалены навсегда. Введите пароль для подтверждения.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label htmlFor="delete-password" className="text-sm mb-1.5 block">
                            Пароль для подтверждения
                        </Label>
                        <PasswordInput
                            id="delete-password"
                            value={deletePassword}
                            onChange={setDeletePassword}
                            placeholder="Введите текущий пароль"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={isDeleting || !deletePassword}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Удалить аккаунт навсегда
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────

interface SessionCardProps {
    session: Session;
    isCurrent: boolean;
    isTerminating: boolean;
    onTerminate: () => void;
}

function SessionCard({ session, isCurrent, isTerminating, onTerminate }: SessionCardProps) {
    const DeviceIcon = getDeviceIcon(session.user_agent);
    const label = getDeviceLabel(session.user_agent);
    const date = formatSessionDate(session.last_used_at ?? session.created_at);

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
            isCurrent
                ? 'bg-primary/5 border-primary/20'
                : 'bg-muted/30 border-border'
        }`}>
            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isCurrent ? 'bg-primary/10' : 'bg-muted'
            }`}>
                <DeviceIcon className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{label}</span>
                    {isCurrent && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 text-[10px] px-1.5 py-0 h-4 shrink-0">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Текущая
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                    {session.ip_address && (
                        <span className="text-xs text-muted-foreground">{session.ip_address}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />{date}
                    </span>
                </div>
            </div>

            {!isCurrent && (
                <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                    onClick={onTerminate}
                    disabled={isTerminating}
                >
                    {isTerminating
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <LogOut className="h-3.5 w-3.5" />
                    }
                </Button>
            )}
        </div>
    );
}