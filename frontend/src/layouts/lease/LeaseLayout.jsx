import React from 'react';
import { NavLink, Outlet, useOutletContext, useLocation } from 'react-router-dom';

export default function LeaseLayout() {
  const { currentUser } = useOutletContext(); 
  const perms = currentUser?.permissions || [];
  const location = useLocation();

  const hasAppAccess = (appCode) => {
    return perms.includes(`LEASE_${appCode}_VIEW`) || perms.includes(`LEASE_${appCode}_EDIT`);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans">
      
      {/* SIDEBAR PHỤ CỦA PHÂN HỆ LEASE */}
      <div className="w-[260px] bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] p-4 shrink-0 flex flex-col z-10">
        <div className="text-red-500 font-bold text-lg mb-6 uppercase tracking-wider border-b border-gray-200 pb-4 px-2 mt-2">
          Lease Management
        </div>
        
        <div className="flex flex-col gap-1">
          
          {/* Lease Dashboard */}
          {hasAppAccess('DASHBOARD') && (
            <NavLink 
              to="/lease/dashboard" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Lease Dashboard
            </NavLink>
          )}

          {/* Lease Console */}
          {hasAppAccess('CONSOLE') && (
            <NavLink 
              to="/lease/console" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Lease Console
            </NavLink>
          )}

          {hasAppAccess('REQUEST') && (
            <NavLink 
              to="/lease/request" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Lease Request
            </NavLink>
          )}

          {/* NÚT BẤM MỞ SIDEBAR BACKGROUND DATA */}
          {hasAppAccess('DATA') && (
          <NavLink 
            to="/lease/background-data" 
            className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
          >
            Background data
          </NavLink>
          )}
          

        </div>
      </div>

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 bg-[#F8F9FA] flex flex-col overflow-hidden">
        <Outlet context={{ currentUser }} /> 
      </div>

    </div>
  );
}