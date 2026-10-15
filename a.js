(function (root) {
  const w = a => String.fromCharCode.apply(null, a);
  const K = {
    bank: w([90,73,82,65,65,84]),
    bank2: w([73,82,65,65,84,66,65,78]),
    amount: w([84,85,84,65,82]),
    code: w([79,78,65,89]),
    sale: w([83,65,84,73,83]),
    v1: w([73,80,84,65,76]),
    v2: w([73,65,68,69]),
    m1: w([73,83,89,69,82,73]),
    m2: w([75,82,69,68,73])
  };

  function norm(t) {
    return String(t || "")
      .replace(/[İIıiÎ]/g, m => (m === "ı" || m === "i") ? "I" : "I")
      .replace(/[Şş]/g, "S").replace(/[Ğğ]/g, "G").replace(/[Üü]/g, "U")
      .replace(/[Öö]/g, "O").replace(/[Çç]/g, "C")
      .toUpperCase();
  }
  function digits(s) {
    return String(s).replace(/[OoQD]/g, "0").replace(/[Il|!\]]/g, "1").replace(/[Ss\$]/g, "5")
      .replace(/[B]/g, "8").replace(/[Zz]/g, "2").replace(/[Gb]/g, "6").replace(/[T]/g, "7");
  }

  function amountToCents(v) {
    if (typeof v === "number") return Math.round(v * 100);
    let t = String(v || "").replace(/[^\d.,]/g, "");
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
    else if (/\.\d{2}$/.test(t) && (t.match(/\./g) || []).length === 1) t = t;
    else t = t.replace(/[.,]/g, "");
    const n = parseFloat(t);
    return isFinite(n) ? Math.round(n * 100) : 0;
  }

  const AMT = /(\d{1,3}(?:[ .]\d{3})+|\d{1,6})\s*[,.]\s*(\d{2})(?!\d)/g;

  function findAmount(lines) {
    const fromLine = s => {
      const cands = [];
      let m; AMT.lastIndex = 0;
      while ((m = AMT.exec(digits(s).replace(/(?<=\d)\s+(?=[.,]\d)/g, "")))) {
        const whole = m[1].replace(/[ .]/g, "");
        if (whole.length > 7) continue;
        cands.push(parseInt(whole, 10) * 100 + parseInt(m[2], 10));
      }
      return cands.filter(c => c > 0);
    };
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].replace(/\s/g, "").includes(K.amount)) {
        for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
          const c = fromLine(lines[j]);
          if (c.length) return c[0];
        }
      }
    }
    for (const l of lines) {
      if (/T\s*L\b/.test(l)) { const c = fromLine(l); if (c.length) return c[0]; }
    }
    return 0;
  }

  function findCode(lines, flat) {
    for (const l of lines) {
      const s = l.replace(/\s/g, "");
      const i = s.indexOf(K.code);
      if (i >= 0) {
        const rest = s.slice(i + K.code.length).replace(/^KO[DO0]U?/, "").replace(/^[:;.,\-]+/, "");
        const d = digits(rest).match(/^\d{6}/);
        if (d) return d[0];
        const any = digits(rest).match(/\d{6}/);
        if (any) return any[0];
      }
    }
    const m = digits(flat).match(new RegExp(K.code + "K[O0]DU?[:;.]?(\\d{6})"));
    return m ? m[1] : "";
  }

  function parse(text) {
    const N = norm(text);
    const lines = N.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const flat = N.replace(/\s+/g, "");
    let hits = 0;
    [K.amount, K.code, K.sale, K.m1, K.m2, "TL"].forEach(k => { if (flat.includes(k)) hits++; });
    const doc = hits >= 2;
    const okBank = flat.includes(K.bank) || flat.includes(K.bank2) || new RegExp(w([90,46,63,73,63,82,65,65,84])).test(flat);
    const isVoid = flat.includes(K.v1) || (flat.includes(K.v2) && !flat.includes(K.sale));
    const cents = findAmount(lines);
    const code = findCode(lines, flat);
    const l4 = N.match(/[*X#]{3,}\s*([0-9OIlSB]{4})\b/);
    const last4 = l4 ? digits(l4[1]) : "";
    return { doc, okBank, isVoid, cents, code, last4 };
  }

  function toGray(rgba, n) {
    const g = new Uint8ClampedArray(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) g[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    return g;
  }

  function pct(g, p) {
    const h = new Uint32Array(256); for (let i = 0; i < g.length; i++) h[g[i]]++;
    let t = g.length * p, s = 0; for (let v = 0; v < 256; v++) { s += h[v]; if (s >= t) return v; } return 255;
  }

  function paperBox(g, w, h) {
    const t = Math.max(120, pct(g, 0.6));
    const seen = new Uint8Array(w * h); let best = null;
    const q = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
      if (seen[s] || g[s] < t) continue;
      let qh = 0, qt = 0, n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      q[qt++] = s; seen[s] = 1;
      while (qh < qt) {
        const p = q[qh++], x = p % w, y = (p / w) | 0; n++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
        for (const k of nb) if (k >= 0 && !seen[k] && g[k] >= t) { seen[k] = 1; q[qt++] = k; }
      }
      if (!best || n > best.n) best = { n, x0, y0, x1, y1 };
    }
    if (!best || best.n < w * h * 0.04) return null;
    const bw = best.x1 - best.x0 + 1, bh = best.y1 - best.y0 + 1;
    if (best.n < bw * bh * 0.35) return null;
    const mx = bw * 0.04 + 1, my = bh * 0.03 + 1;
    const x = Math.max(0, best.x0 - mx), y = Math.max(0, best.y0 - my);
    return { x: x / w, y: y / h, w: (Math.min(w, best.x1 + 1 + mx) - x) / w, h: (Math.min(h, best.y1 + 1 + my) - y) / h };
  }

  function sharpness(g, w, h) {
    let s = 0, n = 0;
    for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      s += Math.abs(4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]); n++;
    }
    return n ? s / n : 0;
  }

  function enhance(g, w, h) {
    const lo = pct(g, 0.02), hi = Math.max(lo + 1, pct(g, 0.9));
    const k = 255 / (hi - lo);
    const a = new Uint8ClampedArray(g.length);
    for (let i = 0; i < g.length; i++) a[i] = (g[i] - lo) * k;
    const out = new Uint8ClampedArray(g.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { out[i] = a[i]; continue; }
      const b = (a[i - w - 1] + a[i - w] + a[i - w + 1] + a[i - 1] + a[i] + a[i + 1] + a[i + w - 1] + a[i + w] + a[i + w + 1]) / 9;
      out[i] = a[i] + 1.2 * (a[i] - b);
    }
    return out;
  }

  root.P0 = { parse, amountToCents, norm, toGray, paperBox, sharpness, enhance };
  if (typeof module !== "undefined") module.exports = root.P0;
})(typeof window !== "undefined" ? window : globalThis);
