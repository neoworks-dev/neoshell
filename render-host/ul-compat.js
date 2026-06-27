// Ultralight compatibility shim.
//
// Ultralight's JS engine omits some web-platform globals that modern frameworks
// reference unconditionally (e.g. Svelte 5's event delegation does
// `node instanceof HTMLMediaElement`). A bare reference to a missing global
// throws a ReferenceError during module evaluation and aborts the whole app
// mount. Defining harmless stubs makes those `instanceof` checks return false
// instead of throwing.
//
// Ultralight also reports itself as a touch device: `(hover: hover)` and
// `(pointer: fine)` evaluate false. Frameworks gate hover styles behind
// `@media (hover: hover)` (Tailwind's `hover:` variant does this), so on a
// desktop shell with a real mouse all hover styling silently disappears. We
// force those interaction media queries to match.
//
// Load this as a classic script BEFORE the app bundle. In production the Go
// server injects it into index.html.
(function () {
  // 1. Stub missing web-platform globals (guarded — only if undefined).
  var missing = ["HTMLMediaElement", "HTMLVideoElement", "HTMLAudioElement", "MediaStream"];
  for (var i = 0; i < missing.length; i++) {
    if (typeof window[missing[i]] === "undefined") {
      window[missing[i]] = function () {};
    }
  }

  // 2. Report desktop interaction capabilities to JS feature checks.
  var interactionQuery = /(any-)?hover\s*:\s*hover|(any-)?pointer\s*:\s*fine/;
  if (window.matchMedia) {
    var originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = function (query) {
      if (interactionQuery.test(query)) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addEventListener: function () {},
          removeEventListener: function () {},
          addListener: function () {},
          removeListener: function () {},
          dispatchEvent: function () { return false; },
        };
      }
      return originalMatchMedia(query);
    };
  }

  // 3. Neutralize @media conditions that gate styles on hover/pointer support,
  //    so hover styling applies. Same-origin stylesheets only (cssRules throws
  //    cross-origin). Re-run as stylesheets load/inject.
  function ungateHoverMedia() {
    var sheets = document.styleSheets;
    for (var s = 0; s < sheets.length; s++) {
      var rules;
      try {
        rules = sheets[s].cssRules;
      } catch (e) {
        continue;
      }
      if (!rules) continue;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        if (rule.media && interactionQuery.test(rule.media.mediaText)) {
          try {
            rule.media.mediaText = "all";
          } catch (e) {}
        }
      }
    }
  }

  function schedule() {
    try {
      ungateHoverMedia();
    } catch (e) {}
  }
  document.addEventListener("DOMContentLoaded", schedule);
  window.addEventListener("load", schedule);
  // Catch stylesheets injected after load (frameworks add <style>/<link>).
  setTimeout(schedule, 300);
  setTimeout(schedule, 1500);
})();
