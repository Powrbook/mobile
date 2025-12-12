// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner";

// export default function Page() {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);

//   const [streamError, setStreamError] = useState<string | null>(null);
//   const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const r = useRouter();
//   const sp = useSearchParams();
//   const notebookId = sp.get("notebookId") || "";

//   // Kamera starten
//   useEffect(() => {
//     let currentStream: MediaStream | null = null;

//     async function startCamera() {
//       setStreamError(null);
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             facingMode: { ideal: "environment" },
//             width: { ideal: 1920 },
//             height: { ideal: 1080 },
//           },
//           audio: false,
//         });
//         currentStream = stream;
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           await videoRef.current.play().catch(() => {});
//         }
//       } catch (err: any) {
//         setStreamError(
//           err?.name === "NotAllowedError"
//             ? "Kamerazugriff verweigert. Bitte erlaube den Zugriff in deinem Browser."
//             : "Kamera konnte nicht gestartet werden."
//         );
//       }
//     }

//     startCamera();

//     // Shutter vom AppShell-FAB
//     const onShutter = () => capture();
//     window.addEventListener("pb:scan-shutter", onShutter);

//     return () => {
//       if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
//       window.removeEventListener("pb:scan-shutter", onShutter);
//     };
//   }, []);

//   function capture() {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     if (!video || !canvas) return;

//     const w = video.videoWidth || 1280;
//     const h = video.videoHeight || 720;

//     canvas.width = w;
//     canvas.height = h;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     ctx.drawImage(video, 0, 0, w, h);

//     canvas.toBlob(
//       (blob) => {
//         setPhotoBlob(blob || null);
//       },
//       "image/jpeg",
//       0.92
//     );
//   }

//   function retake() {
//     setPhotoBlob(null);
//   }

//   // Blob -> DataURL
//   function blobToDataUrl(b: Blob): Promise<string> {
//     return new Promise((resolve) => {
//       const fr = new FileReader();
//       fr.onload = () => resolve(String(fr.result || ""));
//       fr.readAsDataURL(b);
//     });
//   }

//   // 1) Seitennummer erkennen (wie NotebookDetailClient)
//   async function recognizePageNumber(image: Blob): Promise<{ pageIndex: number; pageToken: string }> {
//     if (!notebookId) throw new Error("notebookId fehlt. Rufe die Seite z.B. als /scan?notebookId=... auf.");

//     const fd = new FormData();
//     fd.append("image", new File([image], "scan.jpg", { type: "image/jpeg" }));

//     const resp = await fetch(`/api/scan/recognize-page?notebookId=${encodeURIComponent(notebookId)}`, {
//       method: "POST",
//       body: fd,
//     });

//     if (!resp.ok) {
//       const msg = await resp.text().catch(() => "");
//       throw new Error(msg || "Seitenerkennung fehlgeschlagen.");
//     }

//     const { pageIndex, pageToken } = (await resp.json()) as { pageIndex: number; pageToken: string };
//     return { pageIndex, pageToken };
//   }

//   // 2) uploadMedia-Flow anstoßen (SessionStorage + Redirect)
//   async function submit() {
//     if (!photoBlob) return;
//     if (!notebookId) {
//       toast.error("Fehlende notebookId. Bitte die Seite mit ?notebookId=... aufrufen.");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const { pageIndex, pageToken } = await recognizePageNumber(photoBlob);
//       const dataUrl = await blobToDataUrl(photoBlob);

//       const payload = { notebookId, pageToken, pageIndex, imageDataUrl: dataUrl };
//       sessionStorage.setItem("scan:pending", JSON.stringify(payload));

//       r.push(`/s/${pageToken}`);
//     } catch (e: any) {
//       toast.error(e?.message || "Fehler beim Absenden.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   }

//   return (
//     <div className="mx-auto max-w-md p-4">
//       <h1 className="text-lg font-semibold mb-3">Seite scannen</h1>

//       {!notebookId && (
//         <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm">
//           Hinweis: Übergib <code>?notebookId=…</code> in der URL, damit die Seitennummer erkannt und die richtige Seite geöffnet werden kann.
//         </p>
//       )}

//       {/* Kamera / Vorschau */}
//       <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black">
//         {!photoBlob ? (
//           <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
//         ) : (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img src={URL.createObjectURL(photoBlob)} alt="Vorschau" className="h-full w-full object-cover" />
//         )}

//         {/* Overlay: Absenden, nur wenn Foto vorhanden */}
//         {photoBlob && (
//           <div className="pointer-events-none absolute inset-x-0 bottom-0">
//             {/* leichter Gradient fürs Lesen */}
//             <div className="h-24 bg-gradient-to-t from-black/60 to-transparent" />
//             <div className="pointer-events-auto absolute inset-x-3 bottom-3">
//               <button
//                 onClick={submit}
//                 disabled={isSubmitting}
//                 className={`w-full rounded-xl px-4 py-3 text-white font-medium transition active:scale-95
//                 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
//               >
//                 {isSubmitting ? "Sende…" : "Absenden"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {streamError && <p className="mt-3 text-sm text-red-600">{streamError}</p>}

//       {/* Nur „Neu aufnehmen“ unten – der Auslöser kommt über den grünen FAB in der AppShell */}
//       <div className="mt-4 flex items-center justify-between gap-3">
//         <button
//           onClick={retake}
//           disabled={!photoBlob}
//           className={`flex-1 rounded-lg border px-4 py-3 transition active:scale-95
//           ${!photoBlob ? "cursor-not-allowed text-gray-400" : "hover:bg-gray-50"}`}
//         >
//           Neu aufnehmen
//         </button>
//       </div>

//       <canvas ref={canvasRef} className="hidden" />
//     </div>
//   );
// }
/* eslint-disable @typescript-eslint/no-explicit-any */






















// MIT SCAN ABER OHNE MITSCHICKEN AN RECOGNIZE OCR
// "use client";

// import React, { useEffect, useRef, useState, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner";

// import { Cropper, CropperRef } from "react-advanced-cropper";
// import "react-advanced-cropper/dist/style.css";

// export default function Page() {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const cropperRef = useRef<CropperRef>(null);

//   const [streamError, setStreamError] = useState<string | null>(null);
//   const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
//   const [imageUrl, setImageUrl] = useState<string | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);

//   const r = useRouter();
//   const sp = useSearchParams();
//   const notebookId = sp.get("notebookId") || "";

//   // ------------------------------------------------------
//   // 📸 Kamera starten – wiederverwendbare Funktion
//   // ------------------------------------------------------
//   const startCamera = useCallback(async () => {
//     setStreamError(null);

//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           facingMode: { ideal: "environment" },
//           width: { ideal: 1920 },
//           height: { ideal: 1080 },
//         },
//         audio: false,
//       });

//       setCurrentStream(stream);

//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//         await videoRef.current.play().catch(() => {});
//       }

//     } catch (err: any) {
//       setStreamError(
//         err?.name === "NotAllowedError"
//           ? "Kamerazugriff verweigert. Bitte erlaube den Zugriff in deinem Browser."
//           : "Kamera konnte nicht gestartet werden."
//       );
//     }
//   }, []);

//   // ------------------------------------------------------
//   // 🔄 useEffect – startet Kamera beim Page Load
//   // ------------------------------------------------------
//   useEffect(() => {
//     startCamera();

//     const onShutter = () => capture();
//     window.addEventListener("pb:scan-shutter", onShutter);

//     return () => {
//       if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
//       window.removeEventListener("pb:scan-shutter", onShutter);
//     };
//   }, [startCamera]);

//   // ------------------------------------------------------
//   // 📸 Bild aufnehmen
//   // ------------------------------------------------------
//   function capture() {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;
//     if (!video || !canvas) return;

//     const w = video.videoWidth || 1280;
//     const h = video.videoHeight || 720;

//     canvas.width = w;
//     canvas.height = h;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     ctx.drawImage(video, 0, 0, w, h);

//     canvas.toBlob(
//       (blob) => {
//         if (blob) {
//           setPhotoBlob(blob);
//           setImageUrl(URL.createObjectURL(blob)); // Cropper bekommt das Bild
//         }
//       },
//       "image/jpeg",
//       0.92
//     );
//   }

//   // ------------------------------------------------------
//   // 🔄 Neu aufnehmen – Kamera wird neu gestartet
//   // ------------------------------------------------------
//   function retake() {
//     if (currentStream) {
//       currentStream.getTracks().forEach((t) => t.stop());
//       setCurrentStream(null);
//     }

//     setPhotoBlob(null);
//     setImageUrl(null);

//     startCamera();
//   }

//   // ------------------------------------------------------
//   // 📤 Blob → Base64
//   // ------------------------------------------------------
//   function blobToDataUrl(b: Blob): Promise<string> {
//     return new Promise((resolve) => {
//       const fr = new FileReader();
//       fr.onload = () => resolve(String(fr.result || ""));
//       fr.readAsDataURL(b);
//     });
//   }

//   // ------------------------------------------------------
//   // 🔎 Seitenerkennung
//   // ------------------------------------------------------
//   async function recognizePageNumber(
//     image: Blob
//   ): Promise<{ pageIndex: number; pageToken: string }> {
//     if (!notebookId) throw new Error("notebookId fehlt.");

//     const fd = new FormData();
//     fd.append("image", new File([image], "scan.jpg", { type: "image/jpeg" }));

//     const resp = await fetch(
//       `/api/scan/recognize-page?notebookId=${encodeURIComponent(notebookId)}`,
//       { method: "POST", body: fd }
//     );

//     if (!resp.ok) {
//       const msg = await resp.text().catch(() => "");
//       throw new Error(msg || "Seitenerkennung fehlgeschlagen.");
//     }

//     return (await resp.json()) as { pageIndex: number; pageToken: string };
//   }

//   // ------------------------------------------------------
//   // 🚀 Absenden → wie bisher
//   // ------------------------------------------------------
//   async function submit() {
//     if (!photoBlob) return;
//     if (!notebookId) {
//       toast.error("Fehlende notebookId.");
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       const { pageIndex, pageToken } = await recognizePageNumber(photoBlob);
//       const dataUrl = await blobToDataUrl(photoBlob);

//       const payload = { notebookId, pageToken, pageIndex, imageDataUrl: dataUrl };
//       sessionStorage.setItem("scan:pending", JSON.stringify(payload));

//       r.push(`/s/${pageToken}`);

//     } catch (e: any) {
//       toast.error(e?.message || "Fehler beim Senden.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   }

//   // ------------------------------------------------------
//   // UI Rendering
//   // ------------------------------------------------------
//   return (
//     <div className="mx-auto max-w-md p-4">
//       <h1 className="text-lg font-semibold mb-3">Seite scannen</h1>

//       {!notebookId && (
//         <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm">
//           Hinweis: Übergib <code>?notebookId=…</code> in der URL!
//         </p>
//       )}

//       {/* Kamera oder Cropper */}
//       <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black">

//         {!photoBlob ? (
//           <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
//         ) : (
//           <Cropper
//             ref={cropperRef}
//             src={imageUrl || undefined}
//             className="h-full w-full"
//             stencilProps={{
//               movable: true,
//               scalable: true,
//               resizable: true,
//               handlers: true,
//             }}
//           />
//         )}

//         {/* Absenden Button (nur wenn Foto existiert) */}
//         {photoBlob && (
//           <div className="pointer-events-none absolute inset-x-0 bottom-0">
//             <div className="h-24 bg-gradient-to-t from-black/60 to-transparent" />
//             <div className="pointer-events-auto absolute inset-x-3 bottom-3">
//               <button
//                 onClick={submit}
//                 disabled={isSubmitting}
//                 className={`w-full rounded-xl px-4 py-3 text-white font-medium transition active:scale-95
//                   ${isSubmitting ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"}`}
//               >
//                 {isSubmitting ? "Sende…" : "Absenden"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Fehler */}
//       {streamError && <p className="mt-3 text-sm text-red-600">{streamError}</p>}

//       {/* Neu aufnehmen */}
//       <div className="mt-4 flex items-center justify-between gap-3">
//         <button
//           onClick={retake}
//           disabled={!photoBlob}
//           className={`flex-1 rounded-lg border px-4 py-3 transition active:scale-95
//             ${!photoBlob ? "cursor-not-allowed text-gray-400" : "hover:bg-gray-50"}`}
//         >
//           Neu aufnehmen
//         </button>
//       </div>

//       <canvas ref={canvasRef} className="hidden" />
//     </div>
//   );
// }








/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Cropper
import {
  Cropper,
  CropperRef,
} from "react-advanced-cropper";
import "react-advanced-cropper/dist/style.css";

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropperRef = useRef<CropperRef>(null);

  const [streamError, setStreamError] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const r = useRouter();
  const sp = useSearchParams();
  const notebookId = sp.get("notebookId") || "";

  // Kamera starten
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      setStreamError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setStreamError(
          err?.name === "NotAllowedError"
            ? "Kamerazugriff verweigert. Bitte erlaube den Zugriff."
            : "Kamera konnte nicht gestartet werden."
        );
      }
    }

    startCamera();

    // Listening to green FAB shutter
    const onShutter = () => capture();
    window.addEventListener("pb:scan-shutter", onShutter);

    return () => {
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
      window.removeEventListener("pb:scan-shutter", onShutter);
    };
  }, []);

  // FOTO SCHIESSEN
  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPhotoBlob(blob);

        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      },
      "image/jpeg",
      0.92
    );
  }

  // Wiederholen
  function retake() {
    setPhotoBlob(null);
    setImageUrl(null);
  }

  // Blob → DataURL
  function blobToDataUrl(b: Blob): Promise<string> {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsDataURL(b);
    });
  }

  // 🔥 🔥 🔥 NEU: Cropped Image erzeugen
  async function getCroppedBlob(): Promise<Blob | null> {
    if (!cropperRef.current) return null;

    const canvas = cropperRef.current.getCanvas();
    if (!canvas) return null;

    return await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || null), "image/jpeg", 0.95)
    );
  }

  // Seitennummer API
  async function recognizePageNumber(image: Blob) {
    if (!notebookId) throw new Error("notebookId fehlt.");

    const fd = new FormData();
    fd.append("image", new File([image], "scan.jpg", { type: "image/jpeg" }));

    const resp = await fetch(
      `/api/scan/recognize-page?notebookId=${encodeURIComponent(notebookId)}`,
      {
        method: "POST",
        body: fd,
      }
    );

    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(msg || "Seitenerkennung fehlgeschlagen.");
    }

    return (await resp.json()) as { pageIndex: number; pageToken: string };
  }

  // ABSENDEN
  async function submit() {
    if (!photoBlob) return;

    setIsSubmitting(true);
    try {
      // 🟩 WICHTIG: Immer das CROPPED Image verwenden!
      const cropped = await getCroppedBlob();
      const finalBlob = cropped || photoBlob;

      const { pageIndex, pageToken } = await recognizePageNumber(finalBlob);
      const dataUrl = await blobToDataUrl(finalBlob);

      const payload = {
        notebookId,
        pageToken,
        pageIndex,
        imageDataUrl: dataUrl,
      };

      sessionStorage.setItem("scan:pending", JSON.stringify(payload));

      r.push(`/s/${pageToken}`);
    } catch (e: any) {
      toast.error(e?.message || "Fehler beim Absenden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-lg font-semibold mb-3">Seite scannen</h1>

      {/* Kamera oder Cropper */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black">
        {!photoBlob ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
        ) : (
          <Cropper
            ref={cropperRef}
            src={imageUrl || undefined}
            className="h-full w-full"
            stencilProps={{
              movable: true,
              scalable: true,
              resizable: true,
              handlers: true,
            }}
          />
        )}
      </div>

      {/* Absenden Button */}
      {photoBlob && (
        <div className="mt-4 w-full">
          <button
            onClick={submit}
            disabled={isSubmitting}
            className={`w-full rounded-xl px-4 py-4 text-white text-lg font-medium transition active:scale-95
            ${
              isSubmitting
                ? "bg-gray-400"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isSubmitting ? "Sende…" : "Absenden"}
          </button>
        </div>
      )}

      {/* Neu aufnehmen */}
      <div className="mt-4">
        <button
          onClick={retake}
          disabled={!photoBlob}
          className={`w-full rounded-lg border px-4 py-3 transition active:scale-95
          ${
            !photoBlob
              ? "cursor-not-allowed text-gray-400"
              : "hover:bg-gray-50"
          }`}
        >
          Neu aufnehmen
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
