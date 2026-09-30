/**
 * Human-readable identification formatting helpers for Drivers and Passengers.
 * Ensures IDs across audit reports, tables, and inspection modals are clean and human-readable.
 */

export const formatHumanReadableDriverId = (id: string | null | undefined): string => {
  if (!id) return '#DRV-0000';
  const str = String(id).trim();

  if (/^#DRV-[A-Z0-9]+$/i.test(str)) {
    return str.toUpperCase();
  }

  if (/^DRV[-_]?[A-Z0-9]+$/i.test(str)) {
    const code = str.replace(/^DRV[-_]?/i, '').toUpperCase();
    return `#DRV-${code}`;
  }

  if (/^\d{1,5}$/.test(str)) {
    return `#DRV-${str.padStart(4, '0')}`;
  }

  const alphanumeric = str.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length >= 4) {
    return `#DRV-${alphanumeric.slice(-5).toUpperCase()}`;
  }

  return str.startsWith('#') ? str.toUpperCase() : `#DRV-${str.toUpperCase()}`;
};

export const formatHumanReadablePassengerId = (id: string | null | undefined): string => {
  if (!id) return '#PASS-0000';
  const str = String(id).trim();

  if (/^#PASS-[A-Z0-9]+$/i.test(str)) {
    return str.toUpperCase();
  }

  if (/^PASS[-_]?[A-Z0-9]+$/i.test(str)) {
    const code = str.replace(/^PASS[-_]?/i, '').toUpperCase();
    return `#PASS-${code}`;
  }

  if (/^\d{1,5}$/.test(str)) {
    return `#PASS-${str.padStart(4, '0')}`;
  }

  const alphanumeric = str.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length >= 4) {
    return `#PASS-${alphanumeric.slice(-5).toUpperCase()}`;
  }

  return str.startsWith('#') ? str.toUpperCase() : `#PASS-${str.toUpperCase()}`;
};

export const formatHumanReadableTicketId = (id: string | null | undefined): string => {
  if (!id) return '#TICKET-100';
  const str = String(id).trim();
  if (/^#?TICKET-[A-Z0-9]+$/i.test(str)) return str.toUpperCase().startsWith('#') ? str.toUpperCase() : `#${str.toUpperCase()}`;
  const alphanumeric = str.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length >= 4) {
    return `#TICKET-${alphanumeric.slice(-4).toUpperCase()}`;
  }
  return `#TICKET-${str.toUpperCase()}`;
};

export const formatHumanReadableSosId = (id: string | null | undefined): string => {
  if (!id) return '#SOS-100';
  const str = String(id).trim();
  if (/^#?SOS-[A-Z0-9]+$/i.test(str)) return str.toUpperCase().startsWith('#') ? str.toUpperCase() : `#${str.toUpperCase()}`;
  const alphanumeric = str.replace(/[^a-zA-Z0-9]/g, '');
  if (alphanumeric.length >= 4) {
    return `#SOS-${alphanumeric.slice(-4).toUpperCase()}`;
  }
  return `#SOS-${str.toUpperCase()}`;
};
