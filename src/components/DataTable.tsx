import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { Booking, formatDateToDMY } from '../types';
import { Search, Eye, CheckCircle, Clock, Trash, Edit, Check, Printer, FileText, ZoomIn, ZoomOut, RotateCcw, Maximize2, X } from 'lucide-react';

interface DataTableProps {
  onEditClick?: (id: string) => void;
  onPrintClick?: (booking: Booking) => void;
  initialSearchQuery?: string;
  onClearInitialSearch?: () => void;
}

export default function DataTable({ onEditClick, onPrintClick, initialSearchQuery, onClearInitialSearch }: DataTableProps) {
  const {
    currentUser,
    bookings,
    language,
    verifyPharmacist,
    verifyClerk,
    deleteBooking,
    updateBooking,
    loading,
    spawnAlert
  } = useApp();

  const t = i18n[language];

  // Selected classification tab: All vs General vs Oncology vs Hold
  const [activeTab, setActiveTab] = useState<'All' | 'General' | 'Oncology' | 'Hold'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageZoom, setSelectedImageZoom] = useState<number>(1);
  const [verifyImageZoom, setVerifyImageZoom] = useState<number>(1);

  // Clinical Hold and Date Rescheduling (Rollover) triggers
  const [holdingBooking, setHoldingBooking] = useState<Booking | null>(null);
  const [unholdingBooking, setUnholdingBooking] = useState<Booking | null>(null);
  const [rollingBooking, setRollingBooking] = useState<Booking | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  const [activeVerifyingBooking, setActiveVerifyingBooking] = useState<Booking | null>(null);
  const [verifyingLocation, setVerifyingLocation] = useState('');
  const [verifyingPharmacistName, setVerifyingPharmacistName] = useState('');

  const [holdReason, setHoldReason] = useState('');
  const [nurseName, setNurseName] = useState('');
  const [rolloverDate, setRolloverDate] = useState('');

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      const foundMatch = bookings.find((b) => {
        const hMatch = b.hn.replace(/-/g, '').includes(initialSearchQuery.replace(/-/g, '')) || b.hn.includes(initialSearchQuery);
        const nameMatch = b.patientName.toLowerCase().includes(initialSearchQuery.toLowerCase());
        return hMatch || nameMatch;
      });
      if (foundMatch) {
        setActiveTab(foundMatch.mode as 'General' | 'Oncology');
      }
    }
  }, [initialSearchQuery, bookings]);

  // Filter queues
  const filteredBookings = bookings.filter((b) => {
    const belongsToTab = activeTab === 'All' || b.mode === activeTab;
    const matchesSearch =
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hn.replace(/-/g, '').includes(searchQuery.replace(/-/g, '')) ||
      b.hn.includes(searchQuery);

    if (!belongsToTab || !matchesSearch) return false;

    // Check if within 5 days of use limit
    if (!b.dateOfUse) return true;
    try {
      const useDate = new Date(b.dateOfUse);
      useDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (useDate >= today) {
        return true;
      } else {
        const diffTime = today.getTime() - useDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 5;
      }
    } catch {
      return true;
    }
  });

  // Action validation based on User Roles
  const canVerifyAsPharmacist = currentUser?.role === 'Pharmacist' || currentUser?.role === 'Admin';
  const canVerifyAsClerk = currentUser?.role === 'Pharmacy Stock Clerk' || currentUser?.role === 'Admin';
  const canDeleteOrEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Pharmacist' || currentUser?.role === 'Nurse' || currentUser?.role === 'Doctor';
  const canHoldAndRollover = currentUser?.role === 'Nurse' || currentUser?.role === 'Doctor' || currentUser?.role === 'Admin';

  const heldBookings = bookings.filter((b) => {
    const isHeld = b.holdStatus?.isHeld === true;
    const matchesSearch =
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hn.replace(/-/g, '').includes(searchQuery.replace(/-/g, '')) ||
      b.hn.includes(searchQuery);
    return isHeld && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search and Tabs line */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle tabs */}
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 max-w-xl w-full md:w-auto overflow-x-auto gap-0.5">
          <button
            id="tab-all-btn"
            onClick={() => setActiveTab('All')}
            className={`flex-1 px-4 py-2 font-semibold text-xs rounded transition-all whitespace-nowrap ${
              activeTab === 'All'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabAll}
          </button>
          <button
            id="tab-general-btn"
            onClick={() => setActiveTab('General')}
            className={`flex-1 px-4 py-2 font-semibold text-xs rounded transition-all whitespace-nowrap ${
              activeTab === 'General'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabGeneral}
          </button>
          <button
            id="tab-oncology-btn"
            onClick={() => setActiveTab('Oncology')}
            className={`flex-1 px-4 py-2 font-semibold text-xs rounded transition-all whitespace-nowrap ${
              activeTab === 'Oncology'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabOncology}
          </button>
          <button
            id="tab-hold-btn"
            onClick={() => setActiveTab('Hold')}
            className={`flex-1 px-4 py-2 font-semibold text-xs rounded transition-all whitespace-nowrap ${
              activeTab === 'Hold'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'TH' ? 'รายการยา HOLD' : 'Held Medications'}
          </button>
        </div>

        {/* Live Search */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="table-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (!val && onClearInitialSearch) {
                onClearInitialSearch();
              }
            }}
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-full text-xs focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans"
          />
        </div>
      </div>

      {/* Clinically Held Medications Section - Visible under HOLD active tab */}
      {activeTab === 'Hold' ? (
        <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden animate-fade-in-rapid">
          <div className="p-4 bg-rose-50 border-b border-rose-150 flex justify-between items-center bg-amber-50 border-amber-100">
            <h3 className="font-bold text-xs text-amber-800 uppercase tracking-tight flex items-center gap-2 font-sans">
              <span className="text-sm">⏸️</span>
              <span>{language === 'TH' ? 'รายการยา HOLD (พักใช้ชั่วคราว)' : 'Held Medications List'} ({heldBookings.length})</span>
            </h3>
          <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded leading-none uppercase font-sans">
            {language === 'TH' ? 'ระบบเฝ้าระวังยา' : 'Clinical Watchlist'}
          </span>
        </div>

        {heldBookings.length === 0 ? (
          <div className="p-5 text-center text-slate-400 font-medium text-[11px] bg-slate-50/10">
            {language === 'TH' ? 'ไม่มีรายการยาที่ถูกระงับ (Hold) ในขณะนี้' : 'No clinical medication bookings on clinical hold.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-550 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                  <th className="p-3">ID</th>
                  <th className="p-3">{language === 'TH' ? 'คนไข้ / รหัส HN' : 'Patient / HN'}</th>
                  <th className="p-3">{language === 'TH' ? 'เหตุผลการ Hold' : 'Hold Reason'}</th>
                  <th className="p-3">{language === 'TH' ? 'พยาบาลผู้รับแจ้ง' : 'Notified Nurse'}</th>
                  <th className="p-3">{language === 'TH' ? 'วันที่ระงับ' : 'Hold Date'}</th>
                  {canHoldAndRollover && <th className="p-3 text-center">{language === 'TH' ? 'การจัดการ' : 'Action'}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heldBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/30">
                    <td className="p-3 font-semibold text-slate-600">{b.id}</td>
                    <td className="p-3 font-sans">
                      <span className="font-bold text-slate-800 block">{b.patientName}</span>
                      <span className="text-[9.5px] font-mono text-slate-400">HN: {b.hn}</span>
                    </td>
                    <td className="p-3 text-slate-700 bg-amber-50/20 max-w-xs truncate font-medium" title={b.holdStatus?.reason}>
                      {b.holdStatus?.reason || '-'}
                    </td>
                    <td className="p-3 font-bold text-slate-700">
                      👤 {b.holdStatus?.notifyingNurse || (b.holdStatus as any)?.notifiedNurse || '-'}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[10px]">
                      {(b.holdStatus?.heldAt || (b.holdStatus as any)?.timestamp) ? (b.holdStatus.heldAt || (b.holdStatus as any).timestamp).substring(0, 16).replace('T', ' ') : '-'}
                    </td>
                    {canHoldAndRollover && (
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setUnholdingBooking(b);
                            setHoldReason('');
                            setNurseName('');
                            setRolloverDate(b.dateOfUse || '');
                          }}
                          className="px-2.5 py-1 text-[10px] inline-flex items-center justify-center font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs transition-colors cursor-pointer"
                        >
                          Continue (Unhold)
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      ) : (
        /* Main Ledger Table - Visible when Hold active tab is NOT selected */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-700 font-sans uppercase tracking-tight">
            {t.tableTitle} ({filteredBookings.length})
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded font-mono">
            TRACEABILITY INDEX: 100% SECURE
          </span>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/20">
            <Clock className="w-10 h-10 text-slate-300 animate-pulse mb-3" />
            <p className="text-xs text-slate-400 font-medium">No pending or completed medication records found matching filters.</p>
            <p className="text-[10px] text-slate-300 mt-1">Ready to receive incoming clinical data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="p-4">{t.colBookingId}</th>
                  <th className="p-4">{t.colPatient}</th>
                  <th className="p-4">{t.colUseDate}</th>
                  <th className="p-4">{t.colMed}</th>
                  <th className="p-4">{t.colVerification}</th>
                  <th className="p-4 text-center">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => {
                  const clerkVerifiedValueDone = b.clerkVerification.status === 'Ready-to-use';
                  const phVerifiedValueDone = b.pharmacistVerification.status === 'Verified';

                  return (
                    <tr key={b.id} className={`hover:bg-slate-50/40 transition-all ${b.holdStatus?.isHeld ? 'bg-slate-100/70 opacity-75 border-l-4 border-l-amber-500 text-slate-400' : ''}`}>
                      {/* ID and time */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          {b.id}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {language === 'TH' ? 'วันที่จอง' : 'Booked'}: {formatDateToDMY(b.bookingDate)}
                        </span>
                      </td>

                      {/* Patient and Hospital ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-slate-800 text-sm ${b.holdStatus?.isHeld ? 'text-slate-500 line-through' : ''}`}>
                            {b.patientName}
                          </span>
                          {clerkVerifiedValueDone && (
                            <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[11px]" title="Physically Delivered to Ward">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center text-[10px] text-slate-400 mt-1 text-xs">
                          {currentUser?.role === 'Pharmacist' || currentUser?.role === 'Admin' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!phVerifiedValueDone) {
                                  setActiveVerifyingBooking(b);
                                  setVerifyingLocation(b.pharmacyLocation || '');
                                  setVerifyingPharmacistName(b.staff?.pharmacist || currentUser?.name || '');
                                } else {
                                  setSearchQuery(b.hn);
                                  navigator.clipboard.writeText(b.hn);
                                  spawnAlert(language === 'TH' ? `คัดลอก HN: ${b.hn} และกรองข้อมูลเรียบร้อยแล้ว` : `Copied HN: ${b.hn} and filtered table!`, 'success');
                                }
                              }}
                              className={`font-mono px-2 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                                !phVerifiedValueDone
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-750 animate-pulse'
                                  : 'bg-slate-100/90 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                              title={!phVerifiedValueDone ? (language === 'TH' ? "ด่วน: รอเภสัชกรตรวจสอบ คลิกเพื่อดำเนินการตรวจสอบทันที" : "Urgent: Awaiting pharmacist verification. Click to verify now!") : (language === 'TH' ? "คลิกเพื่อคัดลอก HN และกรองข้อมูลคนไข้" : "Click to copy HN and filter")}
                            >
                              {!phVerifiedValueDone && <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-ping shrink-0" />}
                              📋 HN: {b.hn} {!phVerifiedValueDone && (language === 'TH' ? ' (รอตรวจสอบ)' : ' (Awaiting Verify)')}
                            </button>
                          ) : (
                            <span className="font-mono bg-slate-100/90 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider whitespace-nowrap inline-block">HN: {b.hn}</span>
                          )}
                          <span>•</span>
                          <span className="uppercase">{b.medications[0]?.priceType || 'OPD'}</span>
                          <span>•</span>
                          <span>{b.department}</span>
                        </div>
                        {b.holdStatus?.isHeld && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap font-sans">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-250 uppercase leading-none shadow-3xs">
                              Hold: {b.holdStatus.reason} ({b.holdStatus.notifyingNurse || (b.holdStatus as any).notifiedNurse})
                            </span>
                          </div>
                        )}
                        {b.rolloverStatus && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap font-sans">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-black bg-purple-100 text-purple-800 border border-purple-250 uppercase leading-none shadow-3xs">
                              {language === 'TH' ? 'เปลี่ยนวันบริหารให้ยา' : 'Rescheduled Date'}: ดั้งเดิม {formatDateToDMY(b.rolloverStatus.originalDateOfUse || (b.rolloverStatus as any).originalDate)} ({b.rolloverStatus.reason} | {b.rolloverStatus.notifyingNurse || (b.rolloverStatus as any).notifiedNurse})
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Date of use */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {formatDateToDMY(b.dateOfUse)}
                        </span>
                        <p className="text-[10px] text-slate-400">Administration Date</p>
                      </td>

                      {/* Prescribed Items detail block */}
                      <td className="p-4 max-w-xs">
                        <div className="space-y-1">
                          {b.medications.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              <span className="font-medium truncate max-w-[150px]">{item.drugName}</span>
                              <span className="font-semibold text-slate-800">x{item.quantity}</span>
                            </div>
                          ))}
                          <div className="text-right text-[10px] font-bold text-blue-600">
                            Total: ฿{b.totalAmount.toLocaleString()}
                          </div>
                          {b.regimen && (
                            <div className="text-left mt-1.5 pt-1.5 border-t border-slate-150">
                              <span className="font-bold text-indigo-800 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-sm text-[9.5px] inline-block font-sans">
                                Regimen: <span className="font-medium text-indigo-950">{b.regimen}</span>
                              </span>
                            </div>
                          )}
                          {b.note && (
                            <div className="text-left mt-1.5 bg-slate-100/50 p-1.5 rounded border border-slate-200/50 text-[10.5px]">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Note:</span>
                              <span className="text-slate-650 font-medium break-words block whitespace-pre-wrap">{b.note}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Verification Workflows */}
                      <td className="p-4">
                        <div className="flex flex-col gap-2 max-w-[180px]">
                          {/* Pharmacist validation status */}
                          <div 
                            className="group relative flex items-center justify-between text-[10px] p-1.5 rounded-lg border bg-white border-slate-250 cursor-help"
                            title={
                              phVerifiedValueDone
                                ? `Verified By: ${b.pharmacistVerification.verifiedBy}\nTime: ${new Date(b.pharmacistVerification.verifiedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US')}`
                                : 'Pending pharmacist verification'
                            }
                          >
                            <span className="text-slate-400 font-medium">{t.valPharmacist}:</span>
                            {phVerifiedValueDone ? (
                              <span className="text-green-600 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {t.accepted}
                              </span>
                            ) : (
                              <span className="text-amber-500 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-pulse" /> {t.notVerified}
                              </span>
                            )}

                            {/* Custom visual tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs bg-slate-900/95 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-800 font-sans leading-relaxed">
                              {phVerifiedValueDone ? (
                                <div className="space-y-1">
                                  <p className="font-bold border-b border-white/10 pb-1 text-green-400 text-left">✓ Pharmacist Approved</p>
                                  <p className="text-left"><span className="text-slate-300">By:</span> {b.pharmacistVerification.verifiedBy}</p>
                                  <p className="text-left"><span className="text-slate-300">Time:</span> {b.pharmacistVerification.verifiedAt ? new Date(b.pharmacistVerification.verifiedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}</p>
                                </div>
                              ) : (
                                <p className="text-amber-400 font-medium text-left">Awaiting pharmacist validation</p>
                              )}
                              {/* Small triangle arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>

                          {/* Clerk validation status */}
                          <div 
                            className="group relative flex items-center justify-between text-[10px] p-1.5 rounded-lg border bg-white border-slate-250 cursor-help"
                            title={
                              clerkVerifiedValueDone
                                ? `Ordered By: ${b.clerkVerification.orderedBy || '-'}\nOrdered At: ${b.clerkVerification.orderedAt ? new Date(b.clerkVerification.orderedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}\nArrived By: ${b.clerkVerification.verifiedBy || '-'}\nArrived At: ${b.clerkVerification.verifiedAt ? new Date(b.clerkVerification.verifiedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}`
                                : b.clerkVerification?.status === 'Accepted'
                                ? `Ordered By: ${b.clerkVerification.orderedBy || '-'}\nOrdered At: ${b.clerkVerification.orderedAt ? new Date(b.clerkVerification.orderedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}\nAwaiting Delivery Arrival`
                                : 'Pending warehouse processing'
                            }
                          >
                            <span className="text-slate-400 font-medium">Clerk / Stock:</span>
                            {clerkVerifiedValueDone ? (
                              <span className="text-green-600 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {language === 'TH' ? 'ของ Arrived' : 'Arrived'}
                              </span>
                            ) : b.clerkVerification?.status === 'Accepted' ? (
                              <span className="text-indigo-600 font-bold flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3 text-indigo-500" /> {language === 'TH' ? 'สั่งซื้อแล้ว' : 'Ordered'}
                              </span>
                            ) : (
                              <span className="text-amber-500 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-pulse" /> {t.notVerified}
                              </span>
                            )}

                            {/* Custom visual tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max max-w-xs bg-slate-900/95 text-white text-[10px] p-2.5 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-slate-800 font-sans leading-relaxed">
                              {clerkVerifiedValueDone ? (
                                <div className="space-y-1 text-left">
                                  <p className="font-bold border-b border-white/10 pb-1 text-green-400">✓ Complete (Stock Arrived)</p>
                                  <p><span className="text-slate-300">1. Ordered By:</span> {b.clerkVerification.orderedBy || 'Staff'}</p>
                                  <p><span className="text-slate-300">At:</span> {b.clerkVerification.orderedAt ? new Date(b.clerkVerification.orderedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}</p>
                                  <p className="border-t border-white/5 my-1 pt-1"><span className="text-slate-300">2. Arrived By:</span> {b.clerkVerification.verifiedBy}</p>
                                  <p><span className="text-slate-300">At:</span> {b.clerkVerification.verifiedAt ? new Date(b.clerkVerification.verifiedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}</p>
                                </div>
                              ) : b.clerkVerification?.status === 'Accepted' ? (
                                <div className="space-y-1 text-left">
                                  <p className="font-bold border-b border-white/10 pb-1 text-indigo-400">⚡ Step 1: Order Sourced</p>
                                  <p><span className="text-slate-300">Ordered By:</span> {b.clerkVerification.orderedBy || 'Staff'}</p>
                                  <p><span className="text-slate-300">At:</span> {b.clerkVerification.orderedAt ? new Date(b.clerkVerification.orderedAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : '-'}</p>
                                  <p className="text-amber-400 font-medium pt-1">Awaiting physical delivery confirmation...</p>
                                </div>
                              ) : (
                                <p className="text-amber-400 font-medium text-left">Awaiting clerk/stock processing</p>
                              )}
                              {/* Small triangle arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95" />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Interactive Controls */}
                      <td className="p-4 text-center">
                        <div className="flex gap-2.5 justify-center items-center font-sans">
                          {/* Image preview modal launcher */}
                          {b.prescriptionImage ? (
                            <button
                              type="button"
                              onClick={() => setSelectedImage(b.prescriptionImage)}
                              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Preview prescription scan"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-medium font-mono">Rx</span>
                            </button>
                          ) : (
                            <span className="p-1 px-2 text-[10px] text-slate-300 bg-slate-50 rounded-lg cursor-not-allowed">
                              No Rx Image
                            </span>
                          )}

                          {/* Print PDF Action */}
                          {onPrintClick && (
                            <div className="flex flex-col gap-1 items-stretch">
                              <button
                                type="button"
                                id={`print-pdf-${b.id}`}
                                onClick={() => {
                                  updateBooking(b.id, { pdfPrinted: true });
                                  onPrintClick(b);
                                }}
                                className={`p-1.5 px-3.5 flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors overflow-hidden ${
                                  b.pdfPrinted 
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                                }`}
                                title="Print / Generate PDF Slip"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-500" />
                                <span>PDF</span>
                                {b.pdfPrinted && <CheckCircle className="w-3 h-3 text-blue-500" />}
                              </button>
                            </div>
                          )}

                          {/* Verify as pharmacist trigger */}
                          {canVerifyAsPharmacist && !phVerifiedValueDone && (
                            <button
                              id={`verify-pharmacist-${b.id}`}
                              type="button"
                              onClick={() => {
                                setActiveVerifyingBooking(b);
                                setVerifyingLocation(b.pharmacyLocation || '');
                                setVerifyingPharmacistName(b.staff?.pharmacist || currentUser?.name || '');
                              }}
                              disabled={loading}
                              className="p-1 px-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Verify Rx
                            </button>
                          )}

                          {/* Verify as clerk trigger */}
                          {canVerifyAsClerk && phVerifiedValueDone && !clerkVerifiedValueDone && (
                            <button
                              id={`verify-clerk-${b.id}`}
                              type="button"
                              onClick={() => verifyClerk(b.id)}
                              disabled={loading}
                              className={`p-1 px-2.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-xs text-white ${
                                b.clerkVerification?.status === 'Accepted'
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              {b.clerkVerification?.status === 'Accepted'
                                ? (language === 'TH' ? 'ยืนยันของ Arrived' : 'Confirm Arrived')
                                : (language === 'TH' ? 'รับ Order / สั่งซื้อ' : 'Receive & Order')
                              }
                            </button>
                          )}

                          {/* Staff modification tools */}
                          {canDeleteOrEdit && (
                            <div className="flex gap-1 items-center border-l border-slate-200 pl-2">
                              {onEditClick && (
                                <button
                                  type="button"
                                  onClick={() => onEditClick(b.id)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                  title="Edit reservation request"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {currentUser?.role === 'Admin' && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingBookingId(b.id)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete patient queue line"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Doctor & Nurse Clinical Hold + Rollover Option Choices */}
                          {canHoldAndRollover && (
                            <div className="flex gap-1.5 items-center border-l border-slate-200 pl-2 font-sans">
                              {!b.holdStatus?.isHeld ? (
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHoldingBooking(b);
                                      setHoldReason('');
                                      setNurseName('');
                                    }}
                                    className="p-1 px-1.5 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded text-[9.5px] font-black uppercase leading-none cursor-pointer"
                                    title="Hold medication queue"
                                  >
                                    Hold
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRollingBooking(b);
                                      setHoldReason('');
                                      setRolloverDate(b.dateOfUse);
                                      setNurseName('');
                                    }}
                                    className="p-1 px-1.5 border border-purple-250 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded text-[9.5px] font-black uppercase leading-none cursor-pointer"
                                    title="Change administration date"
                                  >
                                    {language === 'TH' ? 'เปลี่ยนวัน' : 'Rollover'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUnholdingBooking(b);
                                    setHoldReason('');
                                    setNurseName('');
                                    setRolloverDate(b.dateOfUse || '');
                                  }}
                                  className="p-1 px-1.5 border border-emerald-250 text-emerald-700 bg-emerald-55/70 hover:bg-emerald-100 rounded text-[9.5px] font-black uppercase leading-none cursor-pointer"
                                  title="Continue dispensing flow"
                                >
                                  Continue
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Embedded Prescription Preview Popup Modal with Zoom */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in" onClick={() => { setSelectedImage(null); setSelectedImageZoom(1); }}>
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <h3 className="font-bold text-xs text-slate-700">Enterprise Prescription Media Attachment</h3>
              
              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-bold text-blue-600 min-w-[40px] text-center text-[11px]">
                    {Math.round(selectedImageZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedImageZoom((prev) => Math.min(4, prev + 0.25))}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImageZoom(1)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title="Reset (100%)"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setSelectedImage(null); setSelectedImageZoom(1); }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 hover:bg-slate-100 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div 
              className="p-6 overflow-auto flex items-center justify-center bg-slate-900 min-h-[350px] relative"
              onWheel={(e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                  setSelectedImageZoom((prev) => Math.min(4, prev + 0.2));
                } else {
                  setSelectedImageZoom((prev) => Math.max(0.5, prev - 0.2));
                }
              }}
            >
              <img
                src={selectedImage}
                alt="System Prescription Scan Viewer"
                className="max-h-[65vh] object-contain rounded-lg shadow-md border border-slate-800 transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing"
                style={{ transform: `scale(${selectedImageZoom})` }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
              <span>Sourced digitally under RxNexus Patient Privacy framework</span>
              <span className="font-mono text-slate-400">{language === 'TH' ? 'ใช้ลูกกลิ้งเมาส์หรือปุ่มเพื่อย่อ-ขยาย' : 'Use mouse wheel or buttons to zoom'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Hold Medication Modal Popup */}
      {holdingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-amber-800 uppercase flex items-center gap-2">
              <span className="text-base">⚠️</span> {language === 'TH' ? 'Hold รายการยา' : 'Hold Medication'}
            </h3>
            <p className="text-[11.5px] text-slate-550 leading-normal">
              {language === 'TH' 
                ? `ระงับการสั่งและจ่ายยาชั่วคราวสำหรับคิวผู้ป่วย ${holdingBooking.patientName} (HN: ${holdingBooking.hn}) กรุณาระบุรายละเอียดและชื่อพยาบาล`
                : `Temporarily suspend medication dispensation for patient ${holdingBooking.patientName} (HN: ${holdingBooking.hn}).`
              }
            </p>
            
            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ระบุเหตุผลการ Hold *' : 'Hold Reason *'}
                </label>
                <input
                  type="text"
                  required
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder={language === 'TH' ? 'ระบุเหตุผล (เช่น อยู่ระหว่างปรึกษาแพทย์ปอด, ค่าเลือดต่ำ)' : 'dosage review, nurse advised, etc.'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ชื่อพยาบาลที่แจ้ง (ผู้รับแจ้งความประสงค์) *' : 'Notifying Nurse Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  placeholder={language === 'TH' ? 'พยาบาลผู้รับแจ้งความประสงค์' : 'Reporting nurse name'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setHoldingBooking(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!holdReason.trim() || !nurseName.trim()}
                onClick={() => {
                  updateBooking(holdingBooking.id, {
                    holdStatus: {
                      isHeld: true,
                      reason: holdReason,
                      notifiedNurse: nurseName,
                      timestamp: new Date().toISOString()
                    }
                  });
                  setHoldingBooking(null);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'TH' ? 'ระงับสั่งใช้ยา (Hold)' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Unhold / Resume Modal Popup */}
      {unholdingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-emerald-800 uppercase flex items-center gap-2">
              <span className="text-base">🔄</span> {language === 'TH' ? 'ดำเนินการให้ยาต่อ (Unhold)' : 'Continue (Unhold) Medication'}
            </h3>
            <p className="text-[11.5px] text-slate-550 leading-normal">
              {language === 'TH'
                ? `เริ่มดำเนินการจ่ายยาต่อตามปกติสำหรับผู้ป่วย ${unholdingBooking.patientName} (HN: ${unholdingBooking.hn})`
                : `Restore and continue clinical dispensation for ${unholdingBooking.patientName} (HN: ${unholdingBooking.hn}).`
              }
            </p>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ปรับเปลี่ยนวันที่บริหารให้ยา (เลือกวันที่ใหม่เพื่ออัปเดตปฏิทิน) *' : 'Reschedule Date of Use (select new date to update calendar) *'}
                </label>
                <input
                  type="date"
                  required
                  value={rolloverDate}
                  onChange={(e) => setRolloverDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ระบุเหตุผลในการคืนสถานะ (Unhold) *' : 'Unhold Reason *'}
                </label>
                <input
                  type="text"
                  required
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder={language === 'TH' ? 'เช่น ตรวจสอบแผนการรักษาเสร็จสิ้น, ผลเลือดปกติแล้ว' : 'postponement resolved, doctor approved, etc.'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ชื่อพยาบาลผู้รับแจ้งคืนสถานะ *' : 'Reporting Nurse Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  placeholder={language === 'TH' ? 'พยาบาลผู้แจ้ง / ผู้รับประสงค์' : 'Nurse name'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setUnholdingBooking(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!rolloverDate || !holdReason.trim() || !nurseName.trim()}
                onClick={() => {
                  updateBooking(unholdingBooking.id, {
                    dateOfUse: rolloverDate,
                    holdStatus: {
                      isHeld: false,
                      reason: unholdingBooking.holdStatus?.reason || '',
                      notifyingNurse: unholdingBooking.holdStatus?.notifyingNurse || '',
                      heldAt: unholdingBooking.holdStatus?.heldAt || new Date().toISOString(),
                      unholdReason: holdReason,
                      unholdNurse: nurseName,
                      unheldAt: new Date().toISOString()
                    }
                  });
                  setUnholdingBooking(null);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'TH' ? 'ยืนยันจ่ายต่อ' : 'Confirm Unhold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reschedule Date (Rollover) Modal Popup */}
      {rollingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-purple-800 uppercase flex items-center gap-2">
              <span className="text-base">📅</span> {language === 'TH' ? 'เปลี่ยนวันบริหารให้ยา / Rollover' : 'Rollover Medication Date'}
            </h3>
            <p className="text-[11.5px] text-slate-550 leading-normal">
              {language === 'TH'
                ? `เปลี่ยนวันบริหารการให้ยาจริงสำหรับคนไข้ ${rollingBooking.patientName} (HN: ${rollingBooking.hn})`
                : `Reschedule administration target date for ${rollingBooking.patientName} (HN: ${rollingBooking.hn}).`
              }
            </p>

            <div className="space-y-3 font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ระบุวันที่ต้องการจัดใช้ใหม่ *' : 'New Date of Use *'}
                </label>
                <input
                  type="date"
                  required
                  value={rolloverDate}
                  onChange={(e) => setRolloverDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ระบุสาเหตุการเปลี่ยนวันที่บริหารยา *' : 'Rollover Reason *'}
                </label>
                <input
                  type="text"
                  required
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder={language === 'TH' ? 'เช่น ผลข้างเคียงไข้สูงเลื่อนนัด, นัดจองทำแล็บเลื่อน, เกล็ดเลือดไม่ผ่านเกณฑ์' : 'Enter rollover triggers (e.g. platelets count post-dose low)'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-705 uppercase tracking-wide mb-1">
                  {language === 'TH' ? 'ชื่อพยาบาลผู้สังเกตการณ์แจ้งประสานงาน *' : 'Notifying Nurse Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  placeholder={language === 'TH' ? 'ชื่อพยาบาลผู้ประสานงาน' : 'Nurse coordinator name'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-purple-500/20 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRollingBooking(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!rolloverDate || !holdReason.trim() || !nurseName.trim()}
                onClick={() => {
                  updateBooking(rollingBooking.id, {
                    dateOfUse: rolloverDate,
                    pharmacistVerification: {
                      status: 'Pending',
                      verifiedBy: '',
                      timestamp: ''
                    },
                    rolloverStatus: {
                      originalDateOfUse: rollingBooking.dateOfUse,
                      newDateOfUse: rolloverDate,
                      reason: holdReason,
                      notifyingNurse: nurseName,
                      rolledOverAt: new Date().toISOString()
                    }
                  });
                  setRollingBooking(null);
                }}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'TH' ? 'ยืนยันเลื่อนนัดยา' : 'Confirm Rollover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Pharmacist Verification Modal */}
      {activeVerifyingBooking && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            
            {/* Left Side: Prescription Scan (Picture Left) */}
            <div className="flex-1 bg-slate-50 p-5 flex flex-col justify-between border-r border-slate-100 overflow-y-auto max-h-[45vh] md:max-h-none">
              <div className="mb-3 flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {language === 'TH' ? 'รูปภาพใบสั่งยาต้นฉบับ / PRESCRIPTION IMAGE' : 'PRESCRIPTION DOCUMENT SCAN'}
                </span>
                
                {activeVerifyingBooking.prescriptionImage && (
                  <div className="flex items-center gap-1.5">
                    {/* Zoom Bar */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-3xs">
                      <button
                        type="button"
                        onClick={() => setVerifyImageZoom((prev) => Math.max(0.5, prev - 0.25))}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-blue-600 min-w-[38px] text-center text-[10px]">
                        {Math.round(verifyImageZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setVerifyImageZoom((prev) => Math.min(4, prev + 0.25))}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors cursor-pointer"
                        title="Zoom In (+)"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerifyImageZoom(1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Reset (100%)"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[9px] bg-blue-50 text-blue-700 font-mono font-bold">
                      {activeVerifyingBooking.id}
                    </span>
                  </div>
                )}
              </div>
              
              <div 
                className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200/60 p-4 shadow-3xs min-h-[250px] overflow-auto relative"
                onWheel={(e) => {
                  if (activeVerifyingBooking.prescriptionImage) {
                    e.preventDefault();
                    if (e.deltaY < 0) {
                      setVerifyImageZoom((prev) => Math.min(4, prev + 0.2));
                    } else {
                      setVerifyImageZoom((prev) => Math.max(0.5, prev - 0.2));
                    }
                  }
                }}
              >
                {activeVerifyingBooking.prescriptionImage ? (
                  <img
                    src={activeVerifyingBooking.prescriptionImage}
                    alt="Prescription document"
                    className="max-h-[380px] w-auto object-contain rounded-lg transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing"
                    style={{ transform: `scale(${verifyImageZoom})` }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400 space-y-2">
                    <span className="text-4xl block">📋</span>
                    <p className="text-xs font-bold text-slate-500">
                      {language === 'TH' ? 'ไม่มีการอัปโหลดไฟล์สแกนใบสั่งยา' : 'No prescription scan uploaded'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {language === 'TH' ? 'ใช้ใบจองยาแบบดั้งเดิมในการประเมินความปลอดภัยคนไข้' : 'Verify order using clinical profile ledger instead'}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 text-center text-[10px] text-slate-400 font-mono">
                RxNexus Zero-Error Verification Engine
              </div>
            </div>

            {/* Right Side: Details and Setup Inputs (Details Right) */}
            <div className="flex-1 p-5 md:p-6 flex flex-col justify-between overflow-y-auto max-h-[45vh] md:max-h-none space-y-4">
              <div className="space-y-4">
                <div className="border-b border-slate-150 pb-3">
                  <h3 className="font-extrabold text-sm text-blue-900 uppercase flex items-center gap-2">
                    <span>🔬</span> {language === 'TH' ? 'ประเมินและตรวจสอบใบสั่งยา (Verify Rx)' : 'Clinical Prescription Verification'}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-1">
                    {language === 'TH' ? 'ทบทวนคำสั่งจองยา ตรวจสอบปริมาณ ขนาด และความถูกต้องของเวชภัณฑ์ยา' : 'Review reservation quantities, clinical targets and approve drug preparation.'}
                  </p>
                </div>

                {/* Patient Profile */}
                <div className="bg-slate-50/75 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">{language === 'TH' ? 'ข้อมูลคนไข้' : 'Patient Name'}</span>
                    <span className="font-bold text-slate-800 text-[13px]">{activeVerifyingBooking.patientName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">{language === 'TH' ? 'หมายเลข HN' : 'Hospital Number (HN)'}</span>
                    <span className="font-mono font-bold text-blue-700 text-[13px]">{activeVerifyingBooking.hn}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">{language === 'TH' ? 'วันที่สั่งใช้ยาจริง' : 'Date of Use'}</span>
                    <span className="font-semibold text-slate-700">{formatDateToDMY(activeVerifyingBooking.dateOfUse)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">{language === 'TH' ? 'แผนกที่สั่งใช้ยา' : 'Department'}</span>
                    <span className="font-semibold text-slate-700">{activeVerifyingBooking.department}</span>
                  </div>
                  {activeVerifyingBooking.regimen && (
                    <div className="col-span-2 border-t border-slate-200/50 pt-2 mt-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">{language === 'TH' ? 'สูตรยาจองการรักษา (Regimen)' : 'Treatment Regimen'}</span>
                      <span className="font-semibold text-purple-700 font-mono text-[11px]">{activeVerifyingBooking.regimen}</span>
                    </div>
                  )}
                </div>

                {/* Medications Table */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold tracking-wide text-slate-400 block">
                    {language === 'TH' ? 'รายการเวชภัณฑ์ยาที่สั่งสำรอง' : 'ORDERED MEDICINES'}
                  </span>
                  <div className="border border-slate-200/60 rounded-xl overflow-hidden shadow-3xs">
                    <table className="w-full text-left text-[11px] border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[9.5px] uppercase font-extrabold text-slate-500">
                          <th className="p-2.5">Medication Name</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {activeVerifyingBooking.medications.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/55">
                            <td className="p-2.5 font-bold text-slate-800">{m.drugName}</td>
                            <td className="p-2.5 text-center font-bold text-blue-600">{m.quantity}</td>
                            <td className="p-2.5 text-right font-semibold">฿{m.totalPrice.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Location & Reviewer input */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wide text-slate-400 mb-1">
                      {language === 'TH' ? 'ห้องยาจ่ายยาจ่ายจริง *' : 'Pharmacy Location *'}
                    </label>
                    <select
                      required
                      value={verifyingLocation}
                      onChange={(e) => setVerifyingLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    >
                      <option value="">-- Choose location --</option>
                      <option value="Phar IV">Phar IV</option>
                      <option value="Phar A1">Phar A1</option>
                      <option value="Phar E3">Phar E3</option>
                      <option value="Phar E6">Phar E6</option>
                      <option value="Phar D">Phar D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold tracking-wide text-slate-400 mb-1">
                      {language === 'TH' ? 'เภสัชกรผู้ตรวจสอบทบทวน *' : 'Pharmacist Reviewer *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={verifyingPharmacistName}
                      onChange={(e) => setVerifyingPharmacistName(e.target.value)}
                      placeholder="e.g. Sarah Connor (PharmD)"
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveVerifyingBooking(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  {language === 'TH' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
                <button
                  type="button"
                  disabled={loading || !verifyingLocation || !verifyingPharmacistName.trim()}
                  onClick={async () => {
                    const success = await verifyPharmacist(activeVerifyingBooking.id, verifyingLocation, verifyingPharmacistName);
                    if (success) {
                      setActiveVerifyingBooking(null);
                    }
                  }}
                  className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm hover:shadow-md active:scale-95 duration-150"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{language === 'TH' ? 'ทบทวนสำเร็จ (Verify complete)' : 'Verify Complete'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingBookingId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-scale-up">
            <div className="p-5 bg-red-50 border-b border-red-100/60 flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <Trash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-red-950 uppercase tracking-tight">
                  {language === 'TH' ? 'ยืนยันการลบรายการจองยา' : 'Confirm Clinical Delete'}
                </h3>
                <p className="text-[10px] text-red-600 font-medium mt-0.5">
                  ID: {deletingBookingId}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-rose-700 text-xs">
                {language === 'TH'
                  ? '⚠️ คำเตือน: การดำเนินการนี้ไม่สามารถย้อนกลับได้!'
                  : '⚠️ Warning: This action is permanent and cannot be undone!'}
              </p>
              <p>
                {language === 'TH'
                  ? 'การจองยาและข้อมูลผู้ป่วยของรายการนี้จะถูกลบออกจากฐานข้อมูล RxNexus ถาวรทันที ประวัติการอนุมัติและจัดเตรียมทั้งหมดจะสูญหาย'
                  : 'This reservation and all clinical associated data will be permanently purged from RxNexus servers. Verified histories and log references will remain archived.'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingBookingId(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
              >
                {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteBooking(deletingBookingId);
                  setDeletingBookingId(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md hover:shadow-lg active:scale-95 duration-150 cursor-pointer"
              >
                {language === 'TH' ? 'ยืนยันลบข้อมูลถาวร' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
