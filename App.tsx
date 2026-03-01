import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Scan, History, X, ChevronRight, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, validarSerie } from './utils';

type ScanResult = {
  id: string;
  serie: string;
  billete: number;
  isValid: boolean;
  reason: string;
  timestamp: number;
};

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDenom, setSelectedDenom] = useState<number | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const denoms = [10, 20, 50];

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = () => {
    setCameraError(null);
    setIsScanning(true);
  };

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function setupCamera() {
      if (isScanning && !stream) {
        // Wait a bit for the animation to finish and the ref to be populated
        let attempts = 0;
        while (!videoRef.current && attempts < 10) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }

        if (!videoRef.current) return;

        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setStream(s);
            activeStream = s;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setCameraError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
          setIsScanning(false);
        }
      }
    }

    setupCamera();

    return () => {
      if (!isScanning && activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning, stream]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || !selectedDenom) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Stop camera to save resources
    stopCamera();

    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      // Improved regex for serial numbers: usually 8-9 digits followed by a letter
      const cleanText = text.replace(/\s/g, "").toUpperCase();
      const regex = /\d{7,10}[A-Z]/g;
      const matches = cleanText.match(regex);

      if (matches && matches.length > 0) {
        const serie = matches[0];
        const validation = validarSerie(serie, selectedDenom);
        
        const newResult: ScanResult = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          serie,
          billete: selectedDenom,
          isValid: validation.isValid,
          reason: validation.reason,
          timestamp: Date.now()
        };

        setResults(prev => [newResult, ...prev]);
        setLastResult(newResult);
      } else {
        setCameraError("No se detectó una serie clara. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setCameraError("Error al procesar la imagen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setLastResult(null);
    setCameraError(null);
    setSelectedDenom(null);
    stopCamera();
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00ff88] flex items-center justify-center">
            <Scan className="w-5 h-5 text-black" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">VERIFICADOR <span className="text-[#00ff88]">PRO</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            <History className="w-6 h-6 text-white/60" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {!isScanning && !isProcessing && !lastResult && (
            <motion.div 
              key="setup-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-6"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-pink-500/30 rounded-full blur-xl"
                  />
                  <a 
                    href="https://drive.google.com/file/d/1Zr53HBWlIemNAF6XzGrknkQNBJzJlw1R/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center gap-2 px-6 py-3 rounded-2xl bg-pink-500 border border-pink-400 text-white text-sm font-black transition-all hover:bg-pink-600 shadow-[0_10px_20px_rgba(236,72,153,0.3)] active:scale-95"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    APOYAR PROYECTO (DONAR)
                  </a>
                </div>
                <p className="text-[10px] text-pink-300/60 leading-relaxed italic text-center max-w-[280px]">
                  "Tus donaciones voluntarias ayudan al desarrollo y creación de más herramientas que ayuden tu día a día"
                </p>
              </div>

              <div className="text-center space-y-2 pt-2">
                <h2 className="text-2xl font-bold">Selecciona Denominación</h2>
                <p className="text-white/40 text-sm">Elige el valor del billete para validar la serie</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {denoms.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDenom(d)}
                    className={cn(
                      "group relative overflow-hidden p-3 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center gap-1",
                      selectedDenom === d 
                        ? "bg-[#00ff88] border-[#00ff88] text-black shadow-[0_0_15px_rgba(0,255,136,0.2)]" 
                        : "bg-white/5 border-white/10 text-white hover:border-white/20"
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-widest opacity-70 font-bold">BOB</span>
                    <span className="text-xl font-black leading-none">{d}</span>
                  </button>
                ))}
              </div>

              <button
                disabled={!selectedDenom}
                onClick={startCamera}
                className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 shadow-xl"
              >
                <Camera className="w-5 h-5" />
                COMENZAR ESCANEO
              </button>

              <div className="pt-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-white/40 leading-relaxed text-left">
                      <span className="font-bold text-white/60 uppercase block mb-1">Aviso Legal:</span>
                      Esta aplicación no es oficial y funciona con IA. Verifique que la serie escaneada concuerde con la del billete real. Para más dudas consulte siempre la página oficial del Banco Central de Bolivia.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isScanning && (
            <motion.div 
              key="scanner-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover"
              />
              
              {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4">
                  <RefreshCw className="w-10 h-10 text-[#00ff88] animate-spin" />
                  <p className="text-white/40 text-sm">Iniciando cámara...</p>
                </div>
              )}
              
              {/* Scan Overlay with Darkened Background */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Top darkened area */}
                <div className="absolute top-0 left-0 right-0 bottom-[calc(50%+80px)] bg-black/60" />
                {/* Bottom darkened area */}
                <div className="absolute top-[calc(50%+80px)] left-0 right-0 bottom-0 bg-black/60" />
                {/* Left darkened area */}
                <div className="absolute top-[calc(50%-80px)] bottom-[calc(50%-80px)] left-0 right-[calc(50%+144px)] bg-black/60" />
                {/* Right darkened area */}
                <div className="absolute top-[calc(50%-80px)] bottom-[calc(50%-80px)] left-[calc(50%+144px)] right-0 bg-black/60" />

                <div className="relative w-72 h-40 z-10">
                  <div className="scan-corner top-0 left-0 border-r-0 border-b-0 rounded-tl-xl" />
                  <div className="scan-corner top-0 right-0 border-l-0 border-b-0 rounded-tr-xl" />
                  <div className="scan-corner bottom-0 left-0 border-r-0 border-t-0 rounded-bl-xl" />
                  <div className="scan-corner bottom-0 right-0 border-l-0 border-t-0 rounded-br-xl" />
                  <div className="scan-line absolute top-0 left-0 right-0" />
                  
                  <div className="absolute -top-12 left-0 right-0 text-center">
                    <span className="bg-[#00ff88] px-3 py-1 rounded-full text-[10px] font-black text-black uppercase tracking-widest shadow-lg">
                      Encuadra la serie
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 px-6">
                <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center w-full">
                  <p className="text-sm text-white/80">Escaneando billete de <span className="font-bold text-[#00ff88]">BOB {selectedDenom}</span></p>
                </div>
                
                <div className="flex items-center gap-4 w-full">
                  <button 
                    onClick={reset}
                    className="flex-1 py-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl font-bold"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={captureAndProcess}
                    className="flex-[2] py-4 bg-[#00ff88] text-black rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                  >
                    <Scan className="w-5 h-5" />
                    CAPTURAR
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div 
              key="processing-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center gap-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-[#00ff88]/20 rounded-full" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-20 h-20 border-4 border-t-[#00ff88] rounded-full"
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">Procesando Serie</h3>
                <p className="text-white/40 text-sm">Analizando imagen con IA...</p>
              </div>
            </motion.div>
          )}

          {lastResult && (
            <motion.div 
              key="result-screen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-6"
            >
              <div className={cn(
                "p-8 rounded-3xl border-2 flex flex-col items-center text-center gap-4",
                lastResult.isValid 
                  ? "bg-emerald-500/10 border-emerald-500/50" 
                  : "bg-red-500/10 border-red-500/50"
              )}>
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-2",
                  lastResult.isValid ? "bg-emerald-500" : "bg-red-500"
                )}>
                  {lastResult.isValid ? <CheckCircle2 className="w-12 h-12 text-black" /> : <AlertCircle className="w-12 h-12 text-black" />}
                </div>
                
                <div>
                  <h3 className={cn("text-3xl font-black uppercase tracking-tight", lastResult.isValid ? "text-emerald-400" : "text-red-400")}>
                    {lastResult.isValid ? "SERIE VÁLIDA" : "SERIE ERRÓNEA"}
                  </h3>
                  <p className="text-white/60 mt-1">{lastResult.reason}</p>
                </div>

                <div className="w-full bg-black/40 rounded-2xl p-4 mt-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Serie Detectada</span>
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Denominación</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-mono font-bold tracking-tighter">{lastResult.serie}</span>
                    <span className="text-2xl font-bold">BOB {lastResult.billete}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={reset}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  NUEVO
                </button>
              </div>
            </motion.div>
          )}

          {cameraError && (
            <motion.div 
              key="error-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-6 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-start gap-4"
            >
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-red-200 font-medium">{cameraError}</p>
                <button 
                  onClick={reset}
                  className="mt-3 text-sm font-bold text-red-400 underline"
                >
                  Intentar de nuevo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 h-[80vh] bg-[#111] rounded-t-[32px] z-[70] flex flex-col border-t border-white/10"
            >
              <div className="p-6 flex justify-between items-center border-b border-white/5">
                <h3 className="text-xl font-bold">Historial de Escaneos</h3>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 bg-white/5 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {results.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                    <History className="w-16 h-16" />
                    <p>No hay escaneos recientes</p>
                  </div>
                ) : (
                  results.map((res) => (
                    <div 
                      key={res.id}
                      className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          res.isValid ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                        )}>
                          {res.isValid ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-mono font-bold">{res.serie}</p>
                          <p className="text-xs text-white/40">BOB {res.billete} • {new Date(res.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest",
                        res.isValid ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {res.isValid ? "Válido" : "Erróneo"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
