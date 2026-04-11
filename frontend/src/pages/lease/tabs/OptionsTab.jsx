import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// --- UI COMPONENTS ---
const Input = ({ label, value, onChange, type = "text", required, placeholder, disabled }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white transition-shadow w-full shadow-sm" />
  </div>
);

const Textarea = ({ label, value, onChange, required, placeholder }) => (
  <div className="flex flex-col gap-1 w-full h-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white transition-shadow w-full flex-1 resize-none min-h-[70px] shadow-sm" />
  </div>
);

const Select = ({ label, value, onChange, options = [], disabled, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white transition-shadow w-full shadow-sm">
      <option value="">-- Select --</option>
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 w-max ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={checked || false} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} className={`w-3.5 h-3.5 rounded border-gray-300 ${disabled ? 'bg-gray-200' : 'text-blue-600 accent-blue-600'}`} />
    <span className={`text-[11px] font-bold uppercase tracking-wide ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>{label}</span>
  </label>
);

// --- MAIN COMPONENT ---
export default function OptionsTab({ lease }) {
  const leaseId = lease?.lsId; 
  const [options, setOptions] = useState([]);
  const [availableSuites, setAvailableSuites] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD" });
  
  const initialForm = {
    opId: "", opDescription: "", opType: "", suiteId: "", issueDate: "",
    dateMatchLs: false, startDate: "", endDate: "", exercisedBy: "",
    areaInvolved: "", docUrl: "", active: false
  };
  const [formData, setFormData] = useState(initialForm);
  const [originalData, setOriginalData] = useState(null); 

  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const resOpts = await axiosInstance.get(`/lease/leases/${leaseId}/options?page=0&size=100`);
      setOptions(resOpts.data.content || resOpts.data || []);
      setSelectedIds([]);
      const resSuites = await axiosInstance.get(`/space/properties/suites/available`);
      setAvailableSuites(resSuites.data || []);
    } catch (error) { console.error("Failed to fetch data", error); } 
    finally { setLoading(false); }
  }, [leaseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSuiteChange = (suiteId) => {
    const selectedSuite = availableSuites.find(su => su.suiteId === suiteId || su.id === suiteId);
    setFormData(prev => ({
      ...prev, suiteId: suiteId,
      areaInvolved: selectedSuite ? (selectedSuite.rentableArea || selectedSuite.area) : ""
    }));
  };

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? options.map(o => o.opId) : []);
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
      setFormData(prev => ({ ...prev, docUrl: res.data.url }));
    } catch (error) { alert("Lỗi tải file đính kèm!"); } 
    finally { setUploading(false); }
  };

  const sanitizePayload = (data) => {
    const payload = { ...data };
    if (payload.issueDate === "") payload.issueDate = null;
    if (payload.startDate === "") payload.startDate = null;
    if (payload.endDate === "") payload.endDate = null;
    if (payload.exercisedBy === "") payload.exercisedBy = null;
    if (payload.opType === "") payload.opType = null;
    if (payload.suiteId === "") payload.suiteId = null;
    if (payload.areaInvolved === "") payload.areaInvolved = null;
    else payload.areaInvolved = Number(payload.areaInvolved);
    return payload;
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const payload = sanitizePayload(formData);
      if (modalConfig.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/options/${payload.opId}`, payload);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/options`, payload);
      }
      fetchData();
      setModalConfig({ isOpen: false, mode: "ADD", data: null });
    } catch (error) { alert("Lỗi lưu dữ liệu. Vui lòng kiểm tra lại!"); } 
    finally { setLoading(false); }
  };

  const handleSubmitRequest = async (actionType, dataObj) => {
    try {
      setLoading(true);
      let targetId = dataObj.opId || dataObj.id; 
      const cleanDataObj = sanitizePayload(dataObj);
      let changedData = { ...cleanDataObj };

      if (actionType === "CREATE") {
        const res = await axiosInstance.post(`/lease/leases/${leaseId}/options`, cleanDataObj);
        targetId = res.data.opId || res.data.id; 
      } else if (actionType === "UPDATE" && originalData) {
        changedData = {};
        Object.keys(cleanDataObj).forEach(key => {
          if (cleanDataObj[key] !== originalData[key]) changedData[key] = cleanDataObj[key];
        });
      }

      const requestPayload = {
        siteId: lease?.siteId || "Unknown", action: actionType, 
        requestType: "CONTRACT_OPTIONS", targetId: targetId, data: changedData
      };

      await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      alert("Đã gửi Request duyệt! File Excel đã được tạo.");
      fetchData(); setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Lỗi gửi Request!"); } 
    finally { setLoading(false); }
  };

  // --- THÊM HÀM DELETE HÀNG LOẠT ---
  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa các mục đã chọn?\n\n- Bản nháp (Chưa Active) sẽ bị xóa vĩnh viễn khỏi hệ thống.\n- Mục đang hiệu lực (Đã Active) sẽ được gửi Yêu cầu Duyệt Xóa vào hàng đợi.")) return;
    
    setLoading(true);
    let deletedCount = 0;
    let requestCount = 0;

    try {
      for (const id of selectedIds) {
        const item = options.find(c => c.opId === id);
        if (!item) continue;

        if (item.active) {
          const requestPayload = {
            siteId: lease?.siteId || "Unknown", action: "DELETE", 
            requestType: "CONTRACT_OPTIONS", targetId: item.opId, data: item
          };
          await axiosInstance.post("/lease/requests/submit-module", requestPayload).catch(e => console.warn(e));
          requestCount++;
        } else {
          await axiosInstance.delete(`/lease/leases/${leaseId}/options/${id}`).catch(e => console.warn(e));
          deletedCount++;
        }
      }
      alert(`Hoàn tất xử lý Xóa:\n- Xóa trực tiếp: ${deletedCount} bản nháp.\n- Đã gửi Yêu cầu Duyệt Xóa: ${requestCount} mục đang hoạt động.`);
      setSelectedIds([]);
      fetchData();
    } catch (error) { alert("Có lỗi xảy ra trong quá trình xử lý xóa!"); } 
    finally { setLoading(false); }
  };

  const handleBulkSubmit = async () => {
    if (!window.confirm(`Bạn có chắc muốn gửi yêu cầu duyệt CẬP NHẬT cho ${selectedIds.length} mục đã chọn?`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        const item = options.find(o => o.opId === id);
        if (!item) continue;
        const cleanDataObj = sanitizePayload(item);
        const requestPayload = {
          siteId: lease?.siteId || "Unknown", action: "UPDATE", 
          requestType: "CONTRACT_OPTIONS", targetId: item.opId, data: cleanDataObj
        };
        await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      }
      alert("Đã gửi yêu cầu duyệt hàng loạt thành công!");
      setSelectedIds([]);
      fetchData();
    } catch (error) { alert("Có lỗi xảy ra khi gửi yêu cầu duyệt hàng loạt!"); } 
    finally { setLoading(false); }
  };

  const isFormValid = formData.opType !== "" && formData.opDescription?.trim() !== "";

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center gap-2 mb-3">
        <div className="flex gap-2">
          <button onClick={() => { setFormData(initialForm); setOriginalData(null); setModalConfig({ isOpen: true, mode: "ADD" }); }} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">Add Option</button>
          {/* GẮN SỰ KIỆN handleDelete */}
          <button onClick={handleDelete} disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-red-50 text-[#DE3B40] border border-[#DE3B40]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>Delete Selected</button>
        </div>
        <button onClick={handleBulkSubmit} disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>Submit Request for Selected</button>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 relative bg-white">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]"><input type="checkbox" onChange={handleSelectAll} className="w-3.5 h-3.5 rounded" /></th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Option ID</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Option Type</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Description</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Start Date</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">End Date</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Document</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {options.length === 0 && !loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500 font-medium">No options found.</td></tr>
              ) : (
                options.map((opt) => {
                  const isSelected = selectedIds.includes(opt.opId);
                  return (
                    <tr key={opt.opId} onDoubleClick={() => { setFormData({...opt}); setOriginalData({...opt}); setModalConfig({ isOpen: true, mode: "EDIT" }); }} className={`cursor-pointer transition-colors group ${isSelected ? "bg-blue-50" : "hover:bg-orange-50/50"}`}>
                      <td className="px-3 py-2 text-center border-r border-gray-50"><input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, opt.opId)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5 rounded" /></td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{opt.opId || "-"}</td>
                      <td className="px-4 py-2 font-semibold text-blue-600 border-r border-gray-50">{opt.opType}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50 truncate max-w-[150px]">{opt.opDescription}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{opt.startDate || "-"}</td>
                      <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{opt.endDate || "-"}</td>
                      <td className="px-4 py-2 text-center border-r border-gray-50">{opt.docUrl ? <a href={`http://localhost:8080${opt.docUrl}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 underline font-semibold">Download</a> : "-"}</td>
                      <td className="px-4 py-2 text-center"><input type="checkbox" checked={opt.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600 cursor-default" onClick={e => e.stopPropagation()} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[900px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white">{modalConfig.mode === "ADD" ? "Add New Option" : `Edit Option`}</h2>
              <button onClick={() => setModalConfig({ isOpen: false, mode: "ADD", data: null })} className="text-white hover:text-red-100 transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-7 bg-gray-50 flex-1 overflow-y-auto">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <div className="flex flex-col gap-5 border-r border-gray-100 pr-4">
                  <Input label="Option ID" value={formData.opId} onChange={v => setFormData({...formData, opId: v})} disabled={modalConfig.mode === "EDIT"} placeholder={modalConfig.mode === "ADD" ? "Auto-generated if blank" : ""} />
                  <Textarea label="Description" required value={formData.opDescription} onChange={v => setFormData({...formData, opDescription: v})} />
                  <Select label="Option Type" required value={formData.opType} onChange={v => setFormData({...formData, opType: v})} options={[{value: 'RENEWAL', label: 'Renewal'}, {value: 'TERMINATION', label: 'Termination'}, {value: 'EXPANSION', label: 'Expansion'}, {value: 'REDUCTION', label: 'Reduction'}, {value: 'PURCHASE', label: 'Purchase'}]} />
                </div>
                <div className="flex flex-col gap-5 border-r border-gray-100 pr-4">
                  <Input type="date" label="Date Issued" value={formData.issueDate} onChange={v => setFormData({...formData, issueDate: v})} />
                  <Input type="date" label="Start Date" value={formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
                  <Input type="date" label="End Date" value={formData.endDate} onChange={v => setFormData({...formData, endDate: v})} />
                  <div className="flex flex-col gap-3 mt-1 bg-gray-50/80 p-3.5 rounded-lg border border-gray-200 shadow-inner">
                    <Checkbox label="Date match lease?" checked={formData.dateMatchLs} onChange={v => setFormData({...formData, dateMatchLs: v})} />
                    <Checkbox label="Active" checked={formData.active} onChange={() => {}} disabled={true} />
                  </div>
                </div>
                <div className="flex flex-col gap-5 pl-2">
                  <Select label="Exercised By" value={formData.exercisedBy} onChange={v => setFormData({...formData, exercisedBy: v})} options={[{value: 'LANDLORD', label: 'Landlord'}, {value: 'TENANT', label: 'Tenant'}, {value: 'MUTUAL', label: 'Mutual'}]} />
                  <Select label="Suite Code" value={formData.suiteId} onChange={handleSuiteChange} options={availableSuites.map(su => ({ value: su.id || su.suiteId, label: `${su.suiteId || su.id} - ${su.name || ''}` }))} />
                  <Input type="number" label="Involved Area (sqm)" value={formData.areaInvolved} onChange={v => setFormData({...formData, areaInvolved: v})} disabled={true} placeholder="Auto-filled from Suite" />
                  <div className="flex flex-col gap-1 w-full bg-white p-3 rounded border border-gray-200">
                    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Attachment Document</label>
                    <div className="flex items-center gap-3 mt-1">
                      <input type="file" onChange={handleFileUpload} disabled={uploading} className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                      {uploading && <span className="text-xs text-orange-500 font-semibold">Uploading...</span>}
                    </div>
                    {formData.docUrl && <p className="text-[10px] mt-1.5 text-gray-500">Current: <a href={`http://localhost:8080${formData.docUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download</a></p>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                {modalConfig.mode === "EDIT" ? <button onClick={() => handleSubmitRequest("DELETE", formData)} className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-colors">Request Delete</button> : <div></div>}
                <div className="flex gap-2">
                  <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                  <button onClick={handleSaveDraft} disabled={!isFormValid} className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Save as Draft</button>
                  <button onClick={() => handleSubmitRequest(modalConfig.mode === "ADD" ? "CREATE" : "UPDATE", formData)} disabled={!isFormValid} className="px-5 py-2 text-xs font-bold text-white bg-[#D68910] rounded hover:bg-[#B9770E] disabled:opacity-50 shadow-sm">
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