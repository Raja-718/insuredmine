/*
 * Client-side OCR / NLP entity extraction — a faithful JavaScript port of
 * src/ocr_extraction.py, so the static site needs no backend.
 * UMD-style so it also runs under Node for testing.
 */
(function (root) {
  "use strict";

  var PATTERNS = {
    name:           /^\s*Name\s*:\s*(.+?)\s*$/im,
    date_of_birth:  /^\s*DOB\s*:\s*(.+?)\s*$/im,
    email:          /^\s*Email\s*:\s*(.+?)\s*$/im,
    phone_number:   /^\s*Phone\s*:\s*(.+?)\s*$/im,
    address:        /^\s*Address\s*:\s*(.+?)\s*$/im,
    marital_status: /^\s*Marital\s*Status\s*:\s*(.+?)\s*$/im
  };
  var EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  var MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  function splitName(full) {
    var t = full.trim().split(/\s+/).filter(Boolean);
    if (t.length === 0) return [null, null, null];
    if (t.length === 1) return [t[0], null, null];
    if (t.length === 2) return [t[0], null, t[1]];
    return [t[0], t.slice(1, -1).join(" "), t[t.length - 1]];
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function normaliseDob(raw) {
    raw = raw.trim();
    var m;
    // dd-mm-yyyy or dd/mm/yyyy
    if ((m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))
      return m[3] + "-" + pad(+m[2]) + "-" + pad(+m[1]);
    // yyyy-mm-dd
    if ((m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)))
      return m[1] + "-" + pad(+m[2]) + "-" + pad(+m[3]);
    // dd Mon yyyy / dd Month yyyy
    if ((m = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/))) {
      var mm = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mm) return m[3] + "-" + pad(mm) + "-" + pad(+m[1]);
    }
    return raw || null;
  }

  function cleanEmail(raw) {
    var m = raw.match(EMAIL_RE);
    return m ? m[0].toLowerCase() : null;
  }

  function cleanPhone(raw) {
    var c = raw.replace(/[^\d+]/g, "");
    return c || null;
  }

  function titleCase(s) {
    return s.trim().replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }

  function extractPerson(block) {
    var raw = {};
    Object.keys(PATTERNS).forEach(function (k) {
      var m = block.match(PATTERNS[k]);
      raw[k] = m ? m[1].trim() : null;
    });
    var nm = raw.name ? splitName(raw.name) : [null, null, null];
    return {
      first_name: nm[0],
      middle_name: nm[1],
      last_name: nm[2],
      email: raw.email ? cleanEmail(raw.email) : null,
      phone_number: raw.phone_number ? cleanPhone(raw.phone_number) : null,
      date_of_birth: raw.date_of_birth ? normaliseDob(raw.date_of_birth) : null,
      address: raw.address,
      marital_status: raw.marital_status ? titleCase(raw.marital_status) : null
    };
  }

  function dedupKey(p) {
    if (p.email) return "email:" + p.email;
    var name = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").toLowerCase();
    return "name:" + name + "|" + (p.date_of_birth || "");
  }

  function extractAll(text) {
    text = String(text).replace(/^﻿/, "");
    var blocks = text.trim().split(/\n\s*\n+/).filter(function (b) { return b.trim(); });
    var people = [], seen = {};
    blocks.forEach(function (b) {
      var p = extractPerson(b);
      if (!Object.keys(p).some(function (k) { return p[k]; })) return;
      var key = dedupKey(p);
      if (seen[key]) return;
      seen[key] = true;
      people.push(p);
    });
    return people;
  }

  root.IMExtract = { extractAll: extractAll, splitName: splitName, normaliseDob: normaliseDob };
  if (typeof module !== "undefined" && module.exports) module.exports = root.IMExtract;
})(typeof window !== "undefined" ? window : globalThis);
