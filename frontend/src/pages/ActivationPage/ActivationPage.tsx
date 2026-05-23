import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const REDIRECT_DELAY = 5;

export default function ActivationPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(REDIRECT_DELAY);

    const error = searchParams.get('error');
    const type = searchParams.get('type');
    const isSuccess = !error;

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/', { replace: true });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6 text-center">
                    {isSuccess ? (
                        <>
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                            <div>
                                {type === 'email_changed' ? (
                                    <>
                                        <h1 className="text-2xl font-semibold mb-2">Email подтверждён!</h1>
                                        <p className="text-muted-foreground">
                                            Ваш email успешно изменён. Аккаунт активирован с новым адресом.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="text-2xl font-semibold mb-2">Аккаунт активирован!</h1>
                                        <p className="text-muted-foreground">
                                            Ваш аккаунт успешно активирован. Теперь вам доступны все функции сервиса.
                                        </p>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-destructive" />
                            <div>
                                <h1 className="text-2xl font-semibold mb-2">Ошибка активации</h1>
                                <p className="text-muted-foreground">
                                    {error === 'already_activated'
                                        ? 'Аккаунт уже был активирован ранее.'
                                        : 'Ссылка активации недействительна или устарела.'}
                                </p>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Переход к калькулятору через {countdown} сек...</span>
                    </div>

                    <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
                        Перейти сейчас
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
