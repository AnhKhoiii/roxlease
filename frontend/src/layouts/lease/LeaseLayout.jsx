import React from 'react';
import { NavLink, Outlet, useOutletContext, useLocation } from 'react-router-dom';

export default function LeaseLayout() {
  const { currentUser } = useOutletContext(); 
  const perms = currentUser?.permissions || [];
  const location = useLocation();

  // Kiểm tra quyền (Permissions)
  const hasAppAccess = (appCode) => {
    return perms.includes(`LEASE_${appCode}_VIEW`) || perms.includes(`LEASE_${appCode}_EDIT`);
  };

  // Hàm hỗ trợ: Giúp Sidebar tổng luôn sáng màu dù đang ở bất kỳ route con nào bên trong
  const isMenuActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans relative">
      
      {/* SIDEBAR TỔNG CỦA PHÂN HỆ LEASE */}
      <div className="w-[260px] bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] p-4 shrink-0 flex flex-col z-10 relative">
        <div className="text-red-500 font-bold text-lg mb-6 uppercase tracking-wider border-b border-gray-200 pb-4 px-2 mt-2">
          Lease Management
        </div>
        
        <div className="flex flex-col gap-1">
          
          {/* Lease Dashboard */}
          {hasAppAccess('DASHBOARD') && (
            <NavLink 
              to="/lease/dashboard" 
              className={`px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isMenuActive('/lease/dashboard') 
                  ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' 
                  : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Lease Dashboard
            </NavLink>
          )}

          {/* Lease Console */}
          {hasAppAccess('CONSOLE') && (
            <NavLink 
              to="/lease/console" 
              className={`px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isMenuActive('/lease/console') 
                  ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' 
                  : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Lease Console
            </NavLink>
          )}

          {/* Lease Request */}
          {hasAppAccess('REQUEST') && (
            <NavLink 
              to="/lease/request" 
              className={`px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isMenuActive('/lease/request') 
                  ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' 
                  : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Lease Request
            </NavLink>
          )}

          {/* Background Data */}
          {hasAppAccess('DATA') && (
            <NavLink 
              to="/lease/background-data" 
              className={`px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isMenuActive('/lease/background-data') 
                  ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' 
                  : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Background data
            </NavLink>
          )}
          
        </div>
      </div>

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      {/* Thẻ Outlet này sẽ hứng các Layout con (như BackgroundDataLayout) hoặc các Page bình thường */}
      <div className="flex-1 bg-[#F8F9FA] flex flex-col overflow-hidden relative">
        <Outlet context={{ currentUser }} /> 
      </div>

    </div>
  );
}