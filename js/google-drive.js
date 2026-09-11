// ---------------- Google Sheets submission storage ----------------
  const GOOGLE_DRIVE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxufUsWhlmpSf_kS0ofvYbcWmVfUtko18RP8xau2o2g89PUI3kCfbZajXsMnW2D3fU_lA/exec";

  let state = { tab: "new", form: makeForm(), savedList: null, savedLoading: false, statusMsg: "", statusType: "" };

  function loadSaved() {
    state.savedLoading = true;
    render();
    const callbackName = "rcmSubmissions_" + Date.now();
    const script = document.createElement("script");
    let finished = false;
    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[callbackName]; } catch (_) {}
    };
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true; cleanup();
      state.savedList = [];
      state.savedLoading = false;
      state.statusType = "err";
      state.statusMsg = "Could not load saved submissions. Please check the Google Drive service deployment.";
      render();
    }, 10000);
    window[callbackName] = (data) => {
      if (finished) return;
      finished = true; clearTimeout(timer); cleanup();
      state.savedList = Array.isArray(data && data.submissions) ? data.submissions : [];
      state.savedLoading = false;
      render();
    };
    script.onerror = () => {
      if (finished) return;
      finished = true; clearTimeout(timer); cleanup();
      state.savedList = []; state.savedLoading = false;
      state.statusType = "err";
      state.statusMsg = "Could not load saved submissions.";
      render();
    };
    script.src = GOOGLE_DRIVE_WEB_APP_URL + "?action=list&callback=" + encodeURIComponent(callbackName);
    document.body.appendChild(script);
  }

  async function persistSubmission(record, blob, filename) {
    const fileBase64 = await blobToBase64(blob);
    const payload = JSON.stringify({ action: "save", filename, fileBase64, record });
    await fetch(GOOGLE_DRIVE_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload
    });
  }

  async function deleteSubmission(id) {
    try {
      await fetch(GOOGLE_DRIVE_WEB_APP_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "delete", id })
      });
      await loadSaved();
    } catch (e) {
      state.statusType = "err";
      state.statusMsg = "Could not delete the submission: " + e.message;
      render();
    }
  }
