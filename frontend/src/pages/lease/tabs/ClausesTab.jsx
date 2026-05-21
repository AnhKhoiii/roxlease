import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// --- UI COMPONENTS ---
const Input = ({ label, value, onChange, type = "text", required, disabled, placeholder }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100 disabled:text-gray-500" />
  </div>
);

const Textarea = ({ label, value, onChange, required }) => (
  <div className="flex flex-col gap-1 w-full h-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white resize-none min-h-[100px] shadow-sm w-full flex-1" />
  </div>
);

const Select = ({ label, value, onChange, options = [], disabled, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100">
      <option value="">-- Select --</option>
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 w-max ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={checked || false} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} className={`w-3.5 h-3.5 rounded border-gray-300 ${disabled ? 'bg-gray-200' : 'text-blue-600 accent-blue-600'}`} />
    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-700">{label}</span>
  </label>
);

// --- MAIN COMPONENT ---
const BASE_URL = axiosInstance.defaults.baseURL ? axiosInstance.defaults.baseURL.replace(/\/api\/?$/, '') : 'http://localhost:8080';

export default function ClausesTab({ lease }) {
  const leaseId = lease?.lsId; 
  const isActive = lease?.active;

  const [clauses, setClauses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD" });
  
  const initialForm = { 
    clauseId: "", clauseType: "", description: "", 
    startDate: "", endDate: "", dateMatchLs: false, 
    responsibleParty: "", exercisedBy: "", 
    docUrl: "", documentUrl: "", active: false 
  };
  const [formData, setFormData] = useState(initialForm);
  const [originalData, setOriginalData] = useState(null); 

  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/lease/leases/${leaseId}/clauses?page=0&size=100`);
      setClauses(res.data.content || res.data || []);
    } catch (error) { console.error("Failed to fetch data", error); } 
    finally { setLoading(false); setSelectedIds([]); }
  }, [leaseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? clauses.map(c => c.clauseId || c.id).filter(Boolean) : []);
  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(selId => selId !== id));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append("file", file);
    setUploading(true);
    try {
      const res = await axiosInstance.post("/files/upload", uploadData, { headers: { "Content-Type": "multipart/form-data" }});
      setFormData(prev => ({ ...prev, docUrl: res.data.url, documentUrl: res.data.url }));
    } catch (error) { alert("Error uploading attachment!"); } 
    finally { setUploading(false); }
  };

  const sanitizePayload = (data) => {
    const payload = { ...data };
    if (payload.startDate === "") payload.startDate = null;
    if (payload.endDate === "") payload.endDate = null;

    if (payload.docUrl || payload.documentUrl) {
      const fileUrl = payload.docUrl || payload.documentUrl;
      payload.docUrl = fileUrl;
      payload.documentUrl = fileUrl;
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const payload = sanitizePayload({ ...formData, leaseId: leaseId, active: false });
      if (modalConfig.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/clauses/${payload.clauseId || payload.id}`, payload);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/clauses`, payload);
      }
      fetchData();
      setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Error saving data."); } 
    finally { setLoading(false); }
  };

  const handleSubmitRequest = async (actionType, dataObj) => {
    try {
      setLoading(true);
      let targetId = dataObj.id || dataObj.clauseId;
      const cleanDataObj = sanitizePayload({ ...dataObj, leaseId: leaseId });
      let changedData = { ...cleanDataObj };

      if (actionType === "CREATE") {
        const res = await axiosInstance.post(`/lease/leases/${leaseId}/clauses`, cleanDataObj);
        targetId = res.data.id || res.data.clauseId; 
      } else if (actionType === "UPDATE" && originalData) {
        changedData = {};
        Object.keys(cleanDataObj).forEach(key => {
          if (cleanDataObj[key] !== originalData[key]) changedData[key] = cleanDataObj[key];
        });
      }

      const requestPayload = {
        siteId: lease?.siteId || "Unknown", action: actionType, 
        requestType: "CONTRACT_CLAUSES", targetId: targetId, data: changedData
      };

      await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      alert("Approval request submitted! The system has created a detailed Excel file.");
      fetchData(); setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Error submitting request!"); } 
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete the selected items?\n\n- Drafts (Inactive) will be permanently deleted.\n- Active items will be sent to the Deletion Request queue.")) return;
    
    setLoading(true);
    let deletedCount = 0;
    let requestCount = 0;

    try {
      for (const id of selectedIds) {
        const item = clauses.find(c => c.clauseId === id);
        if (!item) continue;
        const mongoId = item.id || item.clauseId;

        if (item.active) {
          const requestPayload = {
            siteId: lease?.siteId || "Unknown", action: "DELETE", 
            requestType: "CONTRACT_CLAUSES", targetId: item.clauseId, data: item
          };
          await axiosInstance.post("/lease/requests/submit-module", requestPayload).catch(e => console.warn(e));
          requestCount++;
        } else {
          await axiosInstance.delete(`/lease/leases/${leaseId}/clauses/${mongoId}`).catch(e => console.warn(e));
          deletedCount++;
        }
      }
      alert(`Deletion process completed:\n- Permanently deleted: ${deletedCount} drafts.\n- Deletion Requests sent: ${requestCount} active items.`);
      setSelectedIds([]);
      fetchData();
    } catch (error) { alert("An error occurred during the deletion process!"); } 
    finally { setLoading(false); }
  };

  const handleBulkSubmit = async () => {
    if (!window.confirm(`Are you sure you want to submit UPDATE requests for ${selectedIds.length} selected items?`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        const item = clauses.find(c => c.clauseId === id);
        if (!item) continue;
        const mongoId = item.id || item.clauseId;
        const cleanDataObj = sanitizePayload(item);
        const requestPayload = {
          siteId: lease?.siteId || "Unknown", action: "UPDATE", 
          requestType: "CONTRACT_CLAUSES", targetId: mongoId, data: cleanDataObj
        };
        await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      }
      alert("Bulk approval request submitted successfully!");
      setSelectedIds([]);
      fetchData();
    } catch (error) { alert("An error occurred while submitting bulk requests!"); } 
    finally { setLoading(false); }
  };

  // 🚀 RÀNG BUỘC PHẢI NHẬP TYPE MỚI CHO LƯU
  const isFormValid = formData.clauseId?.trim() !== "" && formData.clauseType !== "" && formData.description?.trim() !== "";

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">

      <div className="flex justify-between items-center gap-2 mb-3">
        <div className="flex gap-2">
          <button onClick={() => { setFormData(initialForm); setOriginalData(null); setModalConfig({ isOpen: true, mode: "ADD" }); }} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">Add Clause</button>
          <button onClick={handleDelete} disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-red-50 text-[#DE3B40] border border-[#DE3B40]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>Delete Selected</button>
        </div>
        
        <button 
          onClick={handleBulkSubmit} 
          disabled={selectedIds.length === 0 || !isActive} 
          className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${(selectedIds.length > 0 && isActive) ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          Submit Request for Selected
        </button>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 bg-white relative">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]"><input type="checkbox" onChange={handleSelectAll} className="w-3.5 h-3.5 rounded accent-blue-600" /></th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Clause ID</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Clause Type</th> {/* 🚀 THÊM CỘT NÀY */}
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Start Date</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">End Date</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Responsible Party</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Description</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Doc</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clauses.map((c, idx) => {
                const rowId = c.clauseId || c.id;
                const isSelected = selectedIds.includes(rowId);
                return (
                <tr key={rowId || idx} onDoubleClick={() => { setFormData({...c, docUrl: c.docUrl || c.documentUrl, documentUrl: c.docUrl || c.documentUrl}); setOriginalData({...c, docUrl: c.docUrl || c.documentUrl, documentUrl: c.docUrl || c.documentUrl}); setModalConfig({ isOpen: true, mode: "EDIT" }); }} className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-orange-50/50"}`}>
                    <td className="px-3 py-2 text-center border-r border-gray-50"><input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, rowId)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer" /></td>
                    <td className="px-4 py-2 font-bold text-gray-800 border-r border-gray-50">{rowId}</td>
                    
                    {/* 🚀 HIỂN THỊ VALUE Ở BẢNG */}
                    <td className="px-4 py-2 font-semibold text-blue-600 border-r border-gray-50">{c.clauseType || "-"}</td> 
                    
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{c.startDate || "-"}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{c.endDate || "-"}</td>
                    <td className="px-4 py-2 font-semibold text-gray-600 border-r border-gray-50">{c.responsibleParty || "-"}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50 truncate max-w-[200px]">{c.description}</td>
                    <td className="px-4 py-2 text-center border-r border-gray-50">{(c.docUrl || c.documentUrl) ? <a href={`${BASE_URL}${c.docUrl || c.documentUrl}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 underline font-semibold">View</a> : "-"}</td>
                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={c.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600" /></td>
                  </tr>
                );
              })}
              {clauses.length === 0 && !loading && <tr><td colSpan="9" className="text-center py-8 text-gray-500">No data found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[1000px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white">{modalConfig.mode === "ADD" ? "Add New Clause" : "Edit Clause"}</h2>
            </div>
            <div className="p-6 bg-gray-50 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CỘT 1 */}
                <div className="flex flex-col gap-4">
                  <div className="pb-1 border-b border-gray-200"><span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider">General</span></div>
                  <Input label="Clause ID" required value={formData.clauseId} onChange={v => setFormData({...formData, clauseId: v})} disabled={modalConfig.mode === "EDIT"} placeholder="Enter Clause ID" />
                  
                  {/* 🚀 THÊM SELECT BOX CHỌN ENUM TYPE */}
                  <Select label="Clause Type" required value={formData.clauseType} onChange={v => setFormData({...formData, clauseType: v})} 
                    options={[
                      {value: 'SPECIAL', label: 'Special'},
                      {value: 'DEPOSIT', label: 'Deposit'},
                      {value: 'TERMS_OF_HANDOVER', label: 'Terms of Handover'},
                      {value: 'PENALTY', label: 'Penalty'},
                      {value: 'RENT_ESCALATION', label: 'Rent Escalation'}
                    ]} 
                  />

                  <Textarea label="Description" required value={formData.description} onChange={v => setFormData({...formData, description: v})} />
                </div>

                {/* CỘT 2 */}
                <div className="flex flex-col gap-4">
                  <div className="pb-1 border-b border-gray-200"><span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider">Timeline & Status</span></div>
                  <div className="bg-blue-50 p-3 rounded border border-blue-100 flex flex-col gap-3">
                    <Checkbox 
                      label="Date match lease?" 
                      checked={formData.dateMatchLs} 
                      onChange={v => setFormData({ ...formData, dateMatchLs: v, startDate: v ? lease?.startDate : formData.startDate, endDate: v ? lease?.endDate : formData.endDate })} 
                    />
                    <Input type="date" label="Start Date" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} disabled={formData.dateMatchLs} />
                    <Input type="date" label="End Date" value={formData.endDate} onChange={v => setFormData({...formData, endDate: v})} disabled={formData.dateMatchLs} />
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200 mt-auto"><Checkbox label="Active" checked={formData.active} disabled={true} /></div>
                </div>

                {/* CỘT 3 */}
                <div className="flex flex-col gap-4">
                  <div className="pb-1 border-b border-gray-200"><span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider">Responsibility & Document</span></div>
                  <Select label="Responsible Party" value={formData.responsibleParty} onChange={v => setFormData({...formData, responsibleParty: v})} options={[{value: 'LANDLORD', label: 'Landlord'}, {value: 'TENANT', label: 'Tenant'}, {value: 'MUTUAL', label: 'Mutual'}, {value: 'OTHER', label: 'Other'}]} />
                  <Select label="Exercised by" value={formData.exercisedBy} onChange={v => setFormData({...formData, exercisedBy: v})} options={[{value: 'LANDLORD', label: 'Landlord'}, {value: 'TENANT', label: 'Tenant'}, {value: 'MUTUAL', label: 'Mutual'}]} />
                  
                  <div className="flex flex-col gap-1 w-full bg-white p-3 rounded border border-gray-200 mt-auto">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Document</label>
                    <div className="flex items-center gap-3 mt-1">
                      <input type="file" onChange={handleFileUpload} disabled={uploading} className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer hover:file:bg-blue-100 transition-colors" />
                      {uploading && <span className="text-xs text-orange-500 font-semibold animate-pulse">Uploading...</span>}
                    </div>
                    {(formData.docUrl || formData.documentUrl) && <p className="text-[10px] mt-2 text-gray-500">File: <a href={`${BASE_URL}${formData.docUrl || formData.documentUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download/View</a></p>}
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center mt-3 pt-4 border-t border-gray-200">
                {modalConfig.mode === "EDIT" ? (
                  <button onClick={() => handleSubmitRequest("DELETE", formData)} disabled={!isActive} className={`px-4 py-2 text-xs font-bold rounded transition-colors ${isActive ? "text-red-500 hover:bg-red-50 border border-red-100" : "text-gray-400 bg-gray-200 cursor-not-allowed"}`}>Request Delete</button>
                ) : <div></div>}
                <div className="flex gap-2">
                  <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 shadow-sm transition-colors">Cancel</button>
                  {!formData.active && (
                    <button onClick={handleSaveDraft} disabled={!isFormValid} className="px-5 py-2 text-xs font-bold text-gray-800 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 shadow-sm transition-colors">Save as Draft</button>
                  )}

                  <button 
                    onClick={() => handleSubmitRequest(modalConfig.mode === "ADD" ? "CREATE" : "UPDATE", formData)} 
                    disabled={!isFormValid || !isActive} 
                    className={`px-5 py-2 text-xs font-bold text-white shadow-sm rounded transition-colors ${(!isFormValid || !isActive) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {modalConfig.mode === "ADD" ? "Save & Submit Request" : "Update & Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}