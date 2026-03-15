import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "./features/auth/context/AuthContext"
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CalcPage from './pages/CalcPage/Calculator';
import LoginPage from './pages/LoginPage/Login';
import ProfilePage from './pages/ProfilePage/Profile'
import PrintersPage from './pages/PrinterPage/PrinterPage'
import MaterialsPage from './pages/MaterialsPage/MaterialPage'
import OrdersPage from './pages/OrdersPage/OrderPage'
import StatisticsPage from './pages/dashboardPage/dashboardPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col w-full max-w-7xl mx-auto py-4">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<CalcPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/printers" element={<PrintersPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/dashboard" element={<StatisticsPage />} />
            </Routes>
            <Toaster />
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
    //<TestAPI />
  )
}

export default App
