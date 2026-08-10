import { StudySession } from '../types';
import { getLocalDateString } from './utils';

const TYPE_LABELS: Record<StudySession['type'], string> = {
  focus: 'Fokus',
  shortBreak: 'Istirahat Pendek',
  longBreak: 'Istirahat Panjang',
  custom: 'Kustom',
};

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportSessionsCSV(sessions: StudySession[]): void {
  const header = 'Tanggal,Tipe,Durasi(detik),Tugas';
  const rows = sessions.map((s) => {
    const tanggal = getLocalDateString(s.timestamp);
    const tipe = TYPE_LABELS[s.type] || s.type;
    const durasi = String(s.duration);
    const tugas = s.taskTitle || '';
    return [tanggal, tipe, durasi, tugas].map(escapeCSV).join(',');
  });

  const csv = [header, ...rows].join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pomodoro-sesi-${getLocalDateString()}.csv`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
