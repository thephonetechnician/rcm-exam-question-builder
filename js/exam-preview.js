/* Render the existing Word XML as a safe, local layout guide. No save/network calls. */
(() => {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const children = (node, name) => Array.from(node.children).filter(n => n.localName === name);
  const child = (node, name) => children(node, name)[0];
  const attr = (node, name) => node?.getAttributeNS(W, name) || '';
  const pt = value => (Number(value) || 0) / 20 + 'pt';
  const paper = document.getElementById('builder-paper');
  if (!paper) return;
  const workspace = document.getElementById('builder-workspace');
  const viewport = document.querySelector('.builder-paper-viewport');
  let frame;

  function paragraph(xml) {
    const p = document.createElement('p'), props = child(xml, 'pPr');
    if (props) {
      p.style.textAlign = attr(child(props, 'jc'), 'val') || 'left';
      const indent = child(props, 'ind'), spacing = child(props, 'spacing');
      p.style.marginLeft = pt(attr(indent, 'left'));
      p.style.marginRight = pt(attr(indent, 'right'));
      p.style.textIndent = pt(-Number(attr(indent, 'hanging')));
      p.style.marginTop = pt(attr(spacing, 'before'));
      p.style.marginBottom = pt(attr(spacing, 'after'));
      const line = Number(attr(spacing, 'line'));
      if (line) p.style.lineHeight = attr(spacing, 'lineRule') === 'exact' ? line / 20 + 'pt' : String(line / 240);
      if (child(props, 'pBdr')) { p.classList.add('paper-rule-line'); }
    }
    for (const r of children(xml, 'r')) {
      const span = document.createElement('span'), rp = child(r, 'rPr');
      if (rp) {
        if (child(rp, 'b')) span.style.fontWeight = 'bold';
        if (child(rp, 'i')) span.style.fontStyle = 'italic';
        const size = attr(child(rp, 'sz'), 'val');
        if (size) span.style.fontSize = Number(size) / 2 + 'pt';
      }
      for (const node of r.children) {
        if (node.localName === 't') span.append(document.createTextNode(node.textContent));
        if (node.localName === 'br') span.append(document.createElement('br'));
        if (node.localName === 'drawing') {
          const img = document.createElement('img');
          const blip = Array.from(node.getElementsByTagName('*')).find(n => n.localName === 'blip');
          const rel = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
          img.src = rel==='rId1'?'data:image/png;base64,'+LOGO_CREST_B64:window.RCMBranding?.logoData||'data:image/png;base64,'+LOGO_EMBLEM_B64;
          img.alt = ''; img.width = 91; img.height = rel === 'rId1' ? 91 : 85; span.append(img);
        }
      }
      p.append(span);
    }
    return p;
  }
  function table(xml) {
    const t = document.createElement('table'), cols = document.createElement('colgroup');
    const grid = child(xml, 'tblGrid');
    for (const col of grid ? children(grid, 'gridCol') : []) {
      const c = document.createElement('col'); c.style.width = Number(attr(col, 'w')) / 10466 * 100 + '%'; cols.append(c);
    }
    t.append(cols);
    const bordered = child(child(xml, 'tblPr'), 'tblBorders');
    if (bordered && attr(child(bordered, 'insideV'), 'val') === 'single') t.classList.add('paper-info');
    const body = document.createElement('tbody');
    for (const row of children(xml, 'tr')) {
      const tr = document.createElement('tr');
      for (const cell of children(row, 'tc')) {
        const td = document.createElement('td');
        for (const p of children(cell, 'p')) td.append(paragraph(p));
        tr.append(td);
      }
      body.append(tr);
    }
    t.append(body); return t;
  }
  function fit() {
    if (viewport.clientWidth) paper.style.zoom = document.getElementById('builder-preview-size').value === 'actual' ? 1 : Math.min(1, Math.max(.2, (viewport.clientWidth - 32) / 794));
  }
  function update() {
    const saved = state.tab !== 'new';
    workspace.hidden = saved;
    document.getElementById('builder-view-switch').hidden = saved;
    if (saved) { paper.replaceChildren(); return; }
    const xml = new DOMParser().parseFromString(buildDocumentXml(submissionToDocData({...state.form, includeSignatureLines: document.getElementById('builder-signatures')?.checked === true})), 'application/xml');
    const body = xml.getElementsByTagNameNS(W, 'body')[0];
    if (!body) { paper.textContent = 'Preview is unavailable. Continue editing and try again.'; return; }
    paper.replaceChildren(...Array.from(body.children).flatMap(n => n.localName === 'p' ? [paragraph(n)] : n.localName === 'tbl' ? [table(n)] : []));
    fit();
    // Associate the existing editor's visible field labels without altering form behaviour.
    document.querySelectorAll('#rea-panel-new .rea-field').forEach((field, i) => {
      const label = field.querySelector('label'), input = field.querySelector('input,select,textarea');
      if (label && input) { if (!input.id) input.id = 'builder-field-' + i; label.htmlFor = input.id; }
    });
    document.querySelectorAll('#rea-panel-new textarea').forEach((input, i) => {
      if (!input.labels.length && !input.hasAttribute('aria-label')) input.setAttribute('aria-label', 'Question content ' + (i + 1));
    });
    const type = document.getElementById('f-paper-type');
    if (type) type.setAttribute('aria-label', 'Type of paper');
  }
  function refresh() { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }
  function view(mode) {
    workspace.dataset.view = mode;
    document.getElementById('builder-edit-view').setAttribute('aria-pressed', String(mode === 'edit'));
    document.getElementById('builder-preview-view').setAttribute('aria-pressed', String(mode === 'preview'));
    fit();
  }
  document.getElementById('builder-edit-view').addEventListener('click', () => view('edit'));
  document.getElementById('builder-preview-view').addEventListener('click', () => view('preview'));
  document.getElementById('builder-preview-size').addEventListener('change', fit);
  document.getElementById('builder-signatures').addEventListener('change', refresh);
  document.getElementById('rea-panel-new').addEventListener('input', refresh);
  document.getElementById('rea-panel-new').addEventListener('change', refresh);
  document.getElementById('rea-panel-new').addEventListener('click', event => { if (event.target.closest('.gap-insert')) refresh(); });
  new ResizeObserver(fit).observe(viewport);
  window.ExamPreview = Object.freeze({refresh});
})();
