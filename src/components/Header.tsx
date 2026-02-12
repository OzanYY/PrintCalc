//import React from 'react'
import { Button } from "./ui/button"
import { Sigma, User } from 'lucide-react'

export default function Header() {
    return (
        <header className="flex justify-between">
            <div className="flex">
                <Button className="cursor-pointer hover:bg-gray-300"><Sigma/>PrintCalc</Button>
            </div>
            <div className="flex">
                <Button className="cursor-pointer hover:bg-gray-300"><User/></Button>
            </div>
        </header>
    )
}