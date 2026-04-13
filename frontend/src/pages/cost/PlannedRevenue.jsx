import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";

// ==========================================
// REUSABLE UI COMPONENTS
// ==========================================
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

const Select = ({ label, value, onChange, options = [], disabled, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled} 
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100 transition-colors cursor-pointer"
    >
      <option value="">-- Select --</option>
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// MẢNG TÊN CÁC THÁNG
const monthNames = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PlannedRevenue() {
  // STATE MANAGEMENT
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ year: "", month: "" });
  
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const initialForm = {
    id: "", plannedRevenue: "", year: "", month: "", 
    category: "", siteId: "", plannedCost: "", plannedOcc: ""
  };
  const [formData, setFormData] = useState(initialForm);

  // DATA FETCHING
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.year) queryParams.append("year", filters.year);
      if (filters.month) queryParams.append("month", filters.month);
      queryParams.append("size", 100); // Pagination size for demo

      const res = await axiosInstance.get(`/cost/planned-revenues?${queryParams.toString()}`);
      setListData(res.data.content || []);
    } catch (error) {
      console.error("Error fetching planned revenues", error);
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ACTIONS
  const handleFilter = () => fetchData();

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        ...formData,
        year: Number(formData.year),
        month: Number(formData.month),
        plannedRevenue: Number(formData.plannedRevenue),
        plannedCost: Number(formData.plannedCost),
        plannedOcc: Number(formData.plannedOcc || 0)
      };

      if (isEditMode) {
        await axiosInstance.put(`/cost/planned-revenues/${formData.id}`, payload);
      } else {
        await axiosInstance.post(`/cost/planned-revenues`, payload);
      }
      
      setModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Lỗi lưu dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (idToDelete) => {
    const targetId = idToDelete || formData.id;
    if (!targetId || !window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) return;

    try {
      setLoading(true);
      await axiosInstance.delete(`/cost/planned-revenues/${targetId}`);
      setModalOpen(false);
      fetchData();
    } catch (error) {
      alert("Lỗi xóa dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? listData.map(item => item.id) : []);
  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const isFormValid = formData.plannedRevenue && formData.year && formData.month && 
                      formData.category && formData.siteId && formData.plannedCost !== "";

  return (
    <div className="p-6 bg-gray-50 h-full flex flex-col min-h-screen animate-[fadeIn_0.2s_ease-out]">
      
      {/* 1. TOP ACTION BAR */}
      <div className="flex justify-between items-end gap-4 mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 shrink-0">
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Filter Year</label>
            <input 
              type="number" value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} 
              placeholder="e.g. 2026" className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-full" 
            />
          </div>
          <div className="flex flex-col gap-1 w-36">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Filter Month</label>
            <select 
              value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} 
              className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Months</option>
              {/* ĐÃ CẬP NHẬT: Hiển thị tên tháng trên thanh Filter */}
              {monthNames.map((name, i) => (
                <option key={i+1} value={i+1}>{name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleFilter} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-1.5 rounded text-xs font-bold shadow-sm transition-colors mb-[1px]">
            Filter Data
          </button>
        </div>

        <button 
          onClick={() => { setFormData(initialForm); setIsEditMode(false); setModalOpen(true); }} 
          className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-2 rounded text-sm font-bold shadow-sm transition-colors"
        >
          + Add New
        </button>
      </div>

      {/* 2. TABLE LISTING */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden relative">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-4 py-3 text-center border-b border-[#D68910]">
                  <input type="checkbox" onChange={handleSelectAll} checked={listData.length > 0 && selectedIds.length === listData.length} className="w-3.5 h-3.5 rounded cursor-pointer border-none" />
                </th>
                <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910]">Site ID</th>
                <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910]">Category</th>
                <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910] text-center">Year</th>
                <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910]">Month</th>
                <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910] text-right">Planned Revenue</th>
                <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910] text-right">Planned Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12 text-orange-500 font-bold">Loading...</td></tr>
              ) : listData.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-gray-500 font-medium">No Planned Data Found.</td></tr>
              ) : (
                listData.map((item) => (
                  <tr key={item.id} 
                      onDoubleClick={() => { setFormData(item); setIsEditMode(true); setModalOpen(true); }} 
                      className="hover:bg-orange-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-2.5 text-center border-r border-gray-50">
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => handleSelectRow(e, item.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded cursor-pointer" />
                    </td>
                    <td className="px-4 py-2.5 font-bold text-blue-600 border-r border-gray-50">{item.siteId}</td>
                    <td className="px-4 py-2.5 text-gray-700 border-r border-gray-50">{item.category}</td>
                    <td className="px-4 py-2.5 text-center text-gray-700 border-r border-gray-50">{item.year}</td>
                    {/* ĐÃ CẬP NHẬT: Hiển thị tên tháng trên bảng */}
                    <td className="px-4 py-2.5 text-gray-700 border-r border-gray-50 font-medium">{monthNames[item.month - 1] || item.month}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-green-600 border-r border-gray-50">{item.plannedRevenue?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600">{item.plannedCost?.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 & 4. MODAL ADD / EDIT */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[800px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            
            {/* Modal Header */}
            <div className="bg-[#EFB034] px-6 py-4 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-sm font-bold tracking-widest text-white drop-shadow-sm uppercase">
                &lt;&lt; Planned Revenue &gt;&gt;
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {/* Modal Body - Form Layout */}
            <div className="p-8 bg-gray-50 flex flex-col gap-6">
              
              {/* ROW 1 */}
              <div className="grid grid-cols-3 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <Input 
                  type="number" label="Planned Revenue" required 
                  value={formData.plannedRevenue} onChange={v => setFormData({...formData, plannedRevenue: v})} 
                />
                <Input 
                  type="number" label="Year" required placeholder="e.g. 2026"
                  value={formData.year} onChange={v => setFormData({...formData, year: v})} 
                />
                <Select 
                  label="Month" required 
                  value={formData.month} onChange={v => setFormData({...formData, month: v})} 
                  // ĐÃ CẬP NHẬT: Hiển thị tên tháng trong Modal Form
                  options={monthNames.map((name, i) => ({ value: i+1, label: name }))}
                />
              </div>

              {/* ROW 2 */}
              <div className="grid grid-cols-3 gap-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <Select 
                  label="Category" required 
                  value={formData.category} onChange={v => setFormData({...formData, category: v})} 
                  options={[
                    { value: "Retail", label: "Retail" },
                    { value: "Office", label: "Office" },
                    { value: "Industrial", label: "Industrial" },
                    { value: "Residential", label: "Residential" }
                  ]}
                />
                <Input 
                  type="text" label="Site ID" required placeholder="e.g. S-HN-001"
                  value={formData.siteId} onChange={v => setFormData({...formData, siteId: v})} 
                />
                <Input 
                  type="number" label="Planned Cost" required 
                  value={formData.plannedCost} onChange={v => setFormData({...formData, plannedCost: v})} 
                />
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-gray-200 flex justify-between items-center bg-white">
              <div>
                {isEditMode && (
                  <button onClick={() => handleDelete(formData.id)} className="px-5 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded transition-colors">
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="px-6 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={!isFormValid || loading} 
                  className="px-8 py-2 text-xs font-bold text-white bg-[#D68910] hover:bg-[#B9770E] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm rounded transition-colors"
                >
                  {isEditMode ? "Save Changes" : "Save"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}