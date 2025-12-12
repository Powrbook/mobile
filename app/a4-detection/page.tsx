"use client";

import { useEffect, useRef, useState } from "react";

export default function A4Detection() {
  const [cvLoaded, setCvLoaded] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const inputCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load OpenCV.js
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      cv["onRuntimeInitialized"] = () => {
        setCvLoaded(true);
        console.log("OpenCV Ready");
      };
    };

    document.body.appendChild(script);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cvLoaded) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      processImage(img);
    };
  };

  const processImage = (img: HTMLImageElement) => {
    // @ts-ignore
    const cv = window.cv;

    const inputCanvas = inputCanvasRef.current!;
    const outputCanvas = outputCanvasRef.current!;

    inputCanvas.width = img.width;
    inputCanvas.height = img.height;

    const ctx = inputCanvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    // load the image to CV
    const src = cv.imread(inputCanvas);

    // 1. convert to grayscale
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // 2. gaussian blur
    let blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);

    // 3. canny
    let edges = new cv.Mat();
    cv.Canny(blur, edges, 75, 200);

    // 4. find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE
    );

    let biggestContour = null;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);

      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();

      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        const area = cv.contourArea(approx);
        if (area > maxArea) {
          maxArea = area;
          biggestContour = approx;
        }
      }
    }

    if (!biggestContour) {
      alert("No document detected!");
      return;
    }

    // extract points
    const pts: number[][] = [];
    for (let i = 0; i < 4; i++) {
      pts.push([
        biggestContour.intPtr(i, 0)[0],
        biggestContour.intPtr(i, 0)[1],
      ]);
    }

    // sort points just like GitHub implementation
    pts.sort((a, b) => a[1] - b[1]); // sort by y
    const top = pts.slice(0, 2).sort((a, b) => a[0] - b[0]);
    const bottom = pts.slice(2, 4).sort((a, b) => a[0] - b[0]);

    const ordered = [...top, ...bottom]; // TL, TR, BL, BR

    const TL = ordered[0];
    const TR = ordered[1];
    const BL = ordered[2];
    const BR = ordered[3];

    const widthTop = Math.hypot(TR[0] - TL[0], TR[1] - TL[1]);
    const widthBottom = Math.hypot(BR[0] - BL[0], BR[1] - BL[1]);
    const maxWidth = Math.max(widthTop, widthBottom);

    const heightLeft = Math.hypot(BL[0] - TL[0], BL[1] - TL[1]);
    const heightRight = Math.hypot(BR[0] - TR[0], BR[1] - TR[1]);
    const maxHeight = Math.max(heightLeft, heightRight);

    let dst = new cv.Mat();
    const srcTri = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      [TL[0], TL[1], TR[0], TR[1], BL[0], BL[1], BR[0], BR[1]]
    );
    const dstTri = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      [0, 0, maxWidth, 0, 0, maxHeight, maxWidth, maxHeight]
    );

    let M = cv.getPerspectiveTransform(srcTri, dstTri);

    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(maxWidth, maxHeight),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );

    cv.imshow(outputCanvas, dst);

    const url = outputCanvas.toDataURL("image/jpeg", 0.95);
    setResultUrl(url);

    // Cleanup
    src.delete();
    gray.delete();
    blur.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    if (biggestContour) biggestContour.delete();
    dst.delete();
    M.delete();
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">CVPR A4 Detection (1:1 GitHub)</h1>

      {!cvLoaded && <p>Loading OpenCV…</p>}

      <input type="file" accept="image/*" onChange={handleUpload} />

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <h2 className="text-lg font-semibold">Input</h2>
          <canvas ref={inputCanvasRef} className="border" />
        </div>

        <div>
          <h2 className="text-lg font-semibold">Output</h2>
          <canvas ref={outputCanvasRef} className="border" />
        </div>
      </div>

      {resultUrl && (
        <img src={resultUrl} className="mt-6 border shadow max-w-lg" />
      )}
    </div>
  );
}
