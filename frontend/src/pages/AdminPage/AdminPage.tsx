// pages/AdminPage/AdminPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { adminAPI, type AdminUser, type TableInfo, type ColumnInfo } from '@/api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

type Section = 'users' | 'tables';

// ─── Компонент: управление пользователями ────────────────────────────────────
function UsersSection() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', is_activated: false });
    const [pwdDialog, setPwdDialog] = useState<{ open: boolean; userId: string; username: string }>({
        open: false, userId: '', username: ''
    });
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
        setEditForm({ username: u.username, email: u.email, is_activated: u.is_activated });
    };

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
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Пользователи</h2>
                <Badge variant="secondary">{users.length} всего</Badge>
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
                        {users.map((u) => (
                            <TableRow key={u.id} className={u.id === currentUser?.id ? 'bg-muted/30' : ''}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{u.id}</TableCell>
                                <TableCell className="font-medium">
                                    {u.username}
                                    {u.id === currentUser?.id && (
                                        <span className="ml-2 text-xs text-muted-foreground">(вы)</span>
                                    )}
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

// ─── Главная страница Admin ───────────────────────────────────────────────────
export default function AdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [section, setSection] = useState<Section>('users');

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
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        ← На сайт
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Навигация */}
                <div className="flex gap-2 mb-6 border-b pb-4">
                    <button
                        onClick={() => setSection('users')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            section === 'users'
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <IconUsers /> Пользователи
                    </button>
                    <button
                        onClick={() => setSection('tables')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            section === 'tables'
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <IconTable /> Таблицы БД
                    </button>
                </div>

                {/* Контент */}
                {section === 'users' && <UsersSection />}
                {section === 'tables' && <TablesSection />}
            </div>
        </div>
    );
}