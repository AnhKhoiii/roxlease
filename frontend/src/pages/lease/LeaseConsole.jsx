import React, { useState, useEffect, useCallback, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";

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

// 🚀 COMPONENT AUTOCOMPLETE (CHO PHÉP GÕ & LƯU CHÍNH XÁC CHỮ ĐÃ GÕ)
const AutocompleteInput = ({ label, value, onChange, options = [], disabled, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Lọc option dựa vào chính giá trị user đang gõ (value)
  const filteredOptions = options.filter(opt =>
    (opt.label || "").toString().toLowerCase().includes((value || "").toString().toLowerCase()) ||
    (opt.value || "").toString().toLowerCase().includes((value || "").toString().toLowerCase())
  );

  return (
    <div className="flex flex-col gap-0.5 w-full relative">
      <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value); // Lưu chính xác từng ký tự người dùng gõ vào form
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)} // Delay để click chuột vào item không bị hụt
        disabled={disabled}
        placeholder={placeholder || "Type to search..."}
        className="border border-gray-300 rounded px-2 py-1 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow"
        autoComplete="off"
      />
      
      {/* Box xổ xuống chỉ hiện khi đang focus và không bị disable */}
      {isOpen && !disabled && (
        <ul className="absolute z-[999] w-full bg-white border border-gray-300 shadow-xl max-h-48 overflow-y-auto top-[100%] left-0 rounded-md mt-1 divide-y divide-gray-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                className="px-2.5 py-1.5 text-[11px] hover:bg-blue-50 cursor-pointer text-gray-800 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault(); 
                  onChange(opt.value); // Khi click chọn, sẽ điền mã ID (value) vào ô
                  setIsOpen(false);
                }}
              >
                <span className="font-semibold text-blue-700">{opt.value}</span>
                {opt.label !== opt.value && <span className="text-gray-500 ml-1">- {opt.label}</span>}
              </li>
            ))
          ) : (
            <li className="px-2.5 py-1.5 text-[11px] text-gray-400 italic">No matches...</li>
          )}
        </ul>
      )}
    </div>
  );
};


// ==========================================
// MODAL CHÍNH (4 CỘT)
// ==========================================
function LeaseModal({ isOpen, onClose, onSave, mode, initialData }) {
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

  // ================= FETCH DATA TỪ BACKEND =================
  const fetchSites = async () => {
    try {
      const res = await axiosInstance.get('/space/properties/sites');
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      setSites(items.filter(Boolean).map(item => ({
        value: item.siteId || item.id || '',
        label: item.siteName || item.name || item.siteId || item.id || ''
      })));
    } catch (err) { setSites([]); }
  };

  const fetchBuildings = async (siteId) => {
    if (!siteId) return setBuildings([]);
    try {
      const res = await axiosInstance.get(`/space/properties/buildings`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const filtered = items.filter(item => item && item.siteId === siteId);
      setBuildings(filtered.map(item => ({
        value: item.blId || item.id || '',
        label: item.blName || item.name || item.blId || item.id || ''
      })));
    } catch { setBuildings([]); }
  };

  const fetchFloors = async (buildingId) => {
    if (!buildingId) return setFloors([]);
    try {
      const res = await axiosInstance.get(`/space/properties/floors`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const filtered = items.filter(item => item && item.blId === buildingId);
      setFloors(filtered.map(item => ({
        value: item.flId || item.id || '',
        label: item.flName || item.name || item.flId || item.id || ''
      })));
    } catch { setFloors([]); }
  };

  const fetchSuites = async (floorId) => {
    if (!floorId) return setSuites([]);
    try {
      const res = await axiosInstance.get(`/space/properties/suites`);
      const items = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const filtered = items.filter(item => item && item.flId === floorId);
      setSuites(filtered.map(item => ({
        value: item.suiteId || item.id || '',
        label: item.suiteCode || item.name || item.suiteId || item.id || ''
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

            {/* CỘT 2: HIỂN THỊ CASCADING BẰNG AUTOCOMPLETE MỚI */}
            <div className="flex flex-col gap-3">
              <div className="pb-0.5 border-b border-gray-100"><span className="font-bold text-blue-800 text-[9px] uppercase tracking-wider">Location & Structure</span></div>
              <AutocompleteInput label="Site ID" value={formData.siteId} onChange={v => handleChange('siteId', v)} options={sites} placeholder="Search Site ID..." />
              <AutocompleteInput label="Building ID" value={formData.buildingId} onChange={v => handleChange('buildingId', v)} options={buildings} disabled={!formData.siteId} placeholder={!formData.siteId ? "Select Site first..." : "Search Building ID..."} />
              <AutocompleteInput label="Floor ID" value={formData.floorId} onChange={v => handleChange('floorId', v)} options={floors} disabled={!formData.buildingId} placeholder={!formData.buildingId ? "Select Building first..." : "Search Floor ID..."} />
              <AutocompleteInput label="Suite ID" value={formData.suiteId} onChange={v => handleChange('suiteId', v)} options={suites} disabled={!formData.floorId} placeholder={!formData.floorId ? "Select Floor first..." : "Search Suite ID..."} />
              
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

// ==========================================
// MÀN HÌNH CONSOLE CHÍNH
// ==========================================
export default function LeaseConsole() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD");
  const [selectedData, setSelectedData] = useState(null);

  const initialGlobalFilters = {
    siteId: "", buildingId: "", floorId: "", leaseId: "", landlordTenant: "", isLandlord: false,
    region: "", country: "", city: "", showLeases: "", showLeasesOptions: "",
    isSigned: false, isActive: false,
    assocSuite: false, assocAmenity: false,
    typeExternal: false, typeInternal: false, typeMsb: false,
    signFrom: "", signTo: "", includeExpired: false
  };

  const initialColumnFilters = {
    leaseCode: "", buildingCode: "", floor: "", tenantName: "", area: "",
    rentUnitCost: "", serviceUnitCost: "", startDate: "", endDate: ""
  };

  const [globalFilters, setGlobalFilters] = useState(initialGlobalFilters);
  const [columnFilters, setColumnFilters] = useState(initialColumnFilters);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const columns = [
    { key: "lsId", label: "Lease Code", sortable: true },
    { key: "buildingId", label: "Building ID", sortable: true },
    { key: "floorId", label: "Floor ID", sortable: true },
    { key: "partyName", label: "Tenant Name", sortable: true },
    { key: "areaNegotiated", label: "Area", sortable: true },
    { key: "rentUnitCost", label: "Rent Unit Cost", sortable: true },
    { key: "serviceUnitCost", label: "Service Unit Cost", sortable: true },
    { key: "startDate", label: "Date Start", sortable: true },
    { key: "endDate", label: "Date End", sortable: true }
  ];

  const fetchLeases = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size, ...globalFilters, ...columnFilters, ...(sortConfig.key ? { sortBy: sortConfig.key, sortDir: sortConfig.direction } : {}) };
      Object.keys(params).forEach(key => { if (params[key] === "" || params[key] === null || params[key] === undefined || params[key] === false) { delete params[key]; } });
      const response = await axiosInstance.get("/lease/leases", { params });
      const responseData = response.data;

      if (Array.isArray(responseData)) {
        setData(responseData);
        setTotalElements(responseData.length);
        setTotalPages(Math.ceil(responseData.length / size) || 1);
      } else {
        setData(responseData.content || []);
        setTotalPages(responseData.totalPages || 1);
        setTotalElements(responseData.totalElements || 0);
      }
    } catch (error) {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [page, size, globalFilters, columnFilters, sortConfig]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { setPage(0); fetchLeases(); }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [globalFilters, columnFilters]);

  useEffect(() => { fetchLeases(); }, [page, size, sortConfig]);

  const handleGlobalFilterChange = (key, value) => setGlobalFilters(prev => ({ ...prev, [key]: value }));
  const handleColumnFilterChange = (key, value) => setColumnFilters(prev => ({ ...prev, [key]: value }));
  
  const handleClearFilters = () => {
    setGlobalFilters(initialGlobalFilters); setColumnFilters(initialColumnFilters);
    setSortConfig({ key: null, direction: null }); setPage(0);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredDataLocal = useMemo(() => {
     let filtered = [...data];
     Object.keys(columnFilters).forEach(key => {
         if(columnFilters[key]) {
             filtered = filtered.filter(item => String(item[key] || '').toLowerCase().includes(columnFilters[key].toLowerCase()));
         }
     });
     return filtered;
  }, [data, columnFilters]);
  const handleOpenAdd = () => { 
    setModalMode("ADD"); 
    setSelectedData({ active: false }); // Trền mặc định active = false vào form
    setIsModalOpen(true); 
  };
  const handleRowDoubleClick = (item) => { setModalMode("EDIT"); setSelectedData(item); setIsModalOpen(true); };

  const handleSaveModal = async (formData) => {
    try {
      if (modalMode === "EDIT") await axiosInstance.put(`/lease/leases/${formData.lsId}`, formData);
      else await axiosInstance.post('/lease/leases', formData);
      setIsModalOpen(false);
      fetchLeases(); 
    } catch (error) { alert("Lỗi lưu dữ liệu! Vui lòng kiểm tra lại Lease Code."); }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 text-gray-800 font-sans p-4">
      <div className="mb-3 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          <button className="bg-red-50 text-[#DE3B40] font-bold px-6 py-2 text-sm rounded-t-md border-b-2 border-[#DE3B40] transition-colors">Select Lease</button>
          <button className="text-gray-600 font-semibold hover:bg-gray-200 px-6 py-2 text-sm rounded-t-md transition-colors">Details</button>
        </div>
        <div className="flex gap-3">
          <button onClick={handleOpenAdd} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1.5 rounded text-sm font-semibold shadow-sm transition-colors">+ Add new</button>
          <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-1.5 rounded text-sm font-semibold shadow-sm transition-colors">Export</button>
        </div>
      </div>

      <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-3 shrink-0 transition-all duration-300">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800 text-sm">Filter Leases</h2>
          <div className="flex gap-2">
            <button onClick={() => setExpanded(!expanded)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 px-4 py-1.5 rounded font-medium transition-colors text-xs">{expanded ? "Less" : "More"}</button>
            <button onClick={handleClearFilters} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1.5 rounded text-xs font-semibold transition-colors shadow-sm">Clear</button>
            <button onClick={() => {setPage(0); fetchLeases();}} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded text-xs font-semibold transition-colors shadow-sm">Search</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-gray-50/50" placeholder="Site ID" value={globalFilters.siteId} onChange={(e) => handleGlobalFilterChange("siteId", e.target.value)} />
          <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-gray-50/50" placeholder="Building ID" value={globalFilters.buildingId} onChange={(e) => handleGlobalFilterChange("buildingId", e.target.value)} />
          <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-gray-50/50" placeholder="Floor ID" value={globalFilters.floorId} onChange={(e) => handleGlobalFilterChange("floorId", e.target.value)} />
          <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-gray-50/50" placeholder="Lease ID" value={globalFilters.leaseId} onChange={(e) => handleGlobalFilterChange("leaseId", e.target.value)} />
          <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-gray-50/50" placeholder="Landlord/Tenant" value={globalFilters.landlordTenant} onChange={(e) => handleGlobalFilterChange("landlordTenant", e.target.value)} />
          <div className="flex items-center px-1"><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.isLandlord} onChange={(e) => handleGlobalFilterChange("isLandlord", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs font-medium text-gray-700">Is Landlord?</span></label></div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="Region" value={globalFilters.region} onChange={(e) => handleGlobalFilterChange("region", e.target.value)} />
              <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="Country" value={globalFilters.country} onChange={(e) => handleGlobalFilterChange("country", e.target.value)} />
              <input className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="City" value={globalFilters.city} onChange={(e) => handleGlobalFilterChange("city", e.target.value)} />
              <select className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white" value={globalFilters.showLeases} onChange={(e) => handleGlobalFilterChange("showLeases", e.target.value)}><option value="">Show Leases...</option><option value="ALL">All</option></select>
              <select className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white" value={globalFilters.showLeasesOptions} onChange={(e) => handleGlobalFilterChange("showLeasesOptions", e.target.value)}><option value="">Options...</option></select>
              <div className="flex items-center gap-4 col-span-1 md:col-span-2 lg:col-span-2 px-1">
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.isSigned} onChange={(e) => handleGlobalFilterChange("isSigned", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs font-medium text-gray-700">Is signed?</span></label>
                <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.isActive} onChange={(e) => handleGlobalFilterChange("isActive", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs font-medium text-gray-700">Is active?</span></label>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex flex-col gap-2 border-b lg:border-b-0 lg:border-r border-gray-200 pb-2 lg:pb-0 lg:pr-3">
                <span className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">Leases Associated With</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.assocSuite} onChange={(e) => handleGlobalFilterChange("assocSuite", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs text-gray-700">Suite</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.assocAmenity} onChange={(e) => handleGlobalFilterChange("assocAmenity", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs text-gray-700">Amenity</span></label>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-b lg:border-b-0 lg:border-r border-gray-200 pb-2 lg:pb-0 lg:px-3">
                <span className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">Lease Type</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.typeExternal} onChange={(e) => handleGlobalFilterChange("typeExternal", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs text-gray-700">External</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.typeInternal} onChange={(e) => handleGlobalFilterChange("typeInternal", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs text-gray-700">Internal</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={globalFilters.typeMsb} onChange={(e) => handleGlobalFilterChange("typeMsb", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs text-gray-700">MSB</span></label>
                </div>
              </div>
              <div className="flex flex-col gap-2 lg:pl-3">
                <span className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">Signing Date</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none bg-white" value={globalFilters.signFrom} onChange={(e) => handleGlobalFilterChange("signFrom", e.target.value)} />
                  <span className="text-gray-400 font-medium text-xs">-</span>
                  <input type="date" className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none bg-white" value={globalFilters.signTo} onChange={(e) => handleGlobalFilterChange("signTo", e.target.value)} />
                  <label className="flex items-center gap-1.5 cursor-pointer ml-2"><input type="checkbox" checked={globalFilters.includeExpired} onChange={(e) => handleGlobalFilterChange("includeExpired", e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded" /><span className="text-xs text-gray-700 whitespace-nowrap">Include Expired</span></label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      

      <div className="bg-white rounded-md shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        )}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-[13px] text-left whitespace-nowrap">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-[#F39C12] text-white">
                {columns.map((col) => (
                  <th key={`header-${col.key}`} className="px-3 py-2 font-semibold tracking-wide border-b border-[#D68910] cursor-pointer hover:bg-[#E67E22] transition-colors" onClick={() => handleSort(col.key)}>
                    <div className="flex items-center justify-between gap-1">
                      <span>{col.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-100 border-b border-gray-300">
                {columns.map((col) => (
                  <th key={`filter-${col.key}`} className="px-2 py-1 font-normal">
                    <input type="text" className="w-full border border-gray-300 px-2 py-1 rounded text-gray-800 text-[11px] focus:outline-none focus:border-blue-500 bg-white" placeholder={`Filter...`} value={columnFilters[col.key]} onChange={(e) => handleColumnFilterChange(col.key, e.target.value)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDataLocal.length === 0 && !loading ? (
                <tr><td colSpan={columns.length} className="py-12 text-center text-gray-500 font-medium">No leases found.</td></tr>
              ) : (
                filteredDataLocal.map((item, index) => (
                  <tr key={item.lsId || index} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onDoubleClick={() => handleRowDoubleClick(item)}>
                    {columns.map((col) => (
                      <td key={`${index}-${col.key}`} className="px-3 py-1.5 text-gray-700 group-hover:text-gray-900 border-r border-gray-50 last:border-r-0">
                        {/* 3. CẬP NHẬT RENDER CỘT Ở ĐÂY */}
                        {col.key === "lsId" ? (
                          <span 
                            className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/lease/console/${item.lsId}`);
                            }}
                          >
                            {item[col.key]}
                          </span>
                        ) : (
                          item[col.key] || "-"
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">Page <span className="font-semibold">{page + 1}</span> / {totalPages}</span>
            <div className="h-3 w-px bg-gray-300"></div>
            <span className="text-xs text-gray-600">Total: <span className="font-semibold">{totalElements}</span></span>
          </div>
          <div className="flex items-center gap-4">
            <select className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
              <option value={10}>10 items</option><option value={20}>20 items</option><option value={50}>50 items</option>
            </select>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="px-2.5 py-1 border border-gray-300 rounded text-xs font-medium bg-white hover:bg-gray-50 disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading} className="px-2.5 py-1 border border-gray-300 rounded text-xs font-medium bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </div>
      <LeaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveModal} mode={modalMode} initialData={selectedData} />
    </div>
  );
}