
/* MAT Tool Hidden Launcher - V1.0 */
(function () {
  'use strict';

  var MATRIX_ORIGIN = 'https://matrix.skybagegypt.com';
  var BRIDGE_ORIGIN = 'https://adelabdelrahman.github.io';
  var FIREBASE_ORIGIN = 'https://matrix-tool-admin-default-rtdb.firebaseio.com';
  var REPO_CDN = 'https://cdn.jsdelivr.net/gh/adelabdelrahman/matrix-tool@main';

  if (location.origin !== MATRIX_ORIGIN) {
    alert('MAT Tool can only be launched from Matrix.');
    return;
  }

  if (window.__MAT_HIDDEN_BRIDGE_ACTIVE) {
    alert('MAT Tool Hidden Bridge is already active.');
    return;
  }

  var originalFetch = window.fetch.bind(window);
  var pending = new Map();
  var requestCounter = 0;
  var bridgeReady = false;
  var bridgeFrame = document.createElement('iframe');
  var requestListener = null;
  var readyTimeout = null;

  bridgeFrame.id = '__mat_hidden_bridge_frame';
  bridgeFrame.title = 'MAT Tool background connection';
  bridgeFrame.setAttribute('aria-hidden', 'true');
  bridgeFrame.tabIndex = -1;
  bridgeFrame.style.cssText = [
    'position:fixed!important',
    'left:-10000px!important',
    'top:-10000px!important',
    'width:1px!important',
    'height:1px!important',
    'opacity:0!important',
    'pointer-events:none!important',
    'border:0!important',
    'visibility:hidden!important'
  ].join(';');

  function bridgedFetch(input, init) {
    var options = init || {};
    var request = (
      typeof Request !== 'undefined' &&
      input instanceof Request
    ) ? input : null;

    var url;

    try {
      var rawUrl = (
        typeof input === 'string' ||
        input instanceof URL
      ) ? String(input) : (input && input.url);

      url = new URL(rawUrl, location.href);
    } catch (_) {
      return originalFetch(input, init);
    }

    if (url.origin !== FIREBASE_ORIGIN) {
      return originalFetch(input, init);
    }

    var method = String(
      options.method || (request && request.method) || 'GET'
    ).toUpperCase();

    var sourceHeaders =
      options.headers || (request && request.headers) || undefined;

    var headers = new Headers(sourceHeaders);
    var forwardedHeaders = {};
    var contentType = headers.get('content-type');

    if (contentType) {
      forwardedHeaders['Content-Type'] = contentType;
    }

    var sendBody = async function () {
      if (method === 'GET' || method === 'HEAD') return null;

      var raw = options.body !== undefined
        ? options.body
        : (request ? await request.clone().text() : null);

      if (raw == null) return null;
      if (typeof raw === 'string') return raw;
      if (raw instanceof URLSearchParams) return raw.toString();
      if (raw instanceof Blob) return await raw.text();

      throw new TypeError('MAT Bridge supports text/JSON request bodies only.');
    };

    if (options.signal && options.signal.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    return sendBody().then(function (body) {
      return new Promise(function (resolve, reject) {
        var id = 'mat-' + Date.now() + '-' + (++requestCounter);

        var timer = setTimeout(function () {
          var item = pending.get(id);
          if (!item) return;
          pending.delete(id);
          item.reject(new TypeError('MAT Bridge timed out'));
        }, 25000);

        var abortHandler = function () {
          var item = pending.get(id);
          if (!item) return;
          pending.delete(id);
          clearTimeout(item.timer);
          item.reject(new DOMException('Aborted', 'AbortError'));
        };

        if (options.signal) {
          options.signal.addEventListener('abort', abortHandler, { once: true });
        }

        pending.set(id, {
          timer: timer,
          resolve: function (response) {
            if (options.signal) {
              options.signal.removeEventListener('abort', abortHandler);
            }
            resolve(response);
          },
          reject: function (error) {
            if (options.signal) {
              options.signal.removeEventListener('abort', abortHandler);
            }
            reject(error);
          }
        });

        try {
          bridgeFrame.contentWindow.postMessage({
            type: 'MAT_BRIDGE_REQUEST',
            id: id,
            url: url.href,
            method: method,
            headers: forwardedHeaders,
            body: body
          }, BRIDGE_ORIGIN);
        } catch (error) {
          pending.delete(id);
          clearTimeout(timer);
          if (options.signal) {
            options.signal.removeEventListener('abort', abortHandler);
          }
          reject(error);
        }
      });
    });
  }

  function cleanup(reason) {
    if (requestListener) {
      window.removeEventListener('message', requestListener);
      requestListener = null;
    }

    if (readyTimeout) {
      clearTimeout(readyTimeout);
      readyTimeout = null;
    }

    pending.forEach(function (item) {
      clearTimeout(item.timer);
      item.reject(new Error(reason || 'MAT Bridge stopped'));
    });

    pending.clear();

    if (window.fetch === bridgedFetch) {
      window.fetch = originalFetch;
    }

    try {
      var enhancer = window.__MAT_POD_DATE_ENHANCER_V1__;
      if (enhancer && typeof enhancer.restore === 'function') {
        enhancer.restore();
      }
    } catch (_) {}

    bridgeFrame.remove();
    window.__MAT_HIDDEN_BRIDGE_ACTIVE = false;

    try {
      delete window.__MAT_HIDDEN_BRIDGE;
    } catch (_) {}
  }

  /* ===================================
     MANAGE POD DATE ENHANCER
  =================================== */

  function installManagePodEnhancer() {
    var MARKER = '__MAT_POD_DATE_ENHANCER_V1__';

    if (window[MARKER]) return;

    var parentBridgeFetch = window.fetch.bind(window);
    var nativeOpen = window.open.bind(window);
    var installedCount = 0;

    function isManagePodWindow(child) {
      try {
        return !!child &&
          !child.closed &&
          child.location.origin === window.location.origin &&
          /AdminPOD_Manage/i.test(child.location.pathname);
      } catch (_) {
        return false;
      }
    }

    function installChildFetch(child) {
      try {
        if (child.__MAT_POD_BRIDGE_FETCH_PARENT === window) {
          return true;
        }

        var childNativeFetch = child.fetch.bind(child);

        child.fetch = function (input, init) {
          var url;

          try {
            var rawUrl = (
              typeof input === 'string' ||
              input instanceof URL
            ) ? String(input) : (input && input.url);

            url = new URL(rawUrl, child.location.href);
          } catch (_) {
            return childNativeFetch(input, init);
          }

          if (url.origin === FIREBASE_ORIGIN) {
            return parentBridgeFetch(input, init);
          }

          return childNativeFetch(input, init);
        };

        child.__MAT_POD_BRIDGE_FETCH_PARENT = window;
        installedCount++;

        console.info(
          '[MAT POD] Firebase permission checks routed through Hidden Bridge.'
        );

        return true;

      } catch (error) {
        console.warn('[MAT POD] Child relay error:', error);
        return false;
      }
    }

    function enlargeAndStylePanel(child) {
      try {
        var host = child.document.getElementById(
          'pod-date-autopilot-resizable-v15-host'
        );

        if (!host) return false;

        if (!host.__MAT_POD_LARGE_DRAGGABLE_V1__) {
          var availableWidth = Math.max(260, child.innerWidth - 28);
          var availableHeight = Math.max(500, child.innerHeight - 28);

          host.style.width = Math.min(560, availableWidth) + 'px';
          host.style.height = Math.min(820, availableHeight) + 'px';

          host.style.maxWidth = 'calc(100vw - 28px)';
          host.style.maxHeight = 'calc(100dvh - 28px)';

          host.style.minWidth = Math.min(320, availableWidth) + 'px';
          host.style.minHeight = Math.min(500, availableHeight) + 'px';

          host.style.right = '18px';
          host.style.top = '70px';
          host.style.left = 'auto';
          host.style.bottom = 'auto';

          if (host.shadowRoot) {
            var style = child.document.createElement('style');

            style.textContent = [
              '.head{cursor:grab!important;touch-action:none!important;user-select:none!important}',
              '.head:active{cursor:grabbing!important}',
              '#resizeGrip,.resize-grip{cursor:nwse-resize!important;touch-action:none!important}',
              '.head button{cursor:pointer!important}'
            ].join('\n');

            host.shadowRoot.appendChild(style);
          }

          host.__MAT_POD_LARGE_DRAGGABLE_V1__ = true;

          console.info(
            '[MAT POD] Large draggable panel applied: up to 560 × 820.'
          );
        }

        return true;

      } catch (error) {
        console.warn('[MAT POD] Panel enhancement error:', error);
        return false;
      }
    }

    function monitorChild(child) {
      var startedAt = Date.now();

      var timer = window.setInterval(function () {
        if (!child || child.closed || Date.now() - startedAt > 120000) {
          window.clearInterval(timer);
          return;
        }

        if (!isManagePodWindow(child)) return;

        installChildFetch(child);

        if (enlargeAndStylePanel(child)) {
          window.clearInterval(timer);
        }

      }, 50);
    }

    window.open = function () {
      var child = nativeOpen.apply(window, arguments);

      if (child) {
        monitorChild(child);
      }

      return child;
    };

    window[MARKER] = {
      version: '1.0',

      restore: function () {
        window.open = nativeOpen;

        try {
          delete window[MARKER];
        } catch (_) {
          window[MARKER] = null;
        }
      },

      getStatus: function () {
        return {
          installed: true,
          childFetchRelaysInstalled: installedCount
        };
      }
    };

    console.info(
      '[MAT POD] Automatic permission relay and draggable UI ready.'
    );
  }

  /* ===================================
     CORE SCRIPT LOADER
  =================================== */

  function loadScript(url, label) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');

      script.src =
        url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();

      script.onload = function () {
        console.info('[MAT Tool] Loaded:', label);
        resolve();
      };

      script.onerror = function () {
        script.remove();
        reject(new Error('Could not load ' + label));
      };

      (document.head || document.documentElement).appendChild(script);
    });
  }

  /* ===================================
     BRIDGE MESSAGE HANDLER
  =================================== */

  requestListener = function (event) {
    if (
      event.origin !== BRIDGE_ORIGIN ||
      event.source !== bridgeFrame.contentWindow
    ) return;

    var data = event.data || {};

    if (data.type === 'MAT_BRIDGE_READY') {
      if (bridgeReady) return;

      bridgeReady = true;

      if (readyTimeout) clearTimeout(readyTimeout);

      window.fetch = bridgedFetch;

      window.__MAT_HIDDEN_BRIDGE = {
        version: '2.1',
        frame: bridgeFrame,
        stop: cleanup,

        status: function () {
          return {
            active: !!window.__MAT_HIDDEN_BRIDGE_ACTIVE,
            bridgeReady: bridgeReady,
            pendingRequests: pending.size,
            fetchPatched: window.fetch === bridgedFetch
          };
        }
      };

      installManagePodEnhancer();

      loadScript(REPO_CDN + '/core.js', 'MAT Tool core.js')
        .then(function () {
          console.info(
            '[MAT Tool] Hidden Bridge and Manage POD enhancements ready.'
          );
        })
        .catch(function (error) {
          console.error('[MAT Tool] Startup error:', error);
          alert('MAT Tool startup error: ' + error.message);
          cleanup(error.message);
        });

      return;
    }

    if (!data.id || !pending.has(data.id)) return;

    var item = pending.get(data.id);
    pending.delete(data.id);
    clearTimeout(item.timer);

    if (data.type === 'MAT_BRIDGE_ERROR') {
      item.reject(new TypeError(data.error || 'MAT Bridge request failed'));
      return;
    }

    if (data.type !== 'MAT_BRIDGE_RESPONSE') return;

    try {
      var status = Number(data.status) || 200;
      var responseHeaders = new Headers();

      (data.headers || []).forEach(function (pair) {
        if (!Array.isArray(pair)) return;

        var key = String(pair[0]).toLowerCase();

        if (
          ['content-type', 'etag', 'cache-control', 'last-modified']
            .includes(key)
        ) {
          responseHeaders.set(pair[0], pair[1]);
        }
      });

      var responseBody = [204, 205, 304].includes(status)
        ? null
        : (data.body == null ? '' : String(data.body));

      item.resolve(new Response(responseBody, {
        status: status,
        statusText: data.statusText || '',
        headers: responseHeaders
      }));

    } catch (error) {
      item.reject(error);
    }
  };

  /* ===================================
     START HIDDEN BRIDGE
  =================================== */

  window.addEventListener('message', requestListener);

  window.__MAT_HIDDEN_BRIDGE_ACTIVE = true;

  (document.body || document.documentElement)
    .appendChild(bridgeFrame);

  bridgeFrame.src =
    BRIDGE_ORIGIN + '/matrix-tool/bridge.html?v=' + Date.now();

  readyTimeout = setTimeout(function () {
    if (!bridgeReady) {
      cleanup('Bridge did not become ready');

      alert(
        'MAT Bridge did not become ready. Check bridge.html publication.'
      );
    }
  }, 20000);

  console.info('[MAT Tool] Starting Hidden Bridge...');

})();

