const TEMP_HUMIDITY_STATION = "Hong Kong Observatory";
const AQHI_STATION = "Central/Western";
const MTR_SCHEDULE_KEY = "ISL-HKU";

function isMissing(value) {
  if (value === null || value === undefined) {
    return true;
  }
  const text = String(value).trim();
  return text === "" || /^n\/a$/i.test(text);
}

function isFiniteNumber(value) {
  return (typeof value === "number" || typeof value === "string") &&
    !isMissing(value) && Number.isFinite(Number(value));
}

function findByPlace(entries, place) {
  if (!Array.isArray(entries)) {
    return null;
  }
  return entries.find((entry) => entry && entry.place === place) || null;
}

export function formatTemp(data) {
  const station = findByPlace(data && data.temperature && data.temperature.data, TEMP_HUMIDITY_STATION);
  if (!station || !isFiniteNumber(station.value) || station.unit !== "C") {
    return "--";
  }
  return `${Number(station.value)}°C`;
}

export function formatAqhi(data, stationName = AQHI_STATION) {
  const station = Array.isArray(data)
    ? data.find((entry) => entry && entry.station === stationName)
    : null;
  if (!station || !/^(?:[1-9]|10|10\+)$/.test(String(station.aqhi)) ||
      typeof station.health_risk !== "string" || !station.health_risk.trim()) {
    throw new Error(`Missing or invalid ${stationName} AQHI`);
  }
  return `${station.station}\nAQHI ${station.aqhi}\nHealth risk: ${station.health_risk}`;
}

export function nextTrain(data) {
  if (!data || data.status !== 1) {
    throw new Error("Train service returned an unsuccessful status");
  }
  const schedule = data.data && data.data[MTR_SCHEDULE_KEY];
  if (!schedule || !Array.isArray(schedule.UP)) {
    throw new Error("Missing HKU UP schedule");
  }
  if (schedule.UP.length === 0) {
    return "No upcoming trains in this direction.";
  }
  const train = schedule.UP[0];
  if (!train || !isFiniteNumber(train.ttnt) ||
      !Number.isInteger(Number(train.ttnt)) || Number(train.ttnt) < 0 ||
      typeof train.dest !== "string" || !/^[A-Z]{3}$/.test(train.dest) ||
      train.valid === "N") {
    throw new Error("Invalid next-train information");
  }
  return `${Number(train.ttnt)} min\nDestination code: ${train.dest}`;
}
