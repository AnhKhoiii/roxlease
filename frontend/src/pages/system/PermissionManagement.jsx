import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import PermissionModal from "../components/PermissionModal";
import { useOutletContext } from 'react-router-dom';

export default function PermissionManagement() {
  const { currentUser } = useOutletContext();
  const canEdit = currentUser?.permissions?.includes('SYSTEM_PERMISSION_EDIT');

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD");
  const [selectedPermForEdit, setSelectedPermForEdit] = useState(null);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/permissions');
      setPermissions(response.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPermissions(); }, []);

  const filteredPerms = permissions.filter(p => (p.code || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSaveModal = async (formData) => {
    try {
      if (modalMode === "ADD") {
        await axiosInstance.post('/permissions', formData);
        setShowNotification({ show: true, type: 'success', message: 'Created Permission successfully!' });
      } else {
        await axiosInstance.put(`/permissions/${formData.permissionId || formData.code}`, formData);
        setShowNotification({ show: true, type: 'success', message: 'Updated Permission successfully!' });
      }
      setIsModalOpen(false); fetchPermissions();
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: error.response?.data?.error || 'Error occurred!' });
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  const handleDelete = async () => {
    if (selectedPerms.length === 0) return alert("Please select permissions to delete!");
    try {
      for (const id of selectedPerms) await axiosInstance.delete(`/permissions/${id}`);
      setShowNotification({ show: true, type: 'success', message: `Deleted successfully!` });
      setSelectedPerms([]); fetchPermissions();
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: 'Error occurred while deleting!' });
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans relative">
      <div className="flex-1 p-10 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button onClick={() => {setModalMode("ADD"); setSelectedPermForEdit(null); setIsModalOpen(true);}} disabled={!canEdit} className={`px-5 py-2 rounded font-bold shadow-sm ${canEdit ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Add new Permission</button>
            <button onClick={handleDelete} disabled={!canEdit} className={`px-5 py-2 rounded font-bold shadow-sm ${canEdit ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>Delete Selected</button>
          </div>
          <input className="border border-yellow-500 rounded px-4 py-2 outline-none focus:ring-1 focus:ring-yellow-500 w-[300px]" placeholder="Search Code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="bg-white shadow rounded overflow-auto flex-1 border border-gray-200">
          <table className="w-full">
            <thead className="bg-yellow-500 text-white sticky top-0 shadow-sm">
              <tr className="text-left whitespace-nowrap">
                <th className="p-4 w-[60px] text-center"><input type="checkbox" disabled={!canEdit} onChange={(e) => setSelectedPerms(e.target.checked ? filteredPerms.map(p => p.permissionId) : [])} /></th>
                <th className="p-4 font-bold text-lg">Permission Code</th>
                <th className="p-4 font-bold text-lg">Module</th>
                <th className="p-4 font-bold text-lg">Application</th>
                <th className="p-4 font-bold text-lg text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPerms.map((p, index) => (
                <tr key={index} className="border-b hover:bg-red-50 cursor-pointer" onDoubleClick={() => { if(canEdit) {setModalMode("EDIT"); setSelectedPermForEdit(p); setIsModalOpen(true);} }}>
                  <td className="p-4 text-center"><input type="checkbox" disabled={!canEdit} checked={selectedPerms.includes(p.permissionId)} onChange={() => setSelectedPerms(prev => prev.includes(p.permissionId) ? prev.filter(i => i !== p.permissionId) : [...prev, p.permissionId])} /></td>
                  <td className="p-4 font-bold text-red-600">{p.code}</td>
                  <td className="p-4">{p.module}</td>
                  <td className="p-4">{p.application}</td>
                  <td className="p-4 text-center"><span className={`px-3 py-1 rounded text-white text-xs font-bold ${p.action === 'EDIT' ? 'bg-red-500' : 'bg-[#379AE6]'}`}>{p.action}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PermissionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveModal} mode={modalMode} initialData={selectedPermForEdit} />
      {/* Toast thông báo */}
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