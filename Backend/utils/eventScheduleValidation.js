const MIN_DURATION_MS = 90 * 60 * 1000;

function endOfLocalToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function isStartStrictlyAfterEndOfToday(start) {
  const t = new Date(start).getTime();
  if (Number.isNaN(t)) return false;
  return t > endOfLocalToday();
}

/**
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validateEventSchedule(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: 'Dates invalides' };
  }
  if (!isStartStrictlyAfterEndOfToday(start)) {
    return {
      ok: false,
      message: 'La date de début doit être à partir de demain (passé et aujourd’hui ne sont pas autorisés).',
    };
  }
  if (end < start) {
    return { ok: false, message: 'La date de fin doit être après la date de début' };
  }
  if (end.getTime() - start.getTime() < MIN_DURATION_MS) {
    return { ok: false, message: "La durée minimale de l'événement est de 1 h 30" };
  }
  return { ok: true };
}

module.exports = { validateEventSchedule, isStartStrictlyAfterEndOfToday };
