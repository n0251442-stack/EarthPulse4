import React, { useState, useEffect } from 'react';
import { nasaDataService, ValidatedRecord, NASA_DATASET_METADATA } from '../services/nasaDataService';
import { USER_DATASET_METADATA } from '../data/userReferenceData';
import { audioEngine, anomalyToExactFrequency, anomalyToPianoKey } from '../services/audioEngine';
import { useAccessibility } from '../context/AccessibilityContext';
import { X, Download, Search, Play, Volume2, Info, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectYear: (year: number) => void;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({
  isOpen,
  onClose,
  onSelectYear,
}) => {
  const { settings } = useAccessibility();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [decadeFilter, setDecadeFilter] = useState<string>('all');
  const [showMonthly, setShowMonthly] = useState<boolean>(false);
  const [records, setRecords] = useState<ValidatedRecord[]>(() => nasaDataService.getValidatedRecords());
  const [inspectRecord, setInspectRecord] = useState<ValidatedRecord | null>(null);
  const [playingYear, setPlayingYear] = useState<number | null>(null);

  useEffect(() => {
    const immediate = nasaDataService.getValidatedRecords();
    if (immediate.length > 0) {
      setRecords(immediate);
    }
    nasaDataService.init().then(() => {
      const validated = nasaDataService.getValidatedRecords();
      if (validated.length > 0) {
        setRecords(validated);
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredData = records.filter((row) => {
    const matchesSearch =
      row.year.toString().includes(searchTerm) ||
      (row.milestone && row.milestone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDecade =
      decadeFilter === 'all' ||
      Math.floor(row.year / 10) * 10 === parseInt(decadeFilter, 10);

    return matchesSearch && matchesDecade;
  });

  const downloadOriginalNASA_CSV = () => {
    const rawText = nasaDataService.getRawCsvText();
    const blob = new Blob([rawText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GLB.Ts+dSST.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadComparisonCSV = () => {
    const headers = [
      'Year',
      'NASA_J_D_Anomaly_C',
      'NASA_D_N_Anomaly_C',
      'User_No_Smoothing_C',
      'User_Lowess_5_C',
      'Centered_5_Year_Moving_Average_C',
      'Difference_NASA_minus_User_C',
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      'DJF', 'MAM', 'JJA', 'SON',
      'Milestone_Note'
    ];

    const rows = records.map((r) => [
      r.year,
      r.nasaJD.toFixed(2),
      r.nasaDN !== null ? r.nasaDN.toFixed(2) : '',
      r.userNoSmoothing.toFixed(2),
      r.userLowess5.toFixed(2),
      r.fiveYearMean.toFixed(2),
      r.diff.toFixed(2),
      r.months.Jan ?? '', r.months.Feb ?? '', r.months.Mar ?? '', r.months.Apr ?? '',
      r.months.May ?? '', r.months.Jun ?? '', r.months.Jul ?? '', r.months.Aug ?? '',
      r.months.Sep ?? '', r.months.Oct ?? '', r.months.Nov ?? '', r.months.Dec ?? '',
      r.seasonal.DJF ?? '', r.seasonal.MAM ?? '', r.seasonal.JJA ?? '', r.seasonal.SON ?? '',
      `"${(r.milestone || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'EarthPulse_DualSource_Validated_Temperature_1880-2025.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlayRowSound = (row: ValidatedRecord) => {
    setPlayingYear(row.year);
    audioEngine.playDiscretePulse(row.nasaJD, 1.2, settings.volume);
    setTimeout(() => {
      setPlayingYear(null);
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-table-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md"
    >
      <div
        className={`w-full max-w-6xl max-h-[92vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden ${
          settings.highContrast
            ? 'bg-black border-2 border-[#ffe600] text-white'
            : 'bg-black/95 backdrop-blur-2xl border-cyan-500/30 text-slate-100 shadow-[0_0_60px_rgba(6,182,212,0.25)]'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs">
              <span className="font-semibold text-cyan-400">NASA GISTEMP v4</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">1951–1980 Baseline (14.0°C)</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dual-Source Validated (1880–2025)
              </span>
            </div>
            <h2 id="data-table-title" className="text-lg sm:text-2xl font-bold tracking-tight text-white">
              Historical Climate Observations & Two-Source Validation
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Dynamically parsed from official NASA GISTEMP v4 (<span className="text-cyan-300 font-mono">GLB.Ts+dSST.csv</span>)
              and cross-referenced year-by-year with the user-supplied 1880–2025 reference series. Both sources are preserved distinctly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-black/40">
          <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:min-w-[260px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search year or milestone (e.g. 1998, 2024, El Niño, Pinatubo)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono border focus-visible:outline-none focus-visible:ring-2 ${
                  settings.highContrast
                    ? 'bg-black border-[#ffe600] text-white focus-visible:ring-[#ffe600]'
                    : 'bg-slate-900 border-slate-700 text-white focus-visible:ring-cyan-400'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={decadeFilter}
              onChange={(e) => setDecadeFilter(e.target.value)}
              aria-label="Filter by Decade"
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                settings.highContrast
                  ? 'bg-black border-[#ffe600] text-[#ffe600]'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <option value="all">All Decades (1880 – 2025)</option>
              <option value="1880">1880s</option>
              <option value="1890">1890s</option>
              <option value="1900">1900s</option>
              <option value="1910">1910s</option>
              <option value="1920">1920s</option>
              <option value="1930">1930s</option>
              <option value="1940">1940s</option>
              <option value="1950">1950s</option>
              <option value="1960">1960s</option>
              <option value="1970">1970s</option>
              <option value="1980">1980s</option>
              <option value="1990">1990s</option>
              <option value="2000">2000s</option>
              <option value="2010">2010s</option>
              <option value="2020">2020s</option>
            </select>

            <button
              onClick={() => setShowMonthly(!showMonthly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors whitespace-nowrap ${
                showMonthly
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {showMonthly ? 'Hide Monthly Table' : 'Show Monthly Values'}
            </button>

            {/* CSV 1: Official NASA */}
            <button
              onClick={downloadOriginalNASA_CSV}
              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap"
              title="Download original NASA GLB.Ts+dSST.csv directly"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Official NASA CSV</span>
            </button>

            {/* CSV 2: Processed Comparison */}
            <button
              onClick={downloadComparisonCSV}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                settings.highContrast
                  ? 'bg-[#ffe600] text-black border-[#ffe600]'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
              title="Download EarthPulse dual-source verified and compared dataset"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Comparison CSV</span>
            </button>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="px-3 sm:px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span><strong>NASA J-D:</strong> Official Jan–Dec Annual Mean</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span><strong>NASA D-N:</strong> Dec–Nov Meteorological Mean</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span><strong>User Ref:</strong> No_Smoothing</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span><strong>Lowess(5):</strong> 5-Yr Locally Weighted Smoothing</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span><strong>5-Yr Mean:</strong> 5-Yr Centered Arithmetic Average</span>
          </div>
          <div className="text-cyan-400 font-mono">
            Showing {filteredData.length} of {records.length} Records
          </div>
        </div>

        {/* Scrollable Data Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-4">
          <table
            className="w-full text-left text-xs border-collapse"
            aria-label="Two-Source Temperature Comparison Table"
          >
            <thead className="sticky top-0 bg-neutral-950 border-b border-slate-700 z-10 font-mono text-slate-300 uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap">Year</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap text-cyan-400">NASA J-D (°C)</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap hidden md:table-cell">NASA D-N (°C)</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap text-amber-300">User Ref (°C)</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap text-emerald-300">Lowess(5)</th>
                <th scope="col" className="py-2.5 px-3 whitespace-nowrap hidden lg:table-cell">5-Yr Mean</th>
                <th scope="col" className="py-2.5 px-2 whitespace-nowrap text-center">Δ (Diff)</th>
                {showMonthly ? (
                  <>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Jan</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Feb</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Mar</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Apr</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">May</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Jun</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Jul</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Aug</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Sep</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Oct</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Nov</th>
                    <th scope="col" className="py-2.5 px-1.5 text-center">Dec</th>
                  </>
                ) : (
                  <th scope="col" className="py-2.5 px-3">Milestone / Scientific Note</th>
                )}
                <th scope="col" className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono tabular-nums text-xs">
              {filteredData.map((row) => {
                const isWarming = row.nasaJD > 0;
                const isPeak = row.nasaJD >= 1.0;
                const hasVariance = row.hasDiff;
                const isSelectedForPlay = playingYear === row.year;

                return (
                  <tr
                    key={row.year}
                    className={`transition-colors ${
                      isSelectedForPlay
                        ? 'bg-cyan-950/50'
                        : row.year === 2025
                        ? 'bg-amber-950/20 hover:bg-amber-950/40'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap">
                      {row.year}
                      {row.year === 2025 && (
                        <span className="ml-1.5 text-[10px] font-normal text-amber-400 bg-amber-950/60 border border-amber-800/60 rounded px-1 py-0.2">
                          Latest 2025
                        </span>
                      )}
                    </td>

                    {/* NASA J-D */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          isPeak
                            ? 'text-rose-400'
                            : isWarming
                            ? 'text-cyan-300'
                            : 'text-blue-400'
                        }`}
                      >
                        {isWarming ? '+' : ''}{row.nasaJD.toFixed(2)}
                      </span>
                    </td>

                    {/* NASA D-N */}
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap hidden md:table-cell">
                      {row.nasaDN !== null
                        ? `${row.nasaDN > 0 ? '+' : ''}${row.nasaDN.toFixed(2)}`
                        : '—'}
                    </td>

                    {/* User Reference No_Smoothing */}
                    <td className="py-2 px-3 text-amber-200/90 whitespace-nowrap">
                      {row.userNoSmoothing > 0 ? '+' : ''}{row.userNoSmoothing.toFixed(2)}
                    </td>

                    {/* User Reference Lowess(5) */}
                    <td className="py-2 px-3 text-emerald-300/90 whitespace-nowrap">
                      {row.userLowess5 > 0 ? '+' : ''}{row.userLowess5.toFixed(2)}
                    </td>

                    {/* Genuine 5-Yr Centered Moving Average */}
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap hidden lg:table-cell">
                      {row.fiveYearMean > 0 ? '+' : ''}{row.fiveYearMean.toFixed(2)}
                    </td>

                    {/* Difference */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {hasVariance ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/50 border border-amber-800/50 rounded px-1.5 py-0.5" title={`NASA J-D (${row.nasaJD}) vs User No_Smoothing (${row.userNoSmoothing}): diff ${row.diff > 0 ? '+' : ''}${row.diff.toFixed(2)}°C`}>
                          <AlertTriangle className="w-3 h-3" />
                          {row.diff > 0 ? '+' : ''}{row.diff.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">0.00</span>
                      )}
                    </td>

                    {/* Monthly Values or Milestone */}
                    {showMonthly ? (
                      (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as (keyof typeof row.months)[]).map((m) => {
                        const val = row.months[m];
                        return (
                          <td key={m} className="py-2 px-1 text-center text-[11px] whitespace-nowrap text-slate-300">
                            {val !== null ? (
                              <span className={val > 0.8 ? 'text-rose-400' : val > 0 ? 'text-cyan-300' : 'text-blue-400'}>
                                {val > 0 ? '+' : ''}{val.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td className="py-2 px-3 text-slate-300 max-w-md truncate font-sans text-xs">
                        {row.milestone || (row.sourceNote ? (
                          <span className="text-amber-300/80 italic">{row.sourceNote}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        ))}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePlayRowSound(row)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
                          title="Listen to this year's sonification"
                          aria-label={`Sonify ${row.year}`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setInspectRecord(row)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                          title="Inspect full details and comparison"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-black/40 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span>Primary Authority:</span>
            <span className="font-semibold text-slate-200">NASA GISTEMP v4 (Jan 2026 update)</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span>User Reference:</span>
            <span className="font-semibold text-slate-200">1880–2025 Land-Ocean Index</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Explorer
          </button>
        </div>
      </div>

      {/* Inspect Single Year Deep-Dive Sub-Modal */}
      {inspectRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspect-dialog-title"
          className="fixed inset-0 z-60 flex items-center justify-center p-2.5 sm:p-4 bg-black/90 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-cyan-500/40 bg-neutral-950 p-4 sm:p-6 shadow-2xl text-slate-100 flex flex-col gap-4 sm:gap-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Detailed Observation Record</span>
                <h3 id="inspect-dialog-title" className="text-2xl font-bold text-white mt-0.5">
                  Year {inspectRecord.year} Deep-Dive Inspection
                </h3>
              </div>
              <button
                onClick={() => setInspectRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30">
                <div className="text-[10px] font-mono text-slate-400 uppercase">NASA J-D (Annual)</div>
                <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                  {inspectRecord.nasaJD > 0 ? '+' : ''}{inspectRecord.nasaJD.toFixed(2)}°C
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Official Jan–Dec</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700">
                <div className="text-[10px] font-mono text-slate-400 uppercase">NASA D-N (Met)</div>
                <div className="text-xl font-mono font-bold text-slate-200 mt-1">
                  {inspectRecord.nasaDN !== null ? `${inspectRecord.nasaDN > 0 ? '+' : ''}${inspectRecord.nasaDN.toFixed(2)}°C` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Dec–Nov Met-year</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30">
                <div className="text-[10px] font-mono text-amber-400 uppercase">User Ref Series</div>
                <div className="text-xl font-mono font-bold text-amber-300 mt-1">
                  {inspectRecord.userNoSmoothing > 0 ? '+' : ''}{inspectRecord.userNoSmoothing.toFixed(2)}°C
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">No_Smoothing record</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30">
                <div className="text-[10px] font-mono text-emerald-400 uppercase">Lowess(5)</div>
                <div className="text-xl font-mono font-bold text-emerald-300 mt-1">
                  {inspectRecord.userLowess5 > 0 ? '+' : ''}{inspectRecord.userLowess5.toFixed(2)}°C
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">5-Yr locally weighted</div>
              </div>
            </div>

            {/* Sonification Math & Audio Mapping */}
            {(() => {
              const pianoKey = anomalyToPianoKey(inspectRecord.nasaJD);
              const freq = anomalyToExactFrequency(inspectRecord.nasaJD);

              return (
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-cyan-300 font-semibold flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4" /> Calibrated Sonification Mapping
                    </div>
                    <div className="text-sm font-mono text-white mt-1">
                      Note: <span className="text-cyan-400 font-bold">{pianoKey.note}</span> (MIDI {pianoKey.midi}) · Freq: <span className="text-cyan-400 font-bold">{Math.round(freq * 10) / 10} Hz</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Formula: <span className="font-mono text-slate-300">f = 261.625565 × 2^({inspectRecord.nasaJD.toFixed(2)} / 1.2)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => audioEngine.playDiscretePulse(inspectRecord.nasaJD, 1.5, settings.volume)}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shrink-0 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Audio Pulse</span>
                  </button>
                </div>
              );
            })()}

            {/* 12-Month Calendar Grid */}
            <div>
              <div className="text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
                12-Month Temperature Anomalies (°C)
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5 text-center font-mono">
                {(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as (keyof typeof inspectRecord.months)[]).map((m) => {
                  const val = inspectRecord.months[m];
                  return (
                    <div key={m} className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 font-sans">{m}</span>
                      <span className={`text-xs font-semibold mt-1 ${val !== null && val > 0 ? 'text-cyan-400' : 'text-blue-400'}`}>
                        {val !== null ? `${val > 0 ? '+' : ''}${val.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seasonal breakdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono p-3 rounded-lg bg-slate-900/50 border border-slate-800">
              <span className="text-slate-400 font-sans w-full sm:w-auto">Seasonal Means:</span>
              <span>DJF: <strong className="text-slate-200">{inspectRecord.seasonal.DJF !== null ? `${inspectRecord.seasonal.DJF > 0 ? '+' : ''}${inspectRecord.seasonal.DJF.toFixed(2)}°C` : '—'}</strong></span>
              <span>MAM: <strong className="text-slate-200">{inspectRecord.seasonal.MAM !== null ? `${inspectRecord.seasonal.MAM > 0 ? '+' : ''}${inspectRecord.seasonal.MAM.toFixed(2)}°C` : '—'}</strong></span>
              <span>JJA: <strong className="text-slate-200">{inspectRecord.seasonal.JJA !== null ? `${inspectRecord.seasonal.JJA > 0 ? '+' : ''}${inspectRecord.seasonal.JJA.toFixed(2)}°C` : '—'}</strong></span>
              <span>SON: <strong className="text-slate-200">{inspectRecord.seasonal.SON !== null ? `${inspectRecord.seasonal.SON > 0 ? '+' : ''}${inspectRecord.seasonal.SON.toFixed(2)}°C` : '—'}</strong></span>
            </div>

            {/* Historical Milestone / Source Notes */}
            {inspectRecord.milestone && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Historical Milestone ({inspectRecord.year})
                </div>
                <div className="text-slate-300 leading-relaxed">{inspectRecord.milestone}</div>
              </div>
            )}

            {inspectRecord.sourceNote && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                <strong>Two-Source Note:</strong> {inspectRecord.sourceNote}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  onSelectYear(inspectRecord.year);
                  setInspectRecord(null);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
              >
                View on 3D Globe ({inspectRecord.year})
              </button>
              <button
                onClick={() => setInspectRecord(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
