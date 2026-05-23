import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamsAPI, type Team } from '@/api/teams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Users, Plus, Crown, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

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
    const navigate   = useNavigate();
    const { user }   = useAuth();
    const [teams, setTeams]               = useState<Team[]>([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [form, setForm]                 = useState({ name: '', description: '' });
    const [isCreating, setIsCreating]     = useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setIsLoading(true);
        try {
            const res = await teamsAPI.getMyTeams();
            setTeams(res.data.data);
        } catch {
            toast.error('Не удалось загрузить команды');
        } finally {
            setIsLoading(false);
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
                                    <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-primary/60 transition-colors" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{team.member_count} {Number(team.member_count) === 1 ? 'участник' : 'участников'}</span>
                                    </div>
                                    {team.role && (
                                        <Badge variant="outline" className={ROLE_COLOR[team.role]}>
                                            {ROLE_LABEL[team.role]}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
