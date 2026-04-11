import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../api/axiosInstance";

// ==========================================
// UI COMPONENTS
// ==========================================
const Input = ({ label, value, onChange, type = "text", required, disabled, placeholder }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled} 
      placeholder={placeholder} 
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100 disabled:text-gray-500 transition-colors" 
    />
  </div>
);

const Select = ({ label, value, onChange, options = [], disabled, required }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="font-bold text-[10px] text-gray-700 uppercase tracking-wide">{label} {required && <span className="text-red-500">*</span>}</label>
    <select 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled} 
      className="border border-gray-300 rounded px-3 py-1.5 text-[12px] outline-none focus:border-blue-500 bg-white shadow-sm w-full disabled:bg-gray-100 transition-colors cursor-pointer"
    >
      <option value="">-- Select --</option>
      {options.map((opt, idx) => <option key={idx} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Checkbox = ({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center gap-2 w-max mt-1 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
    <input 
      type="checkbox" 
      checked={checked || false} 
      onChange={e => !disabled && onChange(e.target.checked)} 
      disabled={disabled} 
      className={`w-3.5 h-3.5 rounded border-gray-300 ${disabled ? 'bg-gray-200' : 'text-blue-600 accent-blue-600'}`} 
    />
    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-700">{label}</span>
  </label>
);

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function RecurringCostTab({ lease }) {
  const leaseId = lease?.lsId; 
  const [costs, setCosts] = useState([]);
  const [vatCountries, setVatCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, mode: "ADD" });
  const [selectedIds, setSelectedIds] = useState([]);

  // ĐÃ SỬA: active mặc định là false
  const initialForm = {
    recurringCostId: "", description: "", costType: "", vatCountry: "", 
    dateMatchLs: false, overrideExchangeRate: false, overrideVatPercent: false, overrideVatAmount: false,
    active: false, // <-- Mặc định là False
    exchangeRateOverrideVal: "", vatPercentOverrideVal: "", vatAmountOverrideVal: "",
    startDate: "", endDate: "", period: "", interval: 1, 
    amountInBase: "", amountOutBase: ""
  };
  const [formData, setFormData] = useState(initialForm);

  const [computed, setComputed] = useState({
    systemVat: 0,
    amountInVat: 0, amountInTotal: 0,
    amountOutVat: 0, amountOutTotal: 0
  });

  const fetchData = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    try {
      const [costRes, vatRes] = await Promise.all([
        axiosInstance.get(`/lease/leases/${leaseId}/recurring-costs`),
        axiosInstance.get(`/cost/vat-countries`) 
      ]);
      setCosts(costRes.data || []);
      setVatCountries(vatRes.data || []);
    } catch (error) { 
      console.error("Error fetching data", error); 
    } finally { 
      setLoading(false); 
      setSelectedIds([]); 
    }
  }, [leaseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ==============================================================
  // LOGIC TỰ ĐỘNG TÍNH TOÁN VAT VÀ TOTAL
  // ==============================================================
  useEffect(() => {
    if (!modal.isOpen) return;

    const country = vatCountries.find(c => c.countryName === formData.vatCountry);
    const systemVatPercent = country ? (country.vatPercent || 0) : 0;

    const activeVatPercent = formData.overrideVatPercent 
      ? Number(formData.vatPercentOverrideVal || 0) 
      : systemVatPercent;

    const inBase = Number(formData.amountInBase || 0);
    const inVat = formData.overrideVatAmount 
      ? Number(formData.vatAmountOverrideVal || 0) 
      : (inBase * activeVatPercent / 100);
    const inTotal = inBase + inVat;

    const outBase = Number(formData.amountOutBase || 0);
    const outVat = formData.overrideVatAmount 
      ? Number(formData.vatAmountOverrideVal || 0) 
      : (outBase * activeVatPercent / 100);
    const outTotal = outBase + outVat;

    setComputed({
      systemVat: systemVatPercent,
      amountInVat: inVat, amountInTotal: inTotal,
      amountOutVat: outVat, amountOutTotal: outTotal
    });

  }, [formData, vatCountries, modal.isOpen]);


  // ==============================================================
  // XỬ LÝ DỮ LIỆU TRƯỚC KHI LƯU
  // ==============================================================
  const formatPayload = (dataObj) => {
    let payload = { ...dataObj };

    // 1. MAP AUTO-CALCULATED VALUES
    payload.amountInVat = computed.amountInVat;
    payload.amountInTotal = computed.amountInTotal;
    payload.amountOutVat = computed.amountOutVat;
    payload.amountOutTotal = computed.amountOutTotal;

    // 2. ÉP KIỂU SỐ (NUMBER) ĐỂ KHÔNG BỊ LỖI STRING CHUỖI RỖNG
    payload.amountInBase = Number(payload.amountInBase || 0);
    payload.amountOutBase = Number(payload.amountOutBase || 0);
    payload.interval = Number(payload.interval || 1);

    // 3. XỬ LÝ NGÀY THÁNG (Biến rỗng thành null)
    if (payload.startDate === "") payload.startDate = null;
    if (payload.endDate === "") payload.endDate = null;

    // 4. FIX LỖI ENUM: Ép chuỗi Period thành IN HOA (VD: "Month" -> "MONTH")
    if (payload.period) {
      payload.period = payload.period.toUpperCase();
    } else {
      payload.period = null;
    }

    // 5. MAP CÁC TRƯỜNG OVERRIDE CỦA GIAO DIỆN VỀ ĐÚNG TÊN CỘT BACKEND
    payload.exchangeRate = Number(payload.exchangeRateOverrideVal || 1);
    payload.currVat = Number(payload.vatAmountOverrideVal || 0); 
    
    // Gộp 2 ô tick VAT của giao diện thành 1 cột overrideVat của Backend
    payload.overrideVat = payload.overrideVatPercent || payload.overrideVatAmount;

    // 6. XÓA CÁC TRƯỜNG RÁC CỦA UI ĐỂ TRÁNH SPRING BOOT BÁO LỖI UNRECOGNIZED FIELD
    delete payload.exchangeRateOverrideVal;
    delete payload.vatPercentOverrideVal;
    delete payload.vatAmountOverrideVal;
    delete payload.overrideVatPercent;
    delete payload.overrideVatAmount;

    return payload;
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const payload = formatPayload(formData);

      if (modal.mode === "EDIT") {
        await axiosInstance.put(`/lease/leases/${leaseId}/recurring-costs/${payload.recurringCostId}`, payload);
      } else {
        await axiosInstance.post(`/lease/leases/${leaseId}/recurring-costs`, payload);
      }
      
      fetchData();
      setModal({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Lỗi lưu bản nháp!"); } 
    finally { setLoading(false); }
  };

  const handleSubmitRequest = async (actionType, dataObj) => {
    try {
      setLoading(true);
      const payloadToSave = formatPayload(dataObj);
      let targetId = payloadToSave.recurringCostId || payloadToSave.id; 

      if (actionType === "CREATE") {
        const res = await axiosInstance.post(`/lease/leases/${leaseId}/recurring-costs`, payloadToSave);
        targetId = res.data.recurringCostId || res.data.id; 
      }

      const requestPayload = {
        siteId: lease?.siteId || "Unknown",
        action: actionType, 
        requestType: "RECURRING_COST", 
        targetId: targetId,
        data: payloadToSave
      };

      await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      alert("Đã gửi Request duyệt thành công!");
      fetchData(); 
      setModal({ isOpen: false, mode: "ADD" });
    } catch (error) { alert("Lỗi gửi Request duyệt!"); } 
    finally { setLoading(false); }
  };

  const handleBulkSubmit = async () => {
    if (!window.confirm(`Bạn có chắc muốn gửi yêu cầu duyệt cho ${selectedIds.length} mục đã chọn?`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        const item = costs.find(c => c.recurringCostId === id);
        if (!item) continue;

        const requestPayload = {
          siteId: lease?.siteId || "Unknown",
          action: "UPDATE", 
          requestType: "RECURRING_COST", 
          targetId: item.recurringCostId,
          data: item
        };
        await axiosInstance.post("/lease/requests/submit-module", requestPayload);
      }
      alert("Đã gửi yêu cầu duyệt hàng loạt thành công!");
      setSelectedIds([]);
      fetchData();
    } catch (error) { alert("Có lỗi xảy ra khi gửi yêu cầu duyệt hàng loạt!"); } 
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa các mục đã chọn khỏi hệ thống?")) return;
    try {
      setLoading(true);
      for (const id of selectedIds) {
        await axiosInstance.delete(`/lease/leases/${leaseId}/recurring-costs/${id}`);
      }
      fetchData();
    } catch (error) { alert("Lỗi xóa dữ liệu"); } 
    finally { setLoading(false); }
  };

  const handleSelectAll = (e) => setSelectedIds(e.target.checked ? costs.map(c => c.recurringCostId) : []);
  const handleSelectRow = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => e.target.checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const isFormValid = formData.costType !== "";

  return (
    <div className="flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
      <div className="flex justify-between items-center gap-2 mb-3">
        <div className="flex gap-2">
          <button onClick={() => { setFormData(initialForm); setModal({ isOpen: true, mode: "ADD" }); }} className="bg-[#DE3B40] hover:bg-[#C11C22] text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">Add Cost</button>
          <button disabled={selectedIds.length === 0} onClick={handleDelete} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-red-50 text-[#DE3B40] border border-[#DE3B40]" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>Delete Selected</button>
        </div>
        <button onClick={handleBulkSubmit} disabled={selectedIds.length === 0} className={`px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors ${selectedIds.length > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>Submit Request for Selected</button>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm flex-1 bg-white relative">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-[#F39C12] text-white shadow-sm">
              <tr>
                <th className="w-10 px-3 py-2 text-center border-b border-[#D68910]"><input type="checkbox" onChange={handleSelectAll} checked={costs.length > 0 && selectedIds.length === costs.length} className="w-3.5 h-3.5 rounded cursor-pointer" /></th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Cost Type</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">VAT Country</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Income Total</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Expense Total</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910]">Period</th>
                <th className="px-4 py-2 font-semibold border-b border-[#D68910] text-center">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costs.map((c) => {
                const isSelected = selectedIds.includes(c.recurringCostId);
                return (
                  <tr key={c.recurringCostId} onDoubleClick={() => { setFormData(c); setModal({ isOpen: true, mode: "EDIT" }); }} className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-orange-50/50"}`}>
                    <td className="px-3 py-2 text-center border-r border-gray-50"><input type="checkbox" checked={isSelected} onChange={(e) => handleSelectRow(e, c.recurringCostId)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded cursor-pointer" /></td>
                    <td className="px-4 py-2 font-semibold text-blue-600 border-r border-gray-50">{c.costType}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{c.vatCountry || "-"}</td>
                    <td className="px-4 py-2 text-green-700 border-r border-gray-50 font-mono font-bold">{c.amountInTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2 text-red-700 border-r border-gray-50 font-mono font-bold">{c.amountOutTotal?.toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-700 border-r border-gray-50">{c.period || "-"}</td>
                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={c.active} readOnly className="w-3.5 h-3.5 rounded accent-blue-600" /></td>
                  </tr>
                );
              })}
              {costs.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500 font-medium">Chưa có dữ liệu Recurring Cost.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white w-[1100px] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#EFB034] px-5 py-3.5 flex justify-between items-center border-b border-[#D68910]">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-white">{modal.mode === "ADD" ? "Add Recurring Cost" : "Edit Recurring Cost"}</h2>
              <button onClick={() => setModal({ ...modal, isOpen: false })} className="text-white hover:text-red-100 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 bg-gray-50 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* ---------------- CỘT 1 ---------------- */}
                <div className="flex flex-col gap-4 bg-white p-4 rounded shadow-sm border border-gray-200">
                  <Input label="Recurring Cost ID" required value={formData.recurringCostId} onChange={v => setFormData({...formData, recurringCostId: v})} disabled={modal.mode === "EDIT"} placeholder={modal.mode === "ADD" ? "Auto-generated" : ""} />
                  
                  <Input label="Description" value={formData.description} onChange={v => setFormData({...formData, description: v})} />
                  
                  <Select label="Cost Type" required value={formData.costType} onChange={v => setFormData({...formData, costType: v})} 
                    options={[
                      {value: 'Early Termination', label: 'Early Termination'}, 
                      {value: 'Expansion', label: 'Expansion'}, 
                      {value: 'Extension', label: 'Extension'}, 
                      {value: 'Lease End', label: 'Lease End'}, 
                      {value: 'Increase Rent', label: 'Increase Rent'}
                    ]} 
                  />
                  
                  <Select label="VAT Country" value={formData.vatCountry} onChange={v => setFormData({...formData, vatCountry: v})} options={vatCountries.map(c => ({value: c.countryName, label: c.countryName}))} />
                  
                  <Input label="VAT (%)" value={computed.systemVat} disabled={true} placeholder="System Auto-filled" onChange={() => {}} />
                  
                  <Input type="number" label="Exchange Rate Override" value={formData.exchangeRateOverrideVal} onChange={v => setFormData({...formData, exchangeRateOverrideVal: v})} disabled={!formData.overrideExchangeRate} />
                  <Input type="number" label="VAT Percent Override (%)" value={formData.vatPercentOverrideVal} onChange={v => setFormData({...formData, vatPercentOverrideVal: v})} disabled={!formData.overrideVatPercent} />
                  <Input type="number" label="VAT Amount Override" value={formData.vatAmountOverrideVal} onChange={v => setFormData({...formData, vatAmountOverrideVal: v})} disabled={!formData.overrideVatAmount} />
                </div>

                {/* ---------------- CỘT 2 ---------------- */}
                <div className="flex flex-col gap-4 bg-white p-4 rounded shadow-sm border border-gray-200">
                  <Input type="date" label="Start Date" disabled={formData.dateMatchLs} value={formData.dateMatchLs ? lease?.startDate : formData.startDate} onChange={v => setFormData({...formData, startDate: v})} />
                  <Input type="date" label="End Date" disabled={formData.dateMatchLs} value={formData.dateMatchLs ? lease?.endDate : formData.endDate} onChange={v => setFormData({...formData, endDate: v})} />
                  
                  <div className="bg-gray-50 border border-gray-200 p-2 rounded -mt-2"><Checkbox label="Date match lease?" checked={formData.dateMatchLs} onChange={v => setFormData({...formData, dateMatchLs: v})} /></div>

                  <div className="border-t border-gray-200 pt-3 mt-1">
                    <h3 className="text-[11px] font-bold text-green-600 mb-2 uppercase">Income Flow</h3>
                    <Input type="number" label="Amount Income - Base" value={formData.amountInBase} onChange={v => setFormData({...formData, amountInBase: v})} />
                    <Input type="number" label="Amount Income - VAT" disabled={true} value={computed.amountInVat} onChange={() => {}} />
                    <Input type="number" label="Amount Income - Total" disabled={true} value={computed.amountInTotal} onChange={() => {}} />
                  </div>

                  <div className="border-t border-gray-200 pt-3 mt-1 flex flex-col gap-2">
                    <Checkbox label="Override Exchange Rate?" checked={formData.overrideExchangeRate} onChange={v => setFormData({...formData, overrideExchangeRate: v})} />
                    <Checkbox label="Override VAT Percent?" checked={formData.overrideVatPercent} onChange={v => setFormData({...formData, overrideVatPercent: v})} />
                    <Checkbox label="Override VAT Amount?" checked={formData.overrideVatAmount} onChange={v => setFormData({...formData, overrideVatAmount: v})} />
                  </div>
                </div>

                {/* ---------------- CỘT 3 ---------------- */}
                <div className="flex flex-col gap-4 bg-white p-4 rounded shadow-sm border border-gray-200">
                  <Select label="Period" value={formData.period} onChange={v => setFormData({...formData, period: v})} 
                    options={[
                      {value: 'Month', label: 'Month'}, 
                      {value: 'Quarter', label: 'Quarter'}, 
                      {value: 'Week', label: 'Week'}, 
                      {value: 'Year', label: 'Year'}
                    ]} 
                  />
                  
                  <Input type="number" label="Interval" value={formData.interval} onChange={v => setFormData({...formData, interval: v})} />
                  
                  <div className="bg-gray-50 border border-gray-200 p-2 rounded -mt-2 mb-2">
                    {/* ĐÃ SỬA: LUÔN KHÓA NÚT ACTIVE (CHỈ ĐƯỢC BẬT QUA APPROVE REQUEST) */}
                    <Checkbox label="Active Status (Auto via Approval)" checked={formData.active} disabled={true} onChange={() => {}} />
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex flex-col gap-4 h-full">
                    <h3 className="text-[11px] font-bold text-red-600 uppercase">Expense Flow</h3>
                    <Input type="number" label="Amount Expense - Base" value={formData.amountOutBase} onChange={v => setFormData({...formData, amountOutBase: v})} />
                    <Input type="number" label="Amount Expense - VAT" disabled={true} value={computed.amountOutVat} onChange={() => {}} />
                    <Input type="number" label="Amount Expense - Total" disabled={true} value={computed.amountOutTotal} onChange={() => {}} />
                  </div>
                </div>

              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex justify-end items-center mt-6 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button onClick={() => setModal({ ...modal, isOpen: false })} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded transition-colors">Cancel</button>
                  <button onClick={handleSaveDraft} disabled={!isFormValid} className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors">Save as Draft</button>
                  <button onClick={() => handleSubmitRequest(modal.mode === "ADD" ? "CREATE" : "UPDATE", formData)} disabled={!isFormValid} className="px-6 py-2 text-xs font-bold text-white bg-[#D68910] hover:bg-[#B9770E] disabled:opacity-50 shadow-sm transition-colors">
                    {modal.mode === "ADD" ? "Save & Submit Request" : "Update & Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}