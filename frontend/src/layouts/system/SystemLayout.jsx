import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';

export default function SystemLayout() {
  const { currentUser } = useOutletContext();
  const perms = currentUser?.permissions || [];

  const hasAppAccess = (appCode) => {
    return perms.includes(`SYSTEM_${appCode}_VIEW`) || perms.includes(`SYSTEM_${appCode}_EDIT`);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans">
      <div className="w-[260px] bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] p-6 shrink-0 flex flex-col z-10">
        <div className="text-red-500 font-bold text-lg mb-6 uppercase tracking-wider border-b pb-4">System Config</div>
        
        <div className="flex flex-col gap-2">
          {hasAppAccess('USER') && (
            <NavLink to="/system/user" className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'}`}>
              Add or Edit Users
            </NavLink>
          )}
          
          {hasAppAccess('ROLE') && (
            <NavLink to="/system/role" className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'}`}>
              Add or Edit Roles
            </NavLink>
          )}

          {hasAppAccess('PERMISSION') && (
            <NavLink to="/system/permission" className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'}`}>
              Edit permission
            </NavLink>
          )}

          {hasAppAccess('ASSIGN') && (
            <NavLink to="/system/assign" className={({ isActive }) => `px-4 py-3 rounded text-[15px] font-semibold transition-all ${isActive ? 'bg-white text-red-500 border-l-4 border-red-500 shadow-sm' : 'text-gray-600 hover:text-red-500 hover:bg-gray-50'}`}>
              Assign permission
            </NavLink>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#F8F9FA]">
        <Outlet context={{ currentUser }} /> 
      </div>
    </div>
  );
}