// ---------------- rendering ----------------
  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderNewPanel() {
    const f = state.form;
    const rule = RULES[f.creditUnit];
    const panel = document.getElementById("rea-panel-new");
    panel.innerHTML = `
      <div class="rea-section">
        <div class="rea-section-title">Your details</div>
        <div class="rea-field">
          <label>Your name</label>
          <input type="text" id="f-lecturer" value="${escAttr(f.lecturerName)}" placeholder="e.g. Dr. Ade Bello">
        </div>
      </div>

      <div class="rea-section">
        <div class="rea-section-title">Course details</div>
        <div class="rea-grid">
          <div class="rea-field"><label>Course code</label><input type="text" id="f-code" value="${escAttr(f.courseCode)}" placeholder="e.g. CRS 303"></div>
          <div class="rea-field"><label>Course title</label><input type="text" id="f-title" value="${escAttr(f.courseTitle)}" placeholder="e.g. History of Reformation"></div>
        </div>
        <div class="rea-field">
          <label>Credit unit</label>
          <div class="rea-credit-toggle">
            <button type="button" class="rea-credit-btn ${f.creditUnit === 2 ? "active" : ""}" data-credit="2">2 Units<span class="rea-credit-sub">5 questions · answer 3 · 20 marks each</span></button>
            <button type="button" class="rea-credit-btn ${f.creditUnit === 3 ? "active" : ""}" data-credit="3">3 Units<span class="rea-credit-sub">6 questions · answer 4 · 15 marks each</span></button>
          </div>
        </div>
        <div class="rea-grid">
          <div class="rea-field"><label>Time allowed</label><input type="text" id="f-time" value="${escAttr(f.timeAllowed)}"></div>
          <div class="rea-field"><label>Mark obtainable (%)</label><input type="number" id="f-mark" value="${f.markObtainable}"></div>
        </div>
        <div class="rea-field">
          <label>Instruction</label>
          <input type="text" id="f-instruction" value="${escAttr(f.instruction)}">
          <div class="rea-hint">Auto-filled from the credit unit — edit only if this course's instruction differs.</div>
        </div>
      </div>

      <div class="rea-section">
        <div class="rea-section-title">Exam period</div>
        <div class="rea-grid">
          <div class="rea-field"><label>Session</label><input type="text" id="f-session" value="${escAttr(f.session)}" placeholder="2025/2026"></div>
          <div class="rea-field"><label>Semester</label>
            <select id="f-semester">
              <option ${f.semester === "First" ? "selected" : ""}>First</option>
              <option ${f.semester === "Second" ? "selected" : ""}>Second</option>
            </select>
          </div>
          <div class="rea-field"><label>Month</label>
            <select id="f-month">${MONTHS.map(m => `<option ${m === f.month ? "selected" : ""}>${m}</option>`).join("")}</select>
          </div>
          <div class="rea-field"><label>Year</label><input type="number" id="f-year" value="${f.year}"></div>
        </div>
      </div>

      <div class="rea-section">
        <div class="rea-section-title">Questions (${rule.numQuestions} required, answer 1 &amp; ${rule.answerCount - 1} others)</div>
        <div id="rea-questions"></div>
      </div>

      <button class="rea-btn-primary" id="rea-generate">Generate &amp; download Word document</button>
      <div class="rea-status ${state.statusType}" id="rea-status">${state.statusMsg}</div>
    `;

    const qWrap = panel.querySelector("#rea-questions");
    f.questions.forEach((q, qi) => qWrap.appendChild(renderQuestionCard(q, qi)));

    // wire top-level fields
    panel.querySelector("#f-lecturer").addEventListener("input", (e) => f.lecturerName = e.target.value);
    panel.querySelector("#f-code").addEventListener("input", (e) => f.courseCode = e.target.value);
    panel.querySelector("#f-title").addEventListener("input", (e) => f.courseTitle = e.target.value);
    panel.querySelector("#f-time").addEventListener("input", (e) => f.timeAllowed = e.target.value);
    panel.querySelector("#f-mark").addEventListener("input", (e) => f.markObtainable = Number(e.target.value));
    panel.querySelector("#f-instruction").addEventListener("input", (e) => { f.instruction = e.target.value; f.instructionTouched = true; });
    panel.querySelector("#f-session").addEventListener("input", (e) => f.session = e.target.value);
    panel.querySelector("#f-semester").addEventListener("change", (e) => f.semester = e.target.value);
    panel.querySelector("#f-month").addEventListener("change", (e) => f.month = e.target.value);
    panel.querySelector("#f-year").addEventListener("input", (e) => f.year = Number(e.target.value));

    panel.querySelectorAll(".rea-credit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cu = Number(btn.dataset.credit);
        if (cu === f.creditUnit) return;
        f.creditUnit = cu;
        const r = RULES[cu];
        if (!f.instructionTouched) f.instruction = `Answer Question 1 & ${r.answerWord} others`;
        const old = f.questions;
        f.questions = Array.from({ length: r.numQuestions }, (_, i) => {
          if (old[i]) {
            const q = old[i];
            q.number = i + 1;
            reapplyAutoMarks(q, r.marksPerQuestion);
            return q;
          }
          return makeEmptyQuestion(i + 1, r.marksPerQuestion);
        });
        render();
      });
    });

    panel.querySelector("#rea-generate").addEventListener("click", onGenerate);
  }

  function renderQuestionCard(q, qi) {
    const f = state.form;
    const target = RULES[f.creditUnit].marksPerQuestion;
    const total = questionTotal(q);
    const ok = total === target;
    const card = el(`<div class="rea-question-card">
      <div class="rea-question-head">
        <span class="rea-question-num">Question ${q.number}</span>
        <span class="rea-marks-badge ${ok ? "" : "bad"}">${total} / ${target} marks</span>
      </div>
      <div class="rea-toggle-row">
        <label class="rea-checkbox"><input type="checkbox" class="q-split" ${q.split ? "checked" : ""}> Split into parts (a, b, c…)</label>
        <label class="rea-checkbox" style="${q.split ? "" : "display:none;"}"><input type="checkbox" class="q-auto" ${q.autoAssign ? "checked" : ""}> Auto-assign marks evenly</label>
      </div>
      <div class="q-parts"></div>
      <button type="button" class="rea-add-part" style="${q.split ? "" : "display:none;"}">+ Add part</button>
    </div>`);

    const partsWrap = card.querySelector(".q-parts");
    q.parts.forEach((p, pi) => partsWrap.appendChild(renderPartRow(q, p, pi, target)));

    card.querySelector(".q-split").addEventListener("change", (e) => {
      q.split = e.target.checked;
      if (!q.split) {
        // collapse to single part, keep first part's text, full marks
        q.parts = [{ label: "a", text: q.parts[0].text, marks: target }];
        q.autoAssign = true;
      } else if (q.parts.length === 1) {
        q.parts.push({ label: "b", text: "", marks: 0 });
        reapplyAutoMarks(q, target);
      }
      render();
    });
    card.querySelector(".q-auto").addEventListener("change", (e) => {
      q.autoAssign = e.target.checked;
      reapplyAutoMarks(q, target);
      render();
    });
    card.querySelector(".rea-add-part").addEventListener("click", () => {
      if (q.parts.length >= 8) return;
      const label = LETTERS[q.parts.length];
      q.parts.push({ label, text: "", marks: 0 });
      reapplyAutoMarks(q, target);
      render();
    });

    return card;
  }

  function renderPartRow(q, p, pi, target) {
    const showLabel = q.split;
    const row = el(`<div class="rea-part-row">
      <div class="rea-part-label">${showLabel ? "(" + p.label + ")" : ""}</div>
      <textarea rows="2" placeholder="Question text…">${escHtml(p.text)}</textarea>
      <input type="number" class="p-marks" value="${p.marks}" min="0" ${q.autoAssign ? "disabled" : ""}>
      <button type="button" class="rea-part-remove" style="${q.split && q.parts.length > 2 ? "" : "visibility:hidden;"}">✕</button>
    </div>`);
    row.querySelector("textarea").addEventListener("input", (e) => { p.text = e.target.value; });
    row.querySelector(".p-marks").addEventListener("input", (e) => {
      p.marks = Number(e.target.value) || 0;
      // live-update badge without full rerender (avoid losing focus)
      const card = row.closest(".rea-question-card");
      const badge = card.querySelector(".rea-marks-badge");
      const total = questionTotal(q);
      badge.textContent = `${total} / ${target} marks`;
      badge.className = "rea-marks-badge" + (total === target ? "" : " bad");
    });
    row.querySelector(".rea-part-remove").addEventListener("click", () => {
      q.parts.splice(pi, 1);
      q.parts.forEach((pp, i) => pp.label = LETTERS[i]);
      reapplyAutoMarks(q, target);
      render();
    });
    return row;
  }

  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }
  function escHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function onGenerate() {
    const f = state.form;
    const errs = validate(f);
    const statusEl = document.getElementById("rea-status");
    if (errs.length) {
      state.statusType = "err";
      state.statusMsg = errs[0] + (errs.length > 1 ? ` (+${errs.length - 1} more)` : "");
      statusEl.className = "rea-status err";
      statusEl.textContent = state.statusMsg;
      return;
    }
    const btn = document.getElementById("rea-generate");
    btn.disabled = true; btn.textContent = "Generating…";
    try {
      const docData = submissionToDocData(f);
      const blob = await generateDocx(docData);
      const filename = `${(f.courseCode || "Exam").replace(/\s+/g, "_")}_Exam_Questions.docx`;
      downloadBlob(blob, filename);

      const record = {
        id: "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        timestamp: new Date().toISOString(),
        lecturerName: f.lecturerName,
        courseCode: f.courseCode,
        courseTitle: f.courseTitle,
        session: f.session,
        semester: f.semester,
        month: f.month,
        year: f.year,
        creditUnit: f.creditUnit,
        timeAllowed: f.timeAllowed,
        markObtainable: f.markObtainable,
        instruction: f.instruction,
        questions: f.questions,
      };
      statusEl.className = "rea-status";
      statusEl.textContent = "Document generated. Saving to Google Drive and recording the submission…";
      await persistSubmission(record, blob, filename);
      setTimeout(loadSaved, 800);

      statusEl.className = "rea-status ok";
      statusEl.textContent = "Downloaded — and saved to Google Drive.";
      state.form = makeForm();
      render();
    } catch (e) {
      statusEl.className = "rea-status err";
      statusEl.textContent = "Something went wrong generating the document: " + e.message;
    } finally {
      const b = document.getElementById("rea-generate");
      if (b) { b.disabled = false; b.textContent = "Generate & download Word document"; }
    }
  }

  function renderSavedPanel() {
    const panel = document.getElementById("rea-panel-saved");
    if (state.savedLoading || state.savedList === null) {
      panel.innerHTML = `<div class="rea-empty">Loading saved submissions…</div>`;
      return;
    }
    if (state.savedList.length === 0) {
      panel.innerHTML = `<div class="rea-empty">No submissions yet. Once a lecturer generates a document, it will appear here for the exam office.</div>
        <div class="rea-note">This list is shared — anyone using this page's link can see and download every submission listed here.</div>`;
      return;
    }
    panel.innerHTML = `<div class="rea-sub-list"></div>
      <div class="rea-note">This list is shared — anyone using this page's link can see and download every submission listed here.</div>`;
    const list = panel.querySelector(".rea-sub-list");
    state.savedList.forEach((rec) => {
      const date = new Date(rec.timestamp);
      const dateStr = date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " · " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      const item = el(`<div class="rea-sub-item">
        <div class="rea-sub-main">
          <strong>${escHtml(rec.courseCode)} — ${escHtml(rec.courseTitle)}</strong>
          <div class="rea-sub-meta">${escHtml(rec.lecturerName)} · ${rec.creditUnit} Units · ${dateStr}</div>
        </div>
        <div class="rea-sub-actions">
          <button class="rea-btn-small dl">Download</button>
          <button class="rea-btn-small danger del">Delete</button>
        </div>
      </div>`);
      item.querySelector(".dl").addEventListener("click", async (e) => {
        e.target.textContent = "…";
        const blob = await generateDocx(submissionToDocData(rec));
        downloadBlob(blob, `${rec.courseCode.replace(/\s+/g, "_")}_Exam_Questions.docx`);
        e.target.textContent = "Download";
      });
      item.querySelector(".del").addEventListener("click", () => {
        if (confirm(`Delete the saved submission for ${rec.courseCode}?`)) deleteSubmission(rec.id);
      });
      list.appendChild(item);
    });
  }

  function render() {
    document.querySelectorAll(".rea-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === state.tab));
    document.getElementById("rea-panel-new").style.display = state.tab === "new" ? "" : "none";
    document.getElementById("rea-panel-saved").style.display = state.tab === "saved" ? "" : "none";
    if (state.tab === "new") renderNewPanel();
    else renderSavedPanel();
  }
