import { useState, useEffect, useRef } from "react"
import { Button } from "../ui/button"
import { Sigma, User, Sun, Moon, Menu, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
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

const NAV_LINKS = [
    { label: 'Принтеры', path: '/printers' },
    { label: 'Материалы', path: '/materials' },
    { label: 'Заказы', path: '/orders' },
    { label: 'Статистика', path: '/dashboard' },
    { label: 'Команды', path: '/teams' },
];

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const displayName = user?.username ?? user?.email ?? '—';
    const displayEmail = user?.email ?? '—';

    // Закрываем меню при смене маршрута
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    // Закрываем меню при клике вне
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    return (
        <header className="relative flex justify-between items-center p-2 rounded-xl bg-card border" ref={menuRef}>
            <div className="flex">
                {/* ── Лого ────────────────────────────────────────────────── */}
                <Button
                    className="hover:bg-accent bg-transparent text-foreground"
                    onClick={() => navigate('/')}
                >
                    <Sigma />PrintCalc
                </Button>

                {/* ── Десктопное меню ──────────────────────────────────────── */}
                {user && (
                    <nav className="hidden md:flex">
                        {NAV_LINKS.map(({ label, path }) => (
                            <Button
                                key={path}
                                className="hover:bg-accent bg-transparent text-foreground"
                                onClick={() => navigate(path)}
                            >
                                {label}
                            </Button>
                        ))}
                    </nav>
                )}
            </div>

            {/* ── Правая панель ────────────────────────────────────────── */}
            <div className="flex items-center gap-1">
                {user && <NotificationBell />}

                <Button
                    className="hover:bg-accent bg-transparent text-foreground"
                    size="icon"
                    onClick={toggleTheme}
                >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                {!user ? (
                    <Button
                        className="hover:bg-accent bg-transparent text-foreground"
                        onClick={() => navigate('/login')}
                    >
                        <User />
                    </Button>
                ) : (
                    <>
                        {/* Аватар — только на десктопе */}
                        <Button
                            className="hidden md:flex hover:bg-accent bg-transparent text-foreground pl-1"
                            onClick={() => navigate('/profile')}
                        >
                            <div className="flex items-center">
                                <Avatar className="w-8 h-8 border border-primary/10 mr-3">
                                    <AvatarImage src={(user as any)?.avatar} alt={displayName} />
                                    <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5">
                                        {getInitials(displayName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid text-left text-sm leading-tight max-w-35">
                                    <span className="truncate font-medium">{displayName}</span>
                                    <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                                </div>
                            </div>
                        </Button>

                        {/* Бургер — только на мобиле */}
                        <Button
                            className="md:hidden hover:bg-accent bg-transparent text-foreground"
                            size="icon"
                            onClick={() => setMenuOpen(prev => !prev)}
                            aria-label="Меню"
                        >
                            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </>
                )}
            </div>

            {/* ── Мобильное выпадающее меню ───────────────────────────── */}
            {menuOpen && user && (
                <div className="md:hidden absolute top-full left-0 right-0 mt-2 z-50 bg-card border rounded-xl shadow-lg overflow-hidden">
                    {/* Профиль */}
                    <button
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                        onClick={() => navigate('/profile')}
                    >
                        <Avatar className="w-8 h-8 border border-primary/10 shrink-0">
                            <AvatarImage src={(user as any)?.avatar} alt={displayName} />
                            <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5 text-xs">
                                {getInitials(displayName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid text-left text-sm leading-tight min-w-0">
                            <span className="truncate font-medium">{displayName}</span>
                            <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
                        </div>
                    </button>

                    <div className="border-t" />

                    {/* Навигация */}
                    {NAV_LINKS.map(({ label, path }) => (
                        <button
                            key={path}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-accent transition-colors"
                            onClick={() => navigate(path)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </header>
    )
}