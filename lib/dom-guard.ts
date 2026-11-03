/**
 * Keeps React from crashing when something outside React has changed the page.
 *
 * Safari visitors hit "The object can not be found here." on /vacancies and
 * /industries (2026-11-02 and -03; Chrome words it "Failed to execute
 * 'insertBefore' on 'Node'"). React holds on to the DOM nodes it rendered. When
 * a browser feature or extension has moved or replaced one of them — page
 * translation, Safari's data detectors (off since #98), a password manager,
 * a content blocker — React's next `insertBefore` or `removeChild` aims at a
 * node that is no longer where it left it, the browser throws, and the visitor
 * gets the error page. The third crash came from a French Mac Safari with the
 * data detectors already off, and a browser test that translated every text
 * node and then filtered and navigated did not crash, so what changes the page
 * is not known. This guard does not need to know.
 *
 * It wraps the two calls before React loads (an inline script in <head>, see
 * app/layout.tsx). A call whose reference node is no longer a child of the
 * parent does the nearest right thing instead of throwing:
 *  - insertBefore: if the reference node was wrapped (still inside the parent,
 *    deeper down), insert before the wrapper; if it is gone, append.
 *  - removeChild: if the node was moved, remove it from where it is now; if it
 *    is already gone, there is nothing to remove.
 * The page may show a word out of place. It no longer shows a crash.
 *
 * Every absorbed call is noted in `window.__domGuard` (counts and node NAMES
 * only — never text) and handed to `window.__domGuardOnNote`, which
 * components/DomGuardReporter.tsx sets to count it in Vercel Analytics, and the
 * crash report's "Page state" includes it, so a report says whether the guard
 * was involved. Pattern from facebook/react#11538, where React's position is
 * that a page changed under it is the changer's bug, not React's.
 *
 * Written as plain ES5 in a string: it runs before any bundle, and a function's
 * compiled toString() is not something to depend on.
 */
export const DOM_GUARD_SCRIPT = `(function () {
  if (typeof Node !== 'function' || !Node.prototype || window.__domGuard) return;
  var guard = window.__domGuard = { count: 0, ops: [] };
  function note(op, parent, node) {
    guard.count++;
    if (guard.ops.length < 5) {
      guard.ops.push(op + ' ' + ((parent && parent.nodeName) || '?') + '>' + ((node && node.nodeName) || '?'));
    }
    try { if (typeof window.__domGuardOnNote === 'function') window.__domGuardOnNote(op); } catch (e) {}
  }
  var removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      note('removeChild', this, child);
      if (child.parentNode) return removeChild.call(child.parentNode, child);
      return child;
    }
    return removeChild.apply(this, arguments);
  };
  var insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (ref && ref.parentNode !== this) {
      note('insertBefore', this, ref);
      var at = ref;
      while (at && at.parentNode !== this) at = at.parentNode;
      return insertBefore.call(this, node, at || null);
    }
    return insertBefore.apply(this, arguments);
  };
})();`;

/** For the crash report: "" when the guard never had to step in. */
export function domGuardHint(): string {
  try {
    const g = (window as { __domGuard?: { count?: number; ops?: string[] } }).__domGuard;
    if (!g || !g.count) return '';
    return `dom guard: ${g.count} (${(g.ops || []).join(', ')})`;
  } catch {
    return '';
  }
}
