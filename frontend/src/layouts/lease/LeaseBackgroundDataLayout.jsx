import React from 'react';
import { NavLink, Outlet, useOutletContext, useLocation } from 'react-router-dom';

export default function LeaseBackgroundDataLayout() {
  const { currentUser } = useOutletContext(); 
  const perms = currentUser?.permissions || [];
  const location = useLocation();

  const hasAppAccess = (appCode) => {
    return true; // Tạm thời cho phép tất cả để dễ dàng phát triển giao diện, sau này sẽ chỉnh lại theo perms thực tế
    return perms.includes(`LEASE_${appCode}_VIEW`) || perms.includes(`LEASE_${appCode}_EDIT`);
  };

  const isSidebarVisible = location.pathname === '/lease/background-data' || location.pathname === '/lease/background-data/';

  return (
    <div className="flex w-full h-full bg-[#F8F9FA]">
      
      {/* SIDEBAR THỨ 3: TỰ ĐỘNG ẨN KHI ĐÃ CHỌN 1 TRONG 3 */}
      {isSidebarVisible && (
        <div className="w-[220px] bg-white border-r border-gray-200 p-4 shrink-0 flex flex-col z-0 shadow-sm animate-[slideIn_0.2s_ease-out]">
          <h3 className="font-bold text-gray-800 text-[13px] mb-4 uppercase tracking-wider text-center border-b border-gray-100 pb-3">
            Background Data
          </h3>
          
          <div className="flex flex-col gap-1.5">
            {hasAppAccess('PARTY') && (
              <NavLink 
                to="/lease/background-data/party" 
                className="px-4 py-2 rounded text-[14px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                Define Party
              </NavLink>
            )}
            
            {hasAppAccess('VAT') && (
              <NavLink 
                to="/lease/background-data/vat" 
                className="px-4 py-2 rounded text-[14px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                Define VAT Country
              </NavLink>
            )}

            {hasAppAccess('OCC') && (
              <NavLink 
                to="/lease/background-data/occ-revenue" 
                className="px-4 py-2 rounded text-[14px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                Planned OCC & Revenue
              </NavLink>
            )}
          </div>
        </div>
      )}

      {/* NỘI DUNG HIỂN THỊ */}
      <div className="flex-1 overflow-hidden relative">
        {/* Nếu chưa chọn chức năng nào (Sidebar đang mở), hiện câu nhắc nhở / background trống */}
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