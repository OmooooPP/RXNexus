import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { i18n } from '../lib/i18n';
import { Drug } from '../types';
import { Plus, Trash, Edit2, Check, X, ShieldAlert, ArrowUpDown } from 'lucide-react';

export default function StockManager() {
  const {
    currentUser,
    drugs,
    language,
    createDrug,
    updateDrug,
    deleteDrug
  } = useApp();

  const t = i18n[language];

  const isPharmacistOrAdmin = currentUser?.role === 'Pharmacist' || currentUser?.role === 'Admin';

  // Toggle register new product drawer
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'General' | 'Oncology'>('General');
  const [stockCode, setStockCode] = useState('');
  const [priceEmployee, setPriceEmployee] = useState('');
  const [priceOPD, setPriceOPD] = useState('');
  const [priceIPD, setPriceIPD] = useState('');
  const [priceIT, setPriceIT] = useState('');

  const [formError, setFormError] = useState('');

  // Clear fields helper
  const resetForm = () => {
    setName('');
    setType('General');
    setStockCode('');
    setPriceEmployee('');
    setPriceOPD('');
    setPriceIPD('');
    setPriceIT('');
    setFormError('');
    setShowAddForm(false);
    setEditId(null);
  };

  const handleRegisterDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !stockCode.trim()) {
      setFormError('Drug Name and SKU Stock Code are mandatory parameters!');
      return;
    }

    const prices = {
      employee: parseFloat(priceEmployee) || 0,
      opd: parseFloat(priceOPD) || 0,
      ipd: parseFloat(priceIPD) || 0,
      it: parseFloat(priceIT) || 0
    };

    const payload = {
      name: name.trim(),
      type,
      stockCode: stockCode.toUpperCase().trim(),
      prices
    };

    if (editId) {
      // Editing
      const res = await updateDrug(editId, payload);
      if (res.success) {
        resetForm();
      } else {
        setFormError(res.error || 'Server rejected pricing modification');
      }
    } else {
      // Registering new
      const res = await createDrug(payload);
      if (res.success) {
        resetForm();
      } else {
        setFormError(res.error || 'Duplicate stock code or invalid payload parameters');
      }
    }
  };

  const startEdit = (drug: Drug) => {
    setEditId(drug.id);
    setName(drug.name);
    setType(drug.type);
    setStockCode(drug.stockCode);
    setPriceEmployee(String(drug.prices.employee));
    setPriceOPD(String(drug.prices.opd));
    setPriceIPD(String(drug.prices.ipd));
    setPriceIT(String(drug.prices.it));
    setShowAddForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Stock catalog introductory layout */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
            {t.stockCatalog}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dynamic catalog management for clinical therapeutic rates and standard codes
          </p>
        </div>

        {isPharmacistOrAdmin && !showAddForm && (
          <button
            id="open-register-drug-btn"
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t.addNewDrug}
          </button>
        )}
      </div>

      {/* Form Overlay Drawer */}
      {showAddForm && (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <div className="flex border-b border-neutral-200 pb-3 mb-4 justify-between items-center">
            <h3 className="font-bold text-sm text-neutral-700">
              {editId ? t.editDrug : t.addNewDrug}
            </h3>
            <button
              id="cancel-drug-btn"
              type="button"
              onClick={resetForm}
              className="text-xs text-neutral-400 hover:text-neutral-500 font-bold p-1 bg-white border border-neutral-200 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleRegisterDrug} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-neutral-500 mb-1 font-semibold">{t.drugName} *</label>
                <input
                  id="drug-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Aspirin 100mg"
                  className="w-full bg-white border border-neutral-200 px-3 py-2 rounded-xl focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1 font-semibold">{t.stockCode} *</label>
                <input
                  id="stock-code-input"
                  type="text"
                  required
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                  placeholder="e.g., GEN098"
                  className="w-full bg-white border border-neutral-200 px-3 py-2 rounded-xl focus:outline-hidden focus:border-emerald-500 font-mono"
                  disabled={!!editId} // Prevent tampering code
                />
              </div>

              <div>
                <label className="block text-neutral-500 mb-1 font-semibold">{t.reportsType} *</label>
                <select
                  id="drug-type-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'General' | 'Oncology')}
                  className="w-full bg-white border border-neutral-200 px-3 py-2 rounded-xl focus:outline-hidden"
                  disabled={!!editId}
                >
                  <option value="General">General Category (Blue)</option>
                  <option value="Oncology">Oncology Category (Red)</option>
                </select>
              </div>
            </div>

            {/* Pricing Matrix values */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                {t.unitPrices}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <span className="block text-neutral-500 mb-1 text-[10px] uppercase font-bold">1. {t.typeEmployee}</span>
                  <input
                    id="price-employee-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceEmployee}
                    onChange={(e) => setPriceEmployee(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded-lg focus:outline-hidden text-right font-mono text-xs font-semibold"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <span className="block text-neutral-500 mb-1 text-[10px] uppercase font-bold">2. {t.typeOPD}</span>
                  <input
                    id="price-opd-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceOPD}
                    onChange={(e) => setPriceOPD(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded-lg focus:outline-hidden text-right font-mono text-xs font-semibold"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <span className="block text-neutral-500 mb-1 text-[10px] uppercase font-bold">3. {t.typeIPD}</span>
                  <input
                    id="price-ipd-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceIPD}
                    onChange={(e) => setPriceIPD(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded-lg focus:outline-hidden text-right font-mono text-xs font-semibold"
                  />
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200">
                  <span className="block text-neutral-500 mb-1 text-[10px] uppercase font-bold">4. {t.typeIT}</span>
                  <input
                    id="price-it-input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={priceIT}
                    onChange={(e) => setPriceIT(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded-lg focus:outline-hidden text-right font-mono text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-red-500 font-bold bg-white text-[11px] p-2 rounded-lg border border-red-100">
                ⚠️ {formError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-neutral-200 text-neutral-600 rounded-xl font-semibold cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                id="submit-drug-btn"
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                {editId ? 'Commit Modifications' : 'Register Medication'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of registered pharmacy lines */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <th className="p-4">Scientific Name</th>
              <th className="p-4">Classification</th>
              <th className="p-4">SKU / Stock ID</th>
              <th className="p-4 text-center">Employee Rate</th>
              <th className="p-4 text-center">OPD Rate</th>
              <th className="p-4 text-center">IPD Rate</th>
              <th className="p-4 text-center">IT Special Case</th>
              {isPharmacistOrAdmin && <th className="p-4 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {drugs.map((drug) => (
              <tr key={drug.id} className="hover:bg-neutral-50/40 transition-colors">
                <td className="p-4">
                  <span className="font-bold text-neutral-800 text-xs sm:text-sm block">{drug.name}</span>
                  <span className="text-[10px] text-neutral-400 select-all">{drug.id}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    drug.type === 'Oncology'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                    {drug.type === 'Oncology' ? t.modeOncology : t.modeGeneral}
                  </span>
                </td>
                <td className="p-4 font-mono font-bold text-slate-600 select-all">{drug.stockCode}</td>
                <td className="p-4 text-center font-mono text-neutral-500 font-medium">฿{(drug.prices.employee || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                <td className="p-4 text-center font-mono text-neutral-500 font-medium">฿{(drug.prices.opd || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                <td className="p-4 text-center font-mono text-neutral-500 font-medium">฿{(drug.prices.ipd || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                <td className="p-4 text-center font-mono font-bold text-blue-800">฿{(drug.prices.it || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                
                {isPharmacistOrAdmin && (
                  <td className="p-4">
                    <div className="flex gap-2 justify-center items-center">
                      <button
                        type="button"
                        onClick={() => startEdit(drug)}
                        className="p-1 px-2.5 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded transition-all flex items-center gap-1 cursor-pointer font-bold uppercase"
                        title="Edit pricing catalog matrix"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="text-[9px] tracking-wider">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(t.deleteWarning)) {
                            deleteDrug(drug.id);
                          }
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete product item"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
