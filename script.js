/* PIN VIDEO DOWNLOADER — script.js
   Configuration: set these when you connect real services (see README.md).
   Leave empty to run in honest, frontend-only mode. */
window.PVD_CONFIG = {
  apiEndpoint: "",        // e.g. "https://your-backend.example.com/api/resolve"
  contactEndpoint: "",    // e.g. a Formspree endpoint "https://formspree.io/f/xxxxxxx"
  contactEmail: "support@example.com" // replace with the site owner's real email
};

(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Theme ---------- */
  var root = document.documentElement;
  function applyTheme(t) { root.setAttribute("data-theme", t); var b = $("#themeToggle"); if (b) b.textContent = t === "dark" ? "☀️" : "🌙"; }
  var saved = null;
  try { saved = localStorage.getItem("pvd-theme"); } catch (e) {}
  if (saved) applyTheme(saved);
  else applyTheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  var tt = $("#themeToggle");
  if (tt) tt.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("pvd-theme", next); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $("#menuToggle"), nav = $("#mainNav");
  if (menuBtn && nav) menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---------- FAQ accordion ---------- */
  $$(".faq-item").forEach(function (item) {
    $(".faq-q", item).addEventListener("click", function () { item.classList.toggle("open"); });
  });

  /* ---------- Helpers ---------- */
  function showMsg(el, type, text) {
    if (!el) return;
    el.className = "msg show " + type; el.textContent = text;
  }
  function fmtBytes(b) {
    if (!b && b !== 0) return "—";
    var u = ["B", "KB", "MB", "GB"], i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return b.toFixed(i ? 1 : 0) + " " + u[i];
  }
  function triggerDownload(href, name) {
    var a = document.createElement("a"); a.href = href; a.download = name || "download";
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* =====================================================
     VIDEO DOWNLOADER — authorized workflow only.
     - Direct .mp4 links (media the user hosts/owns): real preview + download.
     - Pinterest page links: validated and explained. Actual extraction
       requires an authorized backend integration (PVD_CONFIG.apiEndpoint).
     No fake extraction, no fake download links.
  ===================================================== */
  var urlInput = $("#pinUrl");
  if (urlInput) {
    var msg = $("#dlMsg"), preview = $("#previewBox"), dlBtn = $("#downloadBtn"),
        pvBtn = $("#previewBtn"), media = $("#previewMedia"), metaBody = $("#metaBody"),
        progWrap = $("#progressWrap"), progBar = $("#progressBar"), openOrig = $("#openOriginal");
    var current = null; // {kind:'direct'|'pinterest', url, pinId}

    function parseInput(raw) {
      var v = (raw || "").trim();
      if (!v) return { error: "Please paste a URL first." };
      var u;
      try { u = new URL(v); } catch (e) { return { error: "That does not look like a valid URL. Check the link and try again." }; }
      if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Only http(s) links are supported." };
      var host = u.hostname.toLowerCase();
      var isPin = host === "pinterest.com" || host.slice(-14) === ".pinterest.com" || host === "pin.it";
      var isDirect = /\.mp4($|\?)/i.test(u.pathname + (u.search || ""));
      if (isDirect) return { kind: "direct", url: u.href };
      if (isPin) {
        var m = u.pathname.match(/\/pin\/(\d+)/);
        return { kind: "pinterest", url: u.href, pinId: m ? m[1] : null, short: host === "pin.it" };
      }
      return { error: "Unsupported link. Paste a Pinterest link (pinterest.com or pin.it) or a direct .mp4 link to media you own." };
    }

    function renderMeta(rows) {
      metaBody.innerHTML = rows.map(function (r) {
        return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>";
      }).join("");
    }
    function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

    function doPreview() {
      var parsed = parseInput(urlInput.value);
      preview.classList.remove("show"); progWrap.classList.remove("show"); current = null;
      if (parsed.error) { showMsg(msg, "error", parsed.error); return; }
      current = parsed;
      pvBtn.classList.add("loading"); pvBtn.disabled = true;
      setTimeout(function () { // brief processing state; all checks are local & instant
        pvBtn.classList.remove("loading"); pvBtn.disabled = false;
        if (parsed.kind === "direct") {
          media.innerHTML = "";
          var v = document.createElement("video");
          v.src = parsed.url; v.controls = true; v.preload = "metadata";
          v.addEventListener("loadedmetadata", function () {
            renderMeta([["Source", "Direct media link"], ["Format", "MP4"],
              ["Duration", isFinite(v.duration) ? Math.round(v.duration) + " sec" : "—"],
              ["Resolution", v.videoWidth + " × " + v.videoHeight],
              ["Status", "Ready — this is a direct file link you provided"]]);
          });
          v.addEventListener("error", function () {
            showMsg(msg, "error", "The file could not be loaded. It may be offline, blocked by its host, or not a playable MP4.");
          });
          media.appendChild(v);
          renderMeta([["Source", "Direct media link"], ["Format", "MP4"], ["Status", "Loading preview…"]]);
          openOrig.href = parsed.url;
          showMsg(msg, "success", "Preview ready. Use Download to save the file — only download media you own or are authorized to use.");
        } else if (window.PVD_CONFIG.apiEndpoint) {
          fetch(window.PVD_CONFIG.apiEndpoint, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: parsed.url })
          }).then(function (r) { return r.json(); }).then(function (data) {
            if (data && data.videoUrl) {
              current.directUrl = data.videoUrl;
              media.innerHTML = "";
              var vv = document.createElement("video");
              vv.src = data.videoUrl; vv.controls = true; if (data.thumbnail) vv.poster = data.thumbnail;
              media.appendChild(vv);
              renderMeta([["Source", "Pinterest"], ["Pin ID", parsed.pinId || "—"],
                ["Title", esc(data.title || "—")], ["Status", "Authorized media found"]]);
              openOrig.href = parsed.url;
              showMsg(msg, "success", "Media found through the authorized integration. You can download it now.");
            } else {
              showMsg(msg, "error", (data && data.message) || "No downloadable media was returned for this link.");
            }
            preview.classList.add("show");
          }).catch(function () {
            showMsg(msg, "error", "The media service could not be reached. Please try again later.");
            preview.classList.add("show");
          });
          media.innerHTML = "<div style='padding:20px;text-align:center'>Checking the authorized media service…</div>";
          renderMeta([["Source", "Pinterest"], ["Pin ID", parsed.pinId || "—"], ["Status", "Checking…"]]);
          openOrig.href = parsed.url;
        } else {
          media.innerHTML = "<div style='padding:24px;text-align:center;font-size:15px'>🔒<br>On-site preview is not available for Pinterest page links without an authorized media integration.</div>";
          renderMeta([["Source", "Pinterest"], ["Pin ID", parsed.pinId || (parsed.short ? "Short link (pin.it) — ID resolves on Pinterest" : "Not found in this link")],
            ["Link type", parsed.short ? "Short link" : "Pin page link"], ["Status", "Link is valid — extraction not configured"]]);
          openOrig.href = parsed.url;
          showMsg(msg, "info", "This is a valid Pinterest link. Downloading Pinterest media requires an authorized backend integration, which is not connected to this copy of the site yet (see README.md). You can open the original pin on Pinterest, or paste a direct .mp4 link to your own media to download it here.");
        }
        preview.classList.add("show");
      }, 450);
    }

    function doDownload() {
      if (!current) { showMsg(msg, "error", "Preview the link first, then download."); return; }
      var target = current.kind === "direct" ? current.url : current.directUrl;
      if (!target) {
        showMsg(msg, "info", "No authorized download is available for this link yet. Pinterest downloads need the authorized backend integration described in README.md — this site never generates fake download links.");
        return;
      }
      // Try a real blob download with progress (works when the host allows CORS);
      // otherwise fall back to opening the file so the user can save it.
      dlBtn.disabled = true; progWrap.classList.add("show"); progBar.style.width = "0%";
      fetch(target).then(function (res) {
        if (!res.ok) throw new Error("bad");
        var total = +res.headers.get("Content-Length") || 0, loaded = 0, chunks = [];
        var reader = res.body.getReader();
        (function read() {
          reader.read().then(function (r) {
            if (r.done) {
              var blob = new Blob(chunks, { type: "video/mp4" });
              triggerDownload(URL.createObjectURL(blob), "pin-video.mp4");
              showMsg(msg, "success", "Download started (" + fmtBytes(blob.size) + ").");
              dlBtn.disabled = false;
              return;
            }
            chunks.push(r.value); loaded += r.value.length;
            if (total) progBar.style.width = Math.round(loaded / total * 100) + "%";
            read();
          }).catch(fallback);
        })();
      }).catch(fallback);
      function fallback() {
        progWrap.classList.remove("show"); dlBtn.disabled = false;
        window.open(target, "_blank");
        showMsg(msg, "info", "Your browser opened the file directly (the host does not allow in-page downloading). Use the player's download option to save it.");
      }
    }

    pvBtn.addEventListener("click", doPreview);
    dlBtn.addEventListener("click", doDownload);
    $("#clearBtn").addEventListener("click", function () {
      urlInput.value = ""; preview.classList.remove("show"); current = null;
      msg.className = "msg"; urlInput.focus();
    });
    $("#pasteBtn").addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) { if (t) urlInput.value = t; })
          .catch(function () { showMsg(msg, "info", "Clipboard access was blocked by the browser — paste manually with long-press / Ctrl+V."); });
      } else { showMsg(msg, "info", "Clipboard reading is not supported in this browser — paste manually."); }
      urlInput.focus();
    });
    urlInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doPreview(); } });
    $("#retryBtn").addEventListener("click", doPreview);
  }

  /* =====================================================
     IMAGE TOOLS — 100% browser-side (Canvas API).
  ===================================================== */
  var tabs = $$(".tool-tab"), panels = $$(".tool-panel");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      panels.forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      var p = $("#panel-" + tab.getAttribute("data-tool"));
      if (p) p.classList.add("active");
    });
  });

  function loadToolImage(panel, cb) {
    var input = $(".tool-file", panel);
    var file = input.files && input.files[0];
    if (!file) { alert("Please choose an image first."); return; }
    if (!/^image\//.test(file.type) && !/\.webp$/i.test(file.name)) { alert("That file is not an image."); return; }
    if (file.size > 25 * 1024 * 1024) { alert("File is too large. The limit is 25 MB."); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { cb(img, file, url); };
    img.onerror = function () { alert("This image could not be read by the browser."); };
    img.src = url;
  }
  function canvasOut(img, w, h, type, quality, bg) {
    var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    var ctx = c.getContext("2d");
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }
  function finish(panel, canvas, type, outName, extra) {
    canvas.toBlob(function (blob) {
      if (!blob) { alert("Processing failed for this image."); return; }
      var link = $(".tool-download", panel);
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", outName);
      link.style.display = "inline-flex";
      var prev = $(".tool-preview", panel);
      prev.classList.add("show");
      var im = $("img", prev); if (im && type.indexOf("image") === 0) im.src = link.href;
      $(".result-line", panel).textContent = (extra ? extra + " · " : "") + "Output size: " + fmtBytes(blob.size);
    }, type, 0.92);
  }
  function showLoaded(panel, img, file) {
    var prev = $(".tool-preview", panel); prev.classList.add("show");
    var im = $("img", prev); if (im) im.src = img.src;
    $(".result-line", panel).textContent = "Loaded: " + file.name + " · " + img.naturalWidth + " × " + img.naturalHeight + " · " + fmtBytes(file.size);
    var wI = $(".in-w", panel), hI = $(".in-h", panel);
    if (wI) wI.value = img.naturalWidth; if (hI) hI.value = img.naturalHeight;
  }
  panels.forEach(function (panel) {
    var drop = $(".drop", panel), input = $(".tool-file", panel);
    if (drop && input) {
      drop.addEventListener("click", function () { input.click(); });
      ["dragover", "dragleave", "drop"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault(); drop.classList.toggle("drag", ev === "dragover");
          if (ev === "drop" && e.dataTransfer.files.length) {
            input.files = e.dataTransfer.files;
            input.dispatchEvent(new Event("change"));
          }
        });
      });
    }
    var reset = $(".tool-reset", panel);
    if (reset) reset.addEventListener("click", function () {
      panel.querySelectorAll("input").forEach(function (i) { if (i.type !== "range") i.value = ""; if (i.type === "range") i.value = i.defaultValue; });
      var prev = $(".tool-preview", panel); if (prev) prev.classList.remove("show");
      var dl = $(".tool-download", panel); if (dl) dl.style.display = "none";
      var rl = $(".result-line", panel); if (rl) rl.textContent = "";
      var cb = $(".crop-box", panel); if (cb) cb.remove();
    });
  });

  /* --- 1. Compressor --- */
  var pComp = $("#panel-compressor");
  if (pComp) {
    $(".tool-file", pComp).addEventListener("change", function () { loadToolImage(pComp, function (img, f) { showLoaded(pComp, img, f); pComp._img = img; pComp._file = f; }); });
    $(".tool-run", pComp).addEventListener("click", function () {
      if (!pComp._img) { alert("Choose an image first."); return; }
      var q = (+$(".in-quality", pComp).value) / 100;
      var type = $(".in-format", pComp).value;
      var c = canvasOut(pComp._img, pComp._img.naturalWidth, pComp._img.naturalHeight, type, q);
      c.toBlob(function (blob) {
        var link = $(".tool-download", pComp);
        link.href = URL.createObjectURL(blob); link.setAttribute("download", "compressed." + (type === "image/webp" ? "webp" : "jpg"));
        link.style.display = "inline-flex";
        $(".result-line", pComp).textContent = "Original " + fmtBytes(pComp._file.size) + " → Compressed " + fmtBytes(blob.size) + " (quality " + Math.round(q * 100) + "%)";
      }, type, q);
    });
    $(".in-quality", pComp).addEventListener("input", function () { $(".q-val", pComp).textContent = this.value + "%"; });
  }

  /* --- 2. Resizer --- */
  var pRes = $("#panel-resizer");
  if (pRes) {
    $(".tool-file", pRes).addEventListener("change", function () { loadToolImage(pRes, function (img, f) { showLoaded(pRes, img, f); pRes._img = img; }); });
    $(".in-w", pRes).addEventListener("input", function () {
      if (pRes._img && $(".in-keep", pRes).checked) $(".in-h", pRes).value = Math.round(this.value * pRes._img.naturalHeight / pRes._img.naturalWidth);
    });
    $(".in-h", pRes).addEventListener("input", function () {
      if (pRes._img && $(".in-keep", pRes).checked) $(".in-w", pRes).value = Math.round(this.value * pRes._img.naturalWidth / pRes._img.naturalHeight);
    });
    $(".tool-run", pRes).addEventListener("click", function () {
      if (!pRes._img) { alert("Choose an image first."); return; }
      var w = +$(".in-w", pRes).value, h = +$(".in-h", pRes).value;
      if (!w || !h) { alert("Enter both width and height."); return; }
      finish(pRes, canvasOut(pRes._img, w, h, "image/png"), "image/png", "resized.png", "New size: " + w + " × " + h);
    });
  }

  /* --- 3. JPG → PNG --- */
  var pJ2P = $("#panel-jpg2png");
  if (pJ2P) {
    $(".tool-file", pJ2P).addEventListener("change", function () { loadToolImage(pJ2P, function (img, f) { showLoaded(pJ2P, img, f); pJ2P._img = img; }); });
    $(".tool-run", pJ2P).addEventListener("click", function () {
      if (!pJ2P._img) { alert("Choose an image first."); return; }
      finish(pJ2P, canvasOut(pJ2P._img, pJ2P._img.naturalWidth, pJ2P._img.naturalHeight, "image/png"), "image/png", "converted.png");
    });
  }

  /* --- 4. PNG → JPG --- */
  var pP2J = $("#panel-png2jpg");
  if (pP2J) {
    $(".tool-file", pP2J).addEventListener("change", function () { loadToolImage(pP2J, function (img, f) { showLoaded(pP2J, img, f); pP2J._img = img; }); });
    $(".tool-run", pP2J).addEventListener("click", function () {
      if (!pP2J._img) { alert("Choose an image first."); return; }
      var bg = $(".in-bg", pP2J).value || "#ffffff";
      finish(pP2J, canvasOut(pP2J._img, pP2J._img.naturalWidth, pP2J._img.naturalHeight, "image/jpeg", 0.92, bg), "image/jpeg", "converted.jpg", "Transparency filled with " + bg);
    });
  }

  /* --- 5. WEBP Converter --- */
  var pWebp = $("#panel-webp");
  if (pWebp) {
    $(".tool-file", pWebp).addEventListener("change", function () { loadToolImage(pWebp, function (img, f) { showLoaded(pWebp, img, f); pWebp._img = img; }); });
    $(".tool-run", pWebp).addEventListener("click", function () {
      if (!pWebp._img) { alert("Choose an image first."); return; }
      var type = $(".in-format", pWebp).value;
      var ext = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
      finish(pWebp, canvasOut(pWebp._img, pWebp._img.naturalWidth, pWebp._img.naturalHeight, type, 0.9, type === "image/jpeg" ? "#ffffff" : null), type, "converted." + ext);
    });
  }

  /* --- 6. Cropper (draggable crop box) --- */
  var pCrop = $("#panel-cropper");
  if (pCrop) {
    var stage = $(".crop-stage", pCrop), cimg = $(".crop-img", pCrop), box = null, drag = null;
    function makeBox() {
      if (box) box.remove();
      box = document.createElement("div"); box.className = "crop-box";
      var r = cimg.getBoundingClientRect();
      var aspect = $(".in-aspect", pCrop).value, ratio = aspect === "free" ? null : eval(aspect.replace(":", "/"));
      var w = r.width * 0.7, h = ratio ? w / ratio : r.height * 0.7;
      if (h > r.height * 0.9) { h = r.height * 0.9; if (ratio) w = h * ratio; }
      box.style.width = w + "px"; box.style.height = h + "px";
      box.style.left = (r.width - w) / 2 + "px"; box.style.top = (r.height - h) / 2 + "px";
      stage.appendChild(box);
      box.addEventListener("pointerdown", function (e) {
        drag = { x: e.clientX - box.offsetLeft, y: e.clientY - box.offsetTop };
        box.setPointerCapture(e.pointerId);
      });
      box.addEventListener("pointermove", function (e) {
        if (!drag) return;
        var sr = stage.getBoundingClientRect();
        var nx = Math.min(Math.max(e.clientX - drag.x, 0), sr.width - box.offsetWidth);
        var ny = Math.min(Math.max(e.clientY - drag.y, 0), sr.height - box.offsetHeight);
        box.style.left = nx + "px"; box.style.top = ny + "px";
      });
      box.addEventListener("pointerup", function () { drag = null; });
    }
    $(".tool-file", pCrop).addEventListener("change", function () {
      loadToolImage(pCrop, function (img, f) {
        pCrop._img = img; cimg.src = img.src;
        $(".tool-preview", pCrop).classList.add("show");
        $(".result-line", pCrop).textContent = "Drag the red box to choose the crop area, then tap Crop & Download.";
        setTimeout(makeBox, 60);
      });
    });
    $(".in-aspect", pCrop).addEventListener("change", function () { if (pCrop._img) makeBox(); });
    $(".in-cropsize", pCrop).addEventListener("input", function () {
      if (!box || !pCrop._img) return;
      var r = cimg.getBoundingClientRect(), pct = +this.value / 100;
      var aspect = $(".in-aspect", pCrop).value, ratio = aspect === "free" ? null : eval(aspect.replace(":", "/"));
      var w = r.width * pct, h = ratio ? w / ratio : r.height * pct;
      box.style.width = w + "px"; box.style.height = h + "px";
    });
    $(".tool-run", pCrop).addEventListener("click", function () {
      if (!pCrop._img || !box) { alert("Choose an image first."); return; }
      var ir = cimg.getBoundingClientRect(), sx = pCrop._img.naturalWidth / ir.width, sy = pCrop._img.naturalHeight / ir.height;
      var c = document.createElement("canvas");
      c.width = Math.round(box.offsetWidth * sx); c.height = Math.round(box.offsetHeight * sy);
      c.getContext("2d").drawImage(pCrop._img, box.offsetLeft * sx, box.offsetTop * sy, c.width, c.height, 0, 0, c.width, c.height);
      finish(pCrop, c, "image/png", "cropped.png", "Crop: " + c.width + " × " + c.height);
    });
  }

  /* --- 7. Image → PDF (real minimal PDF with embedded JPEG) --- */
  var pPdf = $("#panel-pdf");
  if (pPdf) {
    $(".tool-file", pPdf).addEventListener("change", function () { loadToolImage(pPdf, function (img, f) { showLoaded(pPdf, img, f); pPdf._img = img; }); });
    $(".tool-run", pPdf).addEventListener("click", function () {
      if (!pPdf._img) { alert("Choose an image first."); return; }
      var img = pPdf._img;
      var c = canvasOut(img, img.naturalWidth, img.naturalHeight, "image/jpeg", 0.9, "#ffffff");
      var jpegB64 = c.toDataURL("image/jpeg", 0.9).split(",")[1];
      var bin = atob(jpegB64), jpeg = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i);
      var size = $(".in-pagesize", pPdf).value;
      var pw = size === "letter" ? 612 : 595, ph = size === "letter" ? 792 : 842;
      if (size === "fit") { pw = Math.min(842, img.naturalWidth * 0.75); ph = pw * img.naturalHeight / img.naturalWidth; }
      var m = 36, iw = pw - 2 * m, ih = iw * img.naturalHeight / img.naturalWidth;
      if (ih > ph - 2 * m) { ih = ph - 2 * m; iw = ih * img.naturalWidth / img.naturalHeight; }
      var ix = (pw - iw) / 2, iy = (ph - ih) / 2;
      var content = "q " + iw.toFixed(2) + " 0 0 " + ih.toFixed(2) + " " + ix.toFixed(2) + " " + iy.toFixed(2) + " cm /Im0 Do Q";
      var enc = new TextEncoder(), parts = [], offsets = [], pos = 0;
      function push(x) { var b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); pos += b.length; }
      function obj(n, body) { offsets[n] = pos; push(n + " 0 obj\n"); if (typeof body === "string") push(body); else body(); push("\nendobj\n"); }
      push("%PDF-1.4\n");
      obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
      obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
      obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pw.toFixed(2) + " " + ph.toFixed(2) + "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
      offsets[4] = pos; push("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + c.width + " /Height " + c.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpeg.length + " >>\nstream\n");
      push(jpeg); push("\nendstream\nendobj\n");
      obj(5, "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream");
      var xref = pos; push("xref\n0 6\n0000000000 65535 f \n");
      for (var n = 1; n <= 5; n++) push(String(offsets[n]).padStart(10, "0") + " 00000 n \n");
      push("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF");
      var blob = new Blob(parts, { type: "application/pdf" });
      var link = $(".tool-download", pPdf);
      link.href = URL.createObjectURL(blob); link.setAttribute("download", "image.pdf");
      link.style.display = "inline-flex";
      $(".result-line", pPdf).textContent = "PDF created · " + fmtBytes(blob.size);
    });
  }

  /* --- 8. Metadata viewer (+ basic JPEG EXIF) --- */
  var pMeta = $("#panel-metadata");
  if (pMeta) {
    $(".tool-file", pMeta).addEventListener("change", function () {
      var file = this.files && this.files[0]; if (!file) return;
      loadToolImage(pMeta, function (img, f) {
        showLoaded(pMeta, img, f);
        var rows = [["File name", f.name], ["Type", f.type || "—"], ["Size", fmtBytes(f.size)],
          ["Dimensions", img.naturalWidth + " × " + img.naturalHeight + " px"],
          ["Last modified", f.lastModified ? new Date(f.lastModified).toLocaleString() : "—"]];
        function render() {
          $(".meta-out", pMeta).innerHTML = "<table class='meta-table'>" + rows.map(function (r) {
            return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>";
          }).join("") + "</table>";
        }
        render();
        if (/jpe?g/i.test(f.type) || /\.jpe?g$/i.test(f.name)) {
          f.arrayBuffer().then(function (buf) {
            var exif = parseExif(new DataView(buf));
            Object.keys(exif).forEach(function (k) { rows.push([k, exif[k]]); });
            if (Object.keys(exif).length) render();
            else $(".result-line", pMeta).textContent += " · No EXIF data found in this file.";
          }).catch(function () {});
        }
      });
    });
  }
  function parseExif(view) {
    var out = {};
    try {
      if (view.getUint16(0) !== 0xFFD8) return out;
      var off = 2;
      while (off < view.byteLength - 4) {
        var marker = view.getUint16(off); off += 2;
        if (marker === 0xFFE1) {
          var len = view.getUint16(off);
          if (view.getUint32(off + 2) !== 0x45786966) return out; // "Exif"
          var tiff = off + 8, little = view.getUint16(tiff) === 0x4949;
          var g16 = function (o) { return view.getUint16(o, little); }, g32 = function (o) { return view.getUint32(o, little); };
          function str(o, n) { var s = ""; for (var i = 0; i < n; i++) { var ch = view.getUint8(o + i); if (!ch) break; s += String.fromCharCode(ch); } return s; }
          function readIFD(ifdOff, map) {
            var count = g16(tiff + ifdOff);
            for (var i = 0; i < count; i++) {
              var e = tiff + ifdOff + 2 + i * 12, tag = g16(e), type = g16(e + 2), num = g32(e + 4);
              var valOff = type === 2 && num > 4 ? tiff + g32(e + 8) : e + 8;
              if (map[tag]) out[map[tag]] = type === 2 ? str(valOff, num) : String(g32(e + 8));
              if (tag === 0x8769) readIFD(g32(e + 8), { 0x9003: "Date taken", 0xA002: "EXIF width", 0xA003: "EXIF height" });
            }
          }
          readIFD(g32(tiff + 4), { 0x010F: "Camera make", 0x0110: "Camera model", 0x0132: "Date modified", 0x011A: "X resolution", 0x011B: "Y resolution" });
          return out;
        }
        off += view.getUint16(off);
      }
    } catch (e) {}
    return out;
  }

  /* =====================================================
     CONTACT FORM — honest submission.
     Posts to PVD_CONFIG.contactEndpoint when configured; otherwise
     explains the state and offers a direct email link. Never fakes success.
  ===================================================== */
  var form = $("#contactForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var cmsg = $("#contactMsg");
      if ($("#hpField").value) { showMsg(cmsg, "error", "Submission blocked (spam check)."); return; }
      var name = $("#cfName").value.trim(), email = $("#cfEmail").value.trim(),
          subject = $("#cfSubject").value.trim(), message = $("#cfMessage").value.trim();
      if (!name || !email || !subject || !message) { showMsg(cmsg, "error", "Please fill in every field."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showMsg(cmsg, "error", "Please enter a valid email address."); return; }
      if (!window.PVD_CONFIG.contactEndpoint) {
        showMsg(cmsg, "info", "This copy of the site does not have a form backend connected yet, so your message was NOT sent. To enable sending, connect a form service as described in README.md — or email us directly at " + window.PVD_CONFIG.contactEmail + ".");
        return;
      }
      var btn = $("#cfSubmit"); btn.disabled = true; btn.textContent = "Sending…";
      fetch(window.PVD_CONFIG.contactEndpoint, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name: name, email: email, subject: subject, message: message })
      }).then(function (r) {
        if (!r.ok) throw new Error("bad");
        showMsg(cmsg, "success", "Thank you — your message was sent. We usually reply within 2–3 business days.");
        form.reset();
      }).catch(function () {
        showMsg(cmsg, "error", "Sending failed. Please try again, or email us at " + window.PVD_CONFIG.contactEmail + ".");
      }).finally(function () { btn.disabled = false; btn.textContent = "Send Message"; });
    });
  }

  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
