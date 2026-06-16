export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  if (hours === 1) return '1h';
  return `${hours.toFixed(1)}h`;
}

export function calculateHours(checkIn: string | Date, checkOut: string | Date): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function getHoursOpen(checkIn: string | Date): number {
  const start = new Date(checkIn);
  const now = new Date();
  return (now.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function isToday(date: string | Date): boolean {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}