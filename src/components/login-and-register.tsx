import { cn } from "@/lib/utils";
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

export default function sign() {
    return (
        <div>
            <div className="flex justify-center mb-20"></div>
            <div className="flex justify-between">
                <div className="register w-full max-w-sm">
                    <SignupForm />
                </div>
                <div className="login w-full max-w-sm">
                    <LoginForm />
                </div>
            </div>
        </div>
    )
}

function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
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
                    <form>
                        <FieldGroup className="flex flex-col gap-2">
                            <Input
                                id="email"
                                type="email"
                                placeholder="email"
                                required
                            />
                            <Input id="password" type="password" placeholder="password" required />
                            <div className="flex items-center">
                                <a
                                    href="#"
                                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                                >
                                    Forgot your password?
                                </a>
                            </div>
                            <Button type="submit">Войти</Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
    return (
        <Card {...props} className="gap-4">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <UserPlus />
                    <p className="ml-4">Регистрация</p>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form>
                    <FieldGroup className="flex flex-col gap-2">
                        <Input id="name" type="text" placeholder="username" required />
                        <Input
                            id="email"
                            type="email"
                            placeholder="email"
                            required
                        />
                        <Input id="password" type="password" placeholder="password" required />
                        <Input id="confirm-password" type="password" placeholder="verify password" required />
                        <Button type="submit">Создать аккаунт</Button>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}
