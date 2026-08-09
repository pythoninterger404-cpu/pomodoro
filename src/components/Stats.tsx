import React, { useMemo } from 'react';
import { StudySession } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getLocalDateString } from '../lib/utils';
import { Flame, Clock, TrendingUp } from 'lucide-react';

interface StatsProps {
  sessions: StudySession[];
}

const HEAT_COLORS = ['#21252d', '#4a3c22', '#7a5f2c', '#ab843a', '#d9a441'];

function heatLevel(seconds: number): number {
  if (seconds <= 0) return 0;
  if (seconds < 25 * 60) return 1;
  if (seconds < 60 * 60) return 2;
  if (seconds < 2 * 60 * 60) return 3;
  return 4;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} mnt`;
}

export const Stats: React.FC<StatsProps> = ({ sessions }) => {
  const focusSessions = useMemo(() => sessions.filter((s) => s.type === 'focus'), [sessions]);

  // ---- 1. Yearly heatmap ----
  const heatmap = useMemo(() => {
    const byDate: Record<string, number> = {};
    focusSessions.forEach((s) => {
      const key = getLocalDateString(s.timestamp);
      byDate[key] = (byDate[key] || 0) + s.duration;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align to the start of the week (Sunday) ~52 weeks back
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const weeks: Array<Array<{ date: string; seconds: number; inFuture: boolean }>> = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const week: Array<{ date: string; seconds: number; inFuture: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const key = getLocalDateString(cursor.getTime());
        week.push({ date: key, seconds: byDate[key] || 0, inFuture: cursor > today });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [focusSessions]);

  const activeDays = useMemo(
    () => heatmap.flat().filter((d) => d.seconds > 0).length,
    [heatmap]
  );

  // ---- 2. Current month daily chart ----
  const monthChart = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const byDay: Record<number, number> = {};
    focusSessions.forEach((s) => {
      const d = new Date(s.timestamp);
      if (d.getFullYear() === year && d.getMonth() === month) {
        byDay[d.getDate()] = (byDay[d.getDate()] || 0) + s.duration;
      }
    });

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, menit: Math.round((byDay[day] || 0) / 60) };
    });
  }, [focusSessions]);

  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const monthTotal = monthChart.reduce((acc, d) => acc + d.menit, 0);

  // ---- 3. All-time total ----
  const totalSeconds = focusSessions.reduce((acc, s) => acc + s.duration, 0);

  // ---- History ----
  const history = useMemo(
    () => [...sessions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 12),
    [sessions]
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="surface-soft rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <Clock size={12} />
            <span className="text-[10px] uppercase tracking-wider">Total Fokus</span>
          </div>
          <div className="text-sm font-semibold text-[#e3e5ea]">{formatDuration(totalSeconds)}</div>
          <div className="text-[10px] text-faint">sepanjang waktu</div>
        </div>
        <div className="surface-soft rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <Flame size={12} />
            <span className="text-[10px] uppercase tracking-wider">Hari Aktif</span>
          </div>
          <div className="text-sm font-semibold text-[#e3e5ea]">{activeDays} hari</div>
          <div className="text-[10px] text-faint">setahun terakhir</div>
        </div>
        <div className="surface-soft rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <TrendingUp size={12} />
            <span className="text-[10px] uppercase tracking-wider">Bulan Ini</span>
          </div>
          <div className="text-sm font-semibold text-[#e3e5ea]">{monthTotal} mnt</div>
          <div className="text-[10px] text-faint">{monthName.split(' ')[0]}</div>
        </div>
      </div>

      {/* 1. Yearly heatmap */}
      <div className="surface-soft rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-semibold text-[#c8ccd6]">Aktivitas Setahun</h4>
          <div className="flex items-center gap-1 text-[9px] text-faint">
            <span>Sedikit</span>
            {HEAT_COLORS.map((c) => (
              <span key={c} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            ))}
            <span>Banyak</span>
          </div>
        </div>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {heatmap.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date} — ${formatDuration(day.seconds)}`}
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    background: day.inFuture ? 'transparent' : HEAT_COLORS[heatLevel(day.seconds)],
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Monthly chart */}
      <div className="surface-soft rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-[#c8ccd6]">Tren Harian — {monthName}</h4>
          <span className="text-[10px] text-faint">menit fokus / hari</span>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthChart} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d9a441" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#d9a441" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b3038" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: '#6a6f7d' }}
                tickLine={false}
                axisLine={{ stroke: '#2b3038' }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 9, fill: '#6a6f7d' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#1f232b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  fontSize: 11,
                }}
                labelStyle={{ color: '#8b90a0' }}
                formatter={(value: number) => [`${value} mnt`, 'Fokus']}
                labelFormatter={(day: number) => `Tanggal ${day}`}
              />
              <Area
                type="monotone"
                dataKey="menit"
                stroke="#d9a441"
                strokeWidth={2}
                fill="url(#monthFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. All-time total */}
      <div className="surface rounded-xl p-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-faint mb-1">
          Total Durasi Tugas (All-Time)
        </div>
        <div className="text-3xl font-semibold text-[#d9a441] font-mono tabular-nums">
          {formatDuration(totalSeconds)}
        </div>
        <div className="text-[11px] text-dim mt-1">
          {focusSessions.length} sesi fokus diselesaikan
        </div>
      </div>

      {/* History */}
      <div className="surface-soft rounded-xl p-3.5">
        <h4 className="text-xs font-semibold text-[#c8ccd6] mb-2.5">Riwayat Aktivitas</h4>
        {history.length === 0 ? (
          <p className="text-[11px] text-faint text-center py-4">Belum ada sesi yang tercatat.</p>
        ) : (
          <div className="flex flex-col divide-y divide-white/5">
            {history.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[#c8ccd6] truncate">
                    {s.taskTitle || (s.type === 'focus' ? 'Sesi fokus' : 'Istirahat')}
                  </div>
                  <div className="text-[10px] text-faint">
                    {new Date(s.timestamp).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <span
                  className="text-[11px] font-medium font-mono tabular-nums shrink-0 ml-3"
                  style={{ color: s.type === 'focus' ? '#d9a441' : '#7fa88a' }}
                >
                  {formatDuration(s.duration)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
