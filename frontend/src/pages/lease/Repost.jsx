import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from "../../api/axiosInstance";

// --- UI COMPONENTS ---
const SectionContainer = ({ children }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[600px] animate-[fadeIn_0.2s_ease-out]">
    {children}
  </div>
);

const ReportTable = ({ headers, data, loading }) => (
  <div className="overflow-x-auto border border-gray-100 rounded-lg">
    <table className="w-full text-left text-[12px] whitespace-nowrap">
      <thead className="bg-gray-50 text-gray-600 border-b border-gray-100 font-bold uppercase tracking-wider">
        <tr>
          {headers.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {loading ? (
          <tr><td colSpan={headers.length} className="text-center py-20 animate-pulse text-gray-400 font-medium">Đang tải dữ liệu báo cáo...</td></tr>
        ) : data.length > 0 ? (
          data.map((row, idx) => (
            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
              {Object.values(row).map((val, i) => <td key={i} className="px-4 py-3 text-gray-700">{val}</td>)}
            </tr>
          ))
        ) : (
          <tr><td colSpan={headers.length} className="text-center py-20 text-gray-400">Không có dữ liệu cho báo cáo này.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export default function LeaseReports() {
  const [activeTab, setActiveTab] = useState("lease-exp");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Danh sách 8 Tab theo yêu cầu 
  const tabs = [
    { id: "lease-exp", label: "Lease by Expiration", desc: "Tổng hợp các hợp đồng theo ngày đến hạn" },
    { id: "opt-exp", label: "Options by Expiration", desc: "Tổng hợp các tuỳ chọn hợp đồng đến hạn" },
    { id: "landlord", label: "Lease by Landlord", desc: "Tổng hợp hợp đồng theo landlord" },
    { id: "tenant", label: "Lease by Tenant", desc: "Tổng hợp hợp đồng theo tenant" },
    { id: "inc-month", label: "Income by Month", desc: "Doanh thu theo tháng" },
    { id: "inc-year", label: "Income by Year", desc: "Doanh thu theo năm" },
    { id: "exp-month", label: "Expense by Month", desc: "Chi phí theo tháng" },
    { id: "exp-year", label: "Expense by Year", desc: "Chi phí theo năm" },
  ];

  const fetchReportData = useCallback(async (tabId) => {
    setLoading(true);
    try {
      // API chung xử lý cho cả 8 loại báo cáo dựa trên tabId
      const res = await axiosInstance.get(`/lease/analytics/reports?type=${tabId}`);
      setData(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu báo cáo:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab, fetchReportData]);

  // Render Header bảng dựa theo Tab được chọn
  const getHeaders = () => {
    switch(activeTab) {
      case "lease-exp": return ["Lease ID", "Tenant", "Start Date", "End Date", "Remaining Days", "Status"];
      case "opt-exp": return ["Lease ID", "Option Type", "Option Date", "Description", "Status"];
      case "landlord":
      case "tenant": return ["Party Name", "Lease Count", "Total Area (m2)", "Total Revenue"];
      case "inc-month":
      case "exp-month": return ["Month/Year", "Total Amount", "Transaction Count", "Payment Status"];
      case "inc-year":
      case "exp-year": return ["Year", "Total Amount", "Growth %", "Budget vs Actual"];
      default: return [];
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto bg-[#f5f6fa] p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* TIÊU ĐỀ TRANG */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Reports Analytics</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Hệ thống báo cáo tổng hợp chi tiết</p>
          </div>
          <button onClick={() => fetchReportData(activeTab)} className="bg-blue-900 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase shadow-sm hover:bg-blue-800 transition-all">
            Refresh Data
          </button>
        </div>

        {/* 🚀 LAYOUT 8 TAB THEO YÊU CẦU */}
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-1 sticky top-0 z-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-tighter transition-all duration-200 ${
                activeTab === tab.id 
                ? "bg-blue-900 text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-50 hover:text-blue-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* NỘI DUNG CHÍNH CỦA TAB */}
        <SectionContainer>
          <div className="mb-6 border-l-4 border-blue-900 pl-4">
            <h2 className="text-lg font-bold text-gray-800 uppercase">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500 italic">
              {tabs.find(t => t.id === activeTab)?.desc}
            </p>
          </div>

          <ReportTable 
            headers={getHeaders()} 
            data={data} 
            loading={loading} 
          />
        </SectionContainer>

      </div>
    </div>
  );
}