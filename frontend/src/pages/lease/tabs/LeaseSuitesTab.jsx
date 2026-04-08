import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// --- UI COMPONENTS ---
const Input = ({ label, value, onChange, type = "text", required, placeholder, disabled }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label}</label>
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full" />
  </div>
);

const Select = ({ label, value, onChange, options = [], disabled, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label}</label>
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full">
      <option value="">-- Select --</option>
      {Array.isArray(options) && options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 w-max mt-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={checked || false} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} className={`w-4 h-4 rounded border-gray-300 ${disabled ? 'bg-gray-200' : 'text-blue-600 accent-blue-600'}`} />
    <span className={`text-[11px] font-bold uppercase tracking-wide ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>{label}</span>
  </label>
);

// --- MAIN COMPONENT ---
export default function LeaseSuitesTab({ lease }) {
  const leaseId = lease?.lsId; 
  const [leaseSuites, setLeaseSuites] = useState([]);
  const [masterSuites, setMasterSuites] = useState([]); 
  const [floors, setFloors] = useState([]); 
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD" });

  const initialForm = { lsSuId: "", suId: "", floorId: "", dateStart: "", dateEnd: "", docUrl: "", active: false };
  const [formData, setFormData] = useState(initialForm);
  const [originalData, setOriginalData] = useState(null);

  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const resLS = await axiosInstance.get(`/lease/leases/${leaseId}/suites`);
      const lsData = resLS.data?.content || resLS.data;
      setLeaseSuites(Array.isArray(lsData) ? lsData : []); // Bảo vệ lỗi map is not a function

      const resMaster = await axiosInstance.get(`/space/properties/suites`);
      const msData = resMaster.data?.content || resMaster.data;
      setMasterSuites(Array.isArray(msData) ? msData : []); 

      if (lease?.buildingId) {
        const resFloors = await axiosInstance.get(`/space/properties/floors?buildingId=${lease.buildingId}`);
        const flData = resFloors.data?.content || resFloors.data;
        setFloors(Array.isArray(flData) ? flData : []);
      }
    } catch (error) { 
      console.error("Failed to fetch suite data", error); 
    } finally { 
      setLoading(false); 
      setSelectedIds([]); 
    }
  }, [leaseId, lease?.buildingId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getSuiteDetails = (suId) => {
    if (!Array.isArray(masterSuites)) return {};
    return masterSuites.find(s => s.id === suId || s.suiteId === suId) || {};
  };
  
  const getAvailableSuites = () => {
    if (!Array.isArray(masterSuites)) return [];
    return masterSuites.filter(su => {
      const isSameFloor = (su.flId || su.floorId) === formData.floorId; 
      const isActiveElsewhere = su.status === "OCCUPIED"; 
      return isSameFloor && !isActiveElsewhere;
    });
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
    } catch (error) { alert("Lỗi upload file!"); } 
    finally { setUploading(false); }
  };

  const sanitizePayload = (data) => {
    const payload = { ...data };
    if (payload.suId === "") payload.suId = null;
    if (payload.floorId === "") payload.floorId = null;
    if (payload.dateStart === "") payload.dateStart = null;
    if (payload.dateEnd === "") payload.dateEnd = null;
    return payload;
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const payload = sanitizePayload(formData);
      delete payload.floorId; 
      
      if (modalConfig.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/suites/${payload.lsSuId}`, payload);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/suites`, payload);
      }
      fetchData();
      setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Error saving lease suite."); } 
    finally { setLoading(false); }
  };

  const handleSubmitRequest = async (actionType, dataObj) => {
    try {
      setLoading(true);
      const cleanDataObj = sanitizePayload(dataObj);
      const suiteCode = cleanDataObj.suId || formData.suId;
      
      // LOGIC BẮT WARNING XUNG ĐỘT
      if (suiteCode) {
        const checkRes = await axiosInstance.get(`/lease/requests/check-suite/${suiteCode}`);
        if (checkRes.data.hasPending) {
          const confirm = window.confirm(`⚠️ CẢNH BÁO: Mặt bằng [${suiteCode}] đang có một Request khác chờ duyệt trong hệ thống.\n\nBạn có chắc chắn muốn tiếp tục gửi Request tranh giành này không?`);
          if (!confirm) {
            setLoading(false);
            return;
          }
        }
      }

      let targetId = cleanDataObj.lsSuId || cleanDataObj.id; 
      let changedData = { ...cleanDataObj };
      delete changedData.floorId;

      if (actionType === "CREATE") {
        const payloadToSave = { ...cleanDataObj };
        delete payloadToSave.floorId;
        const res = await axiosInstance.post(`/lease/leases/${leaseId}/suites`, payloadToSave);
        targetId = res.data.lsSuId || res.data.id; 
      } else if (actionType === "UPDATE" && originalData) {
        changedData = {};
        Object.keys(cleanDataObj).forEach(key => {
          if (cleanDataObj[key] !== originalData[key] && key !== 'floorId') {
            changedData[key] = cleanDataObj[key];
          }
        });
      }

      const requestPayload = {
        siteId: lease?.siteId || "Unknown", action: actionType, 
        requestType: "SUITE_ASSIGNMENT", targetId: targetId, data: changedData
      };

      await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      alert("Request đã được tạo thành công!");
      fetchData(); setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Lỗi tạo Request!"); } 
    finally { setLoading(false); }
  };

  const handleBulkSubmit = async () => {
    if (!window.confirm(`Bạn có chắc muốn gửi yêu cầu duyệt cho ${selectedIds.length} mục đã chọn?`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        const item = leaseSuites.find(ls => ls.lsSuId === id);
        if (!item) continue;
        const cleanDataObj = sanitizePayload(item);
        delete cleanDataObj.floorId;

        // LOGIC BẮT WARNING HÀNG LOẠT
        const checkRes = await axiosInstance.get(`/lease/requests/check-suite/${cleanDataObj.suId}`);
        if (checkRes.data.hasPending) {
          const confirm = window.confirm(`⚠️ CẢNH BÁO: Mặt bằng [${cleanDataObj.suId}] đang có Request chờ duyệt.\n\nBấm OK để tiếp tục gửi tranh giành, bấm CANCEL để bỏ qua mặt bằng này.`);
          if (!confirm) continue; 
        }

        const requestPayload = {
          siteId: lease?.siteId || "Unknown", action: "UPDATE", 
          requestType: "SUITE_ASSIGNMENT", targetId: item.lsSuId, data: cleanDataObj
        };
        await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      }
      alert("Đã hoàn tất xử lý gửi yêu cầu duyệt hàng loạt!");
      setSelectedIds([]);
      fetchData();
    } catch (error) { alert("Có lỗi xảy ra khi gửi yêu cầu duyệt hàng loạt!"); } 
    finally { setLoading(false); }
  };

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? leaseSuites.map(s => s.lsSuId) : []);
  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(selId => selId !== id));
  };

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center gap-2 mb-3">
        <div className="flex gap-2">
          <button onClick={() => { setFormData(initialForm); setOriginalData(null); setModalConfig({ isOpen: true, mode: "ADD" }); }} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">Add Suite</button>
          <button disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-red-50 text-[#DE3B40] border border-[#DE3B40]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>Delete Selected</button>
        </div>
        <button onClick={handleBulkSubmit} disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>Submit Request for Selected</button>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 bg-white relative">
        <table className="w-full text-left text-[12px] whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
            <tr>
              <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]"><input type="checkbox" onChange={handleSelectAll} className="w-3.5 h-3.5 rounded" /></th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Suite Code</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Floor ID</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Start Date</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">End Date</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Document</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.isArray(leaseSuites) && leaseSuites.map((ls) => {
              const detail = getSuiteDetails(ls.suId);
              const isSelected = selectedIds.includes(ls.lsSuId);
              return (
                <tr key={ls.lsSuId} onDoubleClick={() => { const data = {...ls, floorId: detail.floorId || detail.flId || ""}; setFormData(data); setOriginalData(data); setModalConfig({ isOpen: true, mode: "EDIT" }); }} className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-orange-50/50"}`}>
                  <td className="px-3 py-2 text-center border-r border-gray-50"><input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, ls.lsSuId)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5 rounded" /></td>
                  <td className="px-4 py-2 font-semibold text-blue-600 border-r border-gray-50">{ls.suId}</td>
                  <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{detail.floorId || detail.flId || "-"}</td>
                  <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{ls.dateStart || "-"}</td>
                  <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{ls.dateEnd || "-"}</td>
                  <td className="px-4 py-2 text-center border-r border-gray-50">{ls.docUrl ? <a href={`http://localhost:8080${ls.docUrl}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue-500 hover:text-blue-700 font-semibold underline">Download</a> : "-"}</td>
                  <td className="px-4 py-2 text-center"><input type="checkbox" checked={ls.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600" /></td>
                </tr>
              );
            })}
            {(!Array.isArray(leaseSuites) || leaseSuites.length === 0) && !loading && (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500 font-medium">No suites attached to this lease.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[650px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white">{modalConfig.mode === "ADD" ? "Add Suite to Lease" : "Edit Lease Suite"}</h2>
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="text-white hover:text-red-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 bg-gray-50 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4"><Input label="Site ID" value={lease?.siteId} disabled /><Input label="Building ID" value={lease?.buildingId} disabled /></div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Floor ID" required value={formData.floorId} onChange={v => { setFormData({...formData, floorId: v, suId: ""}); }} options={Array.isArray(floors) ? floors.map(f => ({ value: f.flId || f.id, label: f.flId || f.id })) : []} />
                <Select label="Suite Code" required value={formData.suId} onChange={v => setFormData({...formData, suId: v})} options={getAvailableSuites().map(su => ({ value: su.suiteId || su.suId || su.id, label: su.suiteId || su.suId || su.id }))} disabled={!formData.floorId || modalConfig.mode === "EDIT"} />
              </div>
              <div className="grid grid-cols-2 gap-4"><Input type="date" label="Start Date" value={formData.dateStart} onChange={v => setFormData({...formData, dateStart: v})} /><Input type="date" label="End Date" value={formData.dateEnd} onChange={v => setFormData({...formData, dateEnd: v})} /></div>
              <div className="flex flex-col gap-1 w-full bg-white p-3 rounded border border-gray-200">
                <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">Attachment Document</label>
                <div className="flex items-center gap-3 mt-1">
                  <input type="file" onChange={handleFileUpload} disabled={uploading} className="block w-full text-[11px] text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded cursor-pointer" />
                  {uploading && <span className="text-xs text-orange-500 font-semibold animate-pulse">Uploading...</span>}
                </div>
                {formData.docUrl && <p className="text-[10px] mt-1.5 text-gray-500">Current file: <a href={`http://localhost:8080${formData.docUrl}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">Download/View</a></p>}
              </div>
              <div className="flex flex-col gap-2 bg-white p-3 rounded border border-gray-200"><Checkbox label="Active" checked={formData.active} onChange={() => {}} disabled={true} /></div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                {modalConfig.mode === "EDIT" ? <button onClick={() => handleSubmitRequest("DELETE", formData)} className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-colors">Request Delete</button> : <div></div>}
                <div className="flex gap-2">
                  <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                  <button onClick={handleSaveDraft} disabled={!formData.suId} className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50">Save as Draft</button>
                  <button onClick={() => handleSubmitRequest(modalConfig.mode === "ADD" ? "CREATE" : "UPDATE", formData)} disabled={!formData.suId} className="px-5 py-2 text-xs font-bold text-white bg-[#D68910] rounded hover:bg-[#B9770E] disabled:opacity-50 shadow-sm">
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