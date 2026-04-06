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
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white shadow-sm w-full"
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
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white shadow-sm w-full"
    >
      <option value="">-- Select --</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 w-max mt-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={checked || false}
      onChange={e => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      className={`w-4 h-4 rounded border-gray-300 ${disabled ? 'bg-gray-200' : 'text-blue-600 accent-blue-600'}`}
    />
    <span className={`text-[11px] font-bold uppercase tracking-wide ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>{label}</span>
  </label>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function LeaseSuitesTab({ lease }) {
  const leaseId = lease?.lsId;
  const [leaseSuites, setLeaseSuites] = useState([]);
  const [masterSuites, setMasterSuites] = useState([]); // Toàn bộ Suite trong hệ thống
  const [floors, setFloors] = useState([]); // Danh sách tầng của tòa nhà này
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: "ADD" });
  const [drawingModal, setDrawingModal] = useState({ isOpen: false, suite: null });

  // State cho Form
  const initialForm = { lsSuId: "", suId: "", floorId: "", dateStart: "", dateEnd: "", docUrl: "", active: false };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      // 1. Lấy danh sách Suite đã gắn vào Lease
      const resLS = await axiosInstance.get(`/lease/leases/${leaseId}/suites`);
      setLeaseSuites(resLS.data.content || []);

      // 2. Lấy toàn bộ Master Suites để hiển thị thông tin chi tiết và lọc
      const resMaster = await axiosInstance.get(`/space/properties/suites`);
      setMasterSuites(resMaster.data || []);

      // 3. Lấy danh sách Floor dựa trên Building của Lease hiện tại
      if (lease?.buildingId) {
        const resFloors = await axiosInstance.get(`/space/properties/floors?buildingId=${lease.buildingId}`);
        setFloors(resFloors.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch suite data", error);
    } finally {
      setLoading(false);
    }
  }, [leaseId, lease?.buildingId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Lọc Suite: Chỉ lấy suite thuộc Floor đã chọn VÀ chưa active ở lease nào (trừ chính nó khi đang edit)
  const getAvailableSuites = () => {
    return masterSuites.filter(su => {
      const isSameFloor = su.floorId === formData.floorId;
      // Giả sử Suite.status hoặc một API check availability sẽ tốt hơn, 
      // ở đây ta filter những suite chưa có trong bất kỳ LeaseSuite active nào
      const isActiveElsewhere = su.status === "OCCUPIED"; // Hoặc logic nghiệp vụ tương đương
      return isSameFloor && !isActiveElsewhere;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (modalConfig.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/suites/${formData.lsSuId}`, formData);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/suites`, formData);
      }
      fetchData();
      setModalConfig({ isOpen: false, mode: "ADD" });
    } catch (error) {
      alert("Error saving lease suite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      {/* ACTION BAR */}
      <div className="flex justify-start gap-2 mb-3">
        <button onClick={() => { setFormData(initialForm); setModalConfig({ isOpen: true, mode: "ADD" }); }} 
                className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">
          Add Suite
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 bg-white relative">
        <table className="w-full text-left text-[12px] whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
            <tr>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Suite Code</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Site ID</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Building ID</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Floor ID</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Start Date</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910]">End Date</th>
              <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaseSuites.map((ls) => (
              <tr key={ls.lsSuId} onDoubleClick={() => { setFormData({...ls}); setModalConfig({ isOpen: true, mode: "EDIT" }); }} className="hover:bg-orange-50/50 cursor-pointer transition-colors">
                <td className="px-4 py-2 font-semibold text-blue-600 border-r border-gray-50">{ls.suId}</td>
                <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{lease?.siteId}</td>
                <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{lease?.buildingId}</td>
                <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{/* Logic map floor từ suId */}</td>
                <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{ls.dateStart}</td>
                <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{ls.dateEnd}</td>
                <td className="px-4 py-2 text-center">
                  <input type="checkbox" checked={ls.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL ADD/EDIT */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white">
                {modalConfig.mode === "ADD" ? "Add Suite to Lease" : "Edit Lease Suite"}
              </h2>
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="text-white hover:text-red-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-7 bg-gray-50 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Site ID" value={lease?.siteId} disabled />
                <Input label="Building ID" value={lease?.buildingId} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Floor ID" required 
                  value={formData.floorId} 
                  onChange={v => { setFormData({...formData, floorId: v, suId: ""}); }} 
                  options={floors.map(f => ({ value: f.floorId, label: f.floorId }))} 
                />
                <Select 
                  label="Suite Code" required 
                  value={formData.suId} 
                  onChange={v => setFormData({...formData, suId: v})} 
                  options={getAvailableSuites().map(su => ({ value: su.suiteId, label: su.suiteId }))}
                  disabled={!formData.floorId}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Start Date" value={formData.dateStart} onChange={v => setFormData({...formData, dateStart: v})} />
                <Input type="date" label="End Date" value={formData.dateEnd} onChange={v => setFormData({...formData, dateEnd: v})} />
              </div>

              <Input label="Document URL" value={formData.docUrl} onChange={v => setFormData({...formData, docUrl: v})} />
              
              <div className="flex flex-col gap-2 bg-white p-3 rounded border border-gray-200">
                <Checkbox 
                  label="Active" 
                  checked={formData.active} 
                  onChange={v => setFormData({...formData, active: v})} 
                  disabled={true} // Vô hiệu hóa hoặc mặc định No theo yêu cầu
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button onClick={handleSave} className="px-5 py-2 text-xs font-bold text-white bg-[#DE3B40] rounded hover:bg-[#C11C22]">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}