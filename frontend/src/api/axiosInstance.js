import axios from 'axios';

// Khởi tạo một instance của axios với các cấu hình mặc định
const axiosInstance = axios.create({
  // Địa chỉ gốc của backend Spring Boot
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 60000, // Thời gian chờ tối đa (10 giây)
  headers: {
    'Content-Type': 'application/json',

    'ngrok-skip-browser-warning': 'true'
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

export default axiosInstance;