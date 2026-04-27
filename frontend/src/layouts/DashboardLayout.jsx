import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; 
import logo from '../assets/login_logo.png';
import miniLogo from '../assets/mini_logo.png';

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // GỌI API LẤY THÔNG TIN USER (Bao gồm danh sách Permissions)
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axiosInstance.get('/auth/me'); 
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Không thể lấy thông tin user", error);
        localStorage.removeItem('jwt_token');
        navigate('/login');
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserProfile();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  const handleGoToProfile = () => {
    setIsProfileOpen(false);
    navigate('/profile'); 
  };

  // CẤU HÌNH MENU & PERMISSION
  const menuItems = [
    { name: 'Home', path: '/dashboard', code: 'HOME', icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
    { 
      name: 'Space', path: '/space', code: 'SPACE', icon: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m-1 4h1m-1-4h1m-1-4h1m-1-4h1" />,
      children: [
        { name: 'Building Performance', path: '/space/building', code: 'BUILDING' },
        { name: 'Space Console', path: '/space/console', code: 'CONSOLE' },
        { name: 'Background data', path: '/space/background-data', code: 'DATA' },
      ] 
    },
    { 
      name: 'Lease', path: '/lease', code: 'LEASE', icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      children: [
        { name: 'Lease Dashboard', path: '/lease/dashboard', code: 'DASHBOARD' },
        { name: 'Lease Console', path: '/lease/console', code: 'CONSOLE' },
        { name: 'Lease Request', path: '/lease/request', code: 'REQUEST' },
        { name: 'Cost Wizard', path: '/lease/cost-wizard', code: 'COST_WIZARD' },
        { name: 'Reports', path: '/lease/report', code: 'REPORT' },
        { name: 'Background data', path: '/lease/background-data', code: 'DATA' },
      ]
    },
    { 
      name: 'System', path: '/system', code: 'SYSTEM', icon: <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
      children: [
          { name: 'User Management', path: '/system/user', code: 'USER' },
          { name: 'Role Management', path: '/system/role', code: 'ROLE' },
          { name: 'Permission Management', path: '/system/permission', code: 'PERMISSION' },
          { name: 'Assign Permission', path: '/system/assign', code: 'ASSIGN' },
      ]
    },
  ];

  const hasModuleAccess = (moduleCode) => {
    if (!currentUser || !currentUser.permissions) return false;
    if (moduleCode === 'HOME') return true;
    return currentUser.permissions.some(p => p.startsWith(`${moduleCode}_`));
  };

  const hasAppAccess = (moduleCode, appCode) => {
    if (!currentUser || !currentUser.permissions) return false;
    const perms = currentUser.permissions;
    if (moduleCode === 'SYSTEM' && appCode === 'ASSIGN') {
        return perms.includes(`SYSTEM_ASSIGN_EDIT`);
    }
    return perms.includes(`${moduleCode}_${appCode}_VIEW`) || perms.includes(`${moduleCode}_${appCode}_EDIT`);
  };

  const isSearching = searchQuery.trim() !== '';

  const menuToRender = (() => {
    const searchTerm = searchQuery.toLowerCase();
    if (!isSearching) {
      return menuItems
        .filter(item => hasModuleAccess(item.code))
        .map(item => ({ ...item, isModule: true }));
    }

    const results = [];
    menuItems.forEach(module => {
      if (hasModuleAccess(module.code)) {
        const isModuleMatch = module.name.toLowerCase().includes(searchTerm);
        const matchingChildren = (module.children || [])
          .filter(app => hasAppAccess(module.code, app.code) && app.name.toLowerCase().includes(searchTerm))
          .map(app => ({ ...app, isModule: false, moduleName: module.name, moduleIcon: module.icon }));

        if (isModuleMatch) {
          results.push({ ...module, isModule: true });
        }
        results.push(...matchingChildren);
      }
    });
    return results;
  })();

  if (isLoadingUser) return <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">Loading...</div>;

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] overflow-hidden font-['Inter']">
      
      {/* SIDEBAR */}
      <div className={`${isCollapsed ? 'w-[72px]' : 'w-[240px]'} transition-all duration-300 bg-[#F8F9FA] flex flex-col relative z-20 border-r border-gray-200`}>
        <div className="h-[90px] flex items-center justify-center px-4 overflow-hidden">
          <img
            src={isCollapsed ? miniLogo : logo}
            alt="ROX Lease"
            className={`transition-all duration-300 ${
              isCollapsed ? "w-8 h-8" : "h-10 object-contain"
            }`}
          />
        </div>

        <div className="px-4 mb-6">
          <div className="relative flex items-center">
            <svg className="w-4 h-4 text-gray-400 absolute left-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder={isCollapsed ? "" : "Search"} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-[36px] bg-white border border-gray-200 rounded-[4px] outline-none text-[14px] transition-all ${isCollapsed ? 'pl-8 pr-2 transparent text-transparent cursor-pointer' : 'pl-9 pr-3'}`} 
            />
          </div>
        </div>

        {/* RENDER MENU */}
        <div className="flex-1 overflow-y-auto px-2">
          {menuToRender.length > 0 
            ? menuToRender.map((item, index) => (
              <NavLink
                key={`${item.path}-${index}`}
                to={item.path}
                onClick={isSearching ? () => setSearchQuery('') : undefined}
                className={({ isActive }) => {
                  const active = (item.isModule && item.path !== '/dashboard' && location.pathname.startsWith(item.path)) || isActive;
                  return `flex items-center h-[48px] px-3 mb-1 rounded-[6px] cursor-pointer transition-colors ${active ? 'text-[#E32128] font-semibold bg-red-50' : 'text-[#323842] hover:bg-gray-100 font-medium'}`
                }}
                title={isCollapsed ? item.name : ""}
              >
                {({ isActive }) => {
                  const active = (item.isModule && item.path !== '/dashboard' && location.pathname.startsWith(item.path)) || isActive;
                  return (
                    <>
                      <svg className={`w-5 h-5 min-w-[20px] ${active ? 'stroke-[#E32128]' : 'stroke-[#565E6C]'}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {item.isModule === false ? item.moduleIcon : item.icon}
                      </svg>
                      {!isCollapsed && (
                        <div className="ml-4 flex flex-col justify-center overflow-hidden">
                          <span className="text-[15px] whitespace-nowrap leading-tight truncate">{item.name}</span>
                          {item.isModule === false && <span className="text-[11px] text-gray-500 leading-tight">{item.moduleName}</span>}
                        </div>
                      )}
                    </>
                  )
                }}
              </NavLink>
            ))
            : isSearching && <div className="text-center text-gray-500 text-sm px-4 py-2">No results found.</div>
          }
        </div>

        <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full h-[50px] bg-[#E32128] text-white flex items-center justify-center hover:bg-[#C11C22] transition-colors">
          <svg className={`w-5 h-5 fill-white transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
        </button>
      </div>

      {/* VÙNG BÊN PHẢI */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="w-full h-[70px] bg-[#F8F9FA] flex items-center justify-end px-8 shrink-0 relative border-b border-gray-100">
          
          <div className="text-[15px] font-medium text-[#171A1F] mr-4">
            {currentUser?.fullName || currentUser?.username || 'User'}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="relative w-[40px] h-[40px] bg-[#F5A623] rounded-full flex items-center justify-center mr-4 focus:outline-none">
               <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
               <div className="absolute bottom-0 right-0 w-[12px] h-[12px] bg-[#1DD75B] rounded-full border-[2px] border-white"></div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-4 top-[50px] w-[180px] bg-white rounded-[8px] shadow-lg border border-gray-100 py-2 z-50">
                <button onClick={handleGoToProfile} className="w-full px-4 py-2 text-left text-[14px] text-[#323842] flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  My profile
                </button>
                <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-[14px] text-[#323842] flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Log out
                </button>
              </div>
            )}
          </div>
          <button className="w-[28px] h-[28px] bg-[#4A90E2] rounded-full flex items-center justify-center text-white text-[14px] font-bold hover:bg-[#357ABD] transition-colors">?</button>
        </div>

        <div className="flex-1 overflow-auto bg-[#F8F9FA]">
          <Outlet context={{ currentUser }} /> 
        </div>
      </div>

    </div>
  );
};

export default DashboardLayout;