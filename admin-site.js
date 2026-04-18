const ADMIN_REFRESH_INTERVAL_SECONDS = 20;
const ADMIN_STORAGE_KEY = "aktas-admin-cache";
const ADMIN_DEFAULT_SOURCE_NAME = "Firebase Canli Veri";

const ADMIN_PRODUCTS = [
  { key: "22", label: "22 Ayar", buyMargin: 0, sellMargin: 70 },
  { key: "GA", label: "24 Ayar", buyMargin: 0, sellMargin: 80 },
  { key: "C", label: "Ceyrek", buyMargin: 0, sellMargin: 150 },
  { key: "Y", label: "Yarim", buyMargin: 0, sellMargin: 250 },
  { key: "CMR", label: "Tek Lira", buyMargin: 0, sellMargin: 400 },
  { key: "ATA", label: "Ata Lira", buyMargin: 0, sellMargin: 500 },
  { key: "GR", label: "Gremse", buyMargin: 0, sellMargin: 1200 }
];

const ADMIN_SAMPLE_DATA = [
  { key: "22", label: "22 Ayar", buy: 6280, sell: 6490, trend: "Yukseliyor", change: "+0,14" },
  { key: "GA", label: "24 Ayar", buy: 6900, sell: 6980, trend: "Yukseliyor", change: "+0,17" },
  { key: "C", label: "Ceyrek", buy: 11180, sell: 11510, trend: "Yukseliyor", change: "+0,14" },
  { key: "Y", label: "Yarim", buy: 22370, sell: 23000, trend: "Yukseliyor", change: "+0,14" },
  { key: "CMR", label: "Tek Lira", buy: 45630, sell: 46800, trend: "Yukseliyor", change: "+0,14" },
  { key: "ATA", label: "Ata Lira", buy: 45630, sell: 46900, trend: "Yukseliyor", change: "+0,14" },
  { key: "GR", label: "Gremse", buy: 110790, sell: 114090, trend: "Yukseliyor", change: "+0,14" }
];

const lastUpdatedEl = document.querySelector("#lastUpdated");
const refreshInEl = document.querySelector("#refreshIn");
const connectionBadgeEl = document.querySelector("#connectionBadge");
const sourceLabelEl = document.querySelector("#sourceLabel");
const syncModeEl = document.querySelector("#syncMode");
const panelNoticeEl = document.querySelector("#panelNotice");
const ratesTableEl = document.querySelector("#ratesTable");
const marginGridEl = document.querySelector("#marginGrid");
const saveMarginsButton = document.querySelector("#saveMarginsButton");
const manualRefreshButton = document.querySelector("#manualRefreshButton");
const adminRateRowTemplate = document.querySelector("#adminRateRowTemplate");
const adminMarginTemplate = document.querySelector("#adminMarginTemplate");

let adminSecondsUntilRefresh = ADMIN_REFRESH_INTERVAL_SECONDS;

function formatAdminPrice(value) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function roundAdminPrice(value) {
  return Math.round(value / 10) * 10;
}

function formatAdminTime(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function parseAdminNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  if (value.includes(",")) return Number(value.replace(/\./g, "").replace(",", "."));
  return Number(value);
}

function normalizeAdminTrend(direction) {
  if (direction === "moneyDown" || direction === "down") return "Sabit";
  return "Yukseliyor";
}

function saveAdminCache(rates, source = ADMIN_DEFAULT_SOURCE_NAME, updatedAt = new Date().toISOString()) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ rates, source, updatedAt }));
}

function loadAdminCache() {
  const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function applyAdminMargins(settings) {
  const margins = settings?.margins ?? {};

  ADMIN_PRODUCTS.forEach((item) => {
    const saved = margins[item.key] ?? {};
    const buyMargin = Number(saved.buyMargin);
    const sellMargin = Number(saved.sellMargin);

    if (Number.isFinite(buyMargin)) item.buyMargin = roundAdminPrice(buyMargin);
    if (Number.isFinite(sellMargin)) item.sellMargin = roundAdminPrice(sellMargin);
  });
}

function collectAdminMargins() {
  const margins = {};

  marginGridEl.querySelectorAll(".margin-card").forEach((card) => {
    const key = card.dataset.key;
    const buyMargin = roundAdminPrice(Number(card.querySelector(".margin-buy-input").value) || 0);
    const sellMargin = roundAdminPrice(Number(card.querySelector(".margin-sell-input").value) || 0);
    margins[key] = { buyMargin, sellMargin };
  });

  return {
    margins,
    updatedAt: new Date().toISOString()
  };
}

function renderAdminMargins() {
  marginGridEl.innerHTML = "";

  ADMIN_PRODUCTS.forEach((item) => {
    const fragment = adminMarginTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".margin-card");
    card.dataset.key = item.key;
    fragment.querySelector(".margin-title").textContent = item.label;
    fragment.querySelector(".margin-code").textContent = item.key;
    fragment.querySelector(".margin-buy-input").value = item.buyMargin;
    fragment.querySelector(".margin-sell-input").value = item.sellMargin;
    marginGridEl.appendChild(fragment);
  });
}

function renderAdminRates(rates) {
  ratesTableEl.innerHTML = "";

  rates.forEach((rate) => {
    const fragment = adminRateRowTemplate.content.cloneNode(true);
    fragment.querySelector(".rate-name").textContent = rate.label;
    fragment.querySelector(".rate-meta").textContent = rate.trend;
    fragment.querySelector(".rate-buy").textContent = formatAdminPrice(rate.buy);
    fragment.querySelector(".rate-sell").textContent = formatAdminPrice(rate.sell);
    fragment.querySelector(".rate-change").textContent = `%${rate.change}`;
    ratesTableEl.appendChild(fragment);
  });
}

function mapAdminRates(rawRates) {
  return ADMIN_PRODUCTS.map((item) => {
    const source = rawRates.find((rate) => rate.key === item.key);
    if (!source) {
      throw new Error(`Eksik veri: ${item.key}`);
    }

    const buySource = parseAdminNumber(source.buy);
    const sellSource = parseAdminNumber(source.sell);

    return {
      key: item.key,
      label: item.label,
      buy: roundAdminPrice(buySource - item.buyMargin),
      sell: roundAdminPrice((Number.isFinite(sellSource) ? sellSource : buySource) + item.sellMargin),
      trend: normalizeAdminTrend(source.trend),
      change: source.change ?? "+0,00"
    };
  });
}

async function refreshAdminRates() {
  manualRefreshButton.disabled = true;
  manualRefreshButton.textContent = "Yukleniyor";

  try {
    const sharedRates = await window.AKTAS_RATES.readOnce();
    if (!sharedRates?.rates?.length) {
      throw new Error("Canli veri henuz hazir degil.");
    }

    const rates = mapAdminRates(sharedRates.rates);
    renderAdminRates(rates);
    saveAdminCache(
      rates,
      sharedRates.source || ADMIN_DEFAULT_SOURCE_NAME,
      sharedRates.updatedAt || new Date().toISOString()
    );
    lastUpdatedEl.textContent = formatAdminTime(sharedRates.updatedAt ? new Date(sharedRates.updatedAt) : new Date());
    connectionBadgeEl.textContent = "Canli";
    sourceLabelEl.textContent = sharedRates.source || ADMIN_DEFAULT_SOURCE_NAME;
    panelNoticeEl.textContent = "Canli fiyat verisi Firebase uzerinden geliyor.";
    adminSecondsUntilRefresh = ADMIN_REFRESH_INTERVAL_SECONDS;
  } catch (error) {
    const cache = loadAdminCache();
    if (cache?.rates) {
      renderAdminRates(cache.rates);
      lastUpdatedEl.textContent = formatAdminTime(new Date(cache.updatedAt));
      connectionBadgeEl.textContent = "Onbellek";
      sourceLabelEl.textContent = cache.source || ADMIN_DEFAULT_SOURCE_NAME;
      panelNoticeEl.textContent = "Canli veri alinamadi. Son kayitli veri gosteriliyor.";
    } else {
      renderAdminRates(ADMIN_SAMPLE_DATA);
      lastUpdatedEl.textContent = formatAdminTime();
      connectionBadgeEl.textContent = "Sorun";
      sourceLabelEl.textContent = "Ornek veri";
      panelNoticeEl.textContent = "Merkezi canli veri henuz gelmedi. Gecici ornek veri gosteriliyor.";
    }
    console.error(error);
  } finally {
    manualRefreshButton.disabled = false;
    manualRefreshButton.textContent = "Fiyatlari Yenile";
  }
}

function startAdminCountdown() {
  setInterval(() => {
    adminSecondsUntilRefresh -= 1;
    if (adminSecondsUntilRefresh <= 0) {
      adminSecondsUntilRefresh = ADMIN_REFRESH_INTERVAL_SECONDS;
      void refreshAdminRates();
    }
    refreshInEl.textContent = `${adminSecondsUntilRefresh} sn`;
  }, 1000);
}

function bindAdminEvents() {
  manualRefreshButton.addEventListener("click", () => {
    adminSecondsUntilRefresh = ADMIN_REFRESH_INTERVAL_SECONDS;
    void refreshAdminRates();
  });

  saveMarginsButton.addEventListener("click", async () => {
    saveMarginsButton.disabled = true;
    const payload = collectAdminMargins();
    await window.AKTAS_SYNC.write(payload);
    applyAdminMargins(payload);
    renderAdminMargins();
    panelNoticeEl.textContent = `Kar ayarlari kaydedildi • ${formatAdminTime(new Date(payload.updatedAt))}`;
    await refreshAdminRates();
    saveMarginsButton.disabled = false;
  });
}

async function bootAdminPanel() {
  const sharedSettings = await window.AKTAS_SYNC.readOnce();
  applyAdminMargins(sharedSettings);
  renderAdminMargins();
  refreshInEl.textContent = `${adminSecondsUntilRefresh} sn`;
  syncModeEl.textContent = window.AKTAS_SYNC.mode === "cloud" ? "Bulut Aktif" : "Yerel Mod";
  panelNoticeEl.textContent = "Kaydettigin kar ayarlari musteri ekranina canli gider.";

  window.AKTAS_SYNC.subscribe((settings) => {
    applyAdminMargins(settings);
    renderAdminMargins();
    void refreshAdminRates();
  });

  window.AKTAS_RATES.subscribe(() => {
    void refreshAdminRates();
  });

  bindAdminEvents();
  void refreshAdminRates();
  startAdminCountdown();
}

bootAdminPanel();
