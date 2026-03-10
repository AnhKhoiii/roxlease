import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import UserModal from "../components/UserModal";
import { useOutletContext } from 'react-router-dom';

export default function UserManagement() {
  const { currentUser } = useOutletContext();
  const canEdit = currentUser?.permissions?.includes('SYSTEM_USER_EDIT');

  const fileInputRef = useRef(null);
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
  const [modalMode, setModalMode] = useState("ADD");
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
           (user.roleName || "").toLowerCase().includes(filters.role.toLowerCase()) &&
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
      setShowNotification({ show: true, type: 'success', message: `Status updated successfully!` });
      setSelectedUsers([]); 
      setShowConfirmModal(false);
      fetchUsers(); 
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 3000);
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: 'Error updating Database!' });
      setShowConfirmModal(false);
    }
  };

  // --- MỞ MODAL ---
  const openAddModal = () => {
    setModalMode("ADD");
    setSelectedUserForEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (user) => {
    try {
      const response = await axiosInstance.get(`/users/${user.username}`);
      const userDetail = response.data;

      setModalMode("EDIT");
      
      setSelectedUserForEdit({ 
        ...userDetail, 
        fullName: userDetail.fullname || userDetail.fullName,
        dob: userDetail.birthday,
        vpaSite: userDetail.vpasite 
      });
      
      setIsModalOpen(true);
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết user:", error);
      setShowNotification({ show: true, type: 'error', message: 'Cannot retrieve user details!' });
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
    }
  };

  // --- HÀM XỬ LÝ LƯU ---
  const handleSaveModal = async (formData) => {
    try {
      if (modalMode === "ADD") {
        await axiosInstance.post('/users', formData);
        setShowNotification({ show: true, type: 'success', message: 'Successfully added new user!' });
      } else {
        await axiosInstance.put(`/users/${formData.username}`, formData);
        setShowNotification({ show: true, type: 'success', message: 'Successfully updated user information!' });
      }
      
      setIsModalOpen(false);
      fetchUsers();
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 3000);
    } catch (error) {
      console.error("Error saving user:", error);
      const errorMsg = error.response?.data?.error || 'Error saving user!';
      setShowNotification({ show: true, type: 'error', message: errorMsg });
      setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
    }
  };

  // --- XỬ LÝ EXPORT ---
  const handleExport = async () => {
    try {
      const response = await axiosInstance.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_roxlease.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowNotification({ show: true, type: 'success', message: 'Export file successfully!' });
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: 'Error exporting file!' });
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  // --- XỬ LÝ IMPORT ---
  const handleImportClick = () => { fileInputRef.current.click(); }; 

  const handleImportChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await axiosInstance.post('/users/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowNotification({ show: true, type: 'success', message: 'Import data successfully!' });
      fetchUsers();
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: error.response?.data?.error || 'Error importing data!' });
    } finally {
      setLoading(false);
      event.target.value = null;
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans relative">

      <div className="flex-1 p-10 flex flex-col">

        {/* Top buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button 
              onClick={openAddModal} 
              disabled={!canEdit}
              className={`px-5 py-2 rounded font-bold transition ${!canEdit ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              Add new User
            </button>
            <button 
              onClick={() => { if(selectedUsers.length===0) alert("Choose users first!"); else setShowConfirmModal(true); }}
              disabled={!canEdit}
              className={`px-5 py-2 rounded font-bold transition ${!canEdit ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              Lock/Unlock
            </button>
          </div>
          <div className="flex gap-3">
            {/* NÚT IMPORT VÀ EXPORT */}
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              accept=".xls,.xlsx" 
              onChange={handleImportChange} 
            />
            
            <button 
              onClick={handleImportClick} 
              disabled={!canEdit}
              className={`px-5 py-2 rounded font-bold transition shadow-sm border border-gray-300 ${
                canEdit ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Import
            </button>
            
            <button 
              onClick={handleExport}
              className="px-5 py-2 rounded font-bold transition shadow-sm border border-gray-300 bg-red-500 hover:bg-red-600 text-white"
            >
              Export
            </button>
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
                  <input type="checkbox" disabled={!canEdit} className="w-4 h-4 cursor-pointer" checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} onChange={handleSelectAll} />
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
              {loading ? <tr><td colSpan="8" className="p-6 text-center text-gray-500">Loading...</td></tr> : 
               filteredUsers.length === 0 ? <tr><td colSpan="8" className="p-6 text-center text-gray-500">No data available.</td></tr> :
               filteredUsers.map((user, index) => (
                <tr 
                  key={index} 
                  className="border-b hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
                  onDoubleClick={() => openEditModal(user)} 
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" disabled={!canEdit} className={`w-4 h-4 ${!canEdit ? 'cursor-not-allowed' : 'cursor-pointer accent-red-500'}`} checked={selectedUsers.includes(user.username)} onChange={() => handleSelectRow(user.username)} />
                  </td>
                  <td className="p-3 font-semibold text-gray-800">{user.username}</td>
                  <td className="p-3">{user.fullname || user.fullName}</td>
                  <td className="p-3">{user.company}</td>
                  <td className="p-3">{user.department}</td>
                  <td className="p-3 text-red-500 font-medium">{user.roleName}</td>
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
        canEdit={canEdit}
      />

      {/* Modal Lock/Unlock */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-[450px] bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><span className="text-red-500 text-3xl font-bold">!</span></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Confirm Action</h2>
            <p className="text-gray-600 text-center mb-8">Are you sure you want to change the status of <strong>{selectedUsers.length}</strong> selected users?</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2 rounded border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleConfirmLockUnlock} className="flex-1 py-2 rounded bg-red-500 font-bold text-white hover:bg-red-600 transition">Confirm</button>
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
              showNotification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {showNotification.type === 'success' ? '✓' : '!'}
            </div>
            
            <div className="flex flex-col">
              <span className="font-bold text-gray-800">
                {showNotification.type === 'success' ? 'Success' : 'Error'}
              </span>
              <span className="text-sm text-gray-600">{showNotification.message}</span>
            </div>
          </div>

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