import React, { useState, useEffect } from "react";

const Header = ({ title, onClose, onSave, onDelete, canEdit, mode }) => {
  return (
    <div className="flex items-center justify-between bg-[#EFB034] px-8 py-5 rounded-t-xl shrink-0">
      <h2 className="text-[22px] font-bold uppercase tracking-tight text-black">{title}</h2>
      <div className="flex items-center gap-4">
        {canEdit && (
          <>
            {mode === "EDIT" && (
              <button onClick={onDelete} className="bg-white text-[#DE3B40] border border-[#DE3B40] hover:bg-red-50 px-6 py-2 rounded font-bold transition-colors shadow-sm text-sm">Delete</button>
            )}
            <button onClick={() => onSave(false)} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-6 py-2 rounded font-bold transition-colors shadow-sm text-sm">{mode === "ADD" ? "Save" : "Update"}</button>
          </>
        )}
        <button className="text-gray-800 hover:text-black transition-colors ml-2"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
        <button onClick={onClose} className="text-gray-800 hover:text-black transition-colors"><svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, disabled, error, placeholder, type = "text" }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={`border rounded px-4 py-2 outline-none transition-colors text-[14px] ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500'}`} />
  </div>
);

const Select = ({ label, value, onChange, disabled, error, options = [] }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className={`border rounded px-4 py-2 outline-none transition-colors text-[14px] bg-white ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#EFB034] disabled:bg-gray-100 disabled:text-gray-500'}`}>
      <option value="">-- Select --</option>
      {options.map((opt, idx) => (<option key={idx} value={opt.value}>{opt.label}</option>))}
    </select>
  </div>
);

const TextArea = ({ label, value, onChange, disabled, placeholder }) => (
  <div className="flex flex-col gap-1.5 h-full">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="border border-gray-300 focus:border-[#EFB034] rounded px-4 py-2.5 flex-1 outline-none disabled:bg-gray-100 disabled:text-gray-500 resize-none text-[14px] min-h-[80px]" />
  </div>
);

const Upload = ({ label, disabled, accept, onChange, hint }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="font-bold text-[13px] text-gray-700">{label}</label>
    <input type="file" accept={accept} onChange={(e) => onChange && onChange(e.target.files[0])} disabled={disabled} className="border border-gray-300 rounded px-2 py-1.5 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-[13px] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 cursor-pointer w-full bg-white" />
    {hint && <span className="text-xs text-gray-500 italic">{hint}</span>}
  </div>
);

export default function PropertyModal({ isOpen, onClose, onSave, onDelete, mode, initialData, activeTab, canEdit = true, sites = [], buildings = [], cities = [] }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) { setFormData(initialData || {}); setErrors({}); }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const handleSaveAction = (isSaveAndAdd = false) => {
    let newErrors = {};
    if (activeTab === 'site') { if (!formData.siteId) newErrors.siteId = true; if (!formData.cityId) newErrors.cityId = true; }
    if (activeTab === 'building') { if (!formData.blId) newErrors.blId = true; if (!formData.siteId) newErrors.siteId = true; }
    if (activeTab === 'floor') { if (!formData.flId) newErrors.flId = true; if (!formData.blId) newErrors.blId = true; }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const payload = { ...formData };
    
    // Tự động ghép BlId_FlId khi tạo mới Floor
    if (activeTab === 'floor' && mode === "ADD") {
        if (!payload.flId.startsWith(payload.blId + '_')) {
            payload.flId = `${payload.blId}_${payload.flId}`;
        }
    }

    // Convert các trường số, thêm latitude, longitude, areaGrossExt, areaGrossInt, nfa
    const numericFields = ['latitude', 'longitude', 'areaGrossExt', 'areaGrossInt', 'gfa', 'nfa'];
    numericFields.forEach(field => {
       if (payload[field] === "" || payload[field] === undefined) { payload[field] = null; } 
       else { payload[field] = Number(payload[field]); }
    });

    if (payload.dateBuilt === "") payload.dateBuilt = null;
    onSave(payload, isSaveAndAdd);
  };

  const getModalTitle = () => {
    const action = mode === "ADD" ? "Add new" : (!canEdit ? "View" : "Edit");
    const entity = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    return `${action} ${entity}`;
  };

  const modalWidth = (activeTab === 'room' || activeTab === 'suite') ? 'w-[800px]' : 'w-[1050px]';

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center backdrop-blur-sm font-sans p-4">
      <div className={`bg-white ${modalWidth} rounded-xl shadow-2xl flex flex-col animate-[fadeIn_0.2s_ease-out] max-h-[90vh]`}>
        <Header title={getModalTitle()} onClose={onClose} onSave={handleSaveAction} onDelete={onDelete} canEdit={canEdit} mode={mode} />
        <div className="overflow-y-auto p-8 pb-10 flex-1">
          
          {/* ================= SITE MODAL ================= */}
          {activeTab === 'site' && (
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-5">
                <Input label="Site ID *" value={formData.siteId} onChange={v => handleChange('siteId', v)} disabled={mode === "EDIT" || !canEdit} error={errors.siteId} />
                <Select 
                  label="City *" 
                  value={formData.cityId} 
                  onChange={v => handleChange('cityId', v)} 
                  disabled={!canEdit} 
                  error={errors.cityId} 
                  // MỚI: Load động danh sách cities
                  options={cities.map(c => ({ value: c.cityId, label: c.cityName || c.cityId }))} 
                />
                <Select label="Division *" value={formData.division} onChange={v => handleChange('division', v)} disabled={!canEdit} options={[{value: 'OFFICE', label: 'Office'}, {value: 'COMPLEX', label: 'Complex'}]} />
                <Input label="Site Name" value={formData.siteName} onChange={v => handleChange('siteName', v)} disabled={!canEdit} />
                <TextArea label="Address" value={formData.address} onChange={v => handleChange('address', v)} disabled={!canEdit} />
              </div>

              <div className="space-y-5">
                <Input label="Manager Contact" value={formData.managerContact} onChange={v => handleChange('managerContact', v)} disabled={!canEdit} />
                <Input label="Email" type="email" value={formData.email} onChange={v => handleChange('email', v)} disabled={!canEdit} />
                <Input label="Phone" value={formData.phone} onChange={v => handleChange('phone', v)} disabled={!canEdit} />
                <Input label="General Contact (Fallback)" value={formData.siteContact} onChange={v => handleChange('siteContact', v)} disabled={!canEdit} />
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Latitude" type="number" value={formData.latitude} onChange={v => handleChange('latitude', v)} disabled={!canEdit} />
                  <Input label="Longitude" type="number" value={formData.longitude} onChange={v => handleChange('longitude', v)} disabled={!canEdit} />
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                  <Upload label="Upload Site Image" accept="image/*" onChange={file => handleChange('image', file)} disabled={!canEdit} />
                </div>
              </div>
            </div>
          )}

          {/* ================= BUILDING MODAL ================= */}
          {activeTab === 'building' && (
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-5">
                <Input label="Building ID (blId) *" value={formData.blId} onChange={v => handleChange('blId', v)} disabled={mode === "EDIT" || !canEdit} error={errors.blId} />
                <Select label="Site ID *" value={formData.siteId} onChange={v => handleChange('siteId', v)} disabled={!canEdit} error={errors.siteId} options={sites.map(site => ({ value: site.siteId, label: site.siteId }))} />
                <Input label="Building Name" value={formData.blName} onChange={v => handleChange('blName', v)} disabled={!canEdit} />
                <Input label="Date Built" type="date" value={formData.dateBuilt} onChange={v => handleChange('dateBuilt', v)} disabled={!canEdit} />
                <TextArea label="Description" value={formData.description} onChange={v => handleChange('description', v)} disabled={!canEdit} />
              </div>

              <div className="space-y-5">
                <Input label="Building Manager" value={formData.buildingManager} onChange={v => handleChange('buildingManager', v)} disabled={!canEdit} />
                <Input label="Email" type="email" value={formData.email} onChange={v => handleChange('email', v)} disabled={!canEdit} />
                <Input label="Phone" value={formData.phone} onChange={v => handleChange('phone', v)} disabled={!canEdit} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Gross Ext. Area" type="number" value={formData.areaGrossExt} onChange={v => handleChange('areaGrossExt', v)} disabled={!canEdit} />
                  <Input label="Gross Int. Area" type="number" value={formData.areaGrossInt} onChange={v => handleChange('areaGrossInt', v)} disabled={!canEdit} />
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Latitude" type="number" value={formData.latitude} onChange={v => handleChange('latitude', v)} disabled={!canEdit} />
                  <Input label="Longitude" type="number" value={formData.longitude} onChange={v => handleChange('longitude', v)} disabled={!canEdit} />
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                  <Upload label="Upload Building Image" accept="image/*" onChange={file => handleChange('image', file)} disabled={!canEdit} />
                </div>
              </div>
            </div>
          )}

          {/* ================= FLOOR MODAL ================= */}
          {activeTab === 'floor' && (
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <Input 
                  label="Floor ID (flId) *" 
                  value={formData.flId ? formData.flId.split('_').pop() : ''} 
                  onChange={v => handleChange('flId', v)} 
                  disabled={mode === "EDIT" || !canEdit} 
                  error={errors.flId} 
                />
                <Select label="Building ID (blId) *" value={formData.blId} onChange={v => handleChange('blId', v)} disabled={!canEdit} error={errors.blId} options={buildings.map(b => ({ value: b.blId, label: b.blId }))} />
                <Input label="Floor Name" value={formData.flName} onChange={v => handleChange('flName', v)} disabled={!canEdit} />
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="GFA (Gross Floor Area)" type="number" value={formData.gfa} onChange={v => handleChange('gfa', v)} disabled={!canEdit} />
                  <Input label="NFA (Net Floor Area)" type="number" value={formData.nfa} onChange={v => handleChange('nfa', v)} disabled={!canEdit} />
                </div>
                <div className="p-4 border border-dashed border-[#EFB034] rounded-lg bg-[#fffdf8] shadow-sm">
                  <Upload label="Auto-parse Floor Plan (.dxf)" accept=".dxf" onChange={file => handleChange('dxfFile', file)} disabled={!canEdit} hint="Only .dxf files are supported for auto-parsing." />
                </div>
              </div>
            </div>
          )}

          {/* ================= ROOM / SUITE MODAL ================= */}
          {(activeTab === 'room' || activeTab === 'suite') && (
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-6">
                <Input label="Floor ID" value={formData.flId ? formData.flId.split('_').pop() : ''} onChange={() => {}} disabled={true} />
                <Input label={activeTab === 'room' ? "Room Code" : "Suite Code"} value={formData[activeTab === 'room' ? 'roomCode' : 'suiteCode']} onChange={v => handleChange(activeTab === 'room' ? 'roomCode' : 'suiteCode', v)} disabled={!canEdit} />
                <Input label={activeTab === 'room' ? "Room Name" : "Suite Name"} value={formData[activeTab === 'room' ? 'roomName' : 'suiteName']} onChange={v => handleChange(activeTab === 'room' ? 'roomName' : 'suiteName', v)} disabled={!canEdit} />
              </div>
              <div className="space-y-6">
                <Input label="Calculated Area (m²)" value={formData.area} onChange={() => {}} disabled={true} />
                <Input label="CAD Geometry Version" value={`v${formData.version || 1}.0`} onChange={() => {}} disabled={true} />
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                  <p className="text-sm text-blue-800 font-semibold mb-1">Quy định Chỉnh sửa:</p>
                  <p className="text-xs text-blue-600 leading-relaxed">Bạn chỉ có thể thay đổi Tên và Mã. Thông số Tọa độ, Diện tích và Version được hệ thống CAD khóa tự động.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}