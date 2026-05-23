import {
    createContext, useContext, useState, useEffect,
    useCallback, useRef, type ReactNode,
} from 'react';
import { notificationsAPI, type AppNotification } from '@/api/notifications';
import { invitationsAPI } from '@/api/teams';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const SSE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api') + '/notifications/stream';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    markRead: (id: number) => Promise<void>;
    markAllRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
    acceptInvitation: (invitationId: number, notificationId: number) => Promise<void>;
    declineInvitation: (invitationId: number, notificationId: number) => Promise<void>;
    refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const esRef = useRef<EventSource | null>(null);
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryDelay = useRef(1000);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const fetchAll = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const res = await notificationsAPI.getAll({ limit: 50 });
            setNotifications(res.data.data);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // ── SSE подключение ───────────────────────────────────────────────────────
    const connectSSE = useCallback(() => {
        if (!user) return;
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }

        const es = new EventSource(SSE_URL, { withCredentials: true });
        esRef.current = es;

        es.onopen = () => {
            retryDelay.current = 1000;
        };

        es.onmessage = (event) => {
            try {
                const notification: AppNotification = JSON.parse(event.data);
                setNotifications(prev => [notification, ...prev]);
                showToast(notification);
            } catch {
                // ignore malformed events
            }
        };

        es.onerror = () => {
            es.close();
            esRef.current = null;
            // Переподключение с экспоненциальным backoff (макс. 30 сек)
            const delay = Math.min(retryDelay.current, 30_000);
            retryDelay.current = delay * 2;
            retryRef.current = setTimeout(connectSSE, delay);
        };
    }, [user]);

    useEffect(() => {
        if (!user) {
            esRef.current?.close();
            esRef.current = null;
            if (retryRef.current) clearTimeout(retryRef.current);
            setNotifications([]);
            return;
        }
        fetchAll();
        connectSSE();
        return () => {
            esRef.current?.close();
            esRef.current = null;
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, [user?.id]);

    // ── Действия ─────────────────────────────────────────────────────────────

    const markRead = useCallback(async (id: number) => {
        await notificationsAPI.markRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
    }, []);

    const markAllRead = useCallback(async () => {
        await notificationsAPI.markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }, []);

    const deleteNotification = useCallback(async (id: number) => {
        await notificationsAPI.deleteOne(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const acceptInvitation = useCallback(async (invitationId: number, notificationId: number) => {
        try {
            const res = await invitationsAPI.accept(invitationId);
            toast.success(res.data.message);
            await markRead(notificationId);
            await fetchAll();
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при принятии приглашения');
        }
    }, [markRead, fetchAll]);

    const declineInvitation = useCallback(async (invitationId: number, notificationId: number) => {
        try {
            await invitationsAPI.decline(invitationId);
            toast.success('Приглашение отклонено');
            await markRead(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Ошибка при отклонении приглашения');
        }
    }, [markRead]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            markRead,
            markAllRead,
            deleteNotification,
            acceptInvitation,
            declineInvitation,
            refetch: fetchAll,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}

// ── Toast при получении нового уведомления ────────────────────────────────────

function showToast(n: AppNotification) {
    const d = n.data;
    switch (n.type) {
        case 'team_invitation':
            toast.info(`Приглашение в команду «${d.team_name}»`, {
                description: `от ${d.inviter_name}`,
                duration: 6000,
            });
            break;
        case 'invitation_accepted':
            toast.success(`${d.user_name} вступил в команду «${d.team_name}»`);
            break;
        case 'invitation_declined':
            toast.info(`${d.user_name} отклонил приглашение в «${d.team_name}»`);
            break;
        case 'member_joined':
            toast.success(`${d.user_name} присоединился к команде «${d.team_name}»`);
            break;
        case 'member_left':
            toast.info(`${d.user_name} покинул команду «${d.team_name}»`);
            break;
        case 'member_removed':
            toast.warning(`Вас удалили из команды «${d.team_name}»`);
            break;
        case 'role_changed':
            toast.info(`Ваша роль в команде «${d.team_name}» изменена на ${d.new_role}`);
            break;
    }
}
