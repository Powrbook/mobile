"use client";

import React, { useState, useRef } from "react";
import {
  Cropper,
  CropperRef,
} from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";

export default function PageDetector() {
  const cropperRef = useRef<CropperRef>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCroppedUrl(null);
  };

  const handleCrop = () => {
    if (!cropperRef.current) return;

    const canvas = cropperRef.current.getCanvas();

    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCroppedUrl(url);
        }
      }, "image/jpeg", 0.95);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <h1 className="text-3xl font-bold">Perspective Crop Test</h1>

      <input type="file" accept="image/*" onChange={handleFile} />

      {imageUrl && (
        <div className="w-full max-w-[600px]">
          <Cropper
            ref={cropperRef}
            src={imageUrl}
            className="cropper"
            stencilProps={{
              movable: true,
              scalable: true,
              resizable: true,
              handlers: true,
              aspectRatio: 3 / 4, // You can adjust this
            }}
          />

          <button
            onClick={handleCrop}
            className="p-3 bg-blue-600 text-white rounded mt-4"
          >
            Crop Document
          </button>
        </div>
      )}

      {croppedUrl && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Cropped Output</h2>
          <img
            src={croppedUrl}
            className="rounded border shadow max-w-[300px]"
          />
        </div>
      )}
    </div>
  );
}
