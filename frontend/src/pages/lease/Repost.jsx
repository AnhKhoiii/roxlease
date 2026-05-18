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

  const [filters, setFilters] = useState({
    siteId: '',
    fromDate: '',
    toDate: ''
  });

  // Danh sách 7 Tab theo yêu cầu (Đã bỏ opt-exp)
  const tabs = [
    { id: "lease-exp", label: "Lease by Expiration", desc: "Tổng hợp các hợp đồng theo ngày đến hạn" },
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
      const queryParams = new URLSearchParams({ type: tabId });
      if (filters.siteId) queryParams.append('siteId', filters.siteId);
      if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
      if (filters.toDate) queryParams.append('toDate', filters.toDate);
      
      const res = await axiosInstance.get(`/lease/analytics/reports?${queryParams.toString()}`);
      setData(res.data || []);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu báo cáo:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab, fetchReportData]);

  const handleExportExcel = async () => {
    try {
      const queryParams = new URLSearchParams({ type: activeTab });
      if (filters.siteId) queryParams.append('siteId', filters.siteId);
      if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
      if (filters.toDate) queryParams.append('toDate', filters.toDate);

      // responseType 'blob' là bắt buộc để xử lý file tải về
      const response = await axiosInstance.get(`/lease/analytics/export?${queryParams.toString()}`, {
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report_${activeTab}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error("Lỗi xuất file Excel:", error);
      alert("Không thể xuất file lúc này.");
    }
  };

  // Render Header bảng dựa theo Tab được chọn
  const getHeaders = () => {
    switch(activeTab) {
      case "lease-exp": return ["Lease ID", "Tenant", "Start Date", "End Date", "Remaining Days", "Status"];
      case "landlord":
      case "tenant": return ["Party Name", "Lease Count", "Total Area (m2)", "Total Revenue"];
      case "inc-month": return ["Month/Year", "Cost Type", "Total Amount", "Transaction Count", "Payment Status"];
      case "inc-year": return ["Year", "Cost Type", "Total Amount", "Growth %", "Budget vs Actual"];
      case "exp-month": return ["Month/Year", "Total Amount", "Transaction Count", "Payment Status"];
      case "exp-year": return ["Year", "Total Amount", "Growth %", "Budget vs Actual"];
      default: return [];
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto bg-[#f5f6fa] p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* TIÊU ĐỀ TRANG */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Reports Analytics</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Hệ thống báo cáo tổng hợp chi tiết</p>
          </div>
          <div className="flex items-end gap-3">
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Site ID</label>
                <input type="text" placeholder="e.g. S-HN-001" value={filters.siteId} onChange={e => setFilters({...filters, siteId: e.target.value})} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-32" />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">From Date</label>
                <input type="date" value={filters.fromDate} onChange={e => setFilters({...filters, fromDate: e.target.value})} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">To Date</label>
                <input type="date" value={filters.toDate} onChange={e => setFilters({...filters, toDate: e.target.value})} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
             </div>
             <button onClick={() => fetchReportData(activeTab)} className="bg-blue-900 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase shadow-sm hover:bg-blue-800 transition-all h-[38px] mb-0.5">
               Refresh Data
             </button>
             <button onClick={handleExportExcel} className="bg-green-600 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase shadow-sm hover:bg-green-700 transition-all h-[38px] mb-0.5">
               Export Excel
             </button>
          </div>
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