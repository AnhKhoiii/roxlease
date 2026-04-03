import React, { useState, useEffect } from "react";

// ==========================================
// THÀNH PHẦN HEADER & NÚT BẤM
// ==========================================
const Header = ({ title, onClose, onSave, mode }) => {
  return (
    <div className="flex items-center justify-between bg-[#EFB034] px-8 py-5 rounded-t-xl shrink-0">
      <h2 className="text-[22px] font-bold uppercase tracking-tight text-black">{title}</h2>
      <div className="flex items-center gap-3">
        
        {/* Nút Save and Add Another (Chỉ hiện khi đang ở chế độ Thêm mới) */}
        {mode === "ADD" && (
          <button 
            onClick={() => onSave(true)} 
            className="bg-white text-[#DE3B40] border border-[#DE3B40] hover:bg-red-50 px-5 py-2 rounded font-bold transition-colors shadow-sm text-sm"
          >
            Save and Add Another
          </button>
        )}

        {/* Nút Save bình thường */}
        <button 
          onClick={() => onSave(false)} 
          className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-8 py-2 rounded font-bold transition-colors shadow-sm text-sm"
        >
          Save
        </button>

        {/* Nút Đóng (X) */}
        <button onClick={onClose} className="text-gray-800 hover:text-black transition-colors ml-3">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// CÁC COMPONENT INPUT & CHECKBOX
// ==========================================
const Input = ({ label, value, onChange, disabled, error, type="text" }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled} 
      className={`border rounded px-4 py-2.5 outline-none transition-colors text-[14px] ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500'}`} 
    />
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none w-max mt-2">
    <div className="relative flex items-center justify-center">
        <input 
          type="checkbox" 
          checked={checked || false} 
          onChange={e => onChange(e.target.checked)} 
          className="peer appearance-none w-5 h-5 border-2 border-gray-400 rounded-sm checked:bg-[#EFB034] checked:border-[#EFB034] transition-colors cursor-pointer"
        />
        {/* Dấu tick SVG */}
        <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    </div>
    <span className="font-bold text-[15px] text-gray-800">{label}</span>
  </label>
);

// ==========================================
// MODAL CHÍNH
// ==========================================
export default function BackgroundDataModal({ isOpen, onClose, onSave, mode, initialData }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) { 
      const data = initialData ? { ...initialData } : { isLandlord: false };
      setFormData(data); 
      setErrors({}); 
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSaveAction = (isSaveAndAdd) => {
    let newErrors = {};
    
    if (!formData.partyId) newErrors.partyId = true;
    if (!formData.partyName) newErrors.partyName = true;

    if (Object.keys(newErrors).length > 0) { 
      setErrors(newErrors); 
      return; 
    }

    // Truyền thêm biến isSaveAndAdd để component cha biết đường xử lý
    onSave(formData, isSaveAndAdd);
  };

  const getModalTitle = () => {
    return `${mode === "ADD" ? "Add new" : "Edit"} Party`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center backdrop-blur-sm font-sans p-4">
      {/* Kích thước modal thu gọn lại 650px cho vừa vặn với 4 ô */}
      <div className="bg-white w-[800px] rounded-xl shadow-2xl flex flex-col animate-[fadeIn_0.2s_ease-out]">
        <Header title={getModalTitle()} onClose={onClose} onSave={handleSaveAction} mode={mode} />
        
        <div className="p-8 pb-10 flex-1">
            <div className="flex flex-col gap-6">
                
                {/* HÀNG 1: Party ID và Tên */}
                <div className="grid grid-cols-3 gap-6">
                    <Input 
                        label="Party ID *" 
                        value={formData.partyId} 
                        onChange={v => handleChange('partyId', v)} 
                        disabled={mode === "EDIT"} 
                        error={errors.partyId} 
                    />
                    <Input 
                        label="Party Name *" 
                        value={formData.partyName} 
                        onChange={v => handleChange('partyName', v)} 
                        error={errors.partyName} 
                    />
                </div>

                {/* HÀNG 2: Email và Phone */}
                <div className="grid grid-cols-3 gap-6">
                    <Input 
                        label="Email" 
                        type="email"
                        value={formData.email} 
                        onChange={v => handleChange('email', v)} 
                    />
                    <Input 
                        label="Phone" 
                        value={formData.phone} 
                        onChange={v => handleChange('phone', v)} 
                    />
                    <Checkbox 
                        label="Is Landlord?" 
                        checked={formData.isLandlord} 
                        onChange={v => handleChange('isLandlord', v)} 
                    />
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}