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
import { UserPlus, LogIn } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { FaGithub, FaGoogle } from 'react-icons/fa';

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
                                placeholder="почта"
                                required
                            />
                            <Input id="password" type="password" placeholder="пароль" required />
                            <div className="flex items-center">
                                <a
                                    href="#"
                                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-muted-foreground"
                                >
                                    Забыли пароль?
                                </a>
                            </div>
                            <Button className="border" type="submit">Войти</Button>
                            <SeparatorWithText text="или" />
                            <div className="flex justify-around">
                                <Button className="hover:bg-gray-300 w-24/50 border"><FaGoogle /></Button>
                                <Button className="hover:bg-gray-300 w-24/50 border"><FaGithub /></Button>
                            </div>
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
                        <Input id="name" type="text" placeholder="логин" required />
                        <Input
                            id="email"
                            type="email"
                            placeholder="почта"
                            required
                        />
                        <Input id="password" type="password" placeholder="пароль" required />
                        <Input id="confirm-password" type="password" placeholder="подверждение пароля" required />
                        <Button type="submit" className="border">Создать аккаунт</Button>
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