import { Driver, DriverDocumentDetail } from '../types';

export const getDriverDocuments = (driver: Driver): DriverDocumentDetail[] => {
  const docs = driver.documents || {};
  const isPending = driver.isPendingAudit;
  const isResub = driver.isResubmission;

  // License Front
  const licenseVal = docs.license;
  const isLicenseUrl = typeof licenseVal === 'string' && (licenseVal.startsWith('http') || licenseVal.startsWith('data:image'));
  const licenseNum = docs.licenseNumber || (!isLicenseUrl && licenseVal ? licenseVal : 'DL-N03-24-098841');

  // License Back
  const licenseBackVal = docs.licenseBack;
  const isLicenseBackUrl = typeof licenseBackVal === 'string' && (licenseBackVal.startsWith('http') || licenseBackVal.startsWith('data:image'));

  // OR / CR
  const orCrVal = docs.orCr || docs.vehicleOrCr;
  const isOrCrUrl = typeof orCrVal === 'string' && (orCrVal.startsWith('http') || orCrVal.startsWith('data:image'));
  const orCrNum = !isOrCrUrl && orCrVal ? orCrVal : 'ORCR-NCR-774912-2026';

  // NBI Clearance
  const nbiVal = docs.nbiClearance;
  const isNbiUrl = typeof nbiVal === 'string' && (nbiVal.startsWith('http') || nbiVal.startsWith('data:image'));
  const nbiNum = !isNbiUrl && nbiVal ? nbiVal : 'NBI-2026-NCR-009841';

  // LTFRB Franchise
  const ltfrbVal = docs.ltfrbFranchise;
  const isLtfrbUrl = typeof ltfrbVal === 'string' && (ltfrbVal.startsWith('http') || ltfrbVal.startsWith('data:image'));
  const ltfrbNum = !isLtfrbUrl && ltfrbVal ? ltfrbVal : 'LTFRB-TNVS-CASE-2025-08149';

  // Vehicle Inspection Photo
  const vehiclePhoto = docs.vehiclePhoto || (driver.vehicleType === 'Motorcycle'
    ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900&auto=format&fit=crop&q=80');

  const defaultStatus = isPending ? (isResub ? 'RESUBMITTED' : 'PENDING') : 'VERIFIED';

  const list: DriverDocumentDetail[] = [
    {
      id: 'doc-license-front',
      type: 'license',
      title: "Professional Driver's License (Front)",
      subtitle: 'Official LTO Regulatory Credential',
      issuingAgency: 'Land Transportation Office (LTO)',
      documentNumber: licenseNum,
      expiryDate: 'October 24, 2029',
      issueDate: 'October 24, 2024',
      fileUrl: isLicenseUrl ? licenseVal : undefined,
      status: defaultStatus,
      notes: 'Restrictions: 1 (Motorcycles), 2 (Vehicles <= 4,500 kgs GVW). Valid for commercial passenger driving.',
    },
    {
      id: 'doc-license-back',
      type: 'licenseBack',
      title: "Driver's License (Back / Restrictions)",
      subtitle: 'Conditions, Biometric Barcode & Blood Type',
      issuingAgency: 'Land Transportation Office (LTO)',
      documentNumber: 'Barcode: *DL-N03-24-098841-SEC*',
      expiryDate: 'October 24, 2029',
      issueDate: 'October 24, 2024',
      fileUrl: isLicenseBackUrl ? licenseBackVal : undefined,
      status: defaultStatus,
      notes: 'Emergency Contact verified. Organ Donor: YES. Blood Type: O+.',
    },
    {
      id: 'doc-or-cr',
      type: 'orCr',
      title: 'LTO Official Receipt & Registration (OR/CR)',
      subtitle: 'Vehicle Registration & Inspection Clearance',
      issuingAgency: 'LTO Motor Vehicle Registration Division',
      documentNumber: orCrNum,
      expiryDate: 'March 2027 (Annual Renewal)',
      issueDate: 'March 15, 2024',
      fileUrl: isOrCrUrl ? orCrVal : undefined,
      status: defaultStatus,
      notes: `Registered Plate: ${driver.plateNumber} • Make: ${driver.vehicleDetails} • Engine and Chassis matches physical unit.`,
    },
    {
      id: 'doc-nbi',
      type: 'nbiClearance',
      title: 'NBI Criminal Background Clearance',
      subtitle: 'Department of Justice Background Verification',
      issuingAgency: 'National Bureau of Investigation (NBI)',
      documentNumber: nbiNum,
      expiryDate: 'December 31, 2027',
      issueDate: 'January 10, 2026',
      fileUrl: isNbiUrl ? nbiVal : undefined,
      status: defaultStatus,
      notes: 'NO DEROGATORY RECORD ON FILE. Cleared for TNVS public commercial transport.',
    },
    {
      id: 'doc-ltfrb',
      type: 'ltfrbFranchise',
      title: 'LTFRB CPC / Provisional Franchise Authority',
      subtitle: 'Public Transport Operator Accreditation',
      issuingAgency: 'Land Transportation Franchising and Regulatory Board',
      documentNumber: ltfrbNum,
      expiryDate: 'September 30, 2028',
      issueDate: 'September 15, 2024',
      fileUrl: isLtfrbUrl ? ltfrbVal : undefined,
      status: defaultStatus,
      notes: 'Commercial TNVS Franchise authorization under Swiftride Network Provider Accreditation.',
    },
    {
      id: 'doc-vehicle',
      type: 'vehiclePhoto',
      title: 'Vehicle Physical Inspection & Plate Photo',
      subtitle: 'Front and Side Roadworthiness Inspection',
      issuingAgency: 'Swiftride Fleet Safety Audit',
      documentNumber: `Plate: ${driver.plateNumber} (${driver.vehicleType})`,
      expiryDate: 'Annual Vehicle Inspection 2027',
      issueDate: 'Current Onboarding Audit',
      fileUrl: vehiclePhoto,
      status: 'VERIFIED',
      notes: `Vehicle Model: ${driver.vehicleDetails}. Working headlights, functional seatbelts, clean interior.`,
    },
  ];

  return list;
};
