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


// ---------------- objective paper helpers ----------------

function resizeObjectiveQuestions(form, count) {
  const safeCount = Math.max(1, Math.min(100, Number(count) || 1));
  const old = form.objectiveQuestions || [];
  form.objectiveQuestions = Array.from({ length: safeCount }, (_, i) => {
    const existing = old[i];
    if (existing) {
      existing.number = i + 1;
      return existing;
    }
    return makeObjectiveQuestion(i + 1, form.objectiveOptionCount || 4);
  });
  form.objectiveQuestionCount = safeCount;
}

function setObjectiveOptionCount(form, optionCount) {
  const count = Number(optionCount) === 5 ? 5 : 4;
  form.objectiveOptionCount = count;
  (form.objectiveQuestions || []).forEach((q) => {
    const old = q.options || [];
    q.options = Array.from({ length: count }, (_, i) => ({
      label: String.fromCharCode(65 + i),
      text: old[i] ? old[i].text : ""
    }));
  });
}

function parseObjectiveQuestions(rawText) {
  const lines = String(rawText || "").replace(/\r/g, "").split("\n");
  const parsed = [];
  let currentQuestion = null;
  let currentOption = null;
  let detectedFiveOptions = false;

  lines.forEach((line) => {
    if (/^\s*Answer\s*:/i.test(line)) return;

    const questionMatch = line.match(/^\s*(\d+)\s*[.)]\s*(.*)$/);
    if (questionMatch) {
      currentQuestion = {
        number: parsed.length + 1,
        text: questionMatch[2] || "",
        options: []
      };
      parsed.push(currentQuestion);
      currentOption = null;
      return;
    }

    const optionMatch = line.match(/^\s*([A-E])\s*[.)]\s*(.*)$/i);
    if (optionMatch && currentQuestion) {
      const label = optionMatch[1].toUpperCase();
      if (label === "E") detectedFiveOptions = true;
      currentOption = { label, text: optionMatch[2] || "" };
      const existingIndex = currentQuestion.options.findIndex((o) => o.label === label);
      if (existingIndex >= 0) currentQuestion.options[existingIndex] = currentOption;
      else currentQuestion.options.push(currentOption);
      return;
    }

    if (!currentQuestion || !line.trim() && !currentQuestion.text && !currentOption) return;
    // A blank separator after an option should not become a stray trailing newline.
    if (!line.trim() && currentOption) return;

    if (currentOption) {
      currentOption.text += (currentOption.text ? "\n" : "") + line;
    } else {
      currentQuestion.text += (currentQuestion.text ? "\n" : "") + line;
    }
  });

  const totalFound = parsed.length;
  const optionCount = detectedFiveOptions ? 5 : 4;
  const questions = parsed.slice(0, 100).map((q, i) => ({
    number: i + 1,
    text: q.text,
    options: Array.from({ length: optionCount }, (_, j) => {
      const label = String.fromCharCode(65 + j);
      const found = q.options.find((o) => o.label === label);
      return { label, text: found ? found.text : "" };
    })
  }));

  return {
    questions,
    totalFound,
    optionCount,
    truncated: totalFound > 100
  };
}
