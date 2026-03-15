import { Button } from "../ui/button"
import { Sigma, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from "../../features/auth/context/AuthContext"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

export default function Header() {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();

    return (
        <header className="flex justify-between p-2 rounded-xl bg-neutral-50">
            <div className="flex">
                <Button
                    className="hover:bg-gray-300 bg-neutral-50"
                    onClick={() => navigate('/')}  // ← на главную
                >
                    <Sigma />PrintCalc
                </Button>

                {user !== null ? (
                    <div>
                        <Button
                            className="hover:bg-gray-300 bg-neutral-50"
                            onClick={() => navigate('/printers')}
                        >
                            Принтеры
                        </Button>
                        <Button
                            className="hover:bg-gray-300 bg-neutral-50"
                            onClick={() => navigate('/materials')}
                        >
                            Материалы
                        </Button>
                        <Button
                            className="hover:bg-gray-300 bg-neutral-50"
                            onClick={() => navigate('/orders')}
                        >
                            Заказы
                        </Button>
                        <Button
                            className="hover:bg-gray-300 bg-neutral-50"
                            onClick={() => navigate('/dashboard')}
                        >
                            Статистика
                        </Button>
                    </div>
                ) :
                    (
                        <div></div>
                    )}
            </div>
            {user === null ? (
                <div className="flex">
                    <Button
                        className="hover:bg-gray-300 bg-neutral-50"
                        onClick={() => navigate('/login')}  // ← на страницу авторизации
                    >
                        <User />
                    </Button>
                </div>
            ) : (
                <div className="flex">
                    <Button
                        className="hover:bg-gray-300 bg-neutral-50"
                        onClick={() => navigate('/profile')}  // ← на страницу авторизации
                    >
                        <div className='flex'>
                            <Avatar className="h-8 w-8 rounded-lg grayscale mr-2">
                                <AvatarImage alt="user" />
                                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">user</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    mail@mail.com
                                </span>
                            </div>
                        </div>
                    </Button>
                </div>
            )}

        </header>
    )
}