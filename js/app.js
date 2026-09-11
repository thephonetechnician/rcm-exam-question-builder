document.querySelectorAll(".rea-tab").forEach((t) => {
    t.addEventListener("click", () => {
      state.tab = t.dataset.tab;
      if (state.tab === "saved" && state.savedList === null) loadSaved();
      render();
    });
  });

  render();

