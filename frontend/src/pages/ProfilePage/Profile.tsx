import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { SettingsDialog } from '@/components/SettingsDialog';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Printer, Package, CheckCircle, DollarSign, Users, Settings,
    Mail, Calendar, Edit, Camera, MoreVertical, UserPlus, LogOut,
    Lock, Loader2, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { authAPI } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { printersAPI } from '@/api/printers';
import { materialsAPI } from '@/api/materials';
import { ordersAPI } from '@/api/orders';
import { teamsAPI, type Team } from '@/api/teams';

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
    name.split(/[\s_]/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

// ─── Бейдж роли ──────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    owner: { label: 'Владелец',       cls: 'border-violet-300 text-violet-600 bg-violet-50 dark:bg-violet-950/30' },
    admin: { label: 'Администратор',  cls: 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    member: { label: 'Участник',      cls: 'border-muted text-muted-foreground' },
};
const getRoleBadge = (role: string) =>
    ROLE_BADGE[role] ?? { label: 'Участник', cls: 'border-muted text-muted-foreground' };


// ─── Страница ─────────────────────────────────────────────────────────────────

export default function UserPage() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    // ── Профиль ───────────────────────────────────────────────────────────────
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editForm, setEditForm] = useState({ username: '', email: '' });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        if (user) setEditForm({ username: user.username ?? '', email: user.email ?? '' });
    }, [user, isEditOpen]);

    // ── Пароль ────────────────────────────────────────────────────────────────
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const passwordsMatch = passwordForm.next === passwordForm.confirm;
    const passwordValid  = passwordForm.next.length >= 6;
    const canSubmitPassword = !!passwordForm.current && passwordValid && passwordsMatch && !isSavingPassword;
    const resetPasswordForm = () => setPasswordForm({ current: '', next: '', confirm: '' });

    // ── Аватар ────────────────────────────────────────────────────────────────
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setCropSrc(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropConfirm = async (blob: Blob) => {
        setIsUploadingAvatar(true);
        setCropSrc(null);
        try {
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const res = await authAPI.uploadAvatar(file);
            setUser(res.data.user);
            toast.success('Аватар обновлён');
        } catch {
            toast.error('Не удалось загрузить аватар');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    // ── Смена email ───────────────────────────────────────────────────────────
    const [isEmailChangeOpen, setIsEmailChangeOpen] = useState(false);
    const [emailChangeForm, setEmailChangeForm] = useState({ newEmail: '', password: '' });
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [isCancellingEmail, setIsCancellingEmail] = useState(false);
    const resetEmailChangeForm = () => setEmailChangeForm({ newEmail: '', password: '' });

    const handleRequestEmailChange = async () => {
        if (!emailChangeForm.newEmail.trim() || !emailChangeForm.password) return;
        setIsSavingEmail(true);
        try {
            await authAPI.requestEmailChange({
                newEmail: emailChangeForm.newEmail.trim(),
                password: emailChangeForm.password,
            });
            const refreshed = await authAPI.getCurrentUser();
            setUser(refreshed.data.user);
            toast.success('Письмо с подтверждением отправлено на новый email');
            resetEmailChangeForm();
            setIsEmailChangeOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при смене email', { duration: 5000 });
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleCancelEmailChange = async () => {
        setIsCancellingEmail(true);
        try {
            await authAPI.cancelEmailChange();
            const refreshed = await authAPI.getCurrentUser();
            setUser(refreshed.data.user);
            toast.success('Смена email отменена');
        } catch {
            toast.error('Не удалось отменить смену email');
        } finally {
            setIsCancellingEmail(false);
        }
    };

    // ── Повторная отправка активации ─────────────────────────────────────────
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSent, setResendSent] = useState(false);

    const handleResendActivation = async () => {
        setResendLoading(true);
        try {
            await authAPI.resendActivation();
            setResendSent(true);
            toast.success('Письмо отправлено. Проверьте почту.');
        } catch {
            toast.error('Не удалось отправить письмо. Попробуйте позже.');
        } finally {
            setResendLoading(false);
        }
    };

    // ── Команды ───────────────────────────────────────────────────────────────
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamMembers, setTeamMembers] = useState<Record<number, { avatar: string | null; username: string }[]>>({});

    useEffect(() => {
        if (!user?.is_activated) return;
        teamsAPI.getMyTeams().then(res => {
            const data = res.data.data;
            setTeams(data);
            const visible = data.slice(0, 3);
            Promise.all(
                visible.map(t =>
                    teamsAPI.getMembers(t.id)
                        .then(r => ({ id: t.id, members: r.data.data.slice(0, 4).map(m => ({ avatar: m.avatar, username: m.username })) }))
                        .catch(() => ({ id: t.id, members: [] }))
                )
            ).then(results => {
                const map: Record<number, { avatar: string | null; username: string }[]> = {};
                results.forEach(r => { map[r.id] = r.members; });
                setTeamMembers(map);
            });
        }).catch(() => {});
    }, [user?.is_activated]);

    // ── Статистика ────────────────────────────────────────────────────────────
    const [stats, setStats] = useState({
        printers: 0,
        material: '—',
        completedOrders: 0,
        totalProfit: '—',
        trends: { printers: 0, material: 0, orders: 0, profit: 0 },
    });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (!user?.is_activated) {
            setStatsLoading(false);
            return;
        }
        const load = async () => {
            try {
                const [printersRes, materialsRes, ordersRes] = await Promise.all([
                    printersAPI.getStats(),
                    materialsAPI.getStats(),
                    ordersAPI.getStats('month'),
                ]);

                const p = printersRes.data.data;
                const m = materialsRes.data.data;
                const o = ordersRes.data.data;

                const monthData     = o.monthly?.[o.monthly.length - 1];
                const prevMonthData = o.monthly?.[o.monthly.length - 2];

                const thisMonthOrders  = Number(monthData?.completed_count ?? 0);
                const prevMonthOrders  = Number(prevMonthData?.completed_count ?? 0);
                const orderTrend = prevMonthOrders > 0
                    ? Math.round(((thisMonthOrders - prevMonthOrders) / prevMonthOrders) * 100)
                    : 0;

                const thisMonthRevenue = Number(monthData?.revenue ?? 0);
                const prevMonthRevenue = Number(prevMonthData?.revenue ?? 0);
                const profitTrend = prevMonthRevenue > 0
                    ? Math.round(((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
                    : 0;

                setStats({
                    printers: Number(p.total),
                    material: `${Number(m.total)} шт`,
                    completedOrders: Number(o.summary.completed_orders),
                    totalProfit: `${Number(o.summary.total_profit).toLocaleString('ru-RU')} ₽`,
                    trends: { printers: 0, material: 0, orders: orderTrend, profit: profitTrend },
                });
            } catch (err) {
                console.error('Ошибка загрузки статистики:', err);
            } finally {
                setStatsLoading(false);
            }
        };
        load();
    }, [user?.is_activated]);

    // ── STAT_CARDS внутри компонента, после всех хуков ───────────────────────
    const STAT_CARDS = [
        {
            title: 'Принтеры',
            value: statsLoading ? '…' : stats.printers,
            icon: Printer,
            description: 'Активных устройств',
            trend: stats.trends.printers,
            href: '/printers',
        },
        {
            title: 'Материалы',
            value: statsLoading ? '…' : stats.material,
            icon: Package,
            description: 'Позиций на складе',
            trend: stats.trends.material,
            href: '/materials',
        },
        {
            title: 'Выполненных заказов',
            value: statsLoading ? '…' : stats.completedOrders,
            icon: CheckCircle,
            description: 'За всё время',
            trend: stats.trends.orders,
            href: '/orders',
        },
        {
            title: 'Общая прибыль',
            value: statsLoading ? '…' : stats.totalProfit,
            icon: DollarSign,
            description: 'За всё время',
            trend: stats.trends.profit,
            href: '/dashboard',
        },
    ];

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSaveProfile = async () => {
        if (!editForm.username.trim()) {
            toast.error('Введите имя пользователя', { duration: 3000 });
            return;
        }
        setIsSavingProfile(true);
        try {
            const res = await authAPI.updateProfile({
                username: editForm.username.trim(),
            });
            setUser(res.data.user ?? { ...user!, ...editForm });
            toast.success('Профиль обновлён', { duration: 3000 });
            setIsEditOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка сохранения профиля', { duration: 5000 });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!canSubmitPassword) return;
        setIsSavingPassword(true);
        try {
            await authAPI.changePassword({ oldPassword: passwordForm.current, newPassword: passwordForm.next });
            toast.success('Пароль успешно изменён', { duration: 3000 });
            resetPasswordForm();
            setIsPasswordOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка смены пароля', { duration: 5000 });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const logout = async () => {
        try { await authAPI.logout(); } catch (err) { console.error('Ошибка выхода:', err); }
        setUser(null);
    };

    // ── Данные пользователя ───────────────────────────────────────────────────

    const displayName  = user?.username ?? user?.email ?? '—';
    const displayEmail = user?.email ?? '—';
    const createdAt    = (user as any)?.created_at;

    // ── Рендер ───────────────────────────────────────────────────────────────

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelected}
            />
            <AvatarCropDialog
                imageSrc={cropSrc}
                onClose={() => setCropSrc(null)}
                onConfirm={handleCropConfirm}
            />
            {/* Шапка */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Профиль пользователя</h1>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />Редактировать профиль
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsEmailChangeOpen(true)}>
                            <Mail className="mr-2 h-4 w-4" />Изменить email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsPasswordOpen(true)}>
                            <Lock className="mr-2 h-4 w-4" />Сменить пароль
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" />Настройки
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />Выйти
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Баннер: ожидает подтверждения смены email */}
            {(user as any)?.pending_email && (
                <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-700 dark:bg-blue-950/30">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Ожидает подтверждения смены email
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Письмо отправлено на{' '}
                            <span className="font-semibold">{(user as any).pending_email}</span>.
                            {' '}Перейдите по ссылке в письме, чтобы завершить смену.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={isCancellingEmail}
                        onClick={handleCancelEmailChange}
                        className="shrink-0"
                    >
                        {isCancellingEmail ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                        Отменить
                    </Button>
                </div>
            )}

            {/* Баннер: аккаунт не активирован */}
            {!user?.is_activated && !(user as any)?.pending_email && (
                <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-950/30">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Аккаунт не активирован
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            Проверьте почту. Если письма нет — загляните в папку <span className="font-semibold">«Спам»</span>, оно могло попасть туда.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={resendLoading || resendSent}
                        onClick={handleResendActivation}
                        className="shrink-0"
                    >
                        {resendLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                        {resendSent ? 'Письмо отправлено' : 'Отправить повторно'}
                    </Button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-7">
                {/* ── Левая колонка ── */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="relative w-32 h-32 mx-auto mb-4 group">
                                <Avatar className="w-32 h-32 border-4 border-primary/10">
                                    <AvatarImage src={(user as any)?.avatar} alt={displayName} />
                                    <AvatarFallback className="text-2xl bg-linear-to-br from-primary/20 to-primary/5">
                                        {getInitials(displayName)}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    size="icon" variant="secondary"
                                    className="absolute bottom-0 right-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    disabled={isUploadingAvatar}
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {isUploadingAvatar
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Camera className="h-4 w-4" />
                                    }
                                </Button>
                            </div>
                            <CardTitle className="text-2xl">{displayName}</CardTitle>
                            <CardDescription className="flex items-center justify-center gap-1">
                                <Mail className="h-3 w-3" />{displayEmail}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {createdAt && (
                                <div className="flex items-center text-sm">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">Зарегистрирован:</span>
                                    <span className="ml-auto font-medium text-right">{formatDate(createdAt)}</span>
                                </div>
                            )}
                            <div className="flex items-center text-sm">
                                <ShieldCheck className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">Аккаунт:</span>
                                <span className="ml-auto">
                                    {(user as any)?.is_activated
                                        ? <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">Подтверждён</Badge>
                                        : <Badge variant="outline" className="text-orange-500 border-orange-200">Не подтверждён</Badge>
                                    }
                                </span>
                            </div>
                            <Separator />
                            <Button variant="outline" className="w-full" onClick={() => setIsEditOpen(true)}>
                                <Edit className="mr-2 h-4 w-4" />Редактировать профиль
                            </Button>
                            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setIsPasswordOpen(true)}>
                                <Lock className="mr-2 h-4 w-4" />Сменить пароль
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Правая колонка ── */}
                <div className="md:col-span-5 space-y-6">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        {STAT_CARDS.map(({ title, value, icon: Icon, description, trend, href }) => (
                            <Card
                                key={title}
                                onClick={() => navigate(href)}
                                className="cursor-pointer group relative overflow-hidden
                                    transition-all duration-200 ease-out
                                    hover:-translate-y-1 hover:shadow-md hover:border-primary/30
                                    active:translate-y-0 active:shadow-sm active:scale-[0.99]"
                            >
                                {/* Subtle background glow on hover */}
                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/3 transition-colors duration-200 pointer-events-none" />

                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                                    <div className="flex items-center gap-1.5">
                                        <Icon className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
                                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 -translate-x-1 group-hover:text-primary/60 group-hover:translate-x-0 transition-all duration-200" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{value}</div>
                                    <p className="text-xs text-muted-foreground">{description}</p>
                                    {trend !== 0 && (
                                        <Badge variant={trend > 0 ? 'default' : 'destructive'} className="mt-2">
                                            {trend > 0 ? '+' : ''}{trend}% с прошлого месяца
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Команды</CardTitle>
                                <CardDescription>
                                    {teams.length === 0 ? 'Вы не состоите ни в одной команде' : `Вы в ${teams.length} ${teams.length === 1 ? 'команде' : 'командах'}`}
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={() => navigate('/teams')}>
                                <UserPlus className="mr-2 h-4 w-4" />Управление
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {teams.length === 0 ? (
                                <div className="flex flex-col items-center py-6 gap-3 text-center">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Создайте команду и пригласите коллег
                                    </p>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/teams')}>
                                        <ArrowRight className="mr-2 h-4 w-4" />Перейти к командам
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {teams.slice(0, 3).map(team => {
                                        const badge = getRoleBadge(team.role ?? 'member');
                                        return (
                                            <div
                                                key={team.id}
                                                onClick={() => navigate(`/teams/${team.id}`)}
                                                className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary text-sm">
                                                        {getInitials(team.name)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{team.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {(teamMembers[team.id] ?? []).length > 0 && (
                                                                <div className="flex -space-x-1.5">
                                                                    {(teamMembers[team.id] ?? []).map((m, i) => (
                                                                        <Avatar key={i} className="w-5 h-5 border border-background">
                                                                            <AvatarImage src={m.avatar ?? undefined} alt={m.username} />
                                                                            <AvatarFallback className="text-[8px]">{getInitials(m.username)}</AvatarFallback>
                                                                        </Avatar>
                                                                    ))}
                                                                    {team.member_count > 4 && (
                                                                        <div className="w-5 h-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] text-muted-foreground font-medium">
                                                                            +{team.member_count - 4}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-muted-foreground">{team.member_count} участников</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={badge.cls}>{badge.label}</Badge>
                                            </div>
                                        );
                                    })}
                                    {teams.length > 3 && (
                                        <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/teams')}>
                                            Показать все ({teams.length})
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Диалог: редактирование профиля */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Редактировать профиль</DialogTitle>
                        <DialogDescription>Измените данные и нажмите «Сохранить».</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-username">Имя пользователя</Label>
                            <Input
                                id="edit-username"
                                value={editForm.username}
                                onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                                placeholder="username"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <div className="flex items-center gap-2">
                                <Input value={editForm.email} disabled className="flex-1" />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={!!(user as any)?.pending_email}
                                    onClick={() => {
                                        setIsEditOpen(false);
                                        setTimeout(() => setIsEmailChangeOpen(true), 150);
                                    }}
                                >
                                    Изменить
                                </Button>
                            </div>
                            {(user as any)?.pending_email && (
                                <p className="text-xs text-blue-600">Ожидает подтверждения: {(user as any).pending_email}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>Аватар</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={(user as any)?.avatar} />
                                    <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="sm"
                                    disabled={isUploadingAvatar}
                                    onClick={() => avatarInputRef.current?.click()}>
                                    {isUploadingAvatar
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        : <Camera className="mr-2 h-4 w-4" />
                                    }
                                    {isUploadingAvatar ? 'Загрузка...' : 'Загрузить новый'}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Отмена</Button>
                        <Button onClick={handleSaveProfile} disabled={isSavingProfile || !editForm.username.trim()}>
                            {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Сохранить изменения
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог: смена пароля */}
            <Dialog open={isPasswordOpen} onOpenChange={open => { setIsPasswordOpen(open); if (!open) resetPasswordForm(); }}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Сменить пароль</DialogTitle>
                        <DialogDescription>Введите текущий пароль и придумайте новый (минимум 6 символов).</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="pwd-current">Текущий пароль</Label>
                            <PasswordInput id="pwd-current" value={passwordForm.current}
                                onChange={v => setPasswordForm(f => ({ ...f, current: v }))} />
                        </div>
                        <Separator />
                        <div className="grid gap-2">
                            <Label htmlFor="pwd-next">Новый пароль</Label>
                            <PasswordInput id="pwd-next" showStrength value={passwordForm.next}
                                onChange={v => setPasswordForm(f => ({ ...f, next: v }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pwd-confirm">Повторите новый пароль</Label>
                            <PasswordInput id="pwd-confirm" value={passwordForm.confirm}
                                onChange={v => setPasswordForm(f => ({ ...f, confirm: v }))} />
                            {passwordForm.confirm && !passwordsMatch && (
                                <p className="text-xs text-red-500">Пароли не совпадают</p>
                            )}
                            {passwordForm.confirm && passwordsMatch && passwordForm.next && (
                                <p className="text-xs text-green-600">Пароли совпадают ✓</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsPasswordOpen(false); resetPasswordForm(); }}>Отмена</Button>
                        <Button onClick={handleChangePassword} disabled={!canSubmitPassword}>
                            {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Сменить пароль
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Диалог: смена email */}
            <Dialog open={isEmailChangeOpen} onOpenChange={open => { setIsEmailChangeOpen(open); if (!open) { resetEmailChangeForm(); setIsSavingEmail(false); } }}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Изменить email</DialogTitle>
                        <DialogDescription>
                            Введите новый email и текущий пароль. На новый адрес придёт письмо с подтверждением.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email-current">Текущий email</Label>
                            <Input id="email-current" value={displayEmail} disabled />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email-new">Новый email</Label>
                            <Input
                                id="email-new"
                                type="email"
                                value={emailChangeForm.newEmail}
                                onChange={e => setEmailChangeForm(f => ({ ...f, newEmail: e.target.value }))}
                                placeholder="новый@email.com"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email-password">Текущий пароль</Label>
                            <PasswordInput
                                id="email-password"
                                value={emailChangeForm.password}
                                onChange={v => setEmailChangeForm(f => ({ ...f, password: v }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsEmailChangeOpen(false); resetEmailChangeForm(); }}>
                            Отмена
                        </Button>
                        <Button
                            onClick={handleRequestEmailChange}
                            disabled={isSavingEmail || !emailChangeForm.newEmail.trim() || !emailChangeForm.password}
                        >
                            {isSavingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Отправить подтверждение
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог настройки  */}
            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </div>
    );
}