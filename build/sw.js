/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-ca84f546'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "012922bfe1bcab28848764c77ecdc25f"
  }, {
    "url": "pwa-maskable-192x192.png",
    "revision": "846fb70f6babb03815285990ad62c029"
  }, {
    "url": "pwa-512x512.png",
    "revision": "496460075a2bf156fd7029181ed140fd"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a5d7f868eca5cd94a678e226bc254490"
  }, {
    "url": "placeholder.svg",
    "revision": "35707bd9960ba5281c72af927b79291f"
  }, {
    "url": "index.html",
    "revision": "ea9085f30e2f8f31c9dff573f050544d"
  }, {
    "url": "favicon.ico",
    "revision": "566e64364d6957715dc11845f4800700"
  }, {
    "url": "assets/vairify-logo-DtNFEYda.svg",
    "revision": null
  }, {
    "url": "assets/purify.es-B6FQ9oRL.js",
    "revision": null
  }, {
    "url": "assets/index.es-C2Lfeorz.js",
    "revision": null
  }, {
    "url": "assets/index-doVB44Zp.css",
    "revision": null
  }, {
    "url": "assets/index-C9Zd1mUN.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-CBrSDip1.js",
    "revision": null
  }, {
    "url": "assets/complycube-logo-D5U9mHBW.svg",
    "revision": null
  }, {
    "url": "assets/chainpass-logo-Bkz-Ph_N.svg",
    "revision": null
  }, {
    "url": "favicon.ico",
    "revision": "566e64364d6957715dc11845f4800700"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a5d7f868eca5cd94a678e226bc254490"
  }, {
    "url": "pwa-512x512.png",
    "revision": "496460075a2bf156fd7029181ed140fd"
  }, {
    "url": "pwa-maskable-192x192.png",
    "revision": "846fb70f6babb03815285990ad62c029"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "012922bfe1bcab28848764c77ecdc25f"
  }, {
    "url": "robots.txt",
    "revision": "f9dff89adf98833e676de2205921996a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f58bdfd5439c3a86cd967aaf85cdcafd"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
