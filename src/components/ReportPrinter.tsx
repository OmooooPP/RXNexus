import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { Booking, formatDateToDMY } from '../types';
import { Printer, Calendar, FileText, Filter, CheckCircle, Eye, ArrowLeft, BookOpen } from 'lucide-react';

export default function ReportPrinter({ singleBooking }: { singleBooking?: Booking }) {
  const { bookings, language } = useApp();
  const t = i18n[language];

  // Parameters for advanced routing
  const [filterType, setFilterType] = useState<'useDate' | 'bookingDate'>('useDate');
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [drugClass, setDrugClass] = useState<'All' | 'General' | 'Oncology'>('All');
  const [hnQuery, setHnQuery] = useState<string>('');
  const [ignoreDate, setIgnoreDate] = useState<boolean>(false);
  
  // HTML Fully Printable View Mode
  const [isHtmlPrintActive, setIsHtmlPrintActive] = useState(false);

  // Load bookings that fit criteria
  const activeBookings = bookings.filter((b) => {
    // 1. Filter by specific category
    const matchesCategory = drugClass === 'All' ? true : b.mode === drugClass;

    // 2. Filter by date logic
    const dateToCheck = filterType === 'useDate' ? b.dateOfUse : b.bookingDate;
    const matchesDate = ignoreDate ? true : (dateToCheck === targetDate);

    // 3. Filter by HN query
    const matchesHn = hnQuery
      ? b.hn.replace(/-/g, '').toLowerCase().includes(hnQuery.replace(/-/g, '').toLowerCase())
      : true;

    return matchesCategory && matchesDate && matchesHn;
  });

  // Calculate aggregated medicine totals for warehouse delivery
  const aggregatedMeds: { [key: string]: { name: string; sku: string; qty: number; category: string } } = {};
  activeBookings.forEach((b) => {
    b.medications.forEach((m) => {
      if (aggregatedMeds[m.drugId]) {
        aggregatedMeds[m.drugId].qty += m.quantity;
      } else {
        aggregatedMeds[m.drugId] = {
          name: m.drugName,
          sku: m.stockCode,
          qty: m.quantity,
          category: b.mode
        };
      }
    });
  });

  const summaryList = Object.values(aggregatedMeds);

  // Trigger HTML system native print dialog
  const handlePrint = () => {
    window.print();
  };

  // RENDER FULLSCREEN PRINT VIEW
  if (isHtmlPrintActive) {
    const documentToRender = singleBooking ? [singleBooking] : activeBookings;

    return (
      <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto text-slate-900 font-sans p-4 sm:p-10">
        {/* Floating Print Control Banner */}
        <div className="max-w-4xl mx-auto mb-6 bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs print:hidden z-[10000]">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <p className="text-xs text-slate-700 font-bold uppercase tracking-wide">
              {language === 'TH' ? 'หน้าต่างตัวอย่างก่อนพิมพ์ HTML' : 'HTML Print-Optimized Workspace'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {language === 'TH' ? 'คลิกส่งพิมพ์ / บันทึก PDF' : 'Send Print / Save as PDF'}
            </button>
            <button
              onClick={() => setIsHtmlPrintActive(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'TH' ? 'กลับไประบบงาน' : 'Return to App'}
            </button>
          </div>
        </div>

        {/* Paper Container sheet */}
        <div id="printable-area" className="max-w-4xl mx-auto border border-slate-200 bg-white p-6 sm:p-12 text-slate-900 shadow-xs print:border-0 print:p-0">
          {/* Brand Letterhead Header */}
          <div className="text-center pb-6 border-b-2 border-slate-200">
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl text-slate-900 font-black tracking-tight leading-none uppercase">
                BANGKOK HOSPITAL
              </span>
              <span className="text-[10px] sm:text-xs tracking-[0.3em] font-extrabold text-[#003E80] mt-1.5 uppercase leading-none">
                PATTAYA
              </span>
            </div>
            
            <div className="mt-4">
              <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none">
                {singleBooking ? 'Patient Medication Sourcing Report Card' : 'Aggregate Sourcing Logistics Bill'}
              </h1>
              <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-mono">
                RXNexus Certification System
              </p>
            </div>
          </div>

          {singleBooking ? (
            /* PRINTING SINGLE BOOKING INTERACTIVE VIEW */
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Booking ID</p>
                  <p className="font-mono font-bold text-slate-900 text-sm">{singleBooking.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.bookingDate}</p>
                  <p className="font-bold text-slate-800 font-mono text-[11px]">{formatDateToDMY(singleBooking.bookingDate)}</p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.patientName}</p>
                  <p className="font-black text-slate-900 text-sm">{singleBooking.patientName}</p>
                  <p className="font-mono text-[11px] text-slate-500 mt-0.5">HN: {singleBooking.hn}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.dateOfUse}</p>
                  <p className="font-black text-slate-900 text-sm font-mono">{formatDateToDMY(singleBooking.dateOfUse)}</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-0.5">{singleBooking.department}</p>
                </div>
              </div>

              {/* Medicine Table lines */}
              <div className="mt-6 border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300 uppercase tracking-wider text-[9px]">
                      <th className="p-3">Generic/Brand Sourced Drug Item</th>
                      <th className="p-3">stock code</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Rate</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {singleBooking.medications.map((item, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="p-3 font-semibold text-slate-900">{item.drugName}</td>
                        <td className="p-3 font-mono text-slate-600">{item.stockCode}</td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">฿{item.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">฿{item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                      <td colSpan={4} className="p-3 text-right text-slate-500 text-[10px] tracking-wider uppercase font-extrabold">Total Amount Due:</td>
                      <td className="p-3 text-right text-blue-900 font-mono text-sm font-black">฿{singleBooking.totalAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Clinicians & status trace */}
              <div className="grid grid-cols-2 gap-4 mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-slate-400 text-[9px]">Authorized Sourcing MD / RN Officers</p>
                  <p>Prescribing MD: <span className="font-bold text-slate-800">{singleBooking.staff.doctor}</span></p>
                  <p>Req. Booking Nurse (RN): <span className="font-bold text-slate-800">{singleBooking.staff.nurse}</span></p>
                  <p>Coordination Pharmacist (RPh): <span className="font-bold text-slate-800">{singleBooking.staff.pharmacist || 'Wait for sign'}</span></p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="font-bold uppercase tracking-wider text-slate-400 text-[9px]">Database sync & dispatch ledger</p>
                  <p>Pharmacist Check: <span className="font-bold">{singleBooking.pharmacistVerification.status}</span></p>
                  <p>Stock Ready Status: <span className="font-bold">{singleBooking.clerkVerification.status}</span></p>
                </div>
              </div>

              {/* Attachment picture for proof */}
              {singleBooking.prescriptionImage && (
                <div className="mt-6 border border-slate-300 rounded-lg p-4 bg-slate-50/50 flex flex-col items-center justify-center space-y-2 page-break-inside-avoid">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sourced Rx Media Audit Record</p>
                  <div className="w-80 h-48 border border-slate-200 rounded bg-white flex items-center justify-center overflow-hidden">
                    <img
                      src={singleBooking.prescriptionImage}
                      alt="Prescription Sourced Record Slip"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              {/* Action signatures block */}
              <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-slate-300 text-center text-xs text-slate-500">
                <div className="space-y-6">
                  <div className="border-b border-slate-300 w-44 mx-auto h-6"></div>
                  <p className="uppercase text-[9px] font-bold text-slate-400 tracking-wider">Requested By (Nurse)</p>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-300 w-44 mx-auto h-6 flex items-end justify-center">
                    {singleBooking.pharmacistVerification.status === 'Verified' && (
                      <span className="font-bold text-blue-800 text-xs text-center">
                        {singleBooking.pharmacistVerification.verifiedBy}
                      </span>
                    )}
                  </div>
                  <p className="uppercase text-[9px] font-bold text-slate-400 tracking-wider">Validated By (Pharmacist)</p>
                </div>
              </div>
            </div>
          ) : (
            /* PRINTING BULK WAREHOUSE REPORT LIST */
            <div className="mt-6 space-y-6">
              {/* Aggregated Inventory summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-2">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                  Aggregate Warehouse Sourcing Totals
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total inventory dispatch requested for reservation profile (Profile Date: {formatDateToDMY(targetDate)})
                </p>

                <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-slate-300 overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[9px] border-b border-slate-300">
                      <th className="p-3">Generic / Medicine Trade Name</th>
                      <th className="p-3">stock code</th>
                      <th className="p-3">Class</th>
                      <th className="p-3 text-right">Unified Sourcing Demand (Qty)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                    {summaryList.map((item, index) => (
                      <tr key={index} className="bg-white">
                        <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="p-3 font-mono text-slate-600">{item.sku}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            item.category === 'Oncology' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-blue-800 text-sm font-mono">{item.qty} units</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Individual Patient Allocations lists */}
              <div className="space-y-6 pt-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest pl-2 border-l-2 border-slate-300">
                  Staggered Individual Patient Allocation Details ({activeBookings.length} Allocated Patients)
                </h4>
                
                <div className="space-y-6">
                  {activeBookings.map((b) => (
                    <div key={b.id} className="p-5 border border-slate-300 bg-white rounded-xl space-y-4 page-break-inside-avoid text-xs">
                      <div className="flex justify-between border-b border-slate-200 pb-2">
                        <div>
                          <span className="font-mono text-[9px] font-bold text-slate-400 uppercase">Patient Queue ID: {b.id}</span>
                          <h4 className="font-extrabold text-sm text-slate-900 mt-0.5">{b.patientName} (HN: {b.hn})</h4>
                        </div>
                        <div className="text-right text-[10px] text-slate-400">
                          <p>Department: <span className="font-bold text-slate-800">{b.department}</span></p>
                          <p>Use Date: <span className="font-bold text-slate-800 font-mono text-[11px]">{formatDateToDMY(b.dateOfUse)}</span></p>
                        </div>
                      </div>

                      {/* Med lists */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reserved Medicinal Agents</p>
                        {b.medications.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs bg-slate-50 border border-slate-200 p-2 rounded font-medium">
                            <span className="text-slate-800">{item.drugName} (stock code: {item.stockCode})</span>
                            <span className="font-bold text-slate-900 text-sm">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Image evidence */}
                      {b.prescriptionImage && (
                        <div className="p-3 bg-slate-50 rounded bg-white flex flex-col items-center justify-center shadow-xs inline-block max-w-sm border border-slate-200">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sourced Rx Media Audit Record</p>
                          <img
                            src={b.prescriptionImage}
                            alt="embedded clinical prescription scan"
                            className="max-h-36 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                        <div>• Physician In Charge: <span className="font-semibold text-slate-600">{b.staff.doctor}</span></div>
                        <div>• Registrant Nurse: <span className="font-semibold text-slate-600">{b.staff.nurse}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-[9px] text-slate-400 mt-12 font-mono uppercase tracking-widest">
            Print generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} • Verified by {singleBooking ? 'RPh Lead' : 'Logistics Manager'}
          </div>
        </div>
      </div>
    );
  }

  // STANDARD IN-APP VIEW DESIGN WITH FLOATING OPEN FULLSCREEN BUTTON
  if (singleBooking) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-400" />
            {t.medicationBookReport}
          </span>
          <button
            id="print-single-slip-btn"
            onClick={() => setIsHtmlPrintActive(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            {language === 'TH' ? 'เปิดพิมพ์หน้าเว็บ HTML / PDF' : 'Open HTML Print & PDF'}
          </button>
        </div>

        {/* Informative Preview Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs font-sans">
          <div className="border-b-2 border-slate-100 pb-4 text-center">
            <h1 className="text-base font-black text-slate-800 uppercase">BANGKOK HOSPITAL PATTAYA</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">RXNexus Prescription Sourcing Preview</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-slate-600">
            <div>
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Booking ID</p>
              <p className="font-bold text-slate-800 font-mono text-sm">{singleBooking.id}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.bookingDate}</p>
              <p className="font-semibold text-slate-700 font-mono text-[11px]">{formatDateToDMY(singleBooking.bookingDate)}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.patientName}</p>
              <p className="font-bold text-slate-800">{singleBooking.patientName}</p>
              <p className="font-mono text-[10px] text-slate-400">HN: {singleBooking.hn}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.dateOfUse}</p>
              <p className="font-bold text-slate-800 font-mono text-[11px]">{formatDateToDMY(singleBooking.dateOfUse)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{singleBooking.department}</p>
            </div>
          </div>

          {/* Med list */}
          <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Medicine Description</th>
                  <th className="p-3">stock code</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {singleBooking.medications.map((item, idx) => (
                  <tr key={idx} className="font-medium text-slate-600 hover:bg-slate-50/20">
                    <td className="p-3 font-semibold text-slate-800">{item.drugName}</td>
                    <td className="p-3 font-mono font-bold text-slate-500">{item.stockCode}</td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">฿{item.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-slate-800 font-mono">฿{item.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/65 font-bold text-slate-800">
                  <td colSpan={4} className="p-3 text-right text-slate-500 tracking-wider">TOTAL AMOUNT DUE:</td>
                  <td className="p-3 text-right text-blue-800 font-mono text-sm font-bold">฿{singleBooking.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification labels */}
          <div className="grid grid-cols-2 gap-4 mt-6 p-4 rounded-lg border border-slate-100 bg-slate-50/60 text-[10px] text-slate-500">
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Sourcing MD / RN Officers</p>
              <p>• MD: <span className="font-semibold text-slate-700">{singleBooking.staff.doctor}</span></p>
              <p>• RN: <span className="font-semibold text-slate-700">{singleBooking.staff.nurse}</span></p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Ledger Sync status</p>
              <p>Pharmacist Verification: <span className="font-semibold text-slate-700">{singleBooking.pharmacistVerification.status}</span></p>
              <p>Clerk Dispatch Check: <span className="font-semibold text-slate-700">{singleBooking.clerkVerification.status}</span></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List summary bulk sourcing reporting page
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            {t.reportsTitle}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{t.reportsDashboard}</p>
        </div>

        {activeBookings.length > 0 && (
          <button
            id="print-bulk-report-btn"
            onClick={() => setIsHtmlPrintActive(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {language === 'TH' ? 'เปิดพิมพ์หน้าเว็บ HTML / PDF' : 'Open HTML Print & PDF'}
          </button>
        )}
      </div>

      {/* Grid Settings Filter Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div>
          <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px] tracking-wider">{t.modeSelect}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('useDate')}
              className={`flex-1 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider border transition-colors ${
                filterType === 'useDate' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Date of Use
            </button>
            <button
              onClick={() => setFilterType('bookingDate')}
              className={`flex-1 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider border transition-colors ${
                filterType === 'bookingDate' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Booking Date
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px] tracking-wider">Select Target Date</label>
          <input
            id="report-target-date-input"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            disabled={ignoreDate}
            className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-hidden"
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              id="report-ignore-date-checkbox"
              type="checkbox"
              checked={ignoreDate}
              onChange={(e) => setIgnoreDate(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
            />
            <label htmlFor="report-ignore-date-checkbox" className="text-[10px] text-slate-400 font-semibold select-none cursor-pointer">
              {language === 'TH' ? 'ทุกช่วงเวลา' : 'All time'}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px] tracking-wider">{t.reportsType}</label>
          <select
            id="report-drug-class-select"
            value={drugClass}
            onChange={(e) => setDrugClass(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-hidden"
          >
            <option value="All">{t.reportsAll}</option>
            <option value="General">{t.tabGeneral}</option>
            <option value="Oncology">{t.tabOncology}</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-500 mb-1 font-semibold uppercase text-[10px] tracking-wider">
            {language === 'TH' ? 'ค้นหาด้วย HN ผู้ป่วย' : 'Patient HN Search'}
          </label>
          <input
            id="report-patient-hn-input"
            type="text"
            value={hnQuery}
            onChange={(e) => setHnQuery(e.target.value)}
            placeholder="e.g., 02-xx-xxxxxx"
            className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 font-mono"
          />
          <p className="text-[9px] text-slate-400 mt-1">
            {language === 'TH' ? 'พิมพ์รหัส HN เพื่อกรองประวัติพิมพ์' : 'Type HN to filter report'}
          </p>
        </div>

        <div className="flex items-end">
          <div className="w-full text-center bg-blue-50 border border-blue-200 text-blue-800 py-2 px-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider">
            🔍 Found {activeBookings.length} reservations
          </div>
        </div>
      </div>

      {/* Aggregated view summary cards in viewport */}
      {activeBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No clinical bookings recorded for the parameters chosen.</p>
          <p className="text-[10px] text-slate-300 mt-1">Adjust classification toggles or calendar date inputs above</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs font-sans space-y-8">
          <div className="border-b-2 border-slate-100 pb-5 text-center">
            <h1 className="text-base font-black text-slate-800 uppercase">BANGKOK HOSPITAL PATTAYA</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">Aggregate Logistics Sourcing Ledger Preview</p>
            <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-widest leading-none">
              Filter: {filterType === 'useDate' ? 'DATE OF DIRECT USE' : 'BOOKING DATE'} = {targetDate} ({drugClass} Classification)
            </p>
          </div>

          <div className="space-y-3 bg-slate-50/80 p-5 rounded-lg border border-slate-200">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-500" />
              Warehouse Sourcing Order summary totals
            </h3>

            <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-slate-200 overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px] border-b border-slate-200">
                  <th className="p-3">Generic / Medicine Trade Name</th>
                  <th className="p-3">stock code</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Unified Sourcing Demand (Qty)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {summaryList.map((item, index) => (
                  <tr key={index} className="text-slate-600 font-medium hover:bg-slate-50/30">
                    <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="p-3 font-mono font-bold text-slate-500">{item.sku}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        item.category === 'Oncology' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-blue-700 text-sm font-mono">{item.qty} units</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
