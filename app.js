import { formatAqhi, formatTemp, nextTrain } from "./format/format.js";

const FETCH_TIMEOUT_MS = 10000;
const TEMP_HUMIDITY_URL =
  "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en";
const TEMP_HUMIDITY_STATION = "Hong Kong Observatory";
const LOADING_TEXT = "Loading weather data…";
const ITEM_UNAVAILABLE = "Temporarily unavailable";
const TIME_UNAVAILABLE = "Time unavailable";
const ALL_UNAVAILABLE = "Weather data is temporarily unavailable. Please try again later.";

const statusEl = document.getElementById("weather-status");
const itemsEl = document.getElementById("weather-items");
const itemResults = {
  temperature: null,
  humidity: null,
};

function findByPlace(entries, place) {
  if (!Array.isArray(entries)) {
    return null;
  }
  return entries.find((entry) => entry && entry.place === place) || null;
}

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

function formatHongKongTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseIsoHongKongTime(value) {
  if (isMissing(value)) {
    return null;
  }
  return formatHongKongTime(new Date(value));
}

function displayTime(formatted, label) {
  if (!formatted) {
    return TIME_UNAVAILABLE;
  }
  return `${label}${formatted} HKT`;
}

function setItemText(id, role, text) {
  const node = document.querySelector(`#${id} [data-role="${role}"]`);
  if (node) {
    node.textContent = text;
  }
}

function revealItems() {
  itemsEl.hidden = false;
  if (!Object.values(itemResults).every((result) => result === false)) {
    statusEl.hidden = true;
  }
}

function markItem(name, ok) {
  itemResults[name] = ok;
  document.getElementById(`item-${name}`).classList.toggle("error", !ok);
  revealItems();

  const settled = Object.values(itemResults);
  if (settled.some((result) => result === null)) {
    return;
  }
  if (settled.every((result) => result === false)) {
    itemsEl.hidden = true;
    statusEl.hidden = false;
    statusEl.textContent = ALL_UNAVAILABLE;
    document.getElementById("weather").classList.add("error");
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function renderTemperature(data) {
  const station = findByPlace(data && data.temperature && data.temperature.data, TEMP_HUMIDITY_STATION);
  const time = parseIsoHongKongTime(data && data.temperature && data.temperature.recordTime);
  setItemText("item-temperature", "time", displayTime(time, "Observed: "));

  if (!station || !isFiniteNumber(station.value) || station.unit !== "C") {
    setItemText("item-temperature", "value", ITEM_UNAVAILABLE);
    markItem("temperature", false);
    return;
  }

  setItemText("item-temperature", "value", formatTemp(data));
  markItem("temperature", true);
}

function renderHumidity(data) {
  const station = findByPlace(data && data.humidity && data.humidity.data, TEMP_HUMIDITY_STATION);
  const time = parseIsoHongKongTime(data && data.humidity && data.humidity.recordTime);
  setItemText("item-humidity", "time", displayTime(time, "Observed: "));

  if (!station || !isFiniteNumber(station.value) || station.unit !== "percent") {
    setItemText("item-humidity", "value", ITEM_UNAVAILABLE);
    markItem("humidity", false);
    return;
  }

  setItemText("item-humidity", "value", `${Number(station.value)}%`);
  markItem("humidity", true);
}

function failTemperatureAndHumidity() {
  setItemText("item-temperature", "value", ITEM_UNAVAILABLE);
  setItemText("item-temperature", "time", TIME_UNAVAILABLE);
  setItemText("item-humidity", "value", ITEM_UNAVAILABLE);
  setItemText("item-humidity", "time", TIME_UNAVAILABLE);
  markItem("temperature", false);
  markItem("humidity", false);
}

async function loadTemperatureAndHumidity() {
  try {
    const data = await fetchWithTimeout(TEMP_HUMIDITY_URL);
    renderTemperature(data);
    renderHumidity(data);
  } catch (error) {
    console.error(error);
    failTemperatureAndHumidity();
  }
}

statusEl.textContent = LOADING_TEXT;
loadTemperatureAndHumidity();

const AQHI_URL = "https://dashboard.data.gov.hk/api/aqhi-individual?format=json";
const TRAIN_URL = "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=ISL&sta=HKU";

function setCardState(card, message, failed = false) {
  document.getElementById(card).classList.toggle("error", failed);
  document.getElementById(`${card}-status`).textContent = message;
  document.getElementById(`${card}-status`).hidden = message === "";
  document.getElementById(`${card}-items`).hidden = message !== "";
}

function renderAirQuality(data) {
  const [station, value, risk] = formatAqhi(data).split("\n");
  document.getElementById("aqhi-station").textContent = station;
  document.getElementById("aqhi-value").textContent = value;
  document.getElementById("aqhi-risk").textContent = risk;
  setCardState("air-quality", "");
}

async function loadAirQuality() {
  setCardState("air-quality", "Loading air quality data…");
  try {
    renderAirQuality(await fetchWithTimeout(AQHI_URL));
  } catch (error) {
    setCardState("air-quality", "Air quality unavailable.", true);
  }
}

function renderTrains(data) {
  const train = nextTrain(data);
  if (!train.includes("\n")) {
    setCardState("transport", train);
    return;
  }
  const [minutes, destination] = train.split("\n");
  document.getElementById("train-minutes").textContent = minutes;
  document.getElementById("train-destination").textContent = destination;
  setCardState("transport", "");
}

async function loadTrains() {
  setCardState("transport", "Loading train data…");
  try {
    renderTrains(await fetchWithTimeout(TRAIN_URL));
  } catch (error) {
    setCardState("transport", "Train data is temporarily unavailable. Please try again later.", true);
  }
}

loadAirQuality();
loadTrains();
