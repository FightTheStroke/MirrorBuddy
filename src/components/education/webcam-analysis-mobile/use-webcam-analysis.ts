/**
 * Custom hook for webcam analysis functionality
 */

import { useState, useRef, useCallback, useEffect } from "react";

export interface CameraDevice {
  deviceId: string;
  label: string;
  isFrontFacing?: boolean;
}

export function useWebcamAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isFlashEnabled, setIsFlashEnabled] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<string | null>(null);

  // Enumerate cameras
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.substring(0, 5)}`,
          isFrontFacing: device.label.toLowerCase().includes("front"),
        }));

      setAvailableCameras(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error("Error enumerating cameras:", err);
      return [];
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (deviceId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Stop existing stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { ideal: deviceId } } : true,
          audio: false,
        };

        const mediaStream =
          await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;

          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("Video autoplay blocked:", playErr);
          }

          const videoTrack = mediaStream.getVideoTracks()[0];
          if (videoTrack) {
            setSelectedCameraId(
              videoTrack.getSettings().deviceId || deviceId || null,
            );
          }

          setStream(mediaStream);
          setIsLoading(false);
          setCapturedImage(null);
          setAnalysisResults(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof DOMException
            ? `Camera error: ${err.message}`
            : "Failed to access camera";

        setError(errorMessage);
        setIsLoading(false);
      }
    },
    [stream],
  );

  // Toggle between cameras
  const toggleCamera = useCallback(async () => {
    if (availableCameras.length < 2) return;

    setIsSwitchingCamera(true);

    const currentCamera = availableCameras.find(
      (c) => c.deviceId === selectedCameraId,
    );
    const targetCamera = availableCameras.find(
      (c) =>
        c.isFrontFacing !== currentCamera?.isFrontFacing ||
        c.deviceId !== selectedCameraId,
    );

    if (targetCamera) {
      await startCamera(targetCamera.deviceId);
    } else {
      const nextIndex =
        (availableCameras.findIndex((c) => c.deviceId === selectedCameraId) +
          1) %
        availableCameras.length;
      await startCamera(availableCameras[nextIndex].deviceId);
    }

    setIsSwitchingCamera(false);
  }, [availableCameras, selectedCameraId, startCamera]);

  // Capture image
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flash effect
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    setTimeout(() => {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);

      setCapturedImage(imageData);
      setAnalysisResults("Image captured. Analyzing... (Mock result for demo)");
    }, 100);
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!stream) return;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return;

      const capabilities = videoTrack.getCapabilities() as Record<
        string,
        unknown
      >;

      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          // @ts-expect-error - torch is not standard but supported on some devices
          advanced: [{ torch: !isFlashEnabled }],
        });
        setIsFlashEnabled(!isFlashEnabled);
      }
    } catch (err) {
      console.warn("Flash control not available:", err);
    }
  }, [stream, isFlashEnabled]);

  // Retry
  const handleRetry = useCallback(async () => {
    const cameras = await enumerateCameras();
    if (cameras.length > 0) {
      await startCamera(cameras[0].deviceId);
    }
  }, [enumerateCameras, startCamera]);

  // Initialize on mount
  useEffect(() => {
    const initializeCamera = async () => {
      const cameras = await enumerateCameras();
      if (cameras.length > 0) {
        await startCamera(cameras[0].deviceId);
      }
    };

    initializeCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    canvasRef,
    stream,
    isLoading,
    error,
    availableCameras,
    selectedCameraId,
    isSwitchingCamera,
    capturedImage,
    isFlashEnabled,
    analysisResults,
    toggleCamera,
    handleCapture,
    toggleFlash,
    handleRetry,
  };
}
