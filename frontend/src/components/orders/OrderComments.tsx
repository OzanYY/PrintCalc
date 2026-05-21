// frontend/src/components/orders/OrderComments.tsx
import { useState, useEffect } from 'react';
import { MessageSquare, Pencil, Trash2, Send, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { orderCommentsAPI, type OrderComment } from '@/api/orderComments';
import { toast } from 'sonner';

interface Props {
    orderId: number;
    currentUserId: number;
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} ч. назад`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function OrderComments({ orderId, currentUserId }: Props) {
    const [comments, setComments]     = useState<OrderComment[]>([]);
    const [loading, setLoading]       = useState(true);
    const [newBody, setNewBody]       = useState('');
    const [sending, setSending]       = useState(false);
    const [editId, setEditId]         = useState<number | null>(null);
    const [editBody, setEditBody]     = useState('');

    useEffect(() => {
        orderCommentsAPI.getAll(orderId)
            .then(r => setComments(r.data.data))
            .finally(() => setLoading(false));
    }, [orderId]);

    const handleSend = async () => {
        if (!newBody.trim()) return;
        setSending(true);
        try {
            const r = await orderCommentsAPI.create(orderId, newBody);
            setComments(p => [...p, r.data.data]);
            setNewBody('');
        } catch {
            toast.error('Ошибка отправки комментария');
        } finally {
            setSending(false);
        }
    };

    const handleEdit = async (id: number) => {
        if (!editBody.trim()) return;
        try {
            const r = await orderCommentsAPI.update(orderId, id, editBody);
            setComments(p => p.map(c => c.id === id ? r.data.data : c));
            setEditId(null);
        } catch {
            toast.error('Ошибка редактирования');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await orderCommentsAPI.delete(orderId, id);
            setComments(p => p.filter(c => c.id !== id));
        } catch {
            toast.error('Ошибка удаления');
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Комментарии
                {comments.length > 0 && (
                    <span className="text-xs text-muted-foreground">({comments.length})</span>
                )}
            </div>

            {/* История */}
            {loading ? (
                <div className="text-sm text-muted-foreground">Загрузка...</div>
            ) : comments.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">Нет комментариев</div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {comments.map(c => (
                        <div key={c.id} className="group rounded-lg border bg-muted/20 px-3 py-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-medium">{c.author_name}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                                    {c.updated_at !== c.created_at && (
                                        <span className="text-xs text-muted-foreground italic">(ред.)</span>
                                    )}
                                    {c.user_id === currentUserId && editId !== c.id && (
                                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-5 w-5"
                                                onClick={() => { setEditId(c.id); setEditBody(c.body); }}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-5 w-5 text-destructive"
                                                onClick={() => handleDelete(c.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {editId === c.id ? (
                                <div className="space-y-1.5">
                                    <Textarea
                                        value={editBody}
                                        onChange={e => setEditBody(e.target.value)}
                                        className="text-sm min-h-[60px]"
                                        autoFocus
                                    />
                                    <div className="flex gap-1">
                                        <Button size="sm" className="h-6 text-xs" onClick={() => handleEdit(c.id)}>
                                            <Check className="h-3 w-3 mr-1" />Сохранить
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditId(null)}>
                                            <X className="h-3 w-3 mr-1" />Отмена
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Separator />

            {/* Новый комментарий */}
            <div className="flex gap-2">
                <Textarea
                    placeholder="Добавить комментарий..."
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    className="text-sm min-h-[60px] resize-none flex-1"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
                    }}
                />
                <Button
                    size="icon"
                    disabled={!newBody.trim() || sending}
                    onClick={handleSend}
                    className="self-end"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
            <div className="text-xs text-muted-foreground">Ctrl+Enter для отправки</div>
        </div>
    );
}
