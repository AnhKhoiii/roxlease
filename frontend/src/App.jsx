import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import DashboardLayout from './layouts/DashboardLayout'; 
import SystemLayout from './layouts/system/SystemLayout';
import Profile from './pages/Profile';
import UserManagement from './pages/system/UserManagement';
import RoleManagement from './pages/system/RoleManagement';
import PermissionManagement from './pages/system/PermissionManagement';
import AssignPermission from './pages/system/AssignPermission';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import SpaceLayout from './layouts/space/SpaceLayout';
import GeoLocation from './pages/space/GeoLocation'
import BackgroundDataLayout from './layouts/space/BackgroundDataLayout';
import PropertyConsole from './pages/space/PropertyConsole';
import AmenityConsole from './pages/space/AmenityConsole';
import SpaceConsole from './pages/space/SpaceConsole';
import LeaseLayout from './layouts/lease/LeaseLayout';
import LeaseBackgroundData from './pages/lease/PartyConsole';
import LeaseConsole from './pages/lease/LeaseConsole';
import LeaseDetail from './pages/lease/LeaseDetail';
import Request from './pages/lease/Request';
import LeaseBackgroundDataLayout from './layouts/lease/LeaseBackgroundDataLayout';
import VatCountryConsole from './pages/cost/VatCountryConsole';
import PlannedRevenue from './pages/cost/PlannedRevenue';
import BuildingPerformance from './pages/space/BuildingPerformance';

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

            <Route path="building" element={<BuildingPerformance />} />
          </Route>

          <Route path="lease" element={<LeaseLayout />}>
            <Route path="dashboard" element={<div className="p-8">Lease Dashboard</div>} />
            <Route path="console" element={<LeaseConsole />} />
              <Route path="console/:id" element={<LeaseDetail />} />
            <Route path="request" element={<Request />} />
            <Route path="background-data" element={<LeaseBackgroundDataLayout />} >
                <Route path="party" element={<LeaseBackgroundData type="party" />} />
                <Route path="vatcountry" element={<VatCountryConsole />} />
                <Route path="planned-revenue" element={<PlannedRevenue />} />
            </Route>
          </Route>
          
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