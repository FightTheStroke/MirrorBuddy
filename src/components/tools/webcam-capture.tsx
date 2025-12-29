'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Check, RotateCcw, Loader2, Timer, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { Card } from '@/components/ui/card';
import { useSettingsStore } from '@/lib/stores/app-store';

interface WebcamCaptureProps {
  purpose: string;
  instructions?: string;
  onCapture: (imageData: string) => void;
  onClose: () => void;
  showTimer?: boolean; // Enable timer mode for homework capture
}

type TimerOption = 0 | 3 | 5 | 10;

export function WebcamCapture({ purpose, instructions, onCapture, onClose, showTimer = false }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timer state
  const [selectedTimer, setSelectedTimer] = useState<TimerOption>(showTimer ? 3 : 0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // Get preferred camera from settings
  const preferredCameraId = useSettingsStore((s) => s.preferredCameraId);

  // Start camera with timeout to prevent infinite loading
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      // Set a timeout for camera initialization (10 seconds)
      timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
          logger.error('Camera timeout - getUserMedia did not respond in 10s');
          setError('Timeout fotocamera. Riprova.');
          setIsLoading(false);
        }
      }, 10000);

      try {
        // Use simple constraints first (like settings page does)
        // Complex constraints with width/height can cause issues on some browsers
        const videoConstraints: MediaTrackConstraints | boolean = preferredCameraId
          ? { deviceId: { ideal: preferredCameraId } }
          : true;

        logger.info('Requesting camera access', { preferredCameraId, constraints: videoConstraints });

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });

        logger.info('Camera access granted', { tracks: mediaStream.getVideoTracks().length });

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
        logger.error('Camera error', { error: String(err), preferredCameraId });
        if (mounted) {
          // Try again with simplest constraints (just true)
          if (preferredCameraId) {
            logger.info('Retrying camera with simple constraints');
            try {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({
                video: true,
              });
              if (mounted && videoRef.current) {
                videoRef.current.srcObject = fallbackStream;
                await videoRef.current.play();
                setStream(fallbackStream);
                setIsLoading(false);
                if (timeoutId) clearTimeout(timeoutId);
                logger.info('Camera fallback succeeded');
                return;
              }
            } catch (fallbackErr) {
              logger.error('Camera fallback also failed', { error: String(fallbackErr) });
              // Continue to error state
            }
          }
          setError('Impossibile accedere alla fotocamera. Controlla i permessi.');
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
  }, [preferredCameraId]); // Re-run if preferred camera changes

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

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      // Flash and capture
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        doCapture();
      }, 150);
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // Actual capture function
  const doCapture = useCallback(() => {
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

  // Handle capture button click
  const handleCapture = useCallback(() => {
    if (selectedTimer > 0) {
      setCountdown(selectedTimer);
    } else {
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        doCapture();
      }, 150);
    }
  }, [selectedTimer, doCapture]);

  // Cancel countdown
  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  // Retake photo
  const handleRetake = useCallback(async () => {
    setCapturedImage(null);
    setIsLoading(true);

    try {
      // Use simple constraints (like settings page does)
      const videoConstraints: MediaTrackConstraints | boolean = preferredCameraId
        ? { deviceId: { ideal: preferredCameraId } }
        : true;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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
      setError('Impossibile riavviare la fotocamera.');
      setIsLoading(false);
    }
  }, [preferredCameraId]);

  // Confirm and send
  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const timerOptions: TimerOption[] = [0, 3, 5, 10];

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
            aria-label="Chiudi fotocamera"
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
                  Chiudi
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
                    alt="Foto catturata"
                    className="w-full h-full object-contain"
                  />
                )}
              </AnimatePresence>

              {/* Flash effect */}
              <AnimatePresence>
                {showFlash && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-white z-20"
                  />
                )}
              </AnimatePresence>

              {/* Countdown overlay */}
              <AnimatePresence>
                {countdown !== null && countdown > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
                  >
                    <motion.div
                      key={countdown}
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                      className="text-center"
                    >
                      <div className="text-8xl font-bold text-white drop-shadow-lg">
                        {countdown}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelCountdown}
                        className="mt-6 border-white/50 text-white hover:bg-white/20"
                      >
                        Annulla
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Capture guide overlay (when not captured) */}
          {!capturedImage && !isLoading && !error && countdown === null && (
            <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-lg pointer-events-none">
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
                <p className="text-sm text-white/80">
                  Posiziona il contenuto nell&apos;inquadratura
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 flex justify-center gap-4">
          {!capturedImage ? (
            <>
              {/* Timer selector (only if showTimer is true) */}
              {showTimer && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowTimerMenu(!showTimerMenu)}
                    className="border-slate-600 min-w-[100px]"
                    disabled={countdown !== null}
                  >
                    <Timer className="w-4 h-4 mr-2" />
                    {selectedTimer === 0 ? 'No timer' : `${selectedTimer}s`}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>

                  <AnimatePresence>
                    {showTimerMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden"
                      >
                        {timerOptions.map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setSelectedTimer(t);
                              setShowTimerMenu(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors ${
                              selectedTimer === t ? 'bg-blue-600/30 text-blue-400' : 'text-slate-300'
                            }`}
                          >
                            {t === 0 ? 'Immediato' : `${t} secondi`}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <Button
                onClick={handleCapture}
                disabled={isLoading || !!error || countdown !== null}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 px-8"
              >
                <Camera className="w-5 h-5 mr-2" />
                {countdown !== null ? 'In corso...' : 'Scatta foto'}
              </Button>
            </>
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
