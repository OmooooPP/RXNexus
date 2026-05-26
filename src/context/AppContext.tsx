import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Drug, Booking, SystemLog, OwingMedication } from '../types';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

interface Alert {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success';
  bookingId?: string;
  hn?: string;
}

interface AppContextType {
  currentUser: User | null;
  bookings: Booking[];
  drugs: Drug[];
  users: User[];
  logs: SystemLog[];
  alerts: Alert[];
  owingMeds: OwingMedication[];
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
  createBooking: (b: Partial<Booking>) => Promise<{ success: boolean; error?: string; booking?: Booking }>;
  updateBooking: (id: string, b: Partial<Booking>) => Promise<{ success: boolean; error?: string }>;
  deleteBooking: (id: string) => Promise<{ success: boolean; error?: string }>;
  verifyPharmacist: (id: string) => Promise<boolean>;
  verifyClerk: (id: string) => Promise<boolean>;
  createDrug: (d: Partial<Drug>) => Promise<{ success: boolean; error?: string }>;
  updateDrug: (id: string, d: Partial<Drug>) => Promise<{ success: boolean; error?: string }>;
  deleteDrug: (id: string) => Promise<{ success: boolean; error?: string }>;
  requestDeleteDrug: (id: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  rejectDeleteDrug: (id: string) => Promise<{ success: boolean; error?: string }>;
  requestEditDrug: (id: string, d: Partial<Drug>) => Promise<{ success: boolean; error?: string }>;
  approveEditDrug: (id: string) => Promise<{ success: boolean; error?: string }>;
  rejectEditDrug: (id: string) => Promise<{ success: boolean; error?: string }>;
  createUser: (usr: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  registerUser: (usr: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, usr: Partial<User> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  reportOwingMed: (booking: Booking, drugIds?: string[]) => Promise<{ success: boolean; error?: string }>;
  updatePreparedStatus: (owingId: string, drugId: string, received: boolean) => Promise<void>;
  toggleOwingResolved: (owingId: string, resolved: boolean) => Promise<void>;
  toggleMedicineOwing: (booking: Booking, targetMed: any, makeOwing: boolean) => Promise<void>;
  clearAlerts: () => void;
  selectedPharmacyLocation: string;
  setSelectedPharmacyLocation: (loc: string) => void;
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
  const [owingMeds, setOwingMeds] = useState<OwingMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'TH' | 'EN'>('EN');
  const [selectedPharmacyLocation, setSelectedPharmacyLocation] = useState<string>('All');

  // Trigger system alert sound or local alerts on content updates
  const spawnAlert = (message: string, type: 'info' | 'success' = 'info', bookingId?: string, hn?: string) => {
    const newAlert: Alert = {
      id: 'alert-' + Date.now() + Math.random().toString(36).substr(2, 4),
      message,
      timestamp: new Date().toLocaleTimeString(),
      read: false,
      type,
      bookingId,
      hn
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
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const b = change.doc.data() as Booking;
            const createdSecs = new Date(b.createdAt).getTime();
            if (Date.now() - createdSecs < 10000 && b.staff?.creatorId !== currentUser?.id) {
              spawnAlert(
                `New booking ready: ${b.patientName} (HN: ${b.hn}) reserved for ${b.dateOfUse}`,
                'info',
                b.id,
                b.hn
              );
            }
          }
        });
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

      const qOwing = query(collection(db, 'owing_meds'));
      const unsubOwing = onSnapshot(qOwing, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const om = change.doc.data() as OwingMedication;
            const createdSecs = new Date(om.createdAt).getTime();
            if (Date.now() - createdSecs < 10000 && om.reportedBy !== currentUser?.name) {
              spawnAlert(
                `⚠️ OWING MEDICATIONS: ${om.patientName} (HN: ${om.hn}) has pending owing items!`,
                'info',
                om.bookingId,
                om.hn
              );
            }
          }
        });
        const list: OwingMedication[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as OwingMedication);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setOwingMeds(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'owing_meds');
      });

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
        unsubOwing();
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

      if ((matchedUser as User).approved === false) {
        return {
          success: false,
          error: language === 'TH'
            ? 'บัญชีผู้ใช้นี้อยู่ระหว่างรอการอนุมัติการลงทะเบียนจาก Admin กรุณาติดต่อผู้ดูแลระบบ'
            : 'Your registration request is pending Admin approval. Please contact your system administrator.'
        };
      }

      // Secure authenticaton linkage via standard Firebase Auth virtual emails
      const virtualEmail = `${username.trim().toLowerCase()}@rxnexus.com`;
      try {
        await signInWithEmailAndPassword(auth, virtualEmail, password);
      } catch (authError: any) {
        // Authenticate new users on their very first sign in dynamically
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, virtualEmail, password);
          } catch (createError: any) {
            if (createError.code === 'auth/operation-not-allowed') {
              console.warn('[Firebase Auth Warn] Email/Password provider is not enabled in the Firebase Console. Seamlesly falling back to Firestore-based verification to prevent blocking.');
            } else {
              throw createError;
            }
          }
        } else if (authError.code === 'auth/operation-not-allowed') {
          console.warn('[Firebase Auth Warn] Email/Password provider is not enabled in the Firebase Console. Seamlesly falling back to Firestore-based verification to prevent blocking.');
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
      // Try to write log; if Firebase rules allow, write to history
      try {
        await setDoc(doc(db, 'logs', logId), newLog);
      } catch (logErr) {
        console.warn('Logging skipped. Logs collection is secured.', logErr);
      }

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
      return { success: true, booking: newBooking };
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
      if (b.pharmacyLocation !== undefined) updateData.pharmacyLocation = b.pharmacyLocation;
      if (b.mode) updateData.mode = b.mode;
      if (b.medications) updateData.medications = b.medications;
      if (b.totalAmount !== undefined) updateData.totalAmount = b.totalAmount;
      if (b.prescriptionImage !== undefined) updateData.prescriptionImage = b.prescriptionImage;
      if (b.medicineReceived !== undefined) updateData.medicineReceived = b.medicineReceived;
      if (b.pdfPrinted !== undefined) updateData.pdfPrinted = b.pdfPrinted;
      if (b.stickerPrinted !== undefined) updateData.stickerPrinted = b.stickerPrinted;
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
      if (d.type) updateData.type = d.type;
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

  const requestDeleteDrug = async (id: string, reason: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'drugs', id);
      await updateDoc(docRef, {
        deleteRequested: true,
        deleteReason: reason,
        deleteRequestedBy: currentUser?.name || currentUser?.username || 'Staff',
        deleteRequestedAt: new Date().toISOString()
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Staff',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Request Drug Deletion',
        details: `Requested deletion of drug id: ${id}. Reason: ${reason}`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Submitted drug deletion request. Awaiting Admin approval.`, 'info');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error submitting deletion request' };
    } finally {
      setLoading(false);
    }
  };

  const rejectDeleteDrug = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'drugs', id);
      await updateDoc(docRef, {
        deleteRequested: false,
        deleteReason: '',
        deleteRequestedBy: '',
        deleteRequestedAt: ''
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Admin',
        userRole: currentUser?.role || 'Admin',
        action: 'Reject Drug Deletion',
        details: `Rejected deletion request of drug id: ${id}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Rejected drug deletion request. Item is retained.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error rejecting deletion request' };
    } finally {
      setLoading(false);
    }
  };

  const requestEditDrug = async (id: string, d: Partial<Drug>) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'drugs', id);
      const proposed = {
        name: d.name || '',
        stockCode: d.stockCode || '',
        type: d.type || 'General',
        prices: {
          employee: Number(d.prices?.employee) || 0,
          opd: Number(d.prices?.opd) || 0,
          ipd: Number(d.prices?.ipd) || 0,
          it: Number(d.prices?.it) || 0
        }
      };

      await updateDoc(docRef, {
        editRequested: true,
        editRequestedBy: currentUser?.name || currentUser?.username || 'Pharmacist',
        editRequestedAt: new Date().toISOString(),
        editRequest: proposed
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Staff',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Request Drug Edit',
        details: `Requested edit of drug id: ${id}. Proposed name: ${proposed.name}`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Submitted drug modification request. Awaiting Admin approval.`, 'info');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error submitting modification request' };
    } finally {
      setLoading(false);
    }
  };

  const approveEditDrug = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'drugs', id);
      const drugInList = drugs.find(d => d.id === id);
      if (!drugInList || !drugInList.editRequest) {
        throw new Error('No pending changes found for this drug item');
      }

      const prop = drugInList.editRequest;
      await updateDoc(docRef, {
        name: prop.name,
        type: prop.type,
        stockCode: prop.stockCode,
        prices: {
          employee: Number(prop.prices.employee) || 0,
          opd: Number(prop.prices.opd) || 0,
          ipd: Number(prop.prices.ipd) || 0,
          it: Number(prop.prices.it) || 0
        },
        editRequested: false,
        editRequestedBy: '',
        editRequestedAt: '',
        editRequest: null
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Admin',
        userRole: currentUser?.role || 'Admin',
        action: 'Approve Drug Edit',
        details: `Approved edit changes for drug id: ${id}. Applied name: ${prop.name}`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Approved drug modification. New parameters applied.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error approving drug edit' };
    } finally {
      setLoading(false);
    }
  };

  const rejectEditDrug = async (id: string) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'drugs', id);
      await updateDoc(docRef, {
        editRequested: false,
        editRequestedBy: '',
        editRequestedAt: '',
        editRequest: null
      });

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Admin',
        userRole: currentUser?.role || 'Admin',
        action: 'Reject Drug Edit',
        details: `Rejected edit request of drug id: ${id}.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Rejected drug edit request. Original parameters preserved.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `drugs/${id}`);
      return { success: false, error: e.message || 'Error rejecting edit request' };
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
        password: usr.password || 'password123',
        approved: true // Admin created is auto-approved
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

  const registerUser = async (usr: Partial<User> & { password?: string }) => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      let exists = false;
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u.username.trim().toLowerCase() === usr.username?.trim().toLowerCase()) {
          exists = true;
        }
      });

      if (exists) {
        return { success: false, error: 'Username / Staff ID already taken!' };
      }

      const newUserId = 'usr-' + Date.now();
      const newUser: User = {
        id: newUserId,
        username: usr.username || '',
        name: usr.name || '',
        role: usr.role || 'Nurse',
        roles: usr.roles || [usr.role || 'Nurse'],
        password: usr.password || 'password123',
        approved: false // Pending approval
      };

      await setDoc(doc(db, 'users', newUserId), newUser);

      // Create linked Firebase Authentication credentials
      const virtualEmail = `${newUser.username.trim().toLowerCase()}@rxnexus.com`;
      try {
        await createUserWithEmailAndPassword(auth, virtualEmail, newUser.password || 'password123');
      } catch (authErr) {
        console.warn('Firebase Auth user already created (warning):', authErr);
      }

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: 'system',
        userName: newUser.name,
        userRole: newUser.role,
        action: 'User Registration',
        details: `Submitted online system registration. Pending security approval.`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Registration request submitted successfully! Pending Admin review.`, 'success');
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'users');
      return { success: false, error: e.message || 'Error submitting registration request' };
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
      if (usr.approved !== undefined) updateData.approved = usr.approved;

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

  const reportOwingMed = async (booking: Booking, drugIds?: string[]) => {
    setLoading(true);
    try {
      const medsToReport = booking.medications
        .filter(m => !drugIds || drugIds.includes(m.drugId))
        .map(m => ({
          drugId: m.drugId,
          drugName: m.drugName,
          stockCode: m.stockCode,
          quantity: m.quantity,
          received: false
        }));

      if (medsToReport.length === 0) {
        return { success: false, error: 'No medications selected for owing report!' };
      }

      const owingId = 'owing-' + Date.now();
      const newOwing: OwingMedication = {
        id: owingId,
        bookingId: booking.id,
        patientName: booking.patientName,
        hn: booking.hn,
        medications: medsToReport,
        reportedBy: currentUser?.name || 'Pharmacist',
        createdAt: new Date().toISOString(),
        resolved: false
      };

      await setDoc(doc(db, 'owing_meds', owingId), newOwing);

      const logId = 'log-' + Date.now();
      const newLog: SystemLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Pharmacist',
        userRole: currentUser?.role || 'Pharmacist',
        action: 'Report Owing Medication',
        details: `Pharmacist reported owing medications for booking ${booking.id} (${booking.patientName}).`
      };
      await setDoc(doc(db, 'logs', logId), newLog);

      spawnAlert(`Successfully logged owing med report for ${booking.patientName}!`, 'success', booking.id, booking.hn);
      return { success: true };
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'owing_meds');
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  const updatePreparedStatus = async (owingId: string, drugId: string, received: boolean) => {
    try {
      const found = owingMeds.find(om => om.id === owingId);
      if (!found) return;

      const updatedMeds = found.medications.map(m => {
        if (m.drugId === drugId) {
          return { ...m, received };
        }
        return m;
      });

      const allReceived = updatedMeds.every(m => m.received === true);

      await updateDoc(doc(db, 'owing_meds', owingId), {
        medications: updatedMeds,
        resolved: allReceived
      });

      spawnAlert(`Updated item preparation status.`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `owing_meds/${owingId}`);
    }
  };

  const toggleOwingResolved = async (owingId: string, resolved: boolean) => {
    try {
      const found = owingMeds.find(om => om.id === owingId);
      if (!found) return;

      const updatedMeds = found.medications.map(m => ({
        ...m,
        received: resolved
      }));

      await updateDoc(doc(db, 'owing_meds', owingId), {
        medications: updatedMeds,
        resolved
      });

      spawnAlert(`Owing status set to ${resolved ? 'RESOLVED' : 'UNRESOLVED'}`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `owing_meds/${owingId}`);
    }
  };

  const toggleMedicineOwing = async (booking: Booking, targetMed: any, makeOwing: boolean) => {
    try {
      const existingRecord = owingMeds.find(om => om.bookingId === booking.id);
      const drugNameStr = targetMed.drugName || targetMed.name || 'Unknown Medication';
      
      if (makeOwing) {
        if (existingRecord) {
          const updatedMeds = [...existingRecord.medications];
          const medIdx = updatedMeds.findIndex(m => m.drugId === targetMed.drugId);
          if (medIdx >= 0) {
            updatedMeds[medIdx] = { ...updatedMeds[medIdx], received: false };
          } else {
            updatedMeds.push({
              drugId: targetMed.drugId,
              drugName: drugNameStr,
              stockCode: targetMed.stockCode || 'N/A',
              quantity: targetMed.quantity,
              received: false
            });
          }
          
          await setDoc(doc(db, 'owing_meds', existingRecord.id), {
            ...existingRecord,
            medications: updatedMeds,
            resolved: false
          }, { merge: true });
        } else {
          const owingId = 'owing-' + booking.id;
          const newOwing: OwingMedication = {
            id: owingId,
            bookingId: booking.id,
            patientName: booking.patientName,
            hn: booking.hn,
            medications: [{
              drugId: targetMed.drugId,
              drugName: drugNameStr,
              stockCode: targetMed.stockCode || 'N/A',
              quantity: targetMed.quantity,
              received: false
            }],
            reportedBy: currentUser?.name || 'Pharmacist',
            createdAt: new Date().toISOString(),
            resolved: false
          };
          await setDoc(doc(db, 'owing_meds', owingId), newOwing);
        }

        spawnAlert(
          `🚨 OWING MED (ยังไม่ได้รับ): Patient ${booking.patientName} (HN: ${booking.hn}) lacks [${drugNameStr} x${targetMed.quantity}]. ALERT TO CLERK ISSUED!`,
          'info',
          booking.id,
          booking.hn
        );
      } else {
        if (existingRecord) {
          const updatedMeds = existingRecord.medications.map(m => {
            if (m.drugId === targetMed.drugId) {
              return { ...m, received: true };
            }
            return m;
          });
          
          const allReceived = updatedMeds.every(m => m.received === true);
          
          await setDoc(doc(db, 'owing_meds', existingRecord.id), {
            ...existingRecord,
            medications: updatedMeds,
            resolved: allReceived
          }, { merge: true });
        }
      }
    } catch (e) {
      const existingRecord = owingMeds.find(om => om.bookingId === booking.id);
      const docId = existingRecord ? existingRecord.id : 'owing-' + booking.id;
      handleFirestoreError(e, makeOwing ? OperationType.CREATE : OperationType.UPDATE, `owing_meds/${docId}`);
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
        owingMeds,
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
        requestDeleteDrug,
        rejectDeleteDrug,
        requestEditDrug,
        approveEditDrug,
        rejectEditDrug,
        createUser,
        registerUser,
        updateUser,
        deleteUser,
        reportOwingMed,
        updatePreparedStatus,
        toggleOwingResolved,
        toggleMedicineOwing,
        clearAlerts,
        selectedPharmacyLocation,
        setSelectedPharmacyLocation
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

