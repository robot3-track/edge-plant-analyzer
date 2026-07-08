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

  // UI States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready to analyze");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // 1. Initialize our winning Web Worker on mount
  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (event) => {
      const { status, message, results, error } = event.data;

      if (status === "loading" || status === "processing") {
        setStatus(message);
        setIsLoading(true);
      } else if (status === "success") {
        setResults(results);
        setStatus("Analysis complete!");
        setIsLoading(false);
      } else if (status === "error") {
        setStatus(`Error: ${error}`);
        setIsLoading(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 2. Start/Stop Device Camera Stream
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      setImageSrc(null);
      setResults([]);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Prioritize rear camera on mobile
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
          setStatus("Camera active. Frame up a leaf!");
        }
      } catch (err) {
        setStatus("Could not access camera. Check permissions.");
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

  // 3. Capture Snapshot from Live Video Stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        // Match sizes
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Mirror current frame to hidden canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg");
        setImageSrc(dataUrl);
        stopCamera();

        // Convert data URL directly to ImageData arrays for worker pipeline
        analyzeImage(context.getImageData(0, 0, canvas.width, canvas.height));
      }
    }
  };

  // 4. Process Uploaded Local Files (PNG, JPG, etc.)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopCamera();
    setResults([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const targetResult = e.target?.result as string;
      setImageSrc(targetResult);

      // Draw uploaded file onto dummy canvas to extract raw pixels for worker
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

  // 5. Send payload to your tokenizer-free offline worker
  const analyzeImage = (imageData: ImageData) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ image: imageData });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 font-sans">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-600">
          🌱 Edge Plant Analyzer
        </h1>
        <p className="text-gray-500 text-sm">100% Offline Device Diagnostics</p>
      </header>

      {/* Viewport Box (Shows Live Camera Feed OR Selected Static Image) */}
      <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 overflow-hidden aspect-video flex items-center justify-center shadow-inner">
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
            alt="Target scan preview"
            className="w-full h-full object-contain"
          />
        )}

        {!isCameraActive && !imageSrc && (
          <p className="text-gray-400 text-center text-sm px-4">
            No media active. Stream camera frames or upload a photo to scan pathology.
          </p>
        )}
      </div>

      {/* Control Dashboard Action Row */}
      <div className="flex flex-wrap gap-4 items-center justify-center">
        {/* Camera Toggle Button */}
        <button
          onClick={toggleCamera}
          className={`px-5 py-2.5 rounded-xl font-medium shadow-sm transition-colors ${
            isCameraActive
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {isCameraActive ? "Turn Off Camera" : "Use Live Camera"}
        </button>

        {/* Snapshot Capture Action */}
        {isCameraActive && (
          <button
            onClick={capturePhoto}
            className="px-5 py-2.5 bg-amber-500 text-white font-medium rounded-xl shadow-sm hover:bg-amber-600 transition-colors animate-pulse"
          >
            📸 Capture & Analyze
          </button>
        )}

        {/* Hidden Canvas used for conversion matrix mappings */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Direct Upload File Selector Wrapper */}
        <label className="px-5 py-2.5 bg-gray-800 text-white font-medium rounded-xl shadow-sm hover:bg-gray-900 transition-colors cursor-pointer text-center">
          Upload File (JPG/PNG)
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Diagnostics Readout Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-bold">
            Pipeline Logs
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isLoading
                ? "bg-amber-100 text-amber-800 animate-pulse"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {status}
          </span>
        </div>

        {/* Results Matrix Block */}
        {results.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-gray-700">Inference Probabilities:</h3>
            {results.map((res, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-800">{res.label}</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {(res.score * 100).toFixed(1)}%
                  </span>
                </div>
                {/* Visual Progress Meter */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(res.score * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}