import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

export default function UserModal({ isOpen, onClose, onSave, mode, initialData }) {
  // --- QUẢN LÝ DỮ LIỆU FORM ---
  const [formData, setFormData] = useState({
    username: "", password: "", fullName: "", company: "", department: "",
    roleName: "", email: "", status: "Active", phone: "", employeeTitle: "",
    dob: "", manager: "", gender: "", vpaSite: "", failedAttempts: 0
  });

  // --- QUẢN LÝ LỖI VALIDATION (TÔ ĐỎ) ---
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get('/roles');
        setRoles(response.data); 
      } catch (error) {
        console.error("Lỗi khi lấy danh sách Role:", error);
      }
    };
    if (isOpen) fetchRoles();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setErrors({}); 
      if (mode === "EDIT" && initialData) {
        setFormData({ 
          ...initialData, 
          password: "", // Xóa trắng password cũ
          fullName: initialData.fullName || initialData.fullname || "",
          roleName: initialData.roleName || "",
          dob: initialData.dob || "", 
          gender: initialData.gender || "", // Đảm bảo gender được map (MALE/FEMALE/OTHER)
          vpaSite: Array.isArray(initialData.vpaSite) ? initialData.vpaSite.join(', ') : (initialData.vpaSite || ""),
          failedAttempts: initialData.failedAttempts || 0,
          phone: initialData.phone || "",
          employeeTitle: initialData.employeeTitle || "",
          manager: initialData.manager || ""
        }); 
      } else {
        setFormData({
          username: "", password: "", fullName: "", company: "", department: "",
          roleName: "", email: "", status: "Active", phone: "", employeeTitle: "",
          dob: "", manager: "", gender: "", vpaSite: "", failedAttempts: 0
        });
      }
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  // --- HÀM CẬP NHẬT DỮ LIỆU VÀ XÓA LỖI ---
  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: false }); // Xóa viền đỏ khi người dùng bắt đầu nhập lại
    }
  };

  // --- HÀM XỬ LÝ LƯU (SAVE) ---
  const handleSave = (addAnother = false) => {
    // 1. KIỂM TRA ĐIỀU KIỆN (Trùng khớp với ràng buộc ở Backend)
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.username.trim() || formData.username.length < 4) newErrors.username = true;
    if (!formData.fullName.trim()) newErrors.fullName = true;
    if (!formData.roleName) newErrors.roleName = true;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = true;
    if (mode === "ADD" && (!formData.password || formData.password.length < 8)) newErrors.password = true;

    // Nếu có lỗi, cập nhật state errors để tô đỏ ô và dừng lại
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Dừng lại, KHÔNG gọi API
    }

    // 2. MAP DỮ LIỆU (Ép tên biến khớp 100% với CreateUserRequest.java)
    const processedFormData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      fullname: formData.fullName,   // Java cần chữ "fullname" viết thường
      roleName: formData.roleName,
      company: formData.company,
      department: formData.department,
      phone: formData.phone,
      employeeTitle: formData.employeeTitle,
      birthday: formData.dob ? formData.dob : null, // Java cần chữ "birthday"
      manager: formData.manager,
      gender: formData.gender ? formData.gender : null,
      vpasite: typeof formData.vpaSite === 'string' && formData.vpaSite.trim() !== "" // Java cần "vpasite"
        ? formData.vpaSite.split(',').map(site => site.trim()).filter(site => site !== "") 
        : (Array.isArray(formData.vpaSite) ? formData.vpaSite : [])
    };

    onSave(processedFormData, addAnother);
    
    if (addAnother) {
      setFormData({
        username: "", password: "", fullName: "", company: "", department: "",
        roleName: "", email: "", status: "Active", phone: "", employeeTitle: "",
        dob: "", manager: "", gender: "", vpaSite: "", failedAttempts: 0
      });
      setErrors({});
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 font-sans px-4">
      <div className="bg-white w-[1100px] rounded-lg shadow-lg overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-[#EFB034] flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-black uppercase tracking-tight">
              {mode === "ADD" ? "Add new user" : "Edit user"}
            </h2>
            <button onClick={() => handleSave(false)} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1 rounded font-semibold text-sm transition-all shadow-sm">
              {mode === "ADD" ? "Save" : "Update"}
            </button>
            {mode === "ADD" && (
              <button onClick={() => handleSave(true)} className="bg-[#DE3B40] hover:bg-[#C12126] text-white px-5 py-1 rounded font-semibold text-sm transition-all shadow-sm">
                Save and add another
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-700 hover:text-black font-bold text-xl">✕</button>
        </div>

        {/* NỘI DUNG FORM */}
        <div className="p-8 grid grid-cols-3 gap-x-10 gap-y-6 text-sm text-gray-700">
          
          {/* CỘT 1 */}
          <div className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700">User Name <span className="text-red-500">*</span></label>
              <input
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="UserName"
                disabled={mode === "EDIT"}
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors ${
                  errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100'
                }`}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">Bắt buộc & tối thiểu 4 ký tự</p>}
            </div>

            <div>
              <label className="font-semibold text-gray-700">Role Name <span className="text-red-500">*</span></label>
              <select 
                value={formData.roleName}
                onChange={(e) => handleChange('roleName', e.target.value)}
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors bg-white cursor-pointer ${
                  errors.roleName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034]'
                }`}
              >
                <option value="">-- Select Role --</option>
                {roles.map((r, index) => (
                  <option key={index} value={r.name || r.roleName}>{r.name || r.roleName}</option>
                ))}
              </select>
              {errors.roleName && <p className="text-red-500 text-xs mt-1">Vui lòng chọn Role</p>}
            </div>

            <div>
              <label className="font-semibold text-gray-700">User password {mode === "ADD" && <span className="text-red-500">*</span>}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={mode === "EDIT" ? "(Bỏ trống nếu không đổi)" : "Userpassword"}
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors ${
                  errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034]'
                }`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">Bắt buộc & tối thiểu 8 ký tự</p>}
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="font-semibold text-gray-400">Failed attempts</label>
                <input value={formData.failedAttempts} disabled className="mt-1 w-full border border-red-100 rounded px-3 py-2 bg-gray-50 text-gray-500 font-bold text-center" />
              </div>
              <button onClick={() => setFormData({...formData, failedAttempts: 0})} className="bg-[#379AE6] hover:bg-[#2d82c2] text-white px-4 py-2 rounded font-semibold text-xs h-[38px] transition-colors">
                Reset
              </button>
            </div>
          </div>

          {/* CỘT 2 */}
          <div className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700">Full name <span className="text-red-500">*</span></label>
              <input
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Fullname"
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors ${
                  errors.fullName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034]'
                }`}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">Vui lòng nhập Họ tên</p>}
            </div>

            <div>
              <label className="font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="abc@tnteco.vn"
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors ${
                  errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034]'
                }`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">Vui lòng nhập đúng định dạng Email</p>}
            </div>

            <div>
              <label className="font-semibold text-gray-700">Phone</label>
              <input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+84123456789"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034] uppercase"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Gender</label>
              <select 
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034] bg-white cursor-pointer"
              >
                <option value="">Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* CỘT 3 */}
          <div className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700">Company</label>
              <input
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Company"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Department</label>
              <input
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="Department"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Employee Title</label>
              <input
                value={formData.employeeTitle}
                onChange={(e) => handleChange('employeeTitle', e.target.value)}
                placeholder="Employee title"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Manager</label>
              <input
                value={formData.manager}
                onChange={(e) => handleChange('manager', e.target.value)}
                placeholder="Manager"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034]"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">VPA site</label>
              <input
                value={formData.vpaSite}
                onChange={(e) => handleChange('vpaSite', e.target.value)}
                placeholder="VD: 90L, 80H"
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034]"
              />
              <p className="text-[12px] text-gray-500 mt-1 italic">Có thể nhập nhiều site, ngăn cách bởi dấu phẩy (,)</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}