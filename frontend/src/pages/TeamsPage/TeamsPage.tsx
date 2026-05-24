import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, invitationsAPI, type Team, type TeamInvitation } from '@/api/teams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Users, Plus, ArrowRight, Loader2, UserPlus, X, Check, Bell } from 'lucide-react';
import { toast } from 'sonner';

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

export default function TeamsPage() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamMembers, setTeamMembers] = useState<Record<number, { avatar: string | null; username: string }[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [isCreating, setIsCreating] = useState(false);

    // ── Входящие приглашения ──────────────────────────────────────────────────
    const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
    const [respondingId, setRespondingId] = useState<number | null>(null);

    // ── Диалог отправки приглашения ───────────────────────────────────────────
    const [inviteTeam, setInviteTeam] = useState<Team | null>(null);
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [inviteSearchResults, setInviteSearchResults] = useState<{ id: number; username: string; avatar: string | null }[]>([]);
    const [inviteSearchLoading, setInviteSearchLoading] = useState(false);
    const [selectedInviteUser, setSelectedInviteUser] = useState<{ id: number; username: string } | null>(null);
    const [inviteMessage, setInviteMessage] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const inviteSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        load();
        loadInvitations();
    }, []);

    async function load() {
        setIsLoading(true);
        try {
            const res = await teamsAPI.getMyTeams();
            const data = res.data.data;
            setTeams(data);
            Promise.all(
                data.map(t =>
                    teamsAPI.getMembers(t.id)
                        .then(r => ({ id: t.id, members: r.data.data.slice(0, 4).map(m => ({ avatar: m.avatar, username: m.username })) }))
                        .catch(() => ({ id: t.id, members: [] }))
                )
            ).then(results => {
                const map: Record<number, { avatar: string | null; username: string }[]> = {};
                results.forEach(r => { map[r.id] = r.members; });
                setTeamMembers(map);
            });
        } catch {
            toast.error('Не удалось загрузить команды');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadInvitations() {
        try {
            const res = await invitationsAPI.getMy();
            setInvitations(res.data.data.filter(i => i.status === 'pending'));
        } catch { /* silent */ }
    }

    async function handleAccept(inv: TeamInvitation) {
        setRespondingId(inv.id);
        try {
            const res = await invitationsAPI.accept(inv.id);
            toast.success(`Вы вступили в команду «${inv.team_name}»`);
            setInvitations(prev => prev.filter(i => i.id !== inv.id));
            setTeams(prev => [res.data.data, ...prev]);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при принятии приглашения');
        } finally {
            setRespondingId(null);
        }
    }

    async function handleDecline(inv: TeamInvitation) {
        setRespondingId(inv.id);
        try {
            await invitationsAPI.decline(inv.id);
            toast.success('Приглашение отклонено');
            setInvitations(prev => prev.filter(i => i.id !== inv.id));
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при отклонении приглашения');
        } finally {
            setRespondingId(null);
        }
    }

    const handleInviteSearch = useCallback((q: string) => {
        setInviteSearchQuery(q);
        setSelectedInviteUser(null);
        if (inviteSearchTimer.current) clearTimeout(inviteSearchTimer.current);
        if (q.trim().length < 2) { setInviteSearchResults([]); return; }
        setInviteSearchLoading(true);
        inviteSearchTimer.current = setTimeout(async () => {
            try {
                const res = await teamsAPI.searchUsers(inviteTeam!.id, q.trim());
                setInviteSearchResults(res.data.data);
            } catch {
                setInviteSearchResults([]);
            } finally {
                setInviteSearchLoading(false);
            }
        }, 300);
    }, [inviteTeam]);

    function resetInviteDialog() {
        setInviteSearchQuery('');
        setInviteSearchResults([]);
        setSelectedInviteUser(null);
        setInviteMessage('');
    }

    async function handleInvite() {
        if (!selectedInviteUser || !inviteTeam) return;
        setIsInviting(true);
        try {
            await teamsAPI.invite(inviteTeam.id, { username: selectedInviteUser.username, message: inviteMessage.trim() || undefined });
            toast.success(`Приглашение отправлено пользователю ${selectedInviteUser.username}`);
            resetInviteDialog();
            setInviteTeam(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при отправке приглашения');
        } finally {
            setIsInviting(false);
        }
    }

    async function handleCreate() {
        if (!form.name.trim()) return;
        setIsCreating(true);
        try {
            const res = await teamsAPI.createTeam({ name: form.name.trim(), description: form.description.trim() || undefined });
            setTeams(prev => [res.data.data, ...prev]);
            toast.success(`Команда «${res.data.data.name}» создана`);
            setForm({ name: '', description: '' });
            setIsCreateOpen(false);
            navigate(`/teams/${res.data.data.id}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при создании команды');
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Команды</h1>
                    <p className="text-muted-foreground mt-1">Управляйте совместной работой</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Создать команду
                </Button>
            </div>

            {/* ── Входящие приглашения ── */}
            {invitations.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Приглашения в команды
                        <Badge variant="secondary" className="ml-1">{invitations.length}</Badge>
                    </h2>
                    <div className="flex flex-col gap-2">
                        {invitations.map(inv => (
                            <div
                                key={inv.id}
                                className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="w-10 h-10 border border-border shrink-0">
                                        <AvatarImage src={inv.team_avatar ?? undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                            {getInitials(inv.team_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{inv.team_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            Пригласил {inv.inviter_name} · {inv.member_count} {Number(inv.member_count) === 1 ? 'участник' : 'участников'}
                                        </p>
                                        {inv.message && (
                                            <p className="text-xs text-muted-foreground italic mt-0.5 truncate">«{inv.message}»</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        disabled={respondingId === inv.id}
                                        onClick={() => handleDecline(inv)}
                                    >
                                        {respondingId === inv.id
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <X className="h-3.5 w-3.5" />
                                        }
                                        <span className="ml-1">Отклонить</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-8"
                                        disabled={respondingId === inv.id}
                                        onClick={() => handleAccept(inv)}
                                    >
                                        {respondingId === inv.id
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Check className="h-3.5 w-3.5" />
                                        }
                                        <span className="ml-1">Вступить</span>
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">У вас пока нет команд</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            Создайте команду или примите приглашение
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />Создать первую команду
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {teams.map(team => (
                        <Card
                            key={team.id}
                            onClick={() => navigate(`/teams/${team.id}`)}
                            className="cursor-pointer group hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 transition-all duration-200"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12 border border-border">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {getInitials(team.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">{team.name}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {team.description ?? 'Нет описания'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className='flex items-center'>
                                        {(team.role === 'owner' || team.role === 'admin') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-muted-foreground hover:text-primary"
                                                onClick={e => { e.stopPropagation(); resetInviteDialog(); setInviteTeam(team); }}
                                            >
                                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                                Пригласить
                                            </Button>
                                        )}
                                        <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-primary/60 transition-colors" />
                                    </div>

                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {(teamMembers[team.id] ?? []).length > 0 ? (
                                            <div className="flex -space-x-1.5">
                                                {(teamMembers[team.id] ?? []).map((m, i) => (
                                                    <Avatar key={i} className="w-6 h-6 border border-background">
                                                        <AvatarImage src={m.avatar ?? undefined} alt={m.username} />
                                                        <AvatarFallback className="text-[9px]">{getInitials(m.username)}</AvatarFallback>
                                                    </Avatar>
                                                ))}
                                                {team.member_count > 4 && (
                                                    <div className="w-6 h-6 rounded-full border border-background bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                                                        +{team.member_count - 4}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <Users className="h-3.5 w-3.5" />
                                        )}
                                        <span>{team.member_count} {Number(team.member_count) === 1 ? 'участник' : 'участников'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {team.role && (
                                            <Badge variant="outline" className={ROLE_COLOR[team.role]}>
                                                {ROLE_LABEL[team.role]}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Диалог отправки приглашения */}
            <Dialog open={!!inviteTeam} onOpenChange={open => { if (!open) { setInviteTeam(null); resetInviteDialog(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Пригласить в команду «{inviteTeam?.name}»</DialogTitle>
                        <DialogDescription>
                            Найдите пользователя по имени. Он получит уведомление и сможет принять или отклонить приглашение.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
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
                        <Button variant="outline" onClick={() => { setInviteTeam(null); resetInviteDialog(); }}>Отмена</Button>
                        <Button onClick={handleInvite} disabled={isInviting || !selectedInviteUser}>
                            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Отправить приглашение
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Диалог создания команды */}
            <Dialog open={isCreateOpen} onOpenChange={open => { setIsCreateOpen(open); if (!open) setForm({ name: '', description: '' }); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Создать команду</DialogTitle>
                        <DialogDescription>Придумайте название для вашей команды</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="team-name">Название *</Label>
                            <Input
                                id="team-name"
                                placeholder="Моя команда"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                maxLength={100}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="team-desc">Описание</Label>
                            <Textarea
                                id="team-desc"
                                placeholder="Чем занимается команда..."
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Отмена</Button>
                        <Button onClick={handleCreate} disabled={isCreating || !form.name.trim()}>
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Создать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
