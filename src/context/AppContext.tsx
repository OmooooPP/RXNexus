import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Drug, Booking, SystemLog } from '../types';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

interface Alert {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success';
}

interface AppContextType {
  currentUser: User | null;
  bookings: Booking[];
  drugs: Drug[];
  users: User[];
  logs: SystemLog[];
  alerts: Alert[];
  loading: boolean;
  language: 'TH' | 'EN';
  setLanguage: (lang: 'TH' | 'EN') => void;
  setLoading: (l: boolean) => void;
  login: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchBookings: () => Promise<void>;
  fetchDrugs: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  createBooking: (b: Partial<Booking>) => Promise<{ success: boolean; error?: string }>;
  updateBooking: (id: string, b: Partial<Booking>) => Promise<{ success: boolean; error?: string }>;
  deleteBooking: (id: string) => Promise<{ success: boolean; error?: string }>;
  verifyPharmacist: (id: string) => Promise<boolean>;
  verifyClerk: (id: string) => Promise<boolean>;
  createDrug: (d: Partial<Drug>) => Promise<{ success: boolean; error?: string }>;
  updateDrug: (id: string, d: Partial<Drug>) => Promise<{ success: boolean; error?: string }>;
  deleteDrug: (id: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (usr: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, usr: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearAlerts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rxnexus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'TH' | 'EN'>('EN');

  // Trigger system alert sound or local alerts on content updates
  const spawnAlert = (message: string, type: 'info' | 'success' = 'info') => {
    const newAlert: Alert = {
      id: 'alert-' + Date.now() + Math.random().toString(36).substr(2, 4),
      message,
      timestamp: new Date().toLocaleTimeString(),
      read: false,
      type
    };
    setAlerts((prev) => [newAlert, ...prev].slice(0, 50)); // keep last 50
  };

  const clearAlerts = () => setAlerts([]);

  // Empty dummy fetch functions for backward compatibility without breaking existing caller interfaces
  const fetchBookings = async () => {};
  const fetchDrugs = async () => {};
  const fetchUsers = async () => {};
  const fetchLogs = async () => {};

  // Connect to Firestore collections in real-time using onSnapshot listeners
  useEffect(() => {
    if (currentUser) {
      // 1. Real-time Bookings sync
      const qBookings = query(collection(db, 'bookings'));
      const unsubBookings = onSnapshot(qBookings, (snap) => {
        const list: Booking[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as Booking);
        });
        // Sort bookings by id or createdAt descending
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setBookings(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      });

      // 2. Real-time Drug list sync
      const qDrugs = query(collection(db, 'drugs'));
      const unsubDrugs = onSnapshot(qDrugs, (snap) => {
        const list: Drug[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as Drug);
        });
        setDrugs(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'drugs');
      });

      // 3. Real-time User profiles and system trace logs sync (restricted for admin dashboards)
      let unsubUsers = () => {};
      let unsubLogs = () => {};

      if (currentUser.role === 'Admin') {
        const qUsers = query(collection(db, 'users'));
        unsubUsers = onSnapshot(qUsers, (snap) => {
          const list: User[] = [];
          snap.forEach((docSnap) => {
            list.push(docSnap.data() as User);
          });
          setUsers(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        });

        const qLogs = query(collection(db, 'logs'));
        unsubLogs = onSnapshot(qLogs, (snap) => {
          const list: SystemLog[] = [];
          snap.forEach((docSnap) => {
            list.push(docSnap.data() as SystemLog);
          });
          list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          setLogs(list);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'logs');
        });
      }

      return () => {
        unsubBookings();
        unsubDrugs();
        unsubUsers();
        unsubLogs();
      };
    }
  }, [currentUser?.role, currentUser?.id]);

  // Handle clinic staff secure authentication using Firestore and Firebase Auth
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Check user authentication record in Firestore collection first
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      let matchedUser: User | null = null;
      
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u.username.trim().toLowerCase() === username.trim().toLowerCase() && u.password === password) {
          matchedUser = u;
        }
      });

      if (!matchedUser) {
        return { success: false, error: 'Invalid User ID / Username or Password!' };
      }

      // Secure authenticaton linkage via standard Firebase Auth virtual emails
      const virtualEmail = `${username.trim().toLowerCase()}@rxnexus.com`;
      try {
        await signInWithEmailAndPassword(auth, virtualEmail, password);
      } catch (authError: any) {
        // Authenticate new users on their very first sign in dynamically
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          await createUserWithEmailAndPassword(auth, virtualEmail, password);
        } else {
          throw authError;
        }
      }

      setCurrentUser(matchedUser);
      localStorage.setItem('rxnexus_user', JSON.stringify(matchedUser));
      spawnAlert(`Welcome back, ${(matchedUser as User).name}!`, 'success');

      // Log login event to Firestore system action trail
      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: (matchedUser as User).id,
        userName: (matchedUser as User).name,
        userRole: (matchedUser as User).role,
        action: 'User Login',
        details: 'User logged in securely via clinical Firebase Authentication.'
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      return { success: true };
    } catch (e: any) {
      console.error('[Login Error]', e);
      return { success: false, error: e.message || 'Authentication failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('[SignOut Error]', e);
    }
    setCurrentUser(null);
    localStorage.removeItem('rxnexus_user');
    setBookings([]);
    setDrugs([]);
    setUsers([]);
    setLogs([]);
    setAlerts([]);
  };

  // Clinician Reserve orders booking CRUD
  const createBooking = async (b: Partial<Booking>) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStr = today.replace(/-/g, '');
      const todaysBookingCount = bookings.filter(x => x.bookingDate === today).length + 1;
      const bookingId = `RXN-${todayStr}-${String(todaysBookingCount).padStart(3, '0')}`;

      const newBooking: Booking = {
        id: bookingId,
        bookingDate: today,
        hn: b.hn || '',
        patientName: b.patientName || '',
        dateOfUse: b.dateOfUse || today,
        department: b.department || 'General Outpatient',
        mode: b.mode || 'General',
        medications: b.medications || [],
        totalAmount: Number(b.totalAmount) || 0,
        prescriptionImage: b.prescriptionImage || '',
        staff: {
          doctor: b.staff?.doctor || '',
          nurse: b.staff?.nurse || '',
          pharmacist: b.staff?.pharmacist || '',
          creatorId: currentUser?.id || 'system',
          creatorName: currentUser?.name || 'Staff Member'
        },
        pharmacistVerification: {
          status: 'Pending',
          verifiedBy: '',
          verifiedAt: ''
        },
        clerkVerification: {
          status: 'Pending',
          verifiedBy: '',
          verifiedAt: ''
        },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'bookings', bookingId), newBooking);

      // Save tracking activity logs
      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Staff',
        userRole: currentUser?.role || 'Nurse',
        action: 'Create Booking',
        details: `Created reservation ${bookingId} for patient ${newBooking.patientName} (${newBooking.hn}) using ${newBooking.mode} drugs.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Successfully booked medication order: ${bookingId} for ${newBooking.patientName}!`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'bookings');
      return { success: false, error: e.message || 'Error saving booking reservation' };
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (id: string, b: Partial<Booking>) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'bookings', id);
      const updateData: any = {};
      if (b.hn) updateData.hn = b.hn;
      if (b.patientName) updateData.patientName = b.patientName;
      if (b.dateOfUse) updateData.dateOfUse = b.dateOfUse;
      if (b.department) updateData.department = b.department;
      if (b.medications) updateData.medications = b.medications;
      if (b.totalAmount !== undefined) updateData.totalAmount = b.totalAmount;
      if (b.prescriptionImage !== undefined) updateData.prescriptionImage = b.prescriptionImage;
      if (b.staff) {
        updateData.staff = {
          doctor: b.staff.doctor || '',
          nurse: b.staff.nurse || '',
          pharmacist: b.staff.pharmacist || '',
          creatorId: currentUser?.id || 'system',
          creatorName: currentUser?.name || 'Staff Member'
        };
      }

      await updateDoc(docRef, updateData);

      // Audit logs
      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Staff',
        userRole: currentUser?.role || 'Nurse',
        action: 'Update Booking',
        details: `Edited reservation ${id} details systematically.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Booking order ${id} updated systematically.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `bookings/${id}`);
      return { success: false, error: e.message || 'Error updating booking' };
    } finally {
      setLoading(false);
    }
  };

  const deleteBooking = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'bookings', id));

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Staff',
        userRole: currentUser?.role || 'Admin',
        action: 'Delete Booking',
        details: `Deleted booking record ${id} permanently.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Medication booking record ${id} was permanently removed.`, 'info');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `bookings/${id}`);
      return { success: false, error: e.message || 'Error removing booking' };
    } finally {
      setLoading(false);
    }
  };

  const verifyPharmacist = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'bookings', id);
      await updateDoc(docRef, {
        pharmacistVerification: {
          status: 'Verified',
          verifiedBy: currentUser?.name || 'Pharmacist Coordinator',
          verifiedAt: new Date().toISOString()
        }
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'pharmacist',
        userName: currentUser?.name || 'Pharmacist',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Verify Ordered Medication',
        details: `Approved verification of drug allocation for ${id}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Pharmacist Verified order ${id} successfully!`, 'success');
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `bookings/${id}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyClerk = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'bookings', id);
      await updateDoc(docRef, {
        clerkVerification: {
          status: 'Ready-to-use',
          verifiedBy: currentUser?.name || 'Pharmacy Stock Clerk',
          verifiedAt: new Date().toISOString()
        }
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'clerk',
        userName: currentUser?.name || 'Clerk',
        userRole: currentUser?.role || 'Pharmacy Stock Clerk',
        action: 'Stock Delivered',
        details: `Marked reservation supply ${id} as physically delivered.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Clerk Accepted order ${id}! Supply marked as physically ready-to-use.`, 'success');
      return true;
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `bookings/${id}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Pharmaceutical medication drugs catalog CRUD
  const createDrug = async (d: Partial<Drug>) => {
    setLoading(true);
    try {
      const drugId = d.id || 'drg-' + Date.now();
      const newDrug: Drug = {
        id: drugId,
        name: d.name || '',
        stockCode: d.stockCode || 'GEN000',
        type: d.type || 'General',
        prices: {
          employee: Number(d.prices?.employee) || 0,
          opd: Number(d.prices?.opd) || 0,
          ipd: Number(d.prices?.ipd) || 0,
          it: Number(d.prices?.it) || 0
        }
      };

      await setDoc(doc(db, 'drugs', drugId), newDrug);

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Pharmacist',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Register Drug',
        details: `Added new pharmaceutical medicine: ${newDrug.name} (${newDrug.stockCode}).`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Added medication catalog line: ${newDrug.name}.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'drugs');
      return { success: false, error: e.message || 'Error adding drug' };
    } finally {
      setLoading(false);
    }
  };

  const updateDrug = async (id: string, d: Partial<Drug>) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'drugs', id);
      const updateData: any = {};
      if (d.name) updateData.name = d.name;
      if (d.stockCode) updateData.stockCode = d.stockCode;
      if (d.prices) {
        updateData.prices = {
          employee: Number(d.prices.employee) || 0,
          opd: Number(d.prices.opd) || 0,
          ipd: Number(d.prices.ipd) || 0,
          it: Number(d.prices.it) || 0
        };
      }

      await updateDoc(docRef, updateData);

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Pharmacist',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Update Drug',
        details: `Updated drug items properties/prices for ${d.name || id}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Updated drug properties successfully.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error updating drug' };
    } finally {
      setLoading(false);
    }
  };

  const deleteDrug = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'drugs', id));

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Pharmacist',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Remove Drug',
        details: `Removed drug catalog item id: ${id} from storage tracking.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert('Drug item was removed from system indexing ledger.', 'info');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error deleting drug' };
    } finally {
      setLoading(false);
    }
  };

  // Staff User profiles CRUD
  const createUser = async (usr: Partial<User> & { password?: string }) => {
    setLoading(true);
    try {
      const newUserId = usr.id || 'usr-' + Date.now();
      const newUser: User = {
        id: newUserId,
        username: usr.username || '',
        name: usr.name || '',
        role: usr.role || 'Nurse',
        roles: usr.roles || [usr.role || 'Nurse'],
        password: usr.password || 'password123'
      };

      await setDoc(doc(db, 'users', newUserId), newUser);

      // Create linked Firebase Authentication credentials
      const virtualEmail = `${newUser.username.trim().toLowerCase()}@rxnexus.com`;
      try {
        await createUserWithEmailAndPassword(auth, virtualEmail, newUser.password || 'password123');
      } catch (authErr) {
        console.warn('Firebase Auth user already created or creation warning:', authErr);
      }

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'Admin',
        action: 'Create Staff',
        details: `Registered staff profile: ${newUser.name} with role ${newUser.role}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Registered staff credential profile: ${newUser.name} (${newUser.role}).`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'users');
      return { success: false, error: e.message || 'Error creating user profile' };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, usr: Partial<User> & { password?: string }) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', id);
      const updateData: any = {};
      if (usr.name) updateData.name = usr.name;
      if (usr.role) updateData.role = usr.role;
      if (usr.roles) updateData.roles = usr.roles;
      if (usr.password) updateData.password = usr.password;

      await updateDoc(docRef, updateData);

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'Admin',
        action: 'Update Staff',
        details: `Edited staff information for profile: ${usr.name || id}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Updated staff credential profile successfully.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${id}`);
      return { success: false, error: e.message || 'Error updating user details' };
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === '585982') {
      return { success: false, error: 'Cannot remove default system Administrator!' };
    }
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', id));

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrator',
        userRole: currentUser?.role || 'Admin',
        action: 'Delete Staff',
        details: `Deleted user staff profile id: ${id}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert('User staff credential deleted permanently.', 'info');
      return { success: true, deleted: id };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `users/${id}`);
      return { success: false, error: e.message || 'Error deleting user' };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        bookings,
        drugs,
        users,
        logs,
        alerts,
        loading,
        language,
        setLanguage,
        setLoading,
        login,
        logout,
        fetchBookings,
        fetchDrugs,
        fetchUsers,
        fetchLogs,
        createBooking,
        updateBooking,
        deleteBooking,
        verifyPharmacist,
        verifyClerk,
        createDrug,
        updateDrug,
        deleteDrug,
        createUser,
        updateUser,
        deleteUser,
        clearAlerts
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

