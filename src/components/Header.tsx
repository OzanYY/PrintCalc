//import React from 'react'
import { Button } from "./ui/button"
import { Sigma, User } from 'lucide-react'

// Определяем тип пропсов
interface HeaderProps {
    onBtnClick: (page: string) => void;  // Функция принимает string, ничего не возвращает
}

export default function Header({ onBtnClick }: HeaderProps) {
    return (
        <header className="flex justify-between">
            <div className="flex">
                <Button className="cursor-pointer hover:bg-gray-300" onClick={() => { onBtnClick("main") }}>
                    <Sigma />PrintCalc
                </Button>
            </div>
            <div className="flex">
                <Button className="cursor-pointer hover:bg-gray-300" onClick={() => { onBtnClick("sign") }}>
                    <User />
                </Button>
            </div>
        </header>
    )
}