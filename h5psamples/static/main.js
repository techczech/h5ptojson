document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("details-modal");
  const pre = modal?.querySelector(".modal-pre");
  const closeButton = modal?.querySelector(".close-button");

  const openModal = (payload) => {
    if (!modal || !pre) return;
    pre.textContent = JSON.stringify(payload, null, 2);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  };

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest(".details-btn");
    if (button) {
      const details = button.dataset.details;
      if (details) {
        try {
          openModal(JSON.parse(details));
        } catch (error) {
          openModal({ error: "Unable to parse element JSON", details });
        }
      }
    }

    if (event.target === modal) {
      closeModal();
    }
  });

  closeButton?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  const seedScript = document.getElementById("semantic-seed");
  const semanticSeed = seedScript ? JSON.parse(seedScript.textContent || "{}") : null;
  const exportButton = document.getElementById("export-semantic");

  const getFieldValue = (card, field) => {
    const input = card.querySelector(`[data-field="${field}"]`);
    return input ? input.value.trim() : "";
  };

  const collectAssignments = () => {
    const slides = document.querySelectorAll(".slide-card");
    return Array.from(slides).map((card) => {
      const index = Number(card.dataset.slideIndex);
      return {
        index,
        section: getFieldValue(card, "section"),
        subsection: getFieldValue(card, "subsection"),
        contentType: getFieldValue(card, "contentType"),
      };
    });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  exportButton?.addEventListener("click", async () => {
    if (!semanticSeed) {
      window.alert("Semantic data is unavailable for this package.");
      return;
    }
    exportButton.disabled = true;
    const originalText = exportButton.textContent;
    exportButton.textContent = "Generating…";
    try {
      const response = await fetch("/semantic-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: semanticSeed,
          slides: collectAssignments(),
        }),
      });
      if (!response.ok) {
        const info = await response.json().catch(() => ({}));
        throw new Error(info.error || "Unable to generate semantic JSON");
      }
      const blob = await response.blob();
      downloadBlob(blob, `${semanticSeed.packageId || "semantic"}.json`);
    } catch (error) {
      window.alert(error.message);
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = originalText;
    }
  });
});
