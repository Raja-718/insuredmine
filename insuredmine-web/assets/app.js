/* ===== InsuredMine — static frontend logic (no backend) ===== */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DATA = window.IM_DATA || null;
  var HISTORY = DATA ? DATA.history : [];

  document.addEventListener("DOMContentLoaded", function () {
    // month dropdown
    var ms = $("#inMonth");
    MONTHS.forEach(function (m, i) {
      var o = document.createElement("option");
      o.value = i + 1; o.textContent = (i + 1) + " — " + m; ms.appendChild(o);
    });
    ms.value = 4;

    $("#btnPredict").addEventListener("click", doPredict);
    $("#btnExtract").addEventListener("click", doExtract);
    $("#btnSample").addEventListener("click", loadSample);
    $("#btnClear").addEventListener("click", function () {
      $("#ocrText").value = "";
      $("#extractOut").innerHTML = '<p class="muted">Cleared. Paste OCR text and click <b>Extract entities</b>.</p>';
      var c = $("#extractCount"); c.hidden = true;
    });

    if (!DATA) { toast("Data failed to load.", true); return; }
    renderMetrics();
    drawChart(HISTORY, null);
    loadSample();
  });

  // ---- toast ----
  var toastTimer;
  function toast(msg, isErr) {
    var t = $("#toast");
    t.textContent = msg; t.className = "toast" + (isErr ? " toast--err" : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  // ---- Section A: metrics + hero stats ----
  function renderMetrics() {
    var m = DATA.metrics;
    $("#statModel").textContent = m.selected_model;
    $("#statSamples").textContent = m.n_samples;
    $("#statFixed").textContent = m.outliers_repaired;
    var sel = m.models.find(function (x) { return x.name === m.selected_model; });
    $("#statR2").textContent = sel ? sel.r2_fit.toFixed(2) : "—";

    var tb = $("#metricsTbl tbody"); tb.innerHTML = "";
    m.models.forEach(function (x) {
      var tr = document.createElement("tr");
      if (x.name === m.selected_model) tr.className = "sel";
      var cv = x.r2_cv >= 0
        ? '<span class="badge-pos">' + x.r2_cv + "</span>"
        : '<span class="badge-neg">' + x.r2_cv + "</span>";
      tr.innerHTML = "<td>" + x.name + "</td><td>" + x.r2_fit + "</td><td>" +
                     x.mae_pct_fit + "</td><td>" + cv + "</td>";
      tb.appendChild(tr);
    });
  }

  // ---- SVG line chart ----
  function drawChart(history, pred) {
    if (!history.length) return;
    var W = 460, H = 190, P = { l: 34, r: 14, t: 14, b: 26 };
    var vals = history.map(function (d) { return d.actual_pct; });
    if (pred) vals = vals.concat([pred.pct]);
    var min = Math.min.apply(null, vals) * 0.95, max = Math.max.apply(null, vals) * 1.05;
    var n = history.length + (pred ? 1 : 0);
    var X = function (i) { return P.l + (W - P.l - P.r) * (i / (n - 1 || 1)); };
    var Y = function (v) { return P.t + (H - P.t - P.b) * (1 - (v - min) / (max - min || 1)); };

    var path = "", dots = "";
    history.forEach(function (d, i) {
      path += (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(d.actual_pct).toFixed(1) + " ";
      dots += '<circle cx="' + X(i) + '" cy="' + Y(d.actual_pct) + '" r="2.6" fill="#f26a21"/>';
    });
    var predMark = "";
    if (pred) {
      var i = n - 1;
      predMark = '<circle cx="' + X(i) + '" cy="' + Y(pred.pct) + '" r="6" fill="#0a0f1c" stroke="#ff8a47" stroke-width="2"/>' +
        '<text x="' + X(i) + '" y="' + (Y(pred.pct) - 12) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#d9541a">' +
        pred.pct.toFixed(1) + "%</text>";
    }
    var grid = "";
    for (var g = 0; g <= 3; g++) {
      var v = min + (max - min) * g / 3, y = Y(v);
      grid += '<line x1="' + P.l + '" y1="' + y + '" x2="' + (W - P.r) + '" y2="' + y + '" stroke="#eef2f9"/>' +
        '<text x="4" y="' + (y + 3) + '" font-size="9" fill="#94a3b8">' + v.toFixed(1) + "</text>";
    }
    var xlab = "";
    history.forEach(function (d, i) {
      if (i % 3 === 0) xlab += '<text x="' + X(i) + '" y="' + (H - 8) +
        '" text-anchor="middle" font-size="9" fill="#94a3b8">' + d.date.slice(2) + "</text>";
    });
    $("#chart").innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet">' +
      grid + '<path d="' + path + '" fill="none" stroke="#f26a21" stroke-width="2.2" stroke-linejoin="round"/>' +
      dots + predMark + xlab + "</svg>";
  }

  // ---- predictor (embedded lookup) ----
  function doPredict() {
    var year = $("#inYear").value, month = +$("#inMonth").value;
    var key = year + "-" + month;
    var r = DATA.predictions[key];
    if (!r) { toast("No prediction available for that month.", true); return; }
    $("#predPct").textContent = r.pct.toFixed(2);
    $("#predAbs").textContent = "₹ " + Number(r.premium).toLocaleString("en-IN");
    $("#predMeta").textContent = "Model: " + DATA.metrics.selected_model + " · " + MONTHS[month - 1] + " " + year;
    $("#predResult").hidden = false;
    drawChart(HISTORY, { pct: r.pct });
  }

  // ---- extraction (client-side) ----
  var SAMPLE = "Name: Ramesh Kumar\nDOB: 17-04-1985\nEmail: ramesh.kumar85@gmail.com\n" +
    "Phone: +91-9876543210\nAddress: 123, MG Road, Bengaluru, Karnataka, India\n" +
    "Marital Status: Married\nID Number: 4789652310\n\n" +
    "Name: Priya Sharma\nDOB: 02-12-1990\nEmail: priya.sharma1990@outlook.com\n" +
    "Phone: +91-9123456780\nAddress: 45, Lajpat Nagar, New Delhi, Delhi, India\n" +
    "Marital Status: Single\nID Number: 1089723412";

  function loadSample() { $("#ocrText").value = SAMPLE; }

  function doExtract() {
    var text = $("#ocrText").value.trim();
    if (!text) { toast("Please paste some OCR text first.", true); return; }
    var btn = $("#btnExtract"); btn.disabled = true; btn.textContent = "Extracting…";
    // slight async so the UI shows the loading state
    setTimeout(function () {
      try {
        var people = window.IMExtract.extractAll(text);
        renderPeople(people);
        var c = $("#extractCount");
        if (people.length) { c.hidden = false; c.textContent = people.length + " found"; }
        else c.hidden = true;
      } catch (e) {
        $("#extractOut").innerHTML = '<p class="muted">Error: ' + e.message + "</p>";
        toast("Extraction failed.", true);
      }
      btn.disabled = false; btn.textContent = "Extract entities";
    }, 120);
  }

  function fld(v) { return (v == null || v === "") ? '<span class="null">null</span>' : escapeHtml(v); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function renderPeople(people) {
    if (!people.length) {
      $("#extractOut").innerHTML = '<p class="muted">No records found in the text.</p>';
      return;
    }
    $("#extractOut").innerHTML = people.map(function (p) {
      var name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ") || "Unknown";
      return '<div class="person"><div class="person__name">' + escapeHtml(name) + "</div>" +
        '<dl class="person__grid">' +
        "<dt>Email</dt><dd>" + fld(p.email) + "</dd>" +
        "<dt>Phone</dt><dd>" + fld(p.phone_number) + "</dd>" +
        "<dt>DOB</dt><dd>" + fld(p.date_of_birth) + "</dd>" +
        "<dt>Address</dt><dd>" + fld(p.address) + "</dd>" +
        "<dt>Marital</dt><dd>" + fld(p.marital_status) + "</dd>" +
        "</dl></div>";
    }).join("");
  }
})();
