import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

export default function LeaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Contacts");

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    <div className="flex flex-col h-full min-h-screen bg-gray-50 text-gray-800 font-sans p-4">
      
      {/* 1. HEADER TABS */}
      <div className="mb-3 flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/leases/console')}
            className="text-gray-600 font-semibold hover:bg-gray-200 px-6 py-2 text-sm rounded-t-md transition-colors"
          >
            Select Lease
          </button>
          <button className="bg-red-50 text-[#DE3B40] font-bold px-6 py-2 text-sm rounded-t-md border-b-2 border-[#DE3B40] transition-colors">
            Detail for {lease.lsId}
          </button>
        </div>
      </div>

      {/* 2. GENERAL LEASE INFORMATION */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 mb-4 p-5">
        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">General Lease Information</h2>
          <div className="flex gap-2">
            <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-colors">
              Edit
            </button>
            <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-colors">
              More
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8">
          <DetailField label="Lease ID" value={lease.lsId} />
          <DetailField label="Site ID" value={lease.siteId} />
          <DetailField label="Signing Date" value={lease.signedDate} />
          <DetailField label="Start Date" value={lease.startDate} />
          <DetailField label="End Date" value={lease.endDate} />
          <DetailField label="Party Name" value={lease.partyName || lease.partyId} />
          
          <div className="flex flex-col gap-1">
            <span className="font-bold text-[10px] text-gray-500 uppercase tracking-wide">Active</span>
            <input 
              type="checkbox" 
              checked={lease.active !== false} // Mặc định true nếu undefined
              readOnly 
              className="w-4 h-4 text-blue-600 rounded border-gray-300 mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* 3. SUB-TABS SECTION */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        <div className="flex bg-gray-100 border-b border-gray-200 px-2 pt-2 gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-[13px] font-semibold rounded-t-md transition-colors whitespace-nowrap ${
                activeTab === tab 
                  ? "bg-white text-blue-700 border-t-2 border-t-blue-600 shadow-[0_-2px_4px_rgba(0,0,0,0.02)] relative top-[1px]" 
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 flex-1 overflow-auto bg-white">
          {/* 4. CONTACTS TABLE (Conditional Rendering) */}
          {activeTab === "Contacts" && (
            <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
              <div className="flex justify-end gap-2 mb-3">
                <button className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-colors">
                  + Add new
                </button>
                <button className="bg-white border border-red-300 text-[#DE3B40] hover:bg-red-50 px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-colors">
                  Delete
                </button>
              </div>

              <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1">
                <table className="w-full text-left text-[13px] whitespace-nowrap">
                  <thead className="bg-[#F39C12] text-white">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded" />
                      </th>
                      <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Contact Name</th>
                      <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Company</th>
                      <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Role</th>
                      <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Email</th>
                      <th className="px-4 py-2 font-semibold tracking-wide border-b border-[#D68910]">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Empty State For Now */}
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 font-medium">
                        No contacts found for this lease.
                      </td>
                    </tr>
                    {/* Mock Data Example:
                    <tr className="hover:bg-blue-50/50 cursor-pointer text-gray-700">
                      <td className="px-3 py-2 text-center"><input type="checkbox" className="w-3.5 h-3.5" /></td>
                      <td className="px-4 py-2">John Doe</td>
                      <td className="px-4 py-2">Tech Corp</td>
                      <td className="px-4 py-2">Property Manager</td>
                      <td className="px-4 py-2">john@techcorp.com</td>
                      <td className="px-4 py-2">+1 234 567 890</td>
                    </tr>
                    */}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hiển thị Placeholder cho các Tab khác */}
          {activeTab !== "Contacts" && (
            <div className="flex h-full items-center justify-center text-gray-400 italic">
              {activeTab} module is under construction...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Detail Field Component
const DetailField = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-bold text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-[13px] text-gray-800 font-medium">{value || "-"}</span>
  </div>
);