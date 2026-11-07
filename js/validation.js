// ---------------- validation ----------------
function validate(f) {
  const errs = [];
  if (!f.lecturerName.trim()) errs.push("Enter your name (kept with the record for the exam office).");
  if (!f.courseCode.trim()) errs.push("Enter the course code.");
  if (!f.courseTitle.trim()) errs.push("Enter the course title.");
  if (!f.pin || String(f.pin).length < 6) errs.push("Set a PIN with at least 6 characters before saving.");

  if (f.paperType === "German") {
    const qs=f.germanQuestions||[]; if(!qs.length||qs.length>100) errs.push("German papers must contain between 1 and 100 questions."); qs.forEach(q=>{if(!String(q.text||"").trim())errs.push(`Question ${q.number} is empty.`);}); return errs;
  }
  if (f.paperType === "Sectioned") {
    if(!(f.sections||[]).length) errs.push("Add at least one section.");
    (f.sections||[]).forEach((sec,si)=>{if(!sec.questions?.length)errs.push(`Section ${String.fromCharCode(65+si)} has no questions.`);sec.questions.forEach((q,qi)=>{if(!String(q.text||"").trim())errs.push(`Section ${String.fromCharCode(65+si)}, question ${qi+1} is empty.`);if(sec.type==="Objective")(q.options||[]).forEach(o=>{if(!String(o.text||"").trim())errs.push(`Section ${String.fromCharCode(65+si)}, question ${qi+1}, option ${o.label} is empty.`);});});}); return errs;
  }
  if (f.paperType === "Objective") {
    const questions = f.objectiveQuestions || [];
    if (questions.length < 1 || questions.length > 100) errs.push("Objective papers must contain between 1 and 100 questions.");
    questions.forEach((q) => {
      if (!String(q.text || "").trim()) errs.push(`Question ${q.number} is empty.`);
      (q.options || []).forEach((option) => {
        if (!String(option.text || "").trim()) errs.push(`Question ${q.number}, option ${option.label}, is empty.`);
      });
    });
    return errs;
  }

  f.questions.forEach((q) => {
    q.parts.forEach((p) => {
      if (!p.text.trim()) errs.push(`Question ${q.number}${q.parts.length > 1 ? "(" + p.label + ")" : ""} is empty.`);
    });
    const target = RULES[f.creditUnit].marksPerQuestion;
    if (questionTotal(q) !== target) errs.push(`Question ${q.number}'s marks add up to ${questionTotal(q)}, not ${target}.`);
  });
  return errs;
}
