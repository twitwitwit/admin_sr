import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  RequirementType,
  ALL_REQUIREMENT_TYPES,
  resolveRequirementImageUrl,
  getDriverRequirementUrls,
} from '../utils/documentHelpers';

export const FIRESTORE_PROJECT_ID = 'sylvan-nova-8tvkm';
export const FIRESTORE_DATABASE_ID = 'ai-studio-170da599-c668-40cc-9d73-135f9e56a917';

/**
 * Real-time listener for a single driver's 5 requirement images.
 * Listens simultaneously to:
 * - `drivers/{driverId}`
 * - `requirements/{driverId}`
 * - `drivers/{driverId}/requirements` (subcollection)
 * - `drivers/{driverId}/documents` (subcollection)
 * - `driverApplications/{driverId}/documents` (subcollection)
 * in Firestore database "ai-studio-170da599-c668-40cc-9d73-135f9e56a917".
 */
export const subscribeToDriverRequirements = (
  rawDriverId: string,
  onUpdate: (data: {
    driverId: string;
    urls: Record<RequirementType, string | undefined>;
    uploadedRequirementsCount: number;
    canVerify: boolean;
    rawDriverDoc: Record<string, any> | null;
    rawRequirementsDoc: Record<string, any> | null;
  }) => void
): Unsubscribe => {
  const cleanId = rawDriverId.replace(/^#/, '').trim();
  let rawDriverDoc: Record<string, any> | null = null;
  let rawRequirementsDoc: Record<string, any> | null = null;
  let subReqDocs: Record<string, any>[] = [];
  let subDocDocs: Record<string, any>[] = [];
  let subAppDocs: Record<string, any>[] = [];

  const emitCombined = () => {
    const sources = [
      subReqDocs.length > 0 ? { subcollectionRequirements: subReqDocs } : null,
      subDocDocs.length > 0 ? { subcollectionDocuments: subDocDocs } : null,
      subAppDocs.length > 0 ? { subcollectionDocuments: subAppDocs } : null,
      rawRequirementsDoc,
      rawDriverDoc,
    ].filter(Boolean);

    const { urls, uploadedRequirementsCount } = getDriverRequirementUrls(sources);

    onUpdate({
      driverId: cleanId,
      urls,
      uploadedRequirementsCount,
      canVerify: uploadedRequirementsCount >= 5,
      rawDriverDoc,
      rawRequirementsDoc,
    });
  };

  const unsubDriver = onSnapshot(doc(db, 'drivers', cleanId), (snap) => {
    rawDriverDoc = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    emitCombined();
  });

  const unsubReq = onSnapshot(doc(db, 'requirements', cleanId), (snap) => {
    rawRequirementsDoc = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    emitCombined();
  });

  const unsubSubReq = onSnapshot(collection(db, 'drivers', cleanId, 'requirements'), (snap) => {
    subReqDocs = snap.docs.map((d) => ({
      id: d.id,
      type: d.data().type || d.data().documentType || d.id,
      documentType: d.data().documentType || d.data().type || d.id,
      ...d.data(),
    }));
    emitCombined();
  });

  const unsubSubDoc = onSnapshot(collection(db, 'drivers', cleanId, 'documents'), (snap) => {
    subDocDocs = snap.docs.map((d) => ({
      id: d.id,
      type: d.data().type || d.data().documentType || d.id,
      documentType: d.data().documentType || d.data().type || d.id,
      ...d.data(),
    }));
    emitCombined();
  });

  const unsubAppDoc = onSnapshot(collection(db, 'driverApplications', cleanId, 'documents'), (snap) => {
    subAppDocs = snap.docs.map((d) => ({
      id: d.id,
      type: d.data().type || d.data().documentType || d.id,
      documentType: d.data().documentType || d.data().type || d.id,
      ...d.data(),
    }));
    emitCombined();
  });

  return () => {
    unsubDriver();
    unsubReq();
    unsubSubReq();
    unsubSubDoc();
    unsubAppDoc();
  };
};

/**
 * Fetches all documents across all collections in the Firestore database
 */
export const fetchAllDatabaseCollections = async () => {
  const collectionNames = [
    'drivers',
    'requirements',
    'driverApplications',
    'users',
    'passengers',
    'bookings',
    'supportTickets',
    'emergencyAlerts',
    'adminAccounts',
    'passwordResetReports',
  ];

  const dump: Record<string, any[]> = {};
  for (const name of collectionNames) {
    const snap = await getDocs(collection(db, name));
    dump[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return dump;
};

export { resolveRequirementImageUrl, getDriverRequirementUrls, ALL_REQUIREMENT_TYPES };
