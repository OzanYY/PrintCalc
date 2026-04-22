import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CalcPage from './pages/CalcPage/Calculator';
import LoginPage from './pages/LoginPage/Login';
import ProfilePage from './pages/ProfilePage/Profile'
import PrintersPage from './pages/PrinterPage/PrinterPage'
import MaterialsPage from './pages/MaterialsPage/MaterialPage'
import OrdersPage from './pages/OrdersPage/OrderPage'
import StatisticsPage from './pages/dashboardPage/dashboardPage'
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col w-full max-w-7xl mx-auto py-4">
        <Header />
        <main className="flex-1">
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/" element={<CalcPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Защищенные маршруты */}
            <Route path="/profile" element={<ProtectedRoute> <ProfilePage /> </ProtectedRoute>} />
            <Route path="/printers" element={<ProtectedRoute> <PrintersPage /> </ProtectedRoute>} />
            <Route path="/materials" element={<ProtectedRoute> <MaterialsPage /> </ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute> <OrdersPage /> </ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute> <StatisticsPage /> </ProtectedRoute>} />

          </Routes>
          <Toaster />
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
