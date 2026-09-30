import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Database, RefreshCw, Eye, FileCode, CheckCircle2, Image as ImageIcon, Search } from 'lucide-react';
import { getDriverRequirementUrls, REQUIREMENT_TYPES } from '../../utils/documentHelpers';

const COLLECTIONS = [
  { id: 'drivers', label: 'drivers/{driverId}', description: 'Driver profiles & requirement fields' },
  { id: 'requirements', label: 'requirements/{driverId}', description: 'Uploaded driver requirement images' },
  { id: 'driverApplications', label: 'driverApplications/{driverId}', description: 'Driver onboarding submissions' },
  { id: 'users', label: 'users/{userId}', description: 'Mobile app user & driver accounts' },
  { id: 'passengers', label: 'passengers/{passengerId}', description: 'Registered passenger profiles' },
  { id: 'bookings', label: 'bookings/{bookingId}', description: 'Live & historical ride bookings' },
  { id: 'emergencyAlerts', label: 'emergencyAlerts/{alertId}', description: 'Safety SOS dispatch records' },
] as const;

export const FirestoreDatabaseInspector: React.FC = () => {
  const [selectedCol, setSelectedCol] = useState<string>('drivers');
  const [docs, setDocs] = useState<Array<{ id: string; data: Record<string, any> }>>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<{ title: string; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    let unsub: (() => void) | undefined;
    try {
      const colRef = collection(db, selectedCol);
      unsub = onSnapshot(
        colRef,
        (snapshot) => {
          const list: Array<{ id: string; data: Record<string, any> }> = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, data: d.data() as Record<string, any> });
          });
          setDocs(list);
          setSelectedDocId((prev) => {
            if (prev && list.some((item) => item.id === prev)) return prev;
            return list[0]?.id || null;
          });
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        }
      );
    } catch {
      setIsLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [selectedCol]);

  const filteredDocs = docs.filter((docItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      docItem.id.toLowerCase().includes(q) ||
      JSON.stringify(docItem.data).toLowerCase().includes(q)
    );
  });

  const selectedDoc = filteredDocs.find((d) => d.id === selectedDocId) || filteredDocs[0] || null;
  const reqSummary = selectedDoc ? getDriverRequirementUrls([selectedDoc.data]) : null;

  // Format JSON without overflowing massive base64 strings
  const formatReadableJson = (obj: Record<string, any>) => {
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (typeof value === 'string' && value.startsWith('data:image/') && value.length > 160) {
          return `${value.slice(0, 64)}... [base64 image: ${value.length.toLocaleString()} chars]`;
        }
        return value;
      },
      2
    );
  };

  return (
    <div className="bg-[#0c121e] border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-0">
      {/* Top Database Banner */}
      <div className="p-4 sm:p-5 bg-[#080c14] border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">
                Live Cloud Firestore Database Inspector
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                onSnapshot Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Project: <span className="text-slate-200 font-bold">sylvan-nova-8tvkm</span> • Database ID:{' '}
              <span className="text-amber-400 font-bold">ai-studio-170da599-c668-40cc-9d73-135f9e56a917</span>
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter documents by ID, name, field..."
            className="w-full bg-[#0c121e] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* Collection Tabs */}
      <div className="px-4 py-2.5 bg-[#0a0f1a] border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {COLLECTIONS.map((col) => (
          <button
            key={col.id}
            onClick={() => setSelectedCol(col.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCol === col.id
                ? 'bg-amber-500 text-black font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* Main Split View: Document List + Document Fields & Requirement Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[520px] divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        {/* Left: Document IDs in Selected Collection */}
        <div className="lg:col-span-1 flex flex-col bg-[#080d18]">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono font-bold text-slate-300">
              {selectedCol} ({filteredDocs.length} docs)
            </span>
            {isLoading && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-slate-800/60">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No documents found in <code className="text-amber-400">{selectedCol}</code> collection.
              </div>
            ) : (
              filteredDocs.map((item) => {
                const isSelected = selectedDoc?.id === item.id;
                const d = item.data;
                const displayName =
                  d.name || d.fullName || d.userName || d.passenger?.name || d.title || d.subject || '';
                const reqInfo =
                  selectedCol === 'drivers' || selectedCol === 'requirements' || selectedCol === 'driverApplications'
                    ? getDriverRequirementUrls([d])
                    : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDocId(item.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-amber-500/15 border-l-2 border-amber-400' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-amber-400 truncate">{item.id}</div>
                      {displayName && (
                        <div className="text-xs text-slate-200 font-semibold truncate mt-0.5">{displayName}</div>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {Object.keys(d).length} fields
                      </div>
                    </div>

                    {reqInfo && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${
                          reqInfo.uploadedRequirementsCount >= 5
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : reqInfo.uploadedRequirementsCount > 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {reqInfo.uploadedRequirementsCount}/5 imgs
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Document Inspector */}
        <div className="lg:col-span-2 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[560px]">
          {!selectedDoc ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16">
              <FileCode className="w-8 h-8 mb-2 text-slate-600" />
              <p className="text-sm font-bold text-slate-300">Select a document to inspect its fields</p>
            </div>
          ) : (
            <>
              {/* Document Path Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    Firestore Document Path
                  </span>
                  <code className="text-xs sm:text-sm font-mono font-bold text-amber-400">
                    /{selectedCol}/{selectedDoc.id}
                  </code>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Fields: <strong className="text-white">{Object.keys(selectedDoc.data).length}</strong>
                </span>
              </div>

              {/* 5 Requirement Image Columns Preview (for drivers / requirements / driverApplications) */}
              {(selectedCol === 'drivers' ||
                selectedCol === 'requirements' ||
                selectedCol === 'driverApplications') &&
                reqSummary && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Resolved Requirement Image Fields ({reqSummary.uploadedRequirementsCount} / 5 Uploaded)
                        </span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        requirements[] • requirementsMap • top-level URLs
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {REQUIREMENT_TYPES.map((typeKey) => {
                        const imgUrl = reqSummary.urls[typeKey];
                        return (
                          <div
                            key={typeKey}
                            onClick={() => {
                              if (imgUrl) setPreviewImageUrl({ title: `${selectedDoc.id} • ${typeKey}`, url: imgUrl });
                            }}
                            className={`p-2 rounded-xl border flex flex-col justify-between ${
                              imgUrl
                                ? 'bg-slate-900/90 border-emerald-500/40 cursor-pointer hover:border-amber-400'
                                : 'bg-slate-950/60 border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[9px] font-mono font-bold text-amber-400 truncate">
                                {typeKey}
                              </span>
                              {imgUrl && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                            </div>

                            <div className="h-20 w-full rounded-lg bg-[#050811] border border-slate-800 overflow-hidden flex items-center justify-center">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={typeKey}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">Empty</span>
                              )}
                            </div>

                            <div className="mt-1.5 text-[9px] font-mono truncate text-slate-400">
                              {imgUrl ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Eye className="w-2.5 h-2.5" /> View Full
                                </span>
                              ) : (
                                'Not uploaded'
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Raw Document JSON */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Document Fields & Columns (Raw Firestore Data)
                </span>
                <pre className="p-4 rounded-2xl bg-[#060911] border border-slate-800 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed">
                  {formatReadableJson(selectedDoc.data)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-Size Image Lightbox */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full bg-[#0a101d] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-400">{previewImageUrl.title}</span>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-4 bg-[#050811] flex items-center justify-center max-h-[75vh]">
              <img
                src={previewImageUrl.url}
                alt={previewImageUrl.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
