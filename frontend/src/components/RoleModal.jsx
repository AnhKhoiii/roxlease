import React, { useState, useEffect } from "react";

export default function RoleModal({ isOpen, onClose, onSave, mode, initialData, canEdit }) {
  const [formData, setFormData] = useState({
    roleName: "",
    roleTitle: "", 
    vpaRestriction: "",
    isSystem: false // Thêm state quản lý isSystem
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (mode === "EDIT" && initialData) {
        setFormData({
          roleName: initialData.roleName || "",
          roleTitle: initialData.description || initialData.roleTitle || "",
          vpaRestriction: initialData.vpaRestriction ? JSON.stringify(initialData.vpaRestriction, null, 2) : "",
          isSystem: initialData.isSystem || false // Đổ dữ liệu isSystem cũ vào
        });
      } else {
        setFormData({ roleName: "", roleTitle: "", vpaRestriction: "", isSystem: false });
      }
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: false });
  };

  const handleSave = () => {
    const newErrors = {};
    if (!formData.roleName.trim()) newErrors.roleName = true;
    if (!formData.roleTitle.trim()) newErrors.roleTitle = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dataToSave = {
      roleName: formData.roleName.toUpperCase(),
      description: formData.roleTitle,
      vpaRestriction: formData.vpaRestriction ? formData.vpaRestriction : null,
      isSystem: formData.isSystem // Gửi isSystem lên Backend
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/20" onClick={onClose}></div>

      <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* HEADER */}
        <div className="bg-[#EFB034] h-[100px] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold text-black tracking-tight">
              {/* Đổi tiêu đề nếu chỉ có quyền VIEW */}
              {mode === "ADD" ? "Add new role" : (!canEdit ? "View role details" : "Edit role")}
            </h2>
            
            {/* ẨN NÚT SAVE NẾU KHÔNG CÓ QUYỀN EDIT */}
            {canEdit && (
              <button onClick={handleSave} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1 rounded font-bold text-sm transition-all shadow-md">
                Save
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-gray-700">
             <button onClick={onClose} className="hover:text-black font-bold text-2xl">✕</button>
          </div>
        </div>

        {/* FORM NHẬP LIỆU - THÊM disabled={!canEdit} */}
        <div className="p-10 flex flex-col gap-8 overflow-y-auto">
          
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 text-[16px]">Role Name <span className="text-red-500">*</span></label>
            <input
              value={formData.roleName}
              onChange={(e) => handleChange('roleName', e.target.value)}
              disabled={mode === "EDIT" || !canEdit} // Khóa nếu là EDIT hoặc ko có quyền
              className={`w-[350px] border rounded px-3 py-2 outline-none transition-all ${
                errors.roleName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-yellow-500 disabled:bg-gray-100 disabled:text-gray-500 cursor-not-allowed'
              }`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 text-[16px]">Role Title <span className="text-red-500">*</span></label>
            <input
              value={formData.roleTitle}
              onChange={(e) => handleChange('roleTitle', e.target.value)}
              disabled={!canEdit}
              className={`w-[350px] border rounded px-3 py-2 outline-none transition-all ${
                errors.roleTitle ? 'border-red-500 bg-red-50' : 'border-gray-300 disabled:bg-gray-100 disabled:text-gray-500 cursor-not-allowed'
              }`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700 text-[16px]">VPA Restriction</label>
            <textarea
              value={formData.vpaRestriction}
              onChange={(e) => handleChange('vpaRestriction', e.target.value)}
              disabled={!canEdit}
              className="w-full border border-gray-300 rounded p-4 outline-none focus:border-yellow-500 h-[200px] resize-none font-mono text-sm disabled:bg-gray-100 disabled:text-gray-500 cursor-not-allowed"
            />
          </div>

          {mode === "EDIT" && (
            <div className={`flex items-center gap-3 mt-2 p-4 rounded border border-gray-200 ${!canEdit ? 'bg-gray-100' : 'bg-gray-50'}`}>
              <input 
                type="checkbox" id="isSystem"
                checked={formData.isSystem} 
                onChange={(e) => handleChange('isSystem', e.target.checked)}
                disabled={!canEdit}
                className={`w-5 h-5 ${!canEdit ? 'cursor-not-allowed' : 'cursor-pointer accent-[#DE3B40]'}`}
              />
              <label htmlFor="isSystem" className={`font-bold text-[16px] ${!canEdit ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
                System Role
              </label>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}