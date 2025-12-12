"use client";

import { useEffect, useRef, useState } from "react";

export default function CVPRScanner() {
  const [opencvLoaded, setOpenCVLoaded] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load OpenCV.js (CDN)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.onload = () => {
      // wait until cv is ready
      // @ts-ignore
      cv["onRuntimeInitialized"] = () => {
        console.log("OpenCV Loaded ✔");
        setOpenCVLoaded(true);
      };
    };
    document.body.appendChild(script);
  }, []);

  const detectAndCrop = async (imgElement: HTMLImageElement) => {
    // @ts-ignore
    const cv = window.cv;

    const src = cv.imread(imgElement);

    // PREPROCESS
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    let blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    let edges = new cv.Mat();
    cv.Canny(blurred, edges, 75, 200);

    // FIND CONTOURS
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    let biggest = null;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i);
      let peri = cv.arcLength(cnt, true);
      let approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

      if (approx.rows === 4) {
        let area = cv.contourArea(approx);
        if (area > maxArea) {
          maxArea = area;
          biggest = approx;
        }
      }
    }

    if (!biggest) {
      alert("No document detected.");
      return;
    }

    // REORDER POINTS
    const reorder = (pts: number[][]) => {
      pts.sort((a, b) => a[0] + a[1] - (b[0] + b[1])); // tl = smallest sum, br = biggest
      const [tl, bl, tr, br] = pts;
      return [tl, tr, br, bl];
    };

    // Extract points
    let pts: number[][] = [];
    for (let i = 0; i < 4; i++) {
      pts.push([biggest.intPtr(i, 0)[0], biggest.intPtr(i, 0)[1]]);
    }

    let ordered = reorder(pts);

    // WIDTH & HEIGHT BASED ON A4 PERSPECTIVE
    const w1 = Math.hypot(ordered[1][0] - ordered[0][0], ordered[1][1] - ordered[0][1]);
    const w2 = Math.hypot(ordered[2][0] - ordered[3][0], ordered[2][1] - ordered[3][1]);
    const h1 = Math.hypot(ordered[3][0] - ordered[0][0], ordered[3][1] - ordered[0][1]);
    const h2 = Math.hypot(ordered[2][0] - ordered[1][0], ordered[2][1] - ordered[1][1]);

    const width = Math.max(w1, w2);
    const height = Math.max(h1, h2);

    // Destination rectangle
    let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      width, 0,
      width, height,
      0, height,
    ]);

    // Perspective Transform
    let srcCoords = cv.matFromArray(
      4,
      1,
      cv.CV_32FC2,
      ordered.flat()
    );

    let M = cv.getPerspectiveTransform(srcCoords, dstCoords);

    let dst = new cv.Mat();
    cv.warpPerspective(src, dst, M, new cv.Size(width, height));

    // Output to canvas
    cv.imshow(canvasRef.current!, dst);

    // Export final result
    const url = canvasRef.current!.toDataURL("image/jpeg", 0.95);
    setOutputUrl(url);

    // cleanup
    src.delete(); gray.delete(); blurred.delete(); edges.delete();
    contours.delete(); hierarchy.delete();
    if (biggest) biggest.delete();
    dst.delete(); M.delete();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !opencvLoaded) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => detectAndCrop(img);
  };

  return (
    <div className="p-6 flex flex-col gap-4 items-center">
      <h1 className="text-3xl font-bold">CVPR A4 Paper Detection</h1>

      {!opencvLoaded && <p>Loading OpenCV...</p>}

      <input type="file" accept="image/*" onChange={handleFile} />

      <canvas ref={canvasRef} className="border mt-6" />

      {outputUrl && (
        <>
          <h2 className="text-xl font-semibold">Result:</h2>
          <img src={outputUrl} className="border shadow max-w-lg" />
        </>
      )}
    </div>
  );
}
