import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout'; 
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang Login độc lập */}
        <Route path="/login" element={<Login />} />

        {/* Cấu trúc URL mới không có /admin */}
        <Route path="/" element={<DashboardLayout />}>
          {/* Tự động chuyển hướng về dashboard khi vào trang chủ */}
          <Route index element={<Navigate to="dashboard" replace />} />
          
          <Route path="dashboard" element={<div className="p-8">Màn hình Home Dashboard</div>} />
          <Route path="space" element={<div className="p-8">Màn hình Space</div>} />
          <Route path="lease" element={<div className="p-8">Màn hình Lease</div>} />
          <Route path="cost" element={<div className="p-8">Màn hình Cost</div>} />
          <Route path="servicedesk" element={<div className="p-8">Màn hình Service desk</div>} />
          
          {/* Epic System Admin tập trung tại đây */}
          <Route path="system" element={<div className="p-8">Quản lý Role & User</div>} />
          
          {/* Màn hình Profile của user */}
          <Route path="profile" element={<Profile />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;