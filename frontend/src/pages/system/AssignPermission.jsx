import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { useOutletContext } from 'react-router-dom';

export default function AssignPermission() {
  const { currentUser } = useOutletContext();
  const canEdit = currentUser?.permissions?.includes('SYSTEM_ASSIGN_EDIT');

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const [assignedPerms, setAssignedPerms] = useState([]); 

  const [selectedToUnassign, setSelectedToUnassign] = useState([]);
  const [selectedToAssign, setSelectedToAssign] = useState([]);    

  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "" });

  const fetchData = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axiosInstance.get('/roles'),
        axiosInstance.get('/permissions')
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
      
      if (rolesRes.data.length > 0) {
        setActiveRole(rolesRes.data[0]);
        setAssignedPerms(rolesRes.data[0].permissionsIds || []);
      }
    } catch (error) {
      console.error("Loading error:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRoles = roles.filter(r => r.roleName.toLowerCase().includes(searchTerm.toLowerCase()));

  const assignedList = permissions.filter(p => assignedPerms.includes(p.permissionId));
  const availableList = permissions.filter(p => !assignedPerms.includes(p.permissionId));

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setAssignedPerms(role.permissionsIds || []);
    setSelectedToAssign([]);
    setSelectedToUnassign([]);
  };

  const handleAssign = () => {
    if (selectedToAssign.length === 0) return;

    let permsToAdd = [...selectedToAssign];

    selectedToAssign.forEach(permId => {
      if (permId.endsWith('_EDIT')) {
        const viewPermId = permId.replace('_EDIT', '_VIEW');
        const viewExists = permissions.some(p => p.permissionId === viewPermId);
        if (viewExists && !assignedPerms.includes(viewPermId) && !permsToAdd.includes(viewPermId)) {
          permsToAdd.push(viewPermId);
        }
      }
    });

    setAssignedPerms(prev => [...prev, ...permsToAdd]);
    setSelectedToAssign([]);
  };

  const handleUnassign = () => {
    if (selectedToUnassign.length === 0) return;

    let permsToRemove = [...selectedToUnassign];

    selectedToUnassign.forEach(permId => {
      if (permId.endsWith('_VIEW')) {
        const editPermId = permId.replace('_VIEW', '_EDIT');
        if (assignedPerms.includes(editPermId) && !permsToRemove.includes(editPermId)) {
          permsToRemove.push(editPermId);
        }
      }
    });

    setAssignedPerms(prev => prev.filter(id => !permsToRemove.includes(id)));
    setSelectedToUnassign([]);
  };

  const handleSave = async () => {
    if (!activeRole) return;
    try {
      await axiosInstance.put(`/roles/${activeRole.roleName}/permissions`, assignedPerms);
      setShowNotification({ show: true, type: 'success', message: 'Save changes successfully!' });
      
      setRoles(roles.map(r => r.roleName === activeRole.roleName ? { ...r, permissionsIds: assignedPerms } : r));
    } catch (error) {
      setShowNotification({ show: true, type: 'error', message: error.response?.data?.error || 'Error saving data!' });
    }
    setTimeout(() => setShowNotification({ show: false, message: '', type: '' }), 4000);
  };

  return (
    <div className="flex w-full h-full bg-white font-sans relative">
      
      <div className="w-[300px] border-r border-gray-200 flex flex-col bg-white shrink-0">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Select Roles</h2>
          <input 
            type="text" placeholder="Search Role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 outline-none focus:border-red-500 text-sm"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredRoles.map(role => (
            <div 
              key={role.roleName} onClick={() => handleRoleSelect(role)}
              className={`p-4 cursor-pointer border-b border-gray-100 transition-colors flex items-center justify-between
                ${activeRole?.roleName === role.roleName ? 'bg-red-50 border-l-4 border-l-red-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
            >
              <span className={`font-semibold ${activeRole?.roleName === role.roleName ? 'text-red-600' : 'text-gray-700'}`}>{role.roleName}</span>
              <span className="text-xs text-gray-400 font-mono">({(role.permissionsIds || []).length})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#F8F9FA] overflow-hidden">
        
        <div className="p-6 bg-white border-b border-gray-200 flex justify-between items-center shrink-0 shadow-sm z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            Role: <span className="text-red-500">{activeRole?.roleName || "..."}</span>
          </h2>
          <button 
            onClick={handleSave} disabled={!canEdit || !activeRole}
            className={`px-8 py-2.5 rounded font-bold shadow-md transition-all ${canEdit && activeRole ? 'bg-[#DE3B40] hover:bg-[#C11C22] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Save Changes
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[400px] shrink-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-bold text-green-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Assigned Permissions ({assignedList.length})
              </h3>
              <button 
                onClick={handleUnassign} disabled={!canEdit || selectedToUnassign.length === 0}
                className={`px-4 py-1.5 rounded text-sm font-bold border transition-colors ${canEdit && selectedToUnassign.length > 0 ? 'bg-white border-red-500 text-red-500 hover:bg-red-50' : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'}`}
              >
                ↓ Unassign Selected
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-white sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="p-3 w-[50px] text-center border-b"><input type="checkbox" disabled={!canEdit} onChange={(e) => setSelectedToUnassign(e.target.checked ? assignedList.map(p => p.permissionId) : [])} checked={assignedList.length > 0 && selectedToUnassign.length === assignedList.length} /></th>
                    <th className="p-3 font-semibold text-gray-600 border-b">Permission Code</th>
                    <th className="p-3 font-semibold text-gray-600 border-b">Module</th>
                    <th className="p-3 font-semibold text-gray-600 border-b">Application</th>
                    <th className="p-3 font-semibold text-gray-600 border-b text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedList.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-400">Chưa có quyền nào được gán</td></tr> :
                    assignedList.map(p => (
                    <tr key={p.permissionId} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => canEdit && setSelectedToUnassign(prev => prev.includes(p.permissionId) ? prev.filter(id => id !== p.permissionId) : [...prev, p.permissionId])}>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" disabled={!canEdit} className="accent-red-500 cursor-pointer" checked={selectedToUnassign.includes(p.permissionId)} onChange={() => setSelectedToUnassign(prev => prev.includes(p.permissionId) ? prev.filter(id => id !== p.permissionId) : [...prev, p.permissionId])} /></td>
                      <td className="p-3 font-semibold text-gray-800">{p.code}</td>
                      <td className="p-3 text-gray-600">{p.module}</td>
                      <td className="p-3 text-gray-600">{p.application}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-white text-xs font-bold ${p.action === 'EDIT' ? 'bg-red-500' : 'bg-[#379AE6]'}`}>{p.action}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[400px] shrink-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-bold text-gray-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                Available Permissions ({availableList.length})
              </h3>
              <button 
                onClick={handleAssign} disabled={!canEdit || selectedToAssign.length === 0}
                className={`px-4 py-1.5 rounded text-sm font-bold border transition-colors ${canEdit && selectedToAssign.length > 0 ? 'bg-white border-green-500 text-green-600 hover:bg-green-50' : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'}`}
              >
                ↑ Assign Selected
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-white sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="p-3 w-[50px] text-center border-b"><input type="checkbox" disabled={!canEdit} onChange={(e) => setSelectedToAssign(e.target.checked ? availableList.map(p => p.permissionId) : [])} checked={availableList.length > 0 && selectedToAssign.length === availableList.length} /></th>
                    <th className="p-3 font-semibold text-gray-600 border-b">Permission Code</th>
                    <th className="p-3 font-semibold text-gray-600 border-b">Module</th>
                    <th className="p-3 font-semibold text-gray-600 border-b">Application</th>
                    <th className="p-3 font-semibold text-gray-600 border-b text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableList.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-400">Đã gán tất cả các quyền</td></tr> :
                    availableList.map(p => (
                    <tr key={p.permissionId} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => canEdit && setSelectedToAssign(prev => prev.includes(p.permissionId) ? prev.filter(id => id !== p.permissionId) : [...prev, p.permissionId])}>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" disabled={!canEdit} className="accent-green-500 cursor-pointer" checked={selectedToAssign.includes(p.permissionId)} onChange={() => setSelectedToAssign(prev => prev.includes(p.permissionId) ? prev.filter(id => id !== p.permissionId) : [...prev, p.permissionId])} /></td>
                      <td className="p-3 font-semibold text-gray-500">{p.code}</td>
                      <td className="p-3 text-gray-500">{p.module}</td>
                      <td className="p-3 text-gray-500">{p.application}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-white text-xs font-bold ${p.action === 'EDIT' ? 'bg-red-400' : 'bg-blue-400'}`}>{p.action}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

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