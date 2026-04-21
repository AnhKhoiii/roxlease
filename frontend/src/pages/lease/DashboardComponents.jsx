import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- TIỆN ÍCH FORMAT SỐ ---
const formatNum = (num) => Number(num || 0).toLocaleString();
const formatCurrency = (num) => Number(num || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const COLORS = ['#DE3B40', '#F39C12', '#3B82F6', '#10B981', '#8B5CF6'];

// ==========================================
// 1. OVERVIEW SECTION
// ==========================================
export const OverviewSection = ({ overview }) => {
  if (!overview) return null;
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-100 pb-2 mb-4">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Portfolio Overview</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard title="Total Sites" value={overview.totalSites} />
        <MetricCard title="GFA (sqm)" value={formatNum(overview.gfa)} color="text-blue-600" />
        <MetricCard title="NFA (sqm)" value={formatNum(overview.nfa)} color="text-blue-600" />
        <MetricCard title="Leased NFA" value={formatNum(overview.leasedNfa)} color="text-green-600" />
        <MetricCard title="Available NFA" value={formatNum(overview.availableNfa)} color="text-orange-500" />
        <MetricCard title="Other Area" value={formatNum(overview.otherArea)} color="text-gray-500" />
      </div>
    </div>
  );
};

// ==========================================
// 2. AMENITY SECTION
// ==========================================
export const AmenitySection = ({ amenity }) => {
  if (!amenity) return null;
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-100 pb-2 mb-4">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Amenities</h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
          <span className="text-xs font-bold text-gray-600 uppercase">Total Amenities</span>
          <span className="text-lg font-bold text-gray-800">{formatNum(amenity.totalAmenities)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-100">
          <span className="text-xs font-bold text-green-700 uppercase">Leased Amenities</span>
          <span className="text-lg font-bold text-green-700">{formatNum(amenity.leasedAmenities)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-100">
          <span className="text-xs font-bold text-orange-700 uppercase">Available Amenities</span>
          <span className="text-lg font-bold text-orange-700">{formatNum(amenity.availableAmenities)}</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. LEASE ALERTS
// ==========================================
export const LeaseAlerts = ({ alerts }) => {
  if (!alerts) return null;
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-100 pb-2 mb-4">
        <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">Lease Alerts</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <AlertCard title="Total Active Leases" value={alerts.totalLeases} bg="bg-blue-50" color="text-blue-700" />
        <AlertCard title="New Leases" value={alerts.newLeases} bg="bg-green-50" color="text-green-700" />
        <AlertCard title="Lease Ending Soon" value={alerts.leaseEnd} bg="bg-red-50" color="text-red-600" alert />
        <AlertCard title="Extended Leases" value={alerts.extended} bg="bg-orange-50" color="text-orange-600" />
      </div>
    </div>
  );
};

// ==========================================
// 4. CHARTS SECTION (DONUT CHARTS)
// ==========================================
export const ChartsSection = ({ charts }) => {
  if (!charts) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <DonutChartCard title="Price Adjustment Status" data={charts.priceAdjustment} />
      <DonutChartCard title="Contract Expiration" data={charts.contractExpiration} />
      <DonutChartCard title="Overdue Payments" data={charts.overduePayment} />
    </div>
  );
};

// ==========================================
// 5. REVENUE & OCC SECTION
// ==========================================
export const RevenueSection = ({ revenue }) => {
  if (!revenue || !revenue.kpi) return null;
  const kpi = revenue.kpi;

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-100 pb-2 mb-4 flex justify-between items-end">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Revenue & Occupancy KPIs</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Annual Plan" value={formatCurrency(kpi.annualPlan)} />
        <KpiCard title="Plan To Date (PTD)" value={formatCurrency(kpi.planToDate)} />
        <KpiCard title="Actual To Date (YTD)" value={formatCurrency(kpi.actualToDate)} color="text-green-600" />
        <KpiCard title="Annual Forecast" value={formatCurrency(kpi.annualForecast)} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-5 rounded border border-gray-100">
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Revenue Achievement</h3>
          <ProgressBar label="Plan Achievement" value={kpi.planAchievement} />
          <ProgressBar label="Forecast Achievement" value={kpi.forecastAchievement} color="bg-blue-500" />
          <ProgressBar label="YTD vs PTD" value={kpi.ytdAchievement} color="bg-green-500" />
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase">Occupancy Rate (OCC)</h3>
          <ProgressBar label="Actual OCC" value={kpi.actualOcc} color="bg-[#D68910]" />
          <ProgressBar label="Forecast OCC" value={kpi.forecastOcc} color="bg-[#F39C12]" />
        </div>
      </div>
    </div>
  );
};

// ==========================================
// THÀNH PHẦN GIAO DIỆN NHỎ (SUB-COMPONENTS)
// ==========================================

const MetricCard = ({ title, value, color = "text-gray-800" }) => (
  <div className="p-3 border border-gray-100 rounded bg-gray-50 flex flex-col justify-center">
    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">{title}</span>
    <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const AlertCard = ({ title, value, bg, color, alert }) => (
  <div className={`p-4 rounded border flex flex-col justify-center items-center text-center ${bg} border-opacity-50 relative overflow-hidden`}>
    {alert && <div className="absolute top-0 w-full h-1 bg-red-500 animate-pulse"></div>}
    <span className={`text-2xl font-bold mb-1 ${color}`}>{formatNum(value)}</span>
    <span className="text-[10px] font-bold text-gray-600 uppercase">{title}</span>
  </div>
);

const KpiCard = ({ title, value, color = "text-gray-800" }) => (
  <div className="p-4 border border-gray-200 rounded-lg flex flex-col shadow-sm">
    <span className="text-[10px] font-bold text-gray-500 uppercase mb-2">{title}</span>
    <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const ProgressBar = ({ label, value, color = "bg-green-500" }) => (
  <div>
    <div className="flex justify-between text-[11px] font-bold mb-1">
      <span className="text-gray-600">{label}</span>
      <span className={color.replace('bg-', 'text-')}>{value}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-1000`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
  </div>
);

const DonutChartCard = ({ title, data }) => {
  const hasData = data && data.length > 0;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col h-[300px]">
      <div className="border-b border-gray-100 pb-2 mb-2">
        <h2 className="text-[11px] font-bold text-gray-600 uppercase tracking-wide text-center">{title}</h2>
      </div>
      <div className="flex-1 w-full h-full relative">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => formatNum(value)} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: '600' }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 font-medium">No Data Available</div>
        )}
      </div>
    </div>
  );
};