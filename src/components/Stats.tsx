import React, { useMemo, useState } from 'react';
import { StudySession, ThemeColor } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getLocalDateString } from '../lib/utils';
import { Flame, Clock, TrendingUp } from 'lucide-react';

interface StatsProps {
  sessions: StudySession[];
  themeColor: ThemeColor;
}

const HEAT_BASE: Record<ThemeColor, string[]> = {
  amber:     ['#21252d','#4a3c22','#7a5f2c','#ab843a','#d9a441'],
  rose:      ['#21252d','#4a2e34','#7a4a58','#ab6a7c','#d9839e'],
  teal:      ['#21252d','#2a3d33','#3f5f4f','#5e8a70','#7fa88a'],
  blue:      ['#21252d','#2d3847','#485a72','#647d9e','#7a93b8'],
  violet:    ['#21252d','#342e42','#544a6a','#7e6a9a','#a38bc0'],
  monochrome:['#21252d','#32343a','#4e5158','#727680','#9aa0b0'],
};

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function heatLevel(seconds: number): number {
  if (seconds <= 0) return 0;
  if (seconds < 25*60) return 1;
  if (seconds < 60*60) return 2;
  if (seconds < 2*60*60) return 3;
  return 4;
}

function fmtDur(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
}

function fmtDateFull(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  const dayName = DAY_NAMES[date.getDay()];
  return `${dayName}, ${d} ${MONTH_NAMES[mo - 1]} ${y}`;
}

export const Stats: React.FC<StatsProps> = ({ sessions, themeColor }) => {
  const focusSessions = useMemo(() => sessions.filter(s => s.type === 'focus'), [sessions]);
  const heatColors = HEAT_BASE[themeColor] || HEAT_BASE.amber;

  const [heatTip, setHeatTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const heatmap = useMemo(() => {
    const byDate: Record<string, number> = {};
    focusSessions.forEach(s => { const k = getLocalDateString(s.timestamp); byDate[k] = (byDate[k] || 0) + s.duration; });
    const today = new Date(); today.setHours(0,0,0,0);
    const start = new Date(today); start.setDate(start.getDate() - 364); start.setDate(start.getDate() - start.getDay());
    const weeks: Array<Array<{date:string;seconds:number;inFuture:boolean}>> = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const week: Array<{date:string;seconds:number;inFuture:boolean}> = [];
      for (let d=0;d<7;d++) { const key = getLocalDateString(cursor.getTime()); week.push({date:key,seconds:byDate[key]||0,inFuture:cursor>today}); cursor.setDate(cursor.getDate()+1); }
      weeks.push(week);
    }
    return weeks;
  }, [focusSessions]);

  const activeDays = useMemo(() => heatmap.flat().filter(d => d.seconds>0).length, [heatmap]);
  const totalSeconds = focusSessions.reduce((a,s) => a + s.duration, 0);

  const monthChart = useMemo(() => {
    const now = new Date(); const yr = now.getFullYear(); const mo = now.getMonth();
    const days = new Date(yr, mo+1, 0).getDate();
    const byDay: Record<number,number> = {};
    focusSessions.forEach(s => { const d = new Date(s.timestamp); if (d.getFullYear()===yr && d.getMonth()===mo) byDay[d.getDate()] = (byDay[d.getDate()]||0) + s.duration; });
    return Array.from({length:days}, (_,i) => ({day:i+1,detik:byDay[i+1]||0}));
  }, [focusSessions]);
  const monthName = new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  const monthTotal = monthChart.reduce((a,d)=>a+d.detik,0);

  const history = useMemo(() => [...sessions].sort((a,b)=>b.timestamp-a.timestamp).slice(0,12), [sessions]);
  const accentHex = heatColors[4];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="surface-soft rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-faint mb-1"><Clock size={12}/><span className="text-[10px] uppercase tracking-wider">Total Fokus</span></div>
          <div className="text-sm font-semibold text-[#e3e5ea]">{fmtDur(totalSeconds)}</div>
          <div className="text-[10px] text-faint">sepanjang waktu</div>
        </div>
        <div className="surface-soft rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-faint mb-1"><Flame size={12}/><span className="text-[10px] uppercase tracking-wider">Hari Aktif</span></div>
          <div className="text-sm font-semibold text-[#e3e5ea]">{activeDays} hari</div>
          <div className="text-[10px] text-faint">setahun terakhir</div>
        </div>
        <div className="surface-soft rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-faint mb-1"><TrendingUp size={12}/><span className="text-[10px] uppercase tracking-wider">Bulan Ini</span></div>
          <div className="text-sm font-semibold text-[#e3e5ea]">{fmtDur(monthTotal)}</div>
          <div className="text-[10px] text-faint">{monthName.split(' ')[0]}</div>
        </div>
      </div>

      {/* 1. Yearly heatmap with hover tooltip */}
      <div className="surface-soft rounded-xl p-3.5 relative">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-semibold text-[#c8ccd6]">Aktivitas Setahun</h4>
          <div className="flex items-center gap-1 text-[9px] text-faint"><span>Sedikit</span>{heatColors.map(c=><span key={c} className="w-2.5 h-2.5 rounded-sm" style={{background:c}}/>)}<span>Banyak</span></div>
        </div>
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {heatmap.map((week,wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map(day => (
                <div key={day.date}
                  className="w-2.5 h-2.5 rounded-sm shrink-0 cursor-pointer relative"
                  style={{ background: day.inFuture ? 'transparent' : heatColors[heatLevel(day.seconds)] }}
                  onMouseEnter={(e) => {
                    if (day.inFuture) return;
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setHeatTip({ text: `${fmtDateFull(day.date)}\n${fmtDur(day.seconds)}`, x: rect.left + 8, y: rect.top - 8 });
                  }}
                  onMouseLeave={() => setHeatTip(null)}
                />
              ))}
            </div>
          ))}
        </div>
        {heatTip && (
          <div className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-pre leading-relaxed"
            style={{ left: heatTip.x, top: heatTip.y, background: '#1f232b', border: '1px solid rgba(255,255,255,0.1)', color: '#e3e5ea', transform: 'translateY(-100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
            {heatTip.text}
          </div>
        )}
      </div>

      {/* 2. Monthly chart with seconds tooltip */}
      <div className="surface-soft rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-[#c8ccd6]">Tren Harian — {monthName}</h4>
          <span className="text-[10px] text-faint">detik fokus / hari</span>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthChart} margin={{top:4,right:4,left:-24,bottom:0}}>
              <defs><linearGradient id="mf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accentHex} stopOpacity={0.35}/><stop offset="100%" stopColor={accentHex} stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid stroke="#2b3038" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="day" tick={{fontSize:9,fill:'#6a6f7d'}} tickLine={false} axisLine={{stroke:'#2b3038'}} interval={4}/>
              <YAxis tick={{fontSize:9,fill:'#6a6f7d'}} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={{background:'#1f232b',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,fontSize:11}} labelStyle={{color:'#8b90a0'}} formatter={(v:number)=>[fmtDur(v),'Fokus']} labelFormatter={(d:number)=>`Tanggal ${d}`}/>
              <Area type="monotone" dataKey="detik" stroke={accentHex} strokeWidth={2} fill="url(#mf)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. All-time total with seconds */}
      <div className="surface rounded-xl p-4 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-faint mb-1">Total Durasi Tugas (All-Time)</div>
        <div className="text-3xl font-semibold font-mono tabular-nums" style={{color:accentHex}}>{fmtDur(totalSeconds)}</div>
        <div className="text-[11px] text-dim mt-1">{focusSessions.length} sesi fokus diselesaikan</div>
      </div>

      {/* History with seconds */}
      <div className="surface-soft rounded-xl p-3.5">
        <h4 className="text-xs font-semibold text-[#c8ccd6] mb-2.5">Riwayat Aktivitas</h4>
        {history.length===0?<p className="text-[11px] text-faint text-center py-4">Belum ada sesi yang tercatat.</p>:
          <div className="flex flex-col divide-y divide-white/5">{history.map(s=>
            <div key={s.id} className="flex items-center justify-between py-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#c8ccd6] truncate">{s.taskTitle||(s.type==='focus'?'Sesi fokus':'Istirahat')}</div>
                <div className="text-[10px] text-faint">
                  {new Date(s.timestamp).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              <span className="text-[11px] font-medium font-mono tabular-nums shrink-0 ml-3" style={{color:s.type==='focus'?accentHex:'#7fa88a'}}>
                {fmtDur(s.duration)}
              </span>
            </div>)}
          </div>}
      </div>
    </div>
  );
};
