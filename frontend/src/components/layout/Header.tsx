import { Button } from "../ui/button"
import { Sigma, User, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { NotificationBell } from "@/components/NotificationBell"

const getInitials = (name: string) =>
    name.split(/[\s_]/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

export default function Header() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // ── Данные пользователя ───────────────────────────────────────────────────

    const displayName = user?.username ?? user?.email ?? '—';
    const displayEmail = user?.email ?? '—';

    return (
        <header className="flex justify-between p-2 rounded-xl bg-card border">
            {user ?
                <div className="flex">
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground"
                        onClick={() => navigate('/')}  // ← на главную
                    >
                        <Sigma />PrintCalc
                    </Button>
                    <div>
                        <Button
                            className="hover:bg-accent bg-transparent text-foreground"
                            onClick={() => navigate('/printers')}
                        >
                            Принтеры
                        </Button>
                        <Button
                            className="hover:bg-accent bg-transparent text-foreground"
                            onClick={() => navigate('/materials')}
                        >
                            Материалы
                        </Button>
                        <Button
                            className="hover:bg-accent bg-transparent text-foreground"
                            onClick={() => navigate('/orders')}
                        >
                            Заказы
                        </Button>
                        <Button
                            className="hover:bg-accent bg-transparent text-foreground"
                            onClick={() => navigate('/dashboard')}
                        >
                            Статистика
                        </Button>
                        <Button
                            className="hover:bg-accent bg-transparent text-foreground"
                            onClick={() => navigate('/teams')}
                        >
                            Команды
                        </Button>
                    </div>
                </div>
                :
                <div className="flex">
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground"
                        onClick={() => navigate('/')}  // ← на главную
                    >
                        <Sigma />PrintCalc
                    </Button>
                </div>
            }
            {!user ?
                <div className="flex items-center">
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground"
                        size="icon"
                        onClick={toggleTheme}
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground"
                        onClick={() => navigate('/login')}
                    >
                        <User />
                    </Button>
                </div>
                :
                <div className="flex items-center">
                    <NotificationBell />
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground"
                        size="icon"
                        onClick={toggleTheme}
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground pl-1"
                        onClick={() => navigate('/profile')}
                    >
                        <div className='flex'>
                            <Avatar className="w-8 h-8 border border-primary/10 mr-3">
                                <AvatarImage src={(user as any)?.avatar} alt={displayName} />
                                <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5">
                                    {getInitials(displayName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid text-left text-sm leading-tight max-w-[140px]">
                                <span className="truncate font-medium">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {displayEmail}
                                </span>
                            </div>
                        </div>
                    </Button>
                </div>
            }
        </header>
    )
}