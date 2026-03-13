import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import logo from '../assets/login_logo.png';
import bg from '../assets/login_bg.png';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setMessage({ text: 'Confirm password does not match!', type: 'error' });
    }
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await axiosInstance.post('/auth/reset-password', { token, newPassword: password });
      setMessage({ text: 'Password reset successfully! Redirecting in 3 seconds...', type: 'success' });
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      setMessage({ text: error.response?.data?.error || 'Invalid or expired reset link.', type: 'error' });
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
          <p className="text-gray-500 mb-8">Please enter your new password below.</p>

          {!token ? (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded">Invalid or expired reset link. Please check the link in your email.</div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {message.text && (
                <div className={`p-4 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {message.text}
                </div>
              )}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">New Password <span className="text-red-500">*</span></label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters, 1 uppercase, 1 number, 1 special character" className="w-full border border-gray-300 rounded px-4 py-3 outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Confirm Password <span className="text-red-500">*</span></label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirm your new password..." className="w-full border border-gray-300 rounded px-4 py-3 outline-none focus:border-red-500 transition-colors" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#E32128] text-white font-bold py-3 rounded mt-2 hover:bg-[#C11C22] transition disabled:opacity-70">
                {loading ? 'Processing...' : 'Confirm Password Change'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}