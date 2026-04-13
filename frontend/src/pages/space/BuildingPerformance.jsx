import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";

const TableHeaderWithTooltip = ({ title, tooltipText, required }) => (
  <th className="px-4 py-3 font-semibold tracking-wide border-b border-[#D68910] group relative">
    <div className="flex items-center gap-1.5 cursor-help w-max">
      {title} {required && <span className="text-red-500">*</span>}
      <svg className="w-3.5 h-3.5 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 bg-gray-800 text-white text-[11px] font-normal rounded px-2.5 py-1.5 shadow-xl z-[100] whitespace-normal leading-tight">
      {tooltipText}
      <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800"></div>
    </div>
  </th>
);

export default function BuildingPerformance() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ siteId: "ALL", buildingId: "ALL" });
  const [data, setData] = useState({
    kpis: { usableToRentableRatio: 0, rentableToUsableRatio: 0, usableArea: 0, rentableArea: 0, totalInteriorArea: null, totalExteriorArea: null, leasedArea: 0, occupancyRate: 0 },
    chartData: [],
    suites: []
  });
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await axiosInstance.get("/space/properties/sites");
        setSites(Array.isArray(res.data) ? res.data : (res.data?.content || []));
      } catch (err) { console.error("Error loading sites", err); }
    };
    fetchSites();
  }, []);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (filters.siteId === "ALL") { setBuildings([]); return; }
      try {
        const res = await axiosInstance.get(`/space/properties/buildings?siteId=${filters.siteId}`);
        setBuildings(Array.isArray(res.data) ? res.data : (res.data?.content || []));
      } catch (err) { console.error("Error loading buildings", err); }
    };
    fetchBuildings();
  }, [filters.siteId]);

  const fetchPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/space/performance?siteId=${filters.siteId}&buildingId=${filters.buildingId}`);
      setData(res.data);
    } catch (error) { console.error("Error fetching performance data", error); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchPerformanceData(); }, [fetchPerformanceData]);

  return (
    <div className="p-6 bg-gray-50 h-full flex flex-col min-h-screen animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-end gap-4 mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Building Performance</h1>
          <p className="text-[11px] text-gray-500 mt-1">Analyze space utilization and occupancy metrics.</p>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex flex-col gap-1 w-52">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Site ID <span className="text-red-500">*</span></label>
            <select value={filters.siteId} onChange={e => setFilters({ siteId: e.target.value, buildingId: "ALL" })} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm cursor-pointer">
              <option value="ALL">ALL SITES</option>
              {sites.map((s, idx) => {
                const sId = s.siteId || s.id || s._id;
                const sName = s.siteName || s.name || "";
                return <option key={sId || idx} value={sId}>{sId} {sName ? `- ${sName}` : ''}</option>;
              })}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-52">
            <label className="text-[10px] font-bold text-gray-600 uppercase">Building ID <span className="text-red-500">*</span></label>
            <select value={filters.buildingId} onChange={e => setFilters({...filters, buildingId: e.target.value})} disabled={filters.siteId === "ALL"} className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer">
              <option value="ALL">ALL BUILDINGS</option>
              {buildings.map((b, idx) => {
                const bId = b.buildingId || b.id || b._id;
                const bName = b.blName || b.name || "";
                return <option key={bId || idx} value={bId}>{bId} {bName ? `- ${bName}` : ''}</option>;
              })}
            </select>
          </div>
          <button onClick={fetchPerformanceData} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-6 py-1.5 rounded text-xs font-bold shadow-sm transition-colors mb-[1px]">Filter Data</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F39C12]"></div>
          <h2 className="text-[13px] font-bold text-gray-800 uppercase border-b border-gray-100 pb-2">Space Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded border border-blue-100 flex flex-col items-center text-center">
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">Usable / Rentable</span>
              <span className="text-2xl font-bold text-blue-800 mt-0.5">{data.kpis.usableToRentableRatio?.toFixed(2)}</span>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-100 flex flex-col items-center text-center">
              <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wide">Rentable / Usable</span>
              <span className="text-2xl font-bold text-orange-800 mt-0.5">{data.kpis.rentableToUsableRatio?.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 mt-2">
            {[ {label: "Usable Area (m²)", val: data.kpis.usableArea}, {label: "Rentable Area (m²)", val: data.kpis.rentableArea}, {label: "Total Interior Area (m²)", val: data.kpis.totalInteriorArea, isInt: true}, {label: "Total Exterior Area (m²)", val: data.kpis.totalExteriorArea, isInt: true}, {label: "Leased Area (m²)", val: data.kpis.leasedArea, color: "text-green-600"} ].map((row, i) => (
              <div key={i} className="flex justify-between items-center text-[12px] border-b border-gray-100 pb-1">
                <span className="text-gray-600 font-semibold">{row.label}</span>
                <span className={`font-mono font-bold ${row.color || "text-gray-800"}`}>{row.val !== null ? row.val.toLocaleString() : "N/A"}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-[12px] bg-gray-800 text-white p-2.5 rounded shadow-inner mt-1">
              <span className="font-bold uppercase tracking-wide text-[10px]">Occupancy Rate</span>
              <span className="font-mono font-bold text-lg text-[#F39C12]">{data.kpis.occupancyRate?.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F39C12]"></div>
          <h2 className="text-[13px] font-bold text-gray-800 uppercase border-b border-gray-100 pb-2 mb-4">Performance Chart (by Building)</h2>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="buildingId" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="rentableArea" name="Rentable" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="usableArea" name="Usable" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                <Bar dataKey="leasedArea" name="Leased" fill="#10B981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden relative">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <TableHeaderWithTooltip title="Site ID" tooltipText="Site location ID." />
                <TableHeaderWithTooltip title="Building ID" tooltipText="Building within site." />
                <TableHeaderWithTooltip title="Floor ID" tooltipText="Floor reference (fl_id)." />
                <TableHeaderWithTooltip title="Suite Code" tooltipText="Unique suite code." />
                <TableHeaderWithTooltip title="Area (m²)" tooltipText="Total area." />
                <TableHeaderWithTooltip title="Occupied" tooltipText="Lease status." />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.suites.map((s, idx) => (
                <tr key={idx} className="hover:bg-orange-50/60 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-blue-600 border-r border-gray-50">{s.siteId}</td>
                  <td className="px-4 py-2.5 text-gray-700 border-r border-gray-50">{s.buildingId}</td>
                  <td className="px-4 py-2.5 text-gray-700 border-r border-gray-50">{s.floorId}</td>
                  <td className="px-4 py-2.5 font-bold text-gray-800 border-r border-gray-50">{s.suiteCode}</td>
                  <td className="px-4 py-2.5 text-gray-700 font-mono border-r border-gray-50">{s.area?.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-center"><input type="checkbox" checked={s.isLeased} readOnly className="w-4 h-4 rounded accent-green-600" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}