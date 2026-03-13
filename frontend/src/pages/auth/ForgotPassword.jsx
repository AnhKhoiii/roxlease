import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import logo from '../assets/login_logo.png';
import bg from '../assets/login_bg.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await axiosInstance.post('/auth/forgot-password', { email });
      setMessage({ text: 'Link to reset password has been sent to your email.', type: 'success' });
    } catch (error) {
      setMessage({ text: error.response?.data?.error || 'An error occurred', type: 'error' });
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
          <p className="text-gray-500 mb-8">Enter your email to receive a link to reset your password.</p>

          {message.text && (
            <div className={`p-4 mb-6 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Nhập địa chỉ email..." className="w-full border border-gray-300 rounded px-4 py-3 outline-none focus:border-red-500 transition-colors" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#E32128] text-white font-bold py-3 rounded mt-2 hover:bg-[#C11C22] transition disabled:opacity-70">
              {loading ? 'Đang gửi...' : 'Gửi đường link'}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="w-full text-gray-600 font-semibold mt-2 hover:text-red-500 transition">
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}