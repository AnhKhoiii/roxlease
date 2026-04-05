import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// ==========================================
// UI COMPONENTS
// ==========================================
const Input = ({ label, value, onChange, type = "text", required, placeholder, disabled }) => (
  <div className="flex flex-col gap-0.5 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="border border-gray-300 rounded px-2.5 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 bg-white transition-shadow w-full"
    />
  </div>
);

const Textarea = ({ label, value, onChange, required, placeholder }) => (
  <div className="flex flex-col gap-0.5 w-full h-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="border border-gray-300 rounded px-2.5 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-shadow w-full flex-1 resize-none min-h-[80px]"
    />
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-1.5 w-max mt-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={checked || false}
      onChange={e => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      className={`w-4 h-4 rounded border-gray-300 ${disabled ? 'bg-gray-200 text-gray-400' : 'text-blue-600 accent-blue-600'}`}
    />
    <span className={`text-[11px] font-semibold ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>{label}</span>
  </label>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ClausesTab({ leaseId }) {
  const [clauses, setClauses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Modals
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD", data: null });
  
  const [formData, setFormData] = useState({
    clauseId: "",
    description: "",
    startDate: "",
    endDate: "",
    dateMatchLease: false,
    isActive: false,
    responsibleParty: "",
    exercisedBy: "",
    documentUrl: ""
  });

  const fetchClauses = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/lease/leases/${leaseId}/clauses?page=${page}&size=10`);
      setClauses(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to fetch clauses", error);
    } finally {
      setLoading(false);
    }
  }, [leaseId, page]);

  useEffect(() => {
    fetchClauses();
  }, [fetchClauses]);

  // Table Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(clauses.map(c => c.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  // Actions
  const openAddModal = () => {
    setFormData({
      clauseId: "", description: "", startDate: "", endDate: "",
      dateMatchLease: false, isActive: false, responsibleParty: "", exercisedBy: "", documentUrl: ""
    });
    setModalConfig({ isOpen: true, mode: "ADD", data: null });
  };

  const openEditModal = (clause) => {
    setFormData({
      ...clause,
      dateMatchLease: false // Logic tuỳ chỉnh nếu cần
    });
    setModalConfig({ isOpen: true, mode: "EDIT", data: clause });
  };

  const handleSave = async (addAnother = false, submitRequest = false) => {
    try {
      setLoading(true);
      let savedClause;
      if (modalConfig.mode === "EDIT") {
        const res = await axiosInstance.put(`/lease/leases/${leaseId}/clauses/${formData.id}`, formData);
        savedClause = res.data;
      } else {
        const res = await axiosInstance.post(`/lease/leases/${leaseId}/clauses`, formData);
        savedClause = res.data;
      }

      if (submitRequest) {
        await axiosInstance.put(`/lease/leases/${leaseId}/clauses/${savedClause.id}/submit`);
      }

      await fetchClauses();

      if (addAnother) {
        openAddModal();
      } else {
        setModalConfig({ isOpen: false, mode: "ADD", data: null });
      }
    } catch (error) {
      alert("Failed to save clause. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} clauses?`)) return;

    setLoading(true);
    try {
      for (const id of selectedIds) {
        try {
          await axiosInstance.delete(`/lease/leases/${leaseId}/clauses/${id}`);
        } catch (err) {
          if (err.response?.data?.error) {
             setErrorModal({ isOpen: true, message: err.response.data.error });
             break; // Dừng xoá nếu gặp lỗi active
          }
        }
      }
      fetchClauses();
    } finally {
      setLoading(false);
    }
  };

  // Hàm xoá 1 Clause ngay trong Modal Edit
  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this clause?")) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`/lease/leases/${leaseId}/clauses/${id}`);
      setModalConfig({ isOpen: false, mode: "ADD", data: null }); // Đóng Modal
      fetchClauses();
    } catch (err) {
      if (err.response?.data?.error) {
         setErrorModal({ isOpen: true, message: err.response.data.error }); // Báo lỗi nếu đang active
      } else {
         alert("Failed to delete clause.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSelected = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await axiosInstance.put(`/lease/leases/${leaseId}/clauses/${id}/submit`);
      }
      fetchClauses();
    } catch (err) {
      alert("Failed to submit requests.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.clauseId?.trim() !== "";

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      
      {/* ACTION BAR */}
      <div className="flex justify-start gap-2 mb-3">
        <button onClick={openAddModal} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">
          Add new
        </button>
        <button 
          onClick={handleDeleteSelected} 
          disabled={selectedIds.length === 0} 
          className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-[#DE3B40] hover:bg-[#C11C22] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          Delete
        </button>
        <button 
          onClick={handleSubmitSelected} 
          disabled={selectedIds.length === 0} 
          className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-[#DE3B40] hover:bg-[#C11C22] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          Submit Request
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 relative bg-white">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        )}

        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]">
                  <input type="checkbox" checked={clauses.length > 0 && selectedIds.length === clauses.length} onChange={handleSelectAll} className="w-3.5 h-3.5 rounded" />
                </th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Clause ID</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Start Date</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">End Date</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Responsible Party</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Description</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Doc</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910] text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clauses.length === 0 && !loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500 font-medium">No clauses found.</td></tr>
              ) : (
                clauses.map((clause) => {
                  const isSelected = selectedIds.includes(clause.id);
                  return (
                    <tr key={clause.id} onClick={() => openEditModal(clause)} className={`cursor-pointer transition-colors group ${isSelected ? "bg-blue-50" : "hover:bg-orange-50/50"}`}>
                      <td className="px-3 py-2 text-center border-r border-gray-50">
                        <input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, clause.id)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5 rounded" />
                      </td>
                      <td className="px-4 py-2 font-semibold text-blue-600 border-r border-gray-50">{clause.clauseId}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{clause.startDate || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{clause.endDate || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{clause.responsibleParty || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 border-r border-gray-50 truncate max-w-[150px]">{clause.description || "-"}</td>
                      <td className="px-4 py-2 text-blue-500 border-r border-gray-50 hover:underline">{clause.documentUrl ? "View" : "-"}</td>
                      <td className="px-4 py-2 text-center">
                        <input type="checkbox" checked={clause.isActive} readOnly className="w-3.5 h-3.5 rounded accent-blue-600 cursor-default" onClick={e => e.stopPropagation()} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[900px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-tight text-white drop-shadow-sm">
                {modalConfig.mode === "ADD" ? "Add New Clause" : `Edit Clause: ${formData.clauseId}`}
              </h2>
              
              {/* BUTTONS HEADER MODAL */}
              <div className="flex gap-2">
                <button onClick={() => handleSave(false, false)} disabled={!isFormValid} className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm">
                  Save
                </button>
                
                {modalConfig.mode === "ADD" && (
                  <button onClick={() => handleSave(true, false)} disabled={!isFormValid} className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm">
                    Save and add another
                  </button>
                )}
                
                {/* NÚT DELETE HIỂN THỊ KHI Ở CHẾ ĐỘ EDIT */}
                {modalConfig.mode === "EDIT" && (
                  <button onClick={() => handleDeleteSingle(formData.id)} className="bg-white text-[#DE3B40] hover:bg-red-50 border border-transparent hover:border-red-200 px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">
                    Delete
                  </button>
                )}

                <button onClick={() => handleSave(false, true)} disabled={!isFormValid} className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm">
                  Save and Submit Request
                </button>

                <button onClick={() => setModalConfig({ isOpen: false, mode: "ADD", data: null })} className="text-white hover:text-red-100 ml-2 focus:outline-none">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

            </div>
            
            <div className="p-6 bg-gray-50 flex-1">
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1 */}
                <div className="flex flex-col gap-4">
                  <Input label="Clause ID" required value={formData.clauseId} onChange={v => setFormData({...formData, clauseId: v})} />
                  <Textarea label="Description" value={formData.description} onChange={v => setFormData({...formData, description: v})} />
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-4">
                  <Input type="date" label="Start Date" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
                  <Input type="date" label="End Date" value={formData.endDate} onChange={v => setFormData({...formData, endDate: v})} />
                  <div className="flex flex-col gap-1 mt-1 bg-gray-50 p-2.5 rounded border border-gray-200/60">
                    <Checkbox label="Date match lease?" checked={formData.dateMatchLease} onChange={v => setFormData({...formData, dateMatchLease: v})} />
                    
                    {/* Nút Active luôn là No và bị làm mờ */}
                    <Checkbox 
                      label="Active" 
                      checked={false} 
                      onChange={() => {}} 
                      disabled={true} 
                    />
                  </div>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-4">
                  <Input label="Responsible Party" value={formData.responsibleParty} onChange={v => setFormData({...formData, responsibleParty: v})} />
                  <Input label="Exercised by" value={formData.exercisedBy} onChange={v => setFormData({...formData, exercisedBy: v})} />
                  <div className="flex flex-col gap-0.5 w-full mt-1">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Document</label>
                    <div className="flex items-center gap-2">
                      <input type="file" onChange={(e) => setFormData({...formData, documentUrl: e.target.files[0]?.name || ""})} className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-300 rounded bg-white cursor-pointer" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MODAL (Xử lý khi Delete bị lỗi Active) */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[400px] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-[#DE3B40] px-5 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-tight text-white">Action Denied</h2>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-sm text-gray-800 font-semibold">{errorModal.message}</p>
              <button onClick={() => setErrorModal({ isOpen: false, message: "" })} className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded text-xs transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}