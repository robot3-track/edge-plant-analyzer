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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
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
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      workerRef.current.postMessage({ image: imageDataUrl });
    }
  };

  return (
    <main className="max-w-xl mx-auto min-h-screen bg-[#FBFBFA] text-[#2C302E] px-6 py-12 flex flex-col justify-between font-sans selection:bg-stone-200">
      
      {/* Editorial Header Block */}
      <header className="mb-8">
        <h1 className="text-3xl font-light tracking-tight text-stone-900">Flora Diagnostics</h1>
        <p className="text-sm text-stone-500 mt-2 font-serif italic">In-browser cellular pathology. Secure, offline, localized data verification.</p>
      </header>

      {/* Main Viewport Card */}
      <div className="relative w-full aspect-[4/3] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200/60 shadow-sm transition-all duration-500 flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[15%]" />
        <canvas ref={canvasRef} className="hidden" />
        
        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 p-6 text-center">
            <span className="text-xs tracking-widest text-stone-400 uppercase font-medium mb-3">Hardware Ready</span>
            <p className="text-sm text-stone-500 max-w-xs">Point device directly at leaf lesions or discoloration fields for dynamic sampling.</p>
          </div>
        )}
      </div>

      {/* Operations & Control Layer */}
      <div className="my-6 space-y-4">
        {!streamActive ? (
          <button onClick={startCamera} className="w-full bg-stone-900 text-stone-50 font-medium text-sm tracking-wide py-4 px-6 rounded-xl hover:bg-stone-800 transition-all shadow-sm active:scale-[0.99]">
            Initialize Viewport Stream
          </button>
        ) : (
          <button onClick={captureAndAnalyze} className="w-full bg-emerald-800 text-stone-50 font-medium text-sm tracking-wide py-4 px-6 rounded-xl hover:bg-emerald-900 transition-all shadow-sm active:scale-[0.99]">
            Evaluate Leaf Sample
          </button>
        )}

        {status && (
          <div className="w-full py-3 text-center text-xs tracking-wide text-stone-500 bg-stone-100 border border-stone-200/40 rounded-xl animate-pulse font-serif italic">
            {status}
          </div>
        )}
      </div>

      {/* Structured Diagnostics Sheet */}
      <section className="flex-1 min-h-[140px] flex flex-col justify-end">
        {predictions.length > 0 ? (
          <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-sm transition-all">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Diagnostic Assessment</h2>
            <div className="divide-y divide-stone-100">
              {predictions.map((p, idx) => {
                const isHealthy = p.label.toLowerCase().includes('healthy');
                return (
                  <div key={idx} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0">
                    <span className="capitalize text-sm font-medium text-stone-700 tracking-tight">
                      {p.label.replace(/[:_]/g, ' ')}
                    </span>
                    <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                      isHealthy 
                        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800 font-bold' 
                        : 'bg-amber-50/60 border-amber-100 text-amber-900'
                    }`}>
                      {(p.score * 100).toFixed(0)}% Match
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-full border border-dashed border-stone-200 rounded-2xl flex items-center justify-center p-6 text-stone-400 text-xs italic font-serif">
            Awaiting input scan sample to output findings.
          </div>
        )}
      </section>

    </main>
  );
}