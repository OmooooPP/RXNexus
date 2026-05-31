import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Database, Download, AlertTriangle, Trash2, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';

export default function DatabaseMaintenance() {
  const { bookings, language, spawnAlert, currentUser } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter 6 month old bookings
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const oldBookings = bookings.filter((b) => {
    // If it doesn't have a date of use, or is older than 6 months
    if (!b.dateOfUse) return false;
    const bookingDate = new Date(b.dateOfUse);
    return bookingDate < sixMonthsAgo;
  });

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

    const confirmClear = window.confirm(
      language === 'TH' 
        ? `ยืนยันการลบข้อมูลที่เก่ากว่า 6 เดือน จำนวน ${oldBookings.length} รายการใช่หรือไม่?\n\nโปรดตรวจสอบว่าได้ทำการ Export File ไว้เรียบร้อยแล้ว`
        : `Are you sure you want to delete ${oldBookings.length} records older than 6 months?\n\nPlease ensure you have exported a CSV backup before proceeding.`
    );

    if (!confirmClear) return;
    
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
                ? 'ลบข้อมูลรายการจองยาที่มี Date of Use เกิน 6 เดือนย้อนหลัง ដើម្បីประหยัดพื้นที่จัดเก็บบน Cloud (คำเตือน: โปรดทำการ Export ก่อนลบ)'
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
    </div>
  );
}
