
"use strict";

const BACKEND_URL =
  "https://website-builder-backend-nu.vercel.app/api/generate";

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

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
const inspector = $("#inspector");
const inspectorContent = $("#inspectorContent");
const layersList = $("#layersList");
const canvasEmpty = $("#canvasEmpty");

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
  state.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

function showScreen(screen) {
  const screens = [landing, generation, builder];

  screens.forEach(el => {
    if (!el) return;
    el.hidden = el !== screen;
    el.classList.toggle("hidden", el !== screen);
  });

  if (screen === landing) {
    stopTimer();
  }
}

function showLanding() {
  showScreen(landing);
}

function showGeneration() {
  showScreen(generation);
  startTimer();
}

function showBuilder() {
  stopTimer();
  showScreen(builder);
}

function startTimer() {
  stopTimer();
  state.startedAt = Date.now();

  state.generationTimer = setInterval(() => {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    const el = $("#generationTimer");

    if (el) el.textContent = elapsed.toFixed(1) + "s";
  }, 100);
}

function stopTimer() {
  clearInterval(state.generationTimer);
  state.generationTimer = null;
}

function updateGenerationProgress(
  percent, stage, title, subtitle, step
) {
  const progress = $("#generationProgress");
  const progressText = $("#progressText");
  const stageEl = $("#generationStage");
  const titleEl = $("#generationTitle");
  const subtitleEl = $("#generationSubtitle");

  if (progress) progress.style.width = percent + "%";
  if (progressText) progressText.textContent = percent + "%";
  if (stageEl) stageEl.textContent = stage;
  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;

  $$(".generation-step").forEach((el, index) => {
    el.classList.toggle("active", index <= step);
  });
}

function normalizeHTML(value) {
  let html = String(value || "")
    .replace(/^\uFEFF/, "")
    .trim();

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

  if (!/<\/body\s*>/i.test(html)) {
    html = html.replace(
      /<\/html\s*>/i,
      "</body></html>"
    );

    if (!/<\/body\s*>/i.test(html)) {
      html += "\n</body>";
    }
  }

  if (!/<\/html\s*>/i.test(html)) {
    html += "\n</html>";
  }

  return html;
}

function addPreviewBase(html) {
  // Preserve an existing base URL when the generated page
  // already specifies one.
  if (/<base\b[^>]*href\s*=/i.test(html)) {
    return html;
  }

  // Relative links should resolve against the app's current
  // URL, not the about:srcdoc document URL.
  const base = `<base href="${escapeAttribute(document.baseURI)}">`;

  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(
      /<head(?:\s[^>]*)?>/i,
      match => match + "\n" + base
    );
  }

  if (/<html(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(
      /<html(?:\s[^>]*)?>/i,
      match => match + "\n<head>" + base + "</head>"
    );
  }

  return base + html;
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getSelector(el) {
  if (!el || el.nodeType !== 1) return null;

  const parts = [];
  let current = el;

  while (
    current &&
    current.nodeType === 1 &&
    current.tagName.toLowerCase() !== "html"
  ) {
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
    current = current.parentElement;
  }

  return parts.join(" > ");
}

function injectEditorBridge(html) {
  const bridge = `
<script>
(function () {
  function selectorFor(el) {
    if (!el || el.nodeType !== 1) return null;

    var parts = [];
    var current = el;

    while (
      current &&
      current.nodeType === 1 &&
      current.tagName.toLowerCase() !== "html"
    ) {
      var part = current.tagName.toLowerCase();

      if (current.id) {
        parts.unshift(part + "#" + CSS.escape(current.id));
        break;
      }

      var parent = current.parentElement;

      if (parent) {
        var siblings = Array.from(parent.children).filter(
          function (item) {
            return item.tagName === current.tagName;
          }
        );

        if (siblings.length > 1) {
          part += ":nth-of-type(" +
            (siblings.indexOf(current) + 1) + ")";
        }
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(" > ");
  }

  var selected = null;
  var previousOutline = "";
  var previousOffset = "";

  function clearSelection() {
    if (selected) {
      selected.style.outline = previousOutline;
      selected.style.outlineOffset = previousOffset;
    }

    selected = null;
  }

  function selectElement(el) {
    if (!el || !document.body.contains(el)) return;

    clearSelection();
    selected = el;
    previousOutline = el.style.outline;
    previousOffset = el.style.outlineOffset;

    el.style.outline = "2px solid #9d76ff";
    el.style.outlineOffset = "2px";

    var css = getComputedStyle(el);

    parent.postMessage({
      type: "SAMBHAV_SELECT",
      selector: selectorFor(el),
      tag: el.tagName.toLowerCase(),
      text: el.innerText || el.textContent || "",
      color: css.color,
      background: css.backgroundColor,
      fontSize: parseInt(css.fontSize, 10) || 16,
      fontWeight: css.fontWeight,
      padding: parseInt(css.paddingTop, 10) || 0,
      radius: parseInt(css.borderRadius, 10) || 0,
      shadow: css.boxShadow !== "none"
    }, "*");
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-sambhav-ignore]")) return;

    event.preventDefault();
    event.stopPropagation();
    selectElement(event.target);
  }, true);

  window.addEventListener("message", function (event) {
    if (
      event.source === parent &&
      event.data &&
      event.data.type === "SAMBHAV_CLEAR"
    ) {
      clearSelection();
    }
  });
})();
<\/script>`;

  if (/<\/body\s*>/i.test(html)) {
    return html.replace(
      /<\/body\s*>/i,
      bridge + "\n</body>"
    );
  }

  return html + bridge;
}

function pushHistory(html) {
  if (!html) return;

  if (state.history[state.historyIndex] === html) return;

  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(html);

  if (state.history.length > 50) {
    state.history.shift();
  }

  state.historyIndex = state.history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undoBtn = $("#undoBtn");
  const redoBtn = $("#redoBtn");

  if (undoBtn) undoBtn.disabled = state.historyIndex <= 0;

  if (redoBtn) {
    redoBtn.disabled =
      state.historyIndex >= state.history.length - 1;
  }
}

function clearInspector() {
  state.selectedSelector = null;

  const selectedType = $("#selectedType");
  const mobileName = $("#mobileSelectionName");

  if (selectedType) selectedType.textContent = "Nothing selected";
  if (mobileName) mobileName.textContent = "Nothing selected";

  if (inspectorContent) {
    inspectorContent.innerHTML = `
      <div class="inspector-empty">
        <div class="empty-select-icon">⌁</div>
        <strong>Select an element</strong>
        <p>Click an element inside the website preview to edit it.</p>
      </div>`;
  }

  inspector?.classList.remove("mobile-open");
}

function getSelectedElement() {
  if (!state.selectedSelector || !preview) return null;

  try {
    return preview.contentDocument?.querySelector(
      state.selectedSelector
    ) || null;
  } catch (error) {
    console.error("Selection lookup failed:", error);
    return null;
  }
}

function saveCurrentDocument() {
  try {
    const doc = preview?.contentDocument;

    if (!doc?.documentElement) return;

    state.html = normalizeHTML(
      "<!DOCTYPE html>\n" + doc.documentElement.outerHTML
    );

    pushHistory(state.html);
    renderLayers();
  } catch (error) {
    console.error("Could not save preview document:", error);
  }
}

function updateSelectedElement(callback) {
  const el = getSelectedElement();

  if (!el) {
    showToast("Select an element first.");
    return;
  }

  try {
    callback(el);
    saveCurrentDocument();
  } catch (error) {
    console.error("Element update failed:", error);
    showToast("Could not update this element.");
  }
}

function rgbToHex(value) {
  if (!value) return "#ffffff";
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;

  const match = value.match(
    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/
  );

  if (!match) return "#ffffff";

  return "#" + match.slice(1, 4).map(channel =>
    Number(channel).toString(16).padStart(2, "0")
  ).join("");
}

function openInspector(data) {
  const template = $("#inspectorTemplate");

  if (!template || !inspectorContent) return;

  state.selectedSelector = data.selector;
  inspectorContent.innerHTML = "";
  inspectorContent.appendChild(template.content.cloneNode(true));

  const selectedType = $("#selectedType");
  const mobileName = $("#mobileSelectionName");

  if (selectedType) {
    selectedType.textContent = "<" + data.tag + ">";
  }

  if (mobileName) {
    mobileName.textContent = data.tag + " selected";
  }

  if (window.innerWidth <= 850) {
    inspector?.classList.add("mobile-open");
  }

  const setValue = (id, value) => {
    const el = $("#" + id);
    if (el) el.value = value;
  };

  setValue("editText", data.text || "");
  setValue("fontSizeInput", data.fontSize || 16);
  setValue("fontWeightInput", data.fontWeight || "400");

  const textColor = rgbToHex(data.color);
  const backgroundColor = rgbToHex(data.background);

  setValue("textColorInput", textColor);
  setValue("textColorText", textColor);
  setValue("backgroundColorInput", backgroundColor);
  setValue("backgroundColorText", backgroundColor);
  setValue("paddingInput", data.padding || 0);
  setValue("radiusInput", data.radius || 0);

  const shadow = $("#shadowInput");
  if (shadow) shadow.checked = Boolean(data.shadow);

  const bind = (id, eventName, callback) => {
    const el = $("#" + id);
    if (el) el.addEventListener(eventName, callback);
  };

  bind("editText", "change", () => {
    updateSelectedElement(el => {
      el.innerText = $("#editText").value;
    });
  });

  bind("fontSizeInput", "change", () => {
    updateSelectedElement(el => {
      const value = Number($("#fontSizeInput").value);

      if (value >= 8 && value <= 160) {
        el.style.fontSize = value + "px";
      }
    });
  });

  bind("fontWeightInput", "change", () => {
    updateSelectedElement(el => {
      el.style.fontWeight = $("#fontWeightInput").value;
    });
  });

  function setColor(inputId, textId, property) {
    const input = $("#" + inputId);
    const text = $("#" + textId);

    const apply = value => {
      const probe = document.createElement("span");
      probe.style.color = value;

      if (!probe.style.color) {
        showToast("Enter a valid CSS color.");
        return;
      }

      updateSelectedElement(el => {
        el.style[property] = value;
      });

      if (input && /^#[0-9a-f]{6}$/i.test(value)) {
        input.value = value;
      }

      if (text) text.value = value;
    };

    input?.addEventListener("change", () => apply(input.value));
    text?.addEventListener("change", () => apply(text.value.trim()));
  }

  setColor("textColorInput", "textColorText", "color");
  setColor("backgroundColorInput", "backgroundColorText", "backgroundColor");

  bind("paddingInput", "change", () => {
    updateSelectedElement(el => {
      const value = Number($("#paddingInput").value);

      if (value >= 0 && value <= 200) {
        el.style.padding = value + "px";
      }
    });
  });

  bind("radiusInput", "change", () => {
    updateSelectedElement(el => {
      const value = Number($("#radiusInput").value);

      if (value >= 0 && value <= 200) {
        el.style.borderRadius = value + "px";
      }
    });
  });

  bind("shadowInput", "change", () => {
    updateSelectedElement(el => {
      el.style.boxShadow = $("#shadowInput").checked
        ? "0 15px 40px rgba(0,0,0,.22)"
        : "none";
    });
  });

  bind("resetElementBtn", "click", () => {
    updateSelectedElement(el => {
      el.removeAttribute("style");
    });
  });
}

function renderLayers() {
  if (!layersList) return;

  let doc;

  try {
    doc = preview?.contentDocument;
  } catch {
    doc = null;
  }

  if (!doc?.body) {
    layersList.innerHTML =
      '<div class="layers-empty">Generate a website to see layers.</div>';
    return;
  }

  const elements = [...doc.body.querySelectorAll("*")]
    .filter(el => !el.closest("[data-sambhav-ignore]"))
    .slice(0, 80);

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
    const label = (el.innerText || tag)
      .trim()
      .split("\n")[0]
      .slice(0, 25);

    const tagLabel = document.createElement("span");
    tagLabel.className = "layer-tag";
    tagLabel.textContent = tag;

    const nameLabel = document.createElement("span");
    nameLabel.className = "layer-name";
    nameLabel.textContent = label || tag;

    item.append(tagLabel, nameLabel);

    item.addEventListener("click", () => {
      const css = getComputedStyle(el);

      openInspector({
        selector: getSelector(el),
        tag,
        text: el.innerText || el.textContent || "",
        color: css.color,
        background: css.backgroundColor,
        fontSize: parseInt(css.fontSize, 10) || 16,
        fontWeight: css.fontWeight,
        padding: parseInt(css.paddingTop, 10) || 0,
        radius: parseInt(css.borderRadius, 10) || 0,
        shadow: css.boxShadow !== "none"
      });
    });

    layersList.appendChild(item);
  });
}

function restoreHistory() {
  state.html = state.history[state.historyIndex] || "";
  state.selectedSelector = null;

  if (preview && state.html) {
    renderPreview();
  }

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

function renderPreview() {
  if (!preview || !state.html) return;

  try {
    const html = addPreviewBase(state.html);

    preview.onload = () => {
      renderLayers();
    };

    preview.srcdoc = state.previewMode
      ? html
      : injectEditorBridge(html);
  } catch (error) {
    console.error("Preview rendering failed:", error);
    showToast("Preview could not be rendered.");
  }
}

function loadWebsite(html, addHistory = true) {
  const clean = normalizeHTML(html);

  if (!clean) {
    showToast("The generated website is empty.");
    return false;
  }

  state.html = clean;
  state.previewMode = false;
  state.selectedSelector = null;

  canvasEmpty?.classList.add("hidden");

  if (addHistory) pushHistory(clean);

  clearInspector();
  renderPreview();
  updateCanvasSize();

  return true;
}

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
    el.innerHTML =
      "<h3>New Card</h3><p>Edit this card from the inspector.</p>";
    el.style.cssText =
      "margin:20px;padding:24px;border-radius:16px;background:#f3f3f3;color:#111";
  } else if (type === "section") {
    el = doc.createElement("section");
    el.innerHTML =
      "<h2>New Section</h2><p>Add your content here.</p>";
    el.style.cssText =
      "min-height:250px;padding:60px 30px;background:#111;color:#fff";
  }

  if (!el) return;

  doc.body.appendChild(el);
  saveCurrentDocument();

  const css = getComputedStyle(el);

  openInspector({
    selector: getSelector(el),
    tag: el.tagName.toLowerCase(),
    text: el.innerText || "",
    color: css.color,
    background: css.backgroundColor,
    fontSize: parseInt(css.fontSize, 10) || 16,
    fontWeight: css.fontWeight,
    padding: parseInt(css.paddingTop, 10) || 0,
    radius: parseInt(css.borderRadius, 10) || 0,
    shadow: css.boxShadow !== "none"
  });

  showToast(type + " added.");
}

function duplicateSelected() {
  const el = getSelectedElement();

  if (!el?.parentNode) {
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

  if (["html", "body", "head"].includes(el.tagName.toLowerCase())) {
    showToast("That element cannot be deleted.");
    return;
  }

  el.remove();
  state.selectedSelector = null;
  saveCurrentDocument();
  clearInspector();
  showToast("Element deleted.");
}

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

  const controller = new AbortController();
  state.controller = controller;

  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.style.pointerEvents = "none";
  }

  showGeneration();

  updateGenerationProgress(
    10, "INITIALIZING", "Understanding your idea",
    "Preparing the design system...", 0
  );

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Server returned an invalid response (HTTP " +
        response.status + ")."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        "Request failed (HTTP " + response.status + ")."
      );
    }

    // Support the expected response and common alternate wrappers.
    const html = typeof data === "string"
      ? data
      : data?.html ||
        data?.website ||
        data?.result?.html ||
        data?.data?.html ||
        "";

    if (typeof html !== "string" || !html.trim()) {
      throw new Error(
        data?.error ||
        data?.message ||
        "The server returned no website HTML."
      );
    }

    updateGenerationProgress(
      70, "BUILDING", "Building your interface",
      "Preparing the generated website...", 2
    );

    const clean = normalizeHTML(html);

    if (!clean) {
      throw new Error("Generated website HTML is empty.");
    }

    state.originalHTML = clean;
    state.history = [];
    state.historyIndex = -1;

    if (!loadWebsite(clean, true)) {
      throw new Error("Could not load the generated website.");
    }

    updateGenerationProgress(
      100, "COMPLETE", "Your website is ready",
      "Opening the visual editor...", 3
    );

    showBuilder();
    showToast("Website generated successfully.");
  } catch (error) {
    console.error("[Sambhav generation]", error);

    if (error.name === "AbortError") {
      showLanding();
      showToast("Generation cancelled.");
    } else {
      showLanding();

      showToast(
        error instanceof TypeError
          ? "Network or CORS error. Check the connection and backend."
          : error.message || "Generation failed.",
        6000
      );
    }
  } finally {
    stopTimer();
    state.generating = false;
    state.controller = null;

    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.style.pointerEvents = "";
    }
  }
}

function enterPreview() {
  if (!state.html) {
    showToast("Generate a website first.");
    return;
  }

  state.previewMode = true;
  renderPreview();
  $("#previewBtn")?.classList.add("active");
  showToast("Preview mode enabled.");
}

function exitPreview() {
  if (!state.html) return;

  state.previewMode = false;
  renderPreview();
  $("#previewBtn")?.classList.remove("active");
  showToast("Back to editor.");
}

function togglePreview() {
  state.previewMode ? exitPreview() : enterPreview();
}

function setDevice(device) {
  if (!["desktop", "tablet", "mobile"].includes(device)) return;

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
      device === "desktop" ? "Desktop · Responsive" :
      device === "tablet" ? "768 × responsive" :
      "390 × responsive";
  }
}

function updateCanvasSize() {
  setDevice(state.device);
}

function refreshWebsite() {
  if (!state.html) {
    showToast("Nothing to refresh.");
    return;
  }

  renderPreview();
  showToast("Preview refreshed.");
}

function exportWebsite() {
  if (!state.html) {
    showToast("Generate a website first.");
    return;
  }

  try {
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

    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast("Website exported.");
  } catch (error) {
    console.error("Export failed:", error);
    showToast("Could not export the website.");
  }
}

function resetWebsite() {
  if (!state.originalHTML) {
    showToast("Nothing to reset.");
    return;
  }

  state.html = state.originalHTML;
  pushHistory(state.html);
  state.previewMode = false;

  renderPreview();
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

window.addEventListener("message", event => {
  if (event.source !== preview?.contentWindow) return;

  const data = event.data;

  if (!data || data.type !== "SAMBHAV_SELECT") return;
  if (state.previewMode) return;

  openInspector(data);
});

generateBtn?.addEventListener("click", generateWebsite);

$("#emptyGenerateBtn")?.addEventListener("click", () => {
  promptInput?.focus();
  showLanding();
});

$("#cancelGenerationBtn")?.addEventListener("click", () => {
  if (state.generating) {
    state.controller?.abort();
  } else {
    showLanding();
  }
});

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

  if (
    state.html &&
    !window.confirm("Return home? Your current editor state will be lost.")
  ) {
    return;
  }

  showLanding();
});

$("#closeInspectorBtn")?.addEventListener("click", () => {
  inspector?.classList.remove("mobile-open");

  preview?.contentWindow?.postMessage(
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
  button.addEventListener("click", () => {
    setDevice(button.dataset.device);
  });
});

$$(".sidebar-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const panel = tab.dataset.panel;

    $$(".sidebar-tab").forEach(item => {
      item.classList.toggle("active", item === tab);
    });

    $("#elementsPanel")?.classList.toggle(
      "hidden", panel !== "elements"
    );

    $("#layersPanel")?.classList.toggle(
      "hidden", panel !== "layers"
    );
  });
});

preview?.addEventListener("load", () => {
  setTimeout(renderLayers, 100);
});

document.addEventListener("keydown", event => {
  const target = event.target;
  const typing = target instanceof HTMLElement &&
    (target.isContentEditable ||
     ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

  if (event.key === "Escape") {
    inspector?.classList.remove("mobile-open");

    if (state.generating) {
      state.controller?.abort();
    } else if (state.previewMode) {
      exitPreview();
    }
  }

  if (
    !typing &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "d"
  ) {
    event.preventDefault();
    duplicateSelected();
  }

  if (
    !typing &&
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "z"
  ) {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  }
});

window.addEventListener("error", event => {
  console.error(
    "[Sambhav error]",
    event.message,
    event.filename,
    event.lineno
  );
});

window.addEventListener("unhandledrejection", event => {
  console.error("[Sambhav promise error]", event.reason);
});

function initialize() {
  showLanding();
  updateHistoryButtons();
  setDevice("desktop");
}

initialize();
