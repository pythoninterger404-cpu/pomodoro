export function getTodayFocusCount(sessions: Array<{type: string; timestamp: number}>): number {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return sessions.filter(s => s.type === 'focus' && s.timestamp >= start).length;
}
