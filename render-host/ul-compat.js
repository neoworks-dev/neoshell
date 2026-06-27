// Ultralight compatibility shim.
//
// Ultralight's JS engine omits some web-platform globals that modern frameworks
// reference unconditionally (e.g. Svelte 5's event delegation does
// `node instanceof HTMLMediaElement`). A bare reference to a missing global
// throws a ReferenceError during module evaluation and aborts the whole app
// mount. Defining harmless stubs makes those `instanceof` checks return false
// instead of throwing.
//
// Only stubs globals that are actually missing (guarded), so a future Ultralight
// that implements them is not clobbered. Load this as a classic script BEFORE the
// app bundle. In production the Go server injects it into index.html.
(function () {
  var missing = [
    "HTMLMediaElement",
    "HTMLVideoElement",
    "HTMLAudioElement",
    "MediaStream",
  ];
  for (var i = 0; i < missing.length; i++) {
    var name = missing[i];
    if (typeof window[name] === "undefined") {
      // A never-matched constructor: `x instanceof Stub` is always false.
      window[name] = function () {};
    }
  }
})();
