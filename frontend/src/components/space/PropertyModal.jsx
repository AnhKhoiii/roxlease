import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance"; // Gọi trực tiếp axiosInstance từ dự án của bạn

// ================= CÁC COMPONENT DÙNG CHUNG =================
const Header = ({ title, onClose, onSave, onDelete, canEdit, mode }) => {
  return (
    <div className="flex items-center justify-between bg-[#EFB034] px-8 py-5 rounded-t-xl shrink-0">
      <h2 className="text-[22px] font-bold uppercase tracking-tight text-black">{title}</h2>

      <div className="flex items-center gap-4">
        {canEdit && (
          <>
            {mode === "EDIT" && (
              <button onClick={onDelete} className="bg-white text-[#DE3B40] border border-[#DE3B40] hover:bg-red-50 px-6 py-2 rounded font-bold transition-colors shadow-sm text-sm">
                Delete
              </button>
            )}
            <button onClick={() => onSave(false)} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-6 py-2 rounded font-bold transition-colors shadow-sm text-sm">
              {mode === "ADD" ? "Save" : "Update"}
            </button>
          </>
        )}
        
        <button className="text-gray-800 hover:text-black transition-colors ml-2" title="Phóng to">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>

        <button onClick={onClose} className="text-gray-800 hover:text-black transition-colors" title="Đóng">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, disabled, error, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1.5">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={`border rounded px-4 py-2.5 outline-none transition-colors text-[14px] ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500'}`} />
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

const TextArea = ({ label, value, onChange, disabled, placeholder }) => (
  <div className="flex flex-col gap-1.5 h-full">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="border border-gray-300 focus:border-[#EFB034] rounded px-4 py-3 flex-1 outline-none disabled:bg-gray-100 disabled:text-gray-500 resize-none text-[14px]" />
  </div>
);

// MỚI: Cập nhật component Upload để xử lý việc chọn file thực tế
const Upload = ({ label, disabled, accept, onChange, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <input 
      type="file" 
      accept={accept}
      onChange={(e) => onChange && onChange(e.target.files[0])}
      disabled={disabled} 
      className="border border-gray-300 rounded px-3 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-[14px] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer w-full bg-white" 
    />
    {hint && <span className="text-xs text-gray-500 italic mt-1">{hint}</span>}
  </div>
);

// ================= COMPONENT CHÍNH =================
export default function PropertyModal({ 
  isOpen, onClose, onSave, onDelete, mode, initialData, activeTab, canEdit = true, 
  sites = [], buildings = []  
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isUploadingDxf, setIsUploadingDxf] = useState(false); // State quản lý loading khi đang parse DXF

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setErrors({});
      setIsUploadingDxf(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  // MỚI: Hàm xử lý gọi API Parse DXF trực tiếp từ Modal (Dành cho Edit Mode)
  const handleUploadDxf = async () => {
    if (!formData.flId || !formData.dxfFile) {
      alert("Vui lòng chọn file .dxf hợp lệ!");
      return;
    }
    const uploadData = new FormData();
    uploadData.append('file', formData.dxfFile);

    setIsUploadingDxf(true);
    try {
      const response = await axiosInstance.post(`/floors/${formData.flId}/upload-dxf`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert("Bóc tách thành công! Layer SU và RM đã được đưa vào Database.");
      // Tùy chọn: Có thể trigger reload danh sách room ở đây nếu cần
    } catch (error) {
      console.error("Lỗi upload DXF:", error);
      alert("Quá trình bóc tách thất bại. Vui lòng kiểm tra lại cấu trúc file CAD hoặc Log Server.");
    } finally {
      setIsUploadingDxf(false);
    }
  };

  const handleSaveAction = (isSaveAndAdd = false) => {
    let newErrors = {};
    if (activeTab === 'site') {
      if (!formData.siteId) newErrors.siteId = true;
      if (!formData.cityId) newErrors.cityId = true;
    }
    if (activeTab === 'building') {
      if (!formData.blId) newErrors.blId = true;
      if (!formData.siteId) newErrors.siteId = true;
    }
    if (activeTab === 'floor') {
      if (!formData.flId) newErrors.flId = true;
      if (!formData.blId) newErrors.blId = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = { ...formData };
    const numericFields = ['lat', 'longitude', 'areaGrossExt', 'areaGrossInt', 'gfa', 'nfa'];
    numericFields.forEach(field => {
       if (payload[field] === "" || payload[field] === undefined) {
           payload[field] = null;
       } else {
           payload[field] = Number(payload[field]);
       }
    });

    if (payload.dateBuilt === "") payload.dateBuilt = null;
    
    // Gửi payload ra component cha. Nếu có formData.dxfFile, component cha sẽ nhận được luôn
    onSave(payload, isSaveAndAdd);
  };

  const getModalTitle = () => {
    const action = mode === "ADD" ? "Add new" : (!canEdit ? "View" : "Edit");
    const entity = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    return `${action} ${entity}`;
  };

  const modalWidth = activeTab === 'floor' ? 'w-[800px]' : 'w-[1100px]';

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex justify-center items-center backdrop-blur-sm font-sans p-4">
      <div className={`bg-white ${modalWidth} rounded-xl shadow-2xl flex flex-col animate-[fadeIn_0.2s_ease-out] max-h-[90vh]`}>
        <Header title={getModalTitle()} onClose={onClose} onSave={handleSaveAction} onDelete={onDelete} canEdit={canEdit} mode={mode} />
        
        <div className="overflow-y-auto p-10 pb-12 flex-1">
          
          {/* ================= SITE MODAL ================= */}
          {activeTab === 'site' && (
            <div className="grid grid-cols-3 gap-10">
              <div className="space-y-6">
                <Input label="Site ID *" value={formData.siteId} onChange={v => handleChange('siteId', v)} disabled={mode === "EDIT" || !canEdit} error={errors.siteId} placeholder="VD: S-HCM-01" />
                <Select label="City ID *" value={formData.cityId} onChange={v => handleChange('cityId', v)} disabled={!canEdit} error={errors.cityId} options={[{value: 'HCM', label: 'Ho Chi Minh'}, {value: 'HAN', label: 'Ha Noi'}]} />
                <Select label="Division *" value={formData.division} onChange={v => handleChange('division', v)} disabled={!canEdit} options={[{value: 'OFFICE', label: 'Office'}, {value: 'COMPLEX', label: 'Complex'}, {value: 'HOUSE', label: 'House'}, {value: 'INDUSTRIAL_ZONE', label: 'Industrial Zone'}]} />
              </div>
              <div className="space-y-6">
                <Input label="Site Name" value={formData.siteName} onChange={v => handleChange('siteName', v)} disabled={!canEdit} />
                <Input label="Site Contact" value={formData.siteContact} onChange={v => handleChange('siteContact', v)} disabled={!canEdit} />
                <Input label="Site Email" value={formData.siteEmail} onChange={v => handleChange('siteEmail', v)} disabled={!canEdit} type="email" />
                <Input label="Site Phone" value={formData.sitePhone} onChange={v => handleChange('sitePhone', v)} disabled={!canEdit} />
              </div>
              <div className="flex flex-col gap-6">
                <TextArea label="Address" value={formData.address} onChange={v => handleChange('address', v)} disabled={!canEdit} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Longitude" type="number" value={formData.longitude} onChange={v => handleChange('longitude', v)} disabled={!canEdit} />
                  <Input label="Latitude (lat)" type="number" value={formData.lat} onChange={v => handleChange('lat', v)} disabled={!canEdit} />
                </div>
                {/* Upload tĩnh cho image chưa xử lý */}
                <Upload label="Site Image" disabled={!canEdit} accept="image/*" />
              </div>
            </div>
          )}

          {/* ================= BUILDING MODAL ================= */}
          {activeTab === 'building' && (
            <div className="grid grid-cols-3 gap-10">
              <div className="space-y-6">
                <Input label="Building ID (blId) *" value={formData.blId} onChange={v => handleChange('blId', v)} disabled={mode === "EDIT" || !canEdit} error={errors.blId} />
                <Select 
                  label="Site ID *" 
                  value={formData.siteId} 
                  onChange={v => handleChange('siteId', v)} 
                  disabled={!canEdit} 
                  error={errors.siteId} 
                  options={sites.map(site => ({ value: site.siteId, label: `${site.siteId} - ${site.siteName || ''}` }))} 
                />
                <Input label="Gross External Area (sqm)" type="number" value={formData.areaGrossExt} onChange={v => handleChange('areaGrossExt', v)} disabled={!canEdit} />
                <Input label="Gross Internal Area (sqm)" type="number" value={formData.areaGrossInt} onChange={v => handleChange('areaGrossInt', v)} disabled={!canEdit} />
              </div>
              <div className="space-y-6">
                <Input label="Building Name" value={formData.blName} onChange={v => handleChange('blName', v)} disabled={!canEdit} />
                <Input label="Date Built" type="date" value={formData.dateBuilt} onChange={v => handleChange('dateBuilt', v)} disabled={!canEdit} />
                <Input label="Building Contact" value={formData.blContact} onChange={v => handleChange('blContact', v)} disabled={!canEdit} />
                <Input label="Building Email" type="email" value={formData.blEmail} onChange={v => handleChange('blEmail', v)} disabled={!canEdit} />
                <Input label="Building Phone" value={formData.blPhone} onChange={v => handleChange('blPhone', v)} disabled={!canEdit} />
              </div>
              <div className="flex flex-col gap-6">
                <TextArea label="Description" value={formData.description} onChange={v => handleChange('description', v)} disabled={!canEdit} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Longitude" type="number" value={formData.longitude} onChange={v => handleChange('longitude', v)} disabled={!canEdit} />
                  <Input label="Latitude (lat)" type="number" value={formData.lat} onChange={v => handleChange('lat', v)} disabled={!canEdit} />
                </div>
                <Upload label="Building Image" disabled={!canEdit} accept="image/*" />
              </div>
            </div>
          )}

          {/* ================= FLOOR MODAL ================= */}
          {activeTab === 'floor' && (
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <Input label="Floor ID (flId) *" value={formData.flId} onChange={v => handleChange('flId', v)} disabled={mode === "EDIT" || !canEdit} error={errors.flId} />
                <Select 
                  label="Building ID (blId) *" 
                  value={formData.blId} 
                  onChange={v => handleChange('blId', v)} 
                  disabled={!canEdit} 
                  error={errors.blId} 
                  options={buildings.map(b => ({ value: b.blId, label: `${b.blId} - ${b.blName || ''}` }))} 
                />
                <Input label="Floor Name" value={formData.flName} onChange={v => handleChange('flName', v)} disabled={!canEdit} />
              </div>
              <div className="space-y-6">
                <Input label="GFA (Gross Floor Area)" type="number" value={formData.gfa} onChange={v => handleChange('gfa', v)} disabled={!canEdit} />
                <Input label="NFA (Net Floor Area)" type="number" value={formData.nfa} onChange={v => handleChange('nfa', v)} disabled={!canEdit} />
                
                {/* MỚI: TÍCH HỢP UPLOAD DXF */}
                <div className="p-4 border border-dashed border-[#EFB034] rounded-lg bg-[#fffdf8] shadow-sm">
                  <Upload 
                    label="Auto-parse Floor Plan (.dxf)" 
                    accept=".dxf"
                    onChange={file => handleChange('dxfFile', file)}
                    disabled={!canEdit} 
                    hint="Hệ thống sẽ tự động đọc tọa độ để chuẩn bị cho màn hình View 2D sau này."
                  />
                  
                  {/* Logic nút bóc tách */}
                  {mode === "EDIT" && formData.dxfFile && (
                    <button 
                      onClick={handleUploadDxf}
                      disabled={isUploadingDxf}
                      className="mt-4 w-full bg-[#EFB034] hover:bg-[#d69d2e] text-black font-bold py-2.5 rounded transition-colors text-sm disabled:opacity-50"
                    >
                      {isUploadingDxf ? "Đang xử lý DXF..." : "Tiến hành bóc tách (Upload & Parse)"}
                    </button>
                  )}
                  {mode === "ADD" && formData.dxfFile && (
                    <p className="mt-3 text-[12px] font-semibold text-[#DE3B40]">
                      * Vui lòng nhấn nút "Save" ở góc trên để tạo Floor trước khi hệ thống có thể bóc tách file DXF.
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}