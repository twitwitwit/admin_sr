import React, { useState, useMemo } from 'react';
import { useRealtimeDb } from '../../context/RealtimeDbContext';
import { BookingStatus } from '../../types';

export const ReportsView: React.FC = () => {
  const { bookings, reports, generateReportDownload } = useRealtimeDb();

  // Administrative Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Filtered ride data
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search matching: ID, passenger, driver, pickup, dropoff
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = b.id.toLowerCase().includes(query);
        const matchesPassenger = b.passenger.name.toLowerCase().includes(query) || b.passenger.phone.includes(query);
        const matchesDriver = b.driverAssigned?.name.toLowerCase().includes(query) || b.driverAssigned?.plateNumber.toLowerCase().includes(query);
        const matchesPickup = b.route.pickup.toLowerCase().includes(query);
        const matchesDropoff = b.route.dropoff.toLowerCase().includes(query);

        if (!matchesId && !matchesPassenger && !matchesDriver && !matchesPickup && !matchesDropoff) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL' && b.status !== selectedStatus) {
        return false;
      }

      // Payment method filter
      if (selectedPayment !== 'ALL' && b.paymentMethod !== selectedPayment) {
        return false;
      }

      // Date quick filter
      if (dateFilter !== 'ALL') {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        if (dateFilter === 'TODAY' && now - b.timestamp > dayMs) {
          return false;
        }
        if (dateFilter === '7DAYS' && now - b.timestamp > 7 * dayMs) {
          return false;
        }
        if (dateFilter === '30DAYS' && now - b.timestamp > 30 * dayMs) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, searchQuery, selectedStatus, selectedPayment, dateFilter]);

  // Aggregate stats for filtered rides
  const filteredMetrics = useMemo(() => {
    const totalCount = filteredBookings.length;
    const totalFare = filteredBookings.reduce((sum, b) => sum + (b.fare || 0), 0);
    const completedCount = filteredBookings.filter((b) => b.status === 'COMPLETED').length;
    const avgFare = totalCount > 0 ? totalFare / totalCount : 0;
    const totalDistance = filteredBookings.reduce((sum, b) => sum + (b.route.distanceKm || 0), 0);

    return {
      totalCount,
      totalFare,
      completedCount,
      avgFare,
      totalDistance,
    };
  }, [filteredBookings]);

  // Handler for Exporting CSV for Administrative Review
  const handleDownloadCsv = () => {
    if (filteredBookings.length === 0) {
      alert('No ride records available in the current filter to export.');
      return;
    }

    const headers = [
      'Trip ID',
      'Date',
      'Time',
      'Status',
      'Passenger Name',
      'Passenger Phone',
      'Driver Assigned',
      'Driver Vehicle',
      'Plate Number',
      'Pickup Location',
      'Dropoff Location',
      'Distance (km)',
      'Fare (PHP)',
      'Payment Method',
      'Surge Multiplier',
      'Export Timestamp',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredBookings.map((b) => [
      escapeCsv(b.id),
      escapeCsv(b.date),
      escapeCsv(b.time),
      escapeCsv(b.status),
      escapeCsv(b.passenger.name),
      escapeCsv(b.passenger.phone),
      escapeCsv(b.driverAssigned?.name || 'Unassigned'),
      escapeCsv(b.driverAssigned?.vehicle || 'N/A'),
      escapeCsv(b.driverAssigned?.plateNumber || 'N/A'),
      escapeCsv(b.route.pickup),
      escapeCsv(b.route.dropoff),
      escapeCsv(b.route.distanceKm?.toFixed(2) || '0.00'),
      escapeCsv(b.fare?.toFixed(2) || '0.00'),
      escapeCsv(b.paymentMethod),
      escapeCsv(b.surgeMultiplier ? `${b.surgeMultiplier}x` : '1.0x'),
      escapeCsv(new Date().toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `swiftride_administrative_ride_audit_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Exported ${filteredBookings.length} ride records to CSV.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedPayment('ALL');
    setDateFilter('ALL');
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'IN PROGRESS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ARRIVING':
      case 'ACCEPTED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'REQUESTED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div id="reports-view-root" className="space-y-6 pb-12 font-['Montserrat',sans-serif]">
      {/* KPI Summary Cards without unnecessary icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Revenue</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">₱2,450,000</span>
            <span className="text-xs text-emerald-400 font-bold block mt-1">+14.2% YTD Growth</span>
          </div>
        </div>

        <div className="p-5 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Active Passengers</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">45,230</span>
            <span className="text-xs text-cyan-400 font-bold block mt-1">Verified User Accounts</span>
          </div>
        </div>

        <div className="p-5 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Completed Rides</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">128,450</span>
            <span className="text-xs text-amber-400 font-bold block mt-1">98.4% Safety Rating</span>
          </div>
        </div>

        <div className="p-5 bg-[#0c121e] border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Avg Dispatch Response</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">2.4 mins</span>
            <span className="text-xs text-purple-400 font-bold block mt-1">Metro Manila Fleet SLA</span>
          </div>
        </div>
      </div>

      {/* Administrative Review & Ride Data Export Section */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Section Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Administrative Audit
              </span>
              <span className="text-xs text-slate-400">
                ({filteredBookings.length} matching {filteredBookings.length === 1 ? 'ride' : 'rides'})
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-1">
              Ride Data Audit & Compliance Export
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filter operational rides by date, status, payment method, or keyword and export official CSV reports for administrative review.
            </p>
          </div>

          {/* Action Button: Download CSV */}
          <div className="flex items-center gap-3">
            {downloadSuccess && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl animate-fade-in">
                {downloadSuccess}
              </span>
            )}
            <button
              id="download-filtered-csv-btn"
              onClick={handleDownloadCsv}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black text-xs font-black rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-6 bg-slate-900/30 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword Search */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Search Record
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Trip ID, Passenger, Driver, Location..."
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Trip Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Trip Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN PROGRESS">In Progress</option>
              <option value="ARRIVING">Arriving</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REQUESTED">Requested</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Payment Method
            </label>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="Cash">Cash</option>
              <option value="Wallet">Wallet</option>
            </select>
          </div>

          {/* Timeframe Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Time Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Last 24 Hours</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Filtered Subset Summary Stats Bar */}
        <div className="px-6 py-3.5 bg-[#080c14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <div>
              <span className="text-slate-500">Filtered Total:</span>{' '}
              <strong className="text-white">{filteredMetrics.totalCount} rides</strong>
            </div>
            <div>
              <span className="text-slate-500">Filtered Volume:</span>{' '}
              <strong className="text-emerald-400">₱{filteredMetrics.totalFare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span className="text-slate-500">Avg Fare:</span>{' '}
              <strong className="text-amber-400">₱{filteredMetrics.avgFare.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-500">Total Distance:</span>{' '}
              <strong className="text-cyan-400">{filteredMetrics.totalDistance.toFixed(1)} km</strong>
            </div>
          </div>

          {(searchQuery || selectedStatus !== 'ALL' || selectedPayment !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-white font-bold text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Filtered Rides Table for Review */}
        <div className="overflow-x-auto">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-300 font-bold text-sm">No ride records match the selected filter criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting the search query or status filters above.</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/40">
                  <th className="py-3 px-6 font-bold">Trip ID & Time</th>
                  <th className="py-3 px-6 font-bold">Passenger</th>
                  <th className="py-3 px-6 font-bold">Driver & Vehicle</th>
                  <th className="py-3 px-6 font-bold">Route Locations</th>
                  <th className="py-3 px-6 font-bold">Distance & Fare</th>
                  <th className="py-3 px-6 font-bold">Payment</th>
                  <th className="py-3 px-6 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBookings.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-amber-400">{trip.id}</div>
                      <div className="text-[11px] text-slate-400">{trip.date} • {trip.time}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-white">{trip.passenger.name}</div>
                      <div className="text-[11px] text-slate-400">{trip.passenger.phone}</div>
                    </td>
                    <td className="py-3.5 px-6">
                      {trip.driverAssigned ? (
                        <>
                          <div className="font-bold text-slate-200">{trip.driverAssigned.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {trip.driverAssigned.vehicle} ({trip.driverAssigned.plateNumber})
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 max-w-xs">
                      <div className="truncate text-slate-300">
                        <span className="text-emerald-400 font-bold">From:</span> {trip.route.pickup}
                      </div>
                      <div className="truncate text-slate-400 mt-0.5">
                        <span className="text-rose-400 font-bold">To:</span> {trip.route.dropoff}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-white text-sm">₱{trip.fare.toFixed(2)}</div>
                      <div className="text-[11px] text-slate-400">{trip.route.distanceKm} km</div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="text-slate-300 font-medium">{trip.paymentMethod}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusBadge(
                          trip.status
                        )}`}
                      >
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pre-Generated Audit & Compliance Reports Table */}
      <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">
            System Compliance & Regulatory Packages
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Archived monthly balance sheets, LTFRB compliance filings, and safety dispatch logs
          </p>
        </div>

        <div className="divide-y divide-slate-800/80">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {report.category}
                  </span>
                  <h5 className="text-sm font-bold text-white">{report.title}</h5>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span>{report.date}</span>
                  <span>•</span>
                  <span className="text-slate-400">{report.fileSize}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">
                    {report.recordsCount.toLocaleString()} records
                  </span>
                </div>
              </div>

              <button
                onClick={() => generateReportDownload(report.id)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all self-start sm:self-auto"
              >
                Download Package
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
