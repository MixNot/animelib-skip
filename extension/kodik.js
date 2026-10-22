(() => {
  "use strict";

  // This permission is for Kodik frames embedded by AnimeLib only.
  if (window.top === window) return;
  const fromAnimeLib = value => {
    try { return new URL(value).hostname === "animelib.org"; }
    catch { return false; }
  };
  if (!Array.from(location.ancestorOrigins || []).some(fromAnimeLib) &&
      !fromAnimeLib(document.referrer)) return;

  const wrappers = new WeakMap();
  let getter;

  function cleanSettings(settings) {
    if (!settings || typeof settings !== "object") return settings;
    return { ...settings, vast: [], reserve_vast: [], mini_banner: false };
  }

  function wrapPlayer(Player) {
    if (typeof Player !== "function") return Player;
    if (wrappers.has(Player)) return wrappers.get(Player);
    const Wrapped = new Proxy(Player, {
      construct(target, args, newTarget) {
        const next = [...args];
        next[1] = cleanSettings(next[1]);
        const instance = Reflect.construct(target, next, newTarget);
        if (typeof instance.update === "function") {
          const update = instance.update;
          instance.update = function (settings, ...rest) {
            return Reflect.apply(update, this, [cleanSettings(settings), ...rest]);
          };
        }
        return instance;
      }
    });
    wrappers.set(Player, Wrapped);
    wrappers.set(Wrapped, Wrapped);
    return Wrapped;
  }

  function refresh() {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, "Player");
      if (getter && descriptor?.get === getter) return;
      if (descriptor && !descriptor.configurable) {
        if (descriptor.writable) window.Player = wrapPlayer(window.Player);
        return;
      }
      if (descriptor?.get || descriptor?.set) return;
      let current = wrapPlayer(window.Player);
      getter = () => current;
      Object.defineProperty(window, "Player", {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get: getter,
        set(value) { current = wrapPlayer(value); }
      });
    } catch {
      // Leave normal playback intact if the provider changes its API.
    }
  }

  // Kodik's optional ad script is separate from the episode and player code.
  try {
    if (!Object.getOwnPropertyDescriptor(window, "advertScript")) {
      Object.defineProperty(window, "advertScript", {
        configurable: true,
        enumerable: true,
        get: () => null,
        set() {}
      });
    }
  } catch {}

  refresh();
  setInterval(refresh, 500);
})();
