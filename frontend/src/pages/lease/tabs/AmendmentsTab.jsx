import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// --- UI COMPONENTS ---
const Input = ({ label, value, onChange, type = "text", required, disabled, placeholder }) => (
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
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100 disabled:text-gray-500 transition-colors" 
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
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white resize-none min-h-[100px] shadow-sm w-full flex-1 transition-colors" 
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
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100 transition-colors"
    >
      <option value="">-- Select --</option>
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
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
      className={`w-3.5 h-3.5 rounded border-gray-300 ${disabled ? 'bg-gray-200' : 'text-blue-600 accent-blue-600'}`} 
    />
    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-700">{label}</span>
  </label>
);

// --- MAIN COMPONENT ---
const BASE_URL = axiosInstance.defaults.baseURL ? axiosInstance.defaults.baseURL.replace(/\/api\/?$/, '') : 'http://localhost:8080';

export default function AmendmentsTab({ lease, canEdit = true }) {
  const leaseId = lease?.lsId; 
  const isActive = lease?.active;

  const [amendments, setAmendments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD" });
  
  // Cấu trúc form bám sát DB Amendment.java
  const initialForm = { 
    amendmentId: "", 
    description: "", 
    requestedDate: "", 
    effectiveDate: "", 
    exercisedBy: "", 
    docUrl: "", 
    documentUrl: "",
    active: false,
    dateMatchLs: false
  };
  const [formData, setFormData] = useState(initialForm);
  const [originalData, setOriginalData] = useState(null); 

  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/lease/leases/${leaseId}/amendments?page=0&size=100`);
      setAmendments(res.data.content || res.data || []);
    } catch (error) { 
      console.error("Failed to fetch data", error); 
    } finally { 
      setLoading(false); 
      setSelectedIds([]); 
    }
  }, [leaseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? amendments.map(a => a.amendmentId || a.id).filter(Boolean) : []);
  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    if (!id) return;
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
    } catch (error) { 
      alert("Lỗi tải file đính kèm!"); 
    } finally { 
      setUploading(false); 
    }
  };

  const sanitizePayload = (data) => {
    const payload = { ...data };
    if (payload.dateMatchLs) {
      payload.requestedDate = lease?.startDate || null;
      payload.effectiveDate = lease?.startDate || null;
    }
    if (payload.requestedDate === "") payload.requestedDate = null;
    if (payload.effectiveDate === "") payload.effectiveDate = null;
    if (payload.exercisedBy === "") payload.exercisedBy = null;
    
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
      const mongoId = payload.id || payload.amendmentId;
      if (modalConfig.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/amendments/${mongoId}`, payload);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/amendments`, payload);
      }
      fetchData();
      setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { 
      alert("Lỗi lưu dữ liệu nháp."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmitRequest = async (actionType, dataObj) => {
    try {
      setLoading(true);
      let targetId = dataObj.id || dataObj.amendmentId; 
      const cleanDataObj = sanitizePayload({ ...dataObj, leaseId: leaseId });
      let changedData = { ...cleanDataObj };

      if (actionType === "CREATE") {
        const res = await axiosInstance.post(`/lease/leases/${leaseId}/amendments`, cleanDataObj);
        targetId = res.data.id || res.data.amendmentId; 
      } else if (actionType === "UPDATE" && originalData) {
        changedData = {};
        Object.keys(cleanDataObj).forEach(key => {
          if (cleanDataObj[key] !== originalData[key]) changedData[key] = cleanDataObj[key];
        });
      }

      const requestPayload = {
        siteId: lease?.siteId || "Unknown", 
        action: actionType, 
        requestType: "CONTRACT_AMENDMENTS", 
        targetId: targetId, 
        data: changedData
      };

      await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      alert("Đã gửi Request duyệt thành công!");
      fetchData(); 
      setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { 
      alert("Lỗi gửi Request!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa các mục đã chọn?\n\n- Bản nháp (Chưa Active) sẽ bị xóa vĩnh viễn.\n- Mục đang hiệu lực (Đã Active) sẽ gửi Yêu cầu Xóa.")) return;
    
    setLoading(true);
    let deletedCount = 0;
    let requestCount = 0;

    try {
      for (const id of selectedIds) {
        const item = amendments.find(a => (a.id || a.amendmentId) === id);
        if (!item) continue;
        const mongoId = item.id || item.amendmentId;

        if (item.active) {
          const requestPayload = {
            siteId: lease?.siteId || "Unknown", 
            action: "DELETE", 
            requestType: "CONTRACT_AMENDMENTS", 
            targetId: mongoId, 
            data: item
          };
          await axiosInstance.post("/lease/requests/submit-module", requestPayload).catch(e => console.warn(e));
          requestCount++;
        } else {
          await axiosInstance.delete(`/lease/leases/${leaseId}/amendments/${mongoId}`).catch(e => console.warn(e));
          deletedCount++;
        }
      }
      alert(`Hoàn tất:\n- Xóa trực tiếp: ${deletedCount} bản nháp.\n- Gửi Yêu cầu Xóa: ${requestCount} mục đang hoạt động.`);
      setSelectedIds([]);
      fetchData();
    } catch (error) { 
      alert("Có lỗi xảy ra trong quá trình xử lý xóa!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleBulkSubmit = async () => {
    if (!window.confirm(`Gửi yêu cầu duyệt CẬP NHẬT cho ${selectedIds.length} mục đã chọn?`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        const item = amendments.find(a => (a.id || a.amendmentId) === id);
        if (!item) continue;
        const mongoId = item.id || item.amendmentId;
        const cleanDataObj = sanitizePayload(item);
        const requestPayload = {
          siteId: lease?.siteId || "Unknown", 
          action: "UPDATE", 
          requestType: "CONTRACT_AMENDMENTS", 
          targetId: mongoId, 
          data: cleanDataObj
        };
        await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      }
      alert("Gửi yêu cầu duyệt hàng loạt thành công!");
      setSelectedIds([]);
      fetchData();
    } catch (error) { 
      alert("Có lỗi xảy ra khi gửi yêu cầu duyệt!"); 
    } finally { 
      setLoading(false); 
    }
  };

  const isFormValid = formData.amendmentId?.trim() !== "" && formData.description?.trim() !== "";

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      
      <div className="flex justify-between items-center gap-2 mb-3">
        <div className="flex gap-2">
          <button 
            onClick={() => { setFormData(initialForm); setOriginalData(null); setModalConfig({ isOpen: true, mode: "ADD" }); }} 
            disabled={!canEdit}
            className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${canEdit ? "bg-[#DE3B40] hover:bg-[#C11C22] text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            Add Amendment
          </button>
          <button 
            onClick={handleDelete} 
            disabled={selectedIds.length === 0 || !canEdit} 
            className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${(selectedIds.length > 0 && canEdit) ? "bg-red-50 text-[#DE3B40] border border-[#DE3B40]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
          >
            Delete Selected
          </button>
        </div>
        
        <button 
          onClick={handleBulkSubmit} 
          disabled={selectedIds.length === 0 || !isActive || !canEdit} 
          className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${(selectedIds.length > 0 && isActive && canEdit) ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          Submit Request for Selected
        </button>
      </div>

      {/* BẢNG DỮ LIỆU CHUẨN */}
      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 bg-white relative">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]">
                  <input type="checkbox" onChange={handleSelectAll} checked={amendments.length > 0 && selectedIds.length === amendments.length} className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-600" />
                </th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Amendment ID</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Description</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Requested Date</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Effective Date</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-orange-500 font-bold">Loading...</td></tr>
              ) : amendments.map((a, idx) => {
                const rowId = a.amendmentId || a.id;
                const isSelected = selectedIds.includes(rowId);
                return (
                  <tr 
                    key={rowId || idx} 
                    onDoubleClick={() => { setFormData({...a, docUrl: a.docUrl || a.documentUrl, documentUrl: a.docUrl || a.documentUrl}); setOriginalData({...a, docUrl: a.docUrl || a.documentUrl, documentUrl: a.docUrl || a.documentUrl}); setModalConfig({ isOpen: true, mode: "EDIT" }); }} 
                    className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-orange-50/50"}`}
                  >
                    <td className="px-3 py-2 text-center border-r border-gray-50">
                      <input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, rowId)} onClick={e => e.stopPropagation()} disabled={!rowId} className="w-3.5 h-3.5 rounded cursor-pointer accent-blue-600 disabled:opacity-50" />
                    </td>
                    <td className="px-4 py-2 font-bold text-gray-800 border-r border-gray-50">{rowId}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50 truncate max-w-[300px]">{a.description}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{a.requestedDate || "-"}</td>
                    <td className="px-4 py-2 font-medium text-gray-700 border-r border-gray-50">{a.effectiveDate || "-"}</td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={a.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600" />
                    </td>
                  </tr>
                );
              })}
              {amendments.length === 0 && !loading && <tr><td colSpan="6" className="text-center py-8 text-gray-500 font-medium">No Amendments found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 3 CỘT */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[1000px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
                {modalConfig.mode === "ADD" ? "Add New Amendment" : `Edit Amendment: ${formData.amendmentId}`}
              </h2>
            </div>
            
            <div className="p-6 bg-gray-50 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CỘT 1 */}
                <div className="flex flex-col gap-4">
                  <div className="pb-1 border-b border-gray-200">
                    <span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider">General</span>
                  </div>
                  <Input 
                    label="Amendment ID" 
                    required
                    value={formData.amendmentId} 
                    onChange={v => setFormData({...formData, amendmentId: v})} 
                    disabled={!canEdit || modalConfig.mode === "EDIT"} 
                    placeholder="Enter Amendment ID" 
                  />
                  <Textarea 
                    label="Description" 
                    required 
                    value={formData.description} 
                    disabled={!canEdit}
                    onChange={v => setFormData({...formData, description: v})} 
                    placeholder="Describe the changes in this amendment..."
                  />
                </div>

                {/* CỘT 2 */}
                <div className="flex flex-col gap-4">
                  <div className="pb-1 border-b border-gray-200">
                    <span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider">Timeline & Status</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200 flex flex-col gap-3 shadow-sm">
                    <Input type="date" label="Requested Date" disabled={!canEdit || formData.dateMatchLs} value={formData.dateMatchLs ? (lease?.startDate || "") : formData.requestedDate} onChange={v => setFormData({...formData, requestedDate: v})} />
                    <Input type="date" label="Effective Date" disabled={!canEdit || formData.dateMatchLs} value={formData.dateMatchLs ? (lease?.startDate || "") : formData.effectiveDate} onChange={v => setFormData({...formData, effectiveDate: v})} />
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200 mt-auto shadow-sm flex flex-col gap-2">
                    <Checkbox label="Date match lease?" disabled={!canEdit} checked={formData.dateMatchLs} onChange={v => setFormData({...formData, dateMatchLs: v, requestedDate: v ? (lease?.startDate || "") : formData.requestedDate, effectiveDate: v ? (lease?.startDate || "") : formData.effectiveDate})} />
                    <Checkbox label="Active (Approved Status)" checked={formData.active} disabled={true} />
                  </div>
                </div>

                {/* CỘT 3 */}
                <div className="flex flex-col gap-4">
                  <div className="pb-1 border-b border-gray-200">
                    <span className="font-bold text-[10px] uppercase text-gray-500 tracking-wider">Responsibility & Document</span>
                  </div>
                  <Select 
                    label="Exercised by" 
                    disabled={!canEdit}
                    value={formData.exercisedBy} 
                    onChange={v => setFormData({...formData, exercisedBy: v})} 
                    options={[{value: 'LANDLORD', label: 'Landlord'}, {value: 'TENANT', label: 'Tenant'}, {value: 'MUTUAL', label: 'Mutual'}]} 
                  />
                  
                  <div className="flex flex-col gap-1 w-full bg-white p-3 rounded border border-gray-200 mt-auto shadow-sm">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Attachment Document</label>
                    <div className="flex items-center gap-3 mt-2">
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        disabled={uploading || !canEdit} 
                        className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer hover:file:bg-blue-100 transition-colors" 
                      />
                      {uploading && <span className="text-xs text-orange-500 font-semibold animate-pulse">Uploading...</span>}
                    </div>
                    {formData.documentUrl && (
                      <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 font-medium">Current File</span>
                        <a href={`http://localhost:8080${formData.documentUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-[11px] font-bold underline">
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center mt-3 pt-4 border-t border-gray-200">
                {modalConfig.mode === "EDIT" && canEdit ? (
                  <button onClick={() => handleSubmitRequest("DELETE", formData)} disabled={!isActive} className={`px-4 py-2 text-xs font-bold rounded transition-colors ${isActive ? "text-red-500 hover:bg-red-50 border border-red-100" : "text-gray-400 bg-gray-200 cursor-not-allowed"}`}>Request Delete</button>
                ) : <div></div>}
                
                <div className="flex gap-2">
                  <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="px-5 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 shadow-sm transition-colors">Cancel</button>
                  {canEdit && !formData.active && (
                    <button onClick={handleSaveDraft} disabled={!isFormValid || loading} className="px-5 py-2 text-xs font-bold text-gray-800 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 shadow-sm transition-colors">Save as Draft</button>
                  )}

                  {/* 🚀 KHÓA NÚT NÀY NẾU CHƯA ACTIVE HOẶC INVALID */}
                  {canEdit && (
                    <button 
                      onClick={() => handleSubmitRequest(modalConfig.mode === "ADD" ? "CREATE" : "UPDATE", formData)} 
                      disabled={!isFormValid || !isActive || loading} 
                      className={`px-5 py-2 text-xs font-bold text-white shadow-sm rounded transition-colors ${(!isFormValid || !isActive) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {modalConfig.mode === "ADD" ? "Save & Submit Request" : "Update & Submit Request"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}