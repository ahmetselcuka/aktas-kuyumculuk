const FIREBASE_DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL || "https://aktas-kuyumculuk-default-rtdb.firebaseio.com";
const FIREBASE_LIVE_RATES_PATH =
  process.env.FIREBASE_LIVE_RATES_PATH || "aktasKuyumculuk/liveRates.json";
const PRIMARY_SOURCE_NAME = process.env.PRIMARY_SOURCE_NAME || "GenelPara API";
const BACKUP_SOURCE_NAME = process.env.BACKUP_SOURCE_NAME || "Gold API + fxapi.app";
const FETCH_INTERVAL_MS = Number(process.env.FETCH_INTERVAL_MS || 20_000);
const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS || 10_000);
const TROY_OUNCE_TO_GRAMS = 31.1034768;

const PRODUCTS = [
  { key: "22", label: "22 Ayar" },
  { key: "GA", label: "24 Ayar" },
  { key: "C", label: "Ceyrek" },
  { key: "Y", label: "Yarim" },
  { key: "CMR", label: "Tek Lira" },
  { key: "ATA", label: "Ata Lira" },
  { key: "GR", label: "Gremse" }
];

const FALLBACK_PRODUCT_RULES = {
  "22": { type: "karat", multiplier: 22 / 24 },
  GA: { type: "spot", multiplier: 1 },
  C: { type: "ratio", ratioKey: "C" },
  Y: { type: "ratio", ratioKey: "Y" },
  CMR: { type: "ratio", ratioKey: "CMR" },
  ATA: { type: "ratio", ratioKey: "ATA" },
  GR: { type: "ratio", ratioKey: "GR" }
};

const DEFAULT_REFERENCE_RATES = {
  "22": { buy: 6280, sell: 6490 },
  GA: { buy: 6900, sell: 6980 },
  C: { buy: 11180, sell: 11510 },
  Y: { buy: 22370, sell: 23000 },
  CMR: { buy: 45630, sell: 46800 },
  ATA: { buy: 45630, sell: 46900 },
  GR: { buy: 110790, sell: 114090 }
};

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  if (value.includes(",")) return Number(value.replace(/\./g, "").replace(",", "."));
  return Number(value);
}

function normalizeTrend(direction) {
  if (direction === "moneyDown" || direction === "down") return "down";
  if (direction === "moneyUp" || direction === "up") return "up";
  return "flat";
}

function buildApiUrl() {
  const params = new URLSearchParams({
    list: "altin",
    sembol: PRODUCTS.map((item) => item.key).join(",")
  });

  return `https://api.genelpara.com/json/?${params.toString()}`;
}

function buildFirebaseUrl() {
  return `${FIREBASE_DATABASE_URL}/${FIREBASE_LIVE_RATES_PATH}`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapPayload(payload) {
  if (payload?.success === false) {
    throw new Error(payload.error || "GenelPara istegi basarisiz.");
  }

  const data = payload?.data ?? {};
  const rates = PRODUCTS.map((item) => {
    const source = data[item.key];
    if (!source) {
      throw new Error(`Eksik veri: ${item.key}`);
    }

    return {
      key: item.key,
      label: item.label,
      buy: parseNumber(source.alis),
      sell: parseNumber(source.satis),
      trend: normalizeTrend(source.yon),
      change: source.degisim ?? source.oran ?? "+0,00"
    };
  });

  return {
    source: PRIMARY_SOURCE_NAME,
    updatedAt: new Date().toISOString(),
    rates
  };
}

function roundToNearestTen(value) {
  return Math.round(value / 10) * 10;
}

function indexRates(rates) {
  return Object.fromEntries(rates.map((rate) => [rate.key, rate]));
}

async function readExistingFirebasePayload() {
  try {
    const response = await fetch(buildFirebaseUrl(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function buildReferenceMetrics(referencePayload) {
  const indexed = indexRates(referencePayload?.rates?.length ? referencePayload.rates : PRODUCTS.map((item) => ({
    key: item.key,
    ...DEFAULT_REFERENCE_RATES[item.key],
    trend: "flat",
    change: "+0,00"
  })));

  const ga = indexed.GA ?? DEFAULT_REFERENCE_RATES.GA;

  return {
    buyRatios: {
      C: (indexed.C?.buy ?? DEFAULT_REFERENCE_RATES.C.buy) / ga.buy,
      Y: (indexed.Y?.buy ?? DEFAULT_REFERENCE_RATES.Y.buy) / ga.buy,
      CMR: (indexed.CMR?.buy ?? DEFAULT_REFERENCE_RATES.CMR.buy) / ga.buy,
      ATA: (indexed.ATA?.buy ?? DEFAULT_REFERENCE_RATES.ATA.buy) / ga.buy,
      GR: (indexed.GR?.buy ?? DEFAULT_REFERENCE_RATES.GR.buy) / ga.buy
    },
    sellRatios: {
      C: (indexed.C?.sell ?? DEFAULT_REFERENCE_RATES.C.sell) / ga.sell,
      Y: (indexed.Y?.sell ?? DEFAULT_REFERENCE_RATES.Y.sell) / ga.sell,
      CMR: (indexed.CMR?.sell ?? DEFAULT_REFERENCE_RATES.CMR.sell) / ga.sell,
      ATA: (indexed.ATA?.sell ?? DEFAULT_REFERENCE_RATES.ATA.sell) / ga.sell,
      GR: (indexed.GR?.sell ?? DEFAULT_REFERENCE_RATES.GR.sell) / ga.sell
    },
    spreads: {
      "22": (indexed["22"]?.sell ?? DEFAULT_REFERENCE_RATES["22"].sell) - (indexed["22"]?.buy ?? DEFAULT_REFERENCE_RATES["22"].buy),
      GA: (indexed.GA?.sell ?? DEFAULT_REFERENCE_RATES.GA.sell) - (indexed.GA?.buy ?? DEFAULT_REFERENCE_RATES.GA.buy)
    }
  };
}

async function fetchBackupPayload() {
  const [goldData, usdTryData, referencePayload] = await Promise.all([
    fetchJson("https://api.gold-api.com/price/XAU"),
    fetchJson("https://fxapi.app/api/USD/TRY.json"),
    readExistingFirebasePayload()
  ]);

  const ounceUsd = parseNumber(goldData.price);
  const usdTry = parseNumber(usdTryData.rate);

  if (!Number.isFinite(ounceUsd) || !Number.isFinite(usdTry)) {
    throw new Error("Yedek kaynaklardan gecersiz fiyat geldi.");
  }

  const gramTry = (ounceUsd * usdTry) / TROY_OUNCE_TO_GRAMS;
  const metrics = buildReferenceMetrics(referencePayload);

  const rates = PRODUCTS.map((item) => {
    const rule = FALLBACK_PRODUCT_RULES[item.key];
    let buy;
    let sell;

    if (rule.type === "spot") {
      buy = gramTry;
      sell = gramTry + metrics.spreads.GA;
    } else if (rule.type === "karat") {
      buy = gramTry * rule.multiplier;
      sell = buy + metrics.spreads["22"];
    } else {
      buy = gramTry * metrics.buyRatios[rule.ratioKey];
      sell = gramTry * metrics.sellRatios[rule.ratioKey];
    }

    return {
      key: item.key,
      label: item.label,
      buy: roundToNearestTen(buy),
      sell: roundToNearestTen(sell),
      trend: "up",
      change: "+0,00"
    };
  });

  return {
    source: BACKUP_SOURCE_NAME,
    updatedAt: new Date().toISOString(),
    note: "22 Ayar ve diger urunler Gold API spot fiyati uzerinden son basarili GenelPara oranlariyla turetildi.",
    rates
  };
}

async function writeToFirebase(payload) {
  const response = await fetch(`${FIREBASE_DATABASE_URL}/${FIREBASE_LIVE_RATES_PATH}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firebase yazma hatasi: ${response.status} ${body}`);
  }
}

async function runOnce() {
  let payload;

  try {
    payload = await fetchJson(buildApiUrl()).then(mapPayload);
  } catch (primaryError) {
    console.error("GenelPara kullanilamadi, yedek kaynaga geciliyor:", primaryError.message);
    payload = await fetchBackupPayload();
  }

  await writeToFirebase(payload);

  const stamp = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(payload.updatedAt));

  console.log(`[${stamp}] ${payload.rates.length} urun Firebase'e yazildi. Kaynak: ${payload.source}`);
}

async function runWatch() {
  let active = false;

  const tick = async () => {
    if (active) return;
    active = true;

    try {
      await runOnce();
    } catch (error) {
      console.error("Canli veri guncellenemedi:", error.message);
    } finally {
      active = false;
    }
  };

  await tick();
  setInterval(tick, FETCH_INTERVAL_MS);
}

if (process.argv.includes("--watch")) {
  await runWatch();
} else {
  await runOnce();
}
