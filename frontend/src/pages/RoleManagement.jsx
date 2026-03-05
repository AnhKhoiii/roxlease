import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import RoleModal from "../components/RoleModal";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD");
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Lỗi fetch Roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const filteredRoles = roles.filter(role => 
    (role.roleName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedRoles(filteredRoles.map(r => r.roleName));
    else setSelectedRoles([]);
  };

  const handleSelectRow = (roleName) => {
    if (selectedRoles.includes(roleName)) setSelectedRoles(selectedRoles.filter(r => r !== roleName));
    else setSelectedRoles([...selectedRoles, roleName]);
  };

  const handleOpenAdd = () => { setModalMode("ADD"); setSelectedRoleForEdit(null); setIsModalOpen(true); };
  
  const handleOpenEdit = (role) => { setModalMode("EDIT"); setSelectedRoleForEdit(role); setIsModalOpen(true); };

  const handleSaveModal = async (formData) => {
    try {
      if (modalMode === "ADD") {
        await axiosInstance.post('/roles', formData);
        setShowNotification({ show: true, type: 'success', message: 'Tạo Role mới thành công!' });
      } else {
        await axiosInstance.put(`/roles/${formData.roleName}`, formData);
        setShowNotification({ show: true, type: 'success', message: 'Cập nhật Role thành công!' });
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: error.response?.data?.error || 'Có lỗi xảy ra!' });
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  const handleDeleteRoles = async () => {
    try {
      for (const roleName of selectedRoles) {
        await axiosInstance.delete(`/roles/${roleName}`);
      }
      setShowNotification({ show: true, type: 'success', message: `Đã xóa ${selectedRoles.length} Role thành công!` });
      setSelectedRoles([]);
      setShowDeleteConfirm(false);
      fetchRoles();
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: 'Lỗi khi xóa Role!' });
      setShowDeleteConfirm(false);
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  return (
    <div className="flex bg-white min-h-screen font-sans relative">
      {/* ---------------- SIDEBAR TRÁI ---------------- */}
      <div className="w-[260px] bg-gray-100 shadow-md p-6">
        <h1 className="text-red-500 font-bold text-xl mb-10">ROX Lease</h1>
        <div className="flex flex-col gap-6 text-gray-600 text-lg">
          <div className="hover:text-red-500 cursor-pointer">Home</div>
          <div className="hover:text-red-500 cursor-pointer">Space</div>
          <div className="hover:text-red-500 cursor-pointer">Lease</div>
          <div className="hover:text-red-500 cursor-pointer">Cost</div>
          <div className="hover:text-red-500 cursor-pointer">Service desk</div>
          <div className="mt-10 text-red-500 font-bold">System</div>
          <div className="ml-4 cursor-pointer hover:text-red-500">Add or Edit Users</div>
          
          {/* Active State cho Roles */}
          <div className="ml-4 text-red-500 font-semibold cursor-pointer border-l-4 border-red-500 pl-2">
            Add or Edit Roles
          </div>
          
          <div className="ml-4 cursor-pointer hover:text-red-500">Edit permission</div>
          <div className="ml-4 cursor-pointer hover:text-red-500">Assign Permission to role</div>
        </div>
      </div>

      {/* ---------------- NỘI DUNG CHÍNH ---------------- */}
      <div className="flex-1 p-10 flex flex-col">
        {/* Top Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button onClick={handleOpenAdd} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition shadow-sm">
              Add new Role
            </button>
            <button 
              onClick={() => { if(selectedRoles.length === 0) alert("Chọn Role cần xóa!"); else setShowDeleteConfirm(true); }} 
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition shadow-sm"
            >
              Delete Selected
            </button>
          </div>
          
          {/* Ô Tìm Kiếm */}
          <input
            className="border border-yellow-500 rounded px-4 py-2 outline-none focus:ring-1 focus:ring-yellow-500 w-[300px]"
            placeholder="Search Role or Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* BẢNG DỮ LIỆU */}
        <div className="bg-white shadow rounded overflow-auto flex-1 border border-gray-200">
          <table className="w-full">
            <thead className="bg-yellow-500 text-white sticky top-0 shadow-sm">
              <tr className="text-left whitespace-nowrap">
                <th className="p-4 w-[60px] text-center">
                  <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={selectedRoles.length === filteredRoles.length && filteredRoles.length > 0} onChange={handleSelectAll} />
                </th>
                <th className="p-4 font-bold text-lg">Role Name</th>
                <th className="p-4 font-bold text-lg">Description</th>
                <th className="p-4 font-bold text-lg text-center">System Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="p-6 text-center text-gray-500">Đang tải dữ liệu...</td></tr> : 
               filteredRoles.length === 0 ? <tr><td colSpan="4" className="p-6 text-center text-gray-500">Không có Role nào.</td></tr> :
               filteredRoles.map((role, index) => (
                <tr 
                  key={index} 
                  className="border-b hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
                  onDoubleClick={() => handleOpenEdit(role)} 
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="w-4 h-4 cursor-pointer accent-red-500" checked={selectedRoles.includes(role.roleName)} onChange={() => handleSelectRow(role.roleName)} />
                  </td>
                  <td className="p-4 font-bold text-red-600 uppercase">{role.roleName}</td>
                  <td className="p-4 text-gray-700 max-w-[400px] truncate" title={role.description}>{role.description || "N/A"}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded text-white text-xs font-bold ${role.isSystem ? "bg-red-500" : "bg-gray-400"}`}>
                      {role.isSystem ? 'YES' : 'NO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPONENT MODAL ADD/EDIT */}
      <RoleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveModal} mode={modalMode} initialData={selectedRoleForEdit} />

      {/* MODAL XÁC NHẬN XÓA */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[450px] bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><span className="text-red-500 text-3xl font-bold">🗑️</span></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác nhận xóa</h2>
            <p className="text-gray-600 text-center mb-8">Bạn có chắc chắn muốn xóa vĩnh viễn <strong>{selectedRoles.length}</strong> Role đã chọn không?</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition">Hủy</button>
              <button onClick={handleDeleteRoles} className="flex-1 py-2 rounded bg-red-500 font-bold text-white hover:bg-red-600 transition">Đồng ý Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO GÓC DƯỚI */}
      {showNotification.show && (
        <div className={`fixed bottom-8 right-8 z-[100] min-w-[320px] p-4 bg-white rounded-lg shadow-xl flex items-center justify-between border-l-4 transition-transform ${showNotification.type === 'success' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${showNotification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {showNotification.type === 'success' ? '✓' : '!'}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-800">{showNotification.type === 'success' ? 'Success' : 'Error'}</span>
              <span className="text-sm text-gray-600">{showNotification.message}</span>
            </div>
          </div>
          <button onClick={() => setShowNotification({ show: false, message: '', type: '' })} className="text-gray-400 hover:text-gray-800 px-2 text-xl">✕</button>
        </div>
      )}

    </div>
  );
}