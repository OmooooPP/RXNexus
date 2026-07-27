import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { BookingMedication, Drug } from '../types';
import { Plus, Trash, Image as ImageIcon, CheckCircle, Search, HelpCircle, X, Printer, Check, Copy, ChevronDown, ZoomIn, ZoomOut, RotateCcw, Maximize2, Eye } from 'lucide-react';
import { printElementByNewWindow } from '../utils/print';
import { compressImage } from '../utils/imageCompressor';

const PREDEFINED_DEPARTMENTS = [
  {
    value: 'Oncology',
    nameEN: 'Oncology',
    nameTH: 'Oncology (แผนกมะเร็งวิทยา)',
    relatedKeywords: ['oncology', 'onco', 'cancer', 'chemo', 'เคมีบำบัด', 'มะเร็ง', 'คีโม', 'เนื้องอก', 'รังสี', 'onco']
  },
  {
    value: 'Internal Medicine',
    nameEN: 'Internal Medicine',
    nameTH: 'Internal Medicine (แผนกอายุรกรรม)',
    relatedKeywords: ['medicine', 'med', 'internal', 'อายุรกรรม', 'อายุรแพทย์', 'โรคทั่วไป', 'ความดัน', 'เบาหวาน', 'เมด']
  },
  {
    value: 'Pediatrics',
    nameEN: 'Pediatrics',
    nameTH: 'Pediatrics (แผนกกุมารเวชกรรม)',
    relatedKeywords: ['pediatrics', 'peds', 'child', 'ped', 'กุมาร', 'เด็ก', 'ทารก', 'วัคซีนเด็ก', 'พีท']
  },
  {
    value: 'Surgery',
    nameEN: 'Surgery',
    nameTH: 'Surgery (แผนกศัลยกรรม)',
    relatedKeywords: ['surgery', 'surgeon', 'sx', 'ผ่าตัด', 'ศัลยกรรม', 'แผล', 'อุบัติเหตุ', 'ศัลย์', 'ศัล']
  },
  {
    value: 'OB-GYN',
    nameEN: 'OB-GYN',
    nameTH: 'OB-GYN (แผนกสูติ-นรีเวชกรรม)',
    relatedKeywords: ['obgyn', 'ob-gyn', 'obstetrics', 'gynecology', 'pregnancy', 'สูติ', 'นรีเวช', 'คลอด', 'ตั้งครรภ์', 'ฝากครรภ์', 'ผู้หญิง', 'ทำคลอด']
  },
  {
    value: 'Cardiology',
    nameEN: 'Cardiology',
    nameTH: 'Cardiology (แผนกโรคหัวใจ)',
    relatedKeywords: ['cardiology', 'cardio', 'heart', 'หัวใจ', 'โรคหัวใจ', 'สวนหัวใจ', 'คาร์ดิโอ']
  },
  {
    value: 'Orthopedics',
    nameEN: 'Orthopedics',
    nameTH: 'Orthopedics (แผนกกระดูกและข้อ)',
    relatedKeywords: ['orthopedics', 'ortho', 'bone', 'joint', 'กระดูก', 'ข้อ', 'กล้ามเนื้อ', 'หัก', 'เฝือก', 'ออร์โธ']
  },
  {
    value: 'Emergency Medicine',
    nameEN: 'Emergency Medicine',
    nameTH: 'Emergency Medicine (แผนกฉุกเฉิน / ER)',
    relatedKeywords: ['emergency', 'er', 'accident', 'ฉุกเฉิน', 'อุบัติเหตุ', 'ด่วน', 'อีอาร์']
  },
  {
    value: 'OPD',
    nameEN: 'OPD',
    nameTH: 'OPD (แผนกผู้ป่วยนอก)',
    relatedKeywords: ['opd', 'ผู้ป่วยนอก', 'ตรวจโรคทั่วไป', 'ซักประวัติ', 'โอพีดี']
  },
  {
    value: 'IPD',
    nameEN: 'IPD',
    nameTH: 'IPD (แผนกผู้ป่วยใน)',
    relatedKeywords: ['ipd', 'ผู้ป่วยใน', 'นอนโรงพยาบาล', 'แอดมิท', 'admit', 'วอร์ด', 'ward', 'ไอพีดี']
  },
  {
    value: 'Dermatology',
    nameEN: 'Dermatology',
    nameTH: 'Dermatology (แผนกโรคผิวหนัง)',
    relatedKeywords: ['dermatology', 'derm', 'skin', 'ผิวหนัง', 'สิว', 'ผื่น', 'เลเซอร์', 'เดิร์ม']
  },
  {
    value: 'Ophthalmology',
    nameEN: 'Ophthalmology',
    nameTH: 'Ophthalmology (แผนกจักษุวิทยา)',
    relatedKeywords: ['ophthalmology', 'eye', 'vision', 'ตา', 'จักษุ', 'แว่นตา', 'ต้อกระจก', 'หมอตา']
  },
  {
    value: 'ENT',
    nameEN: 'ENT',
    nameTH: 'ENT (แผนกหู คอ จมูก)',
    relatedKeywords: ['ent', 'otolaryngology', 'ear', 'nose', 'throat', 'หู', 'คอ', 'จมูก', 'ไซนัส', 'อีเอ็นที']
  },
  {
    value: 'Psychiatry',
    nameEN: 'Psychiatry',
    nameTH: 'Psychiatry (แผนกจิตเวช)',
    relatedKeywords: ['psychiatry', 'psychiatrist', 'mental', 'จิตเวช', 'จิตแพทย์', 'ซึมเศร้า', 'เครียด', 'นอนไม่หลับ', 'จิต']
  }
];

interface BookingFormProps {
  key?: string | number;
  editId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BookingForm({ editId, onSuccess, onCancel }: BookingFormProps) {
  const {
    currentUser,
    drugs,
    bookings,
    language,
    createBooking,
    updateBooking,
    fetchDrugs,
    setSelectedPharmacyLocation,
    spawnAlert
  } = useApp();

  const t = i18n[language];
  const isNurse = currentUser?.role === 'Nurse';

  // Load existing data if edit mode
  const isEdit = !!editId;
  const existingRecord = editId ? bookings.find(b => b.id === editId) : null;

  // Initialize States
  const [mode, setMode] = useState<'General' | 'Oncology'>(existingRecord ? existingRecord.mode : 'General');
  const [hn, setHn] = useState(existingRecord ? existingRecord.hn : '');
  const [patientName, setPatientName] = useState(existingRecord ? existingRecord.patientName : '');
  const [dateOfUse, setDateOfUse] = useState(existingRecord ? existingRecord.dateOfUse : new Date().toISOString().split('T')[0]);
  const [bookingDate, setBookingDate] = useState(existingRecord ? existingRecord.bookingDate : new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState(existingRecord ? existingRecord.department : '');
  const [pharmacyLocation, setPharmacyLocation] = useState(existingRecord ? existingRecord.pharmacyLocation || '' : '');
  const [patientType, setPatientType] = useState<'employee' | 'opd' | 'ipd' | 'it'>(
    existingRecord && existingRecord.medications.length > 0 
      ? existingRecord.medications[0].priceType 
      : 'opd'
  );
  const [regimen, setRegimen] = useState(existingRecord ? existingRecord.regimen || '' : '');
  const [note, setNote] = useState(existingRecord ? existingRecord.note || '' : '');

  // Search and select department states
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  const dynamicDepts = useMemo(() => {
    return Array.from(new Set(
      (bookings || [])
        .map(b => b.department)
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    ));
  }, [bookings]);

  const allDeptOptions = useMemo(() => {
    const result = [...PREDEFINED_DEPARTMENTS];
    dynamicDepts.forEach(dept => {
      const lowerDept = dept.toLowerCase();
      const exists = PREDEFINED_DEPARTMENTS.some(pd => 
        pd.value.toLowerCase() === lowerDept ||
        pd.nameEN.toLowerCase() === lowerDept ||
        pd.nameTH.toLowerCase() === lowerDept
      );
      if (!exists) {
        result.push({
          value: dept,
          nameEN: dept,
          nameTH: dept,
          relatedKeywords: [dept.toLowerCase()]
        });
      }
    });
    return result;
  }, [dynamicDepts]);

  const filteredDepartments = useMemo(() => {
    if (!deptSearchQuery.trim()) {
      return allDeptOptions;
    }
    const query = deptSearchQuery.toLowerCase();
    return allDeptOptions.filter(dept => 
      dept.nameEN.toLowerCase().includes(query) ||
      dept.nameTH.toLowerCase().includes(query) ||
      dept.relatedKeywords.some(kw => kw.toLowerCase().includes(query))
    );
  }, [allDeptOptions, deptSearchQuery]);

  // Sync department with search query on mount or edit or language changes
  useEffect(() => {
    if (department) {
      const matched = PREDEFINED_DEPARTMENTS.find(d => d.value === department);
      if (matched) {
        setDeptSearchQuery(language === 'TH' ? matched.nameTH : matched.nameEN);
      } else {
        setDeptSearchQuery(department);
      }
    } else {
      setDeptSearchQuery('');
    }
  }, [department, language]);

  // Dynamic compilation of previous clinical team entries across all bookings for seamless auto-suggestion/memory
  const dynamicBookedDoctors = Array.from(new Set(
    (bookings || [])
      .map(b => b.staff?.doctor)
      .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
  ));

  const dynamicBookedNurses = Array.from(new Set(
    (bookings || [])
      .map(b => b.staff?.nurse)
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
  ));

  const dynamicBookedPharmacists = Array.from(new Set(
    (bookings || [])
      .map(b => b.staff?.pharmacist)
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
  ));

  // Suggested Staff Lists (combining past typed entries with defaults)
  const suggestedDoctors = Array.from(new Set([
    ...dynamicBookedDoctors,
    'Dr. Gregory House',
    'Dr. Sarah Smith',
    'Dr. Preeyapat Pong',
    'Dr. Somchai Dee',
    'Dr. Michael Scott',
    'Dr. Lisa Cuddy'
  ]));

  const suggestedNurses = Array.from(new Set([
    ...dynamicBookedNurses,
    'Nurse Clara Barton',
    'Nurse Joy',
    'Nurse Florence Nightingale',
    'Nurse Somsri Permpun',
    'Nurse Preeya Pong'
  ]));

  const suggestedPharmacists = Array.from(new Set([
    ...dynamicBookedPharmacists,
    'Dr. Sarah Smith (Pharmacist)',
    'Pharmacist John Doe'
  ]));

  const [doctor, setDoctor] = useState(existingRecord ? existingRecord.staff.doctor : '');
  const [nurse, setNurse] = useState(existingRecord ? existingRecord.staff.nurse : '');
  const [pharmacist, setPharmacist] = useState(existingRecord ? existingRecord.staff.pharmacist : '');

  // Booking Medications
  const [selectedMeds, setSelectedMeds] = useState<BookingMedication[]>(
    existingRecord ? existingRecord.medications : []
  );

  // Active Dropdowns state in specific lines
  const [drugSearchQuery, setDrugSearchQuery] = useState<string>('');
  const [activeDrugId, setActiveDrugId] = useState<string>('');
  const [activeQty, setActiveQty] = useState<number>(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // File Upload Progress
  const [imageEncoded, setImageEncoded] = useState<string>(existingRecord ? existingRecord.prescriptionImage : '');
  const [uploadBar, setUploadBar] = useState<number>(-1); // -1 is idle
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [modalZoom, setModalZoom] = useState<number>(1);

  const [validationError, setValidationError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [bookedReceipt, setBookedReceipt] = useState<any | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch latest drug directory
  useEffect(() => {
    fetchDrugs();
  }, []);

  // Search picker classification mode (inherits booking mode but can be toggled independently)
  const [pickerDrugType, setPickerDrugType] = useState<'General' | 'Oncology'>(mode);

  // Sync with booking mode when booking mode changes
  useEffect(() => {
    setPickerDrugType(mode);
  }, [mode]);

  // Automatically detect and set the booking mode based on the medications added
  useEffect(() => {
    if (selectedMeds.length > 0) {
      const hasOncology = selectedMeds.some((med) => {
        const matchingDrug = drugs.find((d) => d.id === med.drugId);
        return matchingDrug?.type === 'Oncology';
      });
      setMode(hasOncology ? 'Oncology' : 'General');
    }
  }, [selectedMeds, drugs]);

  const allActiveDrugs = drugs.filter((d) => !d.deleteRequested);

  // Search across ALL categories dynamically
  const filteredDrugsBySearch = allActiveDrugs.filter((d) => {
    if (drugSearchQuery) {
      return (
        d.name.toLowerCase().includes(drugSearchQuery.toLowerCase()) ||
        d.stockCode.toLowerCase().includes(drugSearchQuery.toLowerCase())
      );
    }
    return true; // List all active drugs when no search query
  });

  // Query selected drug obj
  const selectedDrugObj = allActiveDrugs.find((d) => d.id === activeDrugId);

  // HN automatic formatted text watcher: 02-xx-xxxxxx
  const handleHNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, ''); // strip out non-digits
    
    // Auto-prefix with "02" if they typed something else, or keep "02"
    if (raw.length > 0 && !raw.startsWith('02')) {
      if (raw.length < 2) {
        raw = '02' + raw;
      } else {
        raw = '02' + raw.substring(2);
      }
    }
    
    if (raw.length > 10) raw = raw.substring(0, 10); // cap at 10 digits total

    // apply grouping 02-xx-xxxxxx
    let formatted = '';
    if (raw.length > 0) {
      formatted += raw.substring(0, 2);
    }
    if (raw.length > 2) {
      formatted += '-' + raw.substring(2, 4);
    }
    if (raw.length > 4) {
      formatted += '-' + raw.substring(4, 10);
    }
    setHn(formatted);
  };

  // Image Upload and Encode pipeline with automatic Firestore-safe compression
  const processPrescriptionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      spawnAlert(language === 'TH' ? 'ขนาดไฟล์ใหญ่เกินขีดจำกัด โปรดอัปโหลดไฟล์ที่มีขนาดไม่เกิน 25MB' : 'File size exceeds safety capacity. Limit uploading to 25MB.', 'info');
      return;
    }

    setUploadBar(10);
    const timer = setInterval(() => {
      setUploadBar((prev) => (prev >= 90 ? 90 : prev + 15));
    }, 80);

    try {
      const compressed = await compressImage(file, 1200, 1200, 0.75);
      setImageEncoded(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      clearInterval(timer);
      setUploadBar(100);
      setTimeout(() => setUploadBar(-1), 400);
    }
  };

  // Drag and drop processing
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      spawnAlert(language === 'TH' ? 'รองรับเฉพาะไฟล์รูปภาพใบสั่งยาเท่านั้น' : 'Only scan/image-based Rx files are supported.', 'info');
      return;
    }

    setUploadBar(20);
    const timer = setInterval(() => {
      setUploadBar((prev) => (prev >= 90 ? 90 : prev + 20));
    }, 80);

    try {
      const compressed = await compressImage(file, 1200, 1200, 0.75);
      setImageEncoded(compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      clearInterval(timer);
      setUploadBar(100);
      setTimeout(() => setUploadBar(-1), 400);
    }
  };

  // Live total sum recalculator based on price matrix
  const updatePricesForSelectedType = (newType: 'employee' | 'opd' | 'ipd' | 'it') => {
    setPatientType(newType);
    setSelectedMeds((prev) =>
      prev.map((med) => {
        const matchingDrug = drugs.find((d) => d.id === med.drugId);
        if (!matchingDrug) return med;
        const unitPrice = matchingDrug.prices[newType];
        return {
          ...med,
          priceType: newType,
          unitPrice,
          totalPrice: unitPrice * med.quantity
        };
      })
    );
  };

  // Add prescription line
  const handleAddMedItem = () => {
    if (!activeDrugId) return;

    const drug = drugs.find((d) => d.id === activeDrugId);
    if (!drug) return;

    // Prevent duplicates in lines
    const alreadyExists = selectedMeds.find((item) => item.drugId === activeDrugId);
    if (alreadyExists) {
      setSelectedMeds((prev) =>
        prev.map((item) => {
          if (item.drugId === activeDrugId) {
            const newQty = item.quantity + activeQty;
            return {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty
            };
          }
          return item;
        })
      );
    } else {
      const unitPrice = drug.prices[patientType];
      const newItem: BookingMedication = {
        drugId: drug.id,
        drugName: drug.name,
        stockCode: drug.stockCode,
        quantity: activeQty,
        priceType: patientType,
        unitPrice,
        totalPrice: unitPrice * activeQty
      };
      setSelectedMeds((prev) => [...prev, newItem]);
    }

    // Reset drug picker state
    setActiveDrugId('');
    setDrugSearchQuery('');
    setActiveQty(1);
  };

  // Delete prescription line
  const handleRemoveMedItem = (drugId: string) => {
    setSelectedMeds((prev) => prev.filter((item) => item.drugId !== drugId));
  };

  // Grand total summary
  const grandTotal = selectedMeds.reduce((sum, item) => sum + item.totalPrice, 0);

  // Perform safe system reservation submit
  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMsg('');

    // Strict validation guidelines
    if (!hn || !patientName || !doctor) {
      setValidationError(t.requiredFields);
      return;
    }

    // HN length check
    if (hn.replace(/\D/g, '').length !== 10) {
      setValidationError(t.hnFormatError);
      return;
    }

    if (selectedMeds.length === 0) {
      setValidationError(t.noMeds);
      return;
    }

    let finalPrescriptionImage = imageEncoded;
    if (finalPrescriptionImage && finalPrescriptionImage.length > 400000) {
      try {
        finalPrescriptionImage = await compressImage(finalPrescriptionImage, 1000, 1000, 0.70);
      } catch (err) {
        console.error('Failed to compress image before submit:', err);
      }
    }

    const payload = {
      hn,
      patientName: patientName.trim(),
      bookingDate,
      dateOfUse,
      department: department.trim(),
      pharmacyLocation: pharmacyLocation.trim(),
      mode,
      medications: selectedMeds,
      totalAmount: grandTotal,
      prescriptionImage: finalPrescriptionImage,
      regimen: regimen.trim(),
      note: note.trim(),
      staff: {
        doctor,
        nurse,
        pharmacist,
        creatorName: currentUser?.name || 'Staff'
      }
    };

    if (isEdit) {
      const result = await updateBooking(editId, payload);
      if (result.success) {
        setSuccessMsg('Record systematically synced and updated!');
        if (onSuccess) onSuccess();
      } else {
        setValidationError(result.error || 'System Sync Fail');
      }
    } else {
      const result = await createBooking(payload);
      if (result.success) {
        setSuccessMsg('Medical reservation ledger created!');
        // Save the detailed response to show the Success window tab modal
        setBookedReceipt(result.booking || { ...payload, id: `RXN-${Date.now()}` });
        // Clear forms
        setHn('');
        setPatientName('');
        setBookingDate(new Date().toISOString().split('T')[0]);
        setPharmacyLocation('');
        setSelectedMeds([]);
        setImageEncoded('');
        setRegimen('');
        setNote('');
      } else {
        setValidationError(result.error || 'System Creation Fail');
      }
    }
  };

  return (
    <>
      <form onSubmit={handleCommitSubmit} className="space-y-6 pb-40 md:pb-0">
      {/* Title */}
      <div className="flex border-b border-slate-200 pb-3 justify-between items-center bg-slate-50 p-4 rounded-xl">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-tight text-slate-800 font-sans">
            {isEdit ? t.formEditTitle : t.formTitle}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            RxNexus Zero Data Loss Patient Safety Standard
          </p>
        </div>
        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${mode === 'Oncology' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
          {mode === 'Oncology' ? t.modeOncology : t.modeGeneral}
        </span>
      </div>

      {/* Grid of basic patient identification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
            {t.patientDetails}
          </h3>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.hn} *</label>
          <input
            id="hn-input"
            type="text"
            required
            value={hn}
            onChange={handleHNChange}
            placeholder={t.hnPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg text-xs md:text-sm font-mono font-bold focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
          <p className="text-[10px] text-slate-400 mt-1">Format auto-spaced: 02-xx-xxxxxx</p>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.patientName} *</label>
          <input
            id="patient-name-input"
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder={t.patientNamePlaceholder}
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg text-xs md:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.dateOfUse} *</label>
          <input
            id="date-of-use-input"
            type="date"
            required
            value={dateOfUse}
            onChange={(e) => setDateOfUse(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg text-xs md:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="relative">
          <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.department} *</label>
          <div className="relative" id="department-select-container">
            <div className="relative flex items-center">
              <input
                id="department-input"
                type="text"
                required
                value={deptSearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setDeptSearchQuery(val);
                  setDepartment(val);
                }}
                onFocus={() => setIsDeptDropdownOpen(true)}
                onBlur={() => {
                  // Slight delay to allow option onMouseDown event to register
                  setTimeout(() => setIsDeptDropdownOpen(false), 220);
                }}
                placeholder={language === 'TH' ? 'พิมพ์ค้นหาแผนก เช่น Oncology, อายุรกรรม, มะเร็ง, หัวใจ' : 'Search department e.g. Oncology, Med, Heart'}
                className="w-full bg-slate-50 border border-slate-200 pl-3 pr-10 py-2 md:py-2.5 rounded-lg text-xs md:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white font-medium"
                autoComplete="off"
              />
              
              <div className="absolute right-2.5 flex items-center gap-1">
                {deptSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeptSearchQuery('');
                      setDepartment('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isDeptDropdownOpen && (
              <div className="absolute left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-100 custom-mini-scroll animate-fade-in">
                {filteredDepartments.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400/80">
                    {language === 'TH' ? '❌ ไม่พบข้อมูลแผนก กดเพื่อใช้คำนี้' : '❌ No matching departments, click to use typed text'}
                  </div>
                ) : (
                  filteredDepartments.map((dept) => (
                    <div
                      key={dept.value}
                      onMouseDown={() => {
                        setDepartment(dept.value);
                        setDeptSearchQuery(language === 'TH' ? dept.nameTH : dept.nameEN);
                        setIsDeptDropdownOpen(false);
                      }}
                      className={`p-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors text-left font-sans ${
                        department === dept.value ? 'bg-blue-50 font-bold text-blue-800' : ''
                      }`}
                    >
                      <div className="font-bold text-slate-800">{language === 'TH' ? dept.nameTH : dept.nameEN}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-1">
                        <span className="font-semibold text-slate-500">
                          {language === 'TH' ? 'คำที่เกี่ยวข้อง:' : 'Keywords:'}
                        </span>
                        {dept.relatedKeywords.slice(0, 5).map((kw, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-600 px-1 rounded text-[9px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {!isNurse ? (
          <div>
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.pharmacyLocation}</label>
            <select
              id="pharmacy-location-select"
              value={pharmacyLocation}
              onChange={(e) => {
                const val = e.target.value;
                setPharmacyLocation(val);
                if (val) {
                  setSelectedPharmacyLocation(val);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg text-xs md:text-sm font-medium focus:outline-hidden focus:border-blue-500 focus:bg-white"
            >
              <option value="">{t.pharmacyLocationPlaceholder}</option>
              <option value="Phar IV">Phar IV</option>
              <option value="Phar A1">Phar A1</option>
              <option value="Phar E3">Phar E3</option>
              <option value="Phar E6">Phar E6</option>
              <option value="Phar D">Phar D</option>
            </select>
          </div>
        ) : (
          <div className="hidden"></div>
        )}

        <div className="col-span-1 md:col-span-2">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">{t.patientType}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['employee', 'opd', 'ipd', 'it'] as const).map((type) => {
              const labelMap = {
                employee: t.typeEmployee,
                opd: t.typeOPD,
                ipd: t.typeIPD,
                it: t.typeIT
              };
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => updatePricesForSelectedType(type)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                    patientType === type
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {labelMap[type]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Regimen Text Input */}
        <div>
          <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.regimen}</label>
          <input
            id="regimen-input"
            type="text"
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
            placeholder={language === 'TH' ? 'ระบุสูตรเคมีบำบัด / สูตรยา เช่น FOLFOX' : 'e.g., FOLFOX, AC-T, etc.'}
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg text-xs md:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white font-semibold"
          />
        </div>

        {/* Note Text Input */}
        <div>
          <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.note}</label>
          <input
            id="note-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={language === 'TH' ? 'บันทึกคำสั่งหรือข้อควรระวังเพิ่มเติม' : 'Special clinical directions or prep notes'}
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg text-xs md:text-sm focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Medication Lists */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 md:space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
          {t.medTitle}
        </h3>

        {/* Drug picker line */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-200 items-stretch sm:items-end">
          <div className="flex-1 w-full text-left">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {t.selectDrug}
            </label>
            
            <div className="relative" id="drug-select-container">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={language === 'TH' ? 'พิมพ์ค้นหาชื่อยา หรือ รหัสเวชภัณฑ์...' : 'Search medicine name or code...'}
                  value={isDropdownOpen ? drugSearchQuery : (selectedDrugObj ? `${selectedDrugObj.name} (${selectedDrugObj.stockCode})` : drugSearchQuery)}
                  onChange={(e) => {
                    setDrugSearchQuery(e.target.value);
                    if (activeDrugId) {
                      setActiveDrugId(''); // Clear selection on typing so they have to pick from dropdown
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => {
                    // Slight delay to allow option onMouseDown event to register
                    setTimeout(() => setIsDropdownOpen(false), 205);
                  }}
                  className="w-full bg-white border border-slate-200 pl-3 pr-8 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white animate-fade-in"
                />
                
                {/* Clear button and Chevron action */}
                <div className="absolute right-2.5 flex items-center gap-1">
                  {(activeDrugId || drugSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDrugId('');
                        setDrugSearchQuery('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Suggestions Dropdown Popover */}
              {isDropdownOpen && (
                <div className="absolute left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-100 custom-mini-scroll">
                  {filteredDrugsBySearch.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400/80">
                      {language === 'TH' ? '❌ ไม่พบรายการเวชภัณฑ์ยา' : '❌ No matching medicines'}
                    </div>
                  ) : (
                    filteredDrugsBySearch.map((d) => (
                      <div
                        key={d.id}
                        onMouseDown={() => {
                          setActiveDrugId(d.id);
                          setDrugSearchQuery(d.name);
                          setPickerDrugType(d.type);
                          setMode(d.type); // Auto-detect and set the booking mode
                          setIsDropdownOpen(false);
                        }}
                        className={`p-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors text-left font-sans ${
                          activeDrugId === d.id ? 'bg-blue-50 font-bold text-blue-800' : ''
                        }`}
                      >
                        <div className="font-bold text-slate-800">{d.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                          <span>Type: <span className={`px-1 rounded text-[9px] font-bold ${d.type === 'Oncology' ? 'bg-red-150 bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{d.type}</span></span>
                          <span className="font-bold text-blue-600">฿{d.prices[patientType].toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-full sm:w-28">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {t.units}
            </label>
            <input
              id="active-qty-input"
              type="number"
              min="1"
              value={activeQty}
              onChange={(e) => setActiveQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden text-center"
            />
          </div>

          {selectedDrugObj && (
            <div className="w-full sm:w-auto px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-blue-700 self-stretch sm:self-end flex flex-col justify-center animate-fade-in min-w-[120px]">
              <span className="text-[9px] uppercase text-blue-400 font-extrabold">{language === 'TH' ? 'ราคายาจริง' : 'Price Preview'}</span>
              <div className="text-sm font-black mt-0.5">
                ฿{(selectedDrugObj.prices[patientType] || 0).toLocaleString()}
              </div>
              <span className="text-[8px] text-blue-500 font-medium">({language === 'TH' ? 'รวมยอด:' : 'Total:'} ฿{((selectedDrugObj.prices[patientType] || 0) * activeQty).toLocaleString()})</span>
            </div>
          )}

          <div className="flex items-end">
            <button
              id="add-med-btn"
              type="button"
              onClick={handleAddMedItem}
              disabled={!activeDrugId}
              className={`w-full sm:w-auto px-4 py-2 mt-1 sm:mt-0 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1 transition-all ${
                activeDrugId
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              {t.addMed}
            </button>
          </div>
        </div>

        {/* Active Grid table */}
        {selectedMeds.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            <p className="text-xs text-slate-400">{t.noMeds}</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <th className="p-3">Medicine Info</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedMeds.map((med) => (
                  <tr key={med.drugId} className="hover:bg-slate-50/55 transition-colors text-slate-700">
                    <td className="p-3 font-semibold text-slate-800">{med.drugName}</td>
                    <td className="p-3 font-semibold text-center">{med.quantity}</td>
                    <td className="p-3 text-right text-slate-500 font-semibold">฿{med.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-slate-800">฿{med.totalPrice.toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedItem(med.drugId)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Total Line */}
                <tr className="bg-blue-50/30 border-t border-slate-200 font-bold">
                  <td colSpan={3} className="p-3 text-right text-slate-600 uppercase tracking-wider">
                    {t.totalAmount}:
                  </td>
                  <td className="p-3 text-right text-blue-700 font-bold text-sm">
                    ฿{grandTotal.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Upload prescription section */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
          {t.prescriptionLogo}
        </h3>

        {/* Drag block */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 rounded-xl p-4 md:p-6 bg-slate-50 hover:bg-slate-100/50 hover:border-blue-500 transition-all text-center flex flex-col items-center justify-center cursor-pointer relative"
        >
          <input
            id="prescription-file-input"
            type="file"
            accept="image/*"
            onChange={processPrescriptionFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {imageEncoded ? (
            <div className="space-y-3 z-10 relative">
              {/* Image Container with Zoom support */}
              <div
                className="w-48 h-48 md:w-56 md:h-56 mx-auto rounded-xl overflow-hidden border-2 border-blue-200 bg-slate-900 shadow-md relative flex items-center justify-center group"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={imageEncoded}
                  alt="prescription scan"
                  className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
                  style={{ transform: `scale(${zoomLevel})` }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Zoom Controls Bar */}
              <div
                className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 shadow-xs rounded-lg p-1.5 max-w-xs mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors cursor-pointer"
                  title={language === 'TH' ? 'ย่อขนาด (Zoom Out)' : 'Zoom Out'}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-700 min-w-[42px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors cursor-pointer"
                  title={language === 'TH' ? 'ขยายขนาด (Zoom In)' : 'Zoom In'}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors cursor-pointer"
                  title={language === 'TH' ? 'รีเซ็ตขนาด (100%)' : 'Reset Zoom'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button
                  type="button"
                  onClick={() => {
                    setModalZoom(1);
                    setIsZoomModalOpen(true);
                  }}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title={language === 'TH' ? 'ขยายเต็มหน้าจอ' : 'View Fullscreen'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  {language === 'TH' ? 'ดูภาพใหญ่' : 'Expand'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 px-2">
                <p className="text-[11px] text-slate-500 font-mono">Rx_Document_Asset_Stored.png</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageEncoded('');
                    setZoomLevel(1);
                  }}
                  className="text-xs text-red-500 font-semibold hover:underline cursor-pointer"
                >
                  {language === 'TH' ? 'ลบไฟล์รูปภาพ' : 'Remove Document'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">{t.prescriptionUpload}</p>
              <p className="text-[10px] text-slate-400">PDF scans converted to digital image files inside system pipeline</p>
            </div>
          )}

          {uploadBar >= 0 && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4 rounded-xl">
              <p className="text-xs font-semibold text-blue-600 animate-pulse">{t.uploadProgress}</p>
              <div className="w-full max-w-xs mt-2 bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                <div
                  className="bg-blue-600 h-1.5 transition-all duration-100 rounded-full"
                  style={{ width: `${uploadBar}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff Signoffs */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 md:space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
          {t.staffSignoff}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.selectDoctor} *</label>
            <input
              id="doctor-input"
              type="text"
              list="doctors-list"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="e.g., Dr. Gregory House"
              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-xs md:text-sm focus:outline-hidden"
              required
            />
            <datalist id="doctors-list">
              {suggestedDoctors.map((doc) => (
                <option key={doc} value={doc} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.selectNurse}</label>
            <input
              id="nurse-input"
              type="text"
              list="nurses-list"
              value={nurse}
              onChange={(e) => setNurse(e.target.value)}
              placeholder="e.g., Nurse Clara"
              className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-xs md:text-sm focus:outline-hidden"
            />
            <datalist id="nurses-list">
              {suggestedNurses.map((nrs) => (
                <option key={nrs} value={nrs} />
              ))}
            </datalist>
          </div>

          {!isNurse ? (
            <div>
              <label className="block text-xs md:text-sm font-bold text-slate-700 mb-1.5">{t.selectPharmacist}</label>
              <input
                id="pharmacist-input"
                type="text"
                list="pharmacists-list"
                placeholder="e.g., Dr. Sarah Smith (Pharmacist)"
                value={pharmacist}
                onChange={(e) => setPharmacist(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 md:px-3 md:py-2 rounded-lg text-xs md:text-sm focus:outline-hidden"
              />
              <datalist id="pharmacists-list">
                {suggestedPharmacists.map((ph) => (
                  <option key={ph} value={ph} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="hidden"></div>
          )}
        </div>
      </div>

      {/* General Validation & Success banners */}
      {validationError && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 md:p-4 text-sm font-bold text-red-700 shadow-sm flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          {validationError}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 md:p-4 text-sm font-bold text-emerald-800 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Form Action Controls */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 w-full bg-white border-t border-slate-200 p-3 flex gap-3 md:gap-4 md:static md:w-auto md:bg-transparent md:border-none md:p-0 md:justify-end z-40">
        <div className="flex gap-3 w-full md:w-auto justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 md:flex-none px-4 py-2.5 md:px-5 md:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs md:text-sm font-bold transition-colors shadow-xs cursor-pointer"
            >
              {t.cancel}
            </button>
          )}
          <button
            id="submit-booking-form-btn"
            type="submit"
            className="flex-[2] md:flex-none px-4 py-2.5 md:px-6 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {t.submitForm}
          </button>
        </div>
      </div>
    </form>

    {/* Booking Success Receipt Window Tab Modal Overlay */}
    {bookedReceipt && (
      <div id="booking-success-tab-overlay" className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in text-slate-700">
        <div id="booking-receipt-printable" className="bg-white rounded-2xl border border-emerald-100 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden leading-relaxed my-auto">
          {/* Elegant Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-100 text-center relative flex flex-col items-center">
            <div className="w-12 h-12 bg-emerald-100 font-bold rounded-full flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-emerald-800">
              {language === 'TH' ? 'สำรองเวชภัณฑ์ยาสำเร็จแล้ว' : 'Medication Reserved Successfully'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'TH' ? 'หลักฐานการจองสิทธิ์ทำรายการยา (Real-time Ledger)' : 'Official clinical ledger reservation proof'}
            </p>
            <button
              type="button"
              onClick={() => {
                setBookedReceipt(null);
                if (onSuccess) onSuccess();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-mono text-sm hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer print:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Receipt Summary Body */}
          <div className="p-6 space-y-4 text-xs">
            <div className="bg-emerald-50/40 border border-emerald-100 px-4 py-3 rounded-xl flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">{language === 'TH' ? 'หมายเลขใบสำรอง' : 'Booking Ledger Code'}</span>
                <span className="text-[13px] font-black text-emerald-950 block">{bookedReceipt.id}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(bookedReceipt.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer print:hidden"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copied ? (language === 'TH' ? 'คัดลอกแล้ว' : 'Copied!') : (language === 'TH' ? 'คัดลอกรหัส' : 'Copy Code')}
              </button>
            </div>

            {/* Patient and Hospital Details */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <span className="block text-slate-400 text-[9px] uppercase font-bold">{language === 'TH' ? 'เลขที่ HN ของผู้ป่วย' : 'Hospital Number (HN)'}</span>
                <span className="font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap inline-block">{bookedReceipt.hn}</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-slate-400 text-[9px] uppercase font-bold">{language === 'TH' ? 'ชื่อ-นามสกุล ของผู้ป่วย' : 'Patient Full Name'}</span>
                <span className="font-bold text-slate-800 text-[11px]">{bookedReceipt.patientName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-slate-400 text-[9px] uppercase font-bold">{language === 'TH' ? 'แผนก / เครือข่าย' : 'Department Name'}</span>
                <span className="text-slate-700 font-medium text-[11px]">{bookedReceipt.department}</span>
              </div>
              <div className="space-y-0.5">
                <span className="block text-slate-400 text-[9px] uppercase font-bold">{language === 'TH' ? 'หมวดหมู่การสำรอง' : 'Classification Mode'}</span>
                <span className={`inline-block font-extrabold uppercase text-[9px] ${bookedReceipt.mode === 'Oncology' ? 'text-red-650 text-red-600' : 'text-blue-650 text-blue-600'}`}>{bookedReceipt.mode}</span>
              </div>
              {bookedReceipt.regimen && (
                <div className="space-y-0.5 col-span-2 border-t border-slate-200/60 pt-2.5">
                  <span className="block text-indigo-500 text-[9px] uppercase font-black tracking-wider">{language === 'TH' ? 'สูตรเคมีบำบัด / สูตรยา (Regimen)' : 'Treatment Regimen'}</span>
                  <span className="font-bold text-indigo-950 text-[11px] bg-indigo-50 px-2 py-1 rounded-sm border border-indigo-100/55 inline-block">{bookedReceipt.regimen}</span>
                </div>
              )}
              {bookedReceipt.note && (
                <div className="space-y-0.5 col-span-2 border-t border-slate-200/60 pt-2.5">
                  <span className="block text-slate-400 text-[9px] uppercase font-bold">{language === 'TH' ? 'หมายเหตุเพิ่มเติม' : 'Special Notes'}</span>
                  <span className="text-slate-600 text-[11px] block whitespace-pre-wrap">{bookedReceipt.note}</span>
                </div>
              )}
            </div>

            {/* Medications Table List */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{language === 'TH' ? 'รายการเวชภัณฑ์ยาที่ทำการสำรอง' : 'Reserved Medications Itemization'}</div>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse bg-slate-50/50">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-500 uppercase tracking-wider text-[9px] font-bold border-b border-slate-100">
                      <th className="p-2.5">{language === 'TH' ? 'รายละเอียดเวชภัณฑ์' : 'Medicine Info'}</th>
                      <th className="p-2.5 text-center">{language === 'TH' ? 'จำนวน' : 'Qty'}</th>
                      <th className="p-2.5 text-right">{language === 'TH' ? 'รวมสุทธิ' : 'Subtotal'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-101 text-slate-600 text-[10px]">
                    {bookedReceipt.medications?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-100/30">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-800 text-[11px]">{item.drugName}</div>
                          <div className="text-[8px] text-slate-450 font-bold">{item.stockCode} • {item.priceType ? item.priceType.toUpperCase() : 'General'}</div>
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-700">{item.quantity}</td>
                        <td className="p-2.5 text-right font-bold text-indigo-950">฿{(item.totalPrice ?? item.subtotal ?? (item.unitPrice ? item.unitPrice * item.quantity : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Summary Row */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-[11px] uppercase font-bold text-slate-500">{language === 'TH' ? 'ราคารวมสุทธิค่าเวชภัณฑ์' : 'Grand Total Amount Due'}</span>
              <span className="text-sm font-black text-rose-600">฿{(bookedReceipt.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
            </div>

            {/* Security and Operator Stamp */}
            <div className="text-[9px] text-slate-400 border-t border-dashed border-slate-200 pt-3 flex items-center justify-between">
              <span>{language === 'TH' ? 'ผู้ทำคิวแพทย์:' : 'Booked By:'} <strong className="text-slate-500">{bookedReceipt.staff?.creatorName || bookedReceipt.staff?.creatorId || 'Clinician Staff'}</strong></span>
              <span className="text-emerald-500 flex items-center gap-1 font-bold">● {language === 'TH' ? 'ประทับตราจองเรียบร้อย' : 'Ledger Verified Signed'}</span>
            </div>
          </div>

          {/* Done Action */}
          <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3.5 print:hidden">
            <button
              type="button"
              onClick={() => {
                printElementByNewWindow('booking-receipt-printable', 'Medication_Reservation_Ledger_' + bookedReceipt.id);
              }}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              {language === 'TH' ? 'พิมพ์ใบรายการ' : 'Print Receipt'}
            </button>
            <button
              type="button"
              onClick={() => {
                setBookedReceipt(null);
                if (onSuccess) onSuccess();
              }}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-lg transition-all shadow-md cursor-pointer hover:shadow-lg animate-pulse"
            >
              {language === 'TH' ? 'เสร็จสิ้นการสำรองยา' : 'Close & Proceed'}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Lightbox Zoom Modal for Prescription Scan */}
      {isZoomModalOpen && imageEncoded && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-4 transition-all animate-fade-in"
          onClick={() => setIsZoomModalOpen(false)}
        >
          {/* Modal Header Controls */}
          <div
            className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                {language === 'TH' ? 'รูปภาพใบสั่งยาต้นฉบับ (Prescription Scan Viewer)' : 'Prescription Scan Fullscreen Viewer'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setModalZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-md text-slate-200 transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono font-bold text-blue-400 min-w-[45px] text-center text-xs">
                  {Math.round(modalZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setModalZoom((prev) => Math.min(4, prev + 0.25))}
                  className="p-1.5 hover:bg-slate-700 rounded-md text-slate-200 transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setModalZoom(1)}
                  className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title="Reset (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
              >
                <X className="w-4 h-4" />
                {language === 'TH' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>

          {/* Scrollable / Zoomable Image Canvas */}
          <div
            className="flex-1 w-full max-w-5xl my-4 overflow-auto flex items-center justify-center relative rounded-2xl bg-slate-900/50 border border-slate-800/80 p-4"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setModalZoom((prev) => Math.min(4, prev + 0.2));
              } else {
                setModalZoom((prev) => Math.max(0.5, prev - 0.2));
              }
            }}
          >
            <img
              src={imageEncoded}
              alt="Prescription document full preview"
              className="max-w-none transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing rounded-lg shadow-2xl"
              style={{ transform: `scale(${modalZoom})` }}
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-[11px] text-slate-400 font-mono text-center">
            {language === 'TH' ? 'หมุน Scroll Wheel หรือใช้ปุ่ม + / - เพื่อย่อขยายภาพ' : 'Use mouse scroll wheel or +/- buttons to zoom'}
          </div>
        </div>
      )}
  </>
);
}
