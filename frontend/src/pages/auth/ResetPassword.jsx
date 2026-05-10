import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import logo from '../../assets/login_logo.png';
import bg from '../../assets/login_bg.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage({ text: 'The reset token is missing from the URL.', type: 'error' });
      setIsValidating(false);
      return;
    }

    // Gửi request kiểm tra token lên backend ngay khi mở link
    axiosInstance.get(`/auth/validate-reset-token?token=${token}`)
      .then(() => setIsTokenValid(true))
      .catch((error) => setMessage({ text: error.response?.data?.error || error.response?.data?.message || 'The reset link is invalid or has expired.', type: 'error' }))
      .finally(() => setIsValidating(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    // Kiểm tra định dạng mật khẩu tương tự như AuthService.java
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordPattern.test(newPassword)) {
      setMessage({ text: 'Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Gọi API reset password (bạn cần đảm bảo Backend Controller có expose endpoint này)
      await axiosInstance.post('/auth/reset-password', { token, newPassword });
      setMessage({ text: 'Your password has been reset successfully. Redirecting to login...', type: 'success' });
      
      // Đợi 2.5 giây cho người dùng đọc thông báo rồi điều hướng về Login
      setTimeout(() => navigate('/login'), 2500);
    } catch (error) {
      setMessage({ text: error.response?.data?.error || error.response?.data?.message || 'An error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen font-sans">
      <div className="w-1/2 relative bg-gray-50 flex flex-col justify-center items-center">
        <div className="w-full h-full absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}></div>
      </div>
      <div className="w-1/2 flex flex-col justify-center items-center bg-white p-12">
        <div className="w-full max-w-[450px]">
          <img src={logo} alt="ROX Lease" className="h-12 mb-8" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Create New Password</h2>
          <p className="text-gray-500 mb-8">Please enter your new strong password below.</p>

          {message.text && (
            <div className={`p-4 mb-6 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {message.text}
            </div>
          )}

        {isValidating ? (
          <div className="text-center text-gray-500 font-semibold mb-4">Verifying your secure link...</div>
        ) : !isTokenValid ? (
          <></>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">New Password <span className="text-red-500">*</span></label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Enter new password..." disabled={!token || loading} className="w-full border border-gray-300 rounded px-4 py-3 outline-none focus:border-red-500 transition-colors" />
            </div>
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Confirm Password <span className="text-red-500">*</span></label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm new password..." disabled={!token || loading} className="w-full border border-gray-300 rounded px-4 py-3 outline-none focus:border-red-500 transition-colors" />
            </div>
            <button type="submit" disabled={loading || !token} className="w-full bg-[#E32128] text-white font-bold py-3 rounded mt-2 hover:bg-[#C11C22] transition disabled:opacity-70">
              {loading ? 'Processing...' : 'Reset Password'}
            </button>
          </form>
        )}
        
        <button type="button" onClick={() => navigate('/login')} className="w-full text-gray-600 font-semibold mt-6 hover:text-red-500 transition">
          Back to Login
        </button>
        </div>
      </div>
    </div>
  );
}