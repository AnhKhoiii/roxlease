import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout'; 
import SystemLayout from './layouts/SystemLayout';
import Profile from './pages/Profile';
import UserManagement from './pages/system/UserManagement';
import RoleManagement from './pages/system/RoleManagement';
import PermissionManagement from './pages/system/PermissionManagement';
import AssignPermission from './pages/system/AssignPermission';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import SpaceLayout from './layouts/SpaceLayout';
import GeoLocation from './pages/space/GeoLocation'
import BackgroundDataLayout from './layouts/BackgroundDataLayout';
import PropertyConsole from './pages/space/PropertyConsole';
import AmenityConsole from './pages/space/AmenityConsole';
import SpaceConsole from './pages/space/SpaceConsole';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<div className="p-8">Home Dashboard</div>} />

          <Route path="space" element={<SpaceLayout />}>
            
            <Route path="background-data" element={<BackgroundDataLayout />}>
                <Route path="geo-location" element={<GeoLocation />} />
                <Route path="property" element={<PropertyConsole />} />
                <Route path="amenity" element={<AmenityConsole />} />
            </Route>
            
            <Route path="console" element={<SpaceConsole />} />

            <Route path="building" element={<div className="p-8 font-bold text-xl">Màn hình Quản lý Tòa Nhà</div>} />
          </Route>

          <Route path="lease" element={<div className="p-8">Lease Screen</div>} />
          <Route path="cost" element={<div className="p-8">Cost Screen</div>} />
          <Route path="servicedesk" element={<div className="p-8">Service desk Screen</div>} />
          
          <Route path="system" element={<SystemLayout/>}>
            <Route path="user" element={<UserManagement />} />
            <Route path="role" element={<RoleManagement />} />
            <Route path="permission" element={<PermissionManagement />} /> 
            <Route path="assign" element={<AssignPermission />} />
          </Route>
          
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;