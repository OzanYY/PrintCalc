import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsAPI, type Team, type TeamMember, type TeamInvitation, type TeamStats, type MemberStat, type TeamResource } from '@/api/teams';
import { printersAPI } from '@/api/printers';
import { materialsAPI } from '@/api/materials';
import type { Order } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users, UserPlus, Settings, Trash2, MoreVertical, LogOut,
    Shield, UserCheck, Printer, Package, CheckCircle,
    DollarSign, Loader2, ArrowLeft, X, Share2, ClipboardList,
    Clock, Weight, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AvatarCropDialog } from '@/components/AvatarCropDialog';

const ROLE_LABEL: Record<string, string> = {
    owner: 'Владелец',
    admin: 'Администратор',
    member: 'Участник',
};
const ROLE_COLOR: Record<string, string> = {
    owner: 'border-violet-300 text-violet-600 bg-violet-50 dark:bg-violet-950/30',
    admin: 'border-blue-300 text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    member: 'border-muted text-muted-foreground',
};

function getInitials(name: string) {
    return name.split(/[\s_]/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Вкладка Заказы ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
    in_progress: 'В процессе',
    completed:   'Завершён',
    cancelled:   'Отменён',
};
const STATUS_COLOR: Record<string, string> = {
    in_progress: 'bg-blue-500 text-white',
    completed:   'bg-green-500 text-white',
    cancelled:   'bg-destructive text-white',
};

function TeamOrdersTab({ teamId, members }: { teamId: number; members: TeamMember[] }) {
    const [orders, setOrders]   = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [memberFilter, setMemberFilter] = useState<string>('all');

    const limit = 20;

    useEffect(() => {
        load();
    }, [teamId, page, statusFilter, memberFilter]);

    async function load() {
        setLoading(true);
        try {
            const res = await teamsAPI.getTeamOrders(teamId, {
                status:      statusFilter !== 'all' ? statusFilter as any : undefined,
                assigned_to: memberFilter !== 'all' ? Number(memberFilter) : undefined,
                limit,
                page,
            });
            setOrders(res.data.data);
            setTotal(res.data.pagination.total);
        } catch {
            toast.error('Не удалось загрузить заказы');
        } finally {
            setLoading(false);
        }
    }

    const totalPages = Math.ceil(total / limit);

    const formatMoney = (v: number | string) =>
        Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';

    const formatTime = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h > 0 ? `${h}ч ${m}м` : `${m}м`;
    };

    return (
        <div className="space-y-4">
            {/* Фильтры */}
            <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Все статусы</SelectItem>
                        <SelectItem value="in_progress">В процессе</SelectItem>
                        <SelectItem value="completed">Завершённые</SelectItem>
                        <SelectItem value="cancelled">Отменённые</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={memberFilter} onValueChange={v => { setMemberFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Исполнитель" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Все участники</SelectItem>
                        {members.map(m => (
                            <SelectItem key={m.user_id} value={String(m.user_id)}>
                                {m.username}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground self-center ml-auto">
                    Всего: {total}
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 opacity-25" />
                    <p className="text-sm">
                        {statusFilter !== 'all' || memberFilter !== 'all'
                            ? 'Заказы не найдены по выбранным фильтрам'
                            : 'В команде ещё нет заказов'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {orders.map(order => (
                        <div key={order.id} className="flex items-start justify-between p-3 rounded-xl border bg-muted/20 gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium truncate">{order.name}</p>
                                    <Badge className={cn('text-xs shrink-0', STATUS_COLOR[order.status])}>
                                        {STATUS_LABEL[order.status]}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                    {order.owner_username && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {order.owner_username}
                                        </span>
                                    )}
                                    {order.assigned_to_username && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <UserCheck className="h-3 w-3" />
                                            {order.assigned_to_username}
                                        </span>
                                    )}
                                    {order.print_time_minutes > 0 && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(order.print_time_minutes)}
                                        </span>
                                    )}
                                    {order.total_weight_grams > 0 && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Weight className="h-3 w-3" />
                                            {Number(order.total_weight_grams).toFixed(1)} г
                                        </span>
                                    )}
                                    {order.deadline && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            до {new Date(order.deadline + 'T00:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    {formatMoney(order.final_price)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(order.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Пагинация */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                        variant="outline" size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >Назад</Button>
                    <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button
                        variant="outline" size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >Вперёд</Button>
                </div>
            )}
        </div>
    );
}

// ─── Вкладка Ресурсы ─────────────────────────────────────────────────────────

function ResourcesTab({ teamId }: { teamId: number }) {
    const { user } = useAuth();
    const currentUserId = user ? Number(user.id) : null;

    const [printers, setPrinters]         = useState<any[]>([]);
    const [materials, setMaterials]       = useState<any[]>([]);
    const [teamPrinters, setTeamPrinters] = useState<any[]>([]);
    const [teamMaterials, setTeamMaterials] = useState<any[]>([]);
    const [shared, setShared]             = useState<Set<string>>(new Set());
    const [loading, setLoading]           = useState(true);
    const [toggling, setToggling]         = useState<Set<string>>(new Set());

    const sharedKey = (type: 'printer' | 'material', id: number) => `${type}:${id}`;

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [p, m, s, tp, tm] = await Promise.all([
                    printersAPI.getAll(),
                    materialsAPI.getAll(),
                    teamsAPI.getMyShared(teamId),
                    teamsAPI.getTeamPrinters(teamId),
                    teamsAPI.getTeamMaterials(teamId),
                ]);
                // Собственные ресурсы — для управления шарингом
                setPrinters(p.data.data.filter((r: any) => Number(r.user_id) === currentUserId));
                setMaterials(m.data.data.filter((r: any) => Number(r.user_id) === currentUserId));
                // Чужие расшаренные — только просмотр
                setTeamPrinters(tp.data.data.filter((r: any) => Number(r.shared_by_user_id) !== currentUserId));
                setTeamMaterials(tm.data.data.filter((r: any) => Number(r.shared_by_user_id) !== currentUserId));
                const sharedSet = new Set<string>(
                    s.data.data.map((r: TeamResource) => sharedKey(r.resource_type, r.resource_id))
                );
                setShared(sharedSet);
            } catch {
                toast.error('Не удалось загрузить ресурсы');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teamId]);

    const toggle = async (type: 'printer' | 'material', id: number) => {
        const key = sharedKey(type, id);
        if (toggling.has(key)) return;
        setToggling(prev => new Set([...prev, key]));
        const isShared = shared.has(key);
        try {
            if (isShared) {
                await teamsAPI.unshareResource(teamId, type, id);
                setShared(prev => { const s = new Set(prev); s.delete(key); return s; });
            } else {
                await teamsAPI.shareResource(teamId, { resource_type: type, resource_id: id });
                setShared(prev => new Set([...prev, key]));
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при изменении шаринга');
        } finally {
            setToggling(prev => { const s = new Set(prev); s.delete(key); return s; });
        }
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    const ResourceRow = ({ type, item, label }: { type: 'printer' | 'material'; item: any; label: string }) => {
        const key = sharedKey(type, item.id);
        const isShared = shared.has(key);
        const isToggling = toggling.has(key);
        return (
            <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isShared ? 'bg-primary/15' : 'bg-muted')}>
                        {type === 'printer'
                            ? <Printer className={cn('h-4 w-4', isShared ? 'text-primary' : 'text-muted-foreground')} />
                            : <Package className={cn('h-4 w-4', isShared ? 'text-primary' : 'text-muted-foreground')} />
                        }
                    </div>
                    <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isShared && <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">Доступно команде</Badge>}
                    {isToggling
                        ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        : <Switch checked={isShared} onCheckedChange={() => toggle(type, item.id)} />
                    }
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* ── Мои ресурсы ── */}
            <div className="space-y-4">
                <div>
                    <h2 className="font-semibold text-sm">Мои ресурсы</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Включите тумблер, чтобы сделать ресурс доступным всем участникам команды.
                    </p>
                </div>

                {printers.length > 0 && (
                    <div>
                        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Printer className="h-4 w-4" />Принтеры
                        </h3>
                        <div className="space-y-2">
                            {printers.map(p => (
                                <ResourceRow key={p.id} type="printer" item={p} label={`${p.type} · ${p.model ?? '—'}`} />
                            ))}
                        </div>
                    </div>
                )}

                {materials.length > 0 && (
                    <div>
                        <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Package className="h-4 w-4" />Материалы
                        </h3>
                        <div className="space-y-2">
                            {materials.map(m => (
                                <ResourceRow key={m.id} type="material" item={m} label={`${m.type ?? m.category ?? '—'} · ${m.price_per_kg ?? '—'} ₽/кг`} />
                            ))}
                        </div>
                    </div>
                )}

                {printers.length === 0 && materials.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                        <Share2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">У вас пока нет принтеров или материалов для шаринга</p>
                    </div>
                )}
            </div>

            {/* ── Ресурсы участников ── */}
            {(teamPrinters.length > 0 || teamMaterials.length > 0) && (
                <div className="space-y-4">
                    <div>
                        <h2 className="font-semibold text-sm">Ресурсы участников</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Расшаренные ресурсы других участников команды. Только просмотр.
                        </p>
                    </div>

                    {teamPrinters.length > 0 && (
                        <div>
                            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <Printer className="h-4 w-4" />Принтеры
                            </h3>
                            <div className="space-y-2">
                                {teamPrinters.map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                                                <Printer className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{p.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {p.type} · {p.model ?? '—'} · {p.shared_by_username}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs shrink-0">Чужой</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {teamMaterials.length > 0 && (
                        <div>
                            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />Материалы
                            </h3>
                            <div className="space-y-2">
                                {teamMaterials.map((m: any) => (
                                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{m.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {m.type ?? m.category ?? '—'} · {m.price_per_kg ?? '—'} ₽/кг · {m.shared_by_username}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs shrink-0">Чужой</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Главная страница команды ─────────────────────────────────────────────────

export default function TeamPage() {
    const { id }   = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const teamId   = Number(id);

    const [team, setTeam]               = useState<Team | null>(null);
    const [members, setMembers]         = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [stats, setStats]             = useState<TeamStats | null>(null);
    const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
    const [isLoading, setIsLoading]     = useState(true);
    const [myRole, setMyRole]           = useState<'owner' | 'admin' | 'member' | null>(null);

    // ── Диалоги ───────────────────────────────────────────────────────────────
    const [isInviteOpen, setIsInviteOpen]   = useState(false);
    const [isEditOpen, setIsEditOpen]       = useState(false);
    const [isDeleteOpen, setIsDeleteOpen]   = useState(false);
    const [inviteMessage, setInviteMessage]   = useState('');
    const [isInviting, setIsInviting]         = useState(false);
    const [editForm, setEditForm]             = useState({ name: '', description: '' });
    const [isSavingEdit, setIsSavingEdit]     = useState(false);
    const [isDeleting, setIsDeleting]         = useState(false);

    // ── Аватар команды ────────────────────────────────────────────────────────
    const teamAvatarInputRef = useRef<HTMLInputElement>(null);
    const [teamCropSrc, setTeamCropSrc] = useState<string | null>(null);
    const [isUploadingTeamAvatar, setIsUploadingTeamAvatar] = useState(false);

    const handleTeamFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setTeamCropSrc(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleTeamCropConfirm = async (blob: Blob) => {
        setIsUploadingTeamAvatar(true);
        setTeamCropSrc(null);
        try {
            const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const res = await teamsAPI.uploadTeamAvatar(teamId, file);
            setTeam(res.data.data);
            toast.success('Аватар команды обновлён');
        } catch {
            toast.error('Не удалось загрузить аватар');
        } finally {
            setIsUploadingTeamAvatar(false);
        }
    };

    // ── Поиск пользователей для приглашения ───────────────────────────────────
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [inviteSearchResults, setInviteSearchResults] = useState<{ id: number; username: string; avatar: string | null }[]>([]);
    const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
    const [selectedInviteUser, setSelectedInviteUser] = useState<{ id: number; username: string } | null>(null);
    const inviteSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { load(); }, [teamId]);

    async function load() {
        setIsLoading(true);
        try {
            const [teamRes, membersRes] = await Promise.all([
                teamsAPI.getTeam(teamId),
                teamsAPI.getMembers(teamId),
            ]);
            setTeam(teamRes.data.data);
            setMembers(membersRes.data.data);
            const me = membersRes.data.data.find(m => m.user_id === Number(user?.id));
            setMyRole(me?.role ?? null);
            setEditForm({ name: teamRes.data.data.name, description: teamRes.data.data.description ?? '' });
        } catch {
            toast.error('Не удалось загрузить команду');
            navigate('/teams');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadStats() {
        try {
            const [statsRes, memberStatsRes] = await Promise.all([
                teamsAPI.getTeamStats(teamId),
                teamsAPI.getMemberStats(teamId),
            ]);
            setStats(statsRes.data.data);
            setMemberStats(memberStatsRes.data.data);
        } catch {
            toast.error('Не удалось загрузить статистику');
        }
    }

    async function loadInvitations() {
        try {
            const res = await teamsAPI.getTeamInvitations(teamId);
            setInvitations(res.data.data);
        } catch { /* silent */ }
    }

    const handleInviteSearch = useCallback((q: string) => {
        setInviteSearchQuery(q);
        setSelectedInviteUser(null);
        if (inviteSearchTimer.current) clearTimeout(inviteSearchTimer.current);
        if (q.trim().length < 2) { setInviteSearchResults([]); return; }
        setInviteSearchLoading(true);
        inviteSearchTimer.current = setTimeout(async () => {
            try {
                const res = await teamsAPI.searchUsers(teamId, q.trim());
                setInviteSearchResults(res.data.data);
            } catch {
                setInviteSearchResults([]);
            } finally {
                setInviteSearchLoading(false);
            }
        }, 300);
    }, [teamId]);

    function resetInviteDialog() {
        setInviteSearchQuery('');
        setInviteSearchResults([]);
        setSelectedInviteUser(null);
        setInviteMessage('');
    }

    async function handleInvite() {
        if (!selectedInviteUser) return;
        setIsInviting(true);
        try {
            await teamsAPI.invite(teamId, { username: selectedInviteUser.username, message: inviteMessage.trim() || undefined });
            toast.success(`Приглашение отправлено пользователю ${selectedInviteUser.username}`);
            resetInviteDialog();
            setIsInviteOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при отправке приглашения');
        } finally {
            setIsInviting(false);
        }
    }

    async function handleSaveEdit() {
        if (!editForm.name.trim()) return;
        setIsSavingEdit(true);
        try {
            const res = await teamsAPI.updateTeam(teamId, { name: editForm.name.trim(), description: editForm.description.trim() || undefined });
            setTeam(res.data.data);
            toast.success('Команда обновлена');
            setIsEditOpen(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при обновлении');
        } finally {
            setIsSavingEdit(false);
        }
    }

    async function handleDelete() {
        setIsDeleting(true);
        try {
            await teamsAPI.deleteTeam(teamId);
            toast.success('Команда удалена');
            navigate('/teams');
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при удалении');
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleRemoveMember(userId: number, username: string) {
        const isSelf = userId === Number(user?.id);
        try {
            await teamsAPI.removeMember(teamId, userId);
            toast.success(isSelf ? 'Вы вышли из команды' : `${username} удалён из команды`);
            if (isSelf) { navigate('/teams'); return; }
            setMembers(prev => prev.filter(m => m.user_id !== userId));
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка');
        }
    }

    async function handleChangeRole(userId: number, role: 'admin' | 'member') {
        try {
            await teamsAPI.updateMemberRole(teamId, userId, role);
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
            toast.success('Роль обновлена');
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка');
        }
    }

    async function handleMergeStats(value: boolean) {
        try {
            await teamsAPI.updateMySettings(teamId, { merge_stats_with_personal: value });
            setMembers(prev => prev.map(m =>
                m.user_id === Number(user?.id) ? { ...m, merge_stats_with_personal: value } : m
            ));
            toast.success(value ? 'Статистика команды включена в личную' : 'Статистика разделена');
        } catch {
            toast.error('Ошибка при сохранении настроек');
        }
    }

    async function handleCancelInvitation(invId: number) {
        try {
            await teamsAPI.cancelInvitation(teamId, invId);
            setInvitations(prev => prev.filter(i => i.id !== invId));
            toast.success('Приглашение отменено');
        } catch {
            toast.error('Ошибка при отмене приглашения');
        }
    }

    const isAdmin  = myRole === 'owner' || myRole === 'admin';
    const isOwner  = myRole === 'owner';
    const myMember = members.find(m => m.user_id === Number(user?.id));

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }
    if (!team) return null;

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <input
                ref={teamAvatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleTeamFileSelected}
            />
            <AvatarCropDialog
                imageSrc={teamCropSrc}
                onClose={() => setTeamCropSrc(null)}
                onConfirm={handleTeamCropConfirm}
            />
            {/* ── Шапка ── */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/teams')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative group shrink-0">
                    <Avatar className="w-12 h-12 border border-border">
                        <AvatarImage src={team.avatar ?? undefined} alt={team.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                            {getInitials(team.name)}
                        </AvatarFallback>
                    </Avatar>
                    {isAdmin && (
                        <button
                            type="button"
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isUploadingTeamAvatar}
                            onClick={() => teamAvatarInputRef.current?.click()}
                        >
                            {isUploadingTeamAvatar
                                ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                                : <Camera className="h-3.5 w-3.5 text-white" />
                            }
                        </button>
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{team.name}</h1>
                    {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                    {/* Кнопка приглашения — всегда на виду для admin/owner */}
                    {isAdmin && (
                        <Button onClick={() => setIsInviteOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />Пригласить
                        </Button>
                    )}
                    {isAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                                    <Settings className="mr-2 h-4 w-4" />Редактировать
                                </DropdownMenuItem>
                                {isOwner && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteOpen(true)}>
                                            <Trash2 className="mr-2 h-4 w-4" />Удалить команду
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <Tabs defaultValue="members" onValueChange={val => {
                if (val === 'stats') loadStats();
                if (val === 'invitations') loadInvitations();
            }}>
                <TabsList className="mb-6 flex-wrap h-auto gap-1">
                    <TabsTrigger value="members">
                        <Users className="h-4 w-4 mr-1.5" />Участники ({members.length})
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="invitations">
                            Приглашения
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="orders">
                        <ClipboardList className="h-4 w-4 mr-1.5" />Заказы
                    </TabsTrigger>
                    <TabsTrigger value="resources">
                        <Share2 className="h-4 w-4 mr-1.5" />Ресурсы
                    </TabsTrigger>
                    <TabsTrigger value="stats">
                        <CheckCircle className="h-4 w-4 mr-1.5" />Статистика
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="h-4 w-4 mr-1.5" />Настройки
                    </TabsTrigger>
                </TabsList>

                {/* ── Участники ── */}
                <TabsContent value="members">
                    {members.length > 1 && isAdmin && (
                        <div className="flex justify-end mb-3">
                            <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />Пригласить
                            </Button>
                        </div>
                    )}
                    {members.length === 1 ? (
                        /* Пустое состояние — только владелец */
                        <div className="flex flex-col items-center py-16 gap-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <UserPlus className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Пригласите первого участника</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                    Введите имя пользователя — он получит уведомление с предложением вступить в команду
                                </p>
                            </div>
                            <Button size="lg" onClick={() => setIsInviteOpen(true)}>
                                <UserPlus className="mr-2 h-5 w-5" />Пригласить участника
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map(member => (
                                <div key={member.user_id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={member.avatar ?? undefined} />
                                            <AvatarFallback>{getInitials(member.username)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {member.username}
                                                {member.user_id === Number(user?.id) && (
                                                    <span className="ml-1.5 text-xs text-muted-foreground">(вы)</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={ROLE_COLOR[member.role]}>
                                            {ROLE_LABEL[member.role]}
                                        </Badge>
                                        {isAdmin && member.role !== 'owner' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {member.role === 'member' ? (
                                                        <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'admin')}>
                                                            <Shield className="mr-2 h-4 w-4" />Сделать администратором
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'member')}>
                                                            <UserCheck className="mr-2 h-4 w-4" />Понизить до участника
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleRemoveMember(member.user_id, member.username)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />Удалить из команды
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                        {member.user_id === Number(user?.id) && member.role !== 'owner' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Выйти из команды" onClick={() => handleRemoveMember(member.user_id, member.username)}>
                                                <LogOut className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ── Приглашения ── */}
                {isAdmin && (
                    <TabsContent value="invitations">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="font-semibold">Исходящие приглашения</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Пользователь получит уведомление и сможет принять или отклонить его</p>
                            </div>
                            <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />Пригласить
                            </Button>
                        </div>
                        {invitations.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Нет активных приглашений</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {invitations.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                                        <div>
                                            <p className="text-sm font-medium">{inv.invitee_name ?? inv.invitee_email}</p>
                                            <p className="text-xs text-muted-foreground">
                                                от {inv.inviter_name} · {new Date(inv.created_at).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={inv.status === 'pending' ? 'secondary' : 'outline'}>
                                                {inv.status === 'pending' ? 'Ожидает' : inv.status === 'accepted' ? 'Принято' : inv.status === 'declined' ? 'Отклонено' : 'Отменено'}
                                            </Badge>
                                            {inv.status === 'pending' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleCancelInvitation(inv.id)}>
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                )}

                {/* ── Заказы ── */}
                <TabsContent value="orders">
                    <TeamOrdersTab teamId={teamId} members={members} />
                </TabsContent>

                {/* ── Ресурсы ── */}
                <TabsContent value="resources">
                    <ResourcesTab teamId={teamId} />
                </TabsContent>

                {/* ── Статистика ── */}
                <TabsContent value="stats">
                    {!stats ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                                {[
                                    { title: 'Принтеры', value: stats.printers, Icon: Printer },
                                    { title: 'Материалы', value: stats.materials, Icon: Package },
                                    { title: 'Завершено', value: stats.completed_orders, Icon: CheckCircle },
                                    { title: 'Прибыль', value: `${stats.total_profit.toLocaleString('ru-RU')} ₽`, Icon: DollarSign },
                                ].map(({ title, value, Icon }) => (
                                    <Card key={title}>
                                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{value}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            <div>
                                <h3 className="font-semibold mb-3">По участникам</h3>
                                <div className="space-y-2">
                                    {memberStats.map(ms => (
                                        <div key={ms.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={ms.avatar ?? undefined} />
                                                    <AvatarFallback className="text-xs">{getInitials(ms.username)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{ms.username}</p>
                                                    <p className="text-xs text-muted-foreground">{ROLE_LABEL[ms.role]}</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm">
                                                <p className="font-medium">{ms.completed_orders} заказов</p>
                                                <p className="text-xs text-muted-foreground">{Number(ms.total_profit).toLocaleString('ru-RU')} ₽</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ── Настройки ── */}
                <TabsContent value="settings">
                    <div className="max-w-md space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Личные настройки</CardTitle>
                                <CardDescription>Только для вас в этой команде</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Объединить статистику</p>
                                        <p className="text-xs text-muted-foreground">Командные заказы учитываются в вашей личной статистике</p>
                                    </div>
                                    <Switch
                                        checked={myMember?.merge_stats_with_personal ?? false}
                                        onCheckedChange={handleMergeStats}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        {myRole !== 'owner' && (
                            <Card className="border-destructive/30">
                                <CardHeader><CardTitle className="text-base text-destructive">Опасная зона</CardTitle></CardHeader>
                                <CardContent>
                                    <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => myMember && handleRemoveMember(myMember.user_id, myMember.username)}>
                                        <LogOut className="mr-2 h-4 w-4" />Покинуть команду
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ── Диалог: пригласить ── */}
            <Dialog open={isInviteOpen} onOpenChange={open => { setIsInviteOpen(open); if (!open) resetInviteDialog(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Пригласить в команду «{team.name}»</DialogTitle>
                        <DialogDescription>
                            Найдите пользователя по имени. Он получит уведомление и сможет принять или отклонить приглашение.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Поле поиска пользователя */}
                        <div className="grid gap-2">
                            <Label>Поиск пользователя *</Label>
                            {selectedInviteUser ? (
                                <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-primary/5 border-primary/20">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={inviteSearchResults.find(u => u.id === selectedInviteUser.id)?.avatar ?? undefined} />
                                        <AvatarFallback className="text-xs">{getInitials(selectedInviteUser.username)}</AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 text-sm font-medium">{selectedInviteUser.username}</span>
                                    <Button
                                        variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => { setSelectedInviteUser(null); setInviteSearchQuery(''); setInviteSearchResults([]); }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        placeholder="Введите имя пользователя..."
                                        value={inviteSearchQuery}
                                        onChange={e => handleInviteSearch(e.target.value)}
                                        autoFocus
                                    />
                                    {inviteSearchLoading && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                    {!inviteSearchLoading && inviteSearchQuery.length >= 2 && inviteSearchResults.length === 0 && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-md p-3 text-sm text-muted-foreground text-center">
                                            Пользователи не найдены
                                        </div>
                                    )}
                                    {inviteSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-md overflow-hidden">
                                            {inviteSearchResults.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                                                    onClick={() => { setSelectedInviteUser({ id: u.id, username: u.username }); setInviteSearchResults([]); }}
                                                >
                                                    <Avatar className="w-7 h-7 shrink-0">
                                                        <AvatarImage src={u.avatar ?? undefined} />
                                                        <AvatarFallback className="text-xs">{getInitials(u.username)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm">{u.username}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="invite-msg">Сообщение (необязательно)</Label>
                            <Textarea
                                id="invite-msg"
                                placeholder="Привет! Присоединяйся к нашей команде..."
                                value={inviteMessage}
                                onChange={e => setInviteMessage(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Отмена</Button>
                        <Button onClick={handleInvite} disabled={isInviting || !selectedInviteUser}>
                            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Отправить приглашение
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Диалог: редактировать ── */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Редактировать команду</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Аватар</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16 border border-border">
                                    <AvatarImage src={team?.avatar ?? undefined} alt={team?.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                                        {team ? getInitials(team.name) : ''}
                                    </AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="sm"
                                    disabled={isUploadingTeamAvatar}
                                    onClick={() => teamAvatarInputRef.current?.click()}>
                                    {isUploadingTeamAvatar
                                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        : <Camera className="mr-2 h-4 w-4" />
                                    }
                                    {isUploadingTeamAvatar ? 'Загрузка...' : 'Загрузить фото'}
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Название</Label>
                            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Описание</Label>
                            <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Отмена</Button>
                        <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editForm.name.trim()}>
                            {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Диалог: удалить ── */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить команду</DialogTitle>
                        <DialogDescription>Это действие необратимо. Все данные команды будут удалены.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Отмена</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
