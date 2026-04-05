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
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("PENDING");
  const size = 10;

  // ==========================================
  // STATE BỘ LỌC (FILTERS)
  // ==========================================
  const [filters, setFilters] = useState({
    requestId: "",
    requestType: "",
    siteId: "",
    requestedBy: "",
    fromDate: "",
    toDate: ""
  });

  // ==========================================
  // STATE QUẢN LÝ MODAL
  // ==========================================
  const [rejectModal, setRejectModal] = useState({ isOpen: false, id: null, comment: "" });
  
  // Modal Thêm mới (Add New)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    requestType: "NEW_LEASE",
    siteId: "",
    document: "",
    comment: ""
  });

  // ==========================================
  // HÀM GỌI API (FETCH DATA)
  // ==========================================
  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      // Lưu ý: Đã nối thêm param filters nếu Backend của bạn có hỗ trợ lọc
      const queryParams = new URLSearchParams({
        page: pagePending, size, ...filters
      }).toString();
      
      const res = await axiosInstance.get(`/lease/requests/pending?${queryParams}`);
      setPendingRequests(res.data.content || []);
      setTotalPending(res.data.totalPages || 0);
    } catch (err) {
      console.error("Failed to fetch pending requests", err);
    } finally {
      setLoading(false);
    }
  }, [pagePending, filters]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageHistory, size, ...filters
      }).toString();

      const res = await axiosInstance.get(`/lease/requests/history?${queryParams}`);
      setHistoryRequests(res.data.content || []);
      setTotalHistory(res.data.totalPages || 0);
    } catch (err) {
      console.error("Failed to fetch history requests", err);
    } finally {
      setLoading(false);
    }
  }, [pageHistory, filters]);

  useEffect(() => {
    if (activeTab === "PENDING") fetchPending();
    else fetchHistory();
  }, [activeTab, pagePending, pageHistory]); // Tạm bỏ fetchPending/fetchHistory khỏi dependency để tránh loop nếu có filter thay đổi liên tục

  // ==========================================
  // XỬ LÝ SỰ KIỆN (ACTIONS)
  // ==========================================
  const handleFilter = () => {
    if (activeTab === "PENDING") {
      setPagePending(0);
      fetchPending();
    } else {
      setPageHistory(0);
      fetchHistory();
    }
  };

  const handleSaveNewRequest = async () => {
    if (!addFormData.siteId.trim()) {
      alert("Site ID is required!");
      return;
    }
    setLoading(true);
    try {
      // Fake username "Admin" cho createdBy, trong thực tế lấy từ Context/Token
      const payload = { ...addFormData, createdBy: "Admin" };
      await axiosInstance.post('/lease/requests', payload);
      setIsAddOpen(false);
      setAddFormData({ requestType: "NEW_LEASE", siteId: "", document: "", comment: "" });
      fetchPending();
      setActiveTab("PENDING");
    } catch (err) {
      alert("Failed to create new request.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Are you sure you want to approve this request?")) return;
    setLoading(true);
    try {
      await axiosInstance.put(`/lease/requests/${id}/approve`);
      fetchPending();
    } catch (err) {
      alert("Failed to approve request.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReject = (id) => {
    setRejectModal({ isOpen: true, id, comment: "" });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.comment.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.put(`/lease/requests/${rejectModal.id}/reject`, { comment: rejectModal.comment });
      setRejectModal({ isOpen: false, id: null, comment: "" });
      fetchPending();
    } catch (err) {
      alert("Failed to reject request.");
    } finally {
      setLoading(false);
    }
  };

  // Checkbox Logic
  const handleSelectRow = (e, id) => {
    if (e.target.checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(selId => selId !== id));
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 text-gray-800 font-sans p-4">
      
      {/* 1. HEADER BAR & TABS */}
      <div className="mb-4 flex justify-between items-end border-b border-gray-200 pb-2">
        <div className="flex gap-1">
          <button 
            onClick={() => { setActiveTab("PENDING"); setPagePending(0); }}
            className={`px-6 py-2.5 text-[13px] font-bold rounded-t-md transition-colors ${activeTab === "PENDING" ? "bg-white text-[#D68910] border-t-2 border-[#D68910] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]" : "text-gray-600 hover:bg-gray-200"}`}
          >
            Approval Queue
          </button>
          <button 
            onClick={() => { setActiveTab("HISTORY"); setPageHistory(0); }}
            className={`px-6 py-2.5 text-[13px] font-bold rounded-t-md transition-colors ${activeTab === "HISTORY" ? "bg-white text-[#D68910] border-t-2 border-[#D68910] shadow-[0_-2px_4px_rgba(0,0,0,0.02)]" : "text-gray-600 hover:bg-gray-200"}`}
          >
            Request History
          </button>
        </div>
        
        {/* NÚT ADD NEW */}
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-colors mb-1"
        >
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
              <option value="NEW_LEASE">New Lease</option>
              <option value="RENEWAL">Renewal</option>
              <option value="TERMINATION">Termination</option>
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
                  <th className="w-10 px-3 py-2.5 text-center border-b border-[#D68910]">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300" />
                  </th>
                )}
                
                {/* Các Cột Chuẩn Yêu Cầu */}
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Request ID</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Action</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Request Type</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Site ID</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Created Date</th>
                <th className="px-4 py-2.5 font-semibold tracking-wide border-b border-[#D68910]">Document</th>

                {/* Các Cột Dành Riêng Cho Từng Tab */}
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
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-500 font-medium">
                    No requests found in this queue.
                  </td>
                </tr>
              ) : (
                (activeTab === "PENDING" ? pendingRequests : historyRequests).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-blue-50/50 transition-colors group">
                    
                    {activeTab === "PENDING" && (
                      <td className="px-3 py-2 text-center border-r border-gray-50">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => handleSelectRow(e, item.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer" 
                        />
                      </td>
                    )}

                    {/* DỮ LIỆU HIỂN THỊ */}
                    <td className="px-4 py-2 text-blue-600 font-bold border-r border-gray-50 cursor-pointer hover:underline">{item.requestId || item.id}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">-</td> {/* Action placeholder */}
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50 font-medium">{item.requestType || "-"}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{item.siteId || "-"}</td>
                    <td className="px-4 py-2 text-gray-600 border-r border-gray-50">{item.createdDate ? new Date(item.createdDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2 border-r border-gray-50 text-blue-500 hover:underline cursor-pointer">{item.document ? "View Doc" : "-"}</td>

                    {/* HIỂN THỊ NÚT / TRẠNG THÁI */}
                    {activeTab === "PENDING" ? (
                      <>
                        <td className="px-2 py-2 border-r border-gray-50 text-center">
                          <button onClick={() => handleApprove(item.id)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-colors w-full">
                            Approve
                          </button>
                        </td>
                        <td className="px-2 py-2 border-r border-gray-50 text-center">
                          <button onClick={() => handleOpenReject(item.id)} disabled={loading} className="bg-[#F9E79F] hover:bg-[#F4D03F] text-[#9C640C] px-4 py-1.5 rounded-full text-[10px] font-bold transition-colors w-full">
                            Reject
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 border-r border-gray-50">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{item.completedBy || "System"}</td>
                        <td className="px-4 py-2 text-gray-600 border-r border-gray-50 truncate max-w-[150px]" title={item.comment}>{item.comment || "-"}</td>
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
          <div className="text-xs text-gray-600 font-medium">
            Page <span className="font-bold">{activeTab === "PENDING" ? pagePending + 1 : pageHistory + 1}</span> of {activeTab === "PENDING" ? totalPending || 1 : totalHistory || 1}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => activeTab === "PENDING" ? setPagePending(p => Math.max(0, p - 1)) : setPageHistory(p => Math.max(0, p - 1))} 
              disabled={(activeTab === "PENDING" ? pagePending : pageHistory) === 0 || loading} 
              className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <button 
              onClick={() => activeTab === "PENDING" ? setPagePending(p => Math.min(totalPending - 1, p + 1)) : setPageHistory(p => Math.min(totalHistory - 1, p + 1))} 
              disabled={(activeTab === "PENDING" ? pagePending >= totalPending - 1 : pageHistory >= totalHistory - 1) || loading} 
              className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODALS
      ========================================== */}
      
      {/* ADD NEW REQUEST MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[500px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-tight text-white drop-shadow-sm">Create New Request</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Request Type <span className="text-red-500">*</span></label>
                <select 
                  className="border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  value={addFormData.requestType}
                  onChange={(e) => setAddFormData({...addFormData, requestType: e.target.value})}
                >
                  <option value="NEW_LEASE">New Lease</option>
                  <option value="RENEWAL">Renewal</option>
                  <option value="TERMINATION">Termination</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Site ID <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Enter Site ID"
                  value={addFormData.siteId}
                  onChange={(e) => setAddFormData({...addFormData, siteId: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Document Link</label>
                <input 
                  type="text" 
                  className="border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="https://..."
                  value={addFormData.document}
                  onChange={(e) => setAddFormData({...addFormData, document: e.target.value})}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Comments</label>
                <textarea 
                  rows="3" 
                  className="border border-gray-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  placeholder="Optional details..."
                  value={addFormData.comment}
                  onChange={(e) => setAddFormData({...addFormData, comment: e.target.value})}
                ></textarea>
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <button onClick={() => setIsAddOpen(false)} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">Cancel</button>
                <button onClick={handleSaveNewRequest} disabled={!addFormData.siteId || loading} className="px-5 py-2 text-xs font-bold text-white bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 rounded transition-colors">Save Request</button>
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
              <textarea 
                rows="4" 
                className="w-full border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
                placeholder="Enter detailed comment here..."
                value={rejectModal.comment}
                onChange={(e) => setRejectModal({ ...rejectModal, comment: e.target.value })}
              ></textarea>
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setRejectModal({ isOpen: false, id: null, comment: "" })} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">Cancel</button>
                <button onClick={handleConfirmReject} disabled={!rejectModal.comment.trim()} className="px-5 py-2 text-xs font-bold text-[#9C640C] bg-[#F9E79F] hover:bg-[#F4D03F] disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors">Confirm Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}