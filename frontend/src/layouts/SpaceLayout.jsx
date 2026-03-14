import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';

export default function SpaceLayout() {
  const { currentUser } = useOutletContext(); 
  const perms = currentUser?.permissions || [];

  // Hàm kiểm tra quyền Lớp 2 cho phân hệ SPACE
  const hasAppAccess = (appCode) => {
    return perms.includes(`SPACE_${appCode}_VIEW`) || perms.includes(`SPACE_${appCode}_EDIT`);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans">
      
      {/* SIDEBAR PHỤ CỦA PHÂN HỆ SPACE */}
      <div className="w-[260px] bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] p-6 shrink-0 flex flex-col z-10">
        <div className="text-red-500 font-bold text-lg mb-6 uppercase tracking-wider border-b border-gray-200 pb-4">
          Space Management
        </div>
        
        <div className="flex flex-col gap-2">
          
          {/* Menu 1: Location (Chính là trang SpaceConsole hiện tại) */}
          {hasAppAccess('LOCATION') && (
            <NavLink 
              to="/space/location" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'
              }`}
            >
              Location (Region/City)
            </NavLink>
          )}
          
          {/* Menu 2: Building (Mở rộng trong tương lai) */}
          {hasAppAccess('BUILDING') && (
            <NavLink 
              to="/space/building" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'
              }`}
            >
              Property / Building
            </NavLink>
          )}

          {/*
          {hasAppAccess('FLOOR') && (
            <NavLink 
              to="/space/floor" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'
              }`}
            >
              Floor Management
            </NavLink>
          )}

          {hasAppAccess('ROOM') && (
            <NavLink 
              to="/space/room" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'
              }`}
            >
              Room / Workspace
            </NavLink>
          )}*/}

        </div>
      </div>

      {/* KHU VỰC NỘI DUNG CHÍNH (Nơi chứa SpaceConsole) */}
      <div className="flex-1 overflow-auto bg-[#F8F9FA]">
        {/* Truyền tiếp currentUser xuống cho SpaceConsole để bắt quyền Edit */}
        <Outlet context={{ currentUser }} /> 
      </div>

    </div>
  );
}