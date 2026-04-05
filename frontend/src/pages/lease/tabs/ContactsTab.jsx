import React, { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosInstance";

// ==========================================
// REUSABLE UI COMPONENTS
// ==========================================
const Input = ({ label, value, onChange, disabled, required, placeholder }) => (
  <div className="flex flex-col gap-0.5 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="border border-gray-300 rounded px-2.5 py-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white transition-shadow w-full"
    />
  </div>
);

// ==========================================
// MODAL COMPONENT
// ==========================================
const ContactModal = ({ isOpen, onClose, onSave, onDelete, mode, initialData, leaseId }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || { lsId: leaseId });
    }
  }, [isOpen, initialData, leaseId]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSaveDisabled = !formData.contactName || formData.contactName.trim() === '';

  const handleSave = (addAnother = false) => {
    if (isSaveDisabled) return;
    onSave(formData, addAnother);
    if (addAnother) {
      setFormData({ lsId: leaseId }); // Reset form
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-white w-[700px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        
        {/* HEADER */}
        <div className="bg-[#EFB034] px-5 py-3 flex justify-between items-center shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-tight text-white drop-shadow-sm">
            {mode === "ADD" ? "Add New Contact" : `Contact: ${formData.contactId || 'Edit'}`}
          </h2>
          <div className="flex gap-2 items-center">
            {mode === "ADD" ? (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaveDisabled}
                  className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaveDisabled}
                  className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors"
                >
                  Save and add another
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaveDisabled}
                  className="bg-[#DE3B40] hover:bg-[#C11C22] disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => onDelete(formData.contactId)}
                  className="bg-white text-[#DE3B40] hover:bg-red-50 px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors"
                >
                  Delete
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white hover:text-red-100 ml-2 transition-colors focus:outline-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 bg-gray-50 flex-1">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input 
              label="Contact ID" 
              value={formData.contactId} 
              disabled={true} 
              placeholder="Auto-generated"
            />
            <Input 
              label="Contact Name" 
              value={formData.contactName} 
              onChange={v => handleChange('contactName', v)} 
              required={true}
              placeholder="Enter contact name"
            />
            <Input 
              label="Company" 
              value={formData.company} 
              onChange={v => handleChange('company', v)} 
              placeholder="Enter company"
            />
            <Input 
              label="Role" 
              value={formData.contactRole}
              onChange={v => handleChange('contactRole', v)}
              placeholder="Enter role (e.g., Manager)"
            />
            <Input 
              label="Email" 
              value={formData.email} 
              onChange={v => handleChange('email', v)} 
              placeholder="example@domain.com"
            />
            <Input 
              label="Phone" 
              value={formData.phone} 
              onChange={v => handleChange('phone', v)} 
              placeholder="+1 234 567 890"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN TAB COMPONENT
// ==========================================
export default function ContactsTab({ leaseId }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    mode: "ADD",
    data: null
  });

  useEffect(() => {
    if (leaseId) {
      fetchContacts();
    }
  }, [leaseId]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      // Giả sử API endpoint để lấy contacts theo leaseId
      const response = await axiosInstance.get('/lease/contacts', { params: { lsId: leaseId } });
      const data = Array.isArray(response.data) ? response.data : (response.data?.content || []);
      setContacts(data);
      setSelectedIds([]); // Reset selection on reload
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Row Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(contacts.map(c => c.contactId || c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, id) => {
    e.stopPropagation(); // Ngăn chặn click row (mở Edit Modal)
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const isAllSelected = contacts.length > 0 && selectedIds.length === contacts.length;

  // Actions
  const handleOpenAdd = () => {
    setModalConfig({ isOpen: true, mode: "ADD", data: null });
  };

  const handleOpenEdit = (contact) => {
    setModalConfig({ isOpen: true, mode: "EDIT", data: contact });
  };

  const handleCloseModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // API Actions
  const handleSaveContact = async (formData, addAnother) => {
    try {
      if (modalConfig.mode === "EDIT") {
        const id = formData.contactId || formData.id;
        await axiosInstance.put(`/lease/contacts/${id}`, formData);
      } else {
        await axiosInstance.post('/lease/contacts', formData);
      }
      
      await fetchContacts();
      
      if (!addAnother) {
        handleCloseModal();
      }
    } catch (error) {
      alert("Failed to save contact. Please check your data.");
      console.error(error);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    try {
      await axiosInstance.delete(`/lease/contacts/${id}`);
      handleCloseModal();
      fetchContacts();
    } catch (error) {
      alert("Failed to delete contact.");
      console.error(error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected contacts?`)) return;
    
    try {
      setLoading(true);
      // Chạy vòng lặp xóa nhiều hoặc dùng bulk delete endpoint nếu backend hỗ trợ
      await Promise.all(selectedIds.map(id => axiosInstance.delete(`/lease/contacts/${id}`)));
      fetchContacts();
    } catch (error) {
      alert("Failed to delete some contacts.");
      console.error(error);
      fetchContacts(); // Reload to get actual state
    }
  };

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      
      {/* 1. ACTION BAR (LEFT) */}
      <div className="flex justify-start gap-2 mb-3">
        <button 
          onClick={handleOpenAdd}
          className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors"
        >
          Add new
        </button>
        <button 
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
          className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${
            selectedIds.length > 0 
              ? "bg-[#DE3B40] hover:bg-[#C11C22] text-white" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Delete
        </button>
      </div>

      {/* 2. CONTACTS TABLE */}
      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 relative bg-white">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer" 
                  />
                </th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Contact Name</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Company</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Role</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Email</th>
                <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-medium bg-gray-50/50">
                    No contacts found. Click "Add new" to create one.
                  </td>
                </tr>
              ) : (
                contacts.map((contact, index) => {
                  const id = contact.contactId || contact.id || index;
                  const isSelected = selectedIds.includes(id);

                  return (
                    <tr 
                      key={id}
                      onClick={() => handleOpenEdit(contact)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected ? "bg-blue-50" : "hover:bg-orange-50/50"
                      }`}
                    >
                      <td className="px-3 py-2 text-center border-r border-gray-50 group-hover:border-transparent">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(e, id)}
                          onClick={(e) => e.stopPropagation()} // Cực kỳ quan trọng để không kích hoạt onClick của row
                          className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer" 
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-800 font-medium border-r border-gray-50 group-hover:border-transparent">{contact.contactName || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 border-r border-gray-50 group-hover:border-transparent">{contact.company || "-"}</td>
                      <td className="px-4 py-2 text-gray-600 border-r border-gray-50 group-hover:border-transparent">{contact.contactRole || "-"}</td>
                      <td className="px-4 py-2 text-blue-600 border-r border-gray-50 group-hover:border-transparent">{contact.email || "-"}</td>
                      <td className="px-4 py-2 text-gray-600">{contact.phone || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ContactModal 
        isOpen={modalConfig.isOpen}
        mode={modalConfig.mode}
        initialData={modalConfig.data}
        leaseId={leaseId}
        onClose={handleCloseModal}
        onSave={handleSaveContact}
        onDelete={handleDeleteSingle}
      />
    </div>
  );
}