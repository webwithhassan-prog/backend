// Pakistan Standard Time is a fixed UTC+5 offset with no DST, so a plain
// hour shift is exact — no timezone database or seasonal edge cases.
// The server itself runs in UTC (Render), so any "start of day/month"
// or "which day of the week" computed with the server's own local-time
// getters (setHours(0,0,0,0), getDay(), etc.) is off by up to 5 hours
// and, for part of every day, off by a full calendar day. These helpers
// do that arithmetic in Pakistan time regardless of the server's zone.
const PKT_OFFSET_HOURS = 5;
const PKT_OFFSET_MS = PKT_OFFSET_HOURS * 60 * 60 * 1000;

// Absolute UTC instant for a Pakistan wall-clock date/time.
const pktToDate = (year, month, day, hour = 0, minute = 0) =>
  new Date(Date.UTC(year, month, day, hour - PKT_OFFSET_HOURS, minute));

// The given instant's wall-clock date/time as seen in Pakistan, read via
// the UTC getters so it's correct no matter what timezone the server
// process itself runs in.
const toPKTParts = (date = new Date()) => {
  const pkt = new Date(date.getTime() + PKT_OFFSET_MS);
  return {
    year: pkt.getUTCFullYear(),
    month: pkt.getUTCMonth(),
    day: pkt.getUTCDate(),
    hour: pkt.getUTCHours(),
    minute: pkt.getUTCMinutes(),
    dayOfWeek: pkt.getUTCDay(),
  };
};

const startOfDayPKT = (date = new Date()) => {
  const { year, month, day } = toPKTParts(date);
  return pktToDate(year, month, day);
};

const startOfMonthPKT = (date = new Date()) => {
  const { year, month } = toPKTParts(date);
  return pktToDate(year, month, 1);
};

// "YYYY-MM-DD" for the given instant's PKT calendar day — for anything
// that keys records by day (e.g. one daily-log document per client per
// day). `date.toISOString().split("T")[0]` looks equivalent but isn't:
// toISOString() is always UTC, which rolls over 5 hours before PKT does.
const dateStringPKT = (date = new Date()) => {
  const { year, month, day } = toPKTParts(date);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

module.exports = {
  PKT_OFFSET_HOURS,
  pktToDate,
  toPKTParts,
  startOfDayPKT,
  startOfMonthPKT,
  dateStringPKT,
};
