const SITE_REFRESH_INTERVAL_SECONDS = 20;
const SITE_STORAGE_KEY = "aktas-site-cache";
const SITE_DEFAULT_SOURCE_NAME = "Firebase Canlı Veri";

const SITE_PRODUCTS = [
  { key: "22", label: "22 Ayar", icon: "O", buyMargin: 0, sellMargin: 70 },
  { key: "GA", label: "24 Ayar", icon: "G", buyMargin: 0, sellMargin: 80 },
  { key: "C", label: "Çeyrek", icon: "◊", buyMargin: 0, sellMargin: 150 },
  { key: "Y", label: "Yarım", icon: "✶", buyMargin: 0, sellMargin: 250 },
  { key: "CMR", label: "Tek Lira", icon: "✶", buyMargin: 0, sellMargin: 400 },
  { key: "ATA", label: "Ata Lira", icon: "✶", buyMargin: 0, sellMargin: 500 },
  { key: "GR", label: "Gremse", icon: "O", buyMargin: 0, sellMargin: 1200 }
];


const lastUpdatedEl = document.querySelector("#lastUpdated");
const refreshInEl = document.querySelector("#refreshIn");
const connectionBadgeEl = document.querySelector("#connectionBadge");
const siteRatesTableEl = document.querySelector("#siteRatesTable");
const siteRateRowTemplate = document.querySelector("#siteRateRowTemplate");

let siteSecondsUntilRefresh = SITE_REFRESH_INTERVAL_SECONDS;

function formatSitePrice(value) {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function roundSitePrice(value) {
  return Math.round(value / 10) * 10;
}

function formatSiteTime(date = new Date()) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function parseSiteNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  if (value.includes(",")) return Number(value.replace(/\./g, "").replace(",", "."));
  return Number(value);
}

function applySiteMargins(settings) {
  const margins = settings?.margins ?? {};

  SITE_PRODUCTS.forEach((item) => {
    const saved = margins[item.key] ?? {};
    const buyMargin = Number(saved.buyMargin);
    const sellMargin = Number(saved.sellMargin);

    if (Number.isFinite(buyMargin)) item.buyMargin = roundSitePrice(buyMargin);
    if (Number.isFinite(sellMargin)) item.sellMargin = roundSitePrice(sellMargin);
  });
}

function saveSiteCache(rates) {
  localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify({
    rates,
    updatedAt: new Date().toISOString()
  }));
}

function loadSiteCache() {
  const raw = localStorage.getItem(SITE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeTrend(direction) {
  if (direction === "moneyDown" || direction === "down") return "Sabit";
  return "Yükseliyor";
}

function mapSitePayload(rawRates) {
  return SITE_PRODUCTS.map((item) => {
    const source = rawRates.find((rate) => rate.key === item.key);
    if (!source) {
      throw new Error(`Eksik veri: ${item.key}`);
    }

    const buySource = parseSiteNumber(source.buy);
    const sellSource = parseSiteNumber(source.sell);

    return {
      label: item.label,
      icon: item.icon,
      buy: roundSitePrice(buySource - item.buyMargin),
      sell: roundSitePrice((Number.isFinite(sellSource) ? sellSource : buySource) + item.sellMargin),
      trend: normalizeTrend(source.trend),
      change: source.change ?? "+0,00"
    };
  });
}

function renderSiteRates(rates) {
  siteRatesTableEl.innerHTML = "";

  rates.forEach((rate) => {
    const fragment = siteRateRowTemplate.content.cloneNode(true);
    fragment.querySelector(".rate-icon").textContent = rate.icon;
    fragment.querySelector(".rate-name").textContent = rate.label;
    fragment.querySelector(".rate-meta").textContent = rate.trend;
    fragment.querySelector(".rate-buy").textContent = formatSitePrice(rate.buy);
    fragment.querySelector(".rate-sell").textContent = formatSitePrice(rate.sell);
    fragment.querySelector(".rate-change").textContent = `%${String(rate.change).replace('+', '+')}`;
    siteRatesTableEl.appendChild(fragment);
  });
}

async function refreshSiteRates() {
  try {
    const sharedRates = await window.AKTAS_RATES.readOnce();
    if (!sharedRates?.rates?.length) {
      throw new Error("Canlı veri henüz hazır değil.");
    }

    const viewRates = mapSitePayload(sharedRates.rates);
    renderSiteRates(viewRates);
    saveSiteCache(viewRates);
    lastUpdatedEl.textContent = formatSiteTime(sharedRates.updatedAt ? new Date(sharedRates.updatedAt) : new Date());
    connectionBadgeEl.textContent = "Canlı";
    siteSecondsUntilRefresh = SITE_REFRESH_INTERVAL_SECONDS;
  } catch {
    const cache = loadSiteCache();
    if (cache?.rates) {
      renderSiteRates(cache.rates);
      lastUpdatedEl.textContent = formatSiteTime(new Date(cache.updatedAt));
      connectionBadgeEl.textContent = "Önbellek";
    } else {
      connectionBadgeEl.textContent = "Sorun";
    }
  }
}

function startSiteCountdown() {
  setInterval(() => {
    siteSecondsUntilRefresh -= 1;

    if (siteSecondsUntilRefresh <= 0) {
      siteSecondsUntilRefresh = SITE_REFRESH_INTERVAL_SECONDS;
      void refreshSiteRates();
    }

    refreshInEl.textContent = `${siteSecondsUntilRefresh} sn`;
  }, 1000);
}

async function bootSite() {
  refreshInEl.textContent = `${siteSecondsUntilRefresh} sn`;
  const sharedSettings = await window.AKTAS_SYNC.readOnce();
  applySiteMargins(sharedSettings);

  window.AKTAS_SYNC.subscribe((settings) => {
    applySiteMargins(settings);
    void refreshSiteRates();
  });

  window.AKTAS_RATES.subscribe(() => {
    void refreshSiteRates();
  });

  void refreshSiteRates();
  startSiteCountdown();
}

bootSite();
