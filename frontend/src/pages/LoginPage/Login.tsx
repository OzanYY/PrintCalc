import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { UserPlus, LogIn } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { useState } from 'react';
import { authAPI } from '@/api/auth';

export default function sign() {
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

function LoginForm({ ...props }: React.ComponentProps<typeof Card>) {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false); // для индикации загрузки
    const [serverError, setServerError] = useState(''); // для ошибок сервера
    const [successMessage, setSuccessMessage] = useState(''); // для сообщений об успехе

    const validateEmail = (email: string) => {
        if (!email) {
            return ''; // Убираем ошибку для пустого поля
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Введите корректный email адрес';
        }
        return '';
    };

    const validatePassword = (password: string) => {
        if (!password) {
            return ''; // Убираем ошибку для пустого поля
        }
        if (password.length < 8) {
            return 'Пароль должен содержать минимум 8 символов';
        }
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        // Обновляем formData в зависимости от id поля
        if (id === 'login_email') {
            setFormData(prev => ({ ...prev, email: value }));
            setErrors(prev => ({ ...prev, email: validateEmail(value) }));
        } else if (id === 'login_password') {
            setFormData(prev => ({ ...prev, password: value }));
            setErrors(prev => ({ ...prev, password: validatePassword(value) }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Сбрасываем предыдущие сообщения
        setServerError('');
        setSuccessMessage('');

        // При отправке проверяем все поля, включая обязательность
        const emailError = !formData.email ? 'Email обязателен' : validateEmail(formData.email);
        const passwordError = !formData.password ? 'Пароль обязателен' : validatePassword(formData.password);

        setErrors({
            email: emailError,
            password: passwordError
        });

        // Если есть ошибки валидации - не отправляем
        if (emailError || passwordError) {
            return;
        }

        // Начинаем загрузку
        setIsLoading(true);

        try {
            // Отправляем запрос на сервер
            const response = await authAPI.login(formData.email, formData.password);

            // Успешный ответ
            console.log('Ответ от сервера:', response.data);

            // Показываем сообщение об успехе
            setSuccessMessage('Успешный вход! Перенаправление...');

            // Можно очистить форму
            setFormData({ email: '', password: '' });

            // Перенаправление на другую страницу через секунду
            //setTimeout(() => {
            //    window.location.href = '/dashboard'; // или используй router.push если есть
            //}, 1000);

        } catch (error: any) {
            // Обработка ошибок
            console.error('Ошибка входа:', error);

            if (error.response) {
                console.log(error.response.status)
                // Сервер вернул ошибку
                switch (error.response.status) {
                    case 401:
                        setServerError('Неверный email или пароль');
                        break;
                    case 404:
                        setServerError('Пользователь не найден');
                        break;
                    case 422:
                        // Ошибки валидации с сервера
                        if (error.response.data.errors) {
                            // Можно обновить errors state с серверными ошибками
                            setErrors(prev => ({
                                ...prev,
                                ...error.response.data.errors
                            }));
                        }
                        break;
                    default:
                        setServerError('Произошла ошибка. Попробуйте позже');
                }
            } else if (error.request) {
                // Сервер не ответил
                setServerError('Сервер не отвечает. Проверьте подключение к интернету');
            } else {
                // Ошибка при настройке запроса
                setServerError('Ошибка при отправке запроса');
            }
        } finally {
            // В любом случае заканчиваем загрузку
            setIsLoading(false);
        }
    };

    const temp = async ()=> {
        const response = await authAPI.logout();
        console.log('Ответ от сервера:', response.data);
    }

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
                    {/* Показываем сообщение об ошибке с сервера */}
                    {serverError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {serverError}
                        </div>
                    )}

                    {/* Показываем сообщение об успехе */}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                            {successMessage}
                        </div>
                    )}
                    <FieldGroup className="flex flex-col gap-2">
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
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Input
                                id="login_password"
                                type="password"
                                placeholder="пароль"
                                value={formData.password}
                                onChange={handleChange}
                                className={errors.password ? "border-red-500" : ""}
                                required
                            />
                            {errors.password && (
                                <p className="text-xs text-red-500">{errors.password}</p>
                            )}
                        </div>

                        <div className="flex items-center">
                            <a
                                href="#"
                                className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                                onClick={(e) => e.preventDefault()}
                            >
                                Забыли пароль?
                            </a>
                        </div>
                        <Button className="border" disabled={isLoading} type="submit">{isLoading ? 'Вход...' : 'Войти'}</Button>
                        <SeparatorWithText text="или" />
                        <div className="flex justify-around">
                            <Button type="button" className="hover:bg-gray-300 w-24/50 border" onClick={temp}><FaGoogle /></Button>
                            <Button type="button" className="hover:bg-gray-300 w-24/50 border"><FaGithub /></Button>
                        </div>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}

function RegisterForm({ ...props }: React.ComponentProps<typeof Card>) {
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

    // Состояния для запроса
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const validateName = (name: string) => {
        if (!name) {
            return ''; // Убираем ошибку для пустого поля
        }
        if (name.length < 3) {
            return 'Логин должен содержать минимум 3 символа';
        }
        return '';
    };

    const validateEmail = (email: string) => {
        if (!email) {
            return ''; // Убираем ошибку для пустого поля
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Введите корректный email адрес';
        }
        return '';
    };

    const validatePassword = (password: string) => {
        if (!password) {
            return ''; // Убираем ошибку для пустого поля
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < 8) {
            return 'Пароль должен содержать минимум 8 символов';
        }
        if (!hasUpperCase || !hasLowerCase) {
            return 'Пароль должен содержать заглавные и строчные буквы';
        }
        if (!hasNumbers) {
            return 'Пароль должен содержать хотя бы одну цифру';
        }
        if (!hasSpecialChar) {
            return 'Пароль должен содержать хотя бы один специальный символ';
        }
        return '';
    };

    const validateConfirmPassword = (confirmPassword: string, password: string) => {
        if (!confirmPassword) {
            return ''; // Убираем ошибку для пустого поля
        }
        if (confirmPassword !== password) {
            return 'Пароли не совпадают';
        }
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        // Обновляем formData в зависимости от id поля
        if (id === 'name') {
            setFormData(prev => ({ ...prev, name: value }));
            setErrors(prev => ({ ...prev, name: validateName(value) }));
        } else if (id === 'reg_email') {
            setFormData(prev => ({ ...prev, email: value }));
            setErrors(prev => ({ ...prev, email: validateEmail(value) }));
        } else if (id === 'reg_password') {
            setFormData(prev => ({ ...prev, password: value }));
            setErrors(prev => ({ ...prev, password: validatePassword(value) }));

            // Также проверяем подтверждение пароля, если оно уже заполнено
            if (formData.confirmPassword) {
                setErrors(prev => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(formData.confirmPassword, value)
                }));
            }
        } else if (id === 'confirm-password') {
            setFormData(prev => ({ ...prev, confirmPassword: value }));
            setErrors(prev => ({
                ...prev,
                confirmPassword: validateConfirmPassword(value, formData.password)
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setServerError('');
        setSuccessMessage('');

        // При отправке проверяем все поля, включая обязательность
        const nameError = !formData.name ? 'Логин обязателен' : validateName(formData.name);
        const emailError = !formData.email ? 'Email обязателен' : validateEmail(formData.email);
        const passwordError = !formData.password ? 'Пароль обязателен' : validatePassword(formData.password);
        const confirmPasswordError = !formData.confirmPassword ? 'Подтверждение пароля обязательно' : validateConfirmPassword(formData.confirmPassword, formData.password);

        setErrors({
            name: nameError,
            email: emailError,
            password: passwordError,
            confirmPassword: confirmPasswordError
        });

        if (nameError || emailError || passwordError || confirmPasswordError) {
            return;
        }

        setIsLoading(true);

        try {
            // Отправляем данные на сервер (без confirmPassword)
            const { confirmPassword, ...registerData } = formData;
            const response = await authAPI.register(registerData);

            console.log('Регистрация успешна:', response.data);

            setSuccessMessage('Регистрация успешна!');

            // Очищаем форму
            setFormData({
                name: '',
                email: '',
                password: '',
                confirmPassword: ''
            });

            // Можно автоматически переключиться на форму входа
            setTimeout(() => {
                // Переключить таб на форму входа
            }, 2000);

        } catch (error: any) {
            console.error('Ошибка регистрации:', error);

            if (error.response) {
                switch (error.response.status) {
                    case 409:
                        setServerError('Пользователь с таким email уже существует');
                        break;
                    case 400:
                        setServerError('Некорректные данные');
                        break;
                    default:
                        setServerError('Ошибка при регистрации');
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
                    {/* Показываем сообщение об ошибке с сервера */}
                    {serverError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {serverError}
                        </div>
                    )}

                    {/* Показываем сообщение об успехе */}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                            {successMessage}
                        </div>
                    )}
                    <FieldGroup className="flex flex-col gap-2">
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
                            {errors.name && (
                                <p className="text-xs text-red-500">{errors.name}</p>
                            )}
                        </div>

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
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Input
                                id="reg_password"
                                type="password"
                                placeholder="пароль"
                                value={formData.password}
                                onChange={handleChange}
                                className={errors.password ? "border-red-500" : ""}
                                required
                            />
                            {errors.password && (
                                <p className="text-xs text-red-500">{errors.password}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="подтверждение пароля"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={errors.confirmPassword ? "border-red-500" : ""}
                                required
                            />
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <Button type="submit" className="border" disabled={isLoading}>{isLoading ? 'Регистрация...' : 'Создать аккаунт'}</Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}

interface SeparatorWithTextProps {
    text: string;
    className?: string;
}

export function SeparatorWithText({ text, className = "" }: SeparatorWithTextProps) {
    return (
        <div className={`relative flex items-center ${className}`}>
            <Separator className="flex-1" />
            <span className="mx-4 text-xs text-muted-foreground whitespace-nowrap">
                {text}
            </span>
            <Separator className="flex-1" />
        </div>
    );
}