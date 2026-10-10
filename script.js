
"use strict";

/* =====================================================
   SAMBHAV AI — FRONTEND ENGINE
   Robust generation, visual editor, undo/redo, export
===================================================== */

const BACKEND_URL =
  "https://website-builder-backend-nu.vercel.app/api/generate";

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const state = {
  html: "",
  originalHTML: "",
  history: [],
  historyIndex: -1,
  selectedSelector: null,
  generating: false,
  previewMode: false,
  device: "desktop",
  controller: null,
  toastTimer: null,
  particleFrame: null,
  particleResize: null,
  generationTimer: null,
  startedAt: 0
};

const landing = $("#landingScreen");
const generation = $("#generationScreen");
const builder = $("#builderScreen");
const promptInput = $("#promptInput");
const generateBtn = $("#generateBtn");
const preview = $("#websitePreview");
const deviceFrame = $("#deviceFrame");
const inspector = $(".inspector");
const inspectorContent = $("#inspectorContent");
const layersList = $("#layersList");
const canvasEmpty = $("#canvasEmpty");

/* ------------------ Notifications ------------------ */

function showToast(message, duration = 3500) {
  const toast = $("#toast");
  const text = $("#toastText");

  if (!toast || !text) {
    console.log("[Sambhav]", message);
    return;
  }

  text.textContent = String(message);
  toast.classList.add("show");

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(
    () => toast.classList.remove("show"),
    duration
  );
}

/* ------------------ Screen management ------------------ */

function showLanding() {
  stopParticles();
  stopTimer();

  if (landing) {
    landing.classList.remove("hidden");
    landing.style.display = "block";
  }

  if (generation) {
    generation.classList.add("hidden");
    generation.style.display = "none";
  }

  if (builder) {
    builder.classList.add("hidden");
    builder.style.display = "none";
  }
}

function showGeneration() {
  if (landing) {
    landing.classList.add("hidden");
    landing.style.display = "none";
  }

  if (builder) {
    builder.classList.add("hidden");
    builder.style.display = "none";
  }

  if (generation) {
    generation.classList.remove("hidden");
    generation.style.display = "block";
  }

  startTimer();
  startParticles();
}

function showBuilder() {
  stopParticles();
  stopTimer();

  if (landing) {
    landing.classList.add("hidden");
    landing.style.display = "none";
  }

  if (generation) {
    generation.classList.add("hidden");
    generation.style.display = "none";
  }

  if (builder) {
    builder.classList.remove("hidden");
    builder.style.display = "block";
  }
}

/* ------------------ Generation timer ------------------ */

function startTimer() {
  stopTimer();
  state.startedAt = performance.now();

  state.generationTimer = setInterval(() => {
    const seconds =
      (performance.now() - state.startedAt) / 1000;

    const el = $("#generationTimer");
    if (el) el.textContent = seconds.toFixed(1) + "s";
  }, 100);
}

function stopTimer() {
  clearInterval(state.generationTimer);
  state.generationTimer = null;
}

/* ------------------ Background particles ------------------ */

function stopParticles() {
  if (state.particleFrame) {
    cancelAnimationFrame(state.particleFrame);
    state.particleFrame = null;
  }

  if (state.particleResize) {
    window.removeEventListener(
      "resize",
      state.particleResize
    );
    state.particleResize = null;
  }

  const canvas = $("#particleCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function startParticles() {
  stopParticles();

  const canvas = $("#particleCanvas");
  if (!canvas || !generation) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const particles = [];
  const mobile = window.innerWidth < 700;
  const count = mobile ? 55 : 120;

  function resize() {
    const rect = generation.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.pointerEvents = "none";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();
  state.particleResize = resize;
  window.addEventListener("resize", resize);

  const width = () => generation.clientWidth;
  const height = () => generation.clientHeight;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width(),
      y: Math.random() * height(),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.15
    });
  }

  function draw() {
    if (!generation || generation.style.display === "none") {
      state.particleFrame = null;
      return;
    }

    const w = width();
    const h = height();

    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,195,255,${p.alpha})`;
      ctx.fill();
    }

    if (!mobile) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);

          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle =
              `rgba(190,150,255,${(1 - d / 90) * 0.12})`;
            ctx.stroke();
          }
        }
      }
    }

    state.particleFrame = requestAnimationFrame(draw);
  }

  draw();
}

/* ------------------ Generation progress ------------------ */

function updateGenerationProgress(
  percent, stage, title, subtitle, step
) {
  const progress = $("#generationProgress");
  const progressText = $("#progressText");

  if (progress) progress.style.width = percent + "%";
  if (progressText) progressText.textContent = percent + "%";

  if ($("#generationStage"))
    $("#generationStage").textContent = stage;

  if ($("#generationTitle"))
    $("#generationTitle").textContent = title;

  if ($("#generationSubtitle"))
    $("#generationSubtitle").textContent = subtitle;

  $$(".generation-step").forEach((el, i) => {
    el.classList.toggle("active", i <= step);
  });
}

/* ------------------ HTML helpers ------------------ */

function normalizeHTML(value) {
  let html = String(value || "").trim();

  html = html
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!html) return "";

  if (!/<html[\s>]/i.test(html)) {
    html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>${html}</body>
</html>`;
  }

  if (!/<\/body>/i.test(html)) html += "\n</body>";
  if (!/<\/html>/i.test(html)) html += "\n</html>";

  return html;
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSelector(el) {
  if (!el || el.nodeType !== 1) return null;

  const parts = [];
  let current = el;

  while (current && current.nodeType === 1 &&
         current.tagName.toLowerCase() !== "html") {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      parts.unshift(part + "#" + CSS.escape(current.id));
      break;
    }

    const parent = current.parentElement;

    if (parent) {
      const siblings = [...parent.children].filter(
        item => item.tagName === current.tagName
      );

      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    current = parent;
  }

  return parts.join(" > ");
}

function injectEditorBridge(html) {
  const bridge = `
<script>
(function () {
  function path(el) {
    if (!el || el.nodeType !== 1) return null;
    const parts = [];
    let current = el;

    while (current && current.nodeType === 1 &&
           current.tagName.toLowerCase() !== "html") {
      let part = current.tagName.toLowerCase();

      if (current.id) {
        parts.unshift(part + "#" + CSS.escape(current.id));
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children)
          .filter(x => x.tagName === current.tagName);

        if (siblings.length > 1) {
          part += ":nth-of-type(" +
            (siblings.indexOf(current) + 1) + ")";
        }
      }

      parts.unshift(part);
      current = parent;
    }

    return parts.join(" > ");
  }

  let selected = null;

  function clear() {
    if (selected) {
      selected.style.outline =
        selected.dataset.oldOutline || "";
      selected.style.outlineOffset =
        selected.dataset.oldOutlineOffset || "";
    }
    selected = null;
  }

  function select(el) {
    clear();
    selected = el;

    selected.dataset.oldOutline = selected.style.outline || "";
    selected.dataset.oldOutlineOffset =
      selected.style.outlineOffset || "";

    selected.style.outline = "2px solid #9d76ff";
    selected.style.outlineOffset = "2px";

    const cs = getComputedStyle(el);

    parent.postMessage({
      type: "SAMBHAV_SELECT",
      selector: path(el),
      tag: el.tagName.toLowerCase(),
      text: el.innerText || "",
      color: cs.color,
      background: cs.backgroundColor,
      fontSize: parseInt(cs.fontSize) || 16,
      fontWeight: cs.fontWeight,
      padding: parseInt(cs.paddingTop) || 0,
      radius: parseInt(cs.borderRadius) || 0,
      shadow: cs.boxShadow !== "none"
    }, "*");
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-sambhav-ignore]")) return;
    event.preventDefault();
    event.stopPropagation();
    select(event.target);
  }, true);

  addEventListener("message", function (event) {
    if (event.data && event.data.type === "SAMBHAV_CLEAR") clear();
  });
})();
<\/script>`;

  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, bridge + "\n</body>")
    : html + bridge;
}

/* ------------------ History ------------------ */

function pushHistory(html) {
  if (!html) return;

  if (state.history[state.historyIndex] === html) return;

  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(html);

  if (state.history.length > 50) state.history.shift();

  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undoBtn = $("#undoBtn");
  const redoBtn = $("#redoBtn");

  if (undoBtn) undoBtn.disabled = state.historyIndex <= 0;

  if (redoBtn)
    redoBtn.disabled =
      state.historyIndex >= state.history.length - 1;
}

function restoreHistory() {
  state.html = state.history[state.historyIndex] || "";
  state.selectedSelector = null;

  preview.srcdoc = injectEditorBridge(state.html);
  clearInspector();
  renderLayers();
  updateHistoryButtons();
}

function undo() {
  if (state.historyIndex <= 0) {
    showToast("Nothing to undo.");
    return;
  }

  state.historyIndex--;
  restoreHistory();
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) {
    showToast("Nothing to redo.");
    return;
  }

  state.historyIndex++;
  restoreHistory();
}

/* ------------------ Website loading ------------------ */

function loadWebsite(html, addHistory = true) {
  const clean = normalizeHTML(html);

  if (!clean) {
    showToast("The generated website is empty.");
    return;
  }

  state.html = clean;
  state.previewMode = false;

  if (canvasEmpty) canvasEmpty.classList.add("hidden");

  if (addHistory) pushHistory(clean);

  state.selectedSelector = null;
  preview.srcdoc = injectEditorBridge(clean);

  clearInspector();
  renderLayers();
  updateCanvasSize();
}

function getSelectedElement() {
  if (!state.selectedSelector) return null;

  try {
    return preview.contentDocument.querySelector(
      state.selectedSelector
    );
  } catch {
    return null;
  }
}

function saveCurrentDocument() {
  try {
    const doc = preview.contentDocument;
    if (!doc) return;

    state.html = normalizeHTML(
      "<!DOCTYPE html>\n" + doc.documentElement.outerHTML
    );

    pushHistory(state.html);
    renderLayers();
  } catch (error) {
    console.error("Could not save document:", error);
  }
}

function updateSelectedElement(callback) {
  const el = getSelectedElement();

  if (!el) {
    showToast("Select an element first.");
    return;
  }

  callback(el);
  saveCurrentDocument();
}

/* ------------------ Inspector ------------------ */

function clearInspector() {
  state.selectedSelector = null;

  if ($("#selectedType"))
    $("#selectedType").textContent = "No selection";

  if ($("#mobileSelectionName"))
    $("#mobileSelectionName").textContent = "Nothing selected";

  if (inspectorContent) {
    inspectorContent.innerHTML = `
      <div class="inspector-empty">
        <div class="empty-select-icon">⌁</div>
        <strong>Select an element</strong>
        <p>Click something inside the website preview to edit it.</p>
      </div>`;
  }

  inspector?.classList.remove("mobile-open");
}

function rgbToHex(value) {
  if (!value) return "#ffffff";
  if (value.startsWith("#")) return value;

  const match = value.match(
    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/
  );

  if (!match) return "#ffffff";

  return "#" + match.slice(1, 4).map(x =>
    Number(x).toString(16).padStart(2, "0")
  ).join("");
}

function openInspector(data) {
  const template = $("#inspectorTemplate");
  if (!template || !inspectorContent) return;

  state.selectedSelector = data.selector;
  inspectorContent.innerHTML = "";
  inspectorContent.appendChild(template.content.cloneNode(true));

  if ($("#selectedType"))
    $("#selectedType").textContent = "<" + data.tag + ">";

  if ($("#mobileSelectionName"))
    $("#mobileSelectionName").textContent = data.tag + " selected";

  if (window.innerWidth <= 850)
    inspector?.classList.add("mobile-open");

  $("#editText").value = data.text || "";
  $("#fontSizeInput").value = data.fontSize || 16;
  $("#fontWeightInput").value = data.fontWeight || "400";

  const textColor = rgbToHex(data.color);
  const bgColor = rgbToHex(data.background);

  $("#textColorInput").value = textColor;
  $("#textColorText").value = textColor;
  $("#backgroundColorInput").value = bgColor;
  $("#backgroundColorText").value = bgColor;

  $("#paddingInput").value = data.padding || 0;
  $("#radiusInput").value = data.radius || 0;
  $("#shadowInput").checked = Boolean(data.shadow);

  const bind = (id, fn, event = "input") => {
    const el = $("#" + id);
    if (el) el.addEventListener(event, fn);
  };

  bind("editText", () => updateSelectedElement(
    el => { el.innerText = $("#editText").value; }
  ));

  bind("fontSizeInput", () => updateSelectedElement(
    el => {
      const size = Number($("#fontSizeInput").value);
      if (size >= 8 && size <= 160) el.style.fontSize = size + "px";
    }
  ));

  bind("fontWeightInput", () => updateSelectedElement(
    el => { el.style.fontWeight = $("#fontWeightInput").value; },
    "change"
  ), "change");

  function setColor(inputId, textId, property) {
    const input = $("#" + inputId);
    const text = $("#" + textId);

    const apply = value => {
      const probe = document.createElement("span");
      probe.style.color = "";
      probe.style.color = value;

      if (!probe.style.color) {
        showToast("Enter a valid CSS color.");
        return;
      }

      updateSelectedElement(el => {
        el.style[property] = value;
      });

      if (input && /^#[0-9a-f]{6}$/i.test(value))
        input.value = value;

      if (text) text.value = value;
    };

    input?.addEventListener("input", () => apply(input.value));
    text?.addEventListener("change", () => apply(text.value.trim()));
  }

  setColor("textColorInput", "textColorText", "color");
  setColor("backgroundColorInput", "backgroundColorText", "backgroundColor");

  bind("paddingInput", () => updateSelectedElement(el => {
    el.style.padding = Math.max(
      0, Number($("#paddingInput").value) || 0
    ) + "px";
  }));

  bind("radiusInput", () => updateSelectedElement(el => {
    el.style.borderRadius = Math.max(
      0, Number($("#radiusInput").value) || 0
    ) + "px";
  }));

  bind("shadowInput", () => updateSelectedElement(el => {
    el.style.boxShadow = $("#shadowInput").checked
      ? "0 15px 40px rgba(0,0,0,.22)"
      : "none";
  }), "change");
}

/* ------------------ Layers ------------------ */

function renderLayers() {
  if (!layersList) return;

  const doc = preview?.contentDocument;

  if (!doc?.body) {
    layersList.innerHTML =
      '<div class="layers-empty">Generate a website to see layers.</div>';
    return;
  }

  const elements = [...doc.body.querySelectorAll("*")].slice(0, 80);

  if (!elements.length) {
    layersList.innerHTML =
      '<div class="layers-empty">No editable elements.</div>';
    return;
  }

  layersList.innerHTML = "";

  elements.forEach(el => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "layer-item";

    const tag = el.tagName.toLowerCase();
    const label = (el.innerText || tag).trim().split("\n")[0].slice(0, 25);

    item.innerHTML =
      `<span class="layer-tag">${escapeHTML(tag)}</span>
       <span class="layer-name">${escapeHTML(label || tag)}</span>`;

    item.addEventListener("click", () => {
      const cs = getComputedStyle(el);

      openInspector({
        selector: getSelector(el),
        tag,
        text: el.innerText || "",
        color: cs.color,
        background: cs.backgroundColor,
        fontSize: parseInt(cs.fontSize) || 16,
        fontWeight: cs.fontWeight,
        padding: parseInt(cs.paddingTop) || 0,
        radius: parseInt(cs.borderRadius) || 0,
        shadow: cs.boxShadow !== "none"
      });
    });

    layersList.appendChild(item);
  });
}

/* ------------------ Add / duplicate / delete ------------------ */

function addElement(type) {
  const doc = preview?.contentDocument;

  if (!doc?.body || !state.html) {
    showToast("Generate a website first.");
    return;
  }

  let el;

  if (type === "text") {
    el = doc.createElement("h2");
    el.textContent = "New heading";
    el.style.cssText = "margin:20px;font-size:32px;color:#111";
  } else if (type === "button") {
    el = doc.createElement("button");
    el.textContent = "Get Started";
    el.style.cssText =
      "margin:20px;padding:12px 22px;border:0;border-radius:10px;background:#111;color:#fff;cursor:pointer";
  } else if (type === "card") {
    el = doc.createElement("div");
    el.innerHTML = "<h3>New Card</h3><p>Edit this card from the inspector.</p>";
    el.style.cssText =
      "margin:20px;padding:24px;border-radius:16px;background:#f3f3f3;color:#111";
  } else if (type === "section") {
    el = doc.createElement("section");
    el.innerHTML = "<h2>New Section</h2><p>Add your content here.</p>";
    el.style.cssText =
      "min-height:250px;padding:60px 30px;background:#111;color:#fff";
  }

  if (!el) return;

  doc.body.appendChild(el);
  saveCurrentDocument();

  const cs = getComputedStyle(el);

  openInspector({
    selector: getSelector(el),
    tag: el.tagName.toLowerCase(),
    text: el.innerText || "",
    color: cs.color,
    background: cs.backgroundColor,
    fontSize: parseInt(cs.fontSize) || 16,
    fontWeight: cs.fontWeight,
    padding: parseInt(cs.paddingTop) || 0,
    radius: parseInt(cs.borderRadius) || 0,
    shadow: cs.boxShadow !== "none"
  });

  showToast(type + " added.");
}

function duplicateSelected() {
  const el = getSelectedElement();

  if (!el || !el.parentNode) {
    showToast("Select an element first.");
    return;
  }

  const clone = el.cloneNode(true);
  el.parentNode.insertBefore(clone, el.nextSibling);
  saveCurrentDocument();
  showToast("Element duplicated.");
}

function deleteSelected() {
  const el = getSelectedElement();

  if (!el) {
    showToast("Select an element first.");
    return;
  }

  if (["html", "body"].includes(el.tagName.toLowerCase())) {
    showToast("That element cannot be deleted.");
    return;
  }

  el.remove();
  state.selectedSelector = null;
  saveCurrentDocument();
  clearInspector();
  showToast("Element deleted.");
}

/* ------------------ Generation ------------------ */

async function generateWebsite() {
  if (state.generating) return;

  const prompt = promptInput?.value.trim() || "";

  if (!prompt) {
    showToast("Describe the website first.");
    promptInput?.focus();
    return;
  }

  if (prompt.length > 12000) {
    showToast("Your prompt is too long.");
    return;
  }

  state.generating = true;
  state.controller = new AbortController();

  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.style.pointerEvents = "none";
  }

  try {
    // Any failure below is caught and returns to the landing screen.
    showGeneration();

    updateGenerationProgress(
      10, "INITIALIZING", "Understanding your idea",
      "Preparing the design system...", 0
    );

    await sleep(250);

    updateGenerationProgress(
      30, "PLANNING", "Designing your experience",
      "Choosing layout and visual direction...", 1
    );

    updateGenerationProgress(
      45, "BUILDING", "Building the interface",
      "Generating responsive HTML and CSS...", 2
    );

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ prompt }),
      signal: state.controller.signal
    });

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Backend returned non-JSON data (HTTP " +
        response.status + "). Check the API response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || data.message ||
        "Server returned HTTP " + response.status
      );
    }

    if (!data || data.success !== true || !data.html) {
      throw new Error(
        data?.error || "The backend did not return website HTML."
      );
    }

    const html = normalizeHTML(data.html);

    if (!html) throw new Error("Generated HTML was empty.");

    updateGenerationProgress(
      85, "FINISHING", "Polishing the details",
      "Preparing your visual editor...", 3
    );

    await sleep(200);

    state.originalHTML = html;
    state.history = [];
    state.historyIndex = -1;
    state.html = html;

    showBuilder();
    loadWebsite(html, true);

    updateGenerationProgress(
      100, "COMPLETE", "Your website is ready",
      "Opening the visual editor...", 3
    );

    showToast("Website generated successfully.");

  } catch (error) {
    console.error("Sambhav generation error:", error);

    // Abort and network failures must never leave the loading screen stuck.
    stopParticles();
    stopTimer();
    showLanding();

    if (error.name === "AbortError") {
      showToast("Generation cancelled.");
    } else if (error instanceof TypeError) {
      showToast(
        "Network request failed. Check Acode preview, internet and API CORS settings.",
        6000
      );
    } else {
      showToast(error.message || "Generation failed.", 6000);
    }

  } finally {
    stopParticles();
    stopTimer();

    state.generating = false;
    state.controller = null;

    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.style.pointerEvents = "";
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ------------------ Preview mode ------------------ */

function enterPreview() {
  if (!state.html) {
    showToast("Generate a website first.");
    return;
  }

  state.previewMode = true;
  preview.srcdoc = state.html;

  if (canvasEmpty) canvasEmpty.classList.add("hidden");

  $("#previewBtn")?.classList.add("active");
  showToast("Preview mode enabled.");
}

function exitPreview() {
  if (!state.html) return;

  state.previewMode = false;
  preview.srcdoc = injectEditorBridge(state.html);
  $("#previewBtn")?.classList.remove("active");

  showToast("Back to editor.");
}

function togglePreview() {
  state.previewMode ? exitPreview() : enterPreview();
}

/* ------------------ Device sizes ------------------ */

function setDevice(device) {
  state.device = device;

  deviceFrame?.classList.remove("desktop", "tablet", "mobile");
  deviceFrame?.classList.add(device);

  $$(".device-button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.device === device
    );
  });

  const label = $("#canvasSizeLabel");

  if (label) {
    label.textContent =
      device === "desktop" ? "Responsive" :
      device === "tablet" ? "768 × responsive" :
      "390 × responsive";
  }
}

function updateCanvasSize() {
  setDevice(state.device);
}

/* ------------------ Refresh / export / reset ------------------ */

function refreshWebsite() {
  if (!state.html) {
    showToast("Nothing to refresh.");
    return;
  }

  preview.srcdoc = state.previewMode
    ? state.html
    : injectEditorBridge(state.html);

  clearInspector();
  showToast("Preview refreshed.");
}

function exportWebsite() {
  if (!state.html) {
    showToast("Generate a website first.");
    return;
  }

  const blob = new Blob(
    [normalizeHTML(state.html)],
    { type: "text/html;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "sambhav-website.html";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Website exported.");
}

function resetWebsite() {
  if (!state.originalHTML) {
    showToast("Nothing to reset.");
    return;
  }

  state.html = normalizeHTML(state.originalHTML);
  pushHistory(state.html);
  preview.srcdoc = injectEditorBridge(state.html);
  clearInspector();
  renderLayers();

  showToast("Website reset.");
}

function renameProject() {
  const button = $("#projectNameBtn");
  if (!button) return;

  const name = window.prompt(
    "Project name:",
    button.textContent.trim()
  );

  if (name?.trim()) {
    button.textContent = name.trim().slice(0, 50);
  }
}

/* ------------------ Messages from iframe ------------------ */

window.addEventListener("message", event => {
  const data = event.data;

  if (!data || data.type !== "SAMBHAV_SELECT") return;
  if (state.previewMode) return;

  openInspector(data);
});

/* ------------------ Event bindings ------------------ */

generateBtn?.addEventListener("click", generateWebsite);

promptInput?.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    generateWebsite();
  }
});

$$(".example-chip").forEach(button => {
  button.addEventListener("click", () => {
    if (promptInput) {
      promptInput.value = button.dataset.prompt || "";
      promptInput.focus();
    }
  });
});

$("#undoBtn")?.addEventListener("click", undo);
$("#redoBtn")?.addEventListener("click", redo);
$("#refreshBtn")?.addEventListener("click", refreshWebsite);
$("#exportBtn")?.addEventListener("click", exportWebsite);
$("#previewBtn")?.addEventListener("click", togglePreview);
$("#projectNameBtn")?.addEventListener("click", renameProject);
$("#duplicateBtn")?.addEventListener("click", duplicateSelected);
$("#deleteBtn")?.addEventListener("click", deleteSelected);

$("#backToHomeBtn")?.addEventListener("click", () => {
  if (state.generating) {
    state.controller?.abort();
    return;
  }

  if (state.html && !window.confirm(
    "Return home? Your current editor state will be lost."
  )) return;

  showLanding();
});

$("#closeInspectorBtn")?.addEventListener("click", () => {
  inspector?.classList.remove("mobile-open");
  preview.contentWindow?.postMessage(
    { type: "SAMBHAV_CLEAR" }, "*"
  );
});

$("#mobileInspectorOpen")?.addEventListener("click", () => {
  if (!state.selectedSelector) {
    showToast("Select an element first.");
    return;
  }

  inspector?.classList.add("mobile-open");
});

$$("[data-add]").forEach(button => {
  button.addEventListener("click", () => addElement(button.dataset.add));
});

$$(".device-button").forEach(button => {
  button.addEventListener("click", () => setDevice(button.dataset.device));
});

$$(".sidebar-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const panel = tab.dataset.panel;

    $$(".sidebar-tab").forEach(item =>
      item.classList.toggle("active", item === tab)
    );

    $("#elementsPanel")?.classList.toggle("hidden", panel !== "elements");
    $("#layersPanel")?.classList.toggle("hidden", panel !== "layers");
  });
});

preview?.addEventListener("load", () => {
  setTimeout(renderLayers, 100);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    inspector?.classList.remove("mobile-open");

    if (state.previewMode) exitPreview();
  }
});

/* ------------------ Initialize ------------------ */

function initialize() {
  showLanding();
  updateHistoryButtons();
  setDevice("desktop");

  if (promptInput) promptInput.focus();
}

initialize();
