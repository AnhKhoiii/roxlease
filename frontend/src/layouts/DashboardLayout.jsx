import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; 
import logo from '../assets/login_logo.png';

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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
    { 
      name: 'Home', 
      path: '/dashboard', 
      permissions: ['VIEW_DASHBOARD'],
      icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path> 
    },
    { 
      name: 'Space', 
      path: '/space', 
      permissions: ['VIEW_SPACE', 'MANAGE_SPACE'], 
      icon: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m-1 4h1m-1-4h1m-1-4h1m-1-4h1"></path> 
    },
    { 
      name: 'Lease', 
      path: '/lease', 
      permissions: ['VIEW_LEASE', 'MANAGE_LEASE'], 
      icon: <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path> 
    },
    { 
      name: 'Cost', 
      path: '/cost', 
      permissions: ['VIEW_COST', 'MANAGE_COST'], 
      icon: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path> 
    },
    { 
      name: 'Service desk', 
      path: '/servicedesk', 
      permissions: ['VIEW_SERVICE_DESK', 'MANAGE_SERVICE_DESK'], 
      icon: <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path> 
    },
    { 
      name: 'System', 
      path: '/system', 
      permissions: ['MANAGE_SYSTEM', 'MANAGE_ROLE', 'MANAGE_USER'],
      icon: <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path> 
    },
  ];

  // LỌC MENU DỰA TRÊN PERMISSIONS
  const visibleMenuItems = menuItems.filter(item => {
    // Nếu chưa load xong hoặc user không có mảng permissions -> Ẩn
    if (!currentUser || !currentUser.permissions) return false;
    
    // Nếu user có ít nhất 1 permission trùng với mảng permissions yêu cầu của menu -> Hiện
    return item.permissions.some(requiredPerm => currentUser.permissions.includes(requiredPerm));
  });

  if (isLoadingUser) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#F8F9FA]">Đang tải dữ liệu người dùng...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] overflow-hidden font-['Inter']">
      
      {/* SIDEBAR */}
      <div className={`${isCollapsed ? 'w-[72px]' : 'w-[240px]'} transition-all duration-300 bg-[#F8F9FA] flex flex-col relative z-20 border-r border-gray-200`}>
        <div className="h-[90px] flex items-center justify-center px-4 overflow-hidden">
          <img
            src={logo}
            alt="ROX Lease"
            className={`transition-all duration-300 ${
              isCollapsed ? "w-8 h-8" : "h-10 object-contain"
            }`}
          />
        </div>

        <div className="px-4 mb-6">
          <div className="relative flex items-center">
            <svg className="w-4 h-4 text-gray-400 absolute left-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder={isCollapsed ? "" : "Search"} className={`w-full h-[36px] bg-white border border-gray-200 rounded-[4px] outline-none text-[14px] transition-all ${isCollapsed ? 'pl-8 pr-2 transparent text-transparent cursor-pointer' : 'pl-9 pr-3'}`} />
          </div>
        </div>

        {/* RENDER MENU SAU KHI ĐÃ LỌC */}
        <div className="flex-1 overflow-y-auto px-2">
          {visibleMenuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => `
                flex items-center h-[48px] px-3 mb-1 rounded-[6px] cursor-pointer transition-colors
                ${isActive ? 'text-[#E32128] font-semibold' : 'text-[#323842] hover:bg-gray-100 font-medium'}
              `}
              title={isCollapsed ? item.name : ""}
            >
              {({ isActive }) => (
                <>
                  <svg className={`w-5 h-5 min-w-[20px] ${isActive ? 'stroke-[#E32128]' : 'stroke-[#565E6C]'}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                  {!isCollapsed && <span className="ml-4 text-[15px] whitespace-nowrap">{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
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

        <div className="flex-1 overflow-auto p-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;