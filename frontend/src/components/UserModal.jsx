import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

export default function UserModal({ isOpen, onClose, onSave, mode, initialData }) {
  // --- QUẢN LÝ DỮ LIỆU FORM ---
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    company: "",
    department: "",
    roleName: "", // SỬA: Đổi role thành roleName
    email: "",
    status: "Active",
    phone: "",
    employeeTitle: "",
    dob: "",
    manager: "",
    gender: "",
    vpaSite: "", 
    failedAttempts: 0
  });

  // --- LƯU DANH SÁCH ROLE TỪ DATABASE ---
  const [roles, setRoles] = useState([]);

  // --- FETCH DANH SÁCH ROLE KHI MỞ MODAL ---
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get('/roles');
        setRoles(response.data); 
      } catch (error) {
        console.error("Lỗi khi lấy danh sách Role:", error);
      }
    };

    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen]);

  // --- CẬP NHẬT DỮ LIỆU KHI MỞ MODAL (ADD / EDIT) ---
  useEffect(() => {
    if (isOpen) {
      if (mode === "EDIT" && initialData) {
        // Đổ dữ liệu cũ vào form nếu đang ở chế độ EDIT
        setFormData({ 
          ...initialData, 
          password: "",
          fullName: initialData.fullName || initialData.fullname || "",
          roleName: initialData.roleName || "", // SỬA: Đảm bảo lấy đúng roleName
          // SỬA LỖI: Nếu vpaSite từ backend trả về là mảng, chuyển nó thành chuỗi để hiển thị trên input
          vpaSite: Array.isArray(initialData.vpaSite) ? initialData.vpaSite.join(', ') : (initialData.vpaSite || ""),
          failedAttempts: initialData.failedAttempts || 0
        }); 
      } else {
        // Reset form rỗng nếu ở chế độ ADD
        setFormData({
          username: "", password: "", fullName: "", company: "", department: "",
          roleName: "", email: "", status: "Active", phone: "", employeeTitle: "", // SỬA: role -> roleName
          dob: "", manager: "", gender: "", vpaSite: "", failedAttempts: 0
        });
      }
    }
  }, [isOpen, mode, initialData]);

  // Nếu modal không được mở thì không render gì cả
  if (!isOpen) return null;

  // --- HÀM XỬ LÝ LƯU (SAVE) ---
  const handleSave = (addAnother = false) => {
    // Validate cơ bản các trường bắt buộc
    if (!formData.username || !formData.roleName || (!formData.password && mode === "ADD")) { // SỬA: role -> roleName
      alert("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    // --- Tách chuỗi vpaSite ---
    const processedFormData = {
      ...formData,
      // SỬA LỖI: Kiểm tra an toàn trước khi split để tránh lỗi crash React
      vpaSite: typeof formData.vpaSite === 'string' && formData.vpaSite.trim() !== ""
        ? formData.vpaSite.split(',').map(site => site.trim()).filter(site => site !== "") 
        : (Array.isArray(formData.vpaSite) ? formData.vpaSite : [])
    };

    onSave(processedFormData, addAnother);
    
    // Nếu bấm "Save and add another", tự động reset form mà không đóng Modal
    if (addAnother) {
      setFormData({
        username: "", password: "", fullName: "", company: "", department: "",
        roleName: "", email: "", status: "Active", phone: "", employeeTitle: "", // SỬA: role -> roleName
        dob: "", manager: "", gender: "", vpaSite: "", failedAttempts: 0
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 font-sans">
      
      {/* Khung Modal */}
      <div className="bg-white w-[1100px] rounded-lg shadow-lg overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-yellow-500 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-black">
              {mode === "ADD" ? "Add new user" : "Edit user"}
            </h2>
            
            {/* Nút Save */}
            <button 
              onClick={() => handleSave(false)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-semibold transition-colors"
            >
              {mode === "ADD" ? "Save" : "Update"}
            </button>
            
            {/* Nút Save & Add Another (Chỉ hiện khi Add) */}
            {mode === "ADD" && (
              <button 
                onClick={() => handleSave(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded font-semibold transition-colors"
              >
                Save and add another
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-800 hover:text-black font-bold text-xl">
            ✕
          </button>
        </div>

        {/* NỘI DUNG FORM */}
        <div className="p-8 grid grid-cols-3 gap-x-10 gap-y-6 text-sm text-gray-700">
          
          {/* Username */}
          <div>
            <label className="font-semibold">User Name <span className="text-red-500">*</span></label>
            <input
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="UserName"
              disabled={mode === "EDIT"}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500 disabled:bg-gray-100"
            />
          </div>

          {/* Full name */}
          <div>
            <label className="font-semibold">Full name</label>
            <input
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              placeholder="Fullname"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Company */}
          <div>
            <label className="font-semibold">Company</label>
            <input
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              placeholder="Company"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="font-semibold">Role Name <span className="text-red-500">*</span></label>
            <select 
              value={formData.roleName} // SỬA: value đọc từ roleName
              onChange={(e) => setFormData({...formData, roleName: e.target.value})} // SỬA: cập nhật vào roleName
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500 bg-white"
            >
              <option value="">-- Select Role --</option>
              {roles.map((r, index) => (
                <option key={index} value={r.name || r.roleName}>
                  {r.name || r.roleName}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="font-semibold">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="abc@tnteco.vn"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Department */}
          <div>
            <label className="font-semibold">Department</label>
            <input
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              placeholder="Department"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="font-semibold">User password {mode === "ADD" && <span className="text-red-500">*</span>}</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={mode === "EDIT" ? "(Bỏ trống nếu không đổi)" : "Userpassword"}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="font-semibold">Phone</label>
            <input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+84123456789"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Employee title */}
          <div>
            <label className="font-semibold">Employee Title</label>
            <input
              value={formData.employeeTitle}
              onChange={(e) => setFormData({...formData, employeeTitle: e.target.value})}
              placeholder="Employee title"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Failed attempts */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="font-semibold text-gray-400">Failed attempts</label>
              <input
                value={formData.failedAttempts}
                disabled
                className="mt-1 w-full border border-red-200 rounded px-3 py-2 bg-gray-100 text-gray-500 text-center font-bold"
              />
            </div>
            <button 
              onClick={() => setFormData({...formData, failedAttempts: 0})}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded font-semibold transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Date of birth */}
          <div>
            <label className="font-semibold">Date of Birth</label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({...formData, dob: e.target.value})}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Manager */}
          <div>
            <label className="font-semibold">Manager</label>
            <input
              value={formData.manager}
              onChange={(e) => setFormData({...formData, manager: e.target.value})}
              placeholder="Manager"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="font-semibold">Gender</label>
            <select 
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500 bg-white"
            >
              <option value="">Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* VPA site */}
          <div>
            <label className="font-semibold">VPA site</label>
            <input
              value={formData.vpaSite}
              onChange={(e) => setFormData({...formData, vpaSite: e.target.value})}
              placeholder="VD: 90L, 80H"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500"
            />
            {/* Thêm dòng ghi chú nhỏ cho người dùng */}
            <p className="text-[12px] text-gray-500 mt-1 italic">
              Có thể nhập nhiều site, ngăn cách bởi dấu phẩy (,)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}