'use client';

import { useState, useRef, useEffect } from 'react';

export default function PlantAnalyzer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [status, setStatus] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (event) => {
      const { status, message, results, error } = event.data;
      if (status === 'loading' || status === 'processing') setStatus(message);
      if (error) setStatus(`Diagnostic failure: ${error}`);
      if (status === 'success') {
        setStatus('');
        setPredictions(results);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const startCamera = async () => {
    try {
      const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
        setStatus('');
      }
    } catch (err) {
      setStatus('Please grant camera access to evaluate leaves.');
    }
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      workerRef.current.postMessage({ image: canvas.toDataURL('image/jpeg') });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && workerRef.current) {
      const reader = new FileReader();
      reader.onload = (e) => workerRef.current!.postMessage({ image: e.target?.result });
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="max-w-6xl mx-auto min-h-screen bg-[#FBFBFA] text-[#2C302E] px-6 py-12 flex flex-col justify-between font-sans selection:bg-stone-200">
      <header className="mb-10">
        <h1 className="text-4xl font-light tracking-tight text-stone-900">Flora Diagnostics</h1>
        <p className="text-sm text-stone-500 mt-2 font-serif italic">In-browser cellular pathology. Secure, offline, localized data verification.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full my-auto">
        <div className="flex flex-col gap-4 w-full">
          <div className="relative w-full aspect-[4/3] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200/60 shadow-sm flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[15%]" />
            <canvas ref={canvasRef} className="hidden" />
            {!streamActive && <div className="absolute inset-0 flex items-center justify-center text-stone-400">Viewport Inactive</div>}
          </div>

          <div className="flex flex-col gap-2">
            {!streamActive ? (
              <button onClick={startCamera} className="w-full bg-stone-900 text-stone-50 font-medium text-sm py-4 rounded-xl hover:bg-stone-800 transition-all">
                Initialize Viewport Stream
              </button>
            ) : (
              <button onClick={captureAndAnalyze} className="w-full bg-emerald-800 text-stone-50 font-medium text-sm py-4 rounded-xl hover:bg-emerald-900 transition-all">
                Evaluate Leaf Sample
              </button>
            )}
            <label className="cursor-pointer w-full text-center bg-stone-200 text-stone-800 font-medium text-sm py-4 rounded-xl hover:bg-stone-300 transition-all">
              Upload Image File
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          {status && <div className="text-xs text-stone-500 text-center font-serif italic animate-pulse">{status}</div>}
        </div>

        <section className="w-full h-full">
          {predictions.length > 0 ? (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-sm h-full">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Diagnostic Assessment</h2>
              <div className="divide-y divide-stone-100">
                {predictions.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center py-4">
                    <span className="text-sm font-medium text-stone-700">{p.label.replace(/[:_]/g, ' ')}</span>
                    <span className="text-xs font-mono font-bold text-emerald-800">{(p.score * 100).toFixed(0)}% Match</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full border border-dashed border-stone-200 rounded-2xl flex items-center justify-center text-stone-400 text-sm italic font-serif bg-stone-50/40">
              Awaiting input sample...
            </div>
          )}
        </section>
      </div>

      <footer className="mt-10 border-t border-stone-200/40 pt-4 text-center">
        <p className="text-xs text-stone-400 tracking-wide">100% Edge Computing Architecture</p>
      </footer>
    </main>
  );
}