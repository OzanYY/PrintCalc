// pages/AdminPage/AdminPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, type AdminUser, type AdminTeam, type AdminTeamMember, type TableInfo, type ColumnInfo } from '@/api/admin';
import { ordersAPI, type OrderStatsResponse } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Иконки (svg inline) ──────────────────────────────────────────────────────
const IconUsers = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);
const IconTable = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
);
const IconEdit = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);
const IconTrash = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
);
const IconKey = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
);
const IconPlus = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
);
const IconChevronLeft = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="15 18 9 12 15 6"/>
    </svg>
);
const IconChevronRight = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="9 18 15 12 9 6"/>
    </svg>
);
const IconChart = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
);
const IconShield = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
);
const IconRefresh = ({ spinning }: { spinning?: boolean }) => (
    <svg
        width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        className={spinning ? 'animate-spin' : undefined}
    >
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-4.58"/>
    </svg>
);

type Section = 'stats' | 'users' | 'teams' | 'tables';

// ─── Компонент: управление пользователями ────────────────────────────────────
function UsersSection() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', is_activated: false, role: 'user' });
    const [pwdDialog, setPwdDialog] = useState<{ open: boolean; userId: string; username: string }>({
        open: false, userId: '', username: ''
    });
    const [filterText, setFilterText] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
    const [newPwd, setNewPwd] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: AdminUser | null }>({
        open: false, user: null
    });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await adminAPI.getUsers();
            setUsers(res.data.users);
        } catch {
            toast.error('Не удалось загрузить пользователей');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openEdit = (u: AdminUser) => {
        setEditUser(u);
        setEditForm({ username: u.username, email: u.email, is_activated: u.is_activated, role: u.role });
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const text = filterText.toLowerCase();
            const matchText = !text || u.username.toLowerCase().includes(text) || u.email.toLowerCase().includes(text);
            const matchRole = filterRole === 'all' || u.role === filterRole;
            return matchText && matchRole;
        });
    }, [users, filterText, filterRole]);

    const saveEdit = async () => {
        if (!editUser) return;
        setSaving(true);
        try {
            await adminAPI.updateUser(editUser.id, editForm);
            toast.success('Пользователь обновлён');
            setEditUser(null);
            load();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка обновления');
        } finally {
            setSaving(false);
        }
    };

    const savePwd = async () => {
        if (!newPwd || newPwd.length < 6) {
            toast.error('Пароль должен быть не менее 6 символов');
            return;
        }
        setSaving(true);
        try {
            await adminAPI.updateUserPassword(pwdDialog.userId, newPwd);
            toast.success('Пароль обновлён');
            setPwdDialog({ open: false, userId: '', username: '' });
            setNewPwd('');
        } catch {
            toast.error('Ошибка смены пароля');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.user) return;
        try {
            await adminAPI.deleteUser(deleteConfirm.user.id);
            toast.success('Пользователь удалён');
            setDeleteConfirm({ open: false, user: null });
            load();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка удаления');
        }
    };

    if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Загрузка...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl font-semibold">Пользователи</h2>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Поиск по имени или email..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="h-8 text-sm w-56"
                    />
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value as 'all' | 'admin' | 'user')}
                        className="text-sm border rounded-md px-2 py-1.5 bg-background h-8"
                    >
                        <option value="all">Все роли</option>
                        <option value="admin">Администраторы</option>
                        <option value="user">Пользователи</option>
                    </select>
                    <Badge variant="secondary">{filteredUsers.length} / {users.length}</Badge>
                </div>
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">ID</TableHead>
                            <TableHead>Имя</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Роль</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Создан</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((u) => (
                            <TableRow key={u.id} className={u.id === currentUser?.id ? 'bg-muted/30' : ''}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{u.id}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-7 h-7 shrink-0">
                                            <AvatarImage src={u.avatar} alt={u.username} />
                                            <AvatarFallback className="text-xs">
                                                {u.username.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {u.username}
                                        {u.id === currentUser?.id && (
                                            <span className="text-xs text-muted-foreground">(вы)</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>
                                    <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                                        {u.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={u.is_activated ? 'secondary' : 'destructive'} className="text-xs">
                                        {u.is_activated ? 'Активен' : 'Неактивен'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Редактировать">
                                            <IconEdit />
                                        </Button>
                                        <Button
                                            variant="ghost" size="sm"
                                            onClick={() => { setPwdDialog({ open: true, userId: u.id, username: u.username }); setNewPwd(''); }}
                                            title="Сменить пароль"
                                        >
                                            <IconKey />
                                        </Button>
                                        <Button
                                            variant="ghost" size="sm"
                                            className="text-destructive hover:text-destructive"
                                            disabled={u.id === currentUser?.id}
                                            onClick={() => setDeleteConfirm({ open: true, user: u })}
                                            title="Удалить"
                                        >
                                            <IconTrash />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать пользователя</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Имя пользователя</label>
                            <Input
                                value={editForm.username}
                                onChange={(e) => setEditForm(f => ({ ...f, username: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Email</label>
                            <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Роль</label>
                            <select
                                value={editForm.role}
                                onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                                className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                                disabled={editUser?.id === currentUser?.id}
                            >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                            </select>
                            {editUser?.id === currentUser?.id && (
                                <p className="text-xs text-muted-foreground mt-1">Нельзя изменить роль собственного аккаунта</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_activated"
                                checked={editForm.is_activated}
                                onChange={(e) => setEditForm(f => ({ ...f, is_activated: e.target.checked }))}
                                className="h-4 w-4"
                            />
                            <label htmlFor="is_activated" className="text-sm font-medium">Аккаунт активирован</label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditUser(null)}>Отмена</Button>
                        <Button onClick={saveEdit} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Password Dialog */}
            <Dialog open={pwdDialog.open} onOpenChange={(o) => !o && setPwdDialog(p => ({ ...p, open: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Сменить пароль — {pwdDialog.username}</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <label className="text-sm font-medium mb-1 block">Новый пароль</label>
                        <Input
                            type="password"
                            placeholder="Минимум 6 символов"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPwdDialog(p => ({ ...p, open: false }))}>Отмена</Button>
                        <Button onClick={savePwd} disabled={saving}>{saving ? 'Сохранение...' : 'Установить пароль'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm(p => ({ ...p, open: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Пользователь <strong>{deleteConfirm.user?.username}</strong> и все его данные будут удалены безвозвратно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Компонент: статистика системы ──────────────────────────────────────────
function StatsSection() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<OrderStatsResponse | null>(null);

    useEffect(() => {
        Promise.all([
            adminAPI.getUsers(),
            ordersAPI.getStats('all'),
        ]).then(([usersRes, statsRes]) => {
            setUsers(usersRes.data.users);
            setStats(statsRes.data.data);
        }).catch(() => toast.error('Не удалось загрузить статистику'))
          .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Загрузка...</div>;
    if (!stats) return null;

    const activeUsers = users.filter(u => u.is_activated).length;
    const adminCount = users.filter(u => u.role === 'admin').length;

    const n = (v: string | number, dec = 0) => {
        const num = Number(v);
        return isNaN(num) ? '—' : num.toLocaleString('ru-RU', { maximumFractionDigits: dec });
    };
    const rub = (v: string | number) => `${n(v, 2)} ₽`;
    const monthName = (m: number) => {
        try { return new Date(2000, m - 1).toLocaleString('ru-RU', { month: 'long' }); }
        catch { return `Месяц ${m}`; }
    };
    const statusLabel = (s: string) =>
        s === 'completed' ? 'Выполнен' : s === 'in_progress' ? 'В работе' : 'Отменён';
    const statusVariant = (s: string): 'secondary' | 'default' | 'destructive' =>
        s === 'completed' ? 'secondary' : s === 'in_progress' ? 'default' : 'destructive';

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Обзор системы</h2>

            {/* KPI-карточки */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Пользователей</p>
                    <p className="text-3xl font-bold">{users.length}</p>
                    <p className="text-xs text-muted-foreground">{activeUsers} активных · {adminCount} {adminCount === 1 ? 'админ' : 'админов'}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Всего заказов</p>
                    <p className="text-3xl font-bold">{n(stats.summary.total_orders)}</p>
                    <p className="text-xs text-muted-foreground">{n(stats.summary.in_progress_orders)} в работе</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Выручка</p>
                    <p className="text-3xl font-bold">{rub(stats.summary.total_revenue)}</p>
                    <p className="text-xs text-muted-foreground">прибыль {rub(stats.summary.total_profit)}</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Средний чек</p>
                    <p className="text-3xl font-bold">{rub(stats.summary.avg_order_value)}</p>
                    <p className="text-xs text-muted-foreground">макс {rub(stats.summary.max_order_value)}</p>
                </div>
            </div>

            {/* Аналитика */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Конверсия</p>
                    <p className="text-2xl font-bold">{n(stats.analytics.conversion_rate, 1)}%</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Средняя маржа</p>
                    <p className="text-2xl font-bold">{n(stats.analytics.average_profit_margin, 1)}%</p>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Цена 1 г филамента</p>
                    <p className="text-2xl font-bold">{rub(stats.analytics.average_cost_per_gram)}</p>
                </div>
            </div>

            {/* По статусам */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">По статусам</p>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Статус</TableHead>
                                <TableHead className="text-right">Заказов</TableHead>
                                <TableHead className="text-right">Сумма</TableHead>
                                <TableHead className="text-right">Материал</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.by_status.map(row => (
                                <TableRow key={row.status}>
                                    <TableCell>
                                        <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{n(row.count)}</TableCell>
                                    <TableCell className="text-right">{rub(row.total_value)}</TableCell>
                                    <TableCell className="text-right">{n(row.total_weight)} г</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* По месяцам */}
            {stats.monthly.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">По месяцам</p>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Месяц</TableHead>
                                    <TableHead className="text-right">Заказов</TableHead>
                                    <TableHead className="text-right">Выполнено</TableHead>
                                    <TableHead className="text-right">Отменено</TableHead>
                                    <TableHead className="text-right">Выручка</TableHead>
                                    <TableHead className="text-right">Филамент</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...stats.monthly].reverse().map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium capitalize">{monthName(row.month)}</TableCell>
                                        <TableCell className="text-right">{n(row.orders_count)}</TableCell>
                                        <TableCell className="text-right">{n(row.completed_count)}</TableCell>
                                        <TableCell className="text-right">{n(row.cancelled_count)}</TableCell>
                                        <TableCell className="text-right">{rub(row.revenue)}</TableCell>
                                        <TableCell className="text-right">{n(row.filament_used)} г</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Компонент: таблицы БД ───────────────────────────────────────────────────
function TablesSection() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [activeTable, setActiveTable] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 50 });
    const [search, setSearch] = useState('');
    const [searchCol, setSearchCol] = useState('');
    const [loading, setLoading] = useState(true);
    const [rowsLoading, setRowsLoading] = useState(false);

    // Edit/Create/Delete state
    const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
    const [editForm, setEditForm] = useState<Record<string, string>>({});
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState<Record<string, string>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        adminAPI.getTables()
            .then(res => {
                setTables(res.data.tables);
                if (res.data.tables.length > 0) setActiveTable(res.data.tables[0].name);
            })
            .catch(() => toast.error('Не удалось загрузить таблицы'))
            .finally(() => setLoading(false));
    }, []);

    const loadRows = useCallback(async (table: string, page = 1, s = search, sc = searchCol) => {
        setRowsLoading(true);
        try {
            const [colRes, rowRes] = await Promise.all([
                adminAPI.getTableColumns(table),
                adminAPI.getTableRows(table, { page, limit: 50, search: s, searchCol: sc }),
            ]);
            setColumns(colRes.data.columns);
            setRows(rowRes.data.rows);
            setPagination({ page: rowRes.data.page, pages: rowRes.data.pages, total: rowRes.data.total, limit: rowRes.data.limit });
            if (!searchCol && colRes.data.columns.length > 0) {
                setSearchCol(colRes.data.columns[0].column_name);
            }
        } catch {
            toast.error('Не удалось загрузить данные таблицы');
        } finally {
            setRowsLoading(false);
        }
    }, [search, searchCol]);

    useEffect(() => {
        if (activeTable) {
            setSearch('');
            setSearchCol('');
            loadRows(activeTable, 1, '', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTable]);

    const handleSearch = () => {
        if (activeTable) loadRows(activeTable, 1, search, searchCol);
    };

    const openEdit = (row: Record<string, unknown>) => {
        setEditRow(row);
        const form: Record<string, string> = {};
        columns.forEach(col => {
            if (col.column_name !== 'id') {
                const val = row[col.column_name];
                form[col.column_name] = val != null
                    ? (typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val))
                    : '';
            }
        });
        setEditForm(form);
    };

    const saveEdit = async () => {
        if (!editRow || !activeTable) return;
        setSaving(true);
        try {
            await adminAPI.updateTableRow(activeTable, String(editRow.id), editForm);
            toast.success('Запись обновлена');
            setEditRow(null);
            loadRows(activeTable, pagination.page);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка обновления');
        } finally {
            setSaving(false);
        }
    };

    const openCreate = () => {
        const form: Record<string, string> = {};
        columns.forEach(col => {
            if (col.column_name !== 'id' && !col.column_name.includes('_at')) {
                form[col.column_name] = '';
            }
        });
        setCreateForm(form);
        setCreateOpen(true);
    };

    const saveCreate = async () => {
        if (!activeTable) return;
        setSaving(true);
        try {
            const data: Record<string, unknown> = {};
            Object.entries(createForm).forEach(([k, v]) => { if (v !== '') data[k] = v; });
            await adminAPI.createTableRow(activeTable, data);
            toast.success('Запись создана');
            setCreateOpen(false);
            loadRows(activeTable, 1);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка создания');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!activeTable || !deleteConfirm.id) return;
        try {
            await adminAPI.deleteTableRow(activeTable, deleteConfirm.id);
            toast.success('Запись удалена');
            setDeleteConfirm({ open: false, id: '' });
            loadRows(activeTable, pagination.page);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка удаления');
        }
    };

    const formatValue = (val: unknown): string => {
        if (val === null || val === undefined) return '—';
        if (typeof val === 'object') return JSON.stringify(val).substring(0, 60) + '...';
        const s = String(val);
        return s.length > 60 ? s.substring(0, 60) + '…' : s;
    };

    if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Загрузка...</div>;

    const HIDDEN_COLS = ['activation_link', 'reset_password_token', 'password_hash'];
    const visibleCols = columns.filter(c => !HIDDEN_COLS.includes(c.column_name));

    return (
        <div className="flex gap-4 h-full">
            {/* Sidebar таблиц */}
            <div className="w-52 shrink-0 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">Таблицы</p>
                {tables.map(t => (
                    <button
                        key={t.name}
                        onClick={() => setActiveTable(t.name)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                            activeTable === t.name
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-foreground'
                        }`}
                    >
                        <span className="truncate font-mono">{t.name}</span>
                        <span className={`text-xs shrink-0 ${activeTable === t.name ? 'opacity-70' : 'text-muted-foreground'}`}>
                            {t.row_count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Контент таблицы */}
            <div className="flex-1 min-w-0 space-y-3">
                {activeTable && (
                    <>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold font-mono">{activeTable}</h2>
                                <Badge variant="secondary">{pagination.total} строк</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={searchCol}
                                    onChange={e => setSearchCol(e.target.value)}
                                    className="text-sm border rounded-md px-2 py-1.5 bg-background"
                                >
                                    {columns.map(c => (
                                        <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                                    ))}
                                </select>
                                <Input
                                    placeholder="Поиск..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    className="w-48 h-8 text-sm"
                                />
                                <Button size="sm" variant="outline" onClick={handleSearch}>Найти</Button>
                                <Button size="sm" onClick={openCreate} className="gap-1">
                                    <IconPlus /> Добавить
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-md border overflow-auto max-h-[60vh]">
                            {rowsLoading ? (
                                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Загрузка...</div>
                            ) : rows.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Нет записей</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {visibleCols.map(col => (
                                                <TableHead key={col.column_name} className="text-xs whitespace-nowrap">
                                                    {col.column_name}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-right text-xs">Действия</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row, i) => (
                                            <TableRow key={String(row.id) || i}>
                                                {visibleCols.map(col => (
                                                    <TableCell key={col.column_name} className="text-xs font-mono max-w-[180px] truncate">
                                                        {formatValue(row[col.column_name])}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                                                            <IconEdit />
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteConfirm({ open: true, id: String(row.id) })}
                                                        >
                                                            <IconTrash />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {/* Пагинация */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Страница {pagination.page} из {pagination.pages} ({pagination.total} записей)</span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline" size="sm"
                                        disabled={pagination.page <= 1}
                                        onClick={() => loadRows(activeTable, pagination.page - 1)}
                                    >
                                        <IconChevronLeft />
                                    </Button>
                                    <Button
                                        variant="outline" size="sm"
                                        disabled={pagination.page >= pagination.pages}
                                        onClick={() => loadRows(activeTable, pagination.page + 1)}
                                    >
                                        <IconChevronRight />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Edit Row Dialog */}
            <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Редактировать запись #{String(editRow?.id)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {Object.keys(editForm).map(key => {
                            const col = columns.find(c => c.column_name === key);
                            const isLong = col && ['jsonb', 'json', 'text'].includes(col.data_type);
                            return (
                                <div key={key}>
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">
                                        {key}
                                        {col && <span className="ml-1 opacity-50">({col.data_type})</span>}
                                    </label>
                                    {isLong ? (
                                        <Textarea
                                            value={editForm[key]}
                                            onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="text-xs font-mono min-h-[80px]"
                                        />
                                    ) : (
                                        <Input
                                            value={editForm[key]}
                                            onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="text-sm font-mono"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditRow(null)}>Отмена</Button>
                        <Button onClick={saveEdit} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Row Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Добавить запись в {activeTable}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {Object.keys(createForm).map(key => {
                            const col = columns.find(c => c.column_name === key);
                            const isLong = col && ['jsonb', 'json', 'text'].includes(col.data_type);
                            return (
                                <div key={key}>
                                    <label className="text-xs font-medium mb-1 block text-muted-foreground">
                                        {key}
                                        {col && <span className="ml-1 opacity-50">({col.data_type})</span>}
                                    </label>
                                    {isLong ? (
                                        <Textarea
                                            value={createForm[key]}
                                            onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="text-xs font-mono min-h-[80px]"
                                            placeholder={col?.data_type || ''}
                                        />
                                    ) : (
                                        <Input
                                            value={createForm[key]}
                                            onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                                            className="text-sm font-mono"
                                            placeholder={col?.data_type || ''}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
                        <Button onClick={saveCreate} disabled={saving}>{saving ? 'Создание...' : 'Создать'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm(p => ({ ...p, open: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить запись #{deleteConfirm.id}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие необратимо. Запись будет удалена из таблицы <strong>{activeTable}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Компонент: управление командами ─────────────────────────────────────────
function TeamsSection() {
    const [teams, setTeams] = useState<AdminTeam[]>([]);
    const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const [editTeam, setEditTeam] = useState<AdminTeam | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '' });
    const [saving, setSaving] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; team: AdminTeam | null }>({ open: false, team: null });

    const [membersTeam, setMembersTeam] = useState<AdminTeam | null>(null);
    const [members, setMembers] = useState<AdminTeamMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [addUserId, setAddUserId] = useState('');
    const [addRole, setAddRole] = useState<'admin' | 'member'>('member');
    const [addingMember, setAddingMember] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [changingRoleId, setChangingRoleId] = useState<number | null>(null);

    const loadTeams = useCallback(async (page = 1, s = '') => {
        setLoading(true);
        try {
            const res = await adminAPI.getTeams({ page, limit: 20, search: s });
            setTeams(res.data.teams);
            setPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
        } catch {
            toast.error('Не удалось загрузить команды');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.all([adminAPI.getTeams({ page: 1, limit: 20 }), adminAPI.getUsers()])
            .then(([teamsRes, usersRes]) => {
                setTeams(teamsRes.data.teams);
                setPagination({ page: teamsRes.data.page, pages: teamsRes.data.pages, total: teamsRes.data.total });
                setAllUsers(usersRes.data.users);
            })
            .catch(() => toast.error('Не удалось загрузить данные'))
            .finally(() => setLoading(false));
    }, []);

    const openMembers = async (team: AdminTeam) => {
        setMembersTeam(team);
        setAddUserId('');
        setAddRole('member');
        setMembersLoading(true);
        try {
            const res = await adminAPI.getTeamMembers(team.id);
            setMembers(res.data.members);
        } catch {
            toast.error('Не удалось загрузить участников');
        } finally {
            setMembersLoading(false);
        }
    };

    const handleChangeRole = async (userId: number, role: string) => {
        if (!membersTeam) return;
        setChangingRoleId(userId);
        try {
            await adminAPI.updateTeamMember(membersTeam.id, userId, role);
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: role as AdminTeamMember['role'] } : m));
            toast.success('Роль обновлена');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка');
        } finally {
            setChangingRoleId(null);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!membersTeam) return;
        setRemovingId(userId);
        try {
            await adminAPI.removeTeamMember(membersTeam.id, userId);
            setMembers(prev => prev.filter(m => m.user_id !== userId));
            setTeams(prev => prev.map(t => t.id === membersTeam.id ? { ...t, member_count: Number(t.member_count) - 1 } : t));
            toast.success('Участник удалён');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка');
        } finally {
            setRemovingId(null);
        }
    };

    const handleAddMember = async () => {
        if (!membersTeam || !addUserId) return;
        setAddingMember(true);
        try {
            await adminAPI.addTeamMember(membersTeam.id, { user_id: addUserId, role: addRole });
            const res = await adminAPI.getTeamMembers(membersTeam.id);
            setMembers(res.data.members);
            setTeams(prev => prev.map(t => t.id === membersTeam.id ? { ...t, member_count: res.data.members.length } : t));
            setAddUserId('');
            toast.success('Участник добавлен');
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка добавления');
        } finally {
            setAddingMember(false);
        }
    };

    const openEdit = (team: AdminTeam) => {
        setEditTeam(team);
        setEditForm({ name: team.name, description: team.description ?? '' });
    };

    const saveEdit = async () => {
        if (!editTeam) return;
        setSaving(true);
        try {
            await adminAPI.updateTeam(editTeam.id, { name: editForm.name, description: editForm.description || null });
            toast.success('Команда обновлена');
            setEditTeam(null);
            loadTeams(pagination.page, search);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка обновления');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.team) return;
        try {
            await adminAPI.deleteTeam(deleteConfirm.team.id);
            toast.success('Команда удалена');
            setDeleteConfirm({ open: false, team: null });
            loadTeams(pagination.page, search);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast.error(msg || 'Ошибка удаления');
        }
    };

    const availableUsers = useMemo(
        () => { const ids = new Set(members.map(m => String(m.user_id))); return allUsers.filter(u => !ids.has(String(u.id))); },
        [allUsers, members]
    );

    const ROLE_LABEL: Record<string, string> = { owner: 'Владелец', admin: 'Администратор', member: 'Участник' };
    const err = (e: unknown) => (e as { response?: { data?: { error?: string } } })?.response?.data?.error;

    if (loading && teams.length === 0) return <div className="flex items-center justify-center h-48 text-muted-foreground">Загрузка...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Команды</h2>
                    <Badge variant="secondary">{pagination.total} всего</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Поиск по названию..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadTeams(1, search)}
                        className="h-8 text-sm w-56"
                    />
                    <Button size="sm" variant="outline" onClick={() => loadTeams(1, search)}>Найти</Button>
                </div>
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">ID</TableHead>
                            <TableHead>Название</TableHead>
                            <TableHead>Описание</TableHead>
                            <TableHead>Владелец</TableHead>
                            <TableHead className="text-center">Участников</TableHead>
                            <TableHead>Создана</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teams.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                                    {search ? 'Ничего не найдено' : 'Команд нет'}
                                </TableCell>
                            </TableRow>
                        ) : teams.map(team => (
                            <TableRow key={team.id}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{team.id}</TableCell>
                                <TableCell className="font-medium">{team.name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                    {team.description ?? <span className="opacity-40">—</span>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        <Avatar className="w-5 h-5 shrink-0">
                                            <AvatarImage src={team.owner_avatar ?? undefined} />
                                            <AvatarFallback className="text-[10px]">
                                                {(team.owner_name ?? '?').slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{team.owner_name ?? `#${team.owner_id}`}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="secondary" className="text-xs">{Number(team.member_count)}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {new Date(team.created_at).toLocaleDateString('ru-RU')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => openMembers(team)} title="Участники">
                                            <IconUsers />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openEdit(team)} title="Редактировать">
                                            <IconEdit />
                                        </Button>
                                        <Button
                                            variant="ghost" size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleteConfirm({ open: true, team })}
                                            title="Удалить"
                                        >
                                            <IconTrash />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {pagination.pages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Страница {pagination.page} из {pagination.pages} ({pagination.total} команд)</span>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => loadTeams(pagination.page - 1, search)}>
                            <IconChevronLeft />
                        </Button>
                        <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => loadTeams(pagination.page + 1, search)}>
                            <IconChevronRight />
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Диалог участников ── */}
            <Dialog open={!!membersTeam} onOpenChange={o => !o && setMembersTeam(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Участники — «{membersTeam?.name}»</DialogTitle>
                    </DialogHeader>

                    {membersLoading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">Загрузка...</div>
                    ) : (
                        <div className="space-y-2 py-1">
                            {members.length === 0 && (
                                <p className="text-center text-muted-foreground text-sm py-4">Нет участников</p>
                            )}
                            {members.map(m => (
                                <div key={m.user_id} className="flex items-center justify-between p-2.5 rounded-md border gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Avatar className="w-8 h-8 shrink-0">
                                            <AvatarImage src={m.avatar ?? undefined} />
                                            <AvatarFallback className="text-xs">{m.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{m.username}</p>
                                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {m.role === 'owner' ? (
                                            <Badge className="text-xs">Владелец</Badge>
                                        ) : (
                                            <select
                                                value={m.role}
                                                disabled={changingRoleId === m.user_id}
                                                onChange={e => handleChangeRole(m.user_id, e.target.value)}
                                                className="text-xs border rounded px-1.5 py-1 bg-background"
                                            >
                                                <option value="admin">Администратор</option>
                                                <option value="member">Участник</option>
                                            </select>
                                        )}
                                        {m.role !== 'owner' && (
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                disabled={removingId === m.user_id}
                                                onClick={() => handleRemoveMember(m.user_id)}
                                                title="Удалить из команды"
                                            >
                                                <IconTrash />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Добавить участника */}
                    <div className="border-t pt-3 space-y-2">
                        <p className="text-sm font-medium">Добавить участника</p>
                        <div className="flex gap-2">
                            <select
                                value={addUserId}
                                onChange={e => setAddUserId(e.target.value)}
                                className="flex-1 text-sm border rounded-md px-2 py-1.5 bg-background"
                            >
                                <option value="">Выберите пользователя...</option>
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                                ))}
                            </select>
                            <select
                                value={addRole}
                                onChange={e => setAddRole(e.target.value as 'admin' | 'member')}
                                className="text-sm border rounded-md px-2 py-1.5 bg-background"
                            >
                                <option value="member">Участник</option>
                                <option value="admin">Администратор</option>
                            </select>
                            <Button size="sm" onClick={handleAddMember} disabled={!addUserId || addingMember} className="gap-1 shrink-0">
                                <IconPlus />{addingMember ? '...' : 'Добавить'}
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMembersTeam(null)}>Закрыть</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Диалог редактирования ── */}
            <Dialog open={!!editTeam} onOpenChange={o => !o && setEditTeam(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать команду #{editTeam?.id}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Название</label>
                            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Описание</label>
                            <Textarea
                                value={editForm.description}
                                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Описание команды..."
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTeam(null)}>Отмена</Button>
                        <Button onClick={saveEdit} disabled={saving || !editForm.name.trim()}>
                            {saving ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Подтверждение удаления ── */}
            <AlertDialog open={deleteConfirm.open} onOpenChange={o => !o && setDeleteConfirm(p => ({ ...p, open: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить команду «{deleteConfirm.team?.name}»?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Команда, все её участники и связанные данные будут удалены безвозвратно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Главная страница Admin ───────────────────────────────────────────────────
export default function AdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [section, setSection] = useState<Section>('stats');
    const [refreshKey, setRefreshKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        setRefreshKey(k => k + 1);
        setTimeout(() => setRefreshing(false), 700);
    };

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    if (!user || user.role !== 'admin') return null;

    return (
        <div className="min-h-screen bg-background">
            {/* Шапка панели */}
            <div className="border-b bg-muted/30">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Панель администратора
                        </span>
                        <Badge variant="outline" className="text-xs">{user.username}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} title="Обновить данные">
                            <IconRefresh spinning={refreshing} />
                            <span className="ml-1.5">Обновить</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                            ← На сайт
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Навигация */}
                <div className="flex gap-2 mb-6 border-b pb-4">
                    {([
                        { id: 'stats',  label: 'Статистика',    icon: <IconChart />  },
                        { id: 'users',  label: 'Пользователи',  icon: <IconUsers />  },
                        { id: 'teams',  label: 'Команды',       icon: <IconShield /> },
                        { id: 'tables', label: 'Таблицы БД',    icon: <IconTable />  },
                    ] as { id: Section; label: string; icon: React.ReactNode }[]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSection(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                section === tab.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Контент */}
                {section === 'stats'  && <StatsSection  key={refreshKey} />}
                {section === 'users'  && <UsersSection  key={refreshKey} />}
                {section === 'teams'  && <TeamsSection  key={refreshKey} />}
                {section === 'tables' && <TablesSection key={refreshKey} />}
            </div>
        </div>
    );
}