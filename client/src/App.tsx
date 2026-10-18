import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import MenuBuilderPage from './pages/MenuBuilderPage';
import PublicMenuPage from './pages/PublicMenuPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-cream-50 font-sans">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/menu/new" element={<MenuBuilderPage />} />
          <Route path="/menu/:id" element={<MenuBuilderPage />} />
          <Route path="/m/:slug" element={<PublicMenuPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
