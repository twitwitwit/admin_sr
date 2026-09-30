import {
  Driver,
  DriverDocumentDetail,
  DocumentVerificationStatus,
  DriverRequirementItem,
  RequirementType,
} from '../types';
import { isWebRenderableImageUrl, normalizeBase64OrUrl } from './imageHelpers';

export const REQUIREMENT_TYPES: RequirementType[] = [
  'LICENSE_FRONT',
  'LICENSE_BACK',
  'NBI',
  'ORCR',
  'VEHICLE_PHOTO',
];

const TYPE_ALIASES: Record<RequirementType, string[]> = {
  LICENSE_FRONT: [
    'LICENSE_FRONT',
    'LICENSE',
    'DL_FRONT',
    'DRIVERS_LICENSE_FRONT',
    'DRIVER_LICENSE_FRONT',
    'DRIVERS_LICENSE',
    'DRIVER_LICENSE',
  ],
  LICENSE_BACK: ['LICENSE_BACK', 'DL_BACK', 'DRIVERS_LICENSE_BACK', 'DRIVER_LICENSE_BACK'],
  NBI: ['NBI', 'NBI_CLEARANCE'],
  ORCR: ['ORCR', 'OR_CR', 'VEHICLE_ORCR'],
  VEHICLE_PHOTO: ['VEHICLE_PHOTO', 'VEHICLE', 'CAR_PHOTO', 'UNIT_PHOTO', 'VEHICLE_IMAGE'],
};

const normalizeTypeKey = (raw: unknown): string => {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/['’]/g, '')
    .replace(/[\s/\-]+/g, '_');
};

const TOP_LEVEL_URL_FIELDS: Record<RequirementType, string[]> = {
  LICENSE_FRONT: ['licenseFrontUrl', 'licenseUrl', 'driversLicenseUrl'],
  LICENSE_BACK: ['licenseBackUrl'],
  NBI: ['nbiUrl', 'nbiClearanceUrl'],
  ORCR: ['orcrUrl', 'orCrUrl', 'or_cr_url', 'vehicleOrCrUrl'],
  VEHICLE_PHOTO: ['vehiclePhotoUrl'],
};

const LEGACY_DOC_FIELDS: Record<RequirementType, string[]> = {
  LICENSE_FRONT: ['license', 'licenseFront', 'driversLicense'],
  LICENSE_BACK: ['licenseBack'],
  NBI: ['nbi', 'nbiClearance'],
  ORCR: ['orCr', 'orcr', 'or_cr', 'vehicleOrCr'],
  VEHICLE_PHOTO: ['vehiclePhoto', 'vehicle'],
};

/**
 * Checks whether a candidate string is a valid non-empty image URL or data:image/... base64 string
 */
export const isValidRequirementImageUrl = (val: unknown): string | undefined => {
  if (typeof val !== 'string') return undefined;
  const norm = normalizeBase64OrUrl(val);
  if (!norm) return undefined;
  const upper = norm.toUpperCase();
  if (
    upper === 'VERIFIED' ||
    upper === 'PENDING' ||
    upper === 'REJECTED' ||
    upper === 'PASSED' ||
    upper === 'NONE' ||
    upper === 'N/A'
  ) {
    return undefined;
  }
  if (norm.startsWith('data:image/') || norm.startsWith('blob:')) {
    return norm;
  }
  if (isWebRenderableImageUrl(norm)) {
    return norm;
  }
  return undefined;
};

/**
 * Finds a matching DriverRequirementItem from an array of requirements/documents/items
 */
export const findRequirementItemInSource = (
  source: any,
  reqType: RequirementType
): DriverRequirementItem | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  const aliases = TYPE_ALIASES[reqType];

  const arraysToCheck = [
    source.requirements,
    source.requirementItems,
    source.items,
    source.documents,
  ];

  for (const arr of arraysToCheck) {
    if (Array.isArray(arr)) {
      const found = arr.find((item) => {
        if (!item || typeof item !== 'object') return false;
        const rawType = normalizeTypeKey(item.documentType || item.type || item.id);
        return aliases.includes(rawType);
      });
      if (found) return found;
    }
  }

  // Also check requirementsMap[type] if it's an object entry
  const mapsToCheck = [
    source.requirementsMap,
    !Array.isArray(source.requirements) && typeof source.requirements === 'object' ? source.requirements : null,
  ];
  for (const mapObj of mapsToCheck) {
    if (mapObj && typeof mapObj === 'object') {
      for (const [k, entry] of Object.entries(mapObj)) {
        if (aliases.includes(normalizeTypeKey(k)) && entry && typeof entry === 'object') {
          return {
            type: reqType,
            documentType: reqType,
            ...(entry as Record<string, any>),
          };
        }
      }
    }
  }

  return undefined;
};

/**
 * Resolves the image URL for one of the 5 requirement types (LICENSE_FRONT, LICENSE_BACK, NBI, ORCR, VEHICLE_PHOTO)
 * from:
 * 1) driver.requirements (matching documentType or type and reading url, photoUri, or imageUrl)
 * 2) driver.requirementsMap[type].url (or photoUri / imageUrl)
 * 3) top-level fields (licenseFrontUrl, licenseBackUrl, nbiUrl, orcrUrl, vehiclePhotoUrl)
 */
export const resolveRequirementImageUrl = (
  sources: any[],
  reqType: RequirementType
): string | undefined => {
  const aliases = TYPE_ALIASES[reqType];
  const topFields = TOP_LEVEL_URL_FIELDS[reqType];
  const legacyDocFields = LEGACY_DOC_FIELDS[reqType];

  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;

    // 1. Check requirements / requirementItems / items / documents array
    const arraysToCheck = [src.requirements, src.requirementItems, src.items, src.documents];
    for (const arr of arraysToCheck) {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (!item || typeof item !== 'object') continue;
          const rawType = normalizeTypeKey(item.documentType || item.type || item.id);
          if (aliases.includes(rawType)) {
            const candidate =
              item.url ||
              item.photoUri ||
              item.imageUrl ||
              item.fileUrl ||
              item.photoUrl ||
              item.base64;
            const valid = isValidRequirementImageUrl(candidate);
            if (valid) return valid;
          }
        }
      }
    }

    // 2. Check requirementsMap[type].url (or object-based requirements[type])
    const mapsToCheck = [
      src.requirementsMap,
      !Array.isArray(src.requirements) && typeof src.requirements === 'object' ? src.requirements : null,
    ];
    for (const mapObj of mapsToCheck) {
      if (mapObj && typeof mapObj === 'object') {
        for (const [key, entry] of Object.entries(mapObj)) {
          if (!aliases.includes(normalizeTypeKey(key)) || !entry) continue;
          if (typeof entry === 'string') {
            const valid = isValidRequirementImageUrl(entry);
            if (valid) return valid;
          } else if (typeof entry === 'object') {
            const e = entry as Record<string, any>;
            const candidate =
              e.url ||
              e.photoUri ||
              e.imageUrl ||
              e.fileUrl ||
              e.photoUrl ||
              e.base64;
            const valid = isValidRequirementImageUrl(candidate);
            if (valid) return valid;
          }
        }
      }
    }

    // 3. Check top-level fields (licenseFrontUrl, licenseBackUrl, nbiUrl, orcrUrl, vehiclePhotoUrl)
    for (const field of topFields) {
      const valid = isValidRequirementImageUrl(src[field]);
      if (valid) return valid;
    }

    // 4. Check legacy documents object fields if they hold a valid image URL / data:image/...
    const docsObj = !Array.isArray(src.documents) && typeof src.documents === 'object' ? src.documents : null;
    if (docsObj) {
      for (const field of [...topFields, ...legacyDocFields]) {
        const val = docsObj[field];
        if (typeof val === 'string') {
          const valid = isValidRequirementImageUrl(val);
          if (valid) return valid;
        } else if (val && typeof val === 'object') {
          const candidate = val.url || val.photoUri || val.imageUrl || val.fileUrl || val.base64;
          const valid = isValidRequirementImageUrl(candidate);
          if (valid) return valid;
        }
      }
    }
  }

  return undefined;
};

/**
 * Computes all 5 requirement URLs and the uploadedRequirementsCount (0 to 5)
 */
export const getDriverRequirementUrls = (
  sources: any[]
): {
  urls: Record<RequirementType, string | undefined>;
  uploadedRequirementsCount: number;
} => {
  const urls: Record<RequirementType, string | undefined> = {
    LICENSE_FRONT: resolveRequirementImageUrl(sources, 'LICENSE_FRONT'),
    LICENSE_BACK: resolveRequirementImageUrl(sources, 'LICENSE_BACK'),
    NBI: resolveRequirementImageUrl(sources, 'NBI'),
    ORCR: resolveRequirementImageUrl(sources, 'ORCR'),
    VEHICLE_PHOTO: resolveRequirementImageUrl(sources, 'VEHICLE_PHOTO'),
  };

  const uploadedRequirementsCount = REQUIREMENT_TYPES.filter((t) => Boolean(urls[t])).length;

  return {
    urls,
    uploadedRequirementsCount,
  };
};

export const getDriverDocuments = (driver: Driver, extraSources: any[] = []): DriverDocumentDetail[] => {
  const sources = [...extraSources, driver];
  const docs = driver.documents || {};
  const isPending = driver.isPendingAudit;
  const isResub = driver.isResubmission;

  const { urls, uploadedRequirementsCount } = getDriverRequirementUrls(sources);

  const findItem = (reqType: RequirementType): DriverRequirementItem | undefined => {
    for (const s of sources) {
      const found = findRequirementItemInSource(s, reqType);
      if (found) return found;
    }
    return undefined;
  };

  const licFrontItem = findItem('LICENSE_FRONT');
  const licBackItem = findItem('LICENSE_BACK');
  const nbiItem = findItem('NBI');
  const orCrItem = findItem('ORCR');
  const vehiclePhotoItem = findItem('VEHICLE_PHOTO');

  const licenseImage = urls.LICENSE_FRONT;
  const licenseBackImage = urls.LICENSE_BACK;
  const nbiImage = urls.NBI;
  const orCrImage = urls.ORCR;
  const vehiclePhoto = urls.VEHICLE_PHOTO;

  const resolveItemStatus = (
    item?: DriverRequirementItem,
    imageUrl?: string
  ): DocumentVerificationStatus => {
    if (!imageUrl) return 'PENDING';
    if (item) {
      const s = String(item.status || '').toUpperCase();
      if (s === 'REJECTED' || s === 'FLAGGED') return 'REJECTED';
      if (item.isVerified === true || s === 'VERIFIED' || s === 'APPROVED') return 'VERIFIED';
      if (s === 'RESUBMITTED') return 'RESUBMITTED';
      if (s === 'PENDING' || s === 'SUBMITTED') return isResub ? 'RESUBMITTED' : 'PENDING';
    }
    if (!isPending && driver.isVerified && uploadedRequirementsCount >= 5) return 'VERIFIED';
    return isPending ? (isResub ? 'RESUBMITTED' : 'PENDING') : 'VERIFIED';
  };

  const extractDocNumber = (item?: DriverRequirementItem, fallbackVal?: string, hasPhoto?: boolean): string => {
    if (item?.details) return item.details;
    if (fallbackVal && !fallbackVal.startsWith('data:') && !fallbackVal.startsWith('http') && !fallbackVal.startsWith('content://')) {
      return fallbackVal;
    }
    if (item?.fileName) return item.fileName;
    return hasPhoto ? 'Uploaded via Driver App' : 'Not uploaded yet';
  };

  const list: DriverDocumentDetail[] = [
    {
      id: licFrontItem?.id || 'doc-license-front',
      type: 'license',
      requirementType: 'LICENSE_FRONT',
      title: licFrontItem?.title || licFrontItem?.name || "Professional Driver's License (Front)",
      subtitle: licenseImage
        ? licFrontItem?.fileName
          ? `Uploaded App Photo: ${licFrontItem.fileName}`
          : 'Requirement Type: LICENSE_FRONT (Uploaded)'
        : 'Requirement Type: LICENSE_FRONT • No photo uploaded yet',
      issuingAgency: 'Land Transportation Office (LTO)',
      documentNumber: extractDocNumber(licFrontItem, docs.licenseNumber, Boolean(licenseImage)),
      expiryDate: licenseImage ? 'Active Credential' : 'N/A',
      issueDate: licenseImage ? 'Submitted via App' : 'N/A',
      fileUrl: licenseImage,
      uploadedFileName: licFrontItem?.fileName,
      uploadedFileUrl: licenseImage,
      uploadedPhotoUri: licFrontItem?.photoUri || licFrontItem?.url || licFrontItem?.imageUrl,
      uploadedDetails: licFrontItem?.details,
      submittedAt: licFrontItem?.submittedAt || licFrontItem?.updatedAt,
      status: resolveItemStatus(licFrontItem, licenseImage),
      rejectionReason: licFrontItem?.rejectionReason,
      notes:
        licFrontItem?.description ||
        (licenseImage
          ? 'Front side of Professional Driver’s License uploaded from Driver App.'
          : 'Waiting for driver to upload LICENSE_FRONT photo from mobile app.'),
    },
    {
      id: licBackItem?.id || 'doc-license-back',
      type: 'licenseBack',
      requirementType: 'LICENSE_BACK',
      title: licBackItem?.title || licBackItem?.name || "Driver's License (Back / Restrictions)",
      subtitle: licenseBackImage
        ? licBackItem?.fileName
          ? `Uploaded App Photo: ${licBackItem.fileName}`
          : 'Requirement Type: LICENSE_BACK (Uploaded)'
        : 'Requirement Type: LICENSE_BACK • No photo uploaded yet',
      issuingAgency: 'Land Transportation Office (LTO)',
      documentNumber: extractDocNumber(licBackItem, undefined, Boolean(licenseBackImage)),
      expiryDate: licenseBackImage ? 'Active Credential' : 'N/A',
      issueDate: licenseBackImage ? 'Submitted via App' : 'N/A',
      fileUrl: licenseBackImage,
      uploadedFileName: licBackItem?.fileName,
      uploadedFileUrl: licenseBackImage,
      uploadedPhotoUri: licBackItem?.photoUri || licBackItem?.url || licBackItem?.imageUrl,
      uploadedDetails: licBackItem?.details,
      submittedAt: licBackItem?.submittedAt || licBackItem?.updatedAt,
      status: resolveItemStatus(licBackItem, licenseBackImage),
      rejectionReason: licBackItem?.rejectionReason,
      notes:
        licBackItem?.description ||
        (licenseBackImage
          ? 'Reverse side of Driver’s License uploaded from Driver App.'
          : 'Waiting for driver to upload LICENSE_BACK photo from mobile app.'),
    },
    {
      id: nbiItem?.id || 'doc-nbi',
      type: 'nbiClearance',
      requirementType: 'NBI',
      title: nbiItem?.title || nbiItem?.name || 'NBI Criminal Background Clearance',
      subtitle: nbiImage
        ? nbiItem?.fileName
          ? `Uploaded App Photo: ${nbiItem.fileName}`
          : 'Requirement Type: NBI (Uploaded)'
        : 'Requirement Type: NBI • No photo uploaded yet',
      issuingAgency: 'National Bureau of Investigation (NBI)',
      documentNumber: extractDocNumber(nbiItem, undefined, Boolean(nbiImage)),
      expiryDate: nbiImage ? 'Active Credential' : 'N/A',
      issueDate: nbiImage ? 'Submitted via App' : 'N/A',
      fileUrl: nbiImage,
      uploadedFileName: nbiItem?.fileName,
      uploadedFileUrl: nbiImage,
      uploadedPhotoUri: nbiItem?.photoUri || nbiItem?.url || nbiItem?.imageUrl,
      uploadedDetails: nbiItem?.details,
      submittedAt: nbiItem?.submittedAt || nbiItem?.updatedAt,
      status: resolveItemStatus(nbiItem, nbiImage),
      rejectionReason: nbiItem?.rejectionReason,
      notes:
        nbiItem?.description ||
        (nbiImage
          ? 'NBI Clearance certificate photo uploaded from Driver App.'
          : 'Waiting for driver to upload NBI clearance photo from mobile app.'),
    },
    {
      id: orCrItem?.id || 'doc-or-cr',
      type: 'orCr',
      requirementType: 'ORCR',
      title: orCrItem?.title || orCrItem?.name || 'LTO Official Receipt & Registration (OR/CR)',
      subtitle: orCrImage
        ? orCrItem?.fileName
          ? `Uploaded App Photo: ${orCrItem.fileName}`
          : 'Requirement Type: ORCR (Uploaded)'
        : 'Requirement Type: ORCR • No photo uploaded yet',
      issuingAgency: 'LTO Motor Vehicle Registration Division',
      documentNumber: extractDocNumber(orCrItem, undefined, Boolean(orCrImage)),
      expiryDate: orCrImage ? 'Active Credential' : 'N/A',
      issueDate: orCrImage ? 'Submitted via App' : 'N/A',
      fileUrl: orCrImage,
      uploadedFileName: orCrItem?.fileName,
      uploadedFileUrl: orCrImage,
      uploadedPhotoUri: orCrItem?.photoUri || orCrItem?.url || orCrItem?.imageUrl,
      uploadedDetails: orCrItem?.details,
      submittedAt: orCrItem?.submittedAt || orCrItem?.updatedAt,
      status: resolveItemStatus(orCrItem, orCrImage),
      rejectionReason: orCrItem?.rejectionReason,
      notes:
        orCrItem?.description ||
        (orCrImage
          ? `OR/CR vehicle registration photo uploaded from Driver App.`
          : 'Waiting for driver to upload ORCR photo from mobile app.'),
    },
    {
      id: vehiclePhotoItem?.id || 'doc-vehicle',
      type: 'vehiclePhoto',
      requirementType: 'VEHICLE_PHOTO',
      title: vehiclePhotoItem?.title || vehiclePhotoItem?.name || 'Vehicle Physical Inspection & Plate Photo',
      subtitle: vehiclePhoto
        ? vehiclePhotoItem?.fileName
          ? `Uploaded App Photo: ${vehiclePhotoItem.fileName}`
          : 'Requirement Type: VEHICLE_PHOTO (Uploaded)'
        : 'Requirement Type: VEHICLE_PHOTO • No photo uploaded yet',
      issuingAgency: 'SwiftRide Fleet Safety Audit',
      documentNumber: extractDocNumber(
        vehiclePhotoItem,
        driver.plateNumber && driver.plateNumber !== 'N/A' ? `Plate: ${driver.plateNumber}` : undefined,
        Boolean(vehiclePhoto)
      ),
      expiryDate: vehiclePhoto ? 'Active Inspection' : 'N/A',
      issueDate: vehiclePhoto ? 'Submitted via App' : 'N/A',
      fileUrl: vehiclePhoto,
      uploadedFileName: vehiclePhotoItem?.fileName,
      uploadedFileUrl: vehiclePhoto,
      uploadedPhotoUri: vehiclePhotoItem?.photoUri || vehiclePhotoItem?.url || vehiclePhotoItem?.imageUrl,
      uploadedDetails: vehiclePhotoItem?.details,
      submittedAt: vehiclePhotoItem?.submittedAt || vehiclePhotoItem?.updatedAt,
      status: resolveItemStatus(vehiclePhotoItem, vehiclePhoto),
      rejectionReason: vehiclePhotoItem?.rejectionReason,
      notes:
        vehiclePhotoItem?.details ||
        (vehiclePhoto
          ? `Vehicle inspection photo uploaded from Driver App.`
          : 'Waiting for driver to upload VEHICLE_PHOTO from mobile app.'),
    },
  ];

  return list;
};
