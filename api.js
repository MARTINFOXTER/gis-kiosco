/* Llamadas a Apps Script desde GitHub Pages (JSONP: evita CORS). */
function gisApi(params) {
  return new Promise(function (resolve, reject) {
    const url = (typeof GIS_WEBAPP_URL === "string") ? GIS_WEBAPP_URL : "";
    if (!url) {
      reject(new Error("Falta GIS_WEBAPP_URL en config.js"));
      return;
    }
    const cb = "gis_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e9);
    let done = false;
    const timer = setTimeout(function () {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("Tiempo agotado. ¿Apps Script desplegado con acceso «Cualquiera»?"));
    }, 20000);
    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
    window[cb] = function (data) {
      if (done) return;
      done = true;
      cleanup();
      resolve(data);
    };
    const q = [];
    Object.keys(params || {}).forEach(function (k) {
      const v = params[k];
      if (v === undefined || v === null) return;
      q.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
    });
    q.push("callback=" + cb);
    const script = document.createElement("script");
    script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + q.join("&");
    script.onerror = function () {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("No se alcanzó Apps Script (403 o URL vieja). Vuelve a implementar la Web App."));
    };
    document.head.appendChild(script);
  });
}
