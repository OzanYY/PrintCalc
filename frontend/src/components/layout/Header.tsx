import { Button } from "../ui/button"
import { Sigma, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'  // ← импортируем хук

export default function Header() {
    const navigate = useNavigate();  // ← хук для навигации

    return (
        <header className="flex justify-between p-2 rounded-2xl bg-neutral-50">
            <div className="flex">
                <Button 
                    className="hover:bg-gray-300 bg-neutral-50" 
                    onClick={() => navigate('/')}  // ← на главную
                >
                    <Sigma />PrintCalc
                </Button>
            </div>
            <div className="flex">
                <Button 
                    className="hover:bg-gray-300 bg-neutral-50" 
                    onClick={() => navigate('/auth')}  // ← на страницу авторизации
                >
                    <User />
                </Button>
            </div>
        </header>
    )
}