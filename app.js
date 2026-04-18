const REFRESH_INTERVAL_SECONDS = 20;
const STORAGE_KEY = "aktas-kuyumculuk-cache";
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


const refreshButton = document.querySelector("#refreshButton");
const saveMarginsButton = document.querySelector("#saveMarginsButton");
const manualRefreshButton = document.querySelector("#manualRefreshButton");
const panelNoticeEl = document.querySelector("#panelNotice");
const lastUpdatedEl = document.querySelector("#lastUpdated");
const refreshInEl = document.querySelector("#refreshIn");
const connectionBadgeEl = document.querySelector("#connectionBadge");
const sourceLabelEl = document.querySelector("#sourceLabel");
const panelSourceEl = document.querySelector("#panelSource");
const panelFetchEl = document.querySelector("#panelFetch");
const panelUpdateEl = document.querySelector("#panelUpdate");
const panelAutoEl = document.querySelector("#panelAuto");
const ratesTableEl = document.querySelector("#ratesTable");
const marginListEl = document.querySelector("#marginList");
const rateRowTemplate = document.querySelector("#rateRowTemplate");
const marginItemTemplate = document.querySelector("#marginItemTemplate");
const navItems = document.querySelectorAll(".nav-item");
const screens = {
  home: document.querySelector("#homeScreen"),
  panel: document.querySelector("#panelScreen")
};

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

function collectMarginSettings() {
  const margins = {};

  marginListEl.querySelectorAll(".margin-item").forEach((row) => {
    const key = row.dataset.key;
    const buyInput = row.querySelector(".margin-buy-input");
    const sellInput = row.querySelector(".margin-sell-input");
    const buyMargin = roundToNearestTen(Number(buyInput.value) || 0);
    const sellMargin = roundToNearestTen(Number(sellInput.value) || 0);

    buyInput.value = buyMargin;
    sellInput.value = sellMargin;
    margins[key] = { buyMargin, sellMargin };
  });

  return { margins, updatedAt: new Date().toISOString() };
}

function setPanelNotice(message) {
  panelNoticeEl.textContent = message;
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
    const buy = roundToNearestTen(Number.isFinite(rate.buy) ? rate.buy : 0);
    const sell = roundToNearestTen(Number.isFinite(rate.sell) ? rate.sell : buy);

    return {
      key: rate.key,
      label: meta?.label ?? rate.key,
      icon: meta?.icon ?? "coin",
      buy,
      sell,
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

function renderMargins() {
  marginListEl.innerHTML = "";

  PRODUCT_META.forEach((item) => {
    const fragment = marginItemTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".margin-item");
    const label = fragment.querySelector(".margin-label");
    const buyInput = fragment.querySelector(".margin-buy-input");
    const sellInput = fragment.querySelector(".margin-sell-input");

    row.dataset.key = item.key;
    fragment.querySelector(".margin-icon").textContent = iconFor(item.icon);
    label.textContent = item.label;
    label.setAttribute("for", `margin-buy-${item.key}`);

    buyInput.id = `margin-buy-${item.key}`;
    buyInput.value = item.buyMargin;
    sellInput.id = `margin-sell-${item.key}`;
    sellInput.value = item.sellMargin;

    marginListEl.appendChild(fragment);
  });
}

function buildDisplayRates(rawRates) {
  return PRODUCT_META.map((item) => {
    const source = rawRates.find((rate) => rate.key === item.key);
    if (!source) throw new Error(`Eksik veri: ${item.key}`);

    const sourceBuy = parseNumber(source.buy);
    const sourceSell = parseNumber(source.sell);
    const buy = roundToNearestTen(sourceBuy - item.buyMargin);
    const sellBase = Number.isFinite(sourceSell) ? sourceSell : sourceBuy;
    const sell = roundToNearestTen(sellBase + item.sellMargin);

    return {
      key: item.key,
      buy,
      sell,
      trend: normalizeTrend(source.trend),
      change: source.change ?? "+0,00"
    };
  });
}

function updateStatusPanels(source, dateText) {
  sourceLabelEl.textContent = source;
  panelSourceEl.textContent = source;
  panelFetchEl.textContent = dateText;
  panelUpdateEl.textContent = dateText;
  panelAutoEl.textContent = `Aktif (${REFRESH_INTERVAL_SECONDS} sn)`;
}

async function refreshRates() {
  refreshButton.disabled = true;
  manualRefreshButton.disabled = true;
  refreshButton.textContent = "Yükleniyor";
  manualRefreshButton.textContent = "Güncelleniyor";

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
    const nowText = formatTime(result.updatedAt ? new Date(result.updatedAt) : new Date());
    lastUpdatedEl.textContent = nowText;
    updateStatusPanels(result.source, nowText);
    setLiveState("live");
    secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;
  } catch (error) {
    const cache = loadCache();
    if (cache?.rates) {
      renderRates(cache.rates);
      const cachedTime = formatTime(new Date(cache.updatedAt));
      lastUpdatedEl.textContent = cachedTime;
      updateStatusPanels(DEFAULT_SOURCE_NAME, cachedTime);
      setLiveState("cached");
    } else {
      renderRates(mapViewRates(LOCAL_SAMPLE_DATA));
      const fallbackTime = formatTime();
      lastUpdatedEl.textContent = fallbackTime;
      updateStatusPanels("Yerel örnek veri", fallbackTime);
      setLiveState("error");
    }
    console.error(error);
  } finally {
    refreshButton.disabled = false;
    manualRefreshButton.disabled = false;
    refreshButton.textContent = "Yenile";
    manualRefreshButton.textContent = "Fiyatları manuel güncelle";
  }
}

function switchScreen(target) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.classList.toggle("is-active", key === target);
  });
  navItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === target);
  });
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

function bindEvents() {
  refreshButton.addEventListener("click", () => {
    secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;
    void refreshRates();
  });

  manualRefreshButton.addEventListener("click", () => {
    secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;
    void refreshRates();
  });

  saveMarginsButton.addEventListener("click", async () => {
    saveMarginsButton.disabled = true;
    const payload = collectMarginSettings();
    await window.AKTAS_SYNC.write(payload);
    applySharedMargins(payload);
    renderMargins();
    setPanelNotice(`Kâr ayarları kaydedildi • ${formatTime(new Date(payload.updatedAt))}`);
    secondsUntilRefresh = REFRESH_INTERVAL_SECONDS;
    await refreshRates();
    saveMarginsButton.disabled = false;
  });

  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => switchScreen(button.dataset.screen));
  });
}

async function boot() {
  const sharedSettings = await window.AKTAS_SYNC.readOnce();
  applySharedMargins(sharedSettings);
  renderMargins();
  updateClock();
  refreshInEl.textContent = `${secondsUntilRefresh} sn`;
  setPanelNotice(
    window.AKTAS_SYNC.mode === "cloud"
      ? "Bulut senkronu aktif. Alış ve satış kâr ayarları diğer cihazlara gider."
      : "Şu an yerel mod açık."
  );

  const cache = loadCache();
  if (cache?.rates) {
    renderRates(cache.rates);
    const cachedTime = formatTime(new Date(cache.updatedAt));
    lastUpdatedEl.textContent = cachedTime;
    updateStatusPanels(DEFAULT_SOURCE_NAME, cachedTime);
    setLiveState("cached");
  } else {
    renderRates(mapViewRates(LOCAL_SAMPLE_DATA));
    const nowText = formatTime();
    lastUpdatedEl.textContent = nowText;
    updateStatusPanels("Canlı veri bekleniyor", nowText);
    setLiveState("error");
  }

  window.AKTAS_SYNC.subscribe((settings) => {
    applySharedMargins(settings);
    renderMargins();
    void refreshRates();
  });

  window.AKTAS_RATES.subscribe(() => {
    void refreshRates();
  });

  bindEvents();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  startCountdown();
  void refreshRates();
}

boot();


