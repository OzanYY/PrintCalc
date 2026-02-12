//import React from 'react'
import { Button } from "./ui/button"
import { Sigma, User } from 'lucide-react'

// Определяем тип пропсов
interface HeaderProps {
    onBtnClick: (page: string) => void;  // Функция принимает string, ничего не возвращает
}

export default function Header({ onBtnClick }: HeaderProps) {
    return (
        <header className="flex justify-between p-2 rounded-2xl bg-neutral-50">
            <div className="flex">
                <Button className="hover:bg-gray-300 bg-neutral-50" onClick={() => { onBtnClick("main") }}>
                    <Sigma />PrintCalc
                </Button>
            </div>
            <div className="flex">
                <Button className="hover:bg-gray-300 bg-neutral-50" onClick={() => { onBtnClick("sign") }}>
                    <User />
                </Button>
            </div>
        </header>
    )
}