import { Bell, BellRing, Check, CheckCheck, Trash2, Users, UserCheck, UserX, UserMinus, LogOut, Crown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/context/NotificationContext';
import type { AppNotification, NotificationType } from '@/api/notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// ─── Иконка и текст по типу уведомления ─────────────────────────────────────

function notificationMeta(type: NotificationType) {
    switch (type) {
        case 'team_invitation':   return { Icon: Users,     color: 'text-blue-500' };
        case 'invitation_accepted': return { Icon: UserCheck, color: 'text-green-500' };
        case 'invitation_declined': return { Icon: UserX,    color: 'text-red-500' };
        case 'member_joined':     return { Icon: UserCheck,  color: 'text-green-500' };
        case 'member_left':       return { Icon: LogOut,     color: 'text-orange-500' };
        case 'member_removed':    return { Icon: UserMinus,  color: 'text-red-500' };
        case 'role_changed':      return { Icon: Crown,      color: 'text-violet-500' };
        default:                  return { Icon: Bell,       color: 'text-muted-foreground' };
    }
}

function notificationText(n: AppNotification): { title: string; description?: string } {
    const d = n.data;
    switch (n.type) {
        case 'team_invitation':
            return {
                title: `Приглашение в команду`,
                description: `«${d.team_name}» от ${d.inviter_name}${d.message ? ` · ${d.message}` : ''}`,
            };
        case 'invitation_accepted':
            return { title: `${d.user_name} вступил в команду`, description: `«${d.team_name}»` };
        case 'invitation_declined':
            return { title: `${d.user_name} отклонил приглашение`, description: `«${d.team_name}»` };
        case 'member_joined':
            return { title: `${d.user_name} присоединился`, description: `к команде «${d.team_name}»` };
        case 'member_left':
            return { title: `${d.user_name} покинул команду`, description: `«${d.team_name}»` };
        case 'member_removed':
            return { title: `Вас удалили из команды`, description: `«${d.team_name}»` };
        case 'role_changed':
            return { title: `Ваша роль изменена`, description: `на ${d.new_role} в «${d.team_name}»` };
        default:
            return { title: 'Уведомление' };
    }
}

// ─── Карточка одного уведомления ─────────────────────────────────────────────

function NotificationItem({ notification }: { notification: AppNotification }) {
    const { markRead, deleteNotification, acceptInvitation, declineInvitation } = useNotifications();
    const { Icon, color } = notificationMeta(notification.type);
    const { title, description } = notificationText(notification);
    const isInvitation = notification.type === 'team_invitation';

    return (
        <div
            className={cn(
                'flex gap-3 p-3 rounded-lg transition-colors',
                notification.is_read ? 'opacity-60' : 'bg-muted/40'
            )}
        >
            <div className={cn('mt-0.5 shrink-0', color)}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{title}</p>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ru })}
                </p>
                {isInvitation && !notification.is_read && (
                    <div className="flex gap-2 mt-2">
                        <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => acceptInvitation(notification.data.invitation_id, notification.id)}
                        >
                            <UserCheck className="h-3 w-3 mr-1" />Принять
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => declineInvitation(notification.data.invitation_id, notification.id)}
                        >
                            <X className="h-3 w-3 mr-1" />Отклонить
                        </Button>
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
                {!notification.is_read && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Отметить прочитанным"
                        onClick={() => markRead(notification.id)}
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    title="Удалить"
                    onClick={() => deleteNotification(notification.id)}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

// ─── Основной компонент ───────────────────────────────────────────────────────

export function NotificationBell() {
    const { notifications, unreadCount, markAllRead, isLoading } = useNotifications();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative hover:bg-accent"
                >
                    {unreadCount > 0
                        ? <BellRing className="h-5 w-5 text-primary" />
                        : <Bell className="h-5 w-5" />
                    }
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-96 p-0" align="end" onCloseAutoFocus={e => e.preventDefault()}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm">Уведомления</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={e => { e.preventDefault(); markAllRead(); }}
                        >
                            <CheckCheck className="h-3 w-3" />
                            Прочитать все
                        </Button>
                    )}
                </div>

                <ScrollArea className="max-h-[420px]">
                    {isLoading ? (
                        <p className="text-center text-sm text-muted-foreground py-8">Загрузка...</p>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <Bell className="h-8 w-8 opacity-30" />
                            <p className="text-sm">Уведомлений нет</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {notifications.map((n, i) => (
                                <div key={n.id}>
                                    <NotificationItem notification={n} />
                                    {i < notifications.length - 1 && <Separator className="my-1" />}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
