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

  root.P0 = { parse, amountToCents, norm };
  if (typeof module !== "undefined") module.exports = root.P0;
})(typeof window !== "undefined" ? window : globalThis);
