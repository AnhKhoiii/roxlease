import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import UserModal from "../components/UserModal"; // <-- Import Component vừa tạo

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({
    username: "", fullname: "", company: "", department: "", role: "", email: "", status: "",
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "" });

  // --- STATE QUẢN LÝ MODAL ADD/EDIT ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD"); // "ADD" hoặc "EDIT"
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter((user) => {
    return (user.username || "").toLowerCase().includes(filters.username.toLowerCase()) &&
           (user.fullName || user.fullname || "").toLowerCase().includes(filters.fullname.toLowerCase()) &&
           (user.company || "").toLowerCase().includes(filters.company.toLowerCase()) &&
           (user.department || "").toLowerCase().includes(filters.department.toLowerCase()) &&
           (user.role || "").toLowerCase().includes(filters.role.toLowerCase()) &&
           (user.email || "").toLowerCase().includes(filters.email.toLowerCase()) &&
           (user.status || "").toLowerCase().includes(filters.status.toLowerCase());
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedUsers(filteredUsers.map(u => u.username));
    else setSelectedUsers([]);
  };

  const handleSelectRow = (username) => {
    if (selectedUsers.includes(username)) setSelectedUsers(selectedUsers.filter(u => u !== username));
    else setSelectedUsers([...selectedUsers, username]);
  };

  const handleConfirmLockUnlock = async () => {
    try {
      for (const username of selectedUsers) {
        const user = users.find(u => u.username === username);
        if (user) {
          const action = user.status === 'Inactive' || user.status === 'LOCKED' ? 'unlock' : 'lock';
          await axiosInstance.post(`/users/${username}/${action}`);
        }
      }
      setShowNotification({ show: true, type: 'success', message: `Đã cập nhật trạng thái thành công!` });
      setSelectedUsers([]); 
      setShowConfirmModal(false);
      fetchUsers(); 
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 3000);
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: 'Lỗi cập nhật Database!' });
      setShowConfirmModal(false);
    }
  };

  // --- MỞ MODAL ---
  const openAddModal = () => {
    setModalMode("ADD");
    setSelectedUserForEdit(null);
    setIsModalOpen(true);
  };

  // --- HÀM MỞ MODAL EDIT ---
  const openEditModal = async (user) => {
    try {
      // Gọi API lấy UserDetailResponse
      const response = await axiosInstance.get(`/users/${user.username}`);
      const userDetail = response.data;

      setModalMode("EDIT");
      
      // Đổ dữ liệu chi tiết vào state, lưu ý map đúng tên biến
      setSelectedUserForEdit({ 
        ...userDetail, 
        fullName: userDetail.fullname || userDetail.fullName,
        dob: userDetail.birthday,
        vpaSite: userDetail.vpasite 
      });
      
      setIsModalOpen(true);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết user:", error);
      setShowNotification({ show: true, type: 'error', message: 'Không thể lấy thông tin chi tiết!' });
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
    }
  };

  // --- HÀM XỬ LÝ LƯU (NHẬN TỪ USERMODAL) ---
  const handleSaveModal = async (formData) => {
    try {
      if (modalMode === "ADD") {
        await axiosInstance.post('/users', formData);
        setShowNotification({ show: true, type: 'success', message: 'Thêm người dùng mới thành công!' });
      } else {
        // Edit User (Ví dụ PUT /users/{username})
        await axiosInstance.put(`/users/${formData.username}`, formData);
        setShowNotification({ show: true, type: 'success', message: 'Cập nhật thông tin thành công!' });
      }
      
      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 3000);
    } catch (error) {
      console.error("Lỗi khi lưu user:", error);
      const errorMsg = error.response?.data?.error || 'Có lỗi xảy ra khi lưu vào Database!';
      setShowNotification({ show: true, type: 'error', message: errorMsg });
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
    }
  };

  return (
    <div className="flex bg-white min-h-screen font-sans">
      {/* Sidebar */}
      <div className="w-[260px] bg-gray-100 shadow-md p-6">
        <div className="flex flex-col gap-6 text-gray-600 text-lg">
          <div className="mt-10 text-red-500 font-bold">System</div>
          <div className="ml-4 text-red-500 font-semibold cursor-pointer">Add or Edit Users</div>
          <div className="ml-4 cursor-pointer hover:text-red-500">Add or Edit Roles</div>
          <div className="ml-4 cursor-pointer hover:text-red-500">Edit permission</div>
          <div className="ml-4 cursor-pointer hover:text-red-500">Assign Permission to role</div>
        </div>
      </div>

      <div className="flex-1 p-10 flex flex-col">

        {/* Top buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button 
              onClick={openAddModal} 
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition"
            >
              Add new
            </button>
            <button 
              onClick={() => { if(selectedUsers.length===0) alert("Chọn user trước!"); else setShowConfirmModal(true); }}
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition"
            >
              Lock/Unlock
            </button>
            <button className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition">
              Filter data
            </button>
          </div>
          <div className="flex gap-3">
            <button className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition">Import</button>
            <button className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded font-bold transition">Export xls</button>
          </div>
        </div>

        {/* Search fields */}
        <div className="flex flex-wrap gap-4 mb-6">
          {Object.keys(filters).map((key) => (
            <input
              key={key}
              className="border border-yellow-500 rounded px-3 py-2 min-w-[140px] flex-1 outline-none focus:ring-1 focus:ring-yellow-500"
              placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
              value={filters[key]}
              onChange={(e) => setFilters({...filters, [key]: e.target.value})}
            />
          ))}
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded overflow-auto flex-1">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-yellow-500 text-white sticky top-0">
              <tr className="text-left whitespace-nowrap">
                <th className="p-3 w-[60px] text-center">
                  <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} onChange={handleSelectAll} />
                </th>
                <th className="p-3">Username</th>
                <th className="p-3">Fullname</th>
                <th className="p-3">Company</th>
                <th className="p-3">Department</th>
                <th className="p-3">Role</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="8" className="p-6 text-center text-gray-500">Đang tải...</td></tr> : 
               filteredUsers.length === 0 ? <tr><td colSpan="8" className="p-6 text-center text-gray-500">Không có dữ liệu.</td></tr> :
               filteredUsers.map((user, index) => (
                <tr 
                  key={index} 
                  className="border-b hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                  onDoubleClick={() => openEditModal(user)} // Double click để edit nhanh
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={selectedUsers.includes(user.username)} onChange={() => handleSelectRow(user.username)} />
                  </td>
                  <td className="p-3 font-semibold text-gray-800">{user.username}</td>
                  <td className="p-3">{user.fullname || user.fullName}</td>
                  <td className="p-3">{user.company}</td>
                  <td className="p-3">{user.department}</td>
                  <td className="p-3 text-red-500 font-medium">{user.role}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <span className={`px-3 py-1 rounded text-white text-sm font-semibold ${user.status === "Active" || user.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"}`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= COMPONENT MODAL (ADD / EDIT) ================= */}
      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveModal} 
        mode={modalMode} 
        initialData={selectedUserForEdit} 
      />

      {/* Modal Lock/Unlock giữ nguyên */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-[450px] bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><span className="text-red-500 text-3xl font-bold">!</span></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác nhận thao tác</h2>
            <p className="text-gray-600 text-center mb-8">Bạn có chắc chắn muốn thay đổi trạng thái cho <strong>{selectedUsers.length}</strong> người dùng đã chọn không?</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 rounded border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition">Hủy</button>
              <button onClick={handleConfirmLockUnlock} className="flex-1 py-2 rounded bg-red-500 font-bold text-white hover:bg-red-600 transition">Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {showNotification.show && (
        <div className={`fixed bottom-8 right-8 z-[100] min-w-[320px] p-4 bg-white rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex items-center justify-between border-l-4 transition-transform duration-300 transform translate-y-0 ${
          showNotification.type === 'success' 
            ? 'border-green-500 text-green-600' 
            : 'border-red-500 text-red-600'
        }`}>
          <div className="flex items-center gap-4">
            {/* Icon tròn */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
              showNotification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {showNotification.type === 'success' ? '✓' : '!'}
            </div>
            
            {/* Nội dung tin nhắn */}
            <div className="flex flex-col">
              <span className="font-bold text-gray-800">
                {showNotification.type === 'success' ? 'Success' : 'Error'}
              </span>
              <span className="text-sm text-gray-600">{showNotification.message}</span>
            </div>
          </div>

          {/* Nút tắt */}
          <button 
            onClick={() => setShowNotification({ show: false, message: '', type: '' })}
            className="text-gray-400 hover:text-gray-800 focus:outline-none px-2 text-xl"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}