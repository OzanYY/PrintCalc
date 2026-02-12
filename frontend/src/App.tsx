import { useState } from 'react'
import { cn } from '@/lib/utils';
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
import './App.css'

import Header from './components/Header'
import Footer from './components/Footer'
import Calc from './components/calculator'
import Sign from './components/login-and-register'

function App() {
  const [currentPage, setCurrentPage] = useState('main'); // 'calc' или 'sign'

  // Функция, которая получает строку из Header
  const handleBtnClick = (page: string) => {
    console.log('Получена команда:', page); // 'main' или 'sign'
    setCurrentPage(page); // Сохраняем в состояние
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      <Header onBtnClick={handleBtnClick} />
      <main className='flex-1'>
        {/* Показываем компонент в зависимости от полученной строки */}
        {currentPage === 'main' && <Calc />}
        {currentPage === 'sign' && <Sign />}
      </main>
      <Footer />
    </div>
  )
}

export default App
