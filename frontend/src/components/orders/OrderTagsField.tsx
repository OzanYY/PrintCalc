// frontend/src/components/orders/OrderTagsField.tsx
import { useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tagsAPI, type Tag } from '@/api/tags';
import { toast } from 'sonner';

interface Props {
    orderId: number;
    initialTags?: Tag[];
    onChange?: (tags: Tag[]) => void;
}

// Палитра предустановленных цветов
const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#64748b',
];

export function OrderTagsField({ orderId, initialTags = [], onChange }: Props) {
    const [allTags, setAllTags]     = useState<Tag[]>([]);
    const [orderTags, setOrderTags] = useState<Tag[]>(initialTags);
    const [open, setOpen]           = useState(false);
    const [creating, setCreating]   = useState(false);
    const [newName, setNewName]     = useState('');
    const [newColor, setNewColor]   = useState(PRESET_COLORS[0]);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        tagsAPI.getAll().then(r => setAllTags(r.data.data));
    }, [open]);

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

    const isSelected = (tag: Tag) => orderTags.some(t => t.id === tag.id);

    const toggleTag = async (tag: Tag) => {
        try {
            let updated: Tag[];
            if (isSelected(tag)) {
                const r = await tagsAPI.removeOrderTag(orderId, tag.id);
                updated = r.data.data;
            } else {
                const r = await tagsAPI.addOrderTag(orderId, tag.id);
                updated = r.data.data;
            }
            setOrderTags(updated);
            onChange?.(updated);
        } catch {
            toast.error('Ошибка обновления тегов');
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const r = await tagsAPI.create({ name: newName.trim(), color: newColor });
            const tag = r.data.data;
            setAllTags(p => [...p, tag]);
            // Автоматически добавляем к заказу
            await toggleTag(tag);
            setNewName('');
            setCreating(false);
        } catch {
            toast.error('Ошибка создания тега');
        }
    };

    const removeFromOrder = async (tag: Tag, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const r = await tagsAPI.removeOrderTag(orderId, tag.id);
            setOrderTags(r.data.data);
            onChange?.(r.data.data);
        } catch {
            toast.error('Ошибка');
        }
    };

    return (
        <div ref={ref} className="relative">
            <div className="flex flex-wrap gap-1 min-h-[28px]">
                {orderTags.map(tag => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                    >
                        {tag.name}
                        <button onClick={e => removeFromOrder(tag, e)} className="hover:opacity-70 ml-0.5">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => setOpen(v => !v)}
                >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {orderTags.length === 0 ? 'Теги' : <Plus className="h-3 w-3" />}
                </Button>
            </div>

            {open && (
                <div className="absolute z-50 mt-1 w-64 rounded-lg border bg-popover shadow-md">
                    {!creating ? (
                        <>
                            <div className="max-h-48 overflow-y-auto p-1">
                                {allTags.length === 0 && (
                                    <div className="py-2 text-center text-sm text-muted-foreground">Нет тегов</div>
                                )}
                                {allTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm"
                                    >
                                        <span
                                            className="h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="flex-1 text-left">{tag.name}</span>
                                        {isSelected(tag) && <Check className="h-3 w-3 text-primary" />}
                                    </button>
                                ))}
                            </div>
                            <div className="p-2 border-t">
                                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setCreating(true)}>
                                    <Plus className="h-4 w-4 mr-2" />Создать тег
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 space-y-3">
                            <div className="font-medium text-sm">Новый тег</div>
                            <Input
                                placeholder="Название"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                autoFocus
                            />
                            <div>
                                <div className="text-xs text-muted-foreground mb-1.5">Цвет</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewColor(c)}
                                            className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                                            style={{
                                                backgroundColor: c,
                                                outline: newColor === c ? '2px solid currentColor' : 'none',
                                                outlineOffset: '2px',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>Создать</Button>
                                <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Отмена</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
