const DEBUG_LOG = [];

export function dbgLog(msg) {
  const line = '[' + (performance.now() | 0) + 'ms] ' + msg;
  DEBUG_LOG.push(line);
  if (DEBUG_LOG.length > 40) DEBUG_LOG.shift();
  console.log('[SoSF] ' + msg);
  const p = document.getElementById('dbgPanel');
  if (p) p.textContent = DEBUG_LOG.slice(-18).join('\n');
}

export function showCrash(where, err) {
  let box = document.getElementById('crashBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'crashBox';
    box.style.cssText =
      'position:fixed;left:0;right:0;top:0;z-index:99999;background:#300;color:#fff;font:13px/1.4 monospace;padding:12px;white-space:pre-wrap;max-height:60vh;overflow:auto;border-bottom:3px solid #f44;';
    document.body.appendChild(box);
  }
  const stack = err && err.stack ? err.stack : String(err);
  box.textContent =
    '[!] CRASH (' + where + ')\n' +
    (err && err.message ? err.message : err) +
    '\n\n' +
    stack +
    '\n\n----- DERNIERS ÉVÉNEMENTS -----\n' +
    DEBUG_LOG.slice(-20).join('\n');
}

export function initDebugPanel() {
  window.addEventListener('error', (e) => {
    showCrash('window.onerror', e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    showCrash('promise', e.reason);
  });
  window.addEventListener('DOMContentLoaded', () => {
    const p = document.createElement('pre');
    p.id = 'dbgPanel';
    p.style.cssText =
      'position:fixed;left:4px;bottom:4px;z-index:9998;background:rgba(0,0,0,.7);color:#7fff7f;font:11px/1.3 monospace;padding:6px;max-width:46vw;max-height:40vh;overflow:auto;display:none;pointer-events:none;border:1px solid #2a2;';
    document.body.appendChild(p);
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'd' || ev.key === 'D') {
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
      }
    });
  });
}
