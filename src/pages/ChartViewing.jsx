import React, { useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { FolderOpen, FileText, Image, Search, ShieldCheck, X } from "lucide-react";

const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

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
  const [charts, setCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderName, setFolderName] = useState("");

  const loadFiles = (fileList) => {
    const selectedFiles = Array.from(fileList).filter(isSupportedChart);
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

    setCharts((previousCharts) => {
      revokeChartUrls(previousCharts);
      return nextCharts;
    });
    setSelectedChart(nextCharts[0] || null);
    setFolderName(nextCharts[0]?.path.split("/")[0] || "");
  };

  const handleFolderChange = (event) => {
    loadFiles(event.target.files);
    event.target.value = "";
  };

  const clearFolder = () => {
    setCharts((previousCharts) => {
      revokeChartUrls(previousCharts);
      return [];
    });
    setSelectedChart(null);
    setSearchQuery("");
    setFolderName("");
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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
              Chart <span className="text-green-700">Viewing</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Open scanned chart files from a local folder on this computer.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {charts.length > 0 && (
              <button
                onClick={clearFolder}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-black text-xs uppercase hover:border-red-200 hover:text-red-600 transition-colors"
              >
                <X size={17} />
                Clear
              </button>
            )}
            <button
              onClick={() => folderInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-700 text-white font-black text-xs uppercase shadow-[4px_4px_0_0_#052e16] active:translate-y-1 active:shadow-none transition-all"
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
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

            <div className="bg-white border-2 border-black rounded-2xl overflow-hidden">
              <div className="p-4 border-b-2 border-black bg-slate-50">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search case, patient, or filename"
                    className="w-full border-2 border-black rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mt-3 text-[10px] font-black uppercase text-slate-400">
                  {folderName || "No folder selected"} • {filteredCharts.length} file(s)
                </div>
              </div>

              <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100">
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
                    const isSelected = selectedChart?.url === chart.url;
                    const Icon = chart.type === "application/pdf" ? FileText : Image;

                    return (
                      <button
                        key={chart.url}
                        onClick={() => setSelectedChart(chart)}
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

          <div className="lg:col-span-2">
            <div className="bg-white border-2 border-black rounded-2xl min-h-[660px] overflow-hidden flex flex-col">
              <div className="p-4 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
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
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl border-2 border-black bg-white text-xs font-black uppercase hover:bg-slate-100 transition-colors"
                  >
                    Open Full View
                  </a>
                )}
              </div>

              <div className="flex-1 bg-slate-100">
                {!selectedChart ? (
                  <div className="h-full min-h-[560px] flex items-center justify-center p-8 text-center">
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
                    className="w-full h-[620px] bg-white"
                  />
                ) : (
                  <div className="h-full min-h-[620px] flex items-center justify-center p-4">
                    <img
                      src={selectedChart.url}
                      alt={selectedChart.name}
                      className="max-h-[600px] max-w-full object-contain bg-white border border-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
