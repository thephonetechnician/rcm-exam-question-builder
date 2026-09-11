// ---------------- marks logic ----------------

  function autoDistribute(total, n) {
    const base = Math.floor(total / n);
    const rem = total % n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
  }

  function reapplyAutoMarks(q, target) {
    if (q.autoAssign) {
      const marks = autoDistribute(target, q.parts.length);
      q.parts.forEach((p, i) => { p.marks = marks[i]; });
    }
  }

  function questionTotal(q) {
    return q.parts.reduce((s, p) => s + (Number(p.marks) || 0), 0);
  }
