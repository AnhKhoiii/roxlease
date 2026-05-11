import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";

// ==========================================
// 1. REUSABLE MODAL COMPONENT
// ==========================================
const CostModal = ({ isOpen, onClose, data, mode, onAction }) => {
  const [reason, setReason] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  // Reset state mỗi khi mở lại Modal
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const isCancelMode = mode === "CANCEL";
  const isApproveMode = mode === "APPROVE";
  
  // Lấy ID an toàn (Cost ID cho Tab 1, Schedule ID cho Tab 2, 3)
  const safeId = data.id || data.recurringCostId || data._id;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
            {mode === "VIEW" ? "Schedule Details" : isCancelMode ? "Cancel Schedule" : "Approve Schedule"}
          </h2>
          <button onClick={onClose} className="text-white hover:text-red-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 bg-gray-50 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded shadow-sm border border-gray-200">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Due Date / Period</p>
              <p className="text-sm font-semibold text-blue-700">
                {data.dueDate ? new Date(data.dueDate).toLocaleDateString() : (data.startDate || "N/A")}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Lease ID</p>
              <p className="text-sm font-medium text-gray-800">{data.leaseId || data.lsId || "N/A"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Income Total</p>
              <p className="text-sm font-mono font-bold text-green-600">{data.amountInTotal?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Expense Total</p>
              <p className="text-sm font-mono font-bold text-red-600">{data.amountOutTotal?.toLocaleString() || 0}</p>
            </div>
            
            {data.paymentStatus && (
              <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Current Status</p>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded text-[11px] font-bold ${data.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : data.paymentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                  {data.paymentStatus}
                </span>
                {data.cancelReason && <p className="text-xs text-red-500 mt-2 font-medium italic">Reason: {data.cancelReason}</p>}
                {data.paymentDate && <p className="text-xs text-green-600 mt-2 font-medium italic">Paid on: {new Date(data.paymentDate).toLocaleDateString()}</p>}
              </div>
            )}
          </div>

          {isCancelMode && (
            <div className="flex flex-col gap-1 w-full mt-2">
              <label className="font-bold text-[10px] text-red-600 uppercase tracking-wide">Cancellation Reason <span className="text-red-500">*</span></label>
              <textarea 
                value={reason} onChange={e => setReason(e.target.value)} required
                placeholder="Enter reason for cancellation..." 
                className="border border-red-300 rounded px-3 py-2 text-[12px] outline-none focus:border-red-500 bg-white shadow-sm w-full min-h-[80px] resize-none" 
              />
            </div>
          )}

          {isApproveMode && (
            <div className="bg-blue-50 p-4 rounded border border-blue-200 mt-2 flex flex-col gap-3">
              <p className="text-sm font-semibold text-blue-800">Confirm payment processing for this schedule?</p>
              <div className="flex flex-col gap-1 w-1/2">
                <label className="font-bold text-[10px] text-blue-800 uppercase tracking-wide">Payment Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={paymentDate} 
                  onChange={e => setPaymentDate(e.target.value)} 
                  required
                  className="border border-blue-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm" 
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-5 py-2 bg-gray-100 text-gray-700 rounded text-xs font-bold hover:bg-gray-200 transition-colors">Close</button>
          {mode !== "VIEW" && (
            <button 
              onClick={() => isCancelMode ? onAction(safeId, { reason }) : onAction(safeId, { paymentDate })} 
              disabled={(isCancelMode && !reason.trim()) || (isApproveMode && !paymentDate)}
              className={`px-6 py-2 text-white rounded text-xs font-bold shadow-sm transition-colors disabled:opacity-50 ${isCancelMode ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isCancelMode ? "Confirm Cancel" : "Confirm Approve & Pay"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. TAB 1: SCHEDULE COST (UC-RC-01)
// ==========================================
const ScheduleCostTab = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/cost/wizard/recurring-costs");
      setData(res.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async (id) => {
    const safeStringId = String(id);
    if (!safeStringId || safeStringId === "undefined") {
      alert("Error: Cannot find ID for this record!");
      return;
    }
    
    try {
      setLoading(true);
      const res = await axiosInstance.post(`/cost/wizard/recurring-costs/${safeStringId}/generate`);
      // 🚀 Hiển thị đúng lời nhắn từ Backend
      alert(res.data.message || "Schedules generated successfully!");
      fetchData();
    } catch (err) { 
      // 🚀 Nếu có lỗi logic, nó sẽ pop-up lên đây cho bạn đọc
      alert(err.response?.data?.error || "Error generating schedule"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded shadow-sm">
        <p className="text-xs text-yellow-800 font-semibold">⚠️ Note: Base recurring costs that haven't generated schedules will not appear in the Approval flow.</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 bg-[#F39C12] text-white shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Cost ID</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Lease ID</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Start Date</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-right">Income Total</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-right">Expense Total</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => {
                const itemId = row.recurringCostId || row.id || row._id;
                
                return (
                  <tr key={idx} className="hover:bg-orange-50/50">
                    <td className="px-4 py-2.5 font-bold text-blue-600">{itemId || "N/A"}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.lsId}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.startDate}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-green-600">{row.amountInTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{row.amountOutTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => handleGenerate(itemId)} disabled={loading} className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 text-white px-3 py-1 rounded text-[11px] font-bold shadow-sm transition-colors">
                        {loading ? "Generating..." : "Generate Schedule"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && !loading && (
                <tr><td colSpan="6" className="text-center py-6 text-gray-500">No pending recurring costs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. TAB 2: APPROVAL COST (UC-RC-02, 03, 04)
// ==========================================
const ApprovalCostTab = () => {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, data: null, mode: "" });

  const fetchData = async () => {
    try {
      const res = await axiosInstance.get("/cost/wizard/schedules/pending");
      setData(res.data || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleAction = async (id, payload) => {
    const safeStringId = String(id);
    try {
      if (modal.mode === "APPROVE") {
        await axiosInstance.put(`/cost/wizard/schedules/${safeStringId}/approve`, { paymentDate: payload.paymentDate });
        alert("Schedule approved and paid successfully!");
      } else {
        await axiosInstance.put(`/cost/wizard/schedules/${safeStringId}/cancel`, { reason: payload.reason });
        alert("Schedule cancelled successfully!");
      }
      setModal({ isOpen: false });
      fetchData();
    } catch (err) { 
      alert(err.response?.data?.error || "Error processing request"); 
    }
  };

  const getDueDateClass = (dueDateStr) => {
    if (!dueDateStr) return "text-gray-700";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-red-600 font-bold";
    if (diffDays <= 30) return "text-yellow-600 font-bold";
    return "text-green-600 font-bold";
  };

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      <CostModal isOpen={modal.isOpen} data={modal.data} mode={modal.mode} onClose={() => setModal({ isOpen: false })} onAction={handleAction} />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 bg-[#F39C12] text-white shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Schedule ID</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Due Date</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-right">Income Total</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-right">Expense Total</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-center">Status</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => {
                return (
                  <tr key={idx} className="hover:bg-orange-50/50 cursor-pointer" onDoubleClick={() => setModal({ isOpen: true, data: row, mode: "VIEW" })}>
                    <td className="px-4 py-2.5 font-bold text-blue-600">{row.id || "N/A"}</td>
                    <td className={`px-4 py-2.5 ${getDueDateClass(row.dueDate)}`}>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-green-600">{row.amountInTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{row.amountOutTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center"><span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold">PENDING</span></td>
                    <td className="px-4 py-2.5 text-center flex justify-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, data: row, mode: "APPROVE" }); }} className="bg-green-50 border border-green-200 text-green-700 hover:bg-green-600 hover:text-white px-3 py-1 rounded text-[11px] font-bold transition-colors">Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, data: row, mode: "CANCEL" }); }} className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded text-[11px] font-bold transition-colors">Cancel</button>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan="6" className="text-center py-6 text-gray-500">No pending schedules found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. TAB 3: REVIEW COST (UC-RC-05) - READ ONLY
// ==========================================
const ReviewCostTab = () => {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, data: null, mode: "VIEW" });

  const fetchData = async () => {
    try {
      const res = await axiosInstance.get("/cost/wizard/schedules/history");
      setData(res.data || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      <CostModal isOpen={modal.isOpen} data={modal.data} mode={modal.mode} onClose={() => setModal({ isOpen: false })} />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 bg-[#F39C12] text-white shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Schedule ID</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910]">Due Date</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-right">Income</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-right">Expense</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-center">Status</th>
                <th className="px-4 py-3 font-semibold border-b border-[#D68910] text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => {
                return (
                  <tr key={idx} className="hover:bg-orange-50/50 cursor-pointer" onDoubleClick={() => setModal({ isOpen: true, data: row, mode: "VIEW" })}>
                    <td className="px-4 py-2.5 font-bold text-blue-600">{row.id || "N/A"}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-green-600">{row.amountInTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{row.amountOutTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-[10px] text-gray-500 font-medium">
                        {row.paymentStatus === 'PAID' 
                          ? `Paid: ${row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : "-"}` 
                          : "Cancelled"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {data.length === 0 && <tr><td colSpan="6" className="text-center py-6 text-gray-500">No historical data found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. MAIN COMPONENT: COST WIZARD
// ==========================================
export default function CostWizard() {
  const [activeTab, setActiveTab] = useState("SCHEDULE");

  return (
    <div className="p-6 bg-gray-50 h-full flex flex-col min-h-screen">
      <div className="flex justify-between items-end mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Cost Wizard</h1>
          <p className="text-[11px] text-gray-500 mt-1">Manage recurring cost generation, approvals, and history.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-4 shrink-0">
        {["SCHEDULE", "APPROVAL", "REVIEW"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab ? "border-[#D68910] text-[#D68910] bg-orange-50/50" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            {tab} Cost
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "SCHEDULE" && <ScheduleCostTab />}
        {activeTab === "APPROVAL" && <ApprovalCostTab />}
        {activeTab === "REVIEW" && <ReviewCostTab />}
      </div>
    </div>
  );
}