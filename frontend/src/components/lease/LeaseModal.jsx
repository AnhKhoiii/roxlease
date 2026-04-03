import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";

// ==========================================
// CÁC COMPONENT GIAO DIỆN (UI COMPONENTS)
// ==========================================
const Input = ({ label, value, onChange, type = "text", disabled, placeholder }) => (
  <div className="flex flex-col gap-0.5 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`border border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow ${
        type === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''
      }`}
    />
  </div>
);

const Select = ({ label, value, onChange, options = [], disabled }) => (
  <div className="flex flex-col gap-0.5 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label}</label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="border border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow"
    >
      <option value="">-- Select --</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value || opt}>{opt.label || opt}</option>
      ))}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-1.5 cursor-pointer w-max ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
    <input
      type="checkbox"
      checked={checked || false}
      onChange={e => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      className={`w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500 ${disabled ? 'bg-gray-200' : 'accent-blue-600'}`}
    />
    <span className="text-[11px] font-semibold text-gray-700">{label}</span>
  </label>
);

// 🚀 COMPONENT SEARCHABLE SELECT FIX LỖI TÌM KIẾM
const SearchableSelect = ({ label, value, onChange, options = [], disabled, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");

  // Đồng bộ Text hiển thị với Value khi không mở box
  useEffect(() => {
    if (!isOpen) {
      const selectedOpt = options.find(o => o.value === value);
      if (selectedOpt) {
        setInputText(selectedOpt.label !== selectedOpt.value ? `${selectedOpt.value} - ${selectedOpt.label}` : selectedOpt.value);
      } else {
        setInputText("");
      }
    }
  }, [value, options, isOpen]);

  const filteredOptions = options.filter(opt =>
    (opt.label || "").toString().toLowerCase().includes(inputText.toLowerCase()) ||
    (opt.value || "").toString().toLowerCase().includes(inputText.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-0.5 w-full relative">
      <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setInputText(""); // Mẹo: Click vào thì xóa text để show toàn bộ list gốc
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        disabled={disabled}
        placeholder={placeholder || "Search or select..."}
        className="border border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow cursor-pointer"
      />
      
      {isOpen && !disabled && (
        <ul className="absolute z-[999] w-full bg-white border border-gray-300 shadow-xl max-h-48 overflow-y-auto top-[100%] left-0 rounded-md mt-1 divide-y divide-gray-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                className="px-2.5 py-1.5 text-[11px] hover:bg-blue-50 cursor-pointer text-gray-800 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span className="font-semibold text-blue-700">{opt.value}</span>
                {opt.label !== opt.value && <span className="text-gray-500 ml-1">- {opt.label}</span>}
              </li>
            ))
          ) : (
            <li className="px-2.5 py-1.5 text-[11px] text-gray-400 italic">No data found...</li>
          )}
        </ul>
      )}
    </div>
  );
};

// ==========================================
// MODAL CHÍNH (4 CỘT)
// ==========================================
export default function LeaseModal({ isOpen, onClose, onSave, mode, initialData }) {
  const [formData, setFormData] = useState({});
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [suites, setSuites] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      fetchSites();
    }
  }, [isOpen, initialData]);

  // ================= MAPPING DATA CHUẨN 100% THEO FILE JAVA =================
  const fetchSites = async () => {
    try {
      const res = await axiosInstance.get('/space/properties/sites');
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      setSites(items.filter(Boolean).map(item => ({
        value: item.id || item.siteId || '',
        label: item.siteName || item.name || item.id || '' // Dùng siteName
      })));
    } catch { setSites([]); }
  };

  const fetchBuildings = async (siteId) => {
    if (!siteId) return setBuildings([]);
    try {
      const res = await axiosInstance.get(`/space/properties/buildings`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      
      // Foreign Key: siteId (từ Java)
      const filtered = items.filter(item => item && item.siteId === siteId);
      
      setBuildings(filtered.map(item => ({
        value: item.id || item.blId || '',
        label: item.blName || item.name || item.id || '' // Dùng blName
      })));
    } catch { setBuildings([]); }
  };

  const fetchFloors = async (buildingId) => {
    if (!buildingId) return setFloors([]);
    try {
      const res = await axiosInstance.get(`/space/properties/floors`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      
      // Foreign Key: blId (từ Java Floor.java)
      const filtered = items.filter(item => item && item.blId === buildingId);
      
      setFloors(filtered.map(item => ({
        value: item.id || item.flId || '',
        label: item.flName || item.name || item.id || '' // Dùng flName
      })));
    } catch { setFloors([]); }
  };

  const fetchSuites = async (floorId) => {
    if (!floorId) return setSuites([]);
    try {
      const res = await axiosInstance.get(`/space/properties/suites`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      
      // Foreign Key: flId (từ Java Suite.java)
      const filtered = items.filter(item => item && item.flId === floorId);
      
      setSuites(filtered.map(item => ({
        value: item.id || item.suiteId || '',
        label: item.suiteCode || item.name || item.id || '' // Dùng suiteCode
      })));
    } catch { setSuites([]); }
  };

  // Kích hoạt fetch Cascading
  useEffect(() => { if (formData.siteId) fetchBuildings(formData.siteId); else setBuildings([]); }, [formData.siteId]);
  useEffect(() => { if (formData.buildingId) fetchFloors(formData.buildingId); else setFloors([]); }, [formData.buildingId]);
  useEffect(() => { if (formData.floorId) fetchSuites(formData.floorId); else setSuites([]); }, [formData.floorId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    let updates = { [field]: value };
    if (['amountDeposit', 'rentUnitCost', 'serviceUnitCost', 'baseExchangeRate', 'areaNegotiated', 'areaCorridor'].includes(field)) {
      updates[field] = value === '' ? null : Number(value);
    }
    
    // Reset ô con khi ô cha thay đổi
    if (field === 'siteId') { updates.buildingId = ''; updates.floorId = ''; updates.suiteId = ''; } 
    else if (field === 'buildingId') { updates.floorId = ''; updates.suiteId = ''; } 
    else if (field === 'floorId') { updates.suiteId = ''; }
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSaveAction = () => {
    if (!formData.lsId) { alert("Lease Code (lsId) is required!"); return; }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-white w-[1200px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out] max-h-[95vh]">
        <div className="bg-[#EFB034] px-5 py-3 flex justify-between items-center shrink-0">
          <h2 className="text-base font-bold uppercase tracking-tight text-white drop-shadow-sm">{mode === "ADD" ? "Add New Lease" : "Edit Lease"}</h2>
          <div className="flex gap-2 items-center">
            <button onClick={handleSaveAction} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">Save</button>
            <button onClick={onClose} className="text-white hover:text-red-100 ml-1 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        
        <div className="p-5 overflow-y-auto bg-gray-50 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            
            {/* CỘT 1 */}
            <div className="flex flex-col gap-3">
              <div className="pb-0.5 border-b border-gray-100"><span className="font-bold text-blue-800 text-[9px] uppercase tracking-wider">General & Timeline</span></div>
              <Input label="Lease Code" value={formData.lsId} onChange={v => handleChange('lsId', v)} disabled={mode === "EDIT"} />
              <Input label="Description" value={formData.description} onChange={v => handleChange('description', v)} />
              <Input label="Signing Date" type="date" value={formData.signedDate} onChange={v => handleChange('signedDate', v)} />
              <Input label="Handover Date" type="date" value={formData.handoverDate} onChange={v => handleChange('handoverDate', v)} />
              <Input label="Start Date" type="date" value={formData.startDate} onChange={v => handleChange('startDate', v)} />
              <Input label="End Date" type="date" value={formData.endDate} onChange={v => handleChange('endDate', v)} />
              <Select label="Lease Type" value={formData.lsType} onChange={v => handleChange('lsType', v)} options={['COMMERCIAL', 'RESIDENTIAL', 'INDUSTRIAL']} />
              <Select label="Space Use" value={formData.spaceUse} onChange={v => handleChange('spaceUse', v)} options={['OFFICE', 'RETAIL', 'STORAGE']} />
            </div>

            {/* CỘT 2 (CHẠY SEARCHABLE SELECT MỚI) */}
            <div className="flex flex-col gap-3">
              <div className="pb-0.5 border-b border-gray-100"><span className="font-bold text-blue-800 text-[9px] uppercase tracking-wider">Location & Structure</span></div>
              <SearchableSelect label="Site ID" value={formData.siteId} onChange={v => handleChange('siteId', v)} options={sites} />
              <SearchableSelect label="Building ID" value={formData.buildingId} onChange={v => handleChange('buildingId', v)} options={buildings} disabled={!formData.siteId} placeholder={!formData.siteId ? "Select Site first..." : "Search..."} />
              <SearchableSelect label="Floor ID" value={formData.floorId} onChange={v => handleChange('floorId', v)} options={floors} disabled={!formData.buildingId} placeholder={!formData.buildingId ? "Select Building first..." : "Search..."} />
              <SearchableSelect label="Suite ID" value={formData.suiteId} onChange={v => handleChange('suiteId', v)} options={suites} disabled={!formData.floorId} placeholder={!formData.floorId ? "Select Floor first..." : "Search..."} />
              <Input label="Amenity ID" value={formData.amenityId} onChange={v => handleChange('amenityId', v)} />
              <Select label="Lease / Sublease" value={formData.leaseSublease} onChange={v => handleChange('leaseSublease', v)} options={['MAIN_LEASE', 'SUBLEASE']} />
            </div>

            {/* CỘT 3 */}
            <div className="flex flex-col gap-3"> 
              <div className="pb-0.5 border-b border-gray-100"><span className="font-bold text-blue-800 text-[9px] uppercase tracking-wider">Financial & Status</span></div>
              <Input label="Deposit" type="number" value={formData.amountDeposit} onChange={v => handleChange('amountDeposit', v)} />
              <Input label="Rent Unit Cost" type="number" value={formData.rentUnitCost} onChange={v => handleChange('rentUnitCost', v)} />
              <Input label="Service Unit Cost" type="number" value={formData.serviceUnitCost} onChange={v => handleChange('serviceUnitCost', v)} />
              <Input label="Currency" value={formData.currency} onChange={v => handleChange('currency', v)} />
              <Input label="Base Exchange Rate" type="number" value={formData.baseExchangeRate} onChange={v => handleChange('baseExchangeRate', v)} />
              <Select label="Rent Type" value={formData.rentType} onChange={v => handleChange('rentType', v)} options={['FIXED', 'REVENUE_SHARE']} />
              <div className="flex flex-col gap-2 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200/60">
                <Checkbox label="VAT Excluded?" checked={formData.vatExcluded} onChange={v => handleChange('vatExcluded', v)} />
                <Checkbox label="Lease Signed?" checked={formData.isSign} onChange={v => handleChange('isSign', v)} />
                <Checkbox label="Assume renewal for KPI" checked={formData.assumeRenewal} onChange={v => handleChange('assumeRenewal', v)} />
                <Checkbox label="Active" checked={formData.active} onChange={() => {}} disabled={true} />
              </div>
            </div>

            {/* CỘT 4 */}
            <div className="flex flex-col gap-3">
              <div className="pb-0.5 border-b border-gray-100"><span className="font-bold text-blue-800 text-[9px] uppercase tracking-wider">Parties & Area</span></div>
              <Input label="Negotiated Area (sqm)" type="number" value={formData.areaNegotiated} onChange={v => handleChange('areaNegotiated', v)} />
              <Input label="Corridor Area (sqm)" type="number" value={formData.areaCorridor} onChange={v => handleChange('areaCorridor', v)} />
              <Input label="Parent Lease" value={formData.parentLsId} onChange={v => handleChange('parentLsId', v)} />
              <div className="flex items-end gap-2 mt-0.5">
                <div className="flex-1"><Input label="Party Name" value={formData.partyName} onChange={v => handleChange('partyName', v)} /></div>
                <div className="pb-1.5"><Checkbox label="Is Landlord?" checked={formData.isLandlord} onChange={v => handleChange('isLandlord', v)} /></div>
              </div>
              <Input label="Person In charge (PIC)" value={formData.pic} onChange={v => handleChange('pic', v)} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}