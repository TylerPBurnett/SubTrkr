/*
 * UI audit — paste into the DevTools console of a signed-in SubTrkr window.
 *
 *   await uiAudit()            // audit the view you are currently on
 *   await uiAudit({ tab: true })  // also walk focus with Tab (see note below)
 *
 * This is the harness that produced docs/plans/2026-08-11-ui-polish.md. It is
 * checked in so the plan's findings can be re-measured rather than re-argued;
 * a fix that does not move a number here is not a fix.
 *
 * ── Two traps this harness exists to avoid ────────────────────────────────
 *
 * 1. `.focus()` is not keyboard focus. Chromium only matches `:focus-visible`
 *    on a programmatically focused element if it is a text input. Focus a
 *    BUTTON from script and every focus-visible style silently fails to apply,
 *    which reads exactly like "this control has no focus indicator". An early
 *    version of this audit reported 35 of 35 controls broken for that reason.
 *    The real number was 1 of 18. Press Tab for real, or trust only inputs.
 *
 * 2. Transitions lie to getComputedStyle. Sampled too soon after focus, a ring
 *    reads as `rgba(0,0,0,0) 0px 0px 0px 0px inset` — a transparent zero-size
 *    shadow, indistinguishable from "the rule did not apply". The toolbar
 *    transitions over 200ms, so every style read here settles first.
 */
(function () {
  const SETTLE_MS = 400;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };

  // Deliberately-hidden live regions are 1x1 and clipped. They are not bugs;
  // an earlier run of this audit reported one as invisible text.
  const srOnly = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)' ||
      (r.width <= 1 && r.height <= 1 && cs.position === 'absolute');
  };

  const name = (el) =>
    (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();

  const row = (id, label, pass, detail) => ({ id, label, status: pass ? 'PASS' : 'FAIL', detail });

  async function uiAudit(opts = {}) {
    /*
      A collapsed or hidden window reports a 0x0 viewport, and then every
      geometric check below turns into confident nonsense: buttons measure 4px
      wide, elements sit "past the right edge" at x=16, the page reports 42px
      of overflow, and `srOnly` swallows real headings because everything is
      1x1. Every one of those was produced on a real run and none of them were
      true. Refuse to report rather than report garbage.
    */
    if (window.innerWidth < 320 || window.innerHeight < 320) {
      console.warn(`Viewport is ${window.innerWidth}x${window.innerHeight} — too small to measure. ` +
        'Restore the window and re-run; results would be artifacts.');
      return [];
    }

    const results = [];

    // ── Item 3: every input has an accessible name ────────────────────────
    const unnamed = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')]
      .filter(visible)
      .filter((el) => {
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
        if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
        return !el.closest('label');
      });
    results.push(row(3, 'inputs have accessible names', unnamed.length === 0,
      unnamed.map((e) => e.placeholder || e.id || e.tagName)));

    // ── Items 2 + 7: hit targets meet the WCAG 2.2 minimum of 24x24 ───────
    const small = [...document.querySelectorAll('button,a[href],input,select,[role="button"]')]
      .filter(visible)
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 24 || r.height < 24; });
    results.push(row('2+7', 'hit targets >= 24x24', small.length === 0,
      small.map((e) => `${name(e).slice(0, 24) || e.className} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)));

    // ── Item 5: anything marked invalid also says why ─────────────────────
    const invalid = [...document.querySelectorAll('[aria-invalid="true"]')].filter(visible);
    const undescribed = invalid.filter((el) => {
      const d = el.getAttribute('aria-describedby');
      return !d || !d.split(/\s+/).some((id) => document.getElementById(id));
    });
    results.push(row(5, 'invalid fields point at their message',
      invalid.length === 0 || undescribed.length === 0,
      invalid.length === 0 ? 'no invalid fields on screen (submit an empty form to exercise)'
        : undescribed.map((e) => e.id || name(e))));

    // ── Item 4: required fields say so, not just with a glyph ─────────────
    const starred = [...document.querySelectorAll('label')].filter(
      (l) => visible(l) && l.textContent.includes('*'));
    const required = document.querySelectorAll('[aria-required="true"],[required]').length;
    const namedRequired = [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /\(required\)/i.test(e.getAttribute('aria-label'))).length;
    results.push(row(4, 'starred fields marked required',
      starred.length === 0 || required + namedRequired >= starred.length,
      `${starred.length} starred label(s), ${required} aria-required, ${namedRequired} named "(required)"`));

    // ── Item 8: one h1, no skipped levels ────────────────────────────────
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible)
      .filter((h) => !srOnly(h));
    const levels = hs.map((h) => +h.tagName[1]);
    const skips = levels.filter((l, i) => i > 0 && l - levels[i - 1] > 1).length;
    results.push(row(8, 'exactly one h1, no level skips',
      levels.filter((l) => l === 1).length === 1 && skips === 0,
      `h1 count ${levels.filter((l) => l === 1).length}, skips ${skips}`));

    // ── Item 6: nothing overflows or clips ───────────────────────────────
    const de = document.documentElement;
    const clipped = [...document.querySelectorAll('body *')].filter((el) => {
      if (!visible(el) || el.children.length > 0 || srOnly(el)) return false;
      const cs = getComputedStyle(el);
      if (cs.overflow === 'visible' && cs.textOverflow !== 'ellipsis') return false;
      return el.scrollWidth > el.clientWidth + 2 && (el.textContent || '').trim().length > 0;
    });
    results.push(row(6, 'no horizontal overflow or clipped text',
      de.scrollWidth <= de.clientWidth + 1 && clipped.length === 0,
      `page overflow ${de.scrollWidth - de.clientWidth}px, ${clipped.length} clipped: ` +
      clipped.slice(0, 3).map((e) => `"${e.textContent.trim().slice(0, 22)}"`).join(', ')));

    // ── ARIA roles used outside a valid container ────────────────────────
    const bad = [];
    document.querySelectorAll('[role="gridcell"]').forEach((e) => { if (!e.closest('[role="row"]')) bad.push('gridcell outside row'); });
    document.querySelectorAll('[role^="menuitem"]').forEach((e) => { if (!e.closest('[role="menu"],[role="menubar"]')) bad.push('menuitem outside menu'); });
    document.querySelectorAll('[role="tab"]').forEach((e) => { if (!e.closest('[role="tablist"]')) bad.push('tab outside tablist'); });
    results.push(row('-', 'ARIA roles in valid containers', bad.length === 0, [...new Set(bad)]));

    // ── Item 1: the search toolbar shows keyboard focus ──────────────────
    // Inputs can be checked from script; buttons cannot (see trap 1 above),
    // so those are only measured when you opt into the Tab walk.
    const shell = document.querySelector('.search-shell');
    if (shell) {
      const input = shell.querySelector('input');
      if (input) {
        input.blur(); await wait(60); input.focus(); await wait(SETTLE_MS);
        const cs = getComputedStyle(input);
        const dead = cs.boxShadow === 'none' || /rgba\([^)]*,\s*0\)/.test(cs.boxShadow);
        results.push(row(1, 'search field shows focus', !dead, cs.boxShadow));
        input.blur();
      }
      if (opts.tab) {
        console.log('%cTab through the toolbar now — results log as you go.', 'font-weight:bold');
        document.addEventListener('focusin', function onFocus(ev) {
          const el = ev.target;
          if (!shell.contains(el)) return;
          setTimeout(() => {
            const cs = getComputedStyle(el);
            const lit = cs.boxShadow !== 'none' && !/rgba\([^)]*,\s*0\)/.test(cs.boxShadow);
            console.log(`${lit ? 'PASS' : 'FAIL'}  ${name(el).slice(0, 28) || el.tagName}  ${cs.boxShadow}`);
          }, SETTLE_MS);
        }, true);
      }
    }

    console.table(results.map((r) => ({ item: r.id, check: r.label, status: r.status })));
    const failed = results.filter((r) => r.status === 'FAIL');
    if (failed.length) console.log('Details:', failed.map((f) => ({ item: f.id, detail: f.detail })));
    else console.log('%cAll checks pass on this view.', 'color:#16a34a;font-weight:bold');
    return results;
  }

  window.uiAudit = uiAudit;
  console.log('uiAudit() ready. Run it on each view; contrast is covered by TASK-022, not here.');
})();
