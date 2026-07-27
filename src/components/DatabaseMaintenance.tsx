import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, Download, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';

export default function DatabaseMaintenance() {
  const { bookings, language, spawnAlert, currentUser } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Monthly archive states
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter 6 month old bookings
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const oldBookings = bookings.filter((b) => {
    // If it doesn't have a date of use, or is older than 6 months
    if (!b.dateOfUse) return false;
    const bookingDate = new Date(b.dateOfUse);
    return bookingDate < sixMonthsAgo;
  });

  const targetYearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthlyBookings = bookings.filter((b) => {
    return b.dateOfUse && b.dateOfUse.startsWith(targetYearMonth);
  });

  const handleExportMonthlyJSON = () => {
    if (monthlyBookings.length === 0) {
      spawnAlert(
        language === 'TH' 
          ? `ไม่มีข้อมูลของเดือน ${targetYearMonth} ให้ดาวน์โหลด` 
          : `No bookings found for ${targetYearMonth}`, 
        'error'
      );
      return;
    }

    const jsonString = JSON.stringify(monthlyBookings, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `med_bookings_${targetYearMonth}_archive.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    spawnAlert(
      language === 'TH' 
        ? `สำรองไฟล์รายเดือนของ ${targetYearMonth} เรียบร้อยแล้ว (${monthlyBookings.length} รายการ)` 
        : `Exported monthly JSON file for ${targetYearMonth} (${monthlyBookings.length} records)`, 
      'success'
    );
  };

  const handleImportMonthlyJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!Array.isArray(parsed)) {
          throw new Error(language === 'TH' ? 'รูปแบบไฟล์ไม่ถูกต้อง (ต้องเป็นอาเรย์ของข้อมูล)' : 'Invalid file structure: must be an array of bookings');
        }

        let importCount = 0;
        for (const item of parsed) {
          if (item && item.id && item.patientName) {
            await setDoc(doc(db, 'bookings', item.id), item);
            importCount++;
          }
        }

        const logId = 'log-' + Date.now();
        await setDoc(doc(db, 'logs', logId), {
          id: logId,
          timestamp: new Date().toISOString(),
          userId: currentUser?.id || 'system',
          userName: currentUser?.name || 'Admin',
          userRole: currentUser?.role || 'Admin',
          action: 'Monthly Archive Import',
          details: `Imported and restored ${importCount} booking records from JSON file backup.`
        });

        spawnAlert(
          language === 'TH' 
            ? `นำเข้าข้อมูลและกู้คืนสำเร็จจำนวน ${importCount} รายการ!` 
            : `Successfully imported and restored ${importCount} clinical records!`, 
          'success'
        );
      } catch (err: any) {
        console.error(err);
        spawnAlert(
          language === 'TH' 
            ? 'เกิดข้อผิดพลาดในการนำเข้าไฟล์: ' + err.message 
            : 'Error importing file: ' + err.message, 
          'error'
        );
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportDataCSV = () => {
    if (bookings.length === 0) {
      spawnAlert(language === 'TH' ? 'ไม่มีข้อมูลให้ดาวน์โหลด' : 'No data to export', 'error');
      return;
    }

    // Creating CSV header
    const headers = [
      'ID', 'HN', 'Patient Name', 'Date Of Use', 'Clinic/Ward', 
      'Doctor', 'Nurse', 'Pharmacist', 'Created At',
      'Status (Pharmacist)', 'Status (Clerk)'
    ];

    const rows = bookings.map(b => [
      b.id,
      b.hn,
      `"${b.patientName}"`,
      b.dateOfUse,
      `"${b.location}"`,
      `"${b.staff?.doctor || ''}"`,
      `"${b.staff?.nurse || ''}"`,
      `"${b.staff?.pharmacist || ''}"`,
      b.createdAt,
      b.pharmacistVerification?.status || '',
      b.clerkVerification?.status || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `med_bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    spawnAlert('Exported CSV Successfully.', 'success');
  };

  const handleClearOldData = async () => {
    if (oldBookings.length === 0) {
       spawnAlert(language === 'TH' ? 'ไม่มีข้อมูลที่เก่ากว่า 6 เดือนให้ลบ' : 'No records older than 6 months found.', 'info');
       return;
    }

    setShowClearConfirm(true);
  };

  const executeClearOldData = async () => {
    setShowClearConfirm(false);
    setIsProcessing(true);
    let successCount = 0;
    
    try {
      for (const b of oldBookings) {
        await deleteDoc(doc(db, 'bookings', b.id));
        successCount++;
      }
      
      const logId = 'log-' + Date.now();
      await setDoc(doc(db, 'logs', logId), {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Admin',
        userRole: currentUser?.role || 'Admin',
        action: 'Batch Delete (6 Month Auto-Clear)',
        details: `Deleted ${successCount} booking records that were older than 6 months.`
      });

      spawnAlert(`Successfully deleted ${successCount} old records.`, 'success');
    } catch (e: any) {
      console.error(e);
      spawnAlert('Failed to clear some records. Please check your connection and permissions.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {language === 'TH' ? 'การจัดการฐานข้อมูล (Database Maintenance)' : 'Database Maintenance'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {language === 'TH' 
                ? 'สำรองข้อมูลทั้งหมดและล้างข้อมูลที่หมดอายุ (เกิน 6 เดือน) เพื่อประหยัดพื้นที่คลาวด์' 
                : 'Backup absolute entire databases and clear outdated entries (6+ months) to save cloud storage.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          
          {/* Export Card */}
          <div className="border border-indigo-100 bg-indigo-50/30 p-6 rounded-2xl flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">
                {language === 'TH' ? 'ดึงไฟล์ข้อมูลทั้งหมด (Export CSV)' : 'Export Database (CSV)'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 flex-1">
              {language === 'TH'
                ? 'ดาวน์โหลดข้อมูลรายการจองยาทั้งหมดที่มีอยู่ ณ ปัจจุบัน นำไปเซฟเป็นไฟล์ Excel เพื่อจัดเก็บประวัติ.'
                : 'Download all existing medication bookings as a standalone CSV file to keep on your local machine / Excel.'}
            </p>
            <div className="w-full bg-white border border-indigo-100 rounded-lg p-3 text-sm text-slate-700 font-mono flex justify-between items-center">
              <span>Total Records:</span>
              <span className="font-bold">{bookings.length}</span>
            </div>
            <button 
              onClick={handleExportDataCSV}
              disabled={isProcessing}
              className="w-full mt-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {language === 'TH' ? 'ส่งออกข้อมูล (Export)' : 'Export CSV File'}
            </button>
          </div>

          {/* Delete Card */}
          <div className="border border-red-100 bg-red-50/30 p-6 rounded-2xl flex flex-col items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg text-red-700">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">
                {language === 'TH' ? 'ล้างข้อมูล 6 เดือนย้อนหลัง' : 'Purge 6-Month Old Data'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 flex-1">
              {language === 'TH'
                ? 'ลบข้อมูลรายการจองยาที่มี Date of Use เกิน 6 เดือนย้อนหลัง เพื่อประหยัดพื้นที่จัดเก็บบน Cloud (คำเตือน: โปรดทำการ Export ก่อนลบ)'
                : 'Permanently delete bookings with a "Date of Use" older than 6 months to free up cloud Firestore limits.'}
            </p>
            <div className="w-full bg-white border border-red-100 rounded-lg p-3 text-sm text-slate-700 font-mono flex justify-between items-center">
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/> 6+ Months (Target):</span>
              <span className="font-bold text-red-600">{oldBookings.length} items</span>
            </div>
            <button 
              onClick={handleClearOldData}
              disabled={isProcessing || oldBookings.length === 0}
              className="w-full mt-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {isProcessing 
                ? (language === 'TH' ? 'กำลังดำเนินการ...' : 'Processing...') 
                : (language === 'TH' ? 'ยืนยันการล้างข้อมูลทิ้ง' : 'Confirm Delete Old Data')}
            </button>
          </div>

        </div>

        {/* Monthly File Storage & Retrieval Section */}
        <div className="mt-8 border border-slate-200 p-6 rounded-2xl bg-slate-50/50 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">📁</span>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {language === 'TH' ? 'ระบบจัดเก็บและกู้คืนข้อมูลรายเดือน (Monthly Archive Storage & Retrieval)' : 'Monthly Archive Storage & Retrieval'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'TH' 
                  ? 'เลือกปี/เดือน เพื่อสำรองข้อมูลรายเดือนเป็นไฟล์ JSON หรืออัปโหลดไฟล์ที่บันทึกไว้กลับเข้าระบบ' 
                  : 'Select Month & Year to backup records to JSON or upload backup files to restore them.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                {language === 'TH' ? 'เลือกปี ค.ศ.' : 'Select Year'}
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-indigo-500/25"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                {language === 'TH' ? 'เลือกเดือน' : 'Select Month'}
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 p-2 rounded text-xs focus:ring-2 focus:ring-indigo-500/25"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {language === 'TH' 
                      ? new Date(2026, m - 1).toLocaleDateString('th-TH', { month: 'long' })
                      : new Date(2026, m - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white border border-slate-200 p-2 rounded text-xs text-slate-700 font-mono flex justify-between items-center h-[38px]">
              <span>{language === 'TH' ? 'ยอดจองในเดือนนี้:' : 'Month Bookings:'}</span>
              <span className="font-bold text-indigo-600">{monthlyBookings.length} items</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleExportMonthlyJSON}
              disabled={monthlyBookings.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {language === 'TH' ? `ส่งออกข้อมูลเดือน ${targetYearMonth} (JSON)` : `Export ${targetYearMonth} JSON`}
            </button>

            <div className="flex-1 relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportMonthlyJSON}
                disabled={isImporting}
                className="hidden"
                id="monthly-json-upload-input"
              />
              <label
                htmlFor="monthly-json-upload-input"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow hover:shadow-md transition-all active:scale-95 cursor-pointer text-center select-none"
              >
                <span>📤</span>
                {isImporting 
                  ? (language === 'TH' ? 'กำลังนำเข้าและบันทึก...' : 'Importing & Restoring...') 
                  : (language === 'TH' ? 'กู้คืน / นำเข้าไฟล์รายเดือน (Import JSON)' : 'Import & Restore Month (JSON)')}
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 border border-amber-200 bg-amber-50 p-4 rounded-xl flex items-start gap-4 text-amber-900">
           <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
           <p className="text-sm">
             <strong>{language === 'TH' ? 'คำแนะนำ' : 'Administrator Guidance'}:</strong>{' '}
             {language === 'TH' 
               ? 'เพื่อป้องกันข้อมูลสูญหายแบบถาวร รบกวนกด Export ข้อมูลเป็นไฟล์ CSV ก่อนทำการล้างข้อมูลบนระบบทุกครั้ง ข้อมูลที่ถูกล้างจะไม่สามารถกู้คืนได้' 
               : 'To prevent permanent loss of historical clinical data, ALWAYS mandate an export into a local CSV backup before triggering the Purge command.'}
           </p>
        </div>
      </div>

      {/* Custom Clear Old Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full flex flex-col overflow-hidden animate-scale-up">
            <div className="p-5 bg-red-50 border-b border-red-100/60 flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-red-950 uppercase tracking-tight">
                  {language === 'TH' ? 'ยืนยันการล้างข้อมูลคิวจองยา' : 'Confirm Historical Ledger Purge'}
                </h3>
                <p className="text-[10px] text-red-600 font-medium mt-0.5">
                  Count: {oldBookings.length} records (&gt;6 months old)
                </p>
              </div>
            </div>

            <div className="p-6 space-y-3 text-xs leading-relaxed text-slate-600 font-sans">
              <p className="font-semibold text-rose-700 text-xs">
                {language === 'TH'
                  ? '⚠️ คำเตือนสำคัญ: การดำเนินการลบข้อมูลคิวจองที่เก่ากว่า 6 เดือนนี้ ไม่สามารถย้อนกลับได้!'
                  : '⚠️ CRITICAL WARNING: This purge operation is permanent and cannot be undone!'}
              </p>
              <p>
                {language === 'TH'
                  ? `คุณกำลังจะลบข้อมูลคิวการจองและบันทึกผู้ป่วยที่เก่ากว่า 6 เดือน ทั้งหมดจำนวน ${oldBookings.length} รายการออกอย่างถาวร กรุณาตรวจสอบว่าคุณได้ทำการดาวน์โหลดไฟล์สำรองข้อมูล (CSV) ไว้เรียบร้อยแล้ว`
                  : `You are about to permanently clear all ${oldBookings.length} historical bookings and patient drug queue records older than 6 months. Please guarantee you have executed a backup export (CSV) first.`}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
              >
                {language === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeClearOldData}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md hover:shadow-lg active:scale-95 duration-150 cursor-pointer"
              >
                {language === 'TH' ? 'ยืนยันล้างข้อมูลถาวร' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
