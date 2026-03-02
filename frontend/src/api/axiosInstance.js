import axios from 'axios';

// Khởi tạo một instance của axios với các cấu hình mặc định
const axiosInstance = axios.create({
  // Địa chỉ gốc của backend Spring Boot
  baseURL: 'http://localhost:8080/api', 
  timeout: 10000, // Thời gian chờ tối đa (10 giây)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Can thiệp TRƯỚC khi request được gửi đi
axiosInstance.interceptors.request.use(
  (config) => {
    // Lấy chuỗi JWT từ localStorage
    const token = localStorage.getItem('jwt_token');
    
    // Nếu có token, tự động đính kèm vào header Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Can thiệp SAU khi nhận phản hồi từ backend
axiosInstance.interceptors.response.use(
  (response) => {
    // Nếu request thành công, trả về dữ liệu bình thường
    return response; 
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      
      // Lỗi 401 (Unauthorized): JWT hết hạn, sai hoặc không tồn tại
      if (status === 401) {
        console.error('Phiên đăng nhập hết hạn hoặc không hợp lệ.');
        // Xóa token cũ
        localStorage.removeItem('jwt_token');
        
        // Đá người dùng về lại trang đăng nhập
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'; 
        }
      }
      
      // Lỗi 403 (Forbidden): Đã đăng nhập nhưng Role không đủ quyền
      if (status === 403) {
        console.error('Bạn không có quyền truy cập chức năng này.');
        // TODO: Có thể hiển thị một thông báo Toast (ví dụ: react-toastify) cho khách hàng biết
      }
    }
    
    return Promise.reject(error);
  }
);

  const handleSave = async (e) => {
  e.preventDefault();
  try {
    await axiosInstance.post('/auth/change-password', {
      currentPassword: formData.current,
      newPassword: formData.new
    });
    
    setNotification({ show: true, type: 'success', message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại!' });
    // Logout ngay lập tức để áp dụng mật khẩu mới
    setTimeout(() => {
       localStorage.removeItem('token');
       window.location.href = '/login';
    }, 2000);

  } catch (error) {
    const errorMsg = error.response?.data?.error;
    if (errorMsg === "WRONG_CURRENT_PASSWORD") {
       setNotification({ show: true, type: 'error', message: 'Mật khẩu hiện tại không đúng!' });
    } else {
       setNotification({ show: true, type: 'error', message: 'Định dạng mật khẩu không hợp lệ hoặc lỗi server.' });
    }
  }
};

export default axiosInstance;