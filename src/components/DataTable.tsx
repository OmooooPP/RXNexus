import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { Booking, formatDateToDMY } from '../types';
import { Search, Eye, CheckCircle, Clock, Trash, Edit, Check, Printer, FileText } from 'lucide-react';

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
    loading
  } = useApp();

  const t = i18n[language];

  // Selected classification tab: General vs Oncology
  const [activeTab, setActiveTab] = useState<'General' | 'Oncology'>('General');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    const belongsToTab = b.mode === activeTab;
    const matchesSearch =
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.hn.replace(/-/g, '').includes(searchQuery.replace(/-/g, '')) ||
      b.hn.includes(searchQuery);
    return belongsToTab && matchesSearch;
  });

  // Action validation based on User Roles
  const canVerifyAsPharmacist = currentUser?.role === 'Pharmacist' || currentUser?.role === 'Admin';
  const canVerifyAsClerk = currentUser?.role === 'Pharmacy Stock Clerk' || currentUser?.role === 'Admin';
  const canDeleteOrEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Pharmacist' || currentUser?.role === 'Nurse' || currentUser?.role === 'Doctor';

  return (
    <div className="space-y-6">
      {/* Search and Tabs line */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle tabs */}
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 max-w-sm">
          <button
            id="tab-general-btn"
            onClick={() => setActiveTab('General')}
            className={`flex-1 px-4 py-2 font-semibold text-xs rounded transition-all ${
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
            className={`flex-1 px-4 py-2 font-semibold text-xs rounded transition-all ${
              activeTab === 'Oncology'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.tabOncology}
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

      {/* Main Ledger Table */}
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
                    <tr key={b.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* ID and time */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          {b.id}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Booked: {formatDateToDMY(b.bookingDate)}
                        </span>
                      </td>

                      {/* Patient and Hospital ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {b.patientName}
                          </span>
                          {clerkVerifiedValueDone && (
                            <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[11px]" title="Physically Delivered to Ward">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center text-[10px] text-slate-400 mt-1">
                          <span className="font-mono bg-slate-100/90 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider whitespace-nowrap inline-block">HN: {b.hn}</span>
                          <span>•</span>
                          <span className="uppercase">{b.medications[0]?.priceType || 'OPD'}</span>
                          <span>•</span>
                          <span>{b.department}</span>
                        </div>
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
                          <div className="flex items-center justify-between text-[10px] p-1.5 rounded-lg border bg-white border-slate-250">
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
                          </div>

                          {/* Clerk validation status */}
                          <div className="flex items-center justify-between text-[10px] p-1.5 rounded-lg border bg-white border-slate-250">
                            <span className="text-slate-400 font-medium">Clerk / Stock:</span>
                            {clerkVerifiedValueDone ? (
                              <span className="text-green-600 font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> {t.accepted}
                              </span>
                            ) : (
                              <span className="text-amber-500 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-pulse" /> {t.notVerified}
                              </span>
                            )}
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
                              onClick={() => verifyPharmacist(b.id)}
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
                              className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                            >
                              Arrived
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
                                  onClick={() => {
                                    if (confirm('Verify deleting clinical reservation? This operation cannot be rolled back!')) {
                                      deleteBooking(b.id);
                                    }
                                  }}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete patient queue line"
                                >
                                  <Trash className="w-3.5 h-3.5" />
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

      {/* Embedded Prescription Preview Popup Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <h3 className="font-bold text-xs text-slate-700">Enterprise Prescription Media Attachment</h3>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold font-mono p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-900">
              <img
                src={selectedImage}
                alt="System Prescription Scan Viewer"
                className="max-h-[60vh] object-contain rounded-lg shadow-md border border-slate-800"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500">
              Sourced digitally under RxNexus Patient Privacy framework
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
