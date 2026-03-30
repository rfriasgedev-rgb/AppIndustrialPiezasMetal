import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Production from './pages/Production';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import Purchases from './pages/Purchases';
import Users from './pages/Users';
import Products from './pages/Products';
import MeasurementUnits from './pages/MeasurementUnits';
import MaterialCategories from './pages/MaterialCategories';
import WorkQueue from './pages/WorkQueue';
import Planning from './pages/Planning';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={4000} theme="dark" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
          <Route path="/work-queue" element={<PrivateRoute><AppLayout><WorkQueue /></AppLayout></PrivateRoute>} />
          <Route path="/planning" element={<PrivateRoute roles={['ADMIN', 'SUPERVISOR', 'VENTAS']}><AppLayout><Planning /></AppLayout></PrivateRoute>} />
          <Route path="/production" element={<PrivateRoute><AppLayout><Production /></AppLayout></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><AppLayout><Inventory /></AppLayout></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><AppLayout><Clients /></AppLayout></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute roles={['ADMIN', 'VENTAS', 'SUPERVISOR']}><AppLayout><Products /></AppLayout></PrivateRoute>} />
          <Route path="/units" element={<PrivateRoute roles={['ADMIN']}><AppLayout><MeasurementUnits /></AppLayout></PrivateRoute>} />
          <Route path="/categories" element={<PrivateRoute roles={['ADMIN']}><AppLayout><MaterialCategories /></AppLayout></PrivateRoute>} />
          <Route path="/purchases" element={<PrivateRoute roles={['ADMIN', 'ALMACENISTA', 'SUPERVISOR']}><AppLayout><Purchases /></AppLayout></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute roles={['ADMIN']}><AppLayout><Users /></AppLayout></PrivateRoute>} />
          <Route path="/unauthorized" element={
            <div className="text-center pt-5">
              <h1 className="text-danger"><i className="fas fa-ban"></i></h1>
              <h3>Acceso No Autorizado</h3>
              <a href="/" className="btn btn-dark mt-3">Volver al Inicio</a>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
