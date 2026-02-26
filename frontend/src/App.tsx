import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CalcPage from './pages/CalcPage/Calculator';
import LoginPage from './pages/LoginPage/Login';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col w-full max-w-7xl mx-auto py-4">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<CalcPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
          <Toaster />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
    //<TestAPI />
  )
}

export default App
