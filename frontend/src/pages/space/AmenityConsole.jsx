import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useOutletContext } from "react-router-dom";
import AmenityModal from "../../components/space/AmenityModal";

export default function AmenityConsole() {
  const { currentUser } = useOutletContext();
  const canEdit = currentUser?.permissions?.includes('SPACE_AMENITY_EDIT');

  const [dataList, setDataList] = useState([]);
  const [buildings, setBuildings] = useState([]); // Lấy danh sách Building cho Modal Dropdown
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD");
  const [selectedDataForEdit, setSelectedDataForEdit] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lấy danh sách Amenity
      const res = await axiosInstance.get('/space/amenities');
      setDataList(res.data);

      // 2. Lấy danh sách Tòa nhà để điền vào Select Dropdown
      const buildingRes = await axiosInstance.get('/space/properties/buildings');
      setBuildings(buildingRes.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu", error);
      showToast('error', 'Không thể tải dữ liệu từ máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  };

  const handleOpenAdd = () => { 
    setModalMode("ADD"); 
    setSelectedDataForEdit(null); 
    setIsModalOpen(true); 
  };
  
  const handleOpenEdit = (item) => { 
    setModalMode("EDIT"); 
    setSelectedDataForEdit(item); 
    setIsModalOpen(true); 
  };

  const handleSaveModal = async (formData) => {
    try {
      const isEdit = modalMode === "EDIT";
      if (isEdit) {
        await axiosInstance.put(`/space/amenities/${formData.amenityId}`, formData);
      } else {
        await axiosInstance.post('/space/amenities', formData);
      }

      showToast('success', 'Lưu dữ liệu thành công!');
      setIsModalOpen(false);
      fetchData(); 
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Lỗi 400: Kiểm tra lại dữ liệu!');
    }
  };

  const handleDeleteFromModal = () => {
    setIsModalOpen(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDataForEdit) return;
    try {
      await axiosInstance.delete(`/space/amenities/${selectedDataForEdit.amenityId}`);
      showToast('success', `Đã xóa thành công bản ghi!`);
      setShowDeleteModal(false);
      fetchData(); 
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Lỗi khi xóa dữ liệu!');
      setShowDeleteModal(false);
    }
  };

  const headers = ["Amenity ID", "Amenity Name", "Building ID", "Amenity Type"];

  return (
    <div className="bg-gray-100 h-[calc(100vh-60px)] p-6 font-sans flex flex-col relative">
      
      {/* NỘI DUNG CHÍNH */}
      <div className="bg-white rounded-md shadow flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-bold text-xl uppercase tracking-wider text-gray-800">Quản lý Amenity</h2>

          <div className="flex gap-3">
            <button onClick={handleOpenAdd} disabled={!canEdit} className={`px-5 py-2 rounded font-bold shadow-sm transition-colors text-[14px] ${canEdit ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              + Add new
            </button>
          </div>
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="flex-1 overflow-auto relative">
          {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 font-bold text-gray-600">Đang tải dữ liệu...</div>
             </div>
          )}

          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-yellow-500 text-white sticky top-0 z-10 shadow-sm">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-6 py-4 text-[14px] font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white">
              {dataList.length === 0 && !loading ? (
                <tr><td colSpan={headers.length} className="p-12 text-center text-gray-400 font-semibold text-lg">No data available</td></tr>
              ) : (
                dataList.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-red-50 cursor-pointer transition-colors" onDoubleClick={() => handleOpenEdit(item)}>
                    <td className="px-6 py-4 font-bold text-gray-800">{item.amenityId}</td>
                    <td className="px-6 py-4 text-gray-600">{item.amenityName}</td>
                    <td className="px-6 py-4 text-gray-600 font-semibold">{item.blId}</td>
                    <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold rounded">
                            {item.amenityType}
                        </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GỌI MODAL */}
      <AmenityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveModal} 
        onDelete={handleDeleteFromModal}
        mode={modalMode} 
        initialData={selectedDataForEdit} 
        canEdit={canEdit} 
        buildings={buildings}
      />

      {/* MODAL CẢNH BÁO XÓA */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[150] backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] text-center animate-[fadeIn_0.2s_ease-out]">
            <div className="text-5xl text-yellow-500 mb-4 flex justify-center">⚠</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa</h3>
            <p className="mb-8 text-gray-600">Bạn có chắc chắn muốn xóa bản ghi <strong className="text-red-500">{selectedDataForEdit?.amenityId}</strong>? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-center gap-4">
              <button className="flex-1 bg-gray-100 text-gray-700 font-bold px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setShowDeleteModal(false)}>Hủy</button>
              <button className="flex-1 bg-[#DE3B40] text-white font-bold px-4 py-2.5 rounded-lg hover:bg-[#C11C22] transition-colors shadow-sm" onClick={confirmDelete}>Đồng ý xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO GÓC DƯỚI */}
      {notification.show && (
        <div className={`fixed bottom-8 right-8 z-[200] bg-white p-4 rounded-lg shadow-2xl flex items-center gap-4 border-l-4 animate-[slideInRight_0.3s_ease-out] ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {notification.type === 'success' ? '✓' : '!'}
           </div>
           <div className="flex flex-col pr-4">
              <span className="font-bold text-gray-800 text-[15px]">{notification.type === 'success' ? 'Thành công' : 'Lỗi'}</span>
              <span className="text-sm text-gray-600 mt-0.5">{notification.message}</span>
           </div>
        </div>
      )}
    </div>
  );
}