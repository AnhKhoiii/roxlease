import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useOutletContext } from "react-router-dom"; // IMPORT ĐỂ LẤY QUYỀN

export default function SpaceConsole() {
  // === LẤY QUYỀN TỪ LAYOUT ===
  const { currentUser } = useOutletContext();
  const canEdit = currentUser?.permissions?.includes('SPACE_LOCATION_EDIT');

  const [activeTab, setActiveTab] = useState("region");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [treeData, setTreeData] = useState({ regions: [], countries: [], cities: [] });
  const [selectedNode, setSelectedNode] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");

  const [formData, setFormData] = useState({
    regionId: "", regionName: "",
    countryId: "", countryName: "",
    cityId: "", cityName: "", timezone: ""
  });

  const fetchTreeData = async () => {
    try {
      const res = await axiosInstance.get('/space/locations/tree');
      setTreeData(res.data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error);
    }
  };

  useEffect(() => { fetchTreeData(); }, []);

  const handleSelectNode = (type, item) => {
    setActiveTab(type);
    setSelectedNode({ type, ...item });
    setNotification("");
    setShowAddMenu(false);
    
    if (type === 'region') setFormData({ ...formData, regionId: item.regionId, regionName: item.regionName });
    if (type === 'country') setFormData({ ...formData, countryId: item.countryId, countryName: item.countryName, regionId: item.regionId });
    if (type === 'city') setFormData({ ...formData, cityId: item.cityId, cityName: item.cityName, countryId: item.countryId, regionId: item.regionId, timezone: item.timezone || "" });
  };

  const handleAddNewClick = (type) => {
    if (!canEdit) return; // Không có quyền thì không được tạo mới
    setActiveTab(type);
    setSelectedNode(null); 
    setFormData({ regionId: "", regionName: "", countryId: "", countryName: "", cityId: "", cityName: "", timezone: "" });
    setShowAddMenu(false);
    setNotification("");
  };

  const handleSave = async (isSaveAndAdd = false) => {
    if (!canEdit) return;
    setLoading(true);
    setNotification("");
    try {
      let endpoint = '';
      let payload = {};
      const isEdit = selectedNode !== null;

      if (activeTab === 'region') {
        endpoint = isEdit ? `/space/locations/regions/${formData.regionId}` : '/space/locations/regions';
        payload = { regionId: formData.regionId, regionName: formData.regionName };
      } else if (activeTab === 'country') {
        endpoint = isEdit ? `/space/locations/countries/${formData.countryId}` : '/space/locations/countries';
        payload = { countryId: formData.countryId, countryName: formData.countryName, regionId: formData.regionId };
      } else {
        endpoint = isEdit ? `/space/locations/cities/${formData.cityId}` : '/space/locations/cities';
        payload = { cityId: formData.cityId, cityName: formData.cityName, countryId: formData.countryId, timezone: formData.timezone };
      }

      if (isEdit) {
        await axiosInstance.put(endpoint, payload);
      } else {
        await axiosInstance.post(endpoint, payload);
      }

      setNotification("Record updated successfully!");
      fetchTreeData();

      if (isSaveAndAdd) {
        handleAddNewClick(activeTab);
      } else {
        if (!isEdit) setSelectedNode({ type: activeTab, ...payload });
      }

    } catch (error) {
      setNotification(error.response?.data?.error || "Error occurred while saving data!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || !selectedNode) return;
    try {
      let endpoint = '';
      if (activeTab === 'region') endpoint = `/space/locations/regions/${selectedNode.regionId}`;
      if (activeTab === 'country') endpoint = `/space/locations/countries/${selectedNode.countryId}`;
      if (activeTab === 'city') endpoint = `/space/locations/cities/${selectedNode.cityId}`;

      await axiosInstance.delete(endpoint);
      setShowDeleteModal(false);
      handleAddNewClick(activeTab);
      fetchTreeData();
      setNotification("Record deleted successfully!");
    } catch (error) {
      setShowDeleteModal(false);
      setNotification("Error occurred while deleting data!");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans">
      <div className="bg-white p-4 border-b border-gray-200 flex gap-4 items-center shrink-0">
        <button className="bg-[#DE3B40] text-white px-5 py-2 rounded font-bold">Filter data</button>
        <input placeholder="Region" className="border px-3 py-2 rounded w-48 outline-none" />
        <input placeholder="Country" className="border px-3 py-2 rounded w-48 outline-none" />
        <input placeholder="City" className="border px-3 py-2 rounded w-48 outline-none" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ================= LOCATION TREE ================= */}
        <div className="w-[350px] bg-white border-r border-gray-200 p-5 overflow-y-auto shrink-0 z-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-gray-800 text-lg uppercase">Select location</h2>
            <div className="relative">
              <button 
                onClick={() => canEdit && setShowAddMenu(!showAddMenu)} 
                disabled={!canEdit}
                className={`px-4 py-1.5 rounded font-bold shadow-sm transition-colors ${
                  canEdit ? 'bg-[#EFB034] text-black hover:bg-yellow-500' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add new +
              </button>
              {showAddMenu && canEdit && (
                <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg w-40 z-50 py-1">
                  <div className="px-4 py-2 hover:bg-red-50 cursor-pointer font-semibold text-gray-700" onClick={() => handleAddNewClick("region")}>Region</div>
                  <div className="px-4 py-2 hover:bg-red-50 cursor-pointer font-semibold text-gray-700" onClick={() => handleAddNewClick("country")}>Country</div>
                  <div className="px-4 py-2 hover:bg-red-50 cursor-pointer font-semibold text-gray-700" onClick={() => handleAddNewClick("city")}>City</div>
                </div>
              )}
            </div>
          </div>

          <ul className="space-y-3 text-sm text-gray-700">
            {treeData.regions.map(region => (
              <li key={region.regionId} className="select-none">
                <span onClick={() => handleSelectNode('region', region)} className={`font-bold cursor-pointer hover:text-red-500 ${selectedNode?.regionId === region.regionId && selectedNode?.type === 'region' ? 'text-red-600' : ''}`}>
                   ▾ {region.regionId} - {region.regionName}
                </span>
                <ul className="ml-6 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                  {treeData.countries.filter(c => c.regionId === region.regionId).map(country => (
                    <li key={country.countryId}>
                      <span onClick={() => handleSelectNode('country', country)} className={`font-semibold cursor-pointer hover:text-red-500 ${selectedNode?.countryId === country.countryId && selectedNode?.type === 'country' ? 'text-red-600' : ''}`}>
                         ▾ {country.countryId} - {country.countryName}
                      </span>
                      <ul className="ml-6 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                        {treeData.cities.filter(ci => ci.countryId === country.countryId).map(city => (
                          <li key={city.cityId}>
                            <span onClick={() => handleSelectNode('city', city)} className={`cursor-pointer hover:text-red-500 ${selectedNode?.cityId === city.cityId && selectedNode?.type === 'city' ? 'text-red-600 font-bold' : ''}`}>
                               • {city.cityId} - {city.cityName}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="flex-1 bg-[#F8F9FA] p-8 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-4xl">
            
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button className={`px-8 py-4 font-bold text-sm uppercase transition-all ${activeTab === "region" ? "bg-white border-t-4 border-t-yellow-500 text-red-600" : "text-gray-500"}`} onClick={() => !selectedNode && setActiveTab("region")}>Region</button>
              <button className={`px-8 py-4 font-bold text-sm uppercase transition-all ${activeTab === "country" ? "bg-white border-t-4 border-t-yellow-500 text-red-600" : "text-gray-500"}`} onClick={() => !selectedNode && setActiveTab("country")}>Country</button>
              <button className={`px-8 py-4 font-bold text-sm uppercase transition-all ${activeTab === "city" ? "bg-white border-t-4 border-t-yellow-500 text-red-600" : "text-gray-500"}`} onClick={() => !selectedNode && setActiveTab("city")}>City</button>
            </div>

            <div className="p-8">
              {notification && <div className="mb-6 p-3 bg-blue-50 text-blue-700 rounded font-semibold border border-blue-200">{notification}</div>}

              {/* ACTION BUTTONS */}
              <div className="flex gap-4 mb-8">
                <button onClick={() => handleSave(false)} disabled={loading || !canEdit} className={`px-6 py-2 rounded font-bold shadow-sm transition-colors ${canEdit ? 'bg-[#DE3B40] text-white hover:bg-[#C11C22]' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  Save
                </button>
                {!selectedNode && (
                  <button onClick={() => handleSave(true)} disabled={loading || !canEdit} className={`px-6 py-2 rounded font-bold shadow-sm transition-colors ${canEdit ? 'bg-[#EFB034] text-black hover:bg-yellow-500' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                    Save and add new
                  </button>
                )}
                {selectedNode && (
                  <button onClick={() => setShowDeleteModal(true)} disabled={!canEdit} className={`px-6 py-2 rounded font-bold shadow-sm ml-auto transition-colors border ${canEdit ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>
                    Delete
                  </button>
                )}
              </div>

              {/* FORM CHO REGION */}
              {activeTab === "region" && (
                <div className="grid grid-cols-2 gap-8 max-w-2xl">
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Region ID <span className="text-red-500">*</span></label><input value={formData.regionId} onChange={e => setFormData({...formData, regionId: e.target.value})} disabled={selectedNode !== null || !canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: AMER" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Region name</label><input value={formData.regionName} onChange={e => setFormData({...formData, regionName: e.target.value})} disabled={!canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: Americas" /></div>
                </div>
              )}

              {/* FORM CHO COUNTRY */}
              {activeTab === "country" && (
                <div className="grid grid-cols-2 gap-8 max-w-2xl">
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Country ID <span className="text-red-500">*</span></label><input value={formData.countryId} onChange={e => setFormData({...formData, countryId: e.target.value})} disabled={selectedNode !== null || !canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: USA" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Country name</label><input value={formData.countryName} onChange={e => setFormData({...formData, countryName: e.target.value})} disabled={!canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: United States" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Region ID <span className="text-red-500">*</span></label>
                    <select value={formData.regionId} onChange={e => setFormData({...formData, regionId: e.target.value})} disabled={!canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500">
                      <option value="">-- Choose Region --</option>
                      {treeData.regions.map(r => <option key={r.regionId} value={r.regionId}>{r.regionId} - {r.regionName}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* FORM CHO CITY */}
              {activeTab === "city" && (
                <div className="grid grid-cols-2 gap-8 max-w-2xl">
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">City ID <span className="text-red-500">*</span></label><input value={formData.cityId} onChange={e => setFormData({...formData, cityId: e.target.value})} disabled={selectedNode !== null || !canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: NY" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">City name</label><input value={formData.cityName} onChange={e => setFormData({...formData, cityName: e.target.value})} disabled={!canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: New York" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Country ID <span className="text-red-500">*</span></label>
                    <select value={formData.countryId} disabled={!canEdit} onChange={e => {
                        const country = treeData.countries.find(c => c.countryId === e.target.value);
                        setFormData({...formData, countryId: e.target.value, regionId: country ? country.regionId : ""});
                      }} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500">
                      <option value="">-- Choose Country --</option>
                      {treeData.countries.map(c => <option key={c.countryId} value={c.countryId}>{c.countryId} - {c.countryName}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Region ID</label><input value={formData.regionId} disabled className="border border-gray-300 rounded w-full px-4 py-2 bg-gray-100 text-gray-500 font-bold cursor-not-allowed" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">Timezone</label><input value={formData.timezone} onChange={e => setFormData({...formData, timezone: e.target.value})} disabled={!canEdit} className="border border-gray-300 rounded w-full px-4 py-2 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="VD: GMT-5" /></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white p-8 rounded shadow-lg w-96 text-center">
            <div className="text-4xl text-yellow-500 mb-4">⚠</div>
            <p className="mb-6 text-lg font-bold text-gray-800">Are you sure you want to delete this record?</p>
            <div className="flex justify-center gap-4">
              <button className="bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded hover:bg-gray-300 transition-colors" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="bg-[#DE3B40] text-white font-bold px-6 py-2 rounded hover:bg-[#C11C22] transition-colors" onClick={handleDelete}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}