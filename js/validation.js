// ---------------- validation ----------------
  function validate(f) {
    const errs = [];
    if (!f.lecturerName.trim()) errs.push("Enter your name (kept with the record for the exam office).");
    if (!f.courseCode.trim()) errs.push("Enter the course code.");
    if (!f.courseTitle.trim()) errs.push("Enter the course title.");
    f.questions.forEach((q) => {
      q.parts.forEach((p) => {
        if (!p.text.trim()) errs.push(`Question ${q.number}${q.parts.length > 1 ? "(" + p.label + ")" : ""} is empty.`);
      });
      const target = RULES[f.creditUnit].marksPerQuestion;
      if (questionTotal(q) !== target) errs.push(`Question ${q.number}'s marks add up to ${questionTotal(q)}, not ${target}.`);
    });
    return errs;
  }
