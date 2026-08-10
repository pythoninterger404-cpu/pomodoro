import React, { useEffect, useRef } from 'react';
import { TimerSettings, THEME_COLORS } from '../types';
import { Play, Pause, RefreshCw, Volume2, VolumeX, SkipForward } from 'lucide-react';
import { playAlarm, playTick, playBtnSound } from '../lib/audio';
import { formatTime } from '../lib/utils';
import { PipWrapper } from './PipWrapper';

interface TimerProps {
  settings: TimerSettings;
  activeTodoText: string | null;
  onSessionComplete: (type: 'focus' | 'shortBreak' | 'longBreak', duration: number) => void;
  secondsRemaining: number;
  setSecondsRemaining: React.Dispatch<React.SetStateAction<number>>;
  timerMode: 'focus' | 'shortBreak' | 'longBreak';
  setTimerMode: React.Dispatch<React.SetStateAction<'focus' | 'shortBreak' | 'longBreak'>>;
  isActive: boolean;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  pomodorosCompleted: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const MODE_META = {
  focus: { label: 'Sesi Fokus', short: 'Fokus' },
  shortBreak: { label: 'Break Singkat', short: 'Istirahat' },
  longBreak: { label: 'Break Panjang', short: 'Istirahat Panjang' },
} as const;

const MODE_COLORS: Record<string, string> = {
  focus: 'var(--accent, #d9a441)',
  shortBreak: '#7fa88a',
  longBreak: '#7a93b8',
};

export const Timer: React.FC<TimerProps> = ({
  settings,
  activeTodoText,
  onSessionComplete,
  secondsRemaining,
  setSecondsRemaining,
  timerMode,
  setTimerMode,
  isActive,
  setIsActive,
  pomodorosCompleted,
  soundEnabled,
  setSoundEnabled,
}) => {
  const lastTickTimeRef = useRef<number | null>(null);

  const getDuration = (mode: typeof timerMode) => {
    if (mode === 'focus') return settings.focusTime * 60;
    if (mode === 'shortBreak') return settings.shortBreak * 60;
    return settings.longBreak * 60;
  };

  const totalDuration = getDuration(timerMode);
  const meta = MODE_META[timerMode];
  const modeColor = MODE_COLORS[timerMode];
  const accentHex = THEME_COLORS.find(c => c.id === settings.themeColor)?.hex ?? '#d9a441';

  useEffect(() => {
    if (!isActive) setSecondsRemaining(totalDuration);
  }, [settings.focusTime, settings.shortBreak, settings.longBreak, timerMode, isActive, totalDuration, setSecondsRemaining]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (isActive) {
      lastTickTimeRef.current = Date.now();
      timerId = setInterval(() => {
        const now = Date.now();
        const delta = lastTickTimeRef.current ? Math.round((now - lastTickTimeRef.current) / 1000) : 1;
        lastTickTimeRef.current = now;
        setSecondsRemaining((prev) => {
          if (prev <= delta) { setIsActive(false); handleComplete(); return 0; }
          if (soundEnabled) playTick(settings.soundVolume);
          return prev - delta;
        });
      }, 1000);
    } else { lastTickTimeRef.current = null; }
    return () => { if (timerId) clearInterval(timerId); };
  }, [isActive, timerMode, soundEnabled, settings.soundVolume]);

  const handleComplete = () => {
    playAlarm(settings.soundTheme, settings.soundVolume);
    onSessionComplete(timerMode, totalDuration);
    if (timerMode === 'focus') {
      const next = (pomodorosCompleted + 1) % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
      setTimerMode(next); setSecondsRemaining(getDuration(next));
      if (settings.autoStartBreaks) setTimeout(() => setIsActive(true), 1000);
    } else {
      setTimerMode('focus'); setSecondsRemaining(getDuration('focus'));
      if (settings.autoStartPomodoros) setTimeout(() => setIsActive(true), 1000);
    }
  };

  const togglePlay = () => { playBtnSound(); setIsActive(!isActive); };
  const resetTimer = () => { playBtnSound(); setIsActive(false); setSecondsRemaining(totalDuration); };
  const skipTimer = () => {
    playBtnSound(); setIsActive(false);
    if (timerMode === 'focus') {
      const n = pomodorosCompleted > 0 && pomodorosCompleted % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
      setTimerMode(n); setSecondsRemaining(getDuration(n));
    } else { setTimerMode('focus'); setSecondsRemaining(getDuration('focus')); }
  };

  const R = 96, C = 2 * Math.PI * R;
  const progress = totalDuration > 0 ? secondsRemaining / totalDuration : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full px-5 py-4 select-none animate-fade-in">
      <div className="flex gap-1 p-1 rounded-full surface-soft mb-5">
        {(Object.keys(MODE_META) as Array<keyof typeof MODE_META>).map((mode) => (
          <button key={mode} onClick={() => { playBtnSound(); setTimerMode(mode); setIsActive(false); setSecondsRemaining(getDuration(mode)); }}
            className={`text-[11px] px-3.5 py-1.5 rounded-full font-medium transition-all ${timerMode === mode ? 'bg-[#2b3038] text-[#e3e5ea] shadow-sm' : 'text-dim hover:text-[#c8ccd6]'}`}>
            {MODE_META[mode].label}
          </button>
        ))}
      </div>

      <div className="relative w-56 h-56 flex items-center justify-center mb-5">
        <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 224 224">
          <circle cx="112" cy="112" r={R} stroke="#2b3038" strokeWidth="6" fill="transparent" />
          <circle cx="112" cy="112" r={R} stroke={modeColor} strokeWidth="6" fill="transparent"
            strokeDasharray={C} strokeDashoffset={C * (1 - progress)} strokeLinecap="round"
            className="transition-all duration-500" />
        </svg>
        <div className="flex flex-col items-center justify-center z-10 text-center">
          <span className="text-5xl font-semibold tracking-tight font-mono tabular-nums leading-none">{formatTime(secondsRemaining)}</span>
          <span className="text-[10px] font-medium text-faint uppercase tracking-[0.2em] mt-3">{meta.short}</span>
        </div>
      </div>

      <div className="h-7 mb-4 flex items-center justify-center max-w-full">
        {timerMode === 'focus' ? (
          activeTodoText ? (
            <div className="text-xs font-medium truncate max-w-[260px] px-3 py-1 rounded-full border" style={{ color: accentHex, background: accentHex + '15', borderColor: accentHex + '30' }}>
              Mengerjakan: <span className="font-semibold">"{activeTodoText}"</span>
            </div>
          ) : <span className="text-[11px] text-faint italic">Belum ada tugas aktif yang dipilih</span>
        ) : <span className="text-[11px] text-faint italic">Istirahat sejenak, regangkan badan</span>}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => { playBtnSound(); setSoundEnabled(!soundEnabled); }}
          className={`p-2.5 rounded-full transition-all ${soundEnabled ? 'surface-soft text-dim hover:text-[#c8ccd6]' : 'text-faint hover:text-dim'}`}
          title={soundEnabled ? 'Matikan suara detak' : 'Aktifkan suara detak'}>
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button onClick={togglePlay} style={{ background: modeColor }}
          className="px-7 py-3 rounded-full font-semibold text-sm tracking-wide transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2 text-[#16181d]">
          {isActive ? <><Pause size={16} fill="currentColor" /><span>Jeda</span></> : <><Play size={16} fill="currentColor" /><span>Mulai</span></>}
        </button>
        <button onClick={resetTimer} className="p-2.5 rounded-full surface-soft text-dim hover:text-[#c8ccd6] transition-all" title="Reset sesi"><RefreshCw size={17} /></button>
        <button onClick={skipTimer} className="p-2.5 rounded-full surface-soft text-dim hover:text-[#c8ccd6] transition-all" title="Lewati sesi"><SkipForward size={17} /></button>
        <PipWrapper secondsRemaining={secondsRemaining} timerMode={timerMode} isActive={isActive} onTogglePlay={togglePlay} onReset={resetTimer} />
      </div>
    </div>
  );
};
