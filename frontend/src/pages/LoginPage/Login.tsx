import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { UserPlus, LogIn } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useState, useEffect } from 'react';
import { authAPI } from '@/api/auth';
import { toast } from "sonner"
import { useNavigate } from 'react-router-dom'
import { useAuth } from "@/context/AuthContext"
import { PasswordInput } from '@/components/ui/password-input';

export default function LoginPage() {
    return (
        <div className="pt-4 md:pt-8">
            <div className="flex justify-between">
                <div className="register w-full max-w-sm">
                    <RegisterForm />
                </div>
                <div className="login w-full max-w-sm">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}

// ─── Форма регистрации ────────────────────────────────────────────────────────

function RegisterForm({ ...props }: React.ComponentProps<typeof Card>) {
    const navigate = useNavigate();
    const { setUser } = useAuth()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (serverError) toast.error(serverError);
    }, [serverError]);

    useEffect(() => {
        if (successMessage) toast.success(successMessage);
    }, [successMessage]);

    const validateName = (name: string) => {
        if (!name) return '';
        if (name.length < 3) return 'Логин должен содержать минимум 3 символа';
        return '';
    };

    const validateEmail = (email: string) => {
        if (!email) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Введите корректный email адрес';
        return '';
    };

    const validatePassword = (password: string) => {
        if (!password) return '';
        if (password.length < 8) return 'Пароль должен содержать минимум 8 символов';
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password))
            return 'Пароль должен содержать заглавные и строчные буквы';
        if (!/\d/.test(password)) return 'Пароль должен содержать хотя бы одну цифру';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
            return 'Пароль должен содержать хотя бы один специальный символ';
        return '';
    };

    const validateConfirmPassword = (confirmPassword: string, password: string) => {
        if (!confirmPassword) return '';
        if (confirmPassword !== password) return 'Пароли не совпадают';
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        if (id === 'name') {
            setFormData(prev => ({ ...prev, name: value }));
            setErrors(prev => ({ ...prev, name: validateName(value) }));
        } else if (id === 'reg_email') {
            setFormData(prev => ({ ...prev, email: value }));
            setErrors(prev => ({ ...prev, email: validateEmail(value) }));
        }
    };

    // Обработчик для PasswordInput (принимает строку, не событие)
    const handlePasswordChange = (value: string) => {
        setFormData(prev => ({ ...prev, password: value }));
        setErrors(prev => ({ ...prev, password: validatePassword(value) }));

        if (formData.confirmPassword) {
            setErrors(prev => ({
                ...prev,
                confirmPassword: validateConfirmPassword(formData.confirmPassword, value),
            }));
        }
    };

    const handleConfirmPasswordChange = (value: string) => {
        setFormData(prev => ({ ...prev, confirmPassword: value }));
        setErrors(prev => ({
            ...prev,
            confirmPassword: validateConfirmPassword(value, formData.password),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError('');
        setSuccessMessage('');

        const nameError            = !formData.name ? 'Логин обязателен' : validateName(formData.name);
        const emailError           = !formData.email ? 'Email обязателен' : validateEmail(formData.email);
        const passwordError        = !formData.password ? 'Пароль обязателен' : validatePassword(formData.password);
        const confirmPasswordError = !formData.confirmPassword
            ? 'Подтверждение пароля обязательно'
            : validateConfirmPassword(formData.confirmPassword, formData.password);

        setErrors({ name: nameError, email: emailError, password: passwordError, confirmPassword: confirmPasswordError });

        if (nameError || emailError || passwordError || confirmPasswordError) return;

        setIsLoading(true);

        try {
            const { confirmPassword, ...registerData } = formData;
            const response = (await authAPI.register(registerData)).data;
            if (response.user) setUser(response.user);
            setFormData({ name: '', email: '', password: '', confirmPassword: '' });
            toast.success('Письмо с активацией отправлено!', {
                description: `Проверьте почту ${registerData.email}. Если письмо не пришло — загляните в папку «Спам».`,
                duration: 7000,
            });
            setTimeout(() => navigate('/profile'), 1500);
        } catch (error: any) {
            console.error('Ошибка регистрации:', error);
            if (error.response) {
                switch (error.response.status) {
                    case 409: setServerError('Пользователь с таким email уже существует'); break;
                    case 400: setServerError('Некорректные данные'); break;
                    default:  setServerError('Ошибка при регистрации');
                }
            } else if (error.request) {
                setServerError('Сервер не отвечает');
            } else {
                setServerError('Ошибка при отправке запроса');
            }
        } finally {
            setIsLoading(false);
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
                <form onSubmit={handleSubmit} noValidate>
                    <FieldGroup className="flex flex-col gap-2">
                        {/* Логин */}
                        <div className="space-y-1">
                            <Input
                                id="name"
                                type="text"
                                placeholder="логин"
                                value={formData.name}
                                onChange={handleChange}
                                className={errors.name ? "border-red-500" : ""}
                                required
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <Input
                                id="reg_email"
                                type="email"
                                placeholder="почта"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? "border-red-500" : ""}
                                required
                            />
                            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        </div>

                        {/* Пароль — используем новый компонент с индикатором силы */}
                        <PasswordInput
                            id="reg_password"
                            value={formData.password}
                            onChange={handlePasswordChange}
                            placeholder="пароль"
                            showStrength
                            error={errors.password}
                        />

                        {/* Подтверждение пароля */}
                        <PasswordInput
                            id="confirm-password"
                            value={formData.confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            placeholder="подтверждение пароля"
                            error={errors.confirmPassword}
                        />

                        <Button type="submit" className="border" disabled={isLoading}>
                            {isLoading ? 'Регистрация...' : 'Создать аккаунт'}
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}

// ─── Форма входа ──────────────────────────────────────────────────────────────

function LoginForm({ ...props }: React.ComponentProps<typeof Card>) {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (serverError) toast.error(serverError);
    }, [serverError]);

    useEffect(() => {
        if (successMessage) toast.success(successMessage);
    }, [successMessage]);

    const validateEmail = (email: string) => {
        if (!email) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Введите корректный email адрес';
        return '';
    };

    const validatePassword = (password: string) => {
        if (!password) return '';
        if (password.length < 6) return 'Пароль должен содержать минимум 6 символов';
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        if (id === 'login_email') {
            setFormData(prev => ({ ...prev, email: value }));
            setErrors(prev => ({ ...prev, email: validateEmail(value) }));
        }
    };

    // Обработчик для PasswordInput
    const handlePasswordChange = (value: string) => {
        setFormData(prev => ({ ...prev, password: value }));
        setErrors(prev => ({ ...prev, password: validatePassword(value) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError('');
        setSuccessMessage('');

        const emailError    = !formData.email ? 'Email обязателен' : validateEmail(formData.email);
        const passwordError = !formData.password ? 'Пароль обязателен' : validatePassword(formData.password);

        setErrors({ email: emailError, password: passwordError });
        if (emailError || passwordError) return;

        setIsLoading(true);

        try {
            const response = (await authAPI.login(formData.email, formData.password)).data;
            setUser(response.user);
            setSuccessMessage('Успешный вход!');
            setFormData({ email: '', password: '' });
            setTimeout(() => navigate('/profile'), 50);
        } catch (error: any) {
            console.error('Ошибка входа:', error);
            if (error.response) {
                switch (error.response.status) {
                    case 401: setServerError('Неверный email или пароль'); break;
                    case 404: setServerError('Пользователь не найден'); break;
                    case 422:
                        if (error.response.data.errors) {
                            setErrors(prev => ({ ...prev, ...error.response.data.errors }));
                        }
                        break;
                    default: setServerError('Произошла ошибка. Попробуйте позже');
                }
            } else if (error.request) {
                setServerError('Сервер не отвечает. Проверьте подключение к интернету');
            } else {
                setServerError('Ошибка при отправке запроса');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <LogIn />
                    <p className="ml-4">Войти в аккаунт</p>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} noValidate>
                    <FieldGroup className="flex flex-col gap-2">
                        {/* Email */}
                        <div className="space-y-1">
                            <Input
                                id="login_email"
                                type="email"
                                placeholder="почта"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? "border-red-500" : ""}
                                required
                            />
                            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        </div>

                        {/* Пароль — используем новый компонент */}
                        <PasswordInput
                            id="login_password"
                            value={formData.password}
                            onChange={handlePasswordChange}
                            placeholder="пароль"
                            error={errors.password}
                        />

                        <div className="flex items-center">
                            <a
                                href="#"
                                className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                                onClick={e => e.preventDefault()}
                            >
                                Забыли пароль?
                            </a>
                        </div>

                        <Button className="border" disabled={isLoading} type="submit">
                            {isLoading ? 'Вход...' : 'Войти'}
                        </Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}