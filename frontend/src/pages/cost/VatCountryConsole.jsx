import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";

export default function VatCountryConsole() {
  const [vatCountries, setVatCountries] = useState([]);
  const [countriesList, setCountriesList] = useState([]); // THÊM STATE LƯU DANH SÁCH QUỐC GIA
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, mode: "ADD" });
  
  const initialForm = { vatCountryId: "", countryName: "", vatPercent: "", active: true };
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lấy danh sách VAT Countries
      const resVat = await axiosInstance.get("/cost/vat-countries");
      setVatCountries(resVat.data || []);

      // 2. Lấy danh sách Quốc gia từ module Space (Điều chỉnh đường dẫn API nếu API Country của bạn khác)
      try {
        const resCountries = await axiosInstance.get("/space/locations/countries"); 
        setCountriesList(resCountries.data.content || resCountries.data || []);
      } catch (err) {
        console.warn("Chưa gọi được API Countries, vui lòng kiểm tra lại đường dẫn API.");
      }

    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    try {
      const payload = { ...formData, vatPercent: Number(formData.vatPercent) };
      if (modal.mode === "ADD") {
        await axiosInstance.post("/cost/vat-countries", payload);
      } else {
        await axiosInstance.put(`/cost/vat-countries/${editId}`, payload);
      }
      fetchData();
      setModal({ isOpen: false, mode: "ADD" });
    } catch (error) {
      alert(error.response?.data?.error || "Lỗi lưu dữ liệu!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa VAT Country này không?")) return;
    try {
      await axiosInstance.delete(`/cost/vat-countries/${id}`);
      fetchData();
    } catch (error) { 
      alert("Lỗi xóa dữ liệu!"); 
    }
  };

  const openEdit = (item) => {
    setFormData({
      vatCountryId: item.vatCountryId,
      countryName: item.countryName,
      vatPercent: item.vatPercent,
      active: item.active
    });
    setEditId(item.id);
    setModal({ isOpen: true, mode: "EDIT" });
  };

  return (
    <div className="p-6 bg-gray-50 h-full flex flex-col min-h-screen animate-[fadeIn_0.2s_ease-out]">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">VAT Country Management</h1>
        <button 
          onClick={() => { setFormData(initialForm); setModal({ isOpen: true, mode: "ADD" }); }} 
          className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-5 py-2 rounded text-sm font-bold shadow-sm transition-colors"
        >
          + Add VAT Country
        </button>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="sticky top-0 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="px-5 py-3 font-semibold tracking-wide border-b border-[#D68910]">VAT Country ID</th>
                <th className="px-5 py-3 font-semibold tracking-wide border-b border-[#D68910]">Country Name</th>
                <th className="px-5 py-3 font-semibold tracking-wide border-b border-[#D68910]">VAT Percent (%)</th>
                <th className="px-5 py-3 font-semibold tracking-wide border-b border-[#D68910] text-center">Active</th>
                <th className="px-5 py-3 font-semibold tracking-wide border-b border-[#D68910] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-12 text-orange-500 font-bold">Loading data...</td></tr>
              ) : vatCountries.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500 font-medium">No VAT Countries found.</td></tr>
              ) : (
                vatCountries.map(item => (
                  <tr key={item.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-blue-600">{item.vatCountryId}</td>
                    <td className="px-5 py-3 text-gray-800 font-medium">{item.countryName}</td>
                    <td className="px-5 py-3 text-gray-800 font-bold">{item.vatPercent}%</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${item.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.active ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => openEdit(item)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold mr-2 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold transition-colors">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM / SỬA */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[450px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
                {modal.mode === "ADD" ? "Add VAT Country" : "Edit VAT Country"}
              </h2>
              <button onClick={() => setModal({ isOpen: false, mode: "ADD" })} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5 bg-gray-50">
              <div className="flex flex-col gap-1 w-full bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">VAT Country ID <span className="text-red-500">*</span></label>
                <input 
                  type="text" value={formData.vatCountryId} 
                  onChange={e => setFormData({...formData, vatCountryId: e.target.value})} 
                  disabled={modal.mode === "EDIT"} 
                  className="border border-gray-300 rounded px-3 py-2 text-[12px] focus:outline-none focus:border-blue-500 disabled:bg-gray-100 w-full" 
                  placeholder="Ex: VAT-VN" 
                />
                
                {/* ĐÃ SỬA THÀNH DROPDOWN SELECT CHO COUNTRY NAME */}
                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1 mt-4">Country Name <span className="text-red-500">*</span></label>
                <select 
                  value={formData.countryName} 
                  onChange={e => setFormData({...formData, countryName: e.target.value})} 
                  className="border border-gray-300 rounded px-3 py-2 text-[12px] focus:outline-none focus:border-blue-500 w-full bg-white cursor-pointer"
                >
                  <option value="">-- Select Country --</option>
                  {countriesList.map((c, idx) => {
                    const name = c.countryName || c.name || c.id;
                    const code = c.id || c.countryId;
                    return (
                      // Thuộc tính value chỉ lấy Tên (lưu vào CSDL)
                      <option key={code || idx} value={name}>
                        {/* Phần hiển thị (text) thì nối cả Mã và Tên cho dễ nhìn */}
                        {code ? `${code} - ${name}` : name}
                      </option>
                    );
                  })}
                </select>

                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1 mt-4">VAT Percent (%) <span className="text-red-500">*</span></label>
                <input 
                  type="number" step="0.01" value={formData.vatPercent} 
                  onChange={e => setFormData({...formData, vatPercent: e.target.value})} 
                  className="border border-gray-300 rounded px-3 py-2 text-[12px] focus:outline-none focus:border-blue-500 w-full" 
                  placeholder="Ex: 8.5" 
                />

                <label className="flex items-center gap-2 mt-5 cursor-pointer w-max">
                  <input 
                    type="checkbox" checked={formData.active} 
                    onChange={e => setFormData({...formData, active: e.target.checked})} 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 accent-blue-600" 
                  />
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Active Status</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
              <button onClick={() => setModal({ isOpen: false, mode: "ADD" })} className="px-5 py-2 bg-gray-100 text-gray-700 rounded text-xs font-bold hover:bg-gray-200 transition-colors">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={!formData.vatCountryId || !formData.countryName || formData.vatPercent === ""} 
                className="px-6 py-2 bg-[#D68910] text-white rounded text-xs font-bold hover:bg-[#B9770E] disabled:opacity-50 shadow-sm transition-colors"
              >
                {modal.mode === "ADD" ? "Save" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}