import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const Profile = () => {
  const navigate = useNavigate();
  
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [formData, setFormData] = useState({ current: '', new: '', confirm: '' });
  
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const toggleVisibility = (field) => {
    setShowPwd(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(password);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setNotification({ show: false, type: '', message: '' });

    if (formData.new !== formData.confirm) {
      setNotification({ 
        show: true, 
        type: 'error', 
        message: 'Comfirm password does not match the new password!' 
      });
      return;
    }

    if (!validatePassword(formData.new)) {
      setNotification({ 
        show: true, 
        type: 'error', 
        message: 'New password does not meet the required format!' 
      });
      return;
    }

    try {
      await axiosInstance.post('/auth/change-password', {
        currentPassword: formData.current,
        newPassword: formData.new
      });

      setNotification({ 
        show: true, 
        type: 'success', 
        message: 'Change password successfully! Please log in again with your new password.' 
      });

      setFormData({ current: '', new: '', confirm: '' });

      setTimeout(() => {
        localStorage.removeItem('jwt_token');
        navigate('/login');
      }, 2500);

    } catch (error) {
      const backendError = error.response?.data?.error || '';
      
      if (backendError === "WRONG_CURRENT_PASSWORD") {
        setNotification({ 
          show: true, 
          type: 'error', 
          message: 'Current password is incorrect. Please check again!' 
        });
      } else if (error.response?.status === 403) {
        setNotification({ 
          show: true, 
          type: 'error', 
          message: 'Session has expired or you do not have permission to perform this action.' 
        });
      } else {
        setNotification({ 
          show: true, 
          type: 'error', 
          message: backendError || 'An error occurred while changing password.' 
        });
      }
    }
  };

  return (
    <div className="p-[48px] font-['Inter'] bg-white min-h-full">
      <h1 className="text-[48px] font-bold text-[#E32128] mb-[48px]">My profile</h1>
      
      <div className="flex gap-[40px] items-start">
        {/* SIDEBAR PHỤ */}
        <div className="w-[280px] flex flex-col bg-[#F8F9FA] rounded-[8px] overflow-hidden">
          <div className="p-4 text-[#565E6C] flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[16px]">Information</span>
          </div>
          <div className="p-4 bg-[#FFEAEA] text-[#E32128] font-bold flex items-center gap-3 border-l-4 border-[#E32128]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            <span className="text-[16px]">Change password</span>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH */}
        <div className="flex-1 max-w-[850px]">
          {notification.show && (
            <div className={`mb-8 p-4 rounded-[8px] border flex items-center justify-between ${
                notification.type === 'success' ? 'bg-[#F1F9F4] border-[#1DD75B] text-[#1DD75B]' : 'bg-[#FFF0F0] border-[#DE3B40] text-[#DE3B40]'
            }`}>
                <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">{notification.type === 'success' ? '✓' : '✕'}</span>
                    <span className="text-[16px] font-medium">{notification.message}</span>
                </div>
                <button onClick={() => setNotification({ ...notification, show: false })} className="text-current opacity-60">✕</button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Đã xóa dấu * ra khỏi chuỗi label */}
            {[
              { id: 'current', label: 'Current password', placeholder: 'Current Password' },
              { id: 'new', label: 'New Password', placeholder: 'New Password' },
              { id: 'confirm', label: 'Confirm Password', placeholder: 'Confirm Password' }
            ].map((field) => (
              <div key={field.id} className="bg-[#F8F9FA] p-6 rounded-[8px] flex items-center">
                {/* Đã thêm thẻ span chứa dấu * với màu đỏ */}
                <label className="w-[240px] text-[18px] font-bold text-[#323842]">
                  {field.label} <span className="text-[#E32128]">*</span>
                </label>
                <div className="relative flex-1">
                  <input 
                    type={showPwd[field.id] ? 'text' : 'password'}
                    placeholder={field.placeholder}
                    value={formData[field.id]}
                    onChange={(e) => {
                        setFormData({ ...formData, [field.id]: e.target.value });
                        if(notification.show) setNotification({...notification, show: false});
                    }}
                    required
                    className="w-full h-[48px] px-4 pr-12 border border-[#BCC1CA] rounded-[6px] outline-none focus:border-[#E32128] transition-colors"
                  />
                  <button 
                    type="button"
                    onClick={() => toggleVisibility(field.id)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#DE3B40] hover:text-[#C11C22]"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      {showPwd[field.id] 
                        ? <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        : <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.74-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.03 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.34-1.2l3.33 3.33c-.11-.12-.23-.23-.33-.33V9h-3V8.6z"/>
                      }
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              type="submit"
              className="mt-[40px] px-[40px] py-[12px] bg-[#E32128] text-white text-[18px] font-bold rounded-[8px] hover:bg-[#C11C22] active:bg-[#A3181D] transition-all shadow-md"
            >
              Save
            </button>
          </form>
        </div>

        {/* CỘT ĐIỀU KIỆN MẬT KHẨU */}
        <div className="w-[320px] bg-[#F1F4F9] p-6 rounded-[12px] border border-[#DDE1E6]">
          <h3 className="text-[16px] font-bold text-[#323842] mb-3">Please ensure that:</h3>
          <ul className="space-y-2 text-[14px] text-[#565E6C]">
            <li className="flex gap-2"><span>•</span> It contains at least 8 characters</li>
            <li className="flex gap-2"><span>•</span> It includes at least 1 uppercase letter</li>
            <li className="flex gap-2"><span>•</span> It includes at least 1 number</li>
            <li className="flex gap-2"><span>•</span> It includes at least 1 special character (e.g., ! @ # $ % ^ & *)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Profile;