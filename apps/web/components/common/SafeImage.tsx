"use client";

import React, { useState } from "react";
import { isSafeMediaUrl } from "@aidean/shared";

export interface SafeImageProps {
  src?: string | null;
  alt: string;
  ratio?: "video" | "square" | "photo";
  fit?: "cover" | "contain";
  className?: string;
  placeholder?: string;
}
/** Native browser image, never Next optimization/server URL fetching. Fixed bounded layout. */
export function SafeImage({ src, alt, ratio = "video", fit = "cover", className = "", placeholder = "图片待补充" }: SafeImageProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const valid = src && isSafeMediaUrl(src) && failed !== src;
  return <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] ${className}`} style={{ aspectRatio: ratio === "square" ? "1 / 1" : ratio === "photo" ? "4 / 3" : "16 / 9", width: "100%", maxWidth: ratio === "square" ? 200 : 960 }}>
    {valid ? <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} style={{ position: "absolute", width: "100%", height: "100%", objectFit: fit }} /> : <span role="img" aria-label={`${alt}：${placeholder}`} className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-[var(--muted-foreground)]">{placeholder}</span>}
  </div>;
}
