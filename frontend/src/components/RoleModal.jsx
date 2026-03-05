import React, { useState, useEffect } from "react";

export default function RoleModal({ isOpen, onClose, onSave, mode, initialData }) {
  const [formData, setFormData] = useState({ roleName: "", description: "", isSystem: false });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (mode === "EDIT" && initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({ roleName: "", description: "", isSystem: false });
      }
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: false });
  };

  const handleSave = () => {
    if (!formData.roleName.trim()) {
      setErrors({ roleName: true });
      return;
    }
    // Chuyển roleName về định dạng in hoa chuẩn
    const processedData = {
      ...formData,
      roleName: formData.roleName.toUpperCase()
    };
    onSave(processedData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 font-sans px-4">
      <div className="bg-white w-[600px] rounded-lg shadow-lg overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-[#EFB034] flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-bold text-black uppercase tracking-tight">
            {mode === "ADD" ? "Add New Role" : "Edit Role"}
          </h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black font-bold text-xl">✕</button>
        </div>

        {/* NỘI DUNG FORM */}
        <div className="p-8 flex flex-col gap-5 text-sm text-gray-700">
          <div>
            <label className="font-semibold text-gray-700">Role Name <span className="text-red-500">*</span></label>
            <input
              value={formData.roleName}
              onChange={(e) => handleChange('roleName', e.target.value)}
              placeholder="VD: SYSTEM_ADMIN"
              disabled={mode === "EDIT"}
              className={`mt-1 w-full border rounded px-3 py-2 outline-none uppercase transition-colors ${
                errors.roleName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100'
              }`}
            />
            {errors.roleName && <p className="text-red-500 text-xs mt-1">Vui lòng nhập Tên Role</p>}
          </div>

          <div>
            <label className="font-semibold text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Mô tả vai trò này làm gì..."
              rows={3}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-[#EFB034] resize-none"
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="isSystem"
              checked={formData.isSystem} 
              onChange={(e) => handleChange('isSystem', e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-[#DE3B40]"
            />
            <label htmlFor="isSystem" className="font-semibold text-gray-700 cursor-pointer">
              Đây là quyền hệ thống (System Role)?
            </label>
          </div>
        </div>

        {/* FOOTER NÚT BẤM */}
        <div className="flex justify-end gap-4 border-t p-6 bg-gray-50">
          <button onClick={onClose} className="px-6 py-2 rounded border border-gray-300 font-bold text-gray-600 hover:bg-gray-100 transition">Hủy</button>
          <button onClick={handleSave} className="px-6 py-2 rounded bg-[#DE3B40] font-bold text-white hover:bg-[#C12126] transition">
            {mode === "ADD" ? "Save Role" : "Update Role"}
          </button>
        </div>

      </div>
    </div>
  );
}