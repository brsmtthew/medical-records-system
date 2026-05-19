import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ChartFullscreenImageModal({
  imageRotation,
  imageZoom,
  isOpen,
  onClose,
  selectedChart,
}) {
  return (
    <AnimatePresence>
      {isOpen && selectedChart && selectedChart.type !== "application/pdf" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Close fullscreen image"
          >
            <X size={22} />
          </button>
          <img
            src={selectedChart.url}
            alt={selectedChart.name}
            className="max-h-full max-w-full object-contain"
            style={{ transform: `scale(${imageZoom}) rotate(${imageRotation}deg)` }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
