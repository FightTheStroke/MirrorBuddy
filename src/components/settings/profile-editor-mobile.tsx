"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Camera, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clientLogger } from "@/lib/logger/client";

interface ProfileEditorMobileProps {
  profile: {
    name: string;
    avatar?: string;
    bio?: string;
    gradeLevel?: string;
  };
  onSave: (profile: ProfileEditorMobileProps["profile"]) => void;
}

export function ProfileEditorMobile({
  profile,
  onSave,
}: ProfileEditorMobileProps) {
  const t = useTranslations("common");
  const [formData, setFormData] = useState(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        avatar: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      clientLogger.error(
        "Camera access denied",
        { component: "ProfileEditorMobile" },
        error,
      );
      setErrors((prev) => ({
        ...prev,
        camera: "Camera access denied. Please enable camera permissions.",
      }));
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL("image/png");
        setFormData((prev) => ({
          ...prev,
          avatar: imageData,
        }));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsCameraActive(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const gradeLevels = [
    { value: "", label: "Select..." },
    { value: "primary", label: "Primary School" },
    { value: "middle", label: "Middle School" },
    { value: "high", label: "High School" },
    { value: "university", label: "University" },
  ];

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
      {/* Keyboard-aware scrollable content */}
      <div
        className="flex-1 overflow-y-auto pb-24"
        data-testid="keyboard-aware-container"
      >
        <div className="p-4 xs:p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("profile")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Update your profile information
            </p>
          </div>

          {/* Avatar Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Avatar
            </h2>

            {/* Avatar Preview */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                {formData.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    data-testid="avatar-preview"
                  />
                ) : (
                  <div className="text-slate-400 dark:text-slate-500 text-center">
                    <div className="text-4xl mb-2">📷</div>
                    <span className="text-xs">No photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Camera Preview (hidden by default) */}
            {isCameraActive && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-slate-900"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={320}
                  height={320}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={capturePhoto}
                    className="flex-1 min-h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Capture
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="flex-1 min-h-12 text-base font-medium"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Camera and File Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={startCamera}
                disabled={isCameraActive}
                className="min-h-12 text-base font-medium flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="camera-button"
              >
                <Camera className="w-5 h-5" />
                Camera
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="min-h-12 text-base font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
              >
                Upload
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
                data-testid="avatar-file-input"
              />
            </div>
          </div>

          {/* Form Fields - Flex column for mobile (xs breakpoint) */}
          <div
            className="flex flex-col space-y-4"
            data-testid="profile-form-container"
          >
            {/* Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your name"
                className={cn(
                  "w-full px-4 py-3 text-base rounded-lg border-2 transition-colors",
                  "bg-white dark:bg-slate-800",
                  "text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400",
                  errors.name
                    ? "border-red-500 focus:border-red-600 focus:ring-red-500"
                    : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500",
                )}
              />
              {errors.name && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Bio Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio || ""}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
                rows={4}
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Grade Level Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Grade Level
              </label>
              <select
                name="gradeLevel"
                value={formData.gradeLevel || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 transition-colors"
              >
                {gradeLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera Error */}
            {errors.camera && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errors.camera}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4 xs:p-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700"
        data-sticky-footer
      >
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full min-h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
