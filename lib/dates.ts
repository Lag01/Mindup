/**
 * Renvoie l'instant correspondant à minuit (00:00:00) du jour courant
 * exprimé dans la timezone donnée (IANA), sous forme d'objet Date UTC.
 *
 * Exemple : pour `tz = 'Europe/Paris'` et `now = 2026-05-21T08:00:00Z`,
 * la fonction renvoie l'instant UTC correspondant à 2026-05-21T00:00:00 heure de Paris.
 */
export function computeLocalDayStart(now: Date, tz: string): Date {
  let timeZone = tz;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
  } catch {
    timeZone = 'UTC';
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;

  const offsetMinutes = getTimezoneOffsetMinutes(now, timeZone);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mm = String(absMin % 60).padStart(2, '0');
  const isoOffset = `${sign}${hh}:${mm}`;

  return new Date(`${year}-${month}-${day}T00:00:00${isoOffset}`);
}

function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour === '24' ? '00' : map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return Math.round((asUtc - date.getTime()) / 60000);
}
