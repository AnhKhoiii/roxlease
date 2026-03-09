import React, { useState, useEffect } from "react";

export default function PermissionModal({ isOpen, onClose, onSave, mode, initialData }) {
  const [formData, setFormData] = useState({ module: "", application: "", action: "VIEW", description: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (mode === "EDIT" && initialData) setFormData({ ...initialData });
      else setFormData({ module: "", application: "", action: "VIEW", description: "" });
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const generatedCode = formData.module && formData.application ? `${formData.module}_${formData.application}_${formData.action}`.toUpperCase().replace(/\s+/g, '_') : "";

  const handleSave = () => {
    const newErrors = {};
    if (!formData.module) newErrors.module = true;
    if (!formData.application.trim()) newErrors.application = true;

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    onSave({
      module: formData.module,
      application: formData.application.toUpperCase().replace(/\s+/g, '_'),
      action: formData.action,
      description: formData.description
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/20" onClick={onClose}></div>
      <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        <div className="bg-[#EFB034] h-[100px] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold text-black tracking-tight">{mode === "ADD" ? "Add Permission" : "Edit Permission"}</h2>
            <button onClick={handleSave} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1 rounded font-bold shadow-md">Save</button>
          </div>
          <button onClick={onClose} className="hover:text-black font-bold text-2xl">✕</button>
        </div>

        <div className="p-10 flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Code (Auto generated)</label>
            <input value={generatedCode} disabled className="w-full border rounded px-3 py-2 bg-gray-100 font-mono text-red-500 font-bold" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Module <span className="text-red-500">*</span></label>
            <select value={formData.module} disabled={mode === "EDIT"} onChange={(e) => setFormData({...formData, module: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500 disabled:bg-gray-100">
              <option value="">-- Choose Module --</option>
              <option value="SPACE">SPACE</option>
              <option value="LEASE">LEASE</option>
              <option value="COST">COST</option>
              <option value="SERVICEDESK">SERVICEDESK</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Application<span className="text-red-500">*</span></label>
            <input value={formData.application} disabled={mode === "EDIT"} onChange={(e) => setFormData({...formData, application: e.target.value})} placeholder="VD: USER, ROLE..." className="w-full border border-gray-300 rounded px-3 py-2 uppercase outline-none focus:border-yellow-500 disabled:bg-gray-100" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Action <span className="text-red-500">*</span></label>
            <select value={formData.action} disabled={mode === "EDIT"} onChange={(e) => setFormData({...formData, action: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-yellow-500 disabled:bg-gray-100">
              <option value="VIEW">VIEW (View Only)</option>
              <option value="EDIT">EDIT (Add/Edit/Delete)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded p-4 h-[120px] resize-none outline-none focus:border-yellow-500" placeholder="Mô tả quyền..." />
          </div>
        </div>
      </div>
    </div>
  );
}