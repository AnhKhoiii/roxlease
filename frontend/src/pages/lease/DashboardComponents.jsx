import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from "../../api/axiosInstance";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';

// ==================================================
// TIỆN ÍCH FORMAT SỐ LIỆU
// ==================================================
const formatNum = (num) => Number(num || 0).toLocaleString();
const formatCurrency = (num) => {
  if (!num) return "0";
  const inBillion = Number(num) / 1000000000;
  return inBillion >= 1 ? `${inBillion.toLocaleString(undefined, { maximumFractionDigits: 2 })}B` : Number(num).toLocaleString();
};

const CHART_COLORS = ['#EAB308', '#3B82F6', '#22C55E', '#EF4444', '#8B5CF6'];

const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const dummyRevenueData = months.map(m => ({ month: m, actual: Math.floor(Math.random() * 50) + 50, planned: Math.floor(Math.random() * 50) + 60, forecast: Math.floor(Math.random() * 50) + 55, actualOcc: Math.floor(Math.random() * 20) + 70, plannedOcc: Math.floor(Math.random() * 20) + 75, forecastOcc: Math.floor(Math.random() * 20) + 72 }));
const dummyServiceFeeData = months.map(m => ({ month: m, actual: Math.floor(Math.random() * 30) + 20, planned: Math.floor(Math.random() * 30) + 25, forecast: Math.floor(Math.random() * 30) + 22 }));
const dummyAmenityData = [ { category: 'Parking', actual: 80, planned: 85 }, { category: 'Billboard', actual: 40, planned: 45 }, { category: 'Pool', actual: 60, planned: 55 }, { category: 'Event Hall', actual: 90, planned: 100 }, { category: 'Other', actual: 30, planned: 30 } ];

// ==================================================
// REUSABLE COMPONENTS
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

const KpiCard = ({ label, value }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col justify-center">
    <span className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-tighter">{label}</span>
    <span className="text-xl font-bold text-gray-800 font-mono">{value}</span>
  </div>
);

const KpiGrid = ({ kpi }) => {
  if (!kpi) return null;
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Annual Plan" value={`${formatCurrency(kpi.annualPlan)} VND`} />
        <KpiCard label="Plan to Date" value={`${formatCurrency(kpi.planToDate)} VND`} />
        <KpiCard label="Actual to Date" value={`${formatCurrency(kpi.actualToDate)} VND`} />
        <KpiCard label="Annual Forecast" value={`${formatCurrency(kpi.annualForecast)} VND`} />
        <KpiCard label="Plan Achievement" value={`${formatNum(kpi.planAchievement)}%`} />
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
// I. OVERVIEW & AMENITY SECTION
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

          <div className="w-full h-[20px] rounded-full overflow-hidden flex mb-3 shadow-inner">
            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${pctAvail}%` }}></div>
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${pctLeased}%` }}></div>
            <div className="h-full bg-yellow-400 transition-all duration-700" style={{ width: `${pctOther}%` }}></div>
          </div>
          
          <div className="flex justify-center gap-6 text-xs font-bold text-gray-600 uppercase tracking-tighter">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div>Available NFA</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div>Leased NFA</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>Other</div>
          </div>
        </div>

        <div>
          <SectionTitle title="AMENITY" />
          <div className="flex justify-center mb-6 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-gray-500 font-bold uppercase text-[10px]">Number of Amenities</span>
              <span className="font-black text-lg">{formatNum(amenity?.totalAmenities)}</span>
            </div>
          </div>

          <div className="w-full h-[20px] rounded-full overflow-hidden flex mb-3 shadow-inner">
            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${pctAmenityAvail}%` }}></div>
            <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${pctAmenityOccupied}%` }}></div>
          </div>
          
          <div className="flex justify-center gap-6 text-xs font-bold text-gray-600 uppercase tracking-tighter">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div>Available</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div>Occupied</div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};

// ==================================================
// II. LEASE ALERTS
// ==================================================
const LeaseAlerts = ({ alerts, charts }) => {
  const renderDonut = (title, data) => (
    <div className="flex flex-col items-center">
      <h3 className="font-bold text-[11px] text-gray-600 uppercase tracking-wide mb-2">{title}</h3>
      <div className="h-[250px] w-full">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={80} dataKey="value" stroke="none" paddingAngle={2}>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(val) => formatNum(val)} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs font-bold text-gray-300 uppercase">No Data</div>
        )}
      </div>
    </div>
  );

  return (
    <SectionContainer>
      <SectionTitle title="LEASE ALERTS" />
      
      <div className="flex items-center justify-center gap-8 mb-8 border-b border-gray-100 pb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderDonut("Price Adjustment", charts?.priceAdjustment)}
        {renderDonut("Contract Expiration", charts?.contractExpiration)}
        {renderDonut("Price Overdue Payment", charts?.overduePayment)}
      </div>
    </SectionContainer>
  );
};

// ==================================================
// III. CONTRACT REVENUE & OCCUPANCY
// ==================================================
const ContractRevenueSection = ({ revenue }) => {
  return (
    <SectionContainer>
      <SectionTitle title="CONTRACT REVENUE & OCCUPANCY" />
      <KpiGrid kpi={revenue?.kpi} />
      <div className="h-[400px] w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dummyRevenueData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
            <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} label={{ value: 'Billion VND', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 11, fontWeight: 'bold' } }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} label={{ value: 'Percentage (%)', angle: 90, position: 'insideRight', offset: -10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 11, fontWeight: 'bold' } }} />
            <Tooltip cursor={{ fill: '#F3F4F6' }} />
            <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
            
            <Bar yAxisId="left" dataKey="actual" name="Actual Revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar yAxisId="left" dataKey="planned" name="Planned Revenue" fill="#1E3A8A" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar yAxisId="left" dataKey="forecast" name="Forecast Revenue" fill="#93C5FD" radius={[4, 4, 0, 0]} maxBarSize={40} />
            
            <Line yAxisId="right" type="monotone" dataKey="plannedOcc" name="Planned OCC" stroke="#1E3A8A" strokeWidth={3} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="forecastOcc" name="Forecast OCC" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="actualOcc" name="Actual OCC" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionContainer>
  );
};

// ==================================================
// IV. SERVICE FEE REVENUE
// ==================================================
const ServiceFeeSection = ({ revenue }) => {
  return (
    <SectionContainer>
      <SectionTitle title="SERVICE FEE REVENUE" />
      <KpiGrid kpi={revenue?.kpi} />
      <div className="h-[350px] w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dummyServiceFeeData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} label={{ value: 'Billion VND', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 11, fontWeight: 'bold' } }} />
            <Tooltip cursor={{ fill: '#F3F4F6' }} />
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
// V. AMENITY REVENUE
// ==================================================
const AmenityRevenueSection = ({ revenue }) => {
  return (
    <SectionContainer>
      <SectionTitle title="AMENITY REVENUE" />
      <KpiGrid kpi={revenue?.kpi} />
      <div className="h-[350px] w-full mt-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dummyAmenityData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 'bold' }} label={{ value: 'Billion VND', angle: -90, position: 'insideLeft', offset: -10, style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 11, fontWeight: 'bold' } }} />
            <Tooltip cursor={{ fill: '#F3F4F6' }} />
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
// MAIN EXPORT (DASHBOARD CONTAINER)
// ==================================================
export default function LeaseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: new Date().toISOString().split("T")[0],
    division: "",
    siteId: "",
    buildingId: ""
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.keys(filters).forEach(key => { if (filters[key]) params[key] = filters[key]; });
      const res = await axiosInstance.get("/lease/dashboard", { params });
      setData(res.data);
    } catch (e) {
      console.error(e);
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

  if (loading && !data) return <div className="p-8 text-center text-blue-600 font-bold uppercase tracking-widest animate-pulse">Loading Dashboard...</div>;

  return (
    // 🚀 ĐÃ THÊM: h-[calc(100vh-80px)] và overflow-y-auto ĐỂ BẬT THANH CUỘN CHO DASHBOARD
    <div className="h-[calc(100vh-60px)] overflow-y-auto bg-[#f5f6fa] p-4 md:p-8 font-sans">
      <div className="max-w-[1600px] mx-auto pb-20"> {/* pb-20 giúp khoảng trắng dưới cùng rộng hơn, cuộn dễ hơn */}
        
        {/* FILTER BAR */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-end justify-between">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">From Date</label>
              <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">To Date</label>
              <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Site ID</label>
              <input type="text" name="siteId" placeholder="Filter by Site..." value={filters.siteId} onChange={handleFilterChange} className="border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={fetchData} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded font-bold uppercase shadow-sm transition-colors text-sm">
              Apply Filter
            </button>
          </div>
        </div>

        <OverviewSection overview={data?.overview} amenity={data?.amenity} />
        <LeaseAlerts alerts={data?.leaseAlerts} charts={data?.charts} />
        <ContractRevenueSection revenue={data?.revenue} />
        <ServiceFeeSection revenue={data?.revenue} />
        <AmenityRevenueSection revenue={data?.revenue} />

      </div>
    </div>
  );
}