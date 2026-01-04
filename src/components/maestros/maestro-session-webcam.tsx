'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WebcamCapture } from '@/components/tools/webcam-capture';

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
          className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center rounded-2xl"
        >
          <div className="w-full max-w-lg">
            <WebcamCapture
              purpose={webcamRequest.purpose}
              onCapture={onCapture}
              onClose={onClose}
              instructions={webcamRequest.instructions}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
