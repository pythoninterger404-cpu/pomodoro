import React from 'react';
import { TimerSettings } from '../types';
import { playAlarm, playBtnSound } from '../lib/audio';

interface SettingsProps {
  settings: TimerSettings;
  onSave: (settings: TimerSettings) => void;
}

const SOUND_THEMES: Array<{ id: TimerSettings['soundTheme']; label: string }> = [
  { id: 'soft', label: 'Lembut' },
  { id: 'classic', label: 'Klasik' },
  { id: 'digital', label: 'Digital' },
  { id: 'nature', label: 'Alam' },
];

export const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const handleChange = <K extends keyof TimerSettings>(key: K, value: TimerSettings[K]) => {
    onSave({ ...settings, [key]: value });
  };

  const DurationInput = ({
    label,
    value,
    min,
    max,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] text-dim">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          playBtnSound();
          onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)));
        }}
        className="w-full surface-soft rounded-lg px-2.5 py-2 text-center text-sm font-medium focus:outline-none focus:border-[#d9a441]/40 transition-colors"
      />
    </div>
  );

  const Toggle = ({
    label,
    desc,
    checked,
    onChange,
  }: {
    label: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      onClick={() => {
        playBtnSound();
        onChange(!checked);
      }}
      className="flex items-center justify-between w-full surface-soft rounded-xl px-3.5 py-3 text-left transition-colors hover:border-white/10"
    >
      <div>
        <div className="text-sm text-[#e3e5ea]">{label}</div>
        <div className="text-[11px] text-faint mt-0.5">{desc}</div>
      </div>
      <span
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-3 ${
          checked ? 'bg-[#d9a441]' : 'bg-[#2b3038]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4.5 left-0.5 translate-x-[18px]' : 'left-0.5'
          }`}
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </span>
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 animate-fade-in">
      {/* Durations */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">
          Durasi Sesi (menit)
        </h4>
        <div className="grid grid-cols-3 gap-2.5">
          <DurationInput
            label="Fokus"
            value={settings.focusTime}
            min={1}
            max={120}
            onChange={(v) => handleChange('focusTime', v)}
          />
          <DurationInput
            label="Break Singkat"
            value={settings.shortBreak}
            min={1}
            max={45}
            onChange={(v) => handleChange('shortBreak', v)}
          />
          <DurationInput
            label="Break Panjang"
            value={settings.longBreak}
            min={1}
            max={60}
            onChange={(v) => handleChange('longBreak', v)}
          />
        </div>
      </section>

      {/* Long break interval */}
      <section className="surface-soft rounded-xl p-3.5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#e3e5ea]">Interval break panjang</span>
          <span className="text-xs font-semibold text-[#d9a441]">{settings.longBreakInterval} sesi</span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={settings.longBreakInterval}
          onChange={(e) => {
            handleChange('longBreakInterval', parseInt(e.target.value));
          }}
          className="w-full"
        />
      </section>

      {/* Sound */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">Suara</h4>
        <div className="surface-soft rounded-xl p-3.5 flex flex-col gap-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#e3e5ea]">Volume</span>
              <span className="text-xs text-dim">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.soundVolume * 100)}
              onChange={(e) => handleChange('soundVolume', parseInt(e.target.value) / 100)}
              className="w-full"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {SOUND_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    playBtnSound();
                    handleChange('soundTheme', t.id);
                  }}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition-all ${
                    settings.soundTheme === t.id
                      ? 'bg-[#d9a441]/15 text-[#d9a441] border border-[#d9a441]/40'
                      : 'surface-soft text-dim hover:text-[#c8ccd6]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => playAlarm(settings.soundTheme, settings.soundVolume)}
              className="text-[11px] px-3 py-1.5 rounded-full surface-soft text-dim hover:text-[#c8ccd6] transition-colors shrink-0"
            >
              Uji
            </button>
          </div>
        </div>
      </section>

      {/* Automation */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">
          Otomatisasi
        </h4>
        <div className="flex flex-col gap-2">
          <Toggle
            label="Mulai break otomatis"
            desc="Langsung masuk sesi istirahat setelah fokus selesai"
            checked={settings.autoStartBreaks}
            onChange={(v) => handleChange('autoStartBreaks', v)}
          />
          <Toggle
            label="Mulai fokus otomatis"
            desc="Langsung mulai sesi fokus setelah istirahat selesai"
            checked={settings.autoStartPomodoros}
            onChange={(v) => handleChange('autoStartPomodoros', v)}
          />
        </div>
      </section>
    </div>
  );
};
