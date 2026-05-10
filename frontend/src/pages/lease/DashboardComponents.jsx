import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from "../../api/axiosInstance";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';

// ==================================================
// TIỆN ÍCH FORMAT SỐ LIỆU
// ==================================================
const formatNum = (num) => Number(num || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
const formatCurrency = (num) => {
  if (!num) return "0";
  const inBillion = Number(num) / 1000000000;
  return inBillion >= 1 ? `${inBillion.toLocaleString(undefined, { maximumFractionDigits: 2 })}B` : Number(num).toLocaleString();
};

const CHART_COLORS = ['#EAB308', '#3B82F6', '#22C55E', '#EF4444', '#8B5CF6'];

// ==================================================
// REUSABLE COMPONENTS (UI BLOCKS)
// ==================================================
const SectionContainer = ({ children }) => (
  <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
    {children}
  </div>
);

const SectionTitle = ({ title }) => (
  <h2 className="text-center font-bold text-lg text-gray-800 mb-6 uppercase tracking-wide">
    {title}
  </h2>
);

const MetricBox = ({ label, value, color = "text-gray-800" }) => (
  <div className="bg-gray-50 p-3 rounded border border-gray-100 flex flex-col justify-center shadow-sm">
    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">{label}</span>
    <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const ProgressBar = ({ label, value, color = "bg-green-500" }) => (
  <div className="mb-3">
    <div className="flex justify-between text-[11px] font-bold mb-1 uppercase tracking-tighter">
      <span className="text-gray-600">{label}</span>
      <span className={color.replace('bg-', 'text-')}>{formatNum(value)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${Math.min(value || 0, 100)}%` }}></div>
    </div>
  </div>
);

const KpiCard = ({ label, value, color="text-gray-800" }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col justify-center">
    <span className="text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-tighter">{label}</span>
    <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const KpiGrid = ({ kpi }) => {
  if (!kpi) return null;
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Annual Plan" value={`${formatCurrency(kpi.annualPlan)} VND`} />
        <KpiCard label="Plan to Date" value={`${formatCurrency(kpi.planToDate)} VND`} />
        <KpiCard label="Actual to Date" value={`${formatCurrency(kpi.actualToDate)} VND`} color="text-green-600" />
        <KpiCard label="Annual Forecast" value={`${formatCurrency(kpi.annualForecast)} VND`} color="text-blue-600" />
        <KpiCard label="Plan Achievement" value={`${formatNum(kpi.planAchievement)}%`} color="text-orange-500" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Forecast Achievement" value={`${formatNum(kpi.forecastAchievement)}%`} />
        <KpiCard label="YTD Achievement" value={`${formatNum(kpi.ytdAchievement)}%`} />
        <KpiCard label="OCC Achievement" value={`${formatNum(kpi.actualOcc)}%`} />
        <KpiCard label="Forecast OCC Achiev." value={`${formatNum(kpi.forecastOcc)}%`} />
        <KpiCard label="YTD OCC Achiev." value={`${formatNum(kpi.actualOcc)}%`} />
      </div>
    </div>
  );
};

// ==================================================
// 1. OVERVIEW SECTION
// ==================================================
const OverviewSection = ({ overview, amenity }) => {
  const gfa = overview?.gfa || 1; 
  const pctAvail = Math.min((overview?.availableNfa / gfa) * 100, 100) || 0;
  const pctLeased = Math.min((overview?.leasedNfa / gfa) * 100, 100) || 0;
  const pctOther = Math.min((overview?.otherArea / gfa) * 100, 100) || 0;

  const totalAmenity = amenity?.totalAmenities || 1;
  const pctAmenityAvail = Math.min((amenity?.availableAmenities / totalAmenity) * 100, 100) || 0;
  const pctAmenityOccupied = Math.min((amenity?.leasedAmenities / totalAmenity) * 100, 100) || 0;

  return (
    <SectionContainer>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* LEFT: SITE & AREA OVERVIEW */}
        <div>
          <SectionTitle title="OVERVIEW" />
          <div className="flex justify-between mb-6 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Number of Sites</span>
              <span className="font-black text-lg">{formatNum(overview?.totalSites)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-500 font-bold uppercase text-[10px]">GFA</span>
              <span className="font-black text-lg">{formatNum(overview?.gfa)} m2</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-500 font-bold uppercase text-[10px]">NFA</span>
              <span className="font-black text-lg">{formatNum(overview?.nfa)} m2</span>
            </div>
          </div>

          <div className="w-full h-[20px] rounded-full overflow-hidden flex mb-3 shadow-inner bg-gray-100">
            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${pctAvail}%` }}></div>
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${pctLeased}%` }}></div>
            <div className="h-full bg-yellow-400 transition-all duration-700" style={{ width: `${pctOther}%` }}></div>
          </div>
          
          <div className="flex justify-center gap-6 text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div>Available NFA</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div>Leased NFA</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>Other</div>
          </div>
        </div>

        {/* RIGHT: AMENITIES */}
        <div>
          <SectionTitle title="AMENITY" />
          <div className="flex justify-center mb-6 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Number of Amenities</span>
              <span className="font-black text-lg">{formatNum(amenity?.totalAmenities)}</span>
            </div>
          </div>

          <div className="w-full h-[20px] rounded-full overflow-hidden flex mb-3 shadow-inner bg-gray-100">
            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${pctAmenityAvail}%` }}></div>
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${pctAmenityOccupied}%` }}></div>
          </div>
          
          <div className="flex justify-center gap-6 text-[11px] font-bold text-gray-600 uppercase tracking-tighter">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div>Available</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div>Leased</div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};

// ==================================================
// 2. LEASE ALERTS & DONUT CHARTS
// ==================================================
const LeaseAlerts = ({ alerts, charts, onChartClick }) => {
  const renderDonut = (title, data) => (
    <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 h-[280px]">
      <h3 className="font-bold text-[11px] text-gray-600 uppercase tracking-wide mb-2 text-center">{title}</h3>
      <div className="flex-1 w-full relative">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={data} 
                innerRadius={55} 
                outerRadius={75} 
                dataKey="value" 
                stroke="none" 
                paddingAngle={2}
                className="cursor-pointer outline-none"
              >
                {data.map((entry, index) => {
                  let fillColor = CHART_COLORS[index % CHART_COLORS.length];
                  if (entry.name && entry.name.toLowerCase().includes('paid late')) fillColor = '#EF4444';
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={fillColor} 
                      onClick={() => onChartClick && onChartClick(title, entry)}
                      className="hover:opacity-80 transition-opacity cursor-pointer outline-none" 
                    />
                  );
                })}
              </Pie>
              <Tooltip formatter={(val) => formatNum(val)} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase">No Data</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mb-6">
      <SectionContainer>
        <SectionTitle title="LEASE ALERTS" />
        <div className="flex items-center justify-center gap-8 mb-2">
          <div className="bg-blue-900 text-white font-black px-6 py-2 rounded-full shadow-md text-sm tracking-widest">
            TOTAL: {formatNum(alerts?.totalLeases)} LEASES
          </div>
          <div className="flex gap-6 font-black text-gray-500 text-sm uppercase tracking-tight">
            <span>NEW LEASES: <span className="text-blue-600">{formatNum(alerts?.newLeases)}</span></span>
            <span className="text-gray-300">|</span>
            <span>LEASE END: <span className="text-red-500">{formatNum(alerts?.leaseEnd)}</span></span>
            <span className="text-gray-300">|</span>
            <span>EXTENDED: <span className="text-green-500">{formatNum(alerts?.extended)}</span></span>
          </div>
        </div>
      </SectionContainer>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderDonut("Price Adjustment", charts?.priceAdjustment)}
        {renderDonut("Contract Expiration", charts?.contractExpiration)}
        {renderDonut("Price Overdue Payment", charts?.overduePayment)}
      </div>
    </div>
  );
};

// ==================================================
// 3. CONTRACT REVENUE SECTION
// ==================================================
const ContractRevenueSection = ({ revenue }) => {
  return (
    <SectionContainer>
      <SectionTitle title="CONTRACT REVENUE & OCCUPANCY" />
      <KpiGrid kpi={revenue?.kpi} />
      
      {/* KHỐI PROGRESS BAR CỦA OCC VÀ REVENUE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-gray-50 p-6 rounded border border-gray-100 mb-8">
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4">Financial Progress</h4>
          <ProgressBar label="Plan Achievement" value={revenue?.kpi?.planAchievement} color="bg-orange-500" />
          <ProgressBar label="Forecast Achievement" value={revenue?.kpi?.forecastAchievement} color="bg-blue-500" />
          <ProgressBar label="YTD Achievement" value={revenue?.kpi?.ytdAchievement} color="bg-green-500" />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4">Space Utilization (OCC)</h4>
          <ProgressBar label="Actual OCC" value={revenue?.kpi?.actualOcc} color="bg-[#D68910]" />
          <ProgressBar label="Forecast OCC" value={revenue?.kpi?.forecastOcc} color="bg-[#F39C12]" />
        </div>
      </div>

      <div className="h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenue?.contract || []} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} />
            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} tickFormatter={(val) => formatCurrency(val)} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} />
            <Tooltip cursor={{ fill: '#F3F4F6' }} formatter={(val, name) => [name.includes('OCC') ? `${formatNum(val)}%` : `${formatNum(val)} VND`, name]} />
            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
            
            <Bar yAxisId="left" dataKey="actual" name="Actual Revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar yAxisId="left" dataKey="planned" name="Planned Revenue" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar yAxisId="left" dataKey="forecast" name="Forecast Revenue" fill="#93C5FD" radius={[4, 4, 0, 0]} maxBarSize={30} />
            
            <Line yAxisId="right" type="monotone" dataKey="plannedOcc" name="Planned OCC" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="forecastOcc" name="Forecast OCC" stroke="#06B6D4" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="actualOcc" name="Actual OCC" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionContainer>
  );
};

// ==================================================
// 4. SERVICE FEE REVENUE SECTION
// ==================================================
const ServiceFeeSection = ({ revenue }) => {
  return (
    <SectionContainer>
      <SectionTitle title="SERVICE FEE REVENUE" />
      <KpiGrid kpi={revenue?.kpi} />
      <div className="h-[350px] w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenue?.serviceFee || []} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip cursor={{ fill: '#F3F4F6' }} formatter={(val) => `${formatNum(val)} VND`} />
            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
            
            <Bar dataKey="actual" name="Actual Revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="planned" name="Planned Revenue" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="forecast" name="Forecast Revenue" fill="#93C5FD" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionContainer>
  );
};

// ==================================================
// 5. AMENITY REVENUE SECTION
// ==================================================
const AmenityRevenueSection = ({ revenue }) => {
  return (
    <SectionContainer>
      <SectionTitle title="AMENITY REVENUE" />
      <KpiGrid kpi={revenue?.kpi} />
      <div className="h-[350px] w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenue?.amenity || []} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }} tickFormatter={(val) => formatCurrency(val)} />
            <Tooltip cursor={{ fill: '#F3F4F6' }} formatter={(val) => `${formatNum(val)} VND`} />
            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
            
            <Bar dataKey="actual" name="Actual Revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={60} />
            <Bar dataKey="planned" name="Planned Revenue" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionContainer>
  );
};

// ==================================================
// MAIN EXPORT CONTAINER (LeaseDashboard)
// ==================================================
export default function LeaseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: new Date().toISOString().split("T")[0], // Mặc định là Sysdate
    division: "",
    siteId: "",
    buildingId: ""
  });

  const [chartDetailModal, setChartDetailModal] = useState({ isOpen: false, title: "", category: "", list: [] });

  const handleChartClick = (chartTitle, entry) => {
    const detailsList = entry.payload?.details || entry.details || [];
    setChartDetailModal({
      isOpen: true,
      title: chartTitle,
      category: entry.name,
      list: detailsList
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.keys(filters).forEach(key => { if (filters[key]) params[key] = filters[key]; });
      
      const res = await axiosInstance.get("/lease/dashboard", { params });
      setData(res.data);
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu Dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Màn hình Loading
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px]">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Loading Data...</div>
      </div>
    );
  }

  return (
    // THIẾT LẬP KÉO CUỘN (SCROLL) TẠI ĐÂY
    <div className="h-[calc(100vh-64px)] overflow-y-auto bg-[#f5f6fa] p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto pb-20"> 
        
        {/* FILTER BAR */}
        <div className="bg-white rounded-xl p-5 mb-8 shadow-sm flex flex-wrap gap-4 items-end justify-between border border-gray-100 sticky top-0 z-10">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">From Date</label>
              <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">To Date (Sysdate)</label>
              <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Site ID</label>
              <input type="text" name="siteId" placeholder="Filter by Site..." value={filters.siteId} onChange={handleFilterChange} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <button onClick={fetchData} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded font-bold uppercase shadow-sm transition-colors text-sm">
              Apply Filter
            </button>
          </div>
          <div className="hidden lg:block text-right">
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Lease Performance</h1>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Real-time Financial Data</span>
          </div>
        </div>

        {/* CÁC SECTION DỮ LIỆU */}
        <OverviewSection overview={data?.overview} amenity={data?.amenity} />
        <LeaseAlerts alerts={data?.leaseAlerts} charts={data?.charts} onChartClick={handleChartClick} />
        <ContractRevenueSection revenue={data?.revenue} />
        <ServiceFeeSection revenue={data?.revenue} />
        <AmenityRevenueSection revenue={data?.revenue} />

      </div>

      {/* MODAL CHI TIẾT LỚP 2 CHO CHART */}
      {chartDetailModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[800px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out] max-h-[85vh]">
            <div className="bg-[#EFB034] px-5 py-4 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[15px] font-bold uppercase tracking-wide text-white">
                  {chartDetailModal.title}
                </h2>
                <p className="text-xs text-white/90 font-medium mt-0.5">
                  Category: {chartDetailModal.category}
                </p>
              </div>
              <button onClick={() => setChartDetailModal({ isOpen: false, title: "", category: "", list: [] })} className="text-white hover:text-red-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-0 overflow-auto flex-1">
              {chartDetailModal.list && chartDetailModal.list.length > 0 ? (
                <table className="w-full text-left text-[12px] whitespace-nowrap">
                  <thead className="sticky top-0 bg-gray-100 shadow-sm border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-700 uppercase tracking-wide">ID</th>
                      <th className="px-4 py-3 font-bold text-gray-700 uppercase tracking-wide">Details / Name</th>
                      <th className="px-4 py-3 font-bold text-gray-700 uppercase tracking-wide text-right">Status / Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {chartDetailModal.list.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-blue-600">{item.id || item.lsId || item.code || `Item-${idx+1}`}</td>
                        <td className="px-4 py-2.5 text-gray-700">{item.name || item.description || item.partyName || item.title || "-"}</td>
                        <td className="px-4 py-2.5 text-gray-700 text-right font-medium">{item.status || item.value || item.amount || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                 <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium">Không có dữ liệu chi tiết cho mục này.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Backend cần trả về field <code className="bg-gray-100 px-1 rounded text-red-500">details</code> (dạng mảng) trong payload của Chart để hiển thị.</p>
                 </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end shrink-0">
              <button onClick={() => setChartDetailModal({ isOpen: false, title: "", category: "", list: [] })} className="px-5 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">
                Đóng (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}