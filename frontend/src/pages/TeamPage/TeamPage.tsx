import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsAPI, type Team, type TeamMember, type TeamInvitation, type TeamStats, type MemberStat } from '@/api/teams';
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
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Users, UserPlus, Settings, Trash2, MoreVertical, LogOut,
    Crown, Shield, UserCheck, Printer, Package, CheckCircle,
    DollarSign, Loader2, ArrowLeft, Clock, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

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

export default function TeamPage() {
    const { id }   = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const teamId   = Number(id);

    const [team, setTeam]             = useState<Team | null>(null);
    const [members, setMembers]       = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [stats, setStats]           = useState<TeamStats | null>(null);
    const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
    const [isLoading, setIsLoading]   = useState(true);
    const [myRole, setMyRole]         = useState<'owner' | 'admin' | 'member' | null>(null);

    // ── Диалоги ───────────────────────────────────────────────────────────────
    const [isInviteOpen, setIsInviteOpen]   = useState(false);
    const [isEditOpen, setIsEditOpen]       = useState(false);
    const [isDeleteOpen, setIsDeleteOpen]   = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteMessage, setInviteMessage]   = useState('');
    const [isInviting, setIsInviting]         = useState(false);
    const [editForm, setEditForm]             = useState({ name: '', description: '' });
    const [isSavingEdit, setIsSavingEdit]     = useState(false);
    const [isDeleting, setIsDeleting]         = useState(false);

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

    async function handleInvite() {
        if (!inviteUsername.trim()) return;
        setIsInviting(true);
        try {
            await teamsAPI.invite(teamId, { username: inviteUsername.trim(), message: inviteMessage.trim() || undefined });
            toast.success(`Приглашение отправлено пользователю ${inviteUsername}`);
            setInviteUsername('');
            setInviteMessage('');
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
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!team) return null;

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            {/* Шапка */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/teams')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="w-12 h-12 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {getInitials(team.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{team.name}</h1>
                    {team.description && (
                        <p className="text-sm text-muted-foreground">{team.description}</p>
                    )}
                </div>
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
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => setIsDeleteOpen(true)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />Удалить команду
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <Tabs defaultValue="members" onValueChange={val => {
                if (val === 'stats') loadStats();
                if (val === 'invitations') loadInvitations();
            }}>
                <TabsList className="mb-6">
                    <TabsTrigger value="members">
                        <Users className="h-4 w-4 mr-2" />Участники ({members.length})
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="invitations">
                            <Clock className="h-4 w-4 mr-2" />Приглашения
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="stats">
                        <CheckCircle className="h-4 w-4 mr-2" />Статистика
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="h-4 w-4 mr-2" />Настройки
                    </TabsTrigger>
                </TabsList>

                {/* ── Участники ── */}
                <TabsContent value="members">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold">Участники команды</h2>
                        {isAdmin && (
                            <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />Пригласить
                            </Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {members.map(member => (
                            <div
                                key={member.user_id}
                                className="flex items-center justify-between p-3 rounded-xl border bg-muted/20"
                            >
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
                                    {/* Меню действий — только admin/owner и не для самого owner */}
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
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => handleRemoveMember(member.user_id, member.username)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />Удалить из команды
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    {/* Кнопка "Выйти" для себя (не owner) */}
                                    {member.user_id === Number(user?.id) && member.role !== 'owner' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            title="Выйти из команды"
                                            onClick={() => handleRemoveMember(member.user_id, member.username)}
                                        >
                                            <LogOut className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* ── Приглашения ── */}
                {isAdmin && (
                    <TabsContent value="invitations">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold">Исходящие приглашения</h2>
                            <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />Пригласить
                            </Button>
                        </div>
                        {invitations.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Нет активных приглашений</p>
                        ) : (
                            <div className="space-y-2">
                                {invitations.map(inv => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between p-3 rounded-xl border bg-muted/20"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{inv.invitee_name ?? inv.invitee_email}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Приглашён: {inv.inviter_name} ·{' '}
                                                {inv.status === 'pending' ? 'Ожидает' : inv.status}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={inv.status === 'pending' ? 'secondary' : 'outline'}>
                                                {inv.status === 'pending' ? 'Ожидает' :
                                                 inv.status === 'accepted' ? 'Принято' :
                                                 inv.status === 'declined' ? 'Отклонено' : 'Отменено'}
                                            </Badge>
                                            {inv.status === 'pending' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleCancelInvitation(inv.id)}
                                                >
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

                {/* ── Статистика ── */}
                <TabsContent value="stats">
                    {!stats ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
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
                                                <p className="text-xs text-muted-foreground">
                                                    {Number(ms.total_profit).toLocaleString('ru-RU')} ₽
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ── Настройки (личные) ── */}
                <TabsContent value="settings">
                    <div className="max-w-md space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Личные настройки</CardTitle>
                                <CardDescription>Только для вас в этой команде</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Объединить статистику</p>
                                        <p className="text-xs text-muted-foreground">
                                            Командные заказы учитываются в вашей личной статистике
                                        </p>
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
                                <CardHeader>
                                    <CardTitle className="text-base text-destructive">Опасная зона</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="outline"
                                        className="border-destructive text-destructive hover:bg-destructive/10"
                                        onClick={() => myMember && handleRemoveMember(myMember.user_id, myMember.username)}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />Покинуть команду
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ── Диалог: пригласить ── */}
            <Dialog open={isInviteOpen} onOpenChange={open => { setIsInviteOpen(open); if (!open) { setInviteUsername(''); setInviteMessage(''); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Пригласить в команду</DialogTitle>
                        <DialogDescription>Введите имя пользователя</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="invite-user">Имя пользователя *</Label>
                            <Input
                                id="invite-user"
                                placeholder="username"
                                value={inviteUsername}
                                onChange={e => setInviteUsername(e.target.value)}
                            />
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
                        <Button onClick={handleInvite} disabled={isInviting || !inviteUsername.trim()}>
                            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Отправить приглашение
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Диалог: редактировать ── */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать команду</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Название</Label>
                            <Input
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                maxLength={100}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Описание</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Отмена</Button>
                        <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editForm.name.trim()}>
                            {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Диалог: удалить команду ── */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Удалить команду</DialogTitle>
                        <DialogDescription>
                            Это действие необратимо. Все данные команды будут удалены.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Отмена</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Удалить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
