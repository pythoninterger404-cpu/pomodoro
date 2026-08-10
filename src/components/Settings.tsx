import React from 'react';
import { TimerSettings, THEME_COLORS } from '../types';
import { playAlarm, playBtnSound } from '../lib/audio';
import { requestPermission } from '../lib/notifications';

interface SettingsProps { settings: TimerSettings; onSave: (s: TimerSettings) => void; }

const SOUND_THEMES: Array<{ id: TimerSettings['soundTheme']; label: string }> = [
  { id: 'soft', label: 'Lembut' }, { id: 'classic', label: 'Klasik' }, { id: 'digital', label: 'Digital' }, { id: 'nature', label: 'Alam' },
];

export const Settings: React.FC<SettingsProps> = ({ settings, onSave }) => {
  const set = <K extends keyof TimerSettings>(k: K, v: TimerSettings[K]) => onSave({ ...settings, [k]: v });

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 animate-fade-in">
      {/* Theme Color */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">Warna Tema</h4>
        <div className="surface-soft rounded-xl p-3">
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map(t => (
              <button key={t.id} onClick={() => { playBtnSound(); set('themeColor', t.id); }}
                className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg transition-all ${
                  settings.themeColor === t.id ? 'border-2' : 'border border-white/5'
                }`}
                style={{ borderColor: settings.themeColor === t.id ? t.hex : undefined }}
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: t.hex }} />
                <span className={settings.themeColor === t.id ? 'text-[#e3e5ea] font-medium' : 'text-dim'}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Durations */}
      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">Durasi Sesi (menit)</h4>
        <div className="grid grid-cols-4 gap-2.5">
          {[{label:'Fokus',k:'focusTime' as const,min:1,max:120},{label:'Break Singkat',k:'shortBreak' as const,min:1,max:45},{label:'Break Panjang',k:'longBreak' as const,min:1,max:60},{label:'Kustom',k:'customDuration' as const,min:1,max:180}].map(d =>
            <div key={d.k} className="flex flex-col gap-1.5">
              <label className="text-[10px] text-dim truncate">{d.label}</label>
              <input type="number" min={d.min} max={d.max} value={settings[d.k]} onChange={e => { playBtnSound(); set(d.k, Math.max(d.min, Math.min(d.max, parseInt(e.target.value)||d.min))); }}
                className="w-full surface-soft rounded-lg px-2 py-2 text-center text-xs font-medium focus:outline-none focus:border-[var(--accent,#d9a441)]/40 transition-colors" />
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <label className="text-[11px] text-dim">Target Harian</label>
          <input type="number" min={1} max={20} value={settings.dailyTarget} onChange={e => { playBtnSound(); set('dailyTarget', Math.max(1, Math.min(20, parseInt(e.target.value)||1))); }}
            className="w-full surface-soft rounded-lg px-2.5 py-2 text-center text-sm font-medium focus:outline-none focus:border-[var(--accent,#d9a441)]/40 transition-colors" />
        </div>
      </section>

      <section className="surface-soft rounded-xl p-3.5">
        <div className="flex justify-between items-center mb-2"><span className="text-sm text-[#e3e5ea]">Interval break panjang</span><span className="text-xs font-semibold" style={{color:'var(--accent,#d9a441)'}}>{settings.longBreakInterval} sesi</span></div>
        <input type="range" min={1} max={12} value={settings.longBreakInterval} onChange={e => set('longBreakInterval', parseInt(e.target.value))} className="w-full" />
      </section>

      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">Suara</h4>
        <div className="surface-soft rounded-xl p-3.5 flex flex-col gap-3">
          <div>
            <div className="flex justify-between items-center mb-2"><span className="text-sm text-[#e3e5ea]">Volume</span><span className="text-xs text-dim">{Math.round(settings.soundVolume*100)}%</span></div>
            <input type="range" min={0} max={100} value={Math.round(settings.soundVolume*100)} onChange={e => set('soundVolume', parseInt(e.target.value)/100)} className="w-full" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {SOUND_THEMES.map(t =>
                <button key={t.id} onClick={() => { playBtnSound(); set('soundTheme', t.id); }}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition-all ${settings.soundTheme===t.id ? 'border' : 'surface-soft text-dim hover:text-[#c8ccd6]'}`}
                  style={settings.soundTheme===t.id ? { background:'var(--accent-15,rgba(217,164,65,0.15))', color:'var(--accent,#d9a441)', borderColor:'var(--accent-40,rgba(217,164,65,0.4))' } : {}}
                >{t.label}</button>
              )}
            </div>
            <button onClick={() => playAlarm(settings.soundTheme, settings.soundVolume)} className="text-[11px] px-3 py-1.5 rounded-full surface-soft text-dim hover:text-[#c8ccd6] transition-colors shrink-0">Uji</button>
          </div>
        </div>
      </section>

      <section>
        <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint mb-2.5">Otomatisasi</h4>
        <div className="flex flex-col gap-2">
          {[
            {label:'Mulai break otomatis',desc:'Langsung masuk sesi istirahat setelah fokus selesai',k:'autoStartBreaks' as const},
            {label:'Mulai fokus otomatis',desc:'Langsung mulai sesi fokus setelah istirahat selesai',k:'autoStartPomodoros' as const},
            {label:'Notifikasi selesai',desc:'Kirim notifikasi browser saat sesi selesai (walau tab tidak aktif)',k:'notifyOnComplete' as const},
          ].map(t =>
            <button key={t.k} onClick={async () => { playBtnSound(); if (t.k === 'notifyOnComplete' && !settings[t.k]) { const ok = await requestPermission(); if (!ok) return; } set(t.k, !settings[t.k]); }}
              className="flex items-center justify-between w-full surface-soft rounded-xl px-3.5 py-3 text-left transition-colors hover:border-white/10">
              <div><div className="text-sm text-[#e3e5ea]">{t.label}</div><div className="text-[11px] text-faint mt-0.5">{t.desc}</div></div>
              <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ml-3 ${settings[t.k] ? '' : 'bg-[#2b3038]'}`}
                style={settings[t.k] ? { background: 'var(--accent,#d9a441)' } : {}}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white left-0.5 transition-transform" style={{ transform: settings[t.k] ? 'translateX(18px)' : 'translateX(0)' }} />
              </span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
