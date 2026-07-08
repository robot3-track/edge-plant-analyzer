"use client";

import { useEffect, useRef, useState } from "react";

interface ClassificationResult {
  label: string;
  score: number;
}

export default function PlantAnalyzer() {
  const workerRef = useRef<Worker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event) => {
      const { status: workerStatus, message, results: workerResults, error } = event.data;

      if (workerStatus === "loading" || workerStatus === "processing") {
        setStatus(message);
      } else if (workerStatus === "success") {
        setResults(workerResults);
        setStatus("Analysis complete!");
      } else if (workerStatus === "error") {
        setStatus(`Error: ${error}`);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      setImageSrc(null);
      setResults([]);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
          setStatus("Camera active...");
        }
      } catch (err) {
        setStatus("Could not access camera.");
        console.error(err);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg");
        setImageSrc(dataUrl);
        stopCamera();

        analyzeImage(context.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopCamera();
    setResults([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const targetResult = e.target?.result as string;
      setImageSrc(targetResult);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          analyzeImage(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
      };
      img.src = targetResult;
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = (imageData: ImageData) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ image: imageData });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Status:&nbsp;
          <code className="font-bold">{status}</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <span className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0">
            Edge Plant Analyzer
          </span>
        </div>
      </div>

      {/* Main Viewport display */}
      <div className="relative flex place-items-center my-12 border border-gray-300 dark:border-neutral-800 rounded-xl overflow-hidden bg-zinc-800/10 w-[400px] h-[300px] justify-center items-center">
        {isCameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {imageSrc && !isCameraActive && (
          <img
            src={imageSrc}
            alt="Upload preview"
            className="w-full h-full object-contain"
          />
        )}

        {!isCameraActive && !imageSrc && (
          <span className="text-gray-400 text-xs px-4 text-center">No image selected or camera active</span>
        )}
      </div>

      {/* Control Action Buttons using exact original styling blueprints */}
      <div className="flex flex-row gap-4 mb-12 font-mono text-sm">
        <button
          onClick={toggleCamera}
          className="rounded-xl border border-transparent px-5 py-3 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors"
        >
          {isCameraActive ? "Close Camera" : "Open Camera"}
        </button>

        {isCameraActive && (
          <button
            onClick={capturePhoto}
            className="rounded-xl border border-transparent px-5 py-3 bg-amber-500 text-black hover:bg-amber-600 transition-colors"
          >
            Capture
          </button>
        )}

        <label className="rounded-xl border border-transparent px-5 py-3 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Results Display Grid */}
      <div className="grid text-center lg:max-w-5xl lg:w-full lg:grid-cols-3 lg:text-left gap-4 font-mono">
        {results.map((res, index) => (
          <div
            key={index}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors border-gray-300 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/30"
          >
            <h2 className="mb-3 text-lg font-semibold">
              {res.label}{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                -&gt;
              </span>
            </h2>
            <p className="m-0 text-sm opacity-70 font-bold text-emerald-500">
              {(res.score * 100).toFixed(2)}% Confidence
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}