"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";

interface ImageUploadProps {
  /** Current image URL (from DB) */
  currentUrl?: string | null;
  /** Upload type — controls the server-side folder */
  uploadType: "avatar" | "logo";
  /** Entity id used as the filename stem on the server */
  entityId: string;
  /** Callback fired with the new public URL after a successful upload */
  onUploaded: (url: string) => void;
  /** Visual shape */
  shape?: "circle" | "square";
  /** Fallback letter(s) shown when no image exists */
  fallbackLabel?: string;
  className?: string;
}

export function ImageUpload({
  currentUrl,
  uploadType,
  entityId,
  onUploaded,
  shape = "circle",
  fallbackLabel,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayUrl = preview ?? currentUrl;
  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WebP or GIF allowed");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File must be under 5 MB");
      return;
    }

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", uploadType);
      fd.append("id", entityId);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setPreview(null); // let parent-controlled URL take over
      onUploaded(json.url);
    } catch (err: unknown) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-picked
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image — click or drag"
        className={cn(
          "relative group cursor-pointer select-none",
          "w-20 h-20 flex items-center justify-center",
          "bg-gray-800 border-2 border-dashed transition-colors",
          dragging ? "border-indigo-400 bg-indigo-900/20" : "border-gray-700 hover:border-indigo-500",
          rounded
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="profile"
            className={cn("w-full h-full object-cover", rounded)}
          />
        ) : fallbackLabel ? (
          <span className="text-2xl font-bold text-gray-400 pointer-events-none">
            {fallbackLabel.charAt(0).toUpperCase()}
          </span>
        ) : (
          <Upload className="w-6 h-6 text-gray-500 pointer-events-none" />
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
            rounded
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="w-5 h-5 text-white" aria-hidden="true" />
          )}
        </div>

        {/* Remove button — only when image exists */}
        {displayUrl && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onUploaded("");
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow"
            title="Remove image"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={onInputChange}
        className="hidden"
      />

      <p className="text-[10px] text-gray-500 text-center">
        Click or drag · JPEG, PNG, WebP, GIF · max 5 MB
      </p>

      {error && (
        <p className="text-[10px] text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
