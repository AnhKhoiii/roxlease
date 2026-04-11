import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import LeaseModal from "../../components/lease/LeaseModal";
import ContactsTab from "./tabs/ContactsTab";
import ClausesTab from "./tabs/ClausesTab";
import OptionsTab from "./tabs/OptionsTab";
import AmendmentsTab from "./tabs/AmendmentsTab";
import LeaseSuitesTab from "./tabs/LeaseSuitesTab";
import RecurringCostsTab from "./tabs/RecurringCostTab";

export default function LeaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Contacts");

  // State quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tabs = ["Contacts", "Recurring Costs", "Clauses", "Options", "Amendments", "Suites"];

  useEffect(() => {
    fetchLeaseDetail();
  }, [id]);

  const fetchLeaseDetail = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/lease/leases/${id}`);
      setLease(response.data);
    } catch (error) {
      console.error("Failed to fetch lease detail:", error);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý lưu khi sửa từ Modal
  const handleSaveModal = async (formData) => {
    try {
      await axiosInstance.put(`/lease/leases/${formData.lsId}`, formData);
      setIsModalOpen(false);
      fetchLeaseDetail(); // Load lại dữ liệu mới nhất sau khi sửa
    } catch (error) {
      alert("Lỗi lưu dữ liệu! Vui lòng kiểm tra lại.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500 font-semibold text-lg">Lease not found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 text-gray-800 font-sans p-3">
      
      {/* 1. HEADER TABS */}
      <div className="mb-2 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/lease/console')}
            className="text-gray-600 font-semibold hover:bg-gray-200 px-5 py-1.5 text-[13px] rounded-t-md transition-colors"
          >
            Select Lease
          </button>
          <button className="bg-red-50 text-[#DE3B40] font-bold px-5 py-1.5 text-[13px] rounded-t-md border-b-2 border-[#DE3B40] transition-colors">
            Detail for {lease.lsId}
          </button>
        </div>
      </div>

      {/* 2. GENERAL LEASE INFORMATION (ĐÃ ĐƯỢC THU NHỎ LẠI) */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 mb-3 p-3.5">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-gray-800">General Lease Information</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsModalOpen(true)} // Mở Modal Edit
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1 rounded text-xs font-semibold shadow-sm transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Chỉnh lại Grid 3 Cột, giảm Gap để giao diện khít hơn */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6">
          
          {/* Cột 1 */}
          <div className="flex flex-col gap-2">
            <DetailField label="Lease ID" value={lease.lsId} />
            <DetailField label="Site ID" value={lease.siteId} />
          </div>

          {/* Cột 2 */}
          <div className="flex flex-col gap-2">
            <DetailField label="Signing Date" value={lease.signedDate} />
            <DetailField label="Start Date" value={lease.startDate} />
            <DetailField label="End Date" value={lease.endDate} />
          </div>

          {/* Cột 3 */}
          <div className="flex flex-col gap-2">
            <DetailField label="Party Name" value={lease.partyName || lease.partyId} />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[9px] text-gray-500 uppercase tracking-wide">Active</span>
              <input 
                type="checkbox" 
                checked={lease.active || false}
                readOnly 
                className="w-3.5 h-3.5 text-orange-500 rounded border-gray-300 mt-0.5 cursor-default"
              />
            </div>
          </div>

        </div>
      </div>

      {/* 3. SUB-TABS SECTION */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="flex bg-gray-100 border-b border-gray-200 px-2 pt-1.5 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-[12px] font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-white text-[#D68910] border-t-2 border-t-[#D68910] shadow-[0_-2px_4px_rgba(0,0,0,0.02)] relative top-[1px]" // Đổi sang màu cam
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-3 flex-1 overflow-auto bg-white">
          {/* 4. CONTACTS TABLE */}
          {activeTab === "Contacts" && <ContactsTab lease={lease} />}
          {activeTab === "Clauses" && <ClausesTab lease={lease} />}
          {activeTab === "Options" && <OptionsTab lease={lease} />}
          {activeTab === "Amendments" && <AmendmentsTab lease={lease} />}
          {activeTab === "Suites" && <LeaseSuitesTab lease={lease} />}
          {activeTab === "Recurring Costs" && <RecurringCostsTab lease={lease} />}
        </div>    
      </div>

      {/* COMPONENT MODAL (Được gọi khi bấm nút Edit) */}
      {isModalOpen && (
        <LeaseModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveModal} 
          mode="EDIT" 
          initialData={lease} 
        />
      )}

    </div>
  );
}

// Component hiển thị chi tiết (Label - Value) đã được làm gọn chữ lại
const DetailField = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-bold text-[9px] text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-[12px] text-gray-800 font-medium">{value || "-"}</span>
  </div>
);