"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Camera,
  Upload,
  RotateCcw,
  Check,
  X,
  SwitchCamera,
  AlertCircle,
  User,
  Scan,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STUDENT_PHOTO_MAX_BYTES, STUDENT_PHOTO_TYPES } from "@/lib/storage/student-photos";

interface StudentPhotoCaptureProps {
  value?: File | null;
  currentPhotoUrl?: string | null;
  onChange: (file: File | null) => void;
  error?: string | null;
  disabled?: boolean;
}

export function StudentPhotoCapture({
  value,
  currentPhotoUrl,
  onChange,
  error,
  disabled = false,
}: StudentPhotoCaptureProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [clientError, setClientError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Derive object URL from value File with automatic cleanup
  const objectUrl = useMemo(() => {
    if (!value) return null;
    return URL.createObjectURL(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const previewUrl = objectUrl ?? currentPhotoUrl ?? null;


  // Clean up video stream when camera dialog closes or component unmounts
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Start camera stream
  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      stopCameraStream();
      setCameraLoading(true);
      setCameraError(null);
      setCapturedDataUrl(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Camera access is not supported by this browser. Please use the file upload option instead."
        );
        setCameraLoading(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraLoading(false);
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraLoading(false);
        const errorName = err instanceof Error ? err.name : "";
        if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          setCameraError(
            "Camera permission was denied. Please allow camera access in your browser settings, or use the file upload option."
          );
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setCameraError("No camera found on this device. Please connect a camera or upload an image file.");
        } else {
          setCameraError(
            "Unable to access the camera. Please make sure no other application is using it, or use file upload."
          );
        }
      }
    },
    [stopCameraStream]
  );

  function openCameraDialog() {
    if (disabled) return;
    setClientError(null);
    setIsCameraOpen(true);
    setCapturedDataUrl(null);
    void startCamera(facingMode);
  }

  function closeCameraDialog() {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedDataUrl(null);
    setCameraError(null);
  }

  function toggleCameraFacing() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    void startCamera(nextMode);
  }

  // Capture snapshot from video onto canvas with passport portrait 3:4 crop
  function captureSnapshot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Standard portrait ratio 3:4
    const targetAspect = 3 / 4;
    let cropWidth = videoWidth;
    let cropHeight = videoWidth / targetAspect;

    if (cropHeight > videoHeight) {
      cropHeight = videoHeight;
      cropWidth = videoHeight * targetAspect;
    }

    const startX = (videoWidth - cropWidth) / 2;
    const startY = (videoHeight - cropHeight) / 2;

    // Output dimension: 600x800 for high-definition passport photo
    canvas.width = 600;
    canvas.height = 800;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // If front-facing camera, mirror the snapshot naturally
    if (facingMode === "user") {
      ctx.translate(600, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, 600, 800);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedDataUrl(dataUrl);
  }

  function retakeSnapshot() {
    setCapturedDataUrl(null);
  }

  function confirmSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setClientError("Failed to process captured image.");
          return;
        }

        const file = new File([blob], `student-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        onChange(file);
        closeCameraDialog();
      },
      "image/jpeg",
      0.92
    );
  }

  // Validate and handle file selection from input
  function handleFileSelected(file: File | null) {
    setClientError(null);
    if (!file) return;

    if (!(STUDENT_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setClientError("Unsupported format. Please select a JPEG, PNG, or WebP photo.");
      return;
    }

    if (file.size <= 0 || file.size > STUDENT_PHOTO_MAX_BYTES) {
      setClientError("File too large. Student photo must be smaller than 5 MB.");
      return;
    }

    onChange(file);
  }

  function handleClear() {
    setClientError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mobileCameraInputRef.current) mobileCameraInputRef.current.value = "";
    onChange(null);
  }

  const activeError = clientError || error;

  return (
    <div className="space-y-3">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
        className="hidden"
        disabled={disabled}
      />
      {/* Canvas for snapshot processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container */}
      <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-xs">
        {/* Photo Box Preview */}
        <div className="relative w-32 h-40 sm:w-36 sm:h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0 group">
          {previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Student portrait"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={openCameraDialog}
                  title="Scan / Take new photo"
                  disabled={disabled}
                >
                  <Camera className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload from device"
                  disabled={disabled}
                >
                  <Upload className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="destructive"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={handleClear}
                  title="Remove photo"
                  disabled={disabled}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2 text-muted-foreground">
              <User className="size-12 opacity-30 mb-1" />
              <span className="text-[11px] font-medium leading-tight">No photograph</span>
              <span className="text-[10px] text-muted-foreground/70 mt-0.5">Passport ratio 3:4</span>
            </div>
          )}
        </div>

        {/* Controls & Instructions */}
        <div className="flex-1 space-y-2.5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Passport Photograph
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Take a live photo with your camera, scan a physical picture, or upload an image file.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={openCameraDialog}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <Camera className="size-3.5" />
              Scan / Capture Photo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <Upload className="size-3.5" />
              Upload Image
            </Button>

            {/* Direct Mobile Scanner Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => mobileCameraInputRef.current?.click()}
              disabled={disabled}
              className="inline-flex sm:hidden items-center gap-1.5 text-xs text-muted-foreground"
              title="Open mobile camera directly"
            >
              <Scan className="size-3.5" />
              Mobile Scan
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="size-3.5" />
                Remove
              </Button>
            )}
          </div>

          {/* Details & Specifications */}
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <p>Supported: JPEG, PNG, WebP â€¢ Max size: 5 MB</p>
            {value && (
              <p className="font-medium text-primary">
                Selected: {value.name} ({(value.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Errors */}
          {activeError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{activeError}</span>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Camera Capture & Scanner Dialog â”€â”€ */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && closeCameraDialog()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-zinc-950 text-zinc-100 border-zinc-800">
          <DialogHeader className="p-4 border-b border-zinc-800">
            <DialogTitle className="flex items-center gap-2 text-zinc-100 text-sm font-semibold">
              <Scan className="size-4 text-primary" />
              Photo Scanner &amp; Camera Capture
            </DialogTitle>
          </DialogHeader>

          {/* Viewfinder Container */}
          <div className="relative w-full aspect-[3/4] max-h-[65vh] bg-black flex items-center justify-center overflow-hidden">
            {cameraLoading && (
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-xs">Initializing camera feed...</span>
              </div>
            )}

            {cameraError ? (
              <div className="p-6 text-center text-zinc-300 space-y-3">
                <AlertCircle className="size-10 text-amber-500 mx-auto" />
                <p className="text-xs leading-relaxed">{cameraError}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    closeCameraDialog();
                    fileInputRef.current?.click();
                  }}
                  className="text-xs"
                >
                  <Upload className="size-3.5 mr-1.5" /> Upload File Instead
                </Button>
              </div>
            ) : capturedDataUrl ? (
              // Captured Preview Mode
              <div className="relative w-full h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedDataUrl}
                  alt="Captured frame"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] px-2 py-0.5 rounded-full font-medium">
                  Photo Captured
                </div>
              </div>
            ) : (
              // Live Video Stream Mode
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                />

                {/* Passport Framing Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-[75%] aspect-[3/4] rounded-2xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Corner Guides */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary" />

                    {/* Passport Framing Label */}
                    <div className="absolute -top-7 inset-x-0 text-center">
                      <span className="bg-black/70 text-white text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-xs font-medium">
                        Position face or photo within frame
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dialog Action Controls */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
            {capturedDataUrl ? (
              // Actions when photo has been snapped
              <div className="flex items-center justify-between w-full gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retakeSnapshot}
                  className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs"
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  Retake
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={confirmSnapshot}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                >
                  <Check className="size-3.5 mr-1.5" />
                  Use This Photo
                </Button>
              </div>
            ) : (
              // Actions during live camera view
              <div className="flex items-center justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeCameraDialog}
                  className="text-zinc-400 hover:text-zinc-100 text-xs"
                >
                  Cancel
                </Button>

                {/* Shutter Capture Button */}
                <button
                  type="button"
                  onClick={captureSnapshot}
                  disabled={cameraLoading || Boolean(cameraError)}
                  className="relative p-1 rounded-full border-2 border-white hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Capture student photograph"
                >
                  <div className="w-12 h-12 rounded-full bg-white transition-colors hover:bg-zinc-200" />
                </button>

                {/* Switch Camera Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleCameraFacing}
                  disabled={cameraLoading || Boolean(cameraError)}
                  className="text-zinc-300 hover:text-white text-xs"
                  title="Switch camera"
                >
                  <SwitchCamera className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
