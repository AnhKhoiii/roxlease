import React, { useState, useEffect } from "react";

// ================= COMPONENT DÙNG CHUNG =================
const Input = ({ label, value, onChange, disabled, error, placeholder }) => (
  <div className="flex flex-col gap-1.5">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <input value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={`border rounded px-4 py-2.5 outline-none transition-colors text-[14px] ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500'}`} />
  </div>
);

const Select = ({ label, value, onChange, disabled, error, options = [] }) => (
  <div className="flex flex-col gap-1.5">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className={`border rounded px-4 py-2.5 outline-none transition-colors text-[14px] bg-white ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500'}`}>
      <option value="">-- Select --</option>
      {options.map((opt, idx) => (<option key={idx} value={opt.value}>{opt.label}</option>))}
    </select>
  </div>
);

// ================= COMPONENT CHÍNH =================
export default function AmenityModal({ isOpen, onClose, onSave, onDelete, mode, initialData, canEdit = true, buildings = [] }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setErrors({});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSaveAction = () => {
    let newErrors = {};
    if (!formData.amenityId) newErrors.amenityId = true;
    if (!formData.amenityName) newErrors.amenityName = true;
    if (!formData.blId) newErrors.blId = true;
    if (!formData.amenityType) newErrors.amenityType = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      
      {/* Lớp phủ đen mờ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>

      {/* Box Panel Trượt từ bên phải ra */}
      <div 
        className="relative w-[500px] h-full bg-white shadow-2xl flex flex-col" 
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        
        {/* HEADER MODAL */}
        <div className="bg-[#EFB034] px-6 py-5 flex items-center justify-between shrink-0 shadow-sm">
          <h2 className="text-[20px] font-bold uppercase tracking-tight text-black">
            {mode === "ADD" ? "Add new Amenity" : (!canEdit ? "View Amenity" : "Edit Amenity")}
          </h2>

          <div className="flex items-center gap-3">
            {canEdit && mode === "EDIT" && (
              <button onClick={onDelete} className="bg-white text-[#DE3B40] hover:bg-red-50 px-5 py-2 rounded font-bold transition-colors shadow-sm text-sm border border-[#DE3B40]">
                Delete
              </button>
            )}
            {canEdit && (
              <button onClick={handleSaveAction} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-2 rounded font-bold transition-colors shadow-sm text-sm">
                {mode === "ADD" ? "Save" : "Update"}
              </button>
            )}
            <button onClick={onClose} className="text-gray-800 hover:text-black transition-colors ml-2" title="Đóng">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* NỘI DUNG FORM */}
        <div className="p-8 flex-1 overflow-y-auto bg-gray-50/50">
          <div className="flex flex-col gap-6 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <Input 
              label="Amenity ID *" 
              value={formData.amenityId} 
              onChange={v => handleChange('amenityId', v)} 
              disabled={mode === "EDIT" || !canEdit} 
              error={errors.amenityId} 
              placeholder="VD: AM-01" 
            />
            
            <Input 
              label="Amenity Name *" 
              value={formData.amenityName} 
              onChange={v => handleChange('amenityName', v)} 
              disabled={!canEdit} 
              error={errors.amenityName} 
              placeholder="VD: Bể bơi vô cực" 
            />

            <Select 
              label="Building ID (blId) *" 
              value={formData.blId} 
              onChange={v => handleChange('blId', v)} 
              disabled={!canEdit} 
              error={errors.blId} 
              options={buildings.map(b => ({ value: b.blId, label: `${b.blId} - ${b.blName || ''}` }))} 
            />

            <Select 
              label="Amenity Type *" 
              value={formData.amenityType} 
              onChange={v => handleChange('amenityType', v)} 
              disabled={!canEdit} 
              error={errors.amenityType} 
              options={[
                {value: 'POOL', label: 'Pool'}, 
                {value: 'PARKING_AREA', label: 'Parking Area'}, 
                {value: 'BILLBOARD', label: 'Billboard'}, 
                {value: 'EVENT_HALL', label: 'Event Hall'},
                {value: 'OTHER', label: 'Other'}
              ]} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}