import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Printer,
    Package,
    CheckCircle,
    DollarSign,
    Users,
    Settings,
    Mail,
    Calendar,
    Edit,
    Camera,
    MoreVertical,
    UserPlus,
    LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'
import { authAPI } from '@/api/auth';
import { useAuth } from "@/context/AuthContext"

// Интерфейсы для типизации
interface UserData {
    avatar: string;
    username: string;
    email: string;
    registrationDate: string;
}

interface TeamMember {
    id: number;
    name: string;
    role: string;
    avatar: string;
}

interface StatCard {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description: string;
    trend?: number;
}

export default function UserPage() {
    // Состояния для данных пользователя
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [userData, setUserData] = useState<UserData>({
        avatar: 'https://github.com/shadcn.png',
        username: 'john_doe',
        email: 'john.doe@example.com',
        registrationDate: '2023-01-15',
    });

    // Состояния для редактирования
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        username: userData.username,
        email: userData.email,
    });

    // Состояние для статистики
    const [statistics] = useState({
        printers: 24,
        material: 156,
        completedOrders: 89,
        totalProfit: 15240,
    });

    // Данные команды
    const [teamMembers] = useState<TeamMember[]>([
        { id: 1, name: 'Анна Смирнова', role: 'Администратор', avatar: 'https://i.pravatar.cc/150?img=1' },
        { id: 2, name: 'Петр Иванов', role: 'Оператор', avatar: 'https://i.pravatar.cc/150?img=2' },
        { id: 3, name: 'Елена Петрова', role: 'Дизайнер', avatar: 'https://i.pravatar.cc/150?img=3' },
        { id: 4, name: 'Михаил Сидоров', role: 'Техник', avatar: 'https://i.pravatar.cc/150?img=4' },
        { id: 5, name: 'Ольга Николаева', role: 'Менеджер', avatar: 'https://i.pravatar.cc/150?img=5' },
    ]);

    // Карточки статистики
    const statCards: StatCard[] = [
        {
            title: 'Принтеры',
            value: statistics.printers,
            icon: <Printer className="h-4 w-4 text-muted-foreground" />,
            description: 'Активных устройств',
            trend: 12,
        },
        {
            title: 'Материал',
            value: statistics.material + ' кг',
            icon: <Package className="h-4 w-4 text-muted-foreground" />,
            description: 'Доступно на складе',
            trend: -5,
        },
        {
            title: 'Выполненные заказы',
            value: statistics.completedOrders,
            icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
            description: 'За последний месяц',
            trend: 23,
        },
        {
            title: 'Общая прибыль',
            value: statistics.totalProfit.toLocaleString() + ' ₽',
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
            description: 'С начала года',
            trend: 8,
        },
    ];

    // Обработчики событий
    const handleAvatarChange = () => {
        // Здесь будет логика загрузки нового аватара
        console.log('Change avatar');
    };

    const handleSaveUserData = () => {
        setUserData({
            ...userData,
            username: editForm.username,
            email: editForm.email,
        });
        setIsEditDialogOpen(false);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase();
    };

    const logout = async () => {
        try {
            await authAPI.logout();
            setUser(null);

        } catch (error) {
            console.log('❌ Ошибка:', error);
        }
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Шапка страницы */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Профиль пользователя</h1>
                    <p className="text-muted-foreground">
                        Управляйте своими настройками и просматривайте статистику
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Редактировать профиль</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Настройки</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4"/>
                            <span>Выйти</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                {/* Левая колонка - информация о пользователе */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="relative w-32 h-32 mx-auto mb-4 group">
                                <Avatar className="w-32 h-32 border-4 border-primary/10">
                                    <AvatarImage src={userData.avatar} alt={userData.username} />
                                    <AvatarFallback className="text-2xl">
                                        {getInitials(userData.username.replace('_', ' '))}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="absolute bottom-0 right-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleAvatarChange}
                                >
                                    <Camera className="h-4 w-4" />
                                </Button>
                            </div>
                            <CardTitle className="text-2xl">{userData.username}</CardTitle>
                            <CardDescription className="flex items-center justify-center gap-1">
                                <Mail className="h-3 w-3" />
                                {userData.email}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-muted-foreground">Зарегистрирован:</span>
                                <span className="ml-auto font-medium">
                                    {new Date(userData.registrationDate).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </span>
                            </div>
                            <Separator />
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsEditDialogOpen(true)}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Редактировать профиль
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Быстрые действия */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Быстрые действия</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start">
                                <Printer className="mr-2 h-4 w-4" />
                                Добавить принтер
                            </Button>
                            <Button variant="ghost" className="w-full justify-start">
                                <Package className="mr-2 h-4 w-4" />
                                Пополнить материалы
                            </Button>
                            <Button variant="ghost" className="w-full justify-start">
                                <Users className="mr-2 h-4 w-4" />
                                Пригласить пользователя
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Правая колонка - статистика и команда */}
                <div className="md:col-span-5 space-y-6">
                    {/* Карточки статистики */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        {statCards.map((stat, index) => (
                            <Card key={index}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {stat.title}
                                    </CardTitle>
                                    {stat.icon}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {stat.description}
                                    </p>
                                    {stat.trend && (
                                        <Badge
                                            variant={stat.trend > 0 ? 'default' : 'destructive'}
                                            className="mt-2"
                                        >
                                            {stat.trend > 0 ? '+' : ''}
                                            {stat.trend}% с прошлого месяца
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Команда */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Команда</CardTitle>
                                <CardDescription>
                                    Участники вашего объединения ({teamMembers.length})
                                </CardDescription>
                            </div>
                            <Button size="sm">
                                <UserPlus className="mr-2 h-4 w-4" />
                                Пригласить
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {teamMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.avatar} alt={member.name} />
                                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.role}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="ml-auto">
                                            {member.role === 'Администратор' ? 'Владелец' : 'Участник'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Недавняя активность (дополнительно) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Недавняя активность</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-muted-foreground">
                                            Заказ #{1000 + i} успешно выполнен
                                        </span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {i} час назад
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Диалог редактирования профиля */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Редактировать профиль</DialogTitle>
                        <DialogDescription>
                            Измените свои данные здесь. Нажмите сохранить, когда закончите.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="username">Имя пользователя</Label>
                            <Input
                                id="username"
                                value={editForm.username}
                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Аватар</Label>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage src={userData.avatar} />
                                    <AvatarFallback>{getInitials(userData.username)}</AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="sm" onClick={handleAvatarChange}>
                                    <Camera className="mr-2 h-4 w-4" />
                                    Загрузить новый
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button onClick={handleSaveUserData}>Сохранить изменения</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}