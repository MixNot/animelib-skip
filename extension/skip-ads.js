(() => {
  "use strict";

  // AnimeLib catches a rejected AdLoader request and resumes the episode.
  // Do not alter account state, premium flags, videos, or other SDK modules.
  const wrappers = new WeakMap();
  const watched = new WeakMap();
  const isObject = value => value !== null &&
    (typeof value === "object" || typeof value === "function");
  const isWatchPage = () => /\/anime\/[^/]+\/watch\/?$/.test(location.pathname);

  function wrapLoadModule(value) {
    if (typeof value !== "function") return value;
    if (wrappers.has(value)) return wrappers.get(value);

    const wrapped = new Proxy(value, {
      apply(target, receiver, args) {
        if (args[0] === "AdLoader" && isWatchPage()) {
          return Promise.reject(new DOMException(
            "AnimeLib Skip: video ads disabled", "AbortError"
          ));
        }
        return Reflect.apply(target, receiver, args);
      }
    });
    wrappers.set(value, wrapped);
    wrappers.set(wrapped, wrapped);
    return wrapped;
  }

  function watch(object, key, transform) {
    if (!isObject(object)) return;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      let properties = watched.get(object);
      const existingGetter = properties?.get(key);
      if (existingGetter && descriptor?.get === existingGetter) {
        transform(object[key]);
        return;
      }
      // Leave SDK-owned accessors and immutable properties intact.
      if (descriptor && (!descriptor.configurable || descriptor.get ||
          descriptor.set || descriptor.writable === false)) {
        transform(object[key]);
        return;
      }
      let current = transform(object[key]);
      const getter = () => current;
      Object.defineProperty(object, key, {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get: getter,
        set(value) { current = transform(value); }
      });
      if (!properties) watched.set(object, properties = new Map());
      properties.set(key, getter);
    } catch {
      // A changed or sealed SDK must not prevent normal page loading.
    }
  }

  function instrumentVideoAd(value) {
    watch(value, "loadModule", wrapLoadModule);
    return value;
  }

  function instrumentYa(value) {
    watch(value, "videoAd", instrumentVideoAd);
    return value;
  }

  function refresh() {
    watch(window, "ya", instrumentYa);
  }

  refresh();
  // Repair hooks if an SDK redefines its properties. Also covers SPA navigation.
  setInterval(refresh, 500);
})();
