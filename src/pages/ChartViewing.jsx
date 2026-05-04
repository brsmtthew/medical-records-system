import React, { useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FolderOpen, FileText, Image, RotateCcw, Search, ShieldCheck, X } from "lucide-react";

const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const chartViewingSession = {
  charts: [],
  selectedPath: "",
  searchQuery: "",
  folderName: "",
};

function readChartViewingSession() {
  return chartViewingSession;
}

function updateChartViewingSession(updates) {
  Object.assign(chartViewingSession, updates);
}

function isSupportedChart(file) {
  return supportedTypes.includes(file.type);
}

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function revokeChartUrls(charts) {
  charts.forEach((chart) => URL.revokeObjectURL(chart.url));
}

export default function ChartViewing() {
  const folderInputRef = useRef(null);
  const [charts, setCharts] = useState(() => readChartViewingSession().charts);
  const [selectedChart, setSelectedChart] = useState(() => {
    const session = readChartViewingSession();
    return session.charts.find((chart) => chart.path === session.selectedPath)
      || session.charts[0]
      || null;
  });
  const [searchQuery, setSearchQuery] = useState(() => readChartViewingSession().searchQuery);
  const [folderName, setFolderName] = useState(() => readChartViewingSession().folderName);
  const [pendingFiles, setPendingFiles] = useState(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const selectChart = (chart) => {
    setSelectedChart(chart);
    updateChartViewingSession({ selectedPath: chart?.path || "" });
  };

  const updateSearchQuery = (value) => {
    setSearchQuery(value);
    updateChartViewingSession({ searchQuery: value });
  };

  const loadFiles = (fileList) => {
    const selectedFiles = Array.from(fileList).filter(isSupportedChart);
    if (selectedFiles.length === 0) {
      setNotice({ type: "info", message: "No supported chart files were found in that folder." });
      return;
    }
    const nextCharts = selectedFiles
      .map((file) => ({
        file,
        name: file.name,
        path: file.webkitRelativePath || file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    const nextFolderName = nextCharts[0]?.path.split("/")[0] || "";
    revokeChartUrls(readChartViewingSession().charts);
    updateChartViewingSession({
      charts: nextCharts,
      selectedPath: nextCharts[0]?.path || "",
      folderName: nextFolderName,
    });

    setCharts(nextCharts);
    setSelectedChart(nextCharts[0] || null);
    setFolderName(nextFolderName);
  };

  const handleFolderChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      setNotice({ type: "info", message: "No chart folder was selected." });
      event.target.value = "";
      return;
    }
    setPendingFiles(selectedFiles);
    event.target.value = "";
  };

  const clearFolder = () => {
    if (charts.length === 0) {
      setNotice({ type: "info", message: "No chart folder is currently loaded." });
      return;
    }
    revokeChartUrls(readChartViewingSession().charts);
    updateChartViewingSession({
      charts: [],
      selectedPath: "",
      searchQuery: "",
      folderName: "",
    });

    setCharts([]);
    setSelectedChart(null);
    setSearchQuery("");
    setFolderName("");
    setIsClearConfirmOpen(false);
    setNotice({ type: "info", message: "Chart folder was cleared." });
  };

  const resetSearch = () => {
    if (!searchQuery) {
      setNotice({ type: "info", message: "No chart search to reset." });
      return;
    }
    updateSearchQuery("");
    setNotice({ type: "info", message: "Chart search was reset." });
  };

  const confirmFolderLoad = () => {
    if (!pendingFiles) return;
    loadFiles(pendingFiles);
    setPendingFiles(null);
  };

  const filteredCharts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return charts;

    return charts.filter((chart) =>
      `${chart.name} ${chart.path}`.toLowerCase().includes(query)
    );
  }, [charts, searchQuery]);

  return (
    <DashboardLayout>
      <div className="min-h-full lg:h-full lg:min-h-0 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Chart <span className="text-green-700">Viewing</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Open scanned chart files from a local folder on this computer.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (charts.length === 0) {
                  setNotice({ type: "info", message: "No chart folder is currently loaded." });
                  return;
                }
                setIsClearConfirmOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-black text-xs uppercase hover:border-blue-200 hover:text-blue-700 transition-colors"
            >
              <X size={17} />
              Clear
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="mrs-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase transition"
            >
              <FolderOpen size={18} />
              Choose Chart Folder
            </button>
          </div>

          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory="true"
            directory=""
            multiple
            onChange={handleFolderChange}
            className="hidden"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3 flex-1 min-h-0 overflow-visible lg:overflow-hidden">
          <div className="lg:col-span-1 min-h-0 flex flex-col gap-3 overflow-visible lg:overflow-hidden">
            <div className="mrs-panel rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-green-50 text-green-700 border border-green-100">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 uppercase text-sm">
                    Local Access Only
                  </h2>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                    Files are previewed from the folder you select. They are not uploaded by this page.
                  </p>
                </div>
              </div>
            </div>

            <div className="mrs-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => updateSearchQuery(event.target.value)}
                    placeholder="Search case, patient, or filename"
                    className="mrs-field w-full rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={resetSearch}
                  className="mrs-soft-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black uppercase"
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
                </div>
                <div className="mt-3 text-[10px] font-black uppercase text-slate-400">
                  {folderName || "No folder selected"} - {filteredCharts.length} file(s)
                </div>
              </div>

              <div className="max-h-[min(34rem,calc(100dvh-20rem))] min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                {filteredCharts.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-black text-slate-700 uppercase text-sm">
                      No charts found
                    </p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Choose a folder with PDF, JPG, PNG, or WEBP scans.
                    </p>
                  </div>
                ) : (
                  filteredCharts.map((chart) => {
                    const isSelected = selectedChart?.path === chart.path;
                    const Icon = chart.type === "application/pdf" ? FileText : Image;

                    return (
                      <button
                        key={chart.url}
                        onClick={() => selectChart(chart)}
                        className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                          isSelected ? "bg-green-50" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl border ${
                            isSelected
                              ? "bg-green-700 text-white border-green-800"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-800">
                            {chart.name}
                          </p>
                          <p className="truncate text-[10px] font-bold uppercase text-slate-400">
                            {chart.path}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-slate-400">
                          {formatFileSize(chart.size)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 min-h-0">
            <div className="mrs-panel rounded-2xl min-h-[65dvh] lg:h-full lg:min-h-0 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
                <div className="min-w-0">
                  <p className="font-black text-slate-800 truncate">
                    {selectedChart?.name || "Select a scanned chart"}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-400 truncate">
                    {selectedChart?.path || "Local PDF and image previews appear here"}
                  </p>
                </div>
                {selectedChart && (
                  <a
                    href={selectedChart.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-black uppercase"
                  >
                    Open Full View
                  </a>
                )}
              </div>

              <div className="flex-1 bg-slate-100">
                {!selectedChart ? (
                  <div className="h-full flex items-center justify-center p-8 text-center">
                    <div>
                      <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-lg font-black text-slate-700 uppercase">
                        Choose a local chart folder
                      </p>
                      <p className="text-sm text-slate-400 font-semibold mt-1">
                        The browser will ask permission before reading files.
                      </p>
                    </div>
                  </div>
                ) : selectedChart.type === "application/pdf" ? (
                  <iframe
                    src={selectedChart.url}
                    title={selectedChart.name}
                    className="w-full h-full bg-white"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-4">
                    <img
                      src={selectedChart.url}
                      alt={selectedChart.name}
                      className="max-h-full max-w-full object-contain bg-white border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {pendingFiles && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setPendingFiles(null)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mrs-panel relative w-full max-w-md rounded-2xl p-6"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <FolderOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase">Load Chart Folder?</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    {pendingFiles.length} selected file(s)
                  </p>
                </div>
              </div>
              <p className="mb-6 text-sm font-semibold text-slate-500">
                This will replace the current local chart preview list.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPendingFiles(null)}
                  className="rounded-xl py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmFolderLoad}
                  className="mrs-blue-button rounded-xl py-3 text-xs font-black uppercase"
                >
                  Load
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isClearConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45"
              onClick={() => setIsClearConfirmOpen(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mrs-panel relative w-full max-w-sm rounded-2xl p-6 text-center"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <FolderOpen size={26} />
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase">Clear Folder?</h2>
              <p className="mt-2 mb-6 text-sm font-semibold text-slate-500">
                This will remove the current local previews from this screen.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="rounded-xl py-3 text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={clearFolder}
                  className="mrs-blue-button rounded-xl py-3 text-xs font-black uppercase"
                >
                  Clear
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
      <FloatingToast toast={notice} onClose={() => setNotice(null)} />
    </DashboardLayout>
  );
}
