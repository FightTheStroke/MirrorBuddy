/**
 * @file webcam-header.tsx
 * @brief Webcam header component
 */

import { Camera, X, ChevronDown, Smartphone, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { isContinuityCamera, type CameraDevice } from "../utils/camera-utils";

interface WebcamHeaderProps {
  purpose: string;
  instructions?: string;
  availableCameras: CameraDevice[];
  selectedCameraId: string | null;
  activeCameraLabel: string;
  currentCameraName: string;
  showCameraMenu: boolean;
  isSwitchingCamera: boolean;
  capturedImage: string | null;
  error: string | null;
  onToggleMenu: () => void;
  onSwitchCamera: (deviceId: string) => void;
  onClose: () => void;
  getCameraIcon: (camera: CameraDevice) => React.ReactNode;
}

export function WebcamHeader({
  purpose,
  instructions,
  availableCameras,
  selectedCameraId,
  activeCameraLabel,
  currentCameraName,
  showCameraMenu,
  isSwitchingCamera,
  capturedImage,
  error,
  onToggleMenu,
  onSwitchCamera,
  onClose,
  getCameraIcon,
}: WebcamHeaderProps) {
  return (
    <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white truncate">{purpose}</h3>
          {instructions && (
            <p className="text-sm text-slate-300 truncate">{instructions}</p>
          )}
        </div>
      </div>

      {availableCameras.length > 1 && !capturedImage && !error && (
        <div className="relative flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleMenu}
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700 text-sm"
            disabled={isSwitchingCamera}
          >
            {isSwitchingCamera ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : activeCameraLabel && isContinuityCamera(activeCameraLabel) ? (
              <Smartphone className="w-4 h-4 mr-2" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline max-w-[120px] truncate">
              {currentCameraName}
            </span>
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <AnimatePresence>
            {showCameraMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50"
              >
                <div className="p-2 text-xs text-slate-400 border-b border-slate-700">
                  Seleziona fotocamera
                </div>
                {availableCameras.map((camera) => (
                  <button
                    key={camera.deviceId}
                    onClick={() => onSwitchCamera(camera.deviceId)}
                    className={`w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-center gap-2 ${
                      selectedCameraId === camera.deviceId
                        ? "bg-slate-700 text-white"
                        : "text-slate-300"
                    }`}
                  >
                    {getCameraIcon(camera)}
                    <span className="truncate flex-1">{camera.label}</span>
                    {camera.isContinuity && (
                      <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                        Continuity
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="text-white hover:bg-slate-800 flex-shrink-0"
        aria-label="Chiudi fotocamera"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}
