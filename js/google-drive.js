// ---------------- Google Sheets submission storage ----------------

const GOOGLE_DRIVE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxufUsWhlmpSf_kS0ofvYbcWmVfUtko18RP8xau2o2g89PUI3kCfbZajXsMnW2D3fU_lA/exec";

let state = {
  tab: "new",
  form: makeForm(),
  savedList: null,
  savedLoading: false,
  statusMsg: "",
  statusType: ""
};


function loadSaved() {

  state.savedLoading = true;
  render();

  const callbackName =
    "rcmSubmissions_" + Date.now();

  const script =
    document.createElement("script");

  let finished = false;


  const cleanup = () => {

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }

    try {
      delete window[callbackName];
    } catch (_) {}
  };


  const timer =
    setTimeout(() => {

      if (finished) return;

      finished = true;

      cleanup();

      state.savedList = [];
      state.savedLoading = false;

      state.statusType = "err";

      state.statusMsg =
        "Could not load saved submissions. Please check the Google Drive service deployment.";

      render();

    }, 10000);


  window[callbackName] =
    (data) => {

      if (finished) return;

      finished = true;

      clearTimeout(timer);
      cleanup();

      state.savedList =
        Array.isArray(
          data && data.submissions
        )
          ? data.submissions
          : [];

      state.savedLoading = false;

      render();
    };


  script.onerror = () => {

    if (finished) return;

    finished = true;

    clearTimeout(timer);
    cleanup();

    state.savedList = [];
    state.savedLoading = false;

    state.statusType = "err";

    state.statusMsg =
      "Could not load saved submissions.";

    render();
  };


  script.src =
    GOOGLE_DRIVE_WEB_APP_URL +
    "?action=list&callback=" +
    encodeURIComponent(callbackName);

  document.body.appendChild(script);
};


// ============================================================
// Convert generated Word document to Base64
// ============================================================

function blobToBase64(blob) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader();


    reader.onloadend = () => {

      const result =
        String(reader.result || "");

      const comma =
        result.indexOf(",");


      resolve(
        comma >= 0
          ? result.slice(comma + 1)
          : result
      );
    };


    reader.onerror = () => {

      reject(
        reader.error ||
        new Error(
          "Could not read the generated document."
        )
      );
    };


    reader.readAsDataURL(blob);

  });
};


// ============================================================
// Save generated exam to Google Drive + Google Sheets
// ============================================================

// ------------------------------------------------------------
// Secure Apps Script POST bridge.
// The PIN travels in the POST body, never in the URL.
// ------------------------------------------------------------

function postSecureAction(payload) {
  return new Promise((resolve, reject) => {
    const requestId = "rcm_req_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const iframeName = "rcm_frame_" + requestId.replace(/[^a-zA-Z0-9_]/g, "");
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";

    const form = document.createElement("form");
    form.method = "POST";
    form.action = GOOGLE_DRIVE_WEB_APP_URL;
    form.target = iframeName;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify({ ...payload, requestId });
    form.appendChild(input);

    let finished = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
    const finish = (fn, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      fn(value);
    };
    const onMessage = (event) => {
      if (!/googleusercontent\.com$|script\.google\.com$/.test(String(event.origin || "").replace(/^https?:\/\//, ""))) return;
      const message = event.data;
      if (!message || message.type !== "RCM_SECURE_RESPONSE" || message.requestId !== requestId) return;
      const data = message.data || {};
      if (data.success) finish(resolve, data);
      else finish(reject, new Error(data.error || "The server rejected the request."));
    };

    const timer = setTimeout(() => {
      finish(reject, new Error("The secure request timed out. Please try again."));
    }, 30000);

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

// ------------------------------------------------------------
// Save generated paper to Drive + Sheets (PIN hash made server-side)
// ------------------------------------------------------------

async function persistSubmission(record, blob, filename, pin) {
  const fileBase64 = await blobToBase64(blob);
  return postSecureAction({
    action: "save",
    filename,
    fileBase64,
    record,
    pin
  });
}

// ------------------------------------------------------------
// Retrieve paper only after server-side PIN verification
// ------------------------------------------------------------

async function getSavedPaper(id, pin) {
  return postSecureAction({ action: "get", id, pin });
}

// ------------------------------------------------------------
// Delete paper only after server-side PIN verification
// ------------------------------------------------------------

async function deleteSubmission(id, pin) {
  const result = await postSecureAction({ action: "delete", id, pin });
  await loadSaved();
  return result;
}
