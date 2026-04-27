import React, { useState, useEffect, useCallback, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import LeaseModal from "../../components/lease/LeaseModal"; 

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
    siteId: "", buildingId: "", leaseId: "", landlordTenant: "", isLandlord: false,
    region: "", country: "", city: "", showLeases: "", showLeasesOptions: "",
    isSigned: false, isActive: false,
    assocSuite: false, assocAmenity: false,
    typeExternal: false, typeInternal: false, typeMsb: false,
    signFrom: "", signTo: "", includeExpired: false
  };

  const initialColumnFilters = {
    lsId: "", siteId: "", buildingId: "", partyId: "", 
    startDate: "", endDate: "", isSign: "", areaNegotiated: "", rentUnitCost: ""
  };

  const [globalFilters, setGlobalFilters] = useState(initialGlobalFilters);
  const [columnFilters, setColumnFilters] = useState(initialColumnFilters);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const columns = [
    { key: "lsId", label: "Lease ID", sortable: true },
    { key: "siteId", label: "Site ID", sortable: true },
    { key: "buildingId", label: "Building ID", sortable: true },
    { key: "partyId", label: "Party Name", sortable: true }, 
    { key: "startDate", label: "Start Date", sortable: true },
    { key: "endDate", label: "End Date", sortable: true },
    { key: "isSign", label: "Is signed?", sortable: true },
    { key: "areaNegotiated", label: "Rented Area", sortable: true },
    { key: "rentUnitCost", label: "Rent Unit Cost", sortable: true }
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
    const delayDebounceFn = setTimeout(() => { fetchLeases(); }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchLeases]);

  const handleGlobalFilterChange = (key, value) => {
    setGlobalFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };
  
  const handleColumnFilterChange = (key, value) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };
  
  const handleClearFilters = () => {
    setGlobalFilters(initialGlobalFilters); setColumnFilters(initialColumnFilters);
    setSortConfig({ key: null, direction: null }); setPage(0);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
    setPage(0);
  };

  const filteredDataLocal = useMemo(() => {
     let filtered = [...data];
     
     // 1. Lọc theo các cột trong bảng (Column Filters)
     Object.keys(columnFilters).forEach(key => {
         if(columnFilters[key]) {
             const searchStr = columnFilters[key].toLowerCase();
             filtered = filtered.filter(item => {
                 let val = item[key];
                 if (typeof val === 'boolean') val = val ? "yes" : "no";
                 else val = String(val || '');
                 return val.toLowerCase().includes(searchStr);
             });
         }
     });

     // 2. Cập nhật lọc kết hợp tức thời cho Global Filters
     if (globalFilters.siteId) {
         const s = globalFilters.siteId.toLowerCase();
         filtered = filtered.filter(item => String(item.siteId || '').toLowerCase().includes(s));
     }
     if (globalFilters.buildingId) {
         const s = globalFilters.buildingId.toLowerCase();
         filtered = filtered.filter(item => String(item.buildingId || '').toLowerCase().includes(s));
     }
     if (globalFilters.leaseId) {
         const s = globalFilters.leaseId.toLowerCase();
         filtered = filtered.filter(item => String(item.lsId || item.leaseId || '').toLowerCase().includes(s));
     }
     if (globalFilters.landlordTenant) {
         const s = globalFilters.landlordTenant.toLowerCase();
         filtered = filtered.filter(item => String(item.partyId || item.partyName || '').toLowerCase().includes(s));
     }
     if (globalFilters.isSigned) {
         filtered = filtered.filter(item => item.isSign === true || item.isSign === "yes" || item.signedDate);
     }
     if (globalFilters.isActive) {
         filtered = filtered.filter(item => item.active === true || item.status === 'ACTIVE');
     }

     return filtered;
  }, [data, columnFilters, globalFilters]);
  
  const handleOpenAdd = () => { 
    setModalMode("ADD"); 
    setSelectedData({ active: false }); 
    setIsModalOpen(true); 
  };
  const handleRowDoubleClick = (item) => { setModalMode("EDIT"); setSelectedData(item); setIsModalOpen(true); };

  const handleSaveModal = async (incomingData, isSendRequest) => {
    try {
      // 1. Lấy dữ liệu hợp đồng thực sự (nằm trong requestData nếu là Send Request)
      const actualLeaseData = isSendRequest ? incomingData.requestData : incomingData;

      let savedLease;
      // 2. Xử lý lưu/cập nhật hợp đồng trước (Draft)
      if (modalMode === "EDIT") {
        const res = await axiosInstance.put(`/lease/leases/${actualLeaseData.lsId}`, actualLeaseData);
        savedLease = res.data;
      } else {
        const res = await axiosInstance.post('/lease/leases', actualLeaseData);
        savedLease = res.data;
      }

      // 3. XỬ LÝ GỬI REQUEST DUYỆT QUA API SUBMIT-MODULE
      if (isSendRequest) {
        const targetId = savedLease?.lsId || actualLeaseData.lsId;
        
        // Gói data đúng chuẩn theo yêu cầu của API @PostMapping("/submit-module")
        const finalRequestPayload = {
          siteId: actualLeaseData.siteId || "N/A",
          action: modalMode === "ADD" ? "CREATE" : "UPDATE",
          requestType: "LEASE_DETAILS", // Map đúng với enum RQType.LEASE_DETAILS
          targetId: targetId,
          data: actualLeaseData // ⚠️ Chú ý: Backend submit-module dùng key "data"
        };
        
        await axiosInstance.post("/lease/requests/submit-module", finalRequestPayload);
        alert("Lưu và gửi yêu cầu phê duyệt thành công!");
      } else {
        alert("Lưu nháp hợp đồng thành công!");
      }

      setIsModalOpen(false);
      fetchLeases(); 
    } catch (error) { 
      console.error("Chi tiết lỗi:", error);
      if (error.response && error.response.status === 403) {
          alert("LỖI 403 FORBIDDEN: Phiên đăng nhập đã hết hạn hoặc tài khoản không có quyền Gửi Phê Duyệt. Vui lòng F5 trang hoặc Đăng nhập lại!");
      } else {
          alert("Lỗi hệ thống! Vui lòng kiểm tra Console (F12)."); 
      }
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 text-gray-800 font-sans p-4 animate-[fadeIn_0.2s_ease-out]">
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
                        {col.key === "lsId" ? (
                          <span 
                            className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); navigate(`/lease/console/${item.lsId}`); }}
                          >
                            {item[col.key]}
                          </span>
                        ) : col.key === "isSign" ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item[col.key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {item[col.key] ? "YES" : "NO"}
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