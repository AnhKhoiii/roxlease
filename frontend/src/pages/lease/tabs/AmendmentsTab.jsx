import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// ==========================================
// UI COMPONENTS
// ==========================================
const Input = ({ label, value, onChange, type = "text", required, placeholder, disabled }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow w-full shadow-sm"
    />
  </div>
);

const Textarea = ({ label, value, onChange, required, placeholder }) => (
  <div className="flex flex-col gap-1 w-full h-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-shadow w-full flex-1 resize-none min-h-[70px] shadow-sm"
    />
  </div>
);

const Select = ({ label, value, onChange, options = [], disabled, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow w-full shadow-sm"
    >
      <option value="">-- Select --</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 w-max ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={checked || false}
      onChange={e => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      className={`w-3.5 h-3.5 rounded border-gray-300 ${disabled ? 'bg-gray-200 text-gray-400' : 'text-blue-600 accent-blue-600'}`}
    />
    <span className={`text-[11px] font-bold uppercase tracking-wide ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>{label}</span>
  </label>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function AmendmentsTab({ leaseId }) {
  const [amendments, setAmendments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD", data: null });
  
  const initialForm = {
    amendmentId: "", description: "", requestedDate: "", effectiveDate: "",
    exercisedBy: "", docUrl: "", active: false
  };
  const [formData, setFormData] = useState(initialForm);

  // FETCH DATA
  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/lease/leases/${leaseId}/amendments?page=${page}&size=10`);
      setAmendments(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setSelectedIds([]);
    } catch (error) {
      console.error("Failed to fetch amendments", error);
    } finally {
      setLoading(false);
    }
  }, [leaseId, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // TABLE LOGIC
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(amendments.map(a => a.amendmentId));
    else setSelectedIds([]);
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(selId => selId !== id));
  };

  // MODAL ACTIONS
  const openAddModal = () => {
    setFormData(initialForm);
    setModalConfig({ isOpen: true, mode: "ADD", data: null });
  };

  const openEditModal = (amendment) => {
    setFormData({ ...amendment });
    setModalConfig({ isOpen: true, mode: "EDIT", data: amendment });
  };

  const handleSave = async (addAnother = false) => {
    try {
      setLoading(true);
      if (modalConfig.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/amendments/${formData.amendmentId}`, formData);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/amendments`, formData);
      }

      await fetchData();

      if (addAnother) openAddModal();
      else setModalConfig({ isOpen: false, mode: "ADD", data: null });
    } catch (error) {
      alert("Failed to save amendment.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} amendments?`)) return;

    setLoading(true);
    try {
      for (const id of selectedIds) {
        try {
          await axiosInstance.delete(`/lease/leases/${leaseId}/amendments/${id}`);
        } catch (err) {
          if (err.response?.data?.error) {
             setErrorModal({ isOpen: true, message: err.response.data.error });
             break; 
          }
        }
      }
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this amendment?")) return;
    setLoading(true);
    try {
      await axiosInstance.delete(`/lease/leases/${leaseId}/amendments/${id}`);
      setModalConfig({ isOpen: false, mode: "ADD", data: null });
      fetchData();
    } catch (err) {
      if (err.response?.data?.error) setErrorModal({ isOpen: true, message: err.response.data.error });
      else alert("Failed to delete amendment.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.description?.trim() !== "";

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      
      {/* ACTION BAR */}
      <div className="flex justify-start gap-2 mb-3">
        <button onClick={openAddModal} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">
          Add new
        </button>
        <button onClick={handleDeleteSelected} disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-[#DE3B40] hover:bg-[#C11C22] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
          Delete
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
                  <input type="checkbox" checked={amendments.length > 0 && selectedIds.length === amendments.length} onChange={handleSelectAll} className="w-3.5 h-3.5 rounded" />
                </th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Amendment ID</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Description</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Requested Date</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Effective Date</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Exercised By</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Doc</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910] text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {amendments.length === 0 && !loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500 font-medium">No amendments found.</td></tr>
              ) : (
                amendments.map((amd) => {
                  const isSelected = selectedIds.includes(amd.amendmentId);
                  return (
                    <tr key={amd.amendmentId} onClick={() => openEditModal(amd)} className={`cursor-pointer transition-colors group ${isSelected ? "bg-blue-50" : "hover:bg-orange-50/50"}`}>
                      <td className="px-3 py-2 text-center border-r border-gray-50">
                        <input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, amd.amendmentId)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5 rounded" />
                      </td>
                      <td className="px-4 py-2 text-blue-600 font-semibold border-r border-gray-50">{amd.amendmentId || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50 truncate max-w-[200px]">{amd.description || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{amd.requestedDate || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{amd.effectiveDate || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{amd.exercisedBy || "-"}</td>
                      <td className="px-4 py-2 text-blue-500 border-r border-gray-50 hover:underline">{amd.docUrl ? "View" : "-"}</td>
                      <td className="px-4 py-2 text-center">
                        <input type="checkbox" checked={amd.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600 cursor-default" onClick={e => e.stopPropagation()} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          ADD/EDIT MODAL 
      ========================================== */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[900px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            
            {/* MODAL HEADER */}
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
                {modalConfig.mode === "ADD" ? "Add New Amendment" : `Edit Amendment`}
              </h2>
              
              <div className="flex gap-2.5 items-center">
                <button onClick={() => handleSave(false)} disabled={!isFormValid} className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 text-white px-5 py-1.5 rounded text-xs font-bold shadow-md transition-colors">
                  Save
                </button>
                {modalConfig.mode === "ADD" && (
                  <button onClick={() => handleSave(true)} disabled={!isFormValid} className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:opacity-50 text-white px-5 py-1.5 rounded text-xs font-bold shadow-md transition-colors">
                    Save and add another
                  </button>
                )}
                {modalConfig.mode === "EDIT" && (
                  <button onClick={() => handleDeleteSingle(formData.amendmentId)} className="bg-white text-[#DE3B40] hover:bg-red-50 border border-transparent hover:border-red-200 px-5 py-1.5 rounded text-xs font-bold shadow-md transition-colors">
                    Delete
                  </button>
                )}
                <button onClick={() => setModalConfig({ isOpen: false, mode: "ADD", data: null })} className="text-white hover:text-red-100 ml-3 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            {/* MODAL BODY */}
            <div className="p-7 bg-gray-50 flex-1 overflow-y-auto">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                
                {/* Column 1 */}
                <div className="flex flex-col gap-5 border-r border-gray-100 pr-4">
                  <div className="pb-1 border-b border-gray-100 mb-1">
                    <span className="font-bold text-blue-800 text-[10px] uppercase tracking-wider">General Info</span>
                  </div>
                  <Input 
                    label="Amendment ID" 
                    value={formData.amendmentId} 
                    onChange={v => setFormData({...formData, amendmentId: v})} 
                    disabled={modalConfig.mode === "EDIT"} 
                    placeholder={modalConfig.mode === "ADD" ? "Auto-generated if blank" : ""} 
                  />
                  <Textarea 
                    label="Description" required 
                    value={formData.description} 
                    onChange={v => setFormData({...formData, description: v})} 
                  />
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-5 border-r border-gray-100 pr-4">
                  <div className="pb-1 border-b border-gray-100 mb-1">
                    <span className="font-bold text-blue-800 text-[10px] uppercase tracking-wider">Timeline</span>
                  </div>
                  <Input 
                    type="date" label="Requested Date" 
                    value={formData.requestedDate} 
                    onChange={v => setFormData({...formData, requestedDate: v})} 
                  />
                  <Input 
                    type="date" label="Effective Date" 
                    value={formData.effectiveDate} 
                    onChange={v => setFormData({...formData, effectiveDate: v})} 
                  />
                  <div className="flex flex-col gap-3 mt-1 bg-gray-50/80 p-3.5 rounded-lg border border-gray-200 shadow-inner">
                    <Checkbox label="Active" checked={false} onChange={() => {}} disabled={true} />
                  </div>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col gap-5 pl-2">
                  <div className="pb-1 border-b border-gray-100 mb-1">
                    <span className="font-bold text-blue-800 text-[10px] uppercase tracking-wider">Party & Document</span>
                  </div>
                  <Select 
                    label="Exercised By" 
                    value={formData.exercisedBy} 
                    onChange={v => setFormData({...formData, exercisedBy: v})}
                    options={[
                      {value: 'LANDLORD', label: 'Landlord'}, 
                      {value: 'TENANT', label: 'Tenant'}, 
                      {value: 'BOTH', label: 'Both'}
                    ]}
                  />
                  <div className="flex flex-col gap-1 w-full mt-2">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Document Upload</label>
                    <input 
                      type="file" 
                      onChange={(e) => setFormData({...formData, docUrl: e.target.files[0]?.name || ""})} 
                      className="block w-full text-[12px] text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md bg-white cursor-pointer shadow-sm transition-colors" 
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
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
              <button onClick={() => setErrorModal({ isOpen: false, message: "" })} className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded text-xs transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}