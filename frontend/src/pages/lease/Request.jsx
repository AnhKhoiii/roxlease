import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";

export default function Request() {
  // ==========================================
  // STATE QUẢN LÝ DỮ LIỆU & PHÂN TRANG
  // ==========================================
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pagePending, setPagePending] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  const [historyRequests, setHistoryRequests] = useState([]);
  const [pageHistory, setPageHistory] = useState(0);
  const [totalHistory, setTotalHistory] = useState(0);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("PENDING");
  const size = 10;

  // ==========================================
  // STATE BỘ LỌC (FILTERS)
  // ==========================================
  const [filters, setFilters] = useState({
    requestId: "", requestType: "", siteId: "", requestedBy: "", fromDate: "", toDate: ""
  });

  // ==========================================
  // STATE QUẢN LÝ MODAL
  // ==========================================
  const [rejectModal, setRejectModal] = useState({ isOpen: false, id: null, comment: "" });
  
  // STATE MỚI: Quản lý Modal Xem chi tiết Comment
  const [viewCommentModal, setViewCommentModal] = useState({ isOpen: false, comment: "" });
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    siteId: "", targetId: "", action: "UPDATE", requestType: "CONTRACT_OPTIONS",
    document: "", comment: "", requestData: {} 
  });

  // ==========================================
  // HÀM GỌI API (FETCH DATA)
  // ==========================================
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: pagePending, size, ...filters }).toString();
      const res = await axiosInstance.get(`/lease/requests/pending?${queryParams}`);
      setPendingRequests(res.data.content || []);
      setTotalPending(res.data.totalPages || 0);
    } catch (err) { console.error("Failed to fetch pending requests", err); } 
    finally { setLoading(false); }
  }, [pagePending, filters]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: pageHistory, size, ...filters }).toString();
      const res = await axiosInstance.get(`/lease/requests/history?${queryParams}`);
      setHistoryRequests(res.data.content || []);
      setTotalHistory(res.data.totalPages || 0);
    } catch (err) { console.error("Failed to fetch history requests", err); } 
    finally { setLoading(false); }
  }, [pageHistory, filters]);

  useEffect(() => {
    if (activeTab === "PENDING") fetchPending();
    else fetchHistory();
  }, [activeTab, pagePending, pageHistory]); 

  // ==========================================
  // XỬ LÝ SỰ KIỆN TẠO MỚI (PARSE FILE CSV & SUBMIT)
  // ==========================================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);
    setUploading(true);
    try {
      const res = await axiosInstance.post("/files/upload", uploadData, { headers: { "Content-Type": "multipart/form-data" } });
      const fileUrl = res.data.url;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const lines = text.split('\n');
        const parsedData = {};
        let isDataSection = false;

        lines.forEach(line => {
          const cols = line.split(',').map(c => c.trim().replace(/;/g, ','));
          if (cols.length >= 2) {
            const key = cols[0].replace(/\uFEFF/, '').trim(); 
            const val = cols[1];

            if (key === 'Field Name') {
              isDataSection = true;
            } else if (isDataSection && key) {
              parsedData[key] = val === 'null' ? null : val;
            }
          }
        });

        setAddFormData(prev => ({ ...prev, document: fileUrl, requestData: parsedData }));
        alert("Đã bóc tách dữ liệu từ file thành công! Bạn có thể Submit Request.");
      };
      reader.readAsText(file);

    } catch (error) { alert("Lỗi tải file đính kèm!"); } 
    finally { setUploading(false); }
  };

  const handleSaveNewRequest = async () => {
    if (!addFormData.siteId.trim() || !addFormData.targetId.trim()) {
      alert("Site ID và Target ID là bắt buộc!");
      return;
    }
    setLoading(true);
    try {
      const reqId = "REQ-" + Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const payload = {
        requestId: reqId,
        siteId: addFormData.siteId,
        action: addFormData.action,
        requestType: addFormData.requestType,
        targetId: addFormData.targetId,
        document: addFormData.document,
        comment: addFormData.comment,
        requestData: addFormData.requestData, 
        createdBy: "Admin",
        status: "PENDING"
      };

      await axiosInstance.post('/lease/requests', payload);
      setIsAddOpen(false);
      setAddFormData({ siteId: "", targetId: "", action: "UPDATE", requestType: "CONTRACT_OPTIONS", document: "", comment: "", requestData: {} });
      fetchPending();
      setActiveTab("PENDING");
    } catch (err) { alert("Failed to create new request."); } 
    finally { setLoading(false); }
  };

  // ==========================================
  // CÁC HÀM DUYỆT / TỪ CHỐI
  // ==========================================
  const handleFilter = () => {
    if (activeTab === "PENDING") { setPagePending(0); fetchPending(); } 
    else { setPageHistory(0); fetchHistory(); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Are you sure you want to approve this request?")) return;
    setLoading(true);
    try {
      await axiosInstance.put(`/lease/requests/${id}/approve`);
      fetchPending();
    } catch (err) { alert("Failed to approve request."); } 
    finally { setLoading(false); }
  };

  const handleOpenReject = (id) => setRejectModal({ isOpen: true, id, comment: "" });

  const handleConfirmReject = async () => {
    if (!rejectModal.comment.trim()) { alert("Please provide a reason for rejection."); return; }
    setLoading(true);
    try {
      await axiosInstance.put(`/lease/requests/${rejectModal.id}/reject`, { comment: rejectModal.comment });
      setRejectModal({ isOpen: false, id: null, comment: "" });
      fetchPending();
    } catch (err) { alert("Failed to reject request."); } 
    finally { setLoading(false); }
  };

  const handleSelectRow = (e, id) => {
    if (e.target.checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(selId => selId !== id));
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 text-gray-800 font-sans p-4">
      
      {/* 1. HEADER BAR & TABS */}
      <div className="mb-4 flex justify-between items-end border-b border-gray-200 pb-2">
        <div className="flex gap-1">
          <button onClick={() => { setActiveTab("PENDING"); setPagePending(0); }} className={`px-6 py-2.5 text-[13px] font-bold rounded-t-md transition-colors ${activeTab === "PENDING" ? "bg-white text-[#D68910] border-t-2 border-[#D68910] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]" : "text-gray-600 hover:bg-gray-200"}`}>Approval Queue</button>
          <button onClick={() => { setActiveTab("HISTORY"); setPageHistory(0); }} className={`px-6 py-2.5 text-[13px] font-bold rounded-t-md transition-colors ${activeTab === "HISTORY" ? "bg-white text-[#D68910] border-t-2 border-[#D68910] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]" : "text-gray-600 hover:bg-gray-200"}`}>Request History</button>
        </div>
        
        <button onClick={() => setIsAddOpen(true)} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-colors mb-1">
          + Add New Request
        </button>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 mb-4 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Request ID</label>
            <input type="text" value={filters.requestId} onChange={e => setFilters({...filters, requestId: e.target.value})} placeholder="Filter..." className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Request Type</label>
            <select value={filters.requestType} onChange={e => setFilters({...filters, requestType: e.target.value})} className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white">
              <option value="">All Types</option>
              <option value="CONTRACT_OPTIONS">Contract Options</option>
              <option value="CONTRACT_TERMS">Contract Terms</option>
              <option value="CONTRACT_AMENDMENTS">Amendments</option>
              <option value="SUITE_ASSIGNMENT">Suite Assignment</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Site ID</label>
            <input type="text" value={filters.siteId} onChange={e => setFilters({...filters, siteId: e.target.value})} placeholder="Filter..." className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Requested By</label>
            <input type="text" value={filters.requestedBy} onChange={e => setFilters({...filters, requestedBy: e.target.value})} placeholder="Filter..." className="border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
          </div>

          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Created Date</label>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
              <span className="text-xs text-gray-500 font-medium">to</span>
              <input type="date" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end lg:justify-start">
            <button onClick={handleFilter} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 px-6 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* 3. TABLE SECTION */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-[#F39C12]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        )}

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                {activeTab === "PENDING" && (
                  <th className="w-10 px-3 py-2.5 text-center border-b border-[#D68910]"><input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" /></th>
                )}
                
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Request ID</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Action</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Request Type</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Site ID</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Created Date</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910] text-center">Document</th>

                {activeTab === "PENDING" ? (
                  <>
                    <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910] text-center w-24">Approve</th>
                    <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910] text-center w-24">Reject</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Status</th>
                    <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Completed By</th>
                    <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Comment</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(activeTab === "PENDING" ? pendingRequests : historyRequests).length === 0 && !loading ? (
                <tr><td colSpan={10} className="py-16 text-center text-gray-500 font-medium">No requests found in this queue.</td></tr>
              ) : (
                (activeTab === "PENDING" ? pendingRequests : historyRequests).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-blue-50/50 transition-colors group">
                    
                    {activeTab === "PENDING" && (
                      <td className="px-3 py-2 text-center border-r border-gray-50">
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => handleSelectRow(e, item.id)} className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer" />
                      </td>
                    )}

                    <td className="px-4 py-2 text-blue-600 font-bold border-r border-gray-50 cursor-pointer hover:underline">{item.requestId || item.id}</td>
                    
                    <td className="px-4 py-2 border-r border-gray-50">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.action === 'CREATE' ? 'bg-green-100 text-green-700' : item.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.action || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">
                      <div className="font-semibold">{item.requestType || "-"}</div>
                      {item.requestData?.suId && <div className="text-[10px] text-gray-500 font-normal mt-0.5 whitespace-nowrap">Suite Code: {item.requestData.suId}</div>}
                      {item.requestData?.opType && <div className="text-[10px] text-gray-500 font-normal mt-0.5 whitespace-nowrap">Op Type: {item.requestData.opType}</div>}
                      {item.requestData?.clType && <div className="text-[10px] text-gray-500 font-normal mt-0.5 whitespace-nowrap">Cl Type: {item.requestData.clType}</div>}
                    </td>

                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50 font-medium">{item.siteId || "-"}</td>
                    <td className="px-4 py-2 text-gray-600 border-r border-gray-50">{item.createdDate ? new Date(item.createdDate).toLocaleDateString() : "-"}</td>
                    
                    <td className="px-4 py-2 border-r border-gray-50 text-center">
                      {item.document ? (
                        <a href={`http://localhost:8080${item.document}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-bold underline bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors inline-block">Tải File</a>
                      ) : "-"}
                    </td>

                    {activeTab === "PENDING" ? (
                      <>
                        <td className="px-2 py-2 border-r border-gray-50 text-center"><button onClick={() => handleApprove(item.id)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-colors w-full">Approve</button></td>
                        <td className="px-2 py-2 border-r border-gray-50 text-center"><button onClick={() => handleOpenReject(item.id)} disabled={loading} className="bg-[#F9E79F] hover:bg-[#F4D03F] text-[#9C640C] px-4 py-1.5 rounded-full text-[10px] font-bold transition-colors w-full">Reject</button></td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 border-r border-gray-50"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.status}</span></td>
                        <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{item.completedBy || "System"}</td>
                        {/* CỘT COMMENT CÓ THỂ CLICK ĐỂ XEM CHI TIẾT */}
                        <td 
                          className="px-4 py-2 text-blue-600 font-medium border-r border-gray-50 truncate max-w-[150px] cursor-pointer hover:underline" 
                          onClick={() => { if(item.comment) setViewCommentModal({ isOpen: true, comment: item.comment }); }}
                          title="Click để xem toàn bộ comment"
                        >
                          {item.comment || "-"}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-600 font-medium">Page <span className="font-bold">{activeTab === "PENDING" ? pagePending + 1 : pageHistory + 1}</span> of {activeTab === "PENDING" ? totalPending || 1 : totalHistory || 1}</div>
          <div className="flex gap-2">
            <button onClick={() => activeTab === "PENDING" ? setPagePending(p => Math.max(0, p - 1)) : setPageHistory(p => Math.max(0, p - 1))} disabled={(activeTab === "PENDING" ? pagePending : pageHistory) === 0 || loading} className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors">Prev</button>
            <button onClick={() => activeTab === "PENDING" ? setPagePending(p => Math.min(totalPending - 1, p + 1)) : setPageHistory(p => Math.min(totalHistory - 1, p + 1))} disabled={(activeTab === "PENDING" ? pagePending >= totalPending - 1 : pageHistory >= totalHistory - 1) || loading} className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors">Next</button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL: ADD NEW REQUEST (3 CỘT)
      ========================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[900px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white drop-shadow-sm">Create New Request (Manual)</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-7 bg-gray-50 flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                
                {/* CỘT 1 */}
                <div className="flex flex-col gap-4 border-r border-gray-100 pr-2">
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Request ID</label>
                    <input type="text" value="Auto-generated" disabled className="border border-gray-300 rounded px-3 py-1.5 text-[12px] bg-gray-100 text-gray-500 w-full" />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Site ID <span className="text-red-500">*</span></label>
                    <input type="text" value={addFormData.siteId} onChange={(e) => setAddFormData({...addFormData, siteId: e.target.value})} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:outline-none w-full" placeholder="Ex: S-HN-001" />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Target ID <span className="text-red-500">*</span></label>
                    <input type="text" value={addFormData.targetId} onChange={(e) => setAddFormData({...addFormData, targetId: e.target.value})} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:outline-none w-full" placeholder="Ex: OP-001 or NEW" />
                  </div>
                </div>

                {/* CỘT 2 */}
                <div className="flex flex-col gap-4 border-r border-gray-100 pr-2">
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Action <span className="text-red-500">*</span></label>
                    <select value={addFormData.action} onChange={(e) => setAddFormData({...addFormData, action: e.target.value})} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:outline-none w-full bg-white">
                      <option value="CREATE">Create</option>
                      <option value="UPDATE">Update</option>
                      <option value="DELETE">Delete</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 w-full h-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Document (CSV Data)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="file" onChange={handleFileUpload} disabled={uploading} className="block w-full text-[11px] text-gray-500 file:mr-2 file:py-1.5 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded cursor-pointer" />
                    </div>
                    {uploading && <span className="text-[10px] text-orange-500 font-semibold mt-1">Reading data & Uploading...</span>}
                    {Object.keys(addFormData.requestData).length > 0 && (
                      <span className="text-[10px] text-green-600 font-semibold mt-1 bg-green-50 p-1 rounded">✔ Parsed {Object.keys(addFormData.requestData).length} fields from file.</span>
                    )}
                  </div>
                </div>

                {/* CỘT 3 */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1 w-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Request Type <span className="text-red-500">*</span></label>
                    <select value={addFormData.requestType} onChange={(e) => setAddFormData({...addFormData, requestType: e.target.value})} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:outline-none w-full bg-white">
                      <option value="CONTRACT_OPTIONS">Contract Options</option>
                      <option value="CONTRACT_TERMS">Contract Terms</option>
                      <option value="CONTRACT_AMENDMENTS">Amendments</option>
                      <option value="SUITE_ASSIGNMENT">Suite Assignment</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 w-full h-full">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Comments</label>
                    <textarea value={addFormData.comment} onChange={(e) => setAddFormData({...addFormData, comment: e.target.value})} rows="3" className="border border-gray-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:outline-none w-full flex-1 resize-none" placeholder="Reason for this manual request..."></textarea>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setIsAddOpen(false)} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded transition-colors">Cancel</button>
                <button onClick={handleSaveNewRequest} disabled={!addFormData.siteId || !addFormData.targetId || loading} className="px-6 py-2 text-xs font-bold text-white bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 shadow-sm rounded transition-colors">Save Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[500px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-tight text-white drop-shadow-sm">Reject Request</h2>
              <button onClick={() => setRejectModal({ isOpen: false, id: null, comment: "" })} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Reason for rejection <span className="text-red-500">*</span></label>
              <textarea rows="4" className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50" placeholder="Enter detailed comment here..." value={rejectModal.comment} onChange={(e) => setRejectModal({ ...rejectModal, comment: e.target.value })}></textarea>
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setRejectModal({ isOpen: false, id: null, comment: "" })} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">Cancel</button>
                <button onClick={handleConfirmReject} disabled={!rejectModal.comment.trim()} className="px-5 py-2 text-xs font-bold text-[#9C640C] bg-[#F9E79F] hover:bg-[#F4D03F] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors">Confirm Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MỚI: XEM CHI TIẾT COMMENT (VIEW FULL COMMENT) */}
      {viewCommentModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[500px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-tight text-white drop-shadow-sm">Full Comment Details</h2>
              <button onClick={() => setViewCommentModal({ isOpen: false, comment: "" })} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50/50 p-4 rounded-md border border-yellow-200 text-sm text-gray-800 whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed shadow-inner">
                {viewCommentModal.comment}
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => setViewCommentModal({ isOpen: false, comment: "" })} className="px-5 py-2 text-xs font-bold text-white bg-gray-600 hover:bg-gray-700 rounded transition-colors shadow-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}