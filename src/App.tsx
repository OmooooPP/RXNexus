import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { i18n } from './lib/i18n';
import BookingForm from './components/BookingForm';
import DataTable from './components/DataTable';
import QueueCalendar from './components/QueueCalendar';
import StockManager from './components/StockManager';
import UserAdminManager from './components/UserAdminManager';
import ReportPrinter from './components/ReportPrinter';
import LoadingSpinner from './components/LoadingSpinner';
import BHPLogo from './components/BHPLogo';
import { Booking } from './types';
import {
  Activity,
  Calendar,
  Layers,
  FileSpreadsheet,
  Users,
  History,
  LogOut,
  Globe,
  Bell,
  X,
  FileCheck,
  Shield,
  HelpCircle,
  PlusCircle,
  Clock
} from 'lucide-react';

function DashboardLayout() {
  const {
    currentUser,
    alerts,
    language,
    setLanguage,
    logout,
    loading,
    clearAlerts
  } = useApp();

  const t = i18n[language];

  // Active UI Navigation Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'booking' | 'calendar' | 'stocks' | 'users' | 'reports' | 'logs'>('dashboard');

  // Booking parameter state for Editing sequence
  const [editingBookingId, setEditingBookingId] = useState<string | undefined>(undefined);
  // Printing parameter state for Single Slip
  const [printingBooking, setPrintingBooking] = useState<Booking | null>(null);

  // Helper toggle for system alert drawer dropdown
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  // Handle edit reservation sequence
  const triggerEdit = (id: string) => {
    setEditingBookingId(id);
    setActiveTab('booking');
  };

  // Handle print slip sequence
  const triggerPrintSingle = (booking: Booking) => {
    setPrintingBooking(booking);
    setActiveTab('reports');
  };

  // Safe reset when tab switches
  useEffect(() => {
    if (activeTab !== 'booking') {
      setEditingBookingId(undefined);
    }
    if (activeTab !== 'reports') {
      setPrintingBooking(null);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans">
      {/* Dynamic Loading Overlay */}
      {loading && <LoadingSpinner />}

      {/* Main App Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-6 py-3.5 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-4">
          <BHPLogo className="h-9" />
          <div className="h-7 w-px bg-slate-200"></div>
          <div>
            <h1 className="text-base font-black tracking-tight text-blue-900 leading-none">
              {t.appName}
            </h1>
            <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase block mt-1">
              {language === 'TH' ? 'ระบบจองและสำรองยา' : 'Medication Reservation'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {/* Dual language picker */}
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setLanguage('TH')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                language === 'TH' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 font-medium hover:text-slate-700'
              }`}
            >
              TH
            </button>
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                language === 'EN' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-400 font-medium hover:text-slate-700'
              }`}
            >
              EN
            </button>
          </div>

          {/* Alarm Notification Bells bell dropdown list */}
          <div className="relative">
            <button
              onClick={() => setShowAlertMenu(!showAlertMenu)}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold font-mono">
                  {alerts.length}
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden py-1">
                <div className="p-3 bg-slate-50 border-b border-slate-200/60 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Real-time alerts ({alerts.length})</span>
                  {alerts.length > 0 && (
                    <button
                      onClick={clearAlerts}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-[11px] text-slate-600">
                  {alerts.length === 0 ? (
                    <p className="p-4 text-center text-slate-400">All channels clear. No active alerts.</p>
                  ) : (
                    alerts.map((al) => (
                      <div key={al.id} className="p-3 space-y-1 hover:bg-slate-50 transition-colors">
                        <p className="font-medium text-slate-800">{al.message}</p>
                        <p className="text-[9px] text-slate-400 font-mono tracking-tight">{al.timestamp}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Signin profile chip */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs">
              {currentUser?.name[0]}
            </div>
            <div className="hidden sm:block text-left font-sans">
              <p className="font-bold text-slate-800 text-xs">{currentUser?.name}</p>
              <span className="text-[10px] text-slate-500 uppercase font-mono">{currentUser?.role}</span>
            </div>
          </div>

          {/* Logout anchor */}
          <button
            onClick={logout}
            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/40 rounded-xl transition-all cursor-pointer"
            title={t.logout}
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </header>

      {/* Grid structure main content body layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation Drawer */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col py-6 justify-between print:hidden">
          <div className="space-y-4 px-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-3">
              Navigation Menu ({currentUser?.role})
            </p>

            <nav className="space-y-1 font-sans">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                {t.navDashboard}
              </button>

              <button
                onClick={() => setActiveTab('booking')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'booking'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                {t.navBooking}
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                {t.navCalendar}
              </button>

              <button
                onClick={() => setActiveTab('stocks')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'stocks'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileCheck className="w-4 h-4 shrink-0" />
                {t.navStocks}
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                {t.reportsTitle}
              </button>

              {/* Admin clearance links */}
              {currentUser?.role === 'Admin' && (
                <>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 pt-6 px-3">
                    System Administration
                  </p>

                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {t.navUsers}
                  </button>

                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      activeTab === 'logs'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <History className="w-4 h-4 shrink-0" />
                    {t.navLogs}
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* User Detail footer chip inside sidebar as seen in HTML design template */}
          <div className="mx-4 p-4 border-t border-slate-150 bg-slate-50/50 rounded-xl">
            <div className="flex items-center gap-3 font-sans">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">
                {currentUser?.name[0]}{currentUser?.name.split(' ')[1]?.[0] || ''}
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-xs font-semibold leading-none text-slate-800 truncate">{currentUser?.name}</p>
                <p className="text-[9px] text-slate-500 uppercase mt-1 tracking-wider font-bold truncate">
                  {currentUser?.role} • {currentUser?.username}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Modular Render Block Main view */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'dashboard' && (
            <DataTable
              onEditClick={triggerEdit}
              onPrintClick={triggerPrintSingle}
            />
          )}

          {activeTab === 'booking' && (
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
              <BookingForm
                editId={editingBookingId}
                onSuccess={() => {
                  setTimeout(() => setActiveTab('dashboard'), 1500);
                }}
                onCancel={() => setActiveTab('dashboard')}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <QueueCalendar />
          )}

          {activeTab === 'stocks' && (
            <StockManager />
          )}

          {activeTab === 'reports' && (
            <ReportPrinter singleBooking={printingBooking || undefined} />
          )}

          {activeTab === 'users' && (
            <UserAdminManager />
          )}

          {activeTab === 'logs' && currentUser?.role === 'Admin' && (
            <AuditLogsDashboard />
          )}
        </main>
      </div>
    </div>
  );
}

// Sub dashboard mapping audit trails
function AuditLogsDashboard() {
  const { logs, language, fetchLogs } = useApp();
  const t = i18n[language];

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            {t.navLogs}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Traceable action tracking for system compliance review</p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-mono text-[10px] uppercase font-bold rounded-lg text-slate-600 cursor-pointer transition-all"
        >
          Refresh Logs
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <th className="p-4">{t.logTimestamp}</th>
              <th className="p-4">Operator (Operator ID)</th>
              <th className="p-4">Role</th>
              <th className="p-4">{t.logAction}</th>
              <th className="p-4">{t.logDetails}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                <td className="p-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="p-4">
                  <span className="font-bold text-slate-800">{log.userName}</span>
                  <span className="block text-[9px] text-slate-400 font-mono font-normal">
                    ID: {log.userId}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200/60 px-1.5 py-0.5 rounded">
                    {log.userRole}
                  </span>
                </td>
                <td className="p-4 font-bold text-blue-700">{log.action}</td>
                <td className="p-4 font-medium max-w-sm text-slate-700">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Security Authentication Gate (Login Screen)
function AuthGate() {
  const { login, language, setLanguage } = useApp();
  const t = i18n[language];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [signing, setSigning] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSigning(true);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Inputs cannot be empty!');
      setSigning(false);
      return;
    }

    const res = await login(username.trim(), password);
    setSigning(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Server connection failed - retry verification credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4 animate-fade-in">
      {/* Container Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-4">
          <BHPLogo className="h-16" />
          <div className="w-full h-px bg-slate-200/60 my-1"></div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-blue-950 font-sans uppercase">
              {t.loginTitle}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal font-semibold">
              {t.loginSubtitle}
            </p>
          </div>
        </div>

        {/* Login credentials input form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              {t.username} *
            </label>
            <input
              id="login-username-input"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={language === 'TH' ? 'ระบุรหัสผู้ใช้ / ชื่อผู้ใช้' : 'Enter User ID / Username'}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">
              {t.password} *
            </label>
            <input
              id="login-password-input"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === 'TH' ? 'ระบุรหัสผ่านของคุณ' : 'Enter clearance password'}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
            />
          </div>

          {errorMsg && (
            <p className="text-red-500 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100 animate-pulse text-[11px]">
              ⚠️ {errorMsg}
            </p>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={signing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-sm uppercase tracking-wider"
          >
            {signing ? 'Verifying clearance...' : t.btnLogin}
          </button>
        </form>

        {/* Dual language selection inside AuthGate */}
        <div className="flex justify-center gap-3 bg-slate-50 p-1 rounded-lg max-w-[120px] mx-auto border border-slate-200">
          <button
            onClick={() => setLanguage('TH')}
            className={`flex-1 py-0.5 text-[10px] font-bold rounded transition-all ${
              language === 'TH' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 font-semibold'
            }`}
          >
            TH
          </button>
          <button
            onClick={() => setLanguage('EN')}
            className={`flex-1 py-0.5 text-[10px] font-bold rounded transition-all ${
              language === 'EN' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 font-semibold'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </div>
  );
}

function MainAppShell() {
  const { currentUser } = useApp();
  return currentUser ? <DashboardLayout /> : <AuthGate />;
}

export default function App() {
  return (
    <AppProvider>
      <MainAppShell />
    </AppProvider>
  );
}
