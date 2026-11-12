document.querySelectorAll(".rea-tab").forEach((t) => {
    t.addEventListener("click", () => {
      state.tab = t.dataset.tab;
      if (state.tab === "saved" && state.savedList === null) loadSaved();
      render();
    });
  });

  // A dashboard shortcut can open saved submissions directly.
  if (window.location.hash === '#saved') {
    state.tab = 'saved';
    loadSaved();
  } else {
    render();
  }

