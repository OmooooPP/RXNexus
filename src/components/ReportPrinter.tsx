import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { Booking, formatDateToDMY } from '../types';
import { Printer, Calendar, FileText, Filter, CheckCircle, Eye, ArrowLeft, BookOpen, Check, X, Receipt } from 'lucide-react';
import { printElementByNewWindow } from '../utils/print';

export default function ReportPrinter({ singleBooking, onClose }: { singleBooking?: Booking, onClose?: () => void }) {
  const { bookings, language, currentUser, updateBooking, owingMeds, toggleMedicineOwing, selectedPharmacyLocation, setSelectedPharmacyLocation } = useApp();
  const t = i18n[language];

  // Parameters for advanced routing/filtration
  const [filterType, setFilterType] = useState<'useDate' | 'bookingDate'>('useDate');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3); // 3 days in advance reservation default
    return d.toISOString().split('T')[0];
  });
  const [drugClass, setDrugClass] = useState<'All' | 'General' | 'Oncology'>('All');
  const [pharmacyLocation, setPharmacyLocation] = useState<string>(selectedPharmacyLocation || 'All');
  const [hnQuery, setHnQuery] = useState<string>('');
  const [ignoreDate, setIgnoreDate] = useState<boolean>(false);
  
  // HTML Fully Printable View Mode
  const [isHtmlPrintActive, setIsHtmlPrintActive] = useState(!!singleBooking);
  // 'voucher' (staff) or 'receipt' (patient) - active when singleBooking is defined
  const [printType, setPrintType] = useState<'voucher' | 'receipt'>('voucher');

  const standardLocations = ['Phar IV', 'Phar A1', 'Phar E3', 'Phar E6', 'Phar D'];
  const uniqueLocations = Array.from(new Set([
    ...standardLocations,
    ...bookings.map(b => b.pharmacyLocation).filter(Boolean)
  ])) as string[];

  // If user is a Pharmacy Stock Clerk, enforce selecting a specific pharmacy location
  React.useEffect(() => {
    if (currentUser?.role === 'Pharmacy Stock Clerk' && (pharmacyLocation === 'All' || !pharmacyLocation)) {
      const firstLoc = selectedPharmacyLocation && selectedPharmacyLocation !== 'All' 
        ? selectedPharmacyLocation 
        : (uniqueLocations[0] || 'Phar IV');
      setPharmacyLocation(firstLoc);
      setSelectedPharmacyLocation(firstLoc);
    }
  }, [currentUser?.role, uniqueLocations, pharmacyLocation]);

  const isDrugOwing = (bookingId: string, drugId: string): boolean => {
    const oRecord = owingMeds?.find(om => om.bookingId === bookingId);
    if (!oRecord) return false;
    const m = oRecord.medications.find(item => item.drugId === drugId);
    return m ? !m.received : false;
  };

  const hasActiveOwingForBooking = (bookingId: string): boolean => {
    const oRecord = owingMeds?.find(om => om.bookingId === bookingId);
    if (!oRecord || oRecord.resolved) return false;
    return oRecord.medications.some(m => !m.received);
  };

  // Load bookings that fit criteria
  const activeBookings = bookings.filter((b) => {
    const matchesCategory = drugClass === 'All' ? true : b.mode === drugClass;
    const matchesLocation = pharmacyLocation === 'All' ? true : b.pharmacyLocation === pharmacyLocation;
    const dateToCheck = filterType === 'useDate' ? b.dateOfUse : b.bookingDate;
    const matchesDate = ignoreDate ? true : (dateToCheck >= startDate && dateToCheck <= endDate);
    const matchesHn = hnQuery
      ? b.hn.replace(/-/g, '').toLowerCase().includes(hnQuery.replace(/-/g, '').toLowerCase())
      : true;

    return matchesCategory && matchesLocation && matchesDate && matchesHn;
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

  // Trigger HTML printing by extracting the printable area and casting it inside a custom styles-retaining popup window
  const handlePrint = () => {
    const element = document.getElementById('printable-area');
    console.log('[Print Debug] #printable-area DOM element check:', element ? 'element exists' : 'element does not exist');
    
    if (!element) {
      console.warn('[Print Debug] #printable-area element not found in current DOM tree. Falling back to default window.print()');
      window.print();
      return;
    }

    console.log('[Print Debug] #printable-area element verified successfully. Initializing printElementByNewWindow.');
    const title = singleBooking ? `Receipt_${singleBooking.hn}` : 'Aggregate_Requisition_Supply_Bill';
    printElementByNewWindow('printable-area', title);
  };

  // RENDER FULLSCREEN PRINT-OPTIMIZED PREVIEW AND WORKSPACE
  if (isHtmlPrintActive) {
    const isPatientReceipt = singleBooking && printType === 'receipt';
    const isStaffVoucher = singleBooking && printType === 'voucher';
    const isBulkReport = !singleBooking;

    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[9999] overflow-y-auto text-slate-900 font-sans p-2 sm:p-6 lg:p-10 flex flex-col items-center print-overlay-wrapper">
        {/* Print stylesheets */}
        <style>{`
          @media print {
            /* Set all unnecessary UI elements, navigation bars, backgrounds, and headers to display: none */
            header,
            aside,
            nav,
            button,
            .print\\:hidden,
            .print-hidden,
            .print-hidden-element,
            #owing-medication-clerk-urgent-banner,
            .print-overlay-wrapper > div:not(#printable-area) {
              display: none !important;
            }

            html, body, #root, #root *, div, main, section {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              position: static !important;
              background-color: transparent !important;
              background-image: none !important;
            }

            .print-overlay-wrapper {
              position: static !important;
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
              width: 100% !important;
              overflow: visible !important;
            }

            /* Ensure the main Requisition Supply Bill container is visible, takes up 100% width, 
               and is positioned perfectly at the top-left of the page so it prints cleanly like a standard document */
            #printable-area {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 12mm 15mm !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              color: #000000 !important;
              background: #ffffff !important;
            }

            .print-compact-table th, .print-compact-table td {
              padding: 3px 5px !important;
              font-size: 9px !important;
              line-height: 1.15 !important;
            }
          }
        `}</style>

        {/* Floating Print Control Banner */}
        <div className="w-full max-w-4xl mb-4 bg-slate-100 p-3 sm:p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl print:hidden z-[10000]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <p className="text-xs text-slate-800 font-black uppercase tracking-wide">
                {isPatientReceipt
                  ? (language === 'TH' ? 'ตัวอย่างใบเสร็จตรวจสอบยาคนไข้ (Patient Receipt)' : 'Patient Medication Receipt Preview')
                  : isStaffVoucher
                    ? (language === 'TH' ? 'ตัวอย่างใบเตรียมเครื่องมือเวชภัณฑ์แพทย์ (Staff Voucher)' : 'Staff Requisition Voucher Preview')
                    : (language === 'TH' ? 'ตัวอย่างใบเบิกรายการสะสมรวมฝ่ายโลจิสติกส์' : 'Aggregate Requisition & Supply Bill')}
              </p>
              <p className="text-[10px] text-slate-500 font-medium leading-none mt-1">
                {language === 'TH'
                  ? 'ตรวจสอบความถูกต้อง ทรงเอกสารขนาด A4 แล้วกดเรียกปริ้นภายนอก'
                  : 'Check parameters, adjust layout, and trigger browser print dialog.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Conditional control switch for single bookings */}
            {singleBooking && (
              <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-300 mr-2">
                <button
                  onClick={() => setPrintType('voucher')}
                  className={`px-3 py-1.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    printType === 'voucher'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {language === 'TH' ? 'ใบเบิกเจ้าหน้าที่' : 'Staff Voucher'}
                </button>
                <button
                  onClick={() => setPrintType('receipt')}
                  className={`px-3 py-1.5 rounded-md text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    printType === 'receipt'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {language === 'TH' ? 'ใบเสร็จรับคนไข้' : 'Patient Receipt'}
                </button>
              </div>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              {language === 'TH' ? 'เริ่มพิมพ์ / เซฟ PDF' : 'Print / Save PDF'}
            </button>
            <button
              onClick={() => {
                setIsHtmlPrintActive(false);
                if (onClose) onClose();
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'TH' ? 'กลับไประบบงาน' : 'Return to App'}
            </button>
          </div>
        </div>

        {/* Paper Container sheet (Designed strictly for A4 format) */}
        <div
          id="printable-area"
          className="w-[210mm] min-h-[297mm] bg-white text-slate-900 border border-slate-300 shadow-2xl p-8 sm:p-12 print:border-0 print:p-0 print:shadow-none flex flex-col justify-between"
        >
          <div>
            {/* Elegant Header Letterhead */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-300">
              <div className="flex items-center gap-3">
                <img
                  src="https://static.bangkokhospital.com/uploads/2025/08/pattaya.svg"
                  alt="Bangkok Hospital Pattaya Logo"
                  className="h-10 w-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-right">
                <h1 className="text-[10px] font-black text-slate-400 tracking-widest font-mono uppercase">
                  BANGKOK HOSPITAL PATTAYA • RX-NEXUS
                </h1>
                <p className="text-[9px] text-slate-500 font-semibold uppercase leading-none mt-1">
                  OUTPATIENT SOURCING LOGISTICS CENTER
                </p>
              </div>
            </div>

            {/* Document Title Header */}
            <div className="text-center my-6">
              <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">
                {isPatientReceipt
                  ? (language === 'TH' ? 'ใบรับยาเวชภัณฑ์สำรองผู้ป่วยนอก' : 'Outpatient Medication Receipt & Sourcing Summary')
                  : isStaffVoucher
                    ? (language === 'TH' ? 'ใบอนุญาตจัดจัดเตรียมเวชภัณฑ์ยาผู้ป่วยนอก' : 'Patient Medication Requisition Voucher')
                    : (language === 'TH' ? 'ใบจัดเตรียมเวชภัณฑ์ค้างส่งและยอดสั่งซื้อสะสม' : 'Aggregate Sourcing Logistics & Supply Bill')}
              </h2>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold font-mono mt-1.5 leading-none">
                {isPatientReceipt
                  ? (language === 'TH' ? 'เอกสารมอบสิทธิ์ผู้ป่วยในการตรวจสอบรับ' : 'OFFICIAL PATIENT DISPENSARY RECEIPT')
                  : isStaffVoucher
                    ? (language === 'TH' ? 'เอกสารตรวจสอบเบิกสิทธิ์ชั้นหน่วยงานคลินิก' : 'SYSTEM CLINIC INFRASTRUCTURE VOUCHER')
                    : (language === 'TH' ? 'รายงานตรวจสอบยอดความต้องการคลังสรุปยอดรวม' : 'LEDGER REPORT — DETAILED INDIVIDUAL ALLOCATIONS')}
              </p>
            </div>

            {/* Layout 1 & 3: Staff Voucher or Bulk Sourcing Log */}
            {isStaffVoucher && singleBooking && (
              <div className="space-y-6">
                {/* General demo stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-[10px] sm:text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-black tracking-wider text-[8px] block">Sourcing ID</span>
                    <span className="font-bold text-blue-900 font-sarabun">{singleBooking.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-black tracking-wider text-[8px] block">{t.patientName}</span>
                    <span className="font-bold text-slate-800">{singleBooking.patientName}</span>
                    <span className="block text-[10px] text-slate-500 font-extrabold whitespace-nowrap font-sarabun">HN: {singleBooking.hn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-black tracking-wider text-[8px] block">{t.bookingDate}</span>
                    <span className="font-bold text-slate-700 font-sarabun text-xs">{formatDateToDMY(singleBooking.bookingDate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 uppercase font-black tracking-wider text-[8px] block">{t.dateOfUse}</span>
                    <span className="font-black text-slate-900 text-sm font-sarabun">{formatDateToDMY(singleBooking.dateOfUse)}</span>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">{singleBooking.department}</span>
                  </div>
                </div>

                {/* Table of items */}
                <div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2 pl-1 border-l-2 border-blue-900">
                    Sourced Medications Itemization
                  </div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-550 font-bold uppercase text-[8.5px] border-b border-slate-200">
                          <th className="py-2 px-3">Medication Description</th>
                          <th className="py-2 px-3 text-center">stock code</th>
                          <th className="py-2 px-3 text-center w-20">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-101 font-medium text-slate-700 select-none">
                        {singleBooking.medications.map((item, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="py-2 px-3 font-semibold text-slate-900">{item.drugName}</td>
                            <td className="py-2 px-3 text-center text-slate-400 font-extrabold font-sarabun text-xs">{item.stockCode}</td>
                            <td className="py-2 px-3 text-center font-bold text-slate-900 text-sm font-sarabun">{item.quantity}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800 font-sarabun">฿{item.unitPrice.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-900 font-sarabun">฿{item.totalPrice.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                          <td colSpan={4} className="py-3 px-3 text-right text-slate-500 text-[9px] tracking-wider uppercase font-black">Total Amount Due:</td>
                          <td className="py-3 px-3 text-right text-blue-900 text-base font-black font-sarabun">฿{singleBooking.totalAmount.toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Regimen and Notes if present */}
                {(singleBooking.regimen || singleBooking.note) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-indigo-50/45 border border-indigo-150/75 text-xs text-indigo-950 font-medium font-sans">
                    {singleBooking.regimen && (
                      <div>
                        <span className="text-indigo-600 uppercase font-black tracking-wider text-[8px] block mb-1">Treatment Regimen</span>
                        <span className="font-extrabold bg-white border border-indigo-150 rounded px-1.5 py-0.5 inline-block">{singleBooking.regimen}</span>
                      </div>
                    )}
                    {singleBooking.note && (
                      <div>
                        <span className="text-slate-400 uppercase font-black tracking-wider text-[8px] block mb-1">Special Notes / Clinical Directions</span>
                        <p className="text-slate-700 bg-white border border-slate-150 rounded p-2 text-[11px] font-medium whitespace-pre-wrap">{singleBooking.note}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Clinical verification */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50/50 border border-slate-200 text-[10px] text-slate-600">
                  <div className="space-y-1">
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[8px] mb-1">Clinic Officers</p>
                    <p>• Prescribing Physician: <span className="font-bold text-slate-800">{singleBooking.staff.doctor}</span></p>
                    <p>• Requesting Ward Nurse: <span className="font-bold text-slate-800">{singleBooking.staff.nurse || 'N/A'}</span></p>
                    <p>• Verifying Pharmacist: <span className="font-bold text-slate-800">{singleBooking.staff.pharmacist || 'Wait for sign'}</span></p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[8px] mb-1">Verify Sync Checklist</p>
                    <p>• RPh Status: <span className="font-bold text-emerald-700 uppercase">{singleBooking.pharmacistVerification.status}</span></p>
                    <p>• Stock Status: <span className="font-bold text-blue-700 uppercase">{singleBooking.clerkVerification.status}</span></p>
                    <p>• Dispatch Receipt: <span className="font-bold text-slate-700 uppercase">{singleBooking.medicineReceived ? 'PREPARED' : 'PENDING'}</span></p>
                  </div>
                </div>

                {/* Signature panels */}
                <div className="grid grid-cols-2 gap-10 text-center pt-8 border-t border-slate-200 text-xs text-slate-500">
                  <div className="space-y-4">
                    <div className="border-b border-dashed border-slate-400 w-44 mx-auto h-7"></div>
                    <p className="uppercase text-[8px] font-black text-slate-400 mt-1">Requesting Officer (Nurse Sign)</p>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-dashed border-slate-400 w-44 mx-auto h-7 flex items-end justify-center pb-0.5">
                      {singleBooking.pharmacistVerification.status === 'Verified' && (
                        <span className="font-black text-blue-900 text-[11px] font-sarabun">{singleBooking.pharmacistVerification.verifiedBy}</span>
                      )}
                    </div>
                    <p className="uppercase text-[8px] font-black text-slate-400 mt-1">Dispensing Pharmacist Sign (RPh)</p>
                  </div>
                </div>
              </div>
            )}
            {/* Layout 2: Patient Receipt */}
            {isPatientReceipt && singleBooking && (
              <div className="space-y-6">
                {/* Patient Banner block */}
                <div className="p-4 rounded-xl bg-amber-50/55 border border-amber-200/90 text-[10px] sm:text-xs">
                  <div className="grid grid-cols-2 gap-y-2 sm:grid-cols-4 gap-x-4">
                    <div>
                      <span className="text-amber-600 font-extrabold uppercase text-[8.5px] tracking-wider block">Patient Name / ชื่อผู้ป่วย</span>
                      <span className="font-black text-slate-900 text-sm leading-tight block mt-0.5">{singleBooking.patientName}</span>
                    </div>
                    <div>
                      <span className="text-amber-600 font-extrabold uppercase text-[8.5px] tracking-wider block">Patient HN / รหัสโรงพยาบาล</span>
                      <span className="font-bold text-slate-800 text-sm block mt-0.5 whitespace-nowrap font-sarabun">{singleBooking.hn}</span>
                    </div>
                    <div>
                      <span className="text-amber-600 font-extrabold uppercase text-[8.5px] tracking-wider block">Clinic Ward / แผนกรับบริการ</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{singleBooking.department}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-600 font-extrabold uppercase text-[8.5px] tracking-wider block">Reservation Date / วันที่ต้องใช้</span>
                      <span className="font-black text-amber-900 text-sm block mt-0.5 font-sarabun">{formatDateToDMY(singleBooking.dateOfUse)}</span>
                    </div>
                  </div>
                </div>

                {/* Sourced Medications */}
                <div>
                  <div className="text-[10px] text-amber-800 font-black uppercase tracking-wider mb-2 pl-1 border-l-2 border-amber-500 flex justify-between">
                    <span>💊 Prescribed Medications List / รายการใบสั่งยาจัดเตรียม</span>
                    <span className="font-serif italic font-medium text-[8px] text-slate-400 uppercase">Pre-arranged and Reserved</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-550 font-black uppercase tracking-wider text-[8px] border-b border-slate-200">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Medication Name / ชื่อยา</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Stock Code</th>
                          <th className="py-2.5 px-3 text-center">Qty / จำนวน</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Subtotal / ยอดรวมย่อย</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-101 text-slate-700 font-medium">
                        {singleBooking.medications.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20">
                            <td className="py-2.5 px-3 text-slate-400 font-semibold font-sarabun text-xs">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.drugName}</td>
                            <td className="py-2.5 px-3 text-center text-slate-450 font-bold whitespace-nowrap font-sarabun text-xs">{item.stockCode}</td>
                            <td className="py-2.5 px-3 text-center font-black text-slate-900 text-sm font-sarabun">{item.quantity} units</td>
                            <td className="py-2.5 px-3 text-right font-bold font-sarabun text-xs">฿{item.unitPrice.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 font-sarabun">฿{item.totalPrice.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-amber-50/20 font-bold border-t border-slate-250">
                          <td colSpan={5} className="py-3 px-3 text-right uppercase text-[9px] text-slate-500 tracking-wider">
                            Total Valuation / ยอดมูลค่ารักษาสุทธิ:
                          </td>
                          <td className="py-3 px-3 text-right text-amber-950 text-[15px] font-black font-sarabun">
                            ฿{singleBooking.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Regimen and Patient Note if present */}
                {(singleBooking.regimen || singleBooking.note) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-indigo-50/40 border border-indigo-150/60 text-xs text-slate-700 font-sans">
                    {singleBooking.regimen && (
                      <div>
                        <span className="text-indigo-600 font-extrabold uppercase text-[8.5px] tracking-wider block mb-1">Treatment Regimen / สูตรยานัดพบ</span>
                        <span className="font-black text-indigo-950 block bg-indigo-100/50 border border-indigo-200/50 px-2 py-1 rounded inline-block font-sarabun">{singleBooking.regimen}</span>
                      </div>
                    )}
                    {singleBooking.note && (
                      <div>
                        <span className="text-slate-500 font-extrabold uppercase text-[8.5px] tracking-wider block mb-1">Extra Instructions / รายละเอียดบันทึกเพิ่มเติม</span>
                        <p className="text-slate-755 font-medium text-[11px] block whitespace-pre-wrap">{singleBooking.note}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Friendly Client Guidance Notes */}
                <div className="p-3 bg-amber-50/75 rounded-lg border border-amber-200 text-[10px] text-amber-950/90 leading-relaxed font-medium space-y-1 page-break-inside-avoid">
                  <p className="font-extrabold text-[10.5px] uppercase tracking-wide text-amber-900">
                    ⚠️ Dear Patient Notice / คำแนะนำสำหรับคนไข้ในการบริการ:
                  </p>
                  <p>1. Please hand over this receipt printed copy or slide display to the outpatient pharmacy dispensing window on <span className="font-sarabun font-bold">{formatDateToDMY(singleBooking.dateOfUse)}</span> to complete your physical verification and pick up your reservation.</p>
                  <p className="italic text-slate-550">1. กรุณานำใบรับที่พิมพ์นี้ (หรือแสดงรูปหน้าจอ) มาติดต่อห้องยาผู้ป่วยนอก ณ วันที่ <span className="font-sarabun font-bold">{formatDateToDMY(singleBooking.dateOfUse)}</span> เพื่อความรวดเร็วในการรับบริการ</p>
                </div>
              </div>
            )}

            {/* Layout 3: Bulk Sourcing Logistics & Supply Bill */}
            {isBulkReport && (
              <div className="space-y-4">
                {/* Meta and parameters summary */}
                <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3 text-[10px] bg-slate-50 print-meta-text">
                  <div className="space-y-1 text-slate-600 font-medium font-sans">
                    <div>
                      • {language === 'TH' ? 'กรองประเภทช่วงเวลา:' : 'Timeframe Filter:'}{' '}
                      <span className="font-extrabold text-slate-800">{filterType === 'useDate' ? 'Date of Use' : 'Booking Date'}</span>
                    </div>
                    <div>
                      • {language === 'TH' ? 'ขอบเขตประเภทช่วงเวลาคิว:' : 'Medicinal Category:'}{' '}
                      <span className="font-extrabold text-slate-800">{drugClass}</span>
                    </div>
                    <div>
                      • {language === 'TH' ? 'ผู้ตรวจสอบยื่นใบสั่งเบิก:' : 'Sourced By:'}{' '}
                      <span className="font-extrabold text-slate-800">
                        {currentUser?.name || 'Logistics Officer'} ({currentUser?.role || 'Staff'})
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-slate-600 font-medium text-right font-sans">
                    <div>
                      • {language === 'TH' ? 'วันที่สกัดข้อมูลพิมพ์:' : 'Printed Date:'}{' '}
                      <span className="font-bold text-slate-800">
                        {new Date().toLocaleDateString('th-TH')} {new Date().toLocaleTimeString('th-TH')}
                      </span>
                    </div>
                    <div>
                      • {language === 'TH' ? 'รวมยอดใบจองคิว:' : 'Total Linked Profiles:'}{' '}
                      <span className="font-bold text-slate-800">{activeBookings.length} bookings</span>
                    </div>
                    <div>
                      • {language === 'TH' ? 'สถานะตรวจสอบเบิกจ่าย:' : 'Logistics Voucher Status:'}{' '}
                      <span className="text-emerald-700 font-black bg-emerald-50 px-1 border border-emerald-100 rounded text-[9.5px]">
                        Active Aggregate Sourcing
                      </span>
                    </div>
                  </div>
                </div>

                {/* LOCATIONS GROUPED LISTING */}
                {(() => {
                  // Find all unique locations within active bookings
                  const activeLocs = Array.from(new Set<string>(
                    activeBookings.map(b => (b.pharmacyLocation || '').trim())
                  )).sort((a, b) => {
                    if (!a) return 1;
                    if (!b) return -1;
                    return a.localeCompare(b);
                  });

                  if (activeLocs.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 font-extrabold uppercase font-sans">
                        No items found matching the selected parameters.
                      </div>
                    );
                  }

                  return activeLocs.map((locKey, locIdx) => {
                    const locBookings = activeBookings.filter(b => (b.pharmacyLocation || '').trim() === locKey);
                    if (locBookings.length === 0) return null;

                    // Local aggregated medicine totals for this room
                    const locAggregatedMeds: { [key: string]: { name: string; sku: string; qty: number; category: string } } = {};
                    locBookings.forEach((b) => {
                      b.medications.forEach((m) => {
                        if (locAggregatedMeds[m.drugId]) {
                          locAggregatedMeds[m.drugId].qty += m.quantity;
                        } else {
                          locAggregatedMeds[m.drugId] = {
                            name: m.drugName,
                            sku: m.stockCode,
                            qty: m.quantity,
                            category: b.mode
                          };
                        }
                      });
                    });
                    const locSummaryList = Object.values(locAggregatedMeds);
                    const displayLocLabel = locKey || (language === 'TH' ? 'ไม่ได้ระบุห้องยา (Unspecified Location)' : 'Unspecified Pharmacy Location');

                    return (
                      <div key={locKey || locIdx} className="space-y-4 border border-slate-200 p-4 rounded-xl bg-white shadow-xs no-break mt-4">
                        {/* Elegant Location Band Header */}
                        <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-between font-sans">
                          <span className="flex items-center gap-1.5">
                            <span>📍</span>
                            <span>{language === 'TH' ? `คลังสำรอง / ห้องยา: ${displayLocLabel}` : `Pharmacy Location: ${displayLocLabel}`}</span>
                          </span>
                          <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px]">
                            {locBookings.length} {language === 'TH' ? 'รายการจอง' : 'Bookings'}
                          </span>
                        </div>

                        {/* Sourcing summary totals for this room */}
                        {currentUser?.role !== 'Pharmacist' && currentUser?.role !== 'Pharmacist Assistant' && (
                          <div className="space-y-1.5 pl-1">
                            <p className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1 font-sans">
                              📝 {language === 'TH' ? `สรุปยอดเบิกคลังสำรองคลังประจำ: ${displayLocLabel}` : `Sourcing Summary Totals: ${displayLocLabel}`}
                            </p>
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-left border-collapse print-compact-table text-[10px]">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-550 font-bold uppercase text-[8px] border-b border-slate-200">
                                    <th className="py-1 px-3">Medicine Description / รหัสเวชภัณฑ์</th>
                                    <th className="py-1 px-3 text-center whitespace-nowrap">Stock Code / SKU</th>
                                    <th className="py-1 px-3 text-center">Class / หมวดคิว</th>
                                    <th className="py-1 px-3 text-right">Demand Quantity / รวมสุทธิ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {locSummaryList.map((item, idx) => (
                                    <tr key={idx} className="bg-white">
                                      <td className="py-1 px-3 font-semibold text-slate-900">{item.name}</td>
                                      <td className="py-1 px-3 text-center text-slate-500 font-bold font-sarabun whitespace-nowrap text-xs">{item.sku}</td>
                                      <td className="py-1 px-3 text-center">
                                        <span className="px-1.5 bg-slate-100 text-slate-600 font-extrabold text-[8px] uppercase rounded border border-slate-200 leading-none">
                                          {item.category}
                                        </span>
                                      </td>
                                      <td className="py-1 px-3 text-right font-black text-indigo-900 text-sm font-sarabun">
                                        {item.qty}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Individual Patient Allocations for this room */}
                        {currentUser?.role !== 'Pharmacy Stock Clerk' && (
                          <div className="space-y-1.5 pl-1">
                            <p className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-101 pb-1 font-sans">
                              👥 {language === 'TH' ? `รายละเอียดคนไข้แยกรายบุคคลคลังประจำ: ${displayLocLabel}` : `Individual Patient Allocations: ${displayLocLabel}`}
                            </p>
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <table className="w-full text-left border-collapse print-compact-table text-[10px]">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-550 font-bold uppercase text-[8px] border-b border-slate-200">
                                    <th className="py-1 px-2 text-center w-8 font-semibold">#</th>
                                    <th className="py-1 px-2 text-center whitespace-nowrap min-w-[105px]">HN</th>
                                    <th className="py-1 px-2.5">{language === 'TH' ? 'ชื่อผู้ป่วย' : 'Patient Name'}</th>
                                    <th className="py-1 px-2 text-center font-bold whitespace-nowrap min-w-[85px]">{language === 'TH' ? 'วันที่ต้องใช้' : 'Date of Use'}</th>
                                    <th className="py-1 px-2">{language === 'TH' ? 'ชื่อยาเวชภัณฑ์สำรอง' : 'Drug Name'}</th>
                                    <th className="py-1 px-2 text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {locBookings.flatMap((b) => 
                                    b.medications.map((m) => ({
                                      hn: b.hn,
                                      patientName: b.patientName,
                                      dateOfUse: b.dateOfUse,
                                      drugName: m.drugName,
                                      stockCode: m.stockCode,
                                      quantity: m.quantity,
                                      regimen: b.regimen,
                                      holdStatus: b.holdStatus,
                                      rolloverStatus: b.rolloverStatus
                                    }))
                                  ).map((row, rIdx) => (
                                    <tr key={rIdx} className="bg-white hover:bg-slate-50/10 font-medium">
                                      <td className="py-1 px-2 text-center text-slate-400 font-sarabun font-semibold text-[9.5px]">{rIdx + 1}</td>
                                      <td className="py-1 px-2 text-center font-bold text-slate-750 font-sarabun text-[10.5px] whitespace-nowrap min-w-[105px] tracking-wide">{row.hn}</td>
                                      <td className="py-1 px-2.5 font-extrabold text-slate-950 text-[11.5px] break-words whitespace-normal break-all min-w-[120px] max-w-[160px]">
                                        <span>{row.patientName}</span>
                                        {row.holdStatus?.isHeld && (
                                          <span className="ml-1.5 px-1.5 py-0.2 bg-red-100 text-red-700 border border-red-205 rounded text-[8.5px] font-black whitespace-nowrap inline-block">
                                            Hold
                                          </span>
                                        )}
                                        {row.rolloverStatus && (
                                          <span className="ml-1.5 px-1.5 py-0.2 bg-purple-100 text-purple-700 border border-purple-205 rounded text-[8.5px] font-black whitespace-nowrap inline-block">
                                            {language === 'TH' ? 'เปลี่ยนวัน' : 'Rollover'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 text-center text-slate-600 font-bold whitespace-nowrap font-sarabun text-[10px]">{formatDateToDMY(row.dateOfUse)}</td>
                                      <td className="py-1 px-2 font-black text-slate-900 break-words whitespace-normal break-all min-w-[140px] max-w-[200px]">
                                        {row.drugName}
                                        {row.regimen && (
                                          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-sm text-[9px] px-1 py-0.5 ml-1.5 whitespace-nowrap inline-block">
                                            ({row.regimen})
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 text-right font-black text-blue-900 text-[13px] font-sarabun whitespace-nowrap">{row.quantity}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                    <td colSpan={5} className="py-1.5 px-3 text-right uppercase text-[8px] text-slate-500 tracking-wider font-sans whitespace-nowrap">
                                      {language === 'TH' ? 'รวมยอดจัดสรรห้องนี้:' : 'Total Quantity For Location:'}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-black text-slate-900 text-sm font-sarabun whitespace-nowrap">
                                      {locSummaryList.reduce((sum, item) => sum + item.qty, 0)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

                {/* Sourcing Notice block */}
                <div className="p-3 bg-blue-50/20 border border-blue-150 rounded-lg text-[8.5px] text-slate-600 leading-normal page-break-inside-avoid shadow-2xs font-sans">
                  <span className="font-extrabold text-[9px] text-blue-900 uppercase block mb-0.5">⚠️ Requisition Protocols / ข้อตกลงกระบวนการจัดการเบิกส่ง:</span>
                  <p>1. Ensure physical second-count verification is completed by supervisors for all Oncology-category lines prior to handover.</p>
                  <p>2. Report any clinical SKU deviations instantly to outpatient logistics lead for inventory adjustment.</p>
                </div>

                {/* Signatures check block */}
                <div className="grid grid-cols-2 gap-10 text-center pt-6 border-t border-slate-200 text-xs text-slate-500">
                  <div className="space-y-4">
                    <div className="border-b border-dashed border-slate-350 w-44 mx-auto h-6"></div>
                    <p className="uppercase text-[8px] font-black text-slate-400 mt-1">Dispensing Logistics Associate</p>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-dashed border-slate-350 w-44 mx-auto h-6 flex items-end justify-center pb-0.5">
                      <span className="font-black text-blue-900 text-[10px]">{currentUser?.name || 'Verified Pharmacist'}</span>
                    </div>
                    <p className="uppercase text-[8px] font-black text-slate-400 mt-1">Authorized Verification Pharmacist (RPh Lead)</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Constant watermark footer of paper */}
          <div className="text-center text-[7.5px] text-slate-400 font-mono uppercase tracking-widest border-t border-slate-200/60 pt-3 leading-none print:pt-4">
            OP-RXN SOURCING VOUCHER SYSTEM • POWERED BY PREEYAPAT.P (RPH) • VERIFIED SECURE LOGISTICS
          </div>
        </div>
      </div>
    );
  }

  // STANDARD IN-APP VIEW DESIGN WITH FLOATING OPEN FULLSCREEN BUTTON
  if (singleBooking) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-400" />
            {t.medicationBookReport}
          </span>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setPrintType('voucher');
                setIsHtmlPrintActive(true);
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {language === 'TH' ? 'พิมพ์ใบเบิกเจ้าหน้าที่' : 'Print Staff Voucher'}
            </button>
            <button
              onClick={() => {
                setPrintType('receipt');
                setIsHtmlPrintActive(true);
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5" />
              {language === 'TH' ? 'พิมพ์ใบเสร็จคนไข้' : 'Print Patient Receipt'}
            </button>
          </div>
        </div>

        {/* Informative Preview Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs font-sans">
          <div className="border-b-2 border-slate-101 pb-4 text-center">
            <h1 className="text-base font-black text-slate-800 uppercase">BANGKOK HOSPITAL PATTAYA</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">RXNexus Prescription Sourcing Preview</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-slate-600 font-medium">
            <div>
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Booking ID</p>
              <p className="font-bold text-slate-800 text-sm font-sarabun">{singleBooking.id}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.bookingDate}</p>
              <p className="font-semibold text-slate-755 text-[11px] font-sarabun">{formatDateToDMY(singleBooking.bookingDate)}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.patientName}</p>
              <p className="font-bold text-slate-805">{singleBooking.patientName}</p>
              <p className="text-[11px] text-slate-450 font-bold font-sarabun whitespace-nowrap">HN: {singleBooking.hn}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">{t.dateOfUse}</p>
              <p className="font-bold text-slate-800 text-[11px] font-sarabun">{formatDateToDMY(singleBooking.dateOfUse)}</p>
              <p className="text-[10px] text-slate-450 font-bold uppercase">{singleBooking.department}</p>
            </div>
          </div>

          {/* Med list */}
          <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-550 font-bold border-b border-slate-200 uppercase tracking-divider text-[9.5px]">
                  <th className="p-3">Medicine Description</th>
                  <th className="p-3">stock code</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-101 text-slate-700">
                {singleBooking.medications.map((item, idx) => (
                  <tr key={idx} className="font-medium text-slate-650 hover:bg-slate-55/15">
                    <td className="p-3 font-semibold text-slate-800">{item.drugName}</td>
                    <td className="p-3 text-slate-450 font-bold font-sarabun">{item.stockCode}</td>
                    <td className="p-3 text-center font-bold text-sm text-slate-850 font-sarabun">{item.quantity}</td>
                    <td className="p-3 text-right font-semibold font-sarabun">฿{item.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-sarabun">฿{item.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/70 font-bold text-slate-850">
                  <td colSpan={4} className="p-3 text-right text-slate-500 tracking-wider">TOTAL AMOUNT DUE:</td>
                  <td className="p-3 text-right text-blue-900 text-sm font-bold font-sarabun">฿{singleBooking.totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Regimen and Notes if present */}
          {(singleBooking.regimen || singleBooking.note) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 rounded-lg bg-indigo-50/40 border border-indigo-100 text-xs text-slate-700">
              {singleBooking.regimen && (
                <div>
                  <span className="text-indigo-600 font-bold uppercase text-[9px] tracking-wider block mb-1">Treatment Regimen</span>
                  <span className="font-extrabold text-indigo-950 bg-white border border-indigo-200/50 px-2 py-0.5 rounded inline-block">{singleBooking.regimen}</span>
                </div>
              )}
              {singleBooking.note && (
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block mb-1">Special Notes / Directions</span>
                  <p className="text-slate-700 bg-white border border-slate-200/50 rounded p-2 text-[11px] font-medium whitespace-pre-wrap">{singleBooking.note}</p>
                </div>
              )}
            </div>
          )}

          {/* Verification labels */}
          <div className="grid grid-cols-2 gap-4 mt-6 p-4 rounded-lg border border-slate-100 bg-slate-50/60 text-[10px] text-slate-505">
            <div>
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Sourcing MD / RN Officers</p>
              <p>• MD: <span className="font-semibold text-slate-700">{singleBooking.staff.doctor}</span></p>
              <p>• RN: <span className="font-semibold text-slate-700">{singleBooking.staff.nurse || 'N/A'}</span></p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Ledger Sync status</p>
              <p>Pharmacist Verification: <span className="font-semibold text-slate-705">{singleBooking.pharmacistVerification.status}</span></p>
              <p>Clerk Dispatch Check: <span className="font-semibold text-slate-705">{singleBooking.clerkVerification.status}</span></p>
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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            {t.reportsTitle}
          </h2>
          <p className="text-[11px] text-slate-450 mt-0.5">{t.reportsDashboard}</p>
        </div>

        {activeBookings.length > 0 && (
          <button
            id="print-bulk-report-btn"
            onClick={() => {
              setIsHtmlPrintActive(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {language === 'TH' ? 'ปริ้นใบรายงาน PDF' : 'Open HTML Print & PDF'}
          </button>
        )}
      </div>

      {/* Grid Settings Filter Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm text-xs items-start print:hidden">
        <div className="space-y-1.5">
          <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
            {t.modeSelect}
          </label>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterType('useDate')}
              className={`flex-1 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all shadow-xs ${
                filterType === 'useDate' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rx Use Date
            </button>
            <button
              onClick={() => setFilterType('bookingDate')}
              className={`flex-1 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all shadow-xs ${
                filterType === 'bookingDate' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Order Date
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
            Date Range Filter
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                id="report-start-date-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={ignoreDate}
                className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-300 border border-slate-200 px-2 py-1.5 rounded-md text-[10px] focus:outline-hidden font-mono shadow-xs"
              />
            </div>
            <div>
              <input
                id="report-end-date-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={ignoreDate}
                className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-300 border border-slate-200 px-2 py-1.5 rounded-md text-[10px] focus:outline-hidden font-mono shadow-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <input
              id="report-ignore-date-checkbox"
              type="checkbox"
              checked={ignoreDate}
              onChange={(e) => setIgnoreDate(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
            />
            <label htmlFor="report-ignore-date-checkbox" className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none cursor-pointer">
              {language === 'TH' ? 'ทุกช่วงเวลาสะสม' : 'All time records'}
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
            {t.reportsType}
          </label>
          <select
            id="report-drug-class-select"
            value={drugClass}
            onChange={(e) => setDrugClass(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:outline-hidden cursor-pointer hover:bg-slate-100 transition-colors shadow-xs text-slate-700"
          >
            <option value="All">{t.reportsAll}</option>
            <option value="General">{t.tabGeneral}</option>
            <option value="Oncology">{t.tabOncology}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
            {language === 'TH' ? 'ล็อกห้องยา (Location)' : 'Pharmacy Location'}
          </label>
          <select
            id="report-pharmacy-location-select"
            value={pharmacyLocation}
            onChange={(e) => {
              const val = e.target.value;
              setPharmacyLocation(val);
              setSelectedPharmacyLocation(val);
            }}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold focus:outline-hidden cursor-pointer hover:bg-slate-100 transition-colors uppercase shadow-xs text-slate-700"
          >
            {currentUser?.role !== 'Pharmacy Stock Clerk' && (
              <option value="All">{language === 'TH' ? 'แสดงทั้งหมด (All)' : 'All Locations'}</option>
            )}
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-wider mb-1">
            {language === 'TH' ? 'ค้นหาด้วย HN ผู้ป่วย' : 'Patient HN Search'}
          </label>
          <input
            id="report-patient-hn-input"
            type="text"
            value={hnQuery}
            onChange={(e) => setHnQuery(e.target.value)}
            placeholder="e.g., 02-xx-xxxxxx"
            className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 font-mono transition-colors shadow-xs text-slate-700 font-medium"
          />
        </div>

        <div className="flex h-full flex-col justify-end">
          <label className="block text-transparent font-bold uppercase text-[10px] tracking-wider mb-1 select-none">
            Status
          </label>
          <div className="w-full text-center bg-blue-50/80 border border-blue-200/60 text-blue-800 py-2 px-1.5 rounded-lg font-black text-xs uppercase tracking-wider h-[34px] flex items-center justify-center shadow-[inset_0_1px_3px_rgb(0,0,0,0.05)]">
            🔍 Found {activeBookings.length}
          </div>
        </div>
      </div>

      {/* Aggregated view summary cards in viewport */}
      {activeBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            {language === 'TH' ? 'ไม่พบข้อมูลใบจองตามเงื่อนไขที่เลือก' : 'No clinical bookings recorded for the parameters chosen.'}
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            {language === 'TH' ? 'กรุณาปรับเงื่อนไขตัวกรองด้านบนใหม่' : 'Adjust classification toggles or calendar date inputs above'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs font-sans space-y-8 mt-6">
          <div className="border-b-2 border-slate-100 pb-5 text-center">
            <h1 className="text-base font-black text-slate-800 uppercase">BANGKOK HOSPITAL PATTAYA</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">Aggregate Logistics Sourcing Ledger Preview</p>
            <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase tracking-widest leading-none">
              Filter: {filterType === 'useDate' ? 'DATE OF DIRECT USE' : 'BOOKING DATE'} = {ignoreDate ? 'ALL TIME' : `${formatDateToDMY(startDate)} to ${formatDateToDMY(endDate)}`} ({drugClass} Classification)
            </p>
          </div>

          {currentUser?.role !== 'Pharmacist' && currentUser?.role !== 'Pharmacist Assistant' && (
            <div className="space-y-3 bg-slate-50/80 p-5 rounded-lg border border-slate-200">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-500" />
                {language === 'TH' ? 'ยอดสรุปเบิกเวชภัณฑ์รวมตามรหัสคลัง (Requisition Inventory Totals)' : 'Warehouse Sourcing Order summary totals'}
              </h3>

              <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-slate-200 overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[9px] border-b border-slate-200 font-bold font-sans">
                    <th className="p-3">Generic / Medicine Trade Name</th>
                    <th className="p-3 whitespace-nowrap">Stock Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Unified Sourcing Demand (Qty)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-101 text-slate-700 flex-none h-auto">
                  {summaryList.map((item, index) => (
                    <tr key={index} className="text-slate-655 font-medium hover:bg-slate-50/50 bg-white">
                      <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="p-3 font-bold text-slate-500 font-mono whitespace-nowrap">{item.sku}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          item.category === 'Oncology' ? 'bg-red-50 text-red-600 border-red-105' : 'bg-blue-50 text-blue-600 border-blue-105'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-blue-700 text-sm">{item.qty} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed patient medication layout - as requested "หน้า report drug detail ให้ขึ้นเป็นรายชื่อคนไข้แยกราย-ยาที่ใช้ ด้วย" */}
          {currentUser?.role !== 'Pharmacy Stock Clerk' && (
            <div className="space-y-3 bg-slate-50/80 p-5 rounded-lg border border-slate-200">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  {language === 'TH' ? 'รายละเอียดจัดสรรยาจำเพาะเจาะจงรายคิวเวชภัณฑ์ (Report Drug Details)' : 'Report Drug Details (Individual Allocations)'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
                  {activeBookings.flatMap(b => b.medications).length} lines
                </span>
              </h3>

              <div className="overflow-x-auto border border-slate-200 bg-white rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-550 font-semibold uppercase tracking-wider text-[9px] border-b border-slate-200">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">{language === 'TH' ? 'คนไข้ / รหัส HN' : 'Patient / HN'}</th>
                      <th className="p-3 text-center whitespace-nowrap">{language === 'TH' ? 'วันที่ต้องใช้' : 'Date of Use'}</th>
                      <th className="p-3">{language === 'TH' ? 'ชื่อยาเวชภัณฑ์สำรอง' : 'Drug Name'}</th>
                      <th className="p-3 text-center whitespace-nowrap">{language === 'TH' ? 'ห้องยา' : 'Location'}</th>
                      <th className="p-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-101 text-slate-700">
                    {activeBookings.flatMap((b) => 
                      b.medications.map((m) => ({
                        hn: b.hn,
                        patientName: b.patientName,
                        dateOfUse: b.dateOfUse,
                        pharmacyLocation: b.pharmacyLocation,
                        drugName: m.drugName,
                        stockCode: m.stockCode,
                        quantity: m.quantity,
                        regimen: b.regimen,
                        holdStatus: b.holdStatus,
                        rolloverStatus: b.rolloverStatus
                      }))
                    ).map((row, idx) => (
                      <tr key={idx} className="font-medium hover:bg-slate-50/50 bg-white">
                        <td className="p-3 text-center text-slate-400 font-sarabun font-semibold text-[11px]">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{row.patientName}</span>
                            {row.holdStatus?.isHeld && (
                              <span className="px-1.5 py-0.2 bg-red-100 text-red-700 border border-red-200 rounded text-[9px] font-black whitespace-nowrap">
                                Hold
                              </span>
                            )}
                            {row.rolloverStatus && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[9px] font-black whitespace-nowrap">
                                {language === 'TH' ? 'เปลี่ยนวัน' : 'Rollover'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-450 block font-sarabun font-extrabold whitespace-nowrap">HN: {row.hn}</span>
                        </td>
                        <td className="p-3 text-center text-slate-600 font-bold whitespace-nowrap font-sarabun text-xs">{formatDateToDMY(row.dateOfUse)}</td>
                        <td className="p-3 font-semibold text-slate-800">
                          {row.drugName}
                          {row.regimen && (
                            <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-sm text-[9px] px-1 py-0.5 ml-1.5 whitespace-nowrap inline-block">
                              ({row.regimen})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px] border border-slate-200 font-sarabun uppercase">
                            {row.pharmacyLocation || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-indigo-950 text-sm font-sarabun whitespace-nowrap">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
