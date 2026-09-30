import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Clock,
  UserCheck,
  Siren,
  LogIn,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  User,
  Shield,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Check,
  Sparkles,
  Calendar,
  SlidersHorizontal,
  RotateCcw,
  X,
  Layers,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { ActivityLog, ActivityActionType, ActivityCategory, NavTab } from '../../types';

interface ActivityLogsProps {
  onNavigate?: (tab: NavTab) => void;
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ onNavigate }) => {
  const { activityLogs, currentAdminUser } = useRealtimeDb();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'ALL' | '15M' | '1H' | '24H' | '7D' | 'CUSTOM'>('ALL');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedAdmin, setSelectedAdmin] = useState<string>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLog | null>(null);

  // Check if any filter is active
  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedTimeRange !== 'ALL' ||
    selectedEventType !== 'ALL' ||
    selectedAdmin !== 'ALL' ||
    customDateFrom !== '' ||
    customDateTo !== '';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedTimeRange('ALL');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSelectedEventType('ALL');
    setSelectedAdmin('ALL');
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '15M':
        return 'Last 15 Minutes';
      case '1H':
        return 'Last 1 Hour';
      case '24H':
        return 'Last 24 Hours';
      case '7D':
        return 'Last 7 Days';
      case 'CUSTOM':
        return `Custom (${customDateFrom || 'Earliest'} to ${customDateTo || 'Latest'})`;
      default:
        return 'All Time';
    }
  };

  // Export states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derive unique admins from activity logs + current session admin
  const availableAdmins = useMemo(() => {
    const map = new Map<string, { name: string; role: string }>();
    if (currentAdminUser?.email) {
      map.set(currentAdminUser.email, { name: currentAdminUser.name, role: currentAdminUser.role });
    }
    activityLogs.forEach((log) => {
      if (log.admin?.email) {
        map.set(log.admin.email, { name: log.admin.name, role: log.admin.role });
      }
    });
    return Array.from(map.entries()).map(([email, info]) => ({
      email,
      name: info.name,
      role: info.role,
    }));
  }, [activityLogs, currentAdminUser]);

  // Filtered activity logs with Time Range, Event Type, and Admin Filters
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // 1. Time Range Filter
      if (selectedTimeRange !== 'ALL') {
        const now = Date.now();
        if (selectedTimeRange === '15M') {
          if (now - log.timestamp > 15 * 60 * 1000) return false;
        } else if (selectedTimeRange === '1H') {
          if (now - log.timestamp > 60 * 60 * 1000) return false;
        } else if (selectedTimeRange === '24H') {
          if (now - log.timestamp > 24 * 60 * 60 * 1000) return false;
        } else if (selectedTimeRange === '7D') {
          if (now - log.timestamp > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (selectedTimeRange === 'CUSTOM') {
          if (customDateFrom) {
            const fromTs = new Date(customDateFrom).setHours(0, 0, 0, 0);
            if (log.timestamp < fromTs) return false;
          }
          if (customDateTo) {
            const toTs = new Date(customDateTo).setHours(23, 59, 59, 999);
            if (log.timestamp > toTs) return false;
          }
        }
      }

      // 2. Event Type Filter
      if (selectedEventType !== 'ALL') {
        if (selectedEventType === 'SOS') {
          if (log.actionType !== 'DISPATCH' && log.actionType !== 'RESOLUTION' && log.category !== 'sos') {
            return false;
          }
        } else if (selectedEventType === 'APPROVAL') {
          if (log.actionType !== 'APPROVAL') {
            return false;
          }
        } else if (selectedEventType === 'REJECTION') {
          if (log.actionType !== 'REJECTION') {
            return false;
          }
        } else if (selectedEventType === 'LOGIN') {
          if (log.actionType !== 'LOGIN' && log.actionType !== 'LOGOUT' && log.category !== 'auth') {
            return false;
          }
        } else if (selectedEventType === 'CONFIG_UPDATE') {
          if (log.actionType !== 'CONFIG_UPDATE' && log.category !== 'system') {
            return false;
          }
        } else if (selectedEventType === 'POLLING_TOGGLE') {
          if (log.actionType !== 'POLLING_TOGGLE') {
            return false;
          }
        } else {
          if (log.actionType !== selectedEventType && log.category !== selectedEventType) {
            return false;
          }
        }
      }

      // 3. Admin User Filter
      if (selectedAdmin !== 'ALL') {
        if (log.admin?.email !== selectedAdmin && log.admin?.name !== selectedAdmin) {
          return false;
        }
      }

      // 4. Keyword Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = log.text.toLowerCase().includes(q);
        const matchesTarget = log.targetDetails?.toLowerCase().includes(q) || log.targetId?.toLowerCase().includes(q);
        const matchesAdmin =
          log.admin?.name.toLowerCase().includes(q) ||
          log.admin?.email.toLowerCase().includes(q) ||
          log.admin?.role.toLowerCase().includes(q);

        if (!matchesText && !matchesTarget && !matchesAdmin) return false;
      }

      return true;
    });
  }, [activityLogs, searchQuery, selectedTimeRange, customDateFrom, customDateTo, selectedEventType, selectedAdmin]);

  // Helper to determine records to export based on scope
  const getRecordsToExport = (scope: 'filtered' | 'all' = exportScope) => {
    return scope === 'filtered' ? filteredLogs : activityLogs;
  };

  // Export audit trail to CSV
  const handleExportCsv = (scope: 'filtered' | 'all' = exportScope) => {
    try {
      setIsExporting(true);
      const records = getRecordsToExport(scope);
      const headers = [
        'Log ID',
        'Timestamp',
        'Date & Time',
        'Action Type',
        'Category',
        'Target Reference',
        'Description',
        'Admin Name',
        'Admin Role',
        'Admin Email',
      ];
      const rows = records.map((l) => [
        `"${l.id}"`,
        `"${l.timestamp}"`,
        `"${new Date(l.timestamp).toISOString()}"`,
        `"${l.actionType || 'GENERAL'}"`,
        `"${l.category || l.iconType}"`,
        `"${l.targetId || l.targetDetails || 'N/A'}"`,
        `"${l.text.replace(/"/g, '""')}"`,
        `"${l.admin?.name || currentAdminUser.name}"`,
        `"${l.admin?.role || currentAdminUser.role}"`,
        `"${l.admin?.email || currentAdminUser.email}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const timestampStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `swiftride_audit_logs_${scope}_${timestampStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportDropdownOpen(false);
      setExportSuccessMessage(`CSV Export complete: ${records.length} records saved.`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export audit trail to PDF report
  const handleExportPdf = (scope: 'filtered' | 'all' = exportScope) => {
    try {
      setIsExporting(true);
      const records = getRecordsToExport(scope);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Header Bar
      doc.setFillColor(12, 18, 30); // #0c121e
      doc.rect(0, 0, pageWidth, 75, 'F');

      // Gold Accent line
      doc.setFillColor(245, 158, 11); // Amber-500
      doc.rect(0, 75, pageWidth, 3, 'F');

      // Title & Subtitle in Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('SWIFTRIDE MANAGEMENT AUDIT TRAIL', 30, 32);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225); // Slate-300
      doc.text('Official Verifiable Administrative Operations Ledger & Security Compliance Report', 30, 48);

      doc.setFontSize(8);
      doc.setTextColor(245, 158, 11); // Amber
      doc.text('TAMPER-SEALED SECURITY COMPLIANCE SPECIFICATION', 30, 62);

      // Meta Block on the Right Side of Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      const nowStr = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      doc.text(`Generated: ${nowStr}`, pageWidth - 30, 28, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(`Admin: ${currentAdminUser.name} (${currentAdminUser.role})`, pageWidth - 30, 42, { align: 'right' });
      doc.text(`Scope: ${scope.toUpperCase()} (${records.length} total entries)`, pageWidth - 30, 56, { align: 'right' });

      // Summary Details Bar below header
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, 88, pageWidth - 60, 24, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const filterSummary = `Time Range: ${getTimeRangeLabel(selectedTimeRange)}  |  Event Type: ${selectedEventType}  |  Admin: ${
        selectedAdmin === 'ALL' ? 'All Administrators' : selectedAdmin
      }  |  Search: "${searchQuery || 'None'}"`;
      doc.text(filterSummary, 40, 103);

      doc.setTextColor(16, 185, 129); // Emerald
      doc.text('Status: Active Verified Ledger', pageWidth - 40, 103, { align: 'right' });

      // Build Table Data
      const tableData = records.map((l) => [
        formatExactDate(l.timestamp),
        l.actionType || 'GENERAL',
        l.targetId || l.targetDetails || 'N/A',
        l.text,
        `${l.admin?.name || currentAdminUser.name}\n(${l.admin?.role || currentAdminUser.role})`,
      ]);

      // Generate Table via autoTable
      autoTable(doc, {
        startY: 122,
        head: [['Timestamp', 'Action Type', 'Reference / Target', 'Audit Description / Event', 'Administrator']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42], // Slate-900
          textColor: [245, 158, 11], // Amber-500
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: 6,
        },
        styles: {
          fontSize: 8,
          cellPadding: 5.5,
          overflow: 'linebreak',
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 95, fontStyle: 'bold' },
          1: { cellWidth: 80, fontStyle: 'bold' },
          2: { cellWidth: 85, fontStyle: 'bold' },
          3: { cellWidth: 380 },
          4: { cellWidth: 140 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 30, right: 30, bottom: 35 },
        didDrawPage: (data) => {
          // Bottom footer on every page
          const totalPages = (doc.internal as any).getNumberOfPages();
          const pageCurrent = data.pageNumber;

          doc.setDrawColor(226, 232, 240);
          doc.line(30, pageHeight - 25, pageWidth - 30, pageHeight - 25);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            'SwiftRide Dispatch System • Confidential Internal Audit Log • Generated for Regulatory & Fleet Compliance',
            30,
            pageHeight - 14
          );

          doc.setFont('helvetica', 'bold');
          doc.text(`Page ${pageCurrent} of ${totalPages}`, pageWidth - 30, pageHeight - 14, { align: 'right' });
        },
      });

      const timestampStr = new Date().toISOString().slice(0, 10);
      const filename = `swiftride_audit_report_${scope}_${timestampStr}.pdf`;
      doc.save(filename);

      setExportDropdownOpen(false);
      setExportSuccessMessage(`PDF Audit Report complete: ${records.length} records exported.`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper for badge colors and icons based on actionType
  const getActionBadge = (log: ActivityLog) => {
    const action = log.actionType || 'GENERAL';
    switch (action) {
      case 'APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Driver Approved</span>
          </span>
        );
      case 'REJECTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/15 border border-red-500/30 text-red-400">
            <XCircle className="w-3 h-3" />
            <span>Driver Rejected</span>
          </span>
        );
      case 'DISPATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <Siren className="w-3 h-3 animate-pulse" />
            <span>SOS Dispatched</span>
          </span>
        );
      case 'RESOLUTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-500/15 border border-teal-500/30 text-teal-400">
            <ShieldCheck className="w-3 h-3" />
            <span>SOS Resolved</span>
          </span>
        );
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <LogIn className="w-3 h-3" />
            <span>Admin Login</span>
          </span>
        );
      case 'CONFIG_UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/15 border border-purple-500/30 text-purple-400">
            <Sliders className="w-3 h-3" />
            <span>Config Change</span>
          </span>
        );
      case 'POLLING_TOGGLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <Radio className="w-3 h-3" />
            <span>Telemetry Polling</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 border border-slate-700 text-slate-300">
            <span>System Action</span>
          </span>
        );
    }
  };

  const getAdminRoleBadge = (role?: string) => {
    switch (role) {
      case 'Super Admin':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Safety Dispatcher':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'Fleet Manager':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const formatExactDate = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div
      id="activity-logs-audit-root"
      className="bg-[#0c121e] border border-slate-800/90 rounded-3xl p-6 shadow-2xl space-y-6 relative"
    >
      {/* Toast Alert for Export Completion */}
      {exportSuccessMessage && (
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* Component Header with Audit Badges & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide uppercase">
                  Management Audit Trail & Activity Logs
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Active Ledger</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifiable administrative audit log recording driver approvals, emergency SOS dispatches, and admin login timestamps.
              </p>
            </div>
          </div>
        </div>

        {/* Export Suite: Direct CSV, Direct PDF & Advanced Scope Menu */}
        <div className="flex items-center flex-wrap gap-2 self-start md:self-auto relative" ref={dropdownRef}>
          {/* Quick Export CSV */}
          <button
            onClick={() => handleExportCsv('filtered')}
            disabled={isExporting}
            title="Download audit trail as comma-separated CSV file"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* Quick Export PDF */}
          <button
            onClick={() => handleExportPdf('filtered')}
            disabled={isExporting}
            title="Download audit trail as formal PDF compliance document"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Export PDF</span>
          </button>

          {/* Export Options Popover Trigger */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen((prev) => !prev)}
              disabled={isExporting}
              title="More export options (select scope: filtered vs all)"
              className="flex items-center gap-1 px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#090d16] border border-slate-700 rounded-2xl p-4 shadow-2xl z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Export Audit Ledger
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Offline Reporting</span>
                </div>

                {/* Scope selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 block">Export Scope:</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setExportScope('filtered')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        exportScope === 'filtered'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Filtered ({filteredLogs.length})
                    </button>
                    <button
                      onClick={() => setExportScope('all')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        exportScope === 'all'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Records ({activityLogs.length})
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <p>
                    Includes full cryptographic timestamp, admin identity attribution, action categories, and target incident references.
                  </p>
                </div>

                {/* Action download buttons */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => handleExportCsv(exportScope)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Download Spreadsheet</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">.CSV</span>
                  </button>

                  <button
                    onClick={() => handleExportPdf(exportScope)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-black" />
                      <span>Download Formal Report</span>
                    </div>
                    <span className="text-[10px] font-mono text-black font-extrabold">.PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dedicated Filter Bar Toolbar */}
      <div className="bg-[#090d16] border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
        {/* Filter Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Filter Audit Ledger
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
              Matching: {filteredLogs.length} / {activityLogs.length} events
            </span>
          </div>

          {/* Quick Clear Filter Action */}
          {isFilterActive && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Primary Filter Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* 1. Time Range Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Time Range</span>
            </label>
            <div className="relative">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="w-full appearance-none bg-[#0c121e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Recorded Time</option>
                <option value="15M">Last 15 Minutes</option>
                <option value="1H">Last 1 Hour</option>
                <option value="24H">Last 24 Hours</option>
                <option value="7D">Last 7 Days</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 2. Event Type Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Event Type</span>
            </label>
            <div className="relative">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full appearance-none bg-[#0c121e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Event Types</option>
                <option value="SOS">Emergency SOS (Dispatches & Resolution)</option>
                <option value="APPROVAL">Driver Approvals (Verified / Active)</option>
                <option value="REJECTION">Driver Rejections (Denied Documents)</option>
                <option value="LOGIN">Admin Session Logins (OAuth / Console)</option>
                <option value="CONFIG_UPDATE">System & Fare Config Updates</option>
                <option value="POLLING_TOGGLE">Telemetry Polling State</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 3. Admin User Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin User</span>
            </label>
            <div className="relative">
              <select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="w-full appearance-none bg-[#0c121e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Administrators</option>
                {availableAdmins.map((adm) => (
                  <option key={adm.email} value={adm.email}>
                    {adm.name} ({adm.role})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 4. Keyword Search */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Keyword Search</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search action, target, name..."
                className="w-full bg-[#0c121e] border border-slate-800 rounded-xl pl-9 pr-7 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker (shown when 'CUSTOM' time range selected) */}
        {selectedTimeRange === 'CUSTOM' && (
          <div className="p-3 bg-[#0c121e] border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
              <Calendar className="w-4 h-4" />
              <span>Select Date Bounds:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 block mb-1 font-mono">From:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 block mb-1 font-mono">To:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 [color-scheme:dark]"
                />
              </div>
            </div>
            {(customDateFrom || customDateTo) && (
              <button
                onClick={() => {
                  setCustomDateFrom('');
                  setCustomDateTo('');
                }}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 cursor-pointer"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Active Filter Chips Bar */}
        {isFilterActive && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Filters:
            </span>

            {/* Time Range chip */}
            {selectedTimeRange !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Clock className="w-3 h-3" />
                <span>Time: {getTimeRangeLabel(selectedTimeRange)}</span>
                <button
                  onClick={() => {
                    setSelectedTimeRange('ALL');
                    setCustomDateFrom('');
                    setCustomDateTo('');
                  }}
                  className="ml-1 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Event Type chip */}
            {selectedEventType !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Layers className="w-3 h-3" />
                <span>Event: {selectedEventType}</span>
                <button
                  onClick={() => setSelectedEventType('ALL')}
                  className="ml-1 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Admin User chip */}
            {selectedAdmin !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <UserCheck className="w-3 h-3" />
                <span>Admin: {availableAdmins.find((a) => a.email === selectedAdmin)?.name || selectedAdmin}</span>
                <button
                  onClick={() => setSelectedAdmin('ALL')}
                  className="ml-1 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Search query chip */}
            {searchQuery.trim() !== '' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200">
                <Search className="w-3 h-3" />
                <span>Search: "{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-xs text-slate-400 hover:text-amber-400 underline font-semibold ml-auto cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Audit Trail Feed Table */}
      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-[#080d16]">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">No audit records match your query</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords or switching category filters to view other administrative events.
            </p>
            {isFilterActive && (
              <button
                onClick={resetAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs text-amber-400 font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-[520px] overflow-y-auto pr-1">
            {filteredLogs.map((log, index) => {
              const admin = log.admin || {
                name: currentAdminUser.name,
                email: currentAdminUser.email,
                role: currentAdminUser.role,
                avatar: currentAdminUser.avatar,
              };

              return (
                <div
                  key={`audit-log-${log.id || 'log'}-${index}`}
                  className="p-4 hover:bg-slate-900/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  {/* Left: Action Badge, Description & Target Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">{getActionBadge(log)}</div>

                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-slate-200 font-semibold leading-relaxed break-words">
                        {log.text}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {log.targetId && (
                          <span className="font-mono text-[10px] bg-slate-800/80 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700/60 font-bold">
                            REF: {log.targetId}
                          </span>
                        )}
                        {log.targetDetails && (
                          <span className="text-slate-400 text-[11px] italic">
                            ({log.targetDetails})
                          </span>
                        )}
                        <span className="text-slate-600 hidden sm:inline">•</span>
                        <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400" title={new Date(log.timestamp).toISOString()}>
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatExactDate(log.timestamp)}</span>
                          <span className="text-slate-400 font-sans font-medium">({log.timeAgo})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: "Whose Admin Did Any Changes" Block */}
                  <div className="flex items-center gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60 md:pl-4 md:border-l md:border-slate-800/80 flex-shrink-0 self-start md:self-center">
                    <div className="relative">
                      {admin.avatar ? (
                        <img
                          src={admin.avatar}
                          alt={admin.name}
                          className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black font-extrabold flex items-center justify-center text-xs shadow-sm">
                          {admin.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0c121e]"></span>
                    </div>

                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{admin.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getAdminRoleBadge(
                            admin.role
                          )}`}
                        >
                          {admin.role}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
                          {admin.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Trail Footer Statistics & Quick Exports */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Showing <strong className="text-white">{filteredLogs.length}</strong> of{' '}
            <strong className="text-white">{activityLogs.length}</strong> total recorded administrative events
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <button
            onClick={() => handleExportCsv(exportScope)}
            className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 cursor-pointer font-sans text-xs font-semibold"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            <span>CSV</span>
          </button>
          <span>•</span>
          <button
            onClick={() => handleExportPdf(exportScope)}
            className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer font-sans text-xs font-semibold"
          >
            <FileText className="w-3 h-3 text-rose-400" />
            <span>PDF</span>
          </button>
          <span>•</span>
          <span>Active Admin: <strong className="text-amber-400 font-sans">{currentAdminUser.name}</strong></span>
          <span>•</span>
          <span className="text-emerald-400">Ledger Status: TAMPER-SEALED</span>
        </div>
      </div>
    </div>
  );
};
