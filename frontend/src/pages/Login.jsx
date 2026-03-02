import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Bạn nhớ đưa file ảnh nền vào thư mục src/assets nhé
import backgroundImage from '../assets/login_bg.png'; 
// Đưa file logo ROX Lease (dạng SVG hoặc PNG nền trong suốt) vào assets
import logoImage from '../assets/login_logo.png'; 

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); 
    
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ Username và Password.');
      return;
    }

    setIsLoading(true);

    try {
      // Gọi API đến Spring Boot Backend
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password
      });

      const token = response.data.token; 
      localStorage.setItem('jwt_token', token);
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Lỗi đăng nhập:', err);
      if (err.response) {
        const status = err.response.status;
        const errorMessage = err.response.data?.message || err.response.data?.error || '';
        const errorString = String(errorMessage).toLowerCase();

        if (status === 403 || errorString.includes('lock')) {
          setIsLocked(true);
        } else if (status === 401) {
          if (errorString.includes('lock')) {
            setIsLocked(true);
          } else {
            setError('Sai Username hoặc Password.');
          }
        } else {
          setError('Máy chủ không phản hồi, vui lòng thử lại sau.');
        }
      } else {
        setError('Không thể kết nối đến máy chủ.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-['Inter'] overflow-hidden">
      
      {/* 1. Ảnh nền Full màn hình */}
      <img 
        src={backgroundImage} 
        alt="ROX Lease Background" 
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* 2. Dòng Copyright góc dưới trái */}
      <div className="absolute bottom-4 left-6 z-10 text-white/70 text-[12px]">
        © 2026 All Rights Reserved - ROX
      </div>

      {/* 3. KHUNG LOGIN (Hiệu ứng Glassmorphism) */}
      <div className="relative z-10 w-[550px] p-[50px] bg-white/70 backdrop-blur-md rounded-[12px] shadow-2xl flex flex-col items-center border border-white/40">
        
        {/* Logo ROX Lease */}
        <div className="w-[280px] h-[70px] mb-[40px] flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="ROX Lease Logo" 
            className="max-w-full max-h-full object-contain" 
          />
        </div>

        <form className="flex flex-col w-full" onSubmit={handleLogin}>
          
          {/* Label & Input Username */}
          <div className="mb-[20px] w-full">
             <label className="block text-[#323842] text-[14px] font-semibold mb-[8px]">Username</label>
             <input 
                type="text"
                placeholder="e.g. username@tnteco.com"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if(error) setError(''); 
                }}
                disabled={isLoading}
                className={`w-full h-[48px] px-[16px] text-[15px] bg-white border ${error ? 'border-[#DE3B40]' : 'border-[#BCC1CA]'} rounded-[24px] outline-none transition-colors hover:border-[#A7ADB7] focus:border-[#E32128]`}
             />
          </div>

          {/* Label & Input Password */}
          <div className="mb-[15px] w-full">
             <label className="block text-[#323842] text-[14px] font-semibold mb-[8px]">Password</label>
             <input 
                type="password"
                autoComplete="current-password"
                placeholder="enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if(error) setError(''); 
                }}
                disabled={isLoading}
                className={`w-full h-[48px] px-[16px] text-[15px] bg-white border ${error ? 'border-[#DE3B40]' : 'border-[#BCC1CA]'} rounded-[24px] outline-none transition-colors hover:border-[#A7ADB7] focus:border-[#E32128]`}
             />
          </div>

          {/* Dòng báo lỗi */}
          <div className="h-[20px] mb-[10px] flex items-center">
            {error && (
              <span className="text-[14px] text-[#E32128] font-medium">{error}</span>
            )}
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex justify-between items-center w-full mb-[30px]">
            <div className="flex items-center gap-2">
               {/* Custom Checkbox màu đỏ */}
               <input 
                 type="checkbox" 
                 id="remember" 
                 className="w-[18px] h-[18px] cursor-pointer accent-[#E32128] border-gray-300 rounded" 
               />
               <label htmlFor="remember" className="text-[14px] text-[#E32128] cursor-pointer font-bold">
                 Remember me?
               </label>
            </div>
            <a href="/forgot-password" className="text-[14px] font-bold text-[#E32128] hover:underline transition-all">
              Forgot Password?
            </a>
          </div>

          {/* Nút Continue */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full h-[48px] bg-[#E32128] text-white text-[16px] font-bold rounded-[24px] flex justify-center items-center hover:bg-[#C11C22] active:bg-[#A3181D] disabled:opacity-60 transition-colors cursor-pointer shadow-md"
          >
            {isLoading ? 'Processing...' : 'Continue'}
          </button>
        </form>
      </div>

      {/* Popup báo khóa tài khoản (giữ nguyên logic cũ) */}
      {isLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171a1f]/60 backdrop-blur-sm">
          <div className="w-[500px] p-8 bg-white rounded-[16px] shadow-2xl flex flex-col items-center relative">
            <button onClick={() => setIsLocked(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            <div className="text-red-500 mb-4">
               {/* Icon Lock */}
               <svg className="w-20 h-20 fill-current" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm-3 5c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm9 13H6v-8h12v8z"/></svg>
            </div>
            <div className="text-center text-[#323842] text-[24px] font-bold">Tài khoản của bạn đã bị khóa</div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;