const API_URL =
  "https://website-builder-backend-nu.vercel.app/api/generate";

document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const promptInput = document.getElementById("promptInput");

  const landingScreen = document.getElementById("landingScreen");
  const generationScreen = document.getElementById("generationScreen");
  const builderScreen = document.getElementById("builderScreen");

  const progress = document.getElementById("generationProgress");
  const progressText = document.getElementById("progressText");
  const generationTitle = document.getElementById("generationTitle");
  const generationSubtitle = document.getElementById("generationSubtitle");

  const deviceFrame = document.getElementById("deviceFrame");
  const canvasEmpty = document.getElementById("canvasEmpty");
  const websitePreview = document.getElementById("websitePreview");

  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");

  let currentHTML = "";

  function showToast(message) {
    if (toast && toastText) {
      toastText.textContent = message;
      toast.classList.add("show");

      setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    } else {
      alert(message);
    }
  }

  function showScreen(screen) {
    [landingScreen, generationScreen, builderScreen].forEach((item) => {
      if (item) item.hidden = true;
    });

    if (screen) screen.hidden = false;
  }

  function setProgress(value) {
    const percentage = Math.max(0, Math.min(100, value));

    if (progress) progress.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${percentage}%`;

    const progressBar = document.getElementById("generationProgressBar");
    if (progressBar) {
      progressBar.setAttribute("aria-valuenow", String(percentage));
    }
  }

  async function generateWebsite() {
    const prompt = promptInput?.value.trim();

    if (!prompt) {
      showToast("Please describe the website you want to create.");
      promptInput?.focus();
      return;
    }

    if (!generateBtn) return;

    generateBtn.disabled = true;
    generateBtn.setAttribute("aria-busy", "true");

    const originalButtonText = generateBtn.innerHTML;
    generateBtn.textContent = "Generating...";

    showScreen(generationScreen);

    if (generationTitle) {
      generationTitle.textContent = "Turning your idea into a website.";
    }

    if (generationSubtitle) {
      generationSubtitle.textContent = "Connecting to Sambhav AI...";
    }

    setProgress(10);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || `Server error (${response.status})`
        );
      }

      if (data.success === false) {
        throw new Error(data.error || "Website generation failed.");
      }

      if (typeof data.html !== "string" || !data.html.trim()) {
        throw new Error("The API did not return website HTML.");
      }

      currentHTML = data.html;

      setProgress(85);

      if (generationTitle) {
        generationTitle.textContent = "Your website is ready!";
      }

      if (generationSubtitle) {
        generationSubtitle.textContent = "Preparing your live preview...";
      }

      if (!websitePreview || !deviceFrame) {
        throw new Error(
          "Preview elements are missing. Check websitePreview and deviceFrame IDs in index.html."
        );
      }

      websitePreview.srcdoc = currentHTML;

      if (canvasEmpty) canvasEmpty.hidden = true;

      deviceFrame.hidden = false;
      deviceFrame.style.display = "block";

      setProgress(100);
      showScreen(builderScreen);
      showToast("Website generated successfully!");

    } catch (error) {
      console.error("Sambhav AI generation error:", error);

      showScreen(landingScreen);

      showToast(error.message || "Something went wrong. Please try again.");

    } finally {
      generateBtn.disabled = false;
      generateBtn.removeAttribute("aria-busy");
      generateBtn.innerHTML = originalButtonText;
    }
  }

  // Main Generate button
  generateBtn?.addEventListener("click", generateWebsite);

  // Example prompt buttons
  document.querySelectorAll(".example-chip").forEach((button) => {
    button.addEventListener("click", () => {
      if (promptInput) {
        promptInput.value = button.dataset.prompt || "";
        promptInput.focus();
      }
    });
  });

  // Generate from the empty canvas
  document
    .getElementById("emptyGenerateBtn")
    ?.addEventListener("click", () => {
      showScreen(landingScreen);
      promptInput?.focus();
    });

  // Cancel/back buttons
  document
    .getElementById("cancelGenerationBtn")
    ?.addEventListener("click", () => showScreen(landingScreen));

  document
    .getElementById("backToHomeBtn")
    ?.addEventListener("click", () => showScreen(landingScreen));

  // Refresh the generated preview
  document
    .getElementById("refreshBtn")
    ?.addEventListener("click", () => {
      if (websitePreview && currentHTML) {
        websitePreview.srcdoc = currentHTML;
        showToast("Preview refreshed.");
      }
    });

  // Export generated HTML
  document
    .getElementById("exportBtn")
    ?.addEventListener("click", () => {
      if (!currentHTML) {
        showToast("Generate a website before exporting.");
        return;
      }

      const blob = new Blob([currentHTML], {
        type: "text/html;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "sambhav-website.html";
      link.click();

      URL.revokeObjectURL(url);
      showToast("HTML export started.");
    });

  // Press Ctrl/Cmd + Enter to generate
  promptInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      generateWebsite();
    }
  });

  // Initial screen
  showScreen(landingScreen);
});