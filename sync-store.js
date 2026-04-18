(function () {
  const SETTINGS_LOCAL_KEY = "aktas-kuyumculuk-settings";
  const SETTINGS_CLOUD_PATH = "aktasKuyumculuk/settings";
  const RATES_LOCAL_KEY = "aktas-kuyumculuk-live-rates";
  const RATES_CLOUD_PATH = "aktasKuyumculuk/liveRates";

  function hasFirebaseConfig(config) {
    return Boolean(
      config &&
      config.apiKey &&
      config.projectId &&
      config.appId &&
      config.databaseURL
    );
  }

  function readLocal(localKey) {
    const raw = localStorage.getItem(localKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeLocal(localKey, payload) {
    localStorage.setItem(localKey, JSON.stringify(payload));
  }

  function createLocalStore(localKey) {
    return {
      mode: "local",
      readOnce() {
        return Promise.resolve(readLocal(localKey));
      },
      async write(payload) {
        writeLocal(localKey, payload);
        return payload;
      },
      subscribe(callback) {
        const localValue = readLocal(localKey);
        if (localValue) callback(localValue);

        const onStorage = (event) => {
          if (event.key !== localKey) return;
          const nextValue = readLocal(localKey);
          if (nextValue) callback(nextValue);
        };

        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
      }
    };
  }

  function createFirebaseStore(config, localKey, cloudPath) {
    if (!window.firebase) {
      return createLocalStore(localKey);
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(config);
    }

    const db = window.firebase.database();
    const ref = db.ref(cloudPath);

    return {
      mode: "cloud",
      readOnce() {
        return ref.once("value").then((snapshot) => snapshot.val());
      },
      async write(payload) {
        await ref.set(payload);
        writeLocal(localKey, payload);
        return payload;
      },
      subscribe(callback) {
        ref.on("value", (snapshot) => {
          const value = snapshot.val();
          if (!value) return;
          writeLocal(localKey, value);
          callback(value);
        });

        return () => ref.off("value");
      }
    };
  }

  function buildStore(localKey, cloudPath) {
    const config = window.AKTAS_FIREBASE_CONFIG;
    return hasFirebaseConfig(config)
      ? createFirebaseStore(config, localKey, cloudPath)
      : createLocalStore(localKey);
  }

  const settingsStore = buildStore(SETTINGS_LOCAL_KEY, SETTINGS_CLOUD_PATH);
  const ratesStore = buildStore(RATES_LOCAL_KEY, RATES_CLOUD_PATH);

  window.AKTAS_SYNC = {
    mode: settingsStore.mode,
    readOnce: settingsStore.readOnce,
    write: settingsStore.write,
    subscribe: settingsStore.subscribe
  };

  window.AKTAS_RATES = {
    mode: ratesStore.mode,
    readOnce: ratesStore.readOnce,
    write: ratesStore.write,
    subscribe: ratesStore.subscribe
  };
})();
