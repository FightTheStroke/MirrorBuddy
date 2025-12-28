'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { Card } from '@/components/ui/card';

interface WebcamCaptureProps {
  purpose: string;
  instructions?: string;
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function WebcamCapture({ purpose, instructions, onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start camera with timeout to prevent infinite loading
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      // Set a timeout for camera initialization (10 seconds)
      timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          setError('Camera initialization timed out. Please try again.');
          setIsLoading(false);
        }
      }, 10000);

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Prefer back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        currentStream = mediaStream;

        if (mounted && videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Some browsers require explicit play call
          try {
            await videoRef.current.play();
          } catch (playErr) {
            logger.warn('Video autoplay blocked, user interaction may be needed', { error: String(playErr) });
          }
          setStream(mediaStream);
          setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        } else {
          // Component unmounted, stop the stream
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        logger.error('Camera error', { error: String(err) });
        if (mounted) {
          setError('Unable to access camera. Please check permissions.');
          setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      // Stop the stream captured during this effect
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - stream is captured in closure at mount time

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Capture image
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Stop camera while reviewing
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  // Retake photo
  const handleRetake = useCallback(async () => {
    setCapturedImage(null);
    setIsLoading(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          logger.warn('Video autoplay blocked', { error: String(playErr) });
        }
        setStream(mediaStream);
        setIsLoading(false);
      }
    } catch (_err) {
      setError('Unable to restart camera.');
      setIsLoading(false);
    }
  }, []);

  // Confirm and send
  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-700 text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">{purpose}</h3>
              {instructions && (
                <p className="text-sm text-slate-400">{instructions}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Chiudi webcam"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera/Preview area */}
        <div className="relative aspect-video bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <Camera className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">{error}</p>
                <Button variant="outline" className="mt-4" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Live video feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={capturedImage ? 'hidden' : 'w-full h-full object-cover'}
              />

              {/* Captured image preview */}
              <AnimatePresence>
                {capturedImage && (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={capturedImage}
                    alt="Captured homework"
                    className="w-full h-full object-contain"
                  />
                )}
              </AnimatePresence>
            </>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Capture guide overlay (when not captured) */}
          {!capturedImage && !isLoading && !error && (
            <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-lg pointer-events-none">
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
                <p className="text-sm text-white/80">
                  Position your homework in the frame
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex justify-center gap-4">
          {!capturedImage ? (
            <Button
              onClick={handleCapture}
              disabled={isLoading || !!error}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              <Camera className="w-5 h-5 mr-2" />
              Scatta foto
            </Button>
          ) : (
            <>
              <Button
                onClick={handleRetake}
                variant="outline"
                size="lg"
                className="border-slate-600"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Riprova
              </Button>
              <Button
                onClick={handleConfirm}
                size="lg"
                className="bg-green-600 hover:bg-green-700 px-8"
              >
                <Check className="w-5 h-5 mr-2" />
                Conferma
              </Button>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
