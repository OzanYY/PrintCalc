//import { useState } from 'react'
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
import './App.css'

import Header from './components/Header'
import Footer from './components/Footer'
import Calc from './components/calculator'
import Sign from './components/login-and-register'

function App() {
  return (
    <div>
      <Header />
      <Calc />
      <Sign />
      <Footer />
    </div>
  )
}

export default App
