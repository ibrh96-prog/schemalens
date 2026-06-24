import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ConnectPage } from './pages/ConnectPage';
import { SchemaPage } from './pages/SchemaPage';
import { TablePage } from './pages/TablePage';

function ThemeInit() {
  useEffect(() => {
    const stored = localStorage.getItem('schemalens-theme');
    const dark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  }, []);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <Toaster position="bottom-right" richColors closeButton />
      <Routes>
        <Route path="/" element={<ConnectPage />} />
        <Route path="/connections/:id" element={<SchemaPage />} />
        <Route
          path="/connections/:id/schema/:schemaName/table/:tableName"
          element={<TablePage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
