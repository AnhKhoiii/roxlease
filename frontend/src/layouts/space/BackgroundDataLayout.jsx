import React from 'react';
import { NavLink, Outlet, useOutletContext, useLocation } from 'react-router-dom';

export default function BackgroundDataLayout() {
  const { currentUser } = useOutletContext(); 
  const perms = currentUser?.permissions || [];
  const location = useLocation();

  const hasAppAccess = (appCode) => {
    return perms.includes(`SPACE_${appCode}_VIEW`) || perms.includes(`SPACE_${appCode}_EDIT`);
  };

  // LOGIC ẨN/HIỆN SIDEBAR: Chỉ hiện khi URL chính xác là "/space/background-data" (chưa chọn menu con)
  const isSidebarVisible = location.pathname === '/space/background-data' || location.pathname === '/space/background-data/';

  return (
    <div className="flex w-full h-full bg-[#F8F9FA]">
      
      {/* SIDEBAR THỨ 3: TỰ ĐỘNG ẨN KHI ĐÃ CHỌN 1 TRONG 3 */}
      {isSidebarVisible && (
        <div className="w-[220px] bg-white border-r border-gray-200 p-4 shrink-0 flex flex-col z-0 shadow-sm animate-[slideIn_0.2s_ease-out]">
          <h3 className="font-bold text-gray-800 text-[13px] mb-4 uppercase tracking-wider text-center border-b border-gray-100 pb-3">
            Background Data
          </h3>
          
          <div className="flex flex-col gap-1.5">
            {hasAppAccess('LOCATION') && (
              <NavLink 
                to="/space/background-data/geo-location" 
                className="px-4 py-2 rounded text-[14px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                Geo-location
              </NavLink>
            )}
            
            {hasAppAccess('PROPERTY') && (
              <NavLink 
                to="/space/background-data/property" 
                className="px-4 py-2 rounded text-[14px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                Property
              </NavLink>
            )}

            {hasAppAccess('AMENITY') && (
              <NavLink 
                to="/space/background-data/amenity" 
                className="px-4 py-2 rounded text-[14px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                Amenity
              </NavLink>
            )}
          </div>
        </div>
      )}

      {/* NỘI DUNG HIỂN THỊ */}
      <div className="flex-1 overflow-hidden relative">
        {/* Nếu chưa chọn chức năng nào (Sidebar đang mở), hiện câu nhắc nhở */}
        {isSidebarVisible ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
            
          </div>
        ) : (
          <Outlet context={{ currentUser }} />
        )}
      </div>

    </div>
  );
}