import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";

export default function UserModal({ isOpen, onClose, onSave, mode, initialData, canEdit }) {
  const [formData, setFormData] = useState({
    username: "", password: "", fullName: "", company: "", department: "",
    roleName: "", email: "", status: "Active", phone: "", employeeTitle: "",
    dob: "", manager: "", gender: "", vpaSite: "", failedAttempts: 0
  });

  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axiosInstance.get('/roles');
        setRoles(response.data); 
      } catch (error) {
        console.error("Error getting roles:", error);
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
          password: "",
          fullName: initialData.fullName || initialData.fullname || "",
          roleName: initialData.roleName || "",
          dob: initialData.dob || "", 
          gender: initialData.gender || "",
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

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: false }); 
    }
  };

  const handleSave = (addAnother = false) => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.username.trim() || formData.username.length < 4) newErrors.username = true;
    if (!formData.fullName.trim()) newErrors.fullName = true;
    if (!formData.roleName) newErrors.roleName = true;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = true;
    if (mode === "ADD" && (!formData.password || formData.password.length < 8)) newErrors.password = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const processedFormData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      fullname: formData.fullName,  
      roleName: formData.roleName,
      company: formData.company,
      department: formData.department,
      phone: formData.phone,
      employeeTitle: formData.employeeTitle,
      birthday: formData.dob ? formData.dob : null,
      manager: formData.manager,
      gender: formData.gender ? formData.gender : null,
      vpasite: typeof formData.vpaSite === 'string' && formData.vpaSite.trim() !== ""
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
        
        <div className="bg-[#EFB034] flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-black uppercase tracking-tight">
              {mode === "ADD" ? "Add new user" : (!canEdit ? "View user details" : "Edit user")}
            </h2>
            
            {canEdit && (
              <>
                <button onClick={() => handleSave(false)} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1 rounded font-semibold text-sm transition-all shadow-sm">
                  {mode === "ADD" ? "Save" : "Update"}
                </button>
                {mode === "ADD" && (
                  <button onClick={() => handleSave(true)} className="bg-[#DE3B40] hover:bg-[#C12126] text-white px-5 py-1 rounded font-semibold text-sm transition-all shadow-sm">
                    Save and add another
                  </button>
                )}
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-700 hover:text-black font-bold text-xl">✕</button>
        </div>

        <div className="p-8 grid grid-cols-3 gap-x-10 gap-y-6 text-sm text-gray-700">
          
          <div className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700">User Name <span className="text-red-500">*</span></label>
              <input
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                disabled={mode === "EDIT" || !canEdit} 
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors ${
                  errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed'
                }`}
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700">Role Name <span className="text-red-500">*</span></label>
              <select 
                value={formData.roleName}
                onChange={(e) => handleChange('roleName', e.target.value)}
                disabled={!canEdit}
                className={`mt-1 w-full border rounded px-3 py-2 outline-none transition-colors bg-white ${
                  errors.roleName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed'
                }`}
              >
                <option value="">-- Select Role --</option>
                {roles.map((r, index) => (
                  <option key={index} value={r.name || r.roleName}>{r.name || r.roleName}</option>
                ))}
              </select>
            </div>

            {canEdit && (
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
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="font-semibold text-gray-400">Failed attempts</label>
                <input value={formData.failedAttempts} disabled className="mt-1 w-full border border-red-100 rounded px-3 py-2 bg-gray-50 text-gray-500 font-bold text-center disabled:cursor-not-allowed" />
              </div>
              {canEdit && (
                <button onClick={() => setFormData({...formData, failedAttempts: 0})} className="bg-[#379AE6] hover:bg-[#2d82c2] text-white px-4 py-2 rounded font-semibold text-xs h-[38px] transition-colors">
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700">Full name <span className="text-red-500">*</span></label>
              <input value={formData.fullName} disabled={!canEdit} onChange={(e) => handleChange('fullName', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Email <span className="text-red-500">*</span></label>
              <input type="email" value={formData.email} disabled={!canEdit} onChange={(e) => handleChange('email', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Phone</label>
              <input value={formData.phone} disabled={!canEdit} onChange={(e) => handleChange('phone', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Date of Birth</label>
              <input type="date" value={formData.dob} disabled={!canEdit} onChange={(e) => handleChange('dob', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none uppercase disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Gender</label>
              <select value={formData.gender} disabled={!canEdit} onChange={(e) => handleChange('gender', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed">
                <option value="">Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="font-semibold text-gray-700">Company</label>
              <input value={formData.company} disabled={!canEdit} onChange={(e) => handleChange('company', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Department</label>
              <input value={formData.department} disabled={!canEdit} onChange={(e) => handleChange('department', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Employee Title</label>
              <input value={formData.employeeTitle} disabled={!canEdit} onChange={(e) => handleChange('employeeTitle', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">Manager</label>
              <input value={formData.manager} disabled={!canEdit} onChange={(e) => handleChange('manager', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="font-semibold text-gray-700">VPA site</label>
              <input value={formData.vpaSite} disabled={!canEdit} onChange={(e) => handleChange('vpaSite', e.target.value)} className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}