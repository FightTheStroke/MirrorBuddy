"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WebcamCapture } from "@/components/tools/webcam-capture";

interface WebcamRequest {
  purpose: string;
  instructions?: string;
  callId: string;
}

interface MaestroSessionWebcamProps {
  showWebcam: boolean;
  webcamRequest: WebcamRequest | null;
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function MaestroSessionWebcam({
  showWebcam,
  webcamRequest,
  onCapture,
  onClose,
}: MaestroSessionWebcamProps) {
  return (
    <AnimatePresence>
      {showWebcam && webcamRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 bg-black/90 rounded-2xl"
        >
          <WebcamCapture
            purpose={webcamRequest.purpose}
            onCapture={onCapture}
            onClose={onClose}
            instructions={webcamRequest.instructions}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
