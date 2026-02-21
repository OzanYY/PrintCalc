import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { UserPlus, LogIn, Loader2 } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { useNavigate } from 'react-router-dom';

export default function Sign() {
    return (
        <div className="pt-4 md:pt-8">
            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="register w-full max-w-sm">
                    <SignupForm />
                </div>
                <div className="login w-full max-w-sm">
                    <LoginForm />
                </div>
            </div>
        </div>
    );
}

function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const navigate = useNavigate();
    const { login, loading, error } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(formData);
            navigate('/'); // редирект на главную
        } catch (err) {
            // ошибка уже в состоянии error
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <LogIn />
                        <p className="ml-4">Войти в аккаунт</p>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup className="flex flex-col gap-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="почта"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            <Input 
                                id="password" 
                                type="password" 
                                placeholder="пароль" 
                                required
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            
                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                            
                            <div className="flex items-center">
                                <a
                                    href="#"
                                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                                >
                                    Забыли пароль?
                                </a>
                            </div>
                            
                            <Button 
                                className="border" 
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Вход...
                                    </>
                                ) : (
                                    'Войти'
                                )}
                            </Button>
                            
                            <SeparatorWithText text="или" />
                            
                            <div className="flex justify-around gap-2">
                                <Button className="hover:bg-gray-300 flex-1 border" disabled={loading}>
                                    <FaGoogle />
                                </Button>
                                <Button className="hover:bg-gray-300 flex-1 border" disabled={loading}>
                                    <FaGithub />
                                </Button>
                            </div>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
    const navigate = useNavigate();
    const { register, loading, error } = useAuth();
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''  // ← обрати внимание: confirmPassword, не confirm-password
    });
    
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        
        // Преобразуем id из HTML в ключ для formData
        const key = id === 'confirm-password' ? 'confirmPassword' : id;
        
        const newData = {
            ...formData,
            [key]: value
        };
        setFormData(newData);
        
        // Проверка совпадения паролей
        if (key === 'password' || key === 'confirmPassword') {
            if (newData.password && newData.confirmPassword) {
                if (newData.password !== newData.confirmPassword) {
                    setPasswordError('Пароли не совпадают');
                } else {
                    setPasswordError('');
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            setPasswordError('Пароли не совпадают');
            return;
        }
        
        try {
            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });
            navigate('/');
        } catch (err) {
            // ошибка уже в состоянии error
        }
    };

    return (
        <Card {...props} className="gap-4">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <UserPlus />
                    <p className="ml-4">Регистрация</p>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup className="flex flex-col gap-2">
                        {/* Логин */}
                        <Input 
                            id="username" 
                            type="text" 
                            placeholder="логин" 
                            required
                            value={formData.username}
                            onChange={handleChange}
                            disabled={loading}
                        />
                        
                        {/* Email */}
                        <Input
                            id="email"
                            type="email"
                            placeholder="почта"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                        />
                        
                        {/* Пароль с глазом */}
                        <div className="relative">
                            <Input 
                                id="password" 
                                type={showPassword ? "text" : "password"}
                                placeholder="пароль" 
                                required
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                minLength={6}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                            </button>
                        </div>
                        
                        {/* Подтверждение пароля с глазом */}
                        <div className="relative">
                            <Input 
                                id="confirm-password"  // ← id с дефисом для HTML
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="подтверждение пароля" 
                                required
                                value={formData.confirmPassword}  // ← а в state ключ без дефиса
                                onChange={handleChange}
                                disabled={loading}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                            </button>
                        </div>
                        
                        {/* Ошибки */}
                        {passwordError && (
                            <p className="text-sm text-red-500">{passwordError}</p>
                        )}
                        
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                        
                        {/* Кнопка отправки */}
                        <Button 
                            type="submit" 
                            className="border"
                            disabled={loading || !!passwordError}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Регистрация...
                                </>
                            ) : (
                                'Создать аккаунт'
                            )}
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}

interface SeparatorWithTextProps {
  text: string;
  className?: string;
}

function SeparatorWithText({ text, className = "" }: SeparatorWithTextProps) {
  return (
    <div className={`relative flex items-center py-2 ${className}`}>
      <Separator className="flex-1" />
      <span className="mx-4 text-xs text-muted-foreground whitespace-nowrap">
        {text}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}