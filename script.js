
const BACKEND_URL =
  "https://website-builder-backend-nu.vercel.app/api/generate";

/* ELEMENTS */
const canvas = document.getElementById("particleCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const promptInput = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const errorBox = document.getElementById("error");
const emptyState = document.getElementById("emptyState");
const previewSection = document.getElementById("previewSection");
const preview = document.getElementById("preview");
const refreshBtn = document.getElementById("refreshBtn");
const openBtn = document.getElementById("openBtn");
const downloadBtn = document.getElementById("downloadBtn");
const toast = document.getElementById("toast");

let currentWebsite = null;
let currentHTML = "";
let activeObjectURL = null;
let requestController = null;

/* PARTICLE BACKGROUND */
let particles = [];
const mouse = { x: null, y: null, radius: 140 };

function resizeCanvas() {
  if (!canvas || !ctx) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  createParticles();
}

function createParticles() {
  if (!canvas || !ctx) return;

  particles = [];
  const amount = Math.min(
    110,
    Math.max(
      45,
      Math.floor((window.innerWidth * window.innerHeight) / 14000)
    )
  );

  for (let i = 0; i < amount; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.6 + 0.6,
      alpha: Math.random() * 0.45 + 0.12
    });
  }
}

function drawParticles() {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;

    if (p.x < -10) p.x = window.innerWidth + 10;
    if (p.x > window.innerWidth + 10) p.x = -10;
    if (p.y < -10) p.y = window.innerHeight + 10;
    if (p.y > window.innerHeight + 10) p.y = -10;

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mouse.radius && distance > 0) {
        const force = (mouse.radius - distance) / mouse.radius;
        p.x -= (dx / distance) * force * 0.35;
        p.y -= (dy / distance) * force * 0.35;
      }
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(186,255,61,${p.alpha})`;
    ctx.fill();

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 105) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(186,255,61,${(1 - distance / 105) * 0.09})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(drawParticles);
}

if (canvas && ctx) {
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("mousemove", event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  resizeCanvas();
  drawParticles();
}

/* UI HELPERS */
function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

function showError(message) {
  if (!errorBox) return;

  errorBox.textContent = message;
  errorBox.classList.add("show");
}

function hideError() {
  if (!errorBox) return;

  errorBox.textContent = "";
  errorBox.classList.remove("show");
}

function setLoading(active) {
  if (loading) loading.classList.toggle("show", active);
  if (generateBtn) {
    generateBtn.disabled = active;
    generateBtn.innerHTML = active
      ? "◌ Building..."
      : "<span>✦</span> Generate";
  }
}

/* NORMALIZE THE BACKEND HTML */
function createDocument(result) {
  // The supplied backend returns { success, html, model, usage }.
  // It does not return separate html/css/js fields.
  let html = "";

  if (typeof result === "string") {
    html = result;
  } else if (result && typeof result.html === "string") {
    html = result.html;
  } else {
    throw new Error("The backend response did not contain an HTML document.");
  }

  html = html
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Remove accidental wrapping quotes, if present.
  if (
    (html.startsWith('"') && html.endsWith('"')) ||
    (html.startsWith("'") && html.endsWith("'"))
  ) {
    html = html.slice(1, -1).trim();
  }

  const doctypeIndex = html.toLowerCase().indexOf("<!doctype html>");
  if (doctypeIndex > 0) html = html.slice(doctypeIndex);

  if (!html.toLowerCase().includes("<html")) {
    throw new Error("The AI response is not a complete HTML document.");
  }

  const requiredTags = [
    "<head",
    "</head>",
    "<body",
    "</body>",
    "</html>"
  ];

  const lower = html.toLowerCase();
  for (const tag of requiredTags) {
    if (!lower.includes(tag)) {
      throw new Error(`Generated website is missing ${tag}.`);
    }
  }

  return html;
}

/* RENDER WEBSITE */
function renderWebsite(result) {
  const documentHTML = createDocument(result);

  if (!documentHTML.trim()) {
    throw new Error("The AI returned an empty website.");
  }

  currentWebsite = result;
  currentHTML = documentHTML;

  // srcdoc renders the full HTML document inside the iframe.
  preview.srcdoc = documentHTML;

  // Ensure the iframe is not hidden by an earlier state.
  preview.hidden = false;
  preview.style.display = "block";

  if (emptyState) {
    emptyState.style.display = "none";
    emptyState.hidden = true;
  }

  if (previewSection) {
    previewSection.classList.add("show");
    previewSection.style.display = "";
  }

  preview.addEventListener("load", () => {
    console.log("Preview iframe loaded.");
  }, { once: true });

  console.log("Website generated:", documentHTML.length, "characters");

  setTimeout(() => {
    previewSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
}

/* GENERATE WEBSITE */
async function generateWebsite() {
  if (!promptInput || !generateBtn) {
    showError("Could not find the prompt input or Generate button in your HTML.");
    return;
  }

  const prompt = promptInput.value.trim();

  if (!prompt) {
    showError("Describe the website you want Sambhav AI to build.");
    promptInput.focus();
    return;
  }

  hideError();
  setLoading(true);

  const messages = [
    "Understanding your idea...",
    "Planning the layout...",
    "Designing the interface...",
    "Writing the website...",
    "Adding interactions...",
    "Preparing the preview..."
  ];

  let messageIndex = 0;
  if (loadingText) loadingText.textContent = messages[0];

  const messageTimer = setInterval(() => {
    messageIndex = (messageIndex + 1) % messages.length;
    if (loadingText) loadingText.textContent = messages[messageIndex];
  }, 1400);

  requestController = new AbortController();
  const timeout = setTimeout(() => requestController?.abort(), 90000);

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt }),
      signal: requestController.signal
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Backend returned an invalid JSON response.");
    }

    if (!response.ok || data.success !== true) {
      throw new Error(data.error || `Backend request failed (HTTP ${response.status}).`);
    }

    if (typeof data.html !== "string" || !data.html.trim()) {
      throw new Error("The AI did not return website HTML.");
    }

    renderWebsite(data);
    showToast("Website generated successfully.");
  } catch (error) {
    console.error("Sambhav AI error:", error);

    if (error.name === "AbortError") {
      showError("Website generation timed out. Please try again.");
    } else {
      showError(error.message || "Failed to generate website.");
    }
  } finally {
    clearTimeout(timeout);
    clearInterval(messageTimer);
    requestController = null;
    setLoading(false);
  }
}

/* GENERATE BUTTON */
if (generateBtn) {
  generateBtn.addEventListener("click", event => {
    event.preventDefault();
    generateWebsite();
  });
}

/* CTRL / CMD + ENTER */
if (promptInput) {
  promptInput.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      generateWebsite();
    }
  });

  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height =
      Math.min(promptInput.scrollHeight, 350) + "px";
  });
}

/* EXAMPLE PROMPTS */
document.querySelectorAll(".example-btn").forEach(button => {
  button.addEventListener("click", () => {
    if (!promptInput) return;

    promptInput.value = button.dataset.prompt || "";
    promptInput.focus();
    promptInput.style.height = "auto";
    promptInput.style.height = promptInput.scrollHeight + "px";
  });
});

/* REFRESH */
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    if (!currentHTML || !preview) return;

    preview.srcdoc = "";
    requestAnimationFrame(() => {
      preview.srcdoc = currentHTML;
    });

    showToast("Preview refreshed.");
  });
}

/* OPEN WEBSITE */
if (openBtn) {
  openBtn.addEventListener("click", () => {
    if (!currentHTML) return;

    const blob = new Blob([currentHTML], { type: "text/html;charset=utf-8" });

    if (activeObjectURL) URL.revokeObjectURL(activeObjectURL);
    activeObjectURL = URL.createObjectURL(blob);

    const newTab = window.open(activeObjectURL, "_blank");

    if (!newTab) {
      showError("The browser blocked the new tab. Allow pop-ups or download the HTML instead.");
      return;
    }

    showToast("Website opened in a new tab.");
  });
}

/* DOWNLOAD */
if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    if (!currentHTML) return;

    const blob = new Blob([currentHTML], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "sambhav-ai-website.html";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Website downloaded.");
  });
}

/* CLEAR */
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (requestController) requestController.abort();

    if (promptInput) promptInput.value = "";
    currentWebsite = null;
    currentHTML = "";

    if (preview) {
      preview.srcdoc = "";
      preview.hidden = true;
      preview.style.display = "none";
    }

    if (previewSection) previewSection.classList.remove("show");

    if (emptyState) {
      emptyState.hidden = false;
      emptyState.style.display = "";
    }

    hideError();
    showToast("Builder cleared.");
  });
}

window.addEventListener("beforeunload", () => {
  if (activeObjectURL) URL.revokeObjectURL(activeObjectURL);
});
