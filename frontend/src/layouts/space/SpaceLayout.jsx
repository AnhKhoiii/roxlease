import React from 'react';
import { NavLink, Outlet, useOutletContext, useLocation } from 'react-router-dom';

export default function SpaceLayout() {
  const { currentUser } = useOutletContext(); 
  const perms = currentUser?.permissions || [];
  const location = useLocation();

  const hasAppAccess = (appCode) => {
    return perms.includes(`SPACE_${appCode}_VIEW`) || perms.includes(`SPACE_${appCode}_EDIT`);
  };

  const isBgDataActive = location.pathname.includes('/space/background-data');

  return (
    <div className="flex w-full h-full bg-white font-sans">
      
      {/* SIDEBAR PHỤ CỦA PHÂN HỆ SPACE */}
      <div className="w-[260px] bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] p-4 shrink-0 flex flex-col z-10">
        <div className="text-red-500 font-bold text-lg mb-6 uppercase tracking-wider border-b border-gray-200 pb-4 px-2 mt-2">
          Space Management
        </div>
        
        <div className="flex flex-col gap-1">
          
          {/* Building Performance */}
          {hasAppAccess('BUILDING') && (
            <NavLink 
              to="/space/building" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive && !isBgDataActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Building Performance
            </NavLink>
          )}

          {/* Space Console */}
          {hasAppAccess('CONSOLE') && (
            <NavLink 
              to="/space/console" 
              className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${
                isActive && !isBgDataActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
              }`}
            >
              Space Console
            </NavLink>
          )}

          {/* NÚT BẤM MỞ SIDEBAR BACKGROUND DATA */}
          {hasAppAccess('DATA') && (
          <NavLink 
            to="/space/background-data" 
            onClick={(e) => {
              // Nếu đang ở màn hình con rồi mà muốn mở lại sidebar, chúng ta ép nó quay về đường dẫn gốc
              if (isBgDataActive && location.pathname !== '/space/background-data') {
                e.preventDefault(); // Chặn hành vi mặc định
                window.location.href = '/space/background-data'; // Load lại đúng trang gốc để bật Sidebar
              }
            }}
            className={`px-4 py-3 rounded text-[15px] font-semibold transition-all ${
              isBgDataActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-700 hover:text-red-500 hover:bg-gray-200 border-l-4 border-transparent'
            }`}
          >
            Background data
          </NavLink>
          )}
          

        </div>
      </div>

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <div className="flex-1 overflow-auto bg-[#F8F9FA] flex">
        <Outlet context={{ currentUser }} /> 
      </div>

    </div>
  );
}