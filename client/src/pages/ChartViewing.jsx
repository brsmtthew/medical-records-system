import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import FloatingToast from "../components/FloatingToast";
import ChartClearFolderModal from "../modals/chart/ChartClearFolderModal";
import ChartFolderLoadModal from "../modals/chart/ChartFolderLoadModal";
import ChartFullscreenImageModal from "../modals/chart/ChartFullscreenImageModal";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FileText,
  Image,
  Maximize2,
  RotateCcw,
  Search,
  ShieldCheck,
  SortAsc,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const chartViewingSession = {
  charts: [],
  selectedPath: "",
  searchQuery: "",
  folderName: "",
};

// Reads the in-memory folder preview state used while navigating inside the app.
function readChartViewingSession() {
  return chartViewingSession;
}

// Updates the in-memory folder preview state without persisting local file paths.
function updateChartViewingSession(updates) {
  Object.assign(chartViewingSession, updates);
}

// Accepts only PDF and browser-previewable image scans.
function isSupportedChart(file) {
  return supportedTypes.includes(file.type);
}

// Formats file sizes for the chart list.
function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

// Releases object URLs when replacing or clearing the selected folder.
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
  const [isFolderPickerConfirmOpen, setIsFolderPickerConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [sortMode, setSortMode] = useState("path");
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [unsupportedCount, setUnsupportedCount] = useState(0);

  // Selects a chart preview and remembers it for the current session.
  const selectChart = useCallback((chart) => {
    setSelectedChart(chart);
    setImageZoom(1);
    setImageRotation(0);
    setPdfPage(1);
    setIsPreviewLoading(Boolean(chart));
    updateChartViewingSession({ selectedPath: chart?.path || "" });
  }, []);

  // Updates chart search text and keeps it in the current session state.
  const updateSearchQuery = (value) => {
    setSearchQuery(value);
    updateChartViewingSession({ searchQuery: value });
  };

  // Builds preview rows for supported files selected from a local folder.
  const loadFiles = (fileList) => {
    const allFiles = Array.from(fileList);
    const selectedFiles = allFiles.filter(isSupportedChart);
    const nextUnsupportedCount = allFiles.length - selectedFiles.length;
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
    setUnsupportedCount(nextUnsupportedCount);
    setImageZoom(1);
    setImageRotation(0);
    setPdfPage(1);
    setIsPreviewLoading(Boolean(nextCharts[0]));
    setSelectedChart(nextCharts[0] || null);
    setFolderName(nextFolderName);
    if (nextUnsupportedCount > 0) {
      setNotice({ type: "info", message: `${nextUnsupportedCount} unsupported file(s) were skipped.` });
    }
  };

  // Captures a chosen folder and asks for confirmation before replacing previews.
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

  // Clears all local chart previews and releases their object URLs.
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
    setUnsupportedCount(0);
    setIsClearConfirmOpen(false);
    setNotice({ type: "info", message: "Chart folder was cleared." });
  };

  // Clears chart search text with feedback when already empty.
  const resetSearch = () => {
    if (!searchQuery) {
      setNotice({ type: "info", message: "No chart search to reset." });
      return;
    }
    updateSearchQuery("");
    setNotice({ type: "info", message: "Chart search was reset." });
  };

  // Loads the pending folder after the user confirms replacement.
  const confirmFolderLoad = () => {
    if (!pendingFiles) return;
    loadFiles(pendingFiles);
    setPendingFiles(null);
  };

  const openFolderPicker = () => {
    setIsFolderPickerConfirmOpen(false);
    folderInputRef.current?.click();
  };

  const sortedCharts = useMemo(() => {
    return [...charts].sort((first, second) => {
      if (sortMode === "name") return first.name.localeCompare(second.name);
      if (sortMode === "size") return second.size - first.size;
      if (sortMode === "type") return first.type.localeCompare(second.type) || first.path.localeCompare(second.path);
      return first.path.localeCompare(second.path);
    });
  }, [charts, sortMode]);

  const filteredCharts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedCharts;

    return sortedCharts.filter((chart) =>
      `${chart.name} ${chart.path}`.toLowerCase().includes(query)
    );
  }, [searchQuery, sortedCharts]);

  const selectedIndex = filteredCharts.findIndex((chart) => chart.path === selectedChart?.path);
  const selectRelativeChart = useCallback((direction) => {
    if (filteredCharts.length === 0) return;
    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = (currentIndex + direction + filteredCharts.length) % filteredCharts.length;
    selectChart(filteredCharts[nextIndex]);
  }, [filteredCharts, selectChart, selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        selectRelativeChart(1);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        selectRelativeChart(-1);
      }
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectRelativeChart]);

  useEffect(() => {
    const releaseUrls = () => revokeChartUrls(readChartViewingSession().charts);
    window.addEventListener("beforeunload", releaseUrls);
    return () => window.removeEventListener("beforeunload", releaseUrls);
  }, []);

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 flex-col justify-between gap-2 xl:flex-row xl:items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800 sm:text-2xl">
              Chart <span className="text-green-700">Viewing</span>
            </h1>
            <p className="text-xs font-medium text-slate-500">
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
              onClick={() => setIsFolderPickerConfirmOpen(true)}
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

        <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-3">
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden lg:col-span-1">
            <div className="mrs-panel rounded-xl p-3">
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
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value)}
                    className="mrs-field rounded-xl px-3 py-2 text-xs font-black"
                    aria-label="Sort local chart files"
                  >
                    <option value="path">Sort by Folder Path</option>
                    <option value="name">Sort by File Name</option>
                    <option value="type">Sort by File Type</option>
                    <option value="size">Sort by File Size</option>
                  </select>
                  <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500">
                    <SortAsc size={14} />
                    {filteredCharts.length}
                  </div>
                </div>
                <div className="mt-3 text-[10px] font-black uppercase text-slate-400">
                  {folderName || "No folder selected"} - {filteredCharts.length} file(s)
                  {unsupportedCount > 0 ? ` - ${unsupportedCount} skipped` : ""}
                </div>
              </div>

              <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
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
            <div className="mrs-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl">
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => selectRelativeChart(-1)} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase" title="Previous chart">
                      <ChevronLeft size={15} />
                    </button>
                    <button type="button" onClick={() => selectRelativeChart(1)} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase" title="Next chart">
                      <ChevronRight size={15} />
                    </button>
                    {selectedChart.type === "application/pdf" ? (
                      <>
                        <button type="button" onClick={() => setPdfPage((page) => Math.max(1, page - 1))} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase">Page -</button>
                        <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Page {pdfPage}</span>
                        <button type="button" onClick={() => setPdfPage((page) => page + 1)} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase">Page +</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setImageZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase" title="Zoom out">
                          <ZoomOut size={15} />
                        </button>
                        <button type="button" onClick={() => setImageZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase" title="Zoom in">
                          <ZoomIn size={15} />
                        </button>
                        <button type="button" onClick={() => setImageRotation((value) => (value + 90) % 360)} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase" title="Rotate image">
                          <RotateCcw size={15} />
                        </button>
                        <button type="button" onClick={() => setIsFullscreenOpen(true)} className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black uppercase" title="Fullscreen preview">
                          <Maximize2 size={15} />
                        </button>
                      </>
                    )}
                    <a
                      href={selectedChart.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mrs-soft-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-black uppercase"
                    >
                      Open Full View
                    </a>
                  </div>
                )}
              </div>

              <div className="relative flex-1 bg-slate-100">
                {isPreviewLoading && selectedChart && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
                    <div className="h-20 w-48 animate-pulse rounded-xl bg-white/80" />
                  </div>
                )}
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
                    src={`${selectedChart.url}#page=${pdfPage}`}
                    title={selectedChart.name}
                    className="w-full h-full bg-white"
                    onLoad={() => setIsPreviewLoading(false)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center overflow-auto p-4">
                    <img
                      src={selectedChart.url}
                      alt={selectedChart.name}
                      onLoad={() => setIsPreviewLoading(false)}
                      className="max-h-full max-w-full object-contain bg-white border border-slate-200 transition-transform"
                      style={{ transform: `scale(${imageZoom}) rotate(${imageRotation}deg)` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ChartFolderLoadModal
        confirmLabel="Choose Folder"
        description="The browser will ask permission to read files from the folder you select. Files stay local and are only used for previews in this screen."
        isOpen={isFolderPickerConfirmOpen}
        onCancel={() => setIsFolderPickerConfirmOpen(false)}
        onConfirm={openFolderPicker}
        subtitle="Local access only"
        title="Choose Chart Folder?"
      />
      <ChartFolderLoadModal
        fileCount={pendingFiles?.length || 0}
        isOpen={Boolean(pendingFiles)}
        onCancel={() => setPendingFiles(null)}
        onConfirm={confirmFolderLoad}
      />
      <ChartClearFolderModal
        isOpen={isClearConfirmOpen}
        onCancel={() => setIsClearConfirmOpen(false)}
        onConfirm={clearFolder}
      />
      <FloatingToast toast={notice} onClose={() => setNotice(null)} />
      <ChartFullscreenImageModal
        imageRotation={imageRotation}
        imageZoom={imageZoom}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        selectedChart={selectedChart}
      />
    </DashboardLayout>
  );
}
