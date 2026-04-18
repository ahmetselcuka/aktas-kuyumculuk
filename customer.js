const REFRESH_INTERVAL_SECONDS = 20;
const STORAGE_KEY = "aktas-customer-cache";
const DEFAULT_SOURCE_NAME = "Firebase Canlı Veri";

const PRODUCT_META = [
  { key: "22", label: "22 Ayar", icon: "ring", buyMargin: 0, sellMargin: 70 },
  { key: "GA", label: "24 Ayar", icon: "gold", buyMargin: 0, sellMargin: 80 },
  { key: "C", label: "Çeyrek", icon: "coin", buyMargin: 0, sellMargin: 150 },
  { key: "Y", label: "Yarım", icon: "coin", buyMargin: 0, sellMargin: 250 },
  { key: "CMR", label: "Tek Lira", icon: "coin", buyMargin: 0, sellMargin: 400 },
  { key: "ATA", label: "Ata Lira", icon: "coin", buyMargin: 0, sellMargin: 500 },
  { key: "GR", label: "Gremse", icon: "ring", buyMargin: 0, sellMargin: 1200 }
];

const LOCAL_SAMPLE_DATA = [
  { key: "22", buy: 6480, sell: 6550, trend: "up", change: "+0,12" },
  { key: "GA", buy: 6910, sell: 6990, trend: "up", change: "+0,25" },
  { key: "C", buy: 11180, sell: 11330, trend: "up", change: "+0,12" },
  { key: "Y", buy: 22360, sell: 22610, trend: "up", change: "+0,12" },
  { key: "CMR", buy: 45610, sell: 46010, trend: "up", change: "+0,12" },
  { key: "ATA", buy: 45610, sell: 46110, trend: "up", change: "+0,12" },
  { key: "GR", buy: 110750, sell: 111950, trend: "up", change: "+0,12" }
];


const lastUpdatedEl = document.querySelector("#lastUpdated");
const refreshInEl = document.querySelector("#refreshIn");
const connectionBadgeEl = document.querySelector("#connectionBadge");
const ratesTableEl = document.querySelector("#ratesTable");
const rateRowTemplate = document.querySelector("#rateRowTemplate");

let secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;

function formatPrice(value) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function roundToNearestTen(value) {
  return Math.round(value / 10) * 10;
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  if (value.includes(",")) return Number(value.replace(/\./g, "").replace(",", "."));
  return Number(value);
}

function normalizeTrend(direction) {
  if (direction === "moneyUp" || direction === "up") return "up";
  if (direction === "moneyDown" || direction === "down") return "down";
  return "flat";
}

function iconFor(type) {
  if (type === "ring") return "O";
  if (type === "gold") return "G";
  return "*";
}

function updateClock() {
  const clockText = document.querySelector("#clockText");
  clockText.textContent = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function saveCache(rates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ rates, updatedAt: new Date().toISOString() }));
}

function loadCache() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function applySharedMargins(settings) {
  const margins = settings?.margins ?? {};
  PRODUCT_META.forEach((item) => {
    const saved = margins[item.key] ?? {};
    const buyMargin = Number(saved.buyMargin);
    const sellMargin = Number(saved.sellMargin);
    if (Number.isFinite(buyMargin)) item.buyMargin = roundToNearestTen(buyMargin);
    if (Number.isFinite(sellMargin)) item.sellMargin = roundToNearestTen(sellMargin);
  });
}

function setLiveState(state) {
  if (state === "live") {
    connectionBadgeEl.textContent = "Canlı";
    return;
  }
  if (state === "cached") {
    connectionBadgeEl.textContent = "Önbellek";
    return;
  }
  connectionBadgeEl.textContent = "Sorun";
}

function mapViewRates(rates) {
  return rates.map((rate) => {
    const meta = PRODUCT_META.find((item) => item.key === rate.key);
    return {
      key: rate.key,
      label: meta?.label ?? rate.key,
      icon: meta?.icon ?? "coin",
      buy: roundToNearestTen(Number.isFinite(rate.buy) ? rate.buy : 0),
      sell: roundToNearestTen(Number.isFinite(rate.sell) ? rate.sell : 0),
      trend: rate.trend ?? "up",
      change: rate.change ?? "+0,00"
    };
  });
}

function renderRates(rates) {
  ratesTableEl.innerHTML = "";
  rates.forEach((rate) => {
    const fragment = rateRowTemplate.content.cloneNode(true);
    fragment.querySelector(".product-icon").textContent = iconFor(rate.icon);
    fragment.querySelector(".product-name").textContent = rate.label;
    fragment.querySelector(".product-meta").textContent = rate.trend === "up" ? "Yükseliyor" : "Sabit";
    fragment.querySelector(".buy-price").textContent = formatPrice(rate.buy);
    fragment.querySelector(".sell-price").textContent = formatPrice(rate.sell);
    fragment.querySelector(".trend-value").textContent = `%${rate.change}`;
    ratesTableEl.appendChild(fragment);
  });
}

function buildDisplayRates(rawRates) {
  return PRODUCT_META.map((item) => {
    const source = rawRates.find((rate) => rate.key === item.key);
    if (!source) throw new Error(`Eksik veri: ${item.key}`);

    const sourceBuy = parseNumber(source.buy);
    const sourceSell = parseNumber(source.sell);
    return {
      key: item.key,
      buy: roundToNearestTen(sourceBuy - item.buyMargin),
      sell: roundToNearestTen((Number.isFinite(sourceSell) ? sourceSell : sourceBuy) + item.sellMargin),
      trend: normalizeTrend(source.trend),
      change: source.change ?? "+0,00"
    };
  });
}

async function refreshRates() {
  try {
    const sharedRates = await window.AKTAS_RATES.readOnce();
    if (!sharedRates?.rates?.length) {
      throw new Error("Canlı veri henüz hazır değil.");
    }

    const result = {
      rates: buildDisplayRates(sharedRates.rates),
      source: sharedRates.source || DEFAULT_SOURCE_NAME,
      updatedAt: sharedRates.updatedAt
    };
    const viewRates = mapViewRates(result.rates);
    renderRates(viewRates);
    saveCache(viewRates);
    lastUpdatedEl.textContent = formatTime(result.updatedAt ? new Date(result.updatedAt) : new Date());
    setLiveState("live");
    secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;
  } catch {
    const cache = loadCache();
    if (cache?.rates) {
      renderRates(cache.rates);
      lastUpdatedEl.textContent = formatTime(new Date(cache.updatedAt));
      setLiveState("cached");
    } else {
      renderRates(mapViewRates(LOCAL_SAMPLE_DATA));
      lastUpdatedEl.textContent = formatTime();
      setLiveState("error");
    }
  }
}

function startCountdown() {
  setInterval(() => {
    secondsUntilRefresh -= 1;
    if (secondsUntilRefresh <= 0) {
      secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;
      void refreshRates();
    }
    refreshInEl.textContent = `${secondsUntilRefresh} sn`;
    updateClock();
  }, 1000);
}

async function boot() {
  updateClock();
  refreshInEl.textContent = `${secondsUntilRefresh} sn`;

  const sharedSettings = await window.AKTAS_SYNC.readOnce();
  applySharedMargins(sharedSettings);
  renderRates(mapViewRates(LOCAL_SAMPLE_DATA));

  window.AKTAS_SYNC.subscribe((settings) => {
    applySharedMargins(settings);
    void refreshRates();
  });

  window.AKTAS_RATES.subscribe(() => {
    void refreshRates();
  });

  void refreshRates();
  startCountdown();
}

boot();

