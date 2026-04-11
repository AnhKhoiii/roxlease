import React, { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import BackgroundDataModal from "../../components/lease/BackgroundDataModal";

export default function BackgroundDataConsole() {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    partyId: '',
    partyName: '',
    isLandlord: '',
    phone: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD");
  const [selectedData, setSelectedData] = useState(null);
  
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const showToast = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/lease/parties").catch(() => ({ data: [] }));
      setDataList(res.data || []);
    } catch (error) {
      showToast('error', 'Cannot load data from the server!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      const matchId = (item.partyId || '').toLowerCase().includes(filters.partyId.toLowerCase());
      const matchName = (item.partyName || '').toLowerCase().includes(filters.partyName.toLowerCase());
      const matchPhone = (item.phone || '').toLowerCase().includes(filters.phone.toLowerCase());
      
      let matchRole = true;
      if (filters.isLandlord !== '') {
          const isLandlordFilter = filters.isLandlord === 'true';
          matchRole = item.isLandlord === isLandlordFilter;
      }

      return matchId && matchName && matchRole && matchPhone;
    });
  }, [dataList, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenAdd = () => { setModalMode("ADD"); setSelectedData(null); setIsModalOpen(true); };
  
  // Vẫn giữ lại hàm Edit để dùng khi người dùng nhấn đúp chuột (Double Click) vào dòng
  const handleOpenEdit = (item) => { setModalMode("EDIT"); setSelectedData(item); setIsModalOpen(true); };

  const handleSaveModal = async (formData, isSaveAndAdd) => {
    try {
      const isEdit = modalMode === "EDIT";
      if (isEdit) {
        await axiosInstance.put(`/lease/parties/${formData.partyId}`, formData);
        showToast('success', 'Party updated successfully!');
      } else {
        await axiosInstance.post('/lease/parties', formData);
        showToast('success', 'Party created successfully!');
      }
      
      // XỬ LÝ 2 NÚT BẤM
      if (isSaveAndAdd) {
        fetchData(); // Tải lại bảng nền
        setIsModalOpen(false); // Tắt modal cũ
        setTimeout(() => handleOpenAdd(), 300); // Mở lại modal trắng sau 0.3s
      } else {
        setIsModalOpen(false); // Chỉ tắt modal
        fetchData(); // Tải lại bảng nền
      }
      
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Error saving data!');
    }
  };

  return (
    <div className="bg-gray-100 h-[calc(100vh-60px)] pl-6 py-6 pr-1 font-sans flex flex-col relative">
      
      <div className="flex items-center gap-2 mb-4 text-[15px] shrink-0">
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
        <span className="font-semibold text-gray-500">/ Back-ground Data (Party)</span>
      </div>

      <div className="bg-white shadow rounded-md p-6 mb-4 flex flex-wrap items-end gap-6 shrink-0">
        <button className="bg-red-500 hover:bg-red-600 transition-colors text-white px-6 py-2.5 rounded font-semibold text-[14px]">
          Filter data
        </button>
        
        <div className="flex flex-col">
          <label className="font-semibold text-sm text-gray-700 mb-1.5">Party ID</label>
          <input 
            value={filters.partyId} onChange={e => handleFilterChange('partyId', e.target.value)}
            className="border border-yellow-400 rounded px-3 py-1.5 w-44 outline-none focus:ring-1 focus:ring-yellow-500 text-[14px]" 
            placeholder="Enter ID..." 
          />
        </div>

        <div className="flex flex-col">
          <label className="font-semibold text-sm text-gray-700 mb-1.5">Party Name</label>
          <input 
            value={filters.partyName} onChange={e => handleFilterChange('partyName', e.target.value)}
            className="border border-yellow-400 rounded px-3 py-1.5 w-56 outline-none focus:ring-1 focus:ring-yellow-500 text-[14px]" 
            placeholder="Enter Name..." 
          />
        </div>

        <div className="flex flex-col">
          <label className="font-semibold text-sm text-gray-700 mb-1.5">Role</label>
          <select 
            value={filters.isLandlord} onChange={e => handleFilterChange('isLandlord', e.target.value)}
            className="border border-yellow-400 rounded px-3 py-1.5 w-40 outline-none focus:ring-1 focus:ring-yellow-500 text-[14px] bg-white"
          >
            <option value="">All Roles</option>
            <option value="true">Landlord</option>
            <option value="false">Tenant / Other</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-md shadow flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Party (Contact) List</h2>
          <div className="flex gap-3">
            <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2 rounded font-bold shadow-sm transition-colors text-[14px]">
              Export
            </button>
            <button onClick={fetchData} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2 rounded font-bold shadow-sm transition-colors text-[14px]">
              Refresh
            </button>
            <button onClick={handleOpenAdd} className="bg-[#DE3B40] text-white hover:bg-[#C11C22] px-5 py-2 rounded font-bold shadow-sm transition-colors text-[14px]">
              + Add new
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto relative">
          {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 font-bold text-gray-600">
                  <svg className="animate-spin h-5 w-5 text-[#DE3B40]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Loading...
                </div>
             </div>
          )}

          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#EFB034] text-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-[14px] font-bold tracking-wider">Party ID</th>
                <th className="px-6 py-4 text-[14px] font-bold tracking-wider">Party Name</th>
                <th className="px-6 py-4 text-[14px] font-bold tracking-wider">Email</th>
                <th className="px-6 py-4 text-[14px] font-bold tracking-wider">Phone</th>
                <th className="px-6 py-4 text-[14px] font-bold tracking-wider text-center">Is Landlord</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredData.length === 0 && !loading ? (
                <tr><td colSpan="5" className="p-12 text-center text-gray-400 font-semibold text-lg">No data available</td></tr>
              ) : (
                filteredData.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => handleOpenEdit(item)}>
                    <td className="px-6 py-3 font-bold text-gray-800">{item.partyId}</td>
                    <td className="px-6 py-3 text-gray-800 font-semibold">{item.partyName}</td>
                    <td className="px-6 py-3 text-gray-600">{item.email || '-'}</td>
                    <td className="px-6 py-3 text-gray-600">{item.phone || '-'}</td>
                    <td className="px-6 py-3 text-center">
                        {item.isLandlord ? (
                            <svg className="w-6 h-6 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BackgroundDataModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveModal} 
        mode={modalMode} 
        initialData={selectedData} 
      />

      {notification.show && (
        <div className={`fixed bottom-8 right-8 z-[200] bg-white p-4 rounded-lg shadow-2xl flex items-center gap-4 border-l-4 animate-[slideInRight_0.3s_ease-out] ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {notification.type === 'success' ? '✓' : '!'}
           </div>
           <div className="flex flex-col pr-4">
              <span className="font-bold text-gray-800 text-[15px]">{notification.type === 'success' ? 'Success' : 'Error'}</span>
              <span className="text-sm text-gray-600 mt-0.5">{notification.message}</span>
           </div>
        </div>
      )}
    </div>
  );
}