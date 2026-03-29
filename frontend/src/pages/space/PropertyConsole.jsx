import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useOutletContext } from "react-router-dom";
import PropertyModal from "../../components/space/PropertyModal";

const tabs = ["site", "building", "floor", "suite", "room"];

export default function PropertyConsole() {
  const { currentUser } = useOutletContext();
  const canEdit = currentUser?.permissions?.includes('SPACE_PROPERTY_EDIT');

  const [activeTab, setActiveTab] = useState("site");
  const [dataList, setDataList] = useState([]);
  
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]); 
  const [cities, setCities] = useState([]);
  
  const [childData, setChildData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("ADD");
  const [selectedDataForEdit, setSelectedDataForEdit] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `/space/properties/${activeTab}s`;
      const res = await axiosInstance.get(endpoint);
      setDataList(res.data);

      try {
        if (activeTab === 'site') {
          const cityRes = await axiosInstance.get('/space/locations/cities');
          setCities(cityRes.data || []);
          const childRes = await axiosInstance.get('/space/properties/buildings');
          setChildData(childRes.data || []);
        } else if (activeTab === 'building') {
          const childRes = await axiosInstance.get('/space/properties/floors');
          setChildData(childRes.data || []);
        } else if (activeTab === 'floor') {
          const childRes = await axiosInstance.get('/space/properties/rooms');
          setChildData(childRes.data || []);
        } else {
          setChildData([]); 
        }
      } catch (err) {
        console.warn("Không tải được dữ liệu con để đếm:", err);
        setChildData([]);
      }

      if (activeTab === 'building') {
        const siteRes = await axiosInstance.get('/space/properties/sites');
        setSites(siteRes.data);
      } else if (activeTab === 'floor') {
        const buildingRes = await axiosInstance.get('/space/properties/buildings');
        setBuildings(buildingRes.data);
      } else if (activeTab === 'suite' || activeTab === 'room') {
        const floorRes = await axiosInstance.get('/space/properties/floors');
        setFloors(floorRes.data);
      }
    } catch (error) {
      console.error("Loading failed", error);
      showToast('error', 'Cannot load data from the server!');
    } finally {
      setLoading(false);
      setSelectedRows([]);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const isReadOnlyTab = false; 
  
  const getIdField = () => {
    if (activeTab === 'building') return 'blId';
    if (activeTab === 'floor') return 'flId';
    if (activeTab === 'suite') return 'suiteId';
    if (activeTab === 'room') return 'roomId';
    return 'siteId'; 
  };

  const getChildCount = (item) => {
    if (!childData || childData.length === 0) return 0;
    if (activeTab === 'site') return childData.filter(b => b.siteId === item.siteId).length;
    if (activeTab === 'building') return childData.filter(f => f.blId === item.blId).length;
    if (activeTab === 'floor') return childData.filter(r => r.flId === item.flId).length;
    return 0;
  };

  const showToast = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000);
  };

  const handleOpenAdd = () => { setModalMode("ADD"); setSelectedDataForEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (item) => { if(isReadOnlyTab) return; setModalMode("EDIT"); setSelectedDataForEdit(item); setIsModalOpen(true); };

  const handleSaveModal = async (formData, isSaveAndAdd) => {
    try {
      const isEdit = modalMode === "EDIT";
      const endpoint = `/space/properties/${activeTab}s`;
      const idField = getIdField();

      const dxfFile = formData.dxfFile;
      delete formData.dxfFile; 

      if (isEdit) {
        await axiosInstance.put(`${endpoint}/${formData[idField]}`, formData);
      } else {
        await axiosInstance.post(endpoint, formData);
      }

      if (activeTab === 'floor' && dxfFile) {
        showToast('success', 'Floor saved! Auto-parsing DXF file...');
        const uploadData = new FormData();
        uploadData.append('file', dxfFile);
        
        await axiosInstance.post(`/floors/${formData.flId}/upload-dxf`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('success', 'Auto-parsed DXF and imported Rooms/Suites successfully!');
      } else {
        showToast('success', 'The record was saved successfully!');
      }

      setIsModalOpen(false);
      fetchData(); 
      if (isSaveAndAdd) setTimeout(() => handleOpenAdd(), 300); 

    } catch (error) {
      console.error(error);
      showToast('error', error.response?.data?.error || 'Please check the data fields or DXF file format!');
    }
  };

  const handleDeleteFromModal = () => {
    setIsModalOpen(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDataForEdit) return;
    try {
      const idField = getIdField();
      const endpoint = `/space/properties/${activeTab}s`;
      await axiosInstance.delete(`${endpoint}/${selectedDataForEdit[idField]}`);
      
      showToast('success', `Successfully deleted the record!`);
      setShowDeleteModal(false);
      fetchData(); 
    } catch (error) {
      showToast('error', error.response?.data?.error || 'Cannot delete in use item!');
      setShowDeleteModal(false);
    }
  };

  const renderHeader = () => {
    switch (activeTab) {
      case "site": return ["Number of Buildings", "Site ID", "Site Name", "City ID"];
      case "building": return ["Number of Floors", "Building ID", "Building Name", "Site ID", "Longitude", "Latitude", "Address"];
      case "floor": return ["Number of Rooms", "Floor ID", "Floor Name", "Building ID", "Site ID", "GFA (sqm)", "NFA (sqm)"];
      
      // ĐÃ SỬA: Tách riêng cột Code và Name
      case "suite": return ["Suite ID", "Suite Code", "Suite Name", "Area (sqm)", "Floor ID", "Building ID"];
      case "room": return ["Room ID", "Room Code", "Room Name", "Area (sqm)", "Floor ID", "Building ID"];
      default: return [];
    }
  };

  const headers = renderHeader();

  return (
    <div className="bg-gray-100 h-[calc(100vh-60px)] p-6 font-sans flex flex-col relative">
      
      {/* FILTER BAR */}
      <div className="bg-white shadow rounded-md p-6 mb-4 flex items-center gap-6 shrink-0">
        <button className="bg-red-500 hover:bg-red-600 transition-colors text-white px-6 py-2.5 rounded font-semibold text-[14px]">
          Filter data
        </button>
        {["Region", "Country", "City"].map((item) => (
          <div key={item} className="flex flex-col">
            <label className="font-semibold text-sm text-gray-700 mb-1.5">{item}</label>
            <input className="border border-yellow-400 rounded px-3 py-1.5 w-48 outline-none focus:ring-1 focus:ring-yellow-500 text-[14px]" placeholder={`Enter ${item}...`} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-md shadow flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-6 pt-4 border-b border-gray-200 shrink-0">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 font-bold uppercase text-[14px] rounded-t-md transition-colors 
                ${activeTab === tab ? "bg-red-50 text-red-600 border-b-2 border-red-500" : "text-gray-500 hover:bg-gray-50"}`}
              >
                {tab} {tab === 'suite' || tab === 'room' ? ' 🔒' : ''}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mb-2">
              <button onClick={handleOpenAdd} disabled={!canEdit} className={`px-5 py-2 rounded font-bold shadow-sm transition-colors text-[14px] ${canEdit ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                + Add new
              </button>
            <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2 rounded font-bold shadow-sm transition-colors text-[14px]">
              Export
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto relative">
          {loading && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 font-bold text-gray-600">
                  <svg className="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Loading...
                </div>
             </div>
          )}

          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-yellow-500 text-white sticky top-0 z-10 shadow-sm">
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx} className="px-6 py-4 text-[14px] font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white">
              {dataList.length === 0 && !loading ? (
                <tr><td colSpan={headers.length} className="p-12 text-center text-gray-400 font-semibold text-lg">No data available</td></tr>
              ) : (
                dataList.map((item, i) => {
                  
                  const parentBuilding = activeTab === 'floor' ? buildings.find(b => b.blId === item.blId) : null;
                  const siteIdForFloor = parentBuilding ? parentBuilding.siteId : '-';
                  const parentFloor = (activeTab === 'room' || activeTab === 'suite') ? floors.find(f => f.flId === item.flId) : null;
                  const buildingIdForRoomSuite = parentFloor ? parentFloor.blId : '-';

                  return (
                  <tr key={i} className={`border-b border-gray-100 transition-colors ${!isReadOnlyTab ? 'hover:bg-red-50 cursor-pointer' : 'hover:bg-gray-50'}`} onDoubleClick={() => handleOpenEdit(item)}>
                    
                    {activeTab === 'site' && (
                      <>
                        <td className="px-6 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded font-bold">{getChildCount(item)} Tòa nhà</span></td>
                        <td className="px-6 py-3 font-bold text-gray-800">{item.siteId}</td>
                        <td className="px-6 py-3 text-gray-600">{item.siteName}</td>
                        <td className="px-6 py-3 text-gray-600">{item.cityId}</td>
                      </>
                    )}

                    {activeTab === 'building' && (
                      <>
                        <td className="px-6 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded font-bold">{getChildCount(item)} Mặt sàn</span></td>
                        <td className="px-6 py-3 font-bold text-gray-800">{item.blId}</td>
                        <td className="px-6 py-3 text-gray-600">{item.blName}</td>
                        <td className="px-6 py-3 text-gray-600">{item.siteId}</td>
                        <td className="px-6 py-3 text-gray-600">{item.longitude || '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.lat || '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.address || '-'}</td>
                      </>
                    )}

                    {activeTab === 'floor' && (
                      <>
                        <td className="px-6 py-3"><span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded font-bold">{getChildCount(item)} Phòng</span></td>
                        <td className="px-6 py-3 font-bold text-gray-800">{item.flId}</td>
                        <td className="px-6 py-3 text-gray-600">{item.flName}</td>
                        <td className="px-6 py-3 text-gray-600">{item.blId}</td>
                        <td className="px-6 py-3 font-semibold text-blue-600">{siteIdForFloor}</td>
                        <td className="px-6 py-3 text-gray-600">{item.gfa || '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.nfa || '-'}</td>
                      </>
                    )}

                    {/* ĐÃ SỬA: Phân rõ Id (khóa chính), Code (Mã hiển thị), Name */}
                    {activeTab === 'suite' && (
                      <>
                        <td className="px-6 py-3 font-bold text-gray-800">{item.suiteId || '-'}</td>
                        <td className="px-6 py-3 font-semibold text-purple-600">{item.suiteCode || '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.suiteName || '-'}</td>
                        <td className="px-6 py-3 font-bold text-green-600">{item.area ? `${item.area} m²` : '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.flId || '-'}</td>
                        <td className="px-6 py-3 font-semibold text-blue-600">{buildingIdForRoomSuite}</td>
                      </>
                    )}

                    {activeTab === 'room' && (
                      <>
                        <td className="px-6 py-3 font-bold text-gray-800">{item.roomId || '-'}</td>
                        <td className="px-6 py-3 font-semibold text-purple-600">{item.roomCode || '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.roomName || '-'}</td>
                        <td className="px-6 py-3 font-bold text-green-600">{item.area ? `${item.area} m²` : '-'}</td>
                        <td className="px-6 py-3 text-gray-600">{item.flId || '-'}</td>
                        <td className="px-6 py-3 font-semibold text-blue-600">{buildingIdForRoomSuite}</td>
                      </>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnlyTab && (
        <PropertyModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveModal} 
          onDelete={handleDeleteFromModal}
          mode={modalMode} 
          initialData={selectedDataForEdit} 
          activeTab={activeTab} 
          canEdit={canEdit} 
          sites={sites} 
          buildings={buildings}
          cities={cities}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[150] backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[400px] text-center animate-[fadeIn_0.2s_ease-out]">
            <div className="text-5xl text-yellow-500 mb-4 flex justify-center">
               <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Deletion</h3>
            <p className="mb-8 text-gray-600">Are you sure you want to delete the record <strong className="text-red-500">{selectedDataForEdit?.[getIdField()]}</strong>? This action cannot be undone.</p>
            <div className="flex justify-center gap-4">
              <button className="flex-1 bg-gray-100 text-gray-700 font-bold px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="flex-1 bg-[#DE3B40] text-white font-bold px-4 py-2.5 rounded-lg hover:bg-[#C11C22] transition-colors shadow-sm" onClick={confirmDelete}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div className={`fixed bottom-8 right-8 z-[200] bg-white p-4 rounded-lg shadow-2xl flex items-center gap-4 border-l-4 animate-[slideInRight_0.3s_ease-out] ${notification.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
              {notification.type === 'success' ? '✓' : '!'}
           </div>
           <div className="flex flex-col pr-4">
              <span className="font-bold text-gray-800 text-[15px]">{notification.type === 'success' ? 'Success' : 'Error'}</span>
              <span className="text-sm text-gray-600 mt-0.5">{notification.message}</span>
           </div>
        </div>
      )}

    </div>
  );
}