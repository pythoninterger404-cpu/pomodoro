import React, { useRef, useEffect, useState } from 'react';
import { MonitorPlay, Play, Pause, Square } from 'lucide-react';

interface PipWrapperProps {
  secondsRemaining: number;
  timerMode: 'focus' | 'shortBreak' | 'longBreak' | 'custom';
  isActive: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
}

export const PipWrapper: React.FC<PipWrapperProps> = ({
  secondsRemaining,
  timerMode,
  isActive,
  onTogglePlay,
  onReset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isInPip, setIsInPip] = useState(false);
  const [pipSupported, setPipSupported] = useState(true);

  // Initialize hidden canvas and video elements
  useEffect(() => {
    // Check support
    if (!document.pictureInPictureEnabled) {
      setPipSupported(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    canvasRef.current = canvas;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(10) : null; // 10 fps is plenty
    video.srcObject = stream;
    videoRef.current = video;

    const handleLeave = () => setIsInPip(false);
    video.addEventListener('leavepictureinpicture', handleLeave);

    return () => {
      video.removeEventListener('leavepictureinpicture', handleLeave);
      video.pause();
      if (video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  // Redraw canvas whenever timer ticks, mode changes, or play state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInPip) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#0f172a'; // Deep Slate
    ctx.fillRect(0, 0, 300, 300);

    // Draw circular outer ring
    const totalDuration = timerMode === 'focus' ? 25 * 60 : timerMode === 'shortBreak' ? 5 * 60 : 15 * 60;
    const progress = secondsRemaining / totalDuration;

    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1e293b'; // Slate background ring
    ctx.beginPath();
    ctx.arc(150, 150, 110, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw progress arc
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.strokeStyle = timerMode === 'focus' ? '#f43f5e' : '#10b981'; // Rose for focus, Emerald for break
    ctx.beginPath();
    ctx.arc(150, 150, 110, -0.5 * Math.PI, (-0.5 * Math.PI) + (2 * Math.PI * progress));
    ctx.stroke();

    // Draw Text - Timer Mode
    ctx.fillStyle = '#94a3b8'; // text-slate-400
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const modeText = timerMode === 'focus' ? 'FOKUS' : timerMode === 'shortBreak' ? 'BREAK' : 'LONG BREAK';
    ctx.fillText(modeText, 150, 95);

    // Draw Text - Time Remaining
    const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
    const seconds = (secondsRemaining % 60).toString().padStart(2, '0');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${minutes}:${seconds}`, 150, 170);

    // Draw Text - Active State
    ctx.fillStyle = isActive ? '#10b981' : '#f59e0b'; // Green or Amber
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(isActive ? 'BERJALAN' : 'DIJEDA', 150, 220);

  }, [secondsRemaining, timerMode, isActive, isInPip]);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (!isInPip) {
        await video.play();
        await video.requestPictureInPicture();
        setIsInPip(true);
      } else {
        await document.exitPictureInPicture();
        setIsInPip(false);
      }
    } catch (err) {
      console.error('Gagal mengakses Picture in Picture:', err);
    }
  };

  if (!pipSupported) return null;

  return (
    <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 shadow-inner">
      <button
        onClick={togglePip}
        title="Floating Picture-in-Picture"
        className={`p-2 rounded-md hover:bg-slate-700 transition-all ${
          isInPip ? 'text-rose-400 bg-rose-500/10' : 'text-slate-300'
        }`}
      >
        <MonitorPlay size={16} />
      </button>

      {isInPip && (
        <>
          <span className="h-4 w-[1px] bg-slate-700 mx-0.5"></span>
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors`}
            title={isActive ? 'Jeda' : 'Mulai'}
          >
            {isActive ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={onReset}
            className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reset"
          >
            <Square size={14} />
          </button>
        </>
      )}
    </div>
  );
};
