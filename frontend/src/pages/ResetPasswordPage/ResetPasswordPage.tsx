import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { KeyRound } from 'lucide-react';
import { authAPI } from '@/api/auth';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);

    const validatePassword = (value: string) => {
        if (!value) return 'Пароль обязателен';
        if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
        if (!/[A-Z]/.test(value) || !/[a-z]/.test(value))
            return 'Пароль должен содержать заглавные и строчные буквы';
        if (!/\d/.test(value)) return 'Пароль должен содержать хотя бы одну цифру';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(value))
            return 'Пароль должен содержать хотя бы один специальный символ';
        return '';
    };

    const validateConfirm = (confirm: string, pass: string) => {
        if (!confirm) return 'Подтверждение пароля обязательно';
        if (confirm !== pass) return 'Пароли не совпадают';
        return '';
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        setErrors(prev => ({
            ...prev,
            password: validatePassword(value),
            confirmPassword: confirmPassword ? validateConfirm(confirmPassword, value) : prev.confirmPassword,
        }));
    };

    const handleConfirmChange = (value: string) => {
        setConfirmPassword(value);
        setErrors(prev => ({ ...prev, confirmPassword: validateConfirm(value, password) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Недействительная ссылка сброса пароля');
            return;
        }

        const passwordErr = validatePassword(password);
        const confirmErr  = validateConfirm(confirmPassword, password);
        setErrors({ password: passwordErr, confirmPassword: confirmErr });
        if (passwordErr || confirmErr) return;

        setIsLoading(true);
        try {
            await authAPI.resetPassword(token, password);
            toast.success('Пароль успешно изменён!');
            setTimeout(() => navigate('/login'), 1500);
        } catch (error: any) {
            if (error.response?.status === 400) {
                toast.error('Ссылка недействительна или истёк срок действия. Запросите новую.');
            } else {
                toast.error('Ошибка при сбросе пароля');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="pt-8 flex justify-center">
                <p className="text-muted-foreground">Недействительная ссылка для сброса пароля.</p>
            </div>
        );
    }

    return (
        <div className="pt-8 flex justify-center">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <KeyRound />
                        <p className="ml-4">Новый пароль</p>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} noValidate>
                        <FieldGroup className="flex flex-col gap-2">
                            <PasswordInput
                                id="new_password"
                                value={password}
                                onChange={handlePasswordChange}
                                placeholder="новый пароль"
                                showStrength
                                error={errors.password}
                            />
                            <PasswordInput
                                id="confirm_new_password"
                                value={confirmPassword}
                                onChange={handleConfirmChange}
                                placeholder="подтверждение пароля"
                                error={errors.confirmPassword}
                            />
                            <Button type="submit" disabled={isLoading} className="border">
                                {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
