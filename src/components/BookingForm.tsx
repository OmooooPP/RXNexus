import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { BookingMedication, Drug } from '../types';
import { Plus, Trash, Image as ImageIcon, CheckCircle, Search, HelpCircle } from 'lucide-react';

interface BookingFormProps {
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
    fetchDrugs
  } = useApp();

  const t = i18n[language];

  // Load existing data if edit mode
  const isEdit = !!editId;
  const existingRecord = editId ? bookings.find(b => b.id === editId) : null;

  // Initialize States
  const [mode, setMode] = useState<'General' | 'Oncology'>(existingRecord ? existingRecord.mode : 'General');
  const [hn, setHn] = useState(existingRecord ? existingRecord.hn : '');
  const [patientName, setPatientName] = useState(existingRecord ? existingRecord.patientName : '');
  const [dateOfUse, setDateOfUse] = useState(existingRecord ? existingRecord.dateOfUse : new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState(existingRecord ? existingRecord.department : 'General Ward 3D');
  const [patientType, setPatientType] = useState<'employee' | 'opd' | 'ipd' | 'it'>(
    existingRecord && existingRecord.medications.length > 0 
      ? existingRecord.medications[0].priceType 
      : 'opd'
  );

  // Suggested Staff Lists
  const suggestedDoctors = [
    'Dr. Gregory House',
    'Dr. Sarah Smith',
    'Dr. Preeyapat Pong',
    'Dr. Somchai Dee',
    'Dr. Michael Scott',
    'Dr. Lisa Cuddy'
  ];

  const suggestedNurses = [
    'Nurse Clara Barton',
    'Nurse Joy',
    'Nurse Florence Nightingale',
    'Nurse Somsri Permpun',
    'Nurse Preeya Pong'
  ];

  const [doctor, setDoctor] = useState(existingRecord ? existingRecord.staff.doctor : '');
  const [nurse, setNurse] = useState(existingRecord ? existingRecord.staff.nurse : '');
  const [pharmacist, setPharmacist] = useState(existingRecord ? existingRecord.staff.pharmacist : '');

  // Booking Medications
  const [selectedMeds, setSelectedMeds] = useState<BookingMedication[]>(
    existingRecord ? existingRecord.medications : []
  );

  // Active Dropdowns state in specific lines
  const [activeDrugId, setActiveDrugId] = useState<string>('');
  const [activeQty, setActiveQty] = useState<number>(1);

  // File Upload Progress
  const [imageEncoded, setImageEncoded] = useState<string>(existingRecord ? existingRecord.prescriptionImage : '');
  const [uploadBar, setUploadBar] = useState<number>(-1); // -1 is idle

  const [validationError, setValidationError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Fetch latest drug directory
  useEffect(() => {
    fetchDrugs();
  }, []);

  // Filter drugs directory based on selected Class Mode (General/Oncology)
  const filteredDrugs = drugs.filter((d) => d.type === mode);

  // Reset selected drugs catalog on mode flip
  useEffect(() => {
    if (!isEdit) {
      setSelectedMeds([]);
    }
  }, [mode]);

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

  // Image Upload and Encode pipeline
  const processPrescriptionFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds safety capacity. Limit uploading to 10MB.');
      return;
    }

    setUploadBar(10);
    // Simulate real upload sequence progress ticking
    const timer = setInterval(() => {
      setUploadBar((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 15;
      });
    }, 100);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageEncoded(reader.result as string);
      setTimeout(() => {
        setUploadBar(-1); // Hide progress indicator
      }, 800);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop processing
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Only scan/image-based Rx files are supported.');
      return;
    }

    setUploadBar(20);
    const timer = setInterval(() => {
      setUploadBar((prev) => (prev >= 100 ? 100 : prev + 20));
    }, 80);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageEncoded(reader.result as string);
      setTimeout(() => setUploadBar(-1), 650);
    };
    reader.readAsDataURL(file);
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
    if (!hn || !patientName || !doctor || !nurse) {
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

    const payload = {
      hn,
      patientName: patientName.trim(),
      dateOfUse,
      department: department.trim(),
      mode,
      medications: selectedMeds,
      totalAmount: grandTotal,
      prescriptionImage: imageEncoded,
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
        // Clear forms
        setHn('');
        setPatientName('');
        setSelectedMeds([]);
        setImageEncoded('');
        if (onSuccess) onSuccess();
      } else {
        setValidationError(result.error || 'System Creation Fail');
      }
    }
  };

  return (
    <form onSubmit={handleCommitSubmit} className="space-y-6">
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

      {/* Mode Switches */}
      {!isEdit && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {t.modeSelect}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              id="mode-general-btn"
              type="button"
              onClick={() => setMode('General')}
              className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                mode === 'General'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 bg-blue-300 rounded-full mr-2"></span>
              {t.modeGeneral}
            </button>
            <button
              id="mode-oncology-btn"
              type="button"
              onClick={() => setMode('Oncology')}
              className={`flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                mode === 'Oncology'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="w-2 h-2 bg-red-300 rounded-full mr-2"></span>
              {t.modeOncology}
            </button>
          </div>
        </div>
      )}

      {/* Grid of basic patient identification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
            {t.patientDetails}
          </h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{t.hn} *</label>
          <input
            id="hn-input"
            type="text"
            required
            value={hn}
            onChange={handleHNChange}
            placeholder={t.hnPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono font-bold focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
          <p className="text-[10px] text-slate-400 mt-1">Format auto-spaced: 02-xx-xxxxxx</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{t.patientName} *</label>
          <input
            id="patient-name-input"
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder={t.patientNamePlaceholder}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{t.dateOfUse} *</label>
          <input
            id="date-of-use-input"
            type="date"
            required
            value={dateOfUse}
            onChange={(e) => setDateOfUse(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{t.department}</label>
          <input
            id="department-input"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g., Cancer Unit Bed-3"
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

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
      </div>

      {/* Medication Lists */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
          {t.medTitle}
        </h3>

        {/* Drug picker line */}
        <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex-1">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {t.selectDrug}
            </label>
            <select
              id="active-drug-select"
              value={activeDrugId}
              onChange={(e) => setActiveDrugId(e.target.value)}
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden"
            >
              <option value="">-- {t.selectDrug} --</option>
              {filteredDrugs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.stockCode}) — ฿{d.prices[patientType].toLocaleString()}
                </option>
              ))}
            </select>
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
              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden text-center"
            />
          </div>

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
                  <th className="p-3">SKU Code</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedMeds.map((med) => (
                  <tr key={med.drugId} className="hover:bg-slate-50/55 transition-colors text-slate-700">
                    <td className="p-3 font-semibold text-slate-800">{med.drugName}</td>
                    <td className="p-3 font-mono text-slate-400">{med.stockCode}</td>
                    <td className="p-3 font-semibold text-center">{med.quantity}</td>
                    <td className="p-3 text-right font-mono text-slate-500">฿{med.unitPrice.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-slate-800 font-mono">฿{med.totalPrice.toLocaleString()}</td>
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
                  <td colSpan={4} className="p-3 text-right text-slate-600 uppercase tracking-wider">
                    {t.totalAmount}:
                  </td>
                  <td className="p-3 text-right text-blue-700 font-bold text-sm font-mono">
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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
          {t.prescriptionLogo}
        </h3>

        {/* Drag block */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 hover:bg-slate-100/50 hover:border-blue-500 transition-all text-center flex flex-col items-center justify-center cursor-pointer relative"
        >
          <input
            id="prescription-file-input"
            type="file"
            accept="image/*"
            onChange={processPrescriptionFile}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {imageEncoded ? (
            <div className="space-y-2">
              <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                <img src={imageEncoded} alt="prescription scan" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <p className="text-xs text-slate-500 font-mono">Rx_Document_Asset_Stored.png</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageEncoded('');
                }}
                className="text-xs text-red-500 font-semibold hover:underline cursor-pointer"
              >
                Remove Document
              </button>
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
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-blue-600 pl-2">
          {t.staffSignoff}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t.selectDoctor} *</label>
            <input
              id="doctor-input"
              type="text"
              list="doctors-list"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              placeholder="e.g., Dr. Gregory House"
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden"
              required
            />
            <datalist id="doctors-list">
              {suggestedDoctors.map((doc) => (
                <option key={doc} value={doc} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t.selectNurse} *</label>
            <input
              id="nurse-input"
              type="text"
              list="nurses-list"
              value={nurse}
              onChange={(e) => setNurse(e.target.value)}
              placeholder="e.g., Nurse Clara"
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden"
              required
            />
            <datalist id="nurses-list">
              {suggestedNurses.map((nrs) => (
                <option key={nrs} value={nrs} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t.selectPharmacist}</label>
            <input
              id="pharmacist-input"
              type="text"
              placeholder="e.g., Dr. Sarah Smith (Pharmacist)"
              value={pharmacist}
              onChange={(e) => setPharmacist(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* General Validation & Success banners */}
      {validationError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs font-semibold text-red-600">
          ⚠️ {validationError}
        </div>
      )}

      {successMsg && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs font-semibold text-blue-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-500" />
          {successMsg}
        </div>
      )}

      {/* Form Action Controls */}
      <div className="flex gap-4 pt-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
          >
            {t.cancel}
          </button>
        )}
        <button
          id="submit-booking-form-btn"
          type="submit"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold uppercase transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          {t.submitForm}
        </button>
      </div>
    </form>
  );
}
