/**
 * Cálculo de "próxima ocurrencia" para reuniones recurrentes semanales, para
 * poder ordenar la lista por la que viene más pronto y marcar la que está
 * en curso ahora mismo.
 */

export const DAYS = [
  { key: 'mon', label: 'Lun', jsDay: 1 },
  { key: 'tue', label: 'Mar', jsDay: 2 },
  { key: 'wed', label: 'Mié', jsDay: 3 },
  { key: 'thu', label: 'Jue', jsDay: 4 },
  { key: 'fri', label: 'Vie', jsDay: 5 },
  { key: 'sat', label: 'Sáb', jsDay: 6 },
  { key: 'sun', label: 'Dom', jsDay: 0 },
];

const DAY_LABEL = Object.fromEntries(DAYS.map((d) => [d.key, d.label]));
const JS_DAY_TO_KEY = Object.fromEntries(DAYS.map((d) => [d.jsDay, d.key]));

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Aplana el horario (que agrupa días con el mismo rango) a una lista de slots por día individual. */
export function flattenSchedule(schedule) {
  return (schedule || []).flatMap((block) =>
    block.days.map((day) => ({ day, start: block.start, end: block.end }))
  );
}

export function describeSchedule(schedule) {
  return (schedule || [])
    .map((block) => `${block.days.map((d) => DAY_LABEL[d] || d).join('/')} ${block.start}–${block.end}`)
    .join(' · ');
}

/**
 * Devuelve, para una reunión, su próxima ocurrencia (fecha + si está
 * sucediendo ahora mismo), o null si no tiene horario configurado.
 */
export function nextOccurrence(meeting, now = new Date()) {
  const slots = flattenSchedule(meeting.schedule);
  if (slots.length === 0) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = JS_DAY_TO_KEY[now.getDay()];

  let best = null;
  for (const slot of slots) {
    const slotDayIndex = DAYS.findIndex((d) => d.key === slot.day);
    if (slotDayIndex === -1) continue;
    const todayIndex = DAYS.findIndex((d) => d.key === todayKey);

    let daysAhead = (DAYS[slotDayIndex].jsDay - DAYS[todayIndex].jsDay + 7) % 7;
    const startMin = toMinutes(slot.start);
    const endMin = toMinutes(slot.end);
    const isToday = daysAhead === 0;
    const liveNow = isToday && nowMinutes >= startMin && nowMinutes < endMin;
    const alreadyPassedToday = isToday && nowMinutes >= endMin;

    if (alreadyPassedToday) daysAhead = 7; // la de hoy ya pasó, cae a la próxima semana

    const minutesUntilStart = daysAhead * 24 * 60 + startMin - nowMinutes;

    if (!best || minutesUntilStart < best.minutesUntilStart) {
      best = { ...slot, daysAhead, liveNow, minutesUntilStart };
    }
  }
  return best;
}

export function sortByNextOccurrence(meetings, now = new Date()) {
  return [...meetings].sort((a, b) => {
    const na = nextOccurrence(a, now);
    const nb = nextOccurrence(b, now);
    if (!na && !nb) return a.name.localeCompare(b.name);
    if (!na) return 1;
    if (!nb) return -1;
    return na.minutesUntilStart - nb.minutesUntilStart;
  });
}
