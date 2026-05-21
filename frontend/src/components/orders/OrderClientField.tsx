// frontend/src/components/orders/OrderClientField.tsx
import { useState, useEffect, useRef } from 'react';
import { User, Phone, Mail, Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clientsAPI, type Client, type CreateClientData } from '@/api/clients';
import { toast } from 'sonner';

interface Props {
    clientId: number | null;
    clientName?: string | null;
    clientPhone?: string | null;
    clientEmail?: string | null;
    onClientChange: (clientId: number | null) => void;
}

export function OrderClientField({ clientId, clientName, clientPhone, clientEmail, onClientChange }: Props) {
    const [clients, setClients]     = useState<Client[]>([]);
    const [search, setSearch]       = useState('');
    const [open, setOpen]           = useState(false);
    const [creating, setCreating]   = useState(false);
    const [newClient, setNewClient] = useState<CreateClientData>({ name: '', phone: '', email: '' });
    const ref = useRef<HTMLDivElement>(null);

    // Загружаем список при открытии
    useEffect(() => {
        if (!open) return;
        clientsAPI.getAll().then(r => setClients(r.data.data));
    }, [open]);

    // Поиск с дебаунсом
    useEffect(() => {
        if (!open || !search) return;
        const t = setTimeout(() =>
            clientsAPI.search(search).then(r => setClients(r.data.data)), 300);
        return () => clearTimeout(t);
    }, [search, open]);

    // Закрытие по клику вне
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setCreating(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleCreate = async () => {
        if (!newClient.name.trim()) return;
        try {
            const r = await clientsAPI.create(newClient);
            onClientChange(r.data.data.id);
            setOpen(false);
            setCreating(false);
            setNewClient({ name: '', phone: '', email: '' });
            toast.success('Клиент создан');
        } catch {
            toast.error('Ошибка создания клиента');
        }
    };

    if (clientId) {
        return (
            <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{clientName}</div>
                    {clientPhone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3" />{clientPhone}
                        </div>
                    )}
                    {clientEmail && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Mail className="h-3 w-3" />{clientEmail}
                        </div>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onClientChange(null)}>
                    <X className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setOpen(v => !v)}
            >
                <User className="h-4 w-4 mr-2" />
                Выбрать клиента
            </Button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-md">
                    {!creating ? (
                        <>
                            <div className="p-2 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Поиск..."
                                        className="pl-8 h-8"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {clients.length === 0 && (
                                    <div className="py-3 text-center text-sm text-muted-foreground">Клиенты не найдены</div>
                                )}
                                {clients.map(c => (
                                    <button
                                        key={c.id}
                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                        onClick={() => { onClientChange(c.id); setOpen(false); }}
                                    >
                                        <div className="font-medium">{c.name}</div>
                                        {(c.phone || c.email) && (
                                            <div className="text-xs text-muted-foreground">{c.phone || c.email}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="p-2 border-t">
                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setCreating(true)}>
                                    <Plus className="h-4 w-4 mr-2" />Новый клиент
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 space-y-2">
                            <div className="font-medium text-sm mb-2">Новый клиент</div>
                            <Input placeholder="Имя *" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} />
                            <Input placeholder="Телефон" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} />
                            <Input placeholder="Email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} />
                            <div className="flex gap-2 pt-1">
                                <Button size="sm" onClick={handleCreate} disabled={!newClient.name.trim()}>Создать</Button>
                                <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Отмена</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
