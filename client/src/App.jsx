import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Persons from './pages/Persons';
import PersonDetail from './pages/PersonDetail';
import Graph from './pages/Graph';
import DataImport from './pages/DataImport';
import Settings from './pages/Settings';

function ProtectedLayout() {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <MainLayout><Outlet /></MainLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/persons" element={<Persons />} />
          <Route path="/persons/:id" element={<PersonDetail />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
