import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { CalculatorProvider } from './context/CalculatorContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CalculatorProvider>
        <App />
      </CalculatorProvider>
    </AuthProvider>
  </StrictMode>,
)
