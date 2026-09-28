/* =========================================================
   SAMBHAV AI
   FRONTEND ENGINE
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const BACKEND_URL =
  "https://website-builder-backend-nu.vercel.app/api/generate";


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];


/* =========================================================
   STATE
========================================================= */

const state = {
  html: "",
  originalHTML: "",

  selectedSelector: null,
  selectedElement: null,

  history: [],
  historyIndex: -1,

  generating: false,
  previewMode: false,

  device: "desktop",

  particleFrame: null,
  particleResizeHandler: null,

  generationTimer: null,
  generationStartedAt: 0,

  toastTimer: null
};


/* =========================================================
   ELEMENTS
========================================================= */

const landingScreen = $("#landingScreen");
const generationScreen = $("#generationScreen");
const builderScreen = $("#builderScreen");

const promptInput = $("#promptInput");
const generateBtn = $("#generateBtn");

const particleCanvas = $("#particleCanvas");

const websitePreview = $("#websitePreview");
const deviceFrame = $("#deviceFrame");
const canvasEmpty = $("#canvasEmpty");

const generationProgress = $("#generationProgress");
const progressText = $("#progressText");
const generationStage = $("#generationStage");
const generationTitle = $("#generationTitle");
const generationSubtitle = $("#generationSubtitle");
const generationTimer = $("#generationTimer");

const inspector = $(".inspector");
const inspectorContent = $("#inspectorContent");
const selectedType = $("#selectedType");

const toast = $("#toast");
const toastText = $("#toastText");

const layersList = $("#layersList");

const mobileSelectionName = $("#mobileSelectionName");


/* =========================================================
   TOAST
========================================================= */

function showToast(message, duration = 2200) {

  if (!toast || !toastText) return;

  toastText.textContent = message;

  toast.classList.add("show");

  clearTimeout(state.toastTimer);

  state.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showLanding() {

  if (landingScreen) {
    landingScreen.classList.remove("hidden");
    landingScreen.style.display = "block";
  }

  if (generationScreen) {
    generationScreen.classList.add("hidden");
    generationScreen.style.display = "none";
  }

  if (builderScreen) {
    builderScreen.classList.add("hidden");
    builderScreen.style.display = "none";
  }

  stopGenerationParticles();
}


function showGeneration() {

  if (landingScreen) {
    landingScreen.classList.add("hidden");
    landingScreen.style.display = "none";
  }

  if (generationScreen) {
    generationScreen.classList.remove("hidden");
    generationScreen.style.display = "block";
  }

  if (builderScreen) {
    builderScreen.classList.add("hidden");
    builderScreen.style.display = "none";
  }

  requestAnimationFrame(() => {
    startGenerationParticles();
  });
}


function showBuilder() {

  if (landingScreen) {
    landingScreen.classList.add("hidden");
    landingScreen.style.display = "none";
  }

  if (generationScreen) {
    generationScreen.classList.add("hidden");
    generationScreen.style.display = "none";
  }

  if (builderScreen) {
    builderScreen.classList.remove("hidden");
    builderScreen.style.display = "block";
  }

  stopGenerationParticles();
}


/* =========================================================
   PARTICLES
========================================================= */

function startGenerationParticles() {

  if (!particleCanvas || !generationScreen) return;

  stopGenerationParticles();

  const canvas = particleCanvas;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const particles = [];
  const isMobile = window.innerWidth < 700;

  const count = isMobile ? 75 : 190;

  function resize() {

    const rect = generationScreen.getBoundingClientRect();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();

  state.particleResizeHandler = resize;

  window.addEventListener("resize", resize);

  const width = () => generationScreen.clientWidth;
  const height = () => generationScreen.clientHeight;

  for (let i = 0; i < count; i++) {

    particles.push({
      x: Math.random() * width(),
      y: Math.random() * height(),

      vx: (Math.random() - .5) * .22,
      vy: (Math.random() - .5) * .22,

      size: Math.random() * 1.7 + .35,

      alpha: Math.random() * .65 + .12,

      phase: Math.random() * Math.PI * 2,

      speed: Math.random() * .015 + .006
    });
  }


  function draw() {

    const w = width();
    const h = height();

    ctx.clearRect(0, 0, w, h);

    /* center glow */

    const gradient = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      Math.min(w, h) * .45
    );

    gradient.addColorStop(0, "rgba(255,255,255,.035)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);


    /* particles */

    for (const p of particles) {

      p.x += p.vx;
      p.y += p.vy;
      p.phase += p.speed;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;

      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const pulse =
        p.alpha +
        Math.sin(p.phase) * .12;

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        p.size,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        `rgba(255,255,255,${Math.max(.03, pulse)})`;

      ctx.fill();
    }


    /* connections */

    if (!isMobile) {

      const maxDistance = 110;

      for (let i = 0; i < particles.length; i++) {

        for (let j = i + 1; j < particles.length; j++) {

          const a = particles[i];
          const b = particles[j];

          const dx = a.x - b.x;
          const dy = a.y - b.y;

          const distance =
            Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {

            const opacity =
              (1 - distance / maxDistance) * .08;

            ctx.beginPath();

            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);

            ctx.strokeStyle =
              `rgba(255,255,255,${opacity})`;

            ctx.lineWidth = .5;

            ctx.stroke();
          }
        }
      }
    }

    state.particleFrame =
      requestAnimationFrame(draw);
  }

  draw();
}


function stopGenerationParticles() {

  if (state.particleFrame) {

    cancelAnimationFrame(state.particleFrame);

    state.particleFrame = null;
  }

  if (state.particleResizeHandler) {

    window.removeEventListener(
      "resize",
      state.particleResizeHandler
    );

    state.particleResizeHandler = null;
  }

  if (particleCanvas) {

    const ctx = particleCanvas.getContext("2d");

    if (ctx) {
      ctx.clearRect(
        0,
        0,
        particleCanvas.width,
        particleCanvas.height
      );
    }
  }
}


/* =========================================================
   GENERATION UI
========================================================= */

function updateGenerationProgress(percent, stage, title, subtitle, step) {

  if (generationProgress) {
    generationProgress.style.width =
      `${Math.max(0, Math.min(100, percent))}%`;
  }

  if (progressText) {
    progressText.textContent =
      `${Math.round(percent)}%`;
  }

  if (generationStage) {
    generationStage.textContent = stage;
  }

  if (generationTitle) {
    generationTitle.textContent = title;
  }

  if (generationSubtitle) {
    generationSubtitle.textContent = subtitle;
  }

  $$(".generation-step").forEach((item, index) => {
    item.classList.toggle(
      "active",
      index <= step
    );
  });
}


function startGenerationTimer() {

  state.generationStartedAt = performance.now();

  clearInterval(state.generationTimer);

  state.generationTimer = setInterval(() => {

    const elapsed =
      (performance.now() - state.generationStartedAt) / 1000;

    if (generationTimer) {
      generationTimer.textContent =
        `${elapsed.toFixed(1)}s`;
    }

  }, 100);
}


function stopGenerationTimer() {

  clearInterval(state.generationTimer);

  state.generationTimer = null;
}


/* =========================================================
   HTML NORMALIZATION
========================================================= */

function normalizeHTML(html) {

  if (!html) return "";

  let result = String(html).trim();

  result = result
    .replace(/^```html\s*/i, "")
    .replace(/^```HTML\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const doctypeIndex =
    result.toLowerCase().indexOf("<!doctype");

  const htmlIndex =
    result.toLowerCase().indexOf("<html");

  if (doctypeIndex > 0) {
    result = result.slice(doctypeIndex);
  } else if (htmlIndex > 0) {
    result = "<!DOCTYPE html>\n" + result.slice(htmlIndex);
  }

  if (!/<html[\s>]/i.test(result)) {
    result = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${result}
</body>
</html>
`;
  }

  if (!/<\/body>/i.test(result)) {
    result += "\n</body>";
  }

  if (!/<\/html>/i.test(result)) {
    result += "\n</html>";
  }

  return result.trim();
}


/* =========================================================
   SELECTOR GENERATION
========================================================= */

function getElementSelector(element) {

  if (!element || element.nodeType !== 1) {
    return null;
  }

  const parts = [];

  let current = element;

  while (
    current &&
    current.nodeType === 1 &&
    current.tagName.toLowerCase() !== "html"
  ) {

    let part = current.tagName.toLowerCase();

    if (current.id) {

      part += `#${CSS.escape(current.id)}`;

      parts.unshift(part);

      break;
    }

    const parent = current.parentElement;

    if (parent) {

      const siblings = [
        ...parent.children
      ].filter(
        el =>
          el.tagName === current.tagName
      );

      if (siblings.length > 1) {

        const index =
          siblings.indexOf(current) + 1;

        part += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(part);

    current = parent;
  }

  return parts.join(" > ");
}


/* =========================================================
   EDITOR BRIDGE
========================================================= */

function injectEditorBridge(html) {

  const bridge = `
<script>
(function(){

  function getPath(el){

    if(!el || el.nodeType !== 1) return null;

    const parts = [];

    let current = el;

    while(
      current &&
      current.nodeType === 1 &&
      current.tagName.toLowerCase() !== "html"
    ){

      let part = current.tagName.toLowerCase();

      if(current.id){
        part += "#" + CSS.escape(current.id);
        parts.unshift(part);
        break;
      }

      const parent = current.parentElement;

      if(parent){

        const siblings = Array.from(parent.children)
          .filter(function(item){
            return item.tagName === current.tagName;
          });

        if(siblings.length > 1){
          part += ":nth-of-type(" +
            (siblings.indexOf(current) + 1) +
            ")";
        }
      }

      parts.unshift(part);

      current = parent;
    }

    return parts.join(" > ");
  }


  let selected = null;


  function removeHighlight(){

    if(!selected) return;

    selected.style.outline = selected.dataset.sambhavOldOutline || "";

    selected.style.outlineOffset =
      selected.dataset.sambhavOldOutlineOffset || "";

    selected = null;
  }


  function highlight(el){

    removeHighlight();

    if(!el) return;

    selected = el;

    selected.dataset.sambhavOldOutline =
      selected.style.outline || "";

    selected.dataset.sambhavOldOutlineOffset =
      selected.style.outlineOffset || "";

    selected.style.outline =
      "2px solid rgba(0,120,255,.9)";

    selected.style.outlineOffset = "2px";

    window.parent.postMessage({
      type: "SAMBHAV_SELECT",
      selector: getPath(el),
      tag: el.tagName.toLowerCase(),
      text: el.innerText || "",
      color: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
      fontSize: parseInt(getComputedStyle(el).fontSize) || 16,
      fontWeight: getComputedStyle(el).fontWeight,
      padding: parseInt(getComputedStyle(el).paddingTop) || 0,
      radius: parseInt(getComputedStyle(el).borderRadius) || 0,
      shadow: getComputedStyle(el).boxShadow !== "none"
    }, "*");
  }


  document.addEventListener("click", function(event){

    const target = event.target;

    if(!target) return;

    /*
      Only allow editor selection while parent is
      in editor mode.
    */

    if(
      target.closest &&
      target.closest("[data-sambhav-ignore]")
    ){
      return;
    }

    /*
      Prevent generated links/buttons from navigating
      while editing.
    */

    if(
      target.tagName === "A" ||
      target.tagName === "BUTTON"
    ){
      event.preventDefault();
    }

    event.preventDefault();

    highlight(target);

  }, true);


  window.addEventListener("message", function(event){

    if(!event.data) return;

    if(event.data.type === "SAMBHAV_CLEAR"){

      removeHighlight();
    }

  });


  window.addEventListener("beforeunload", function(){
    removeHighlight();
  });

})();
<\/script>
`;

  if (/<\/body>/i.test(html)) {
    return html.replace(
      /<\/body>/i,
      bridge + "\n</body>"
    );
  }

  return html + bridge;
}


/* =========================================================
   LOAD WEBSITE
========================================================= */

function loadWebsite(html, addHistory = true) {

  const clean = normalizeHTML(html);

  if (!clean) {
    showToast("Generated website was empty.");
    return;
  }

  state.html = clean;

  if (addHistory) {
    pushHistory(clean);
  }

  state.selectedSelector = null;
  state.selectedElement = null;

  if (canvasEmpty) {
    canvasEmpty.classList.add("hidden");
  }

  websitePreview.srcdoc =
    injectEditorBridge(clean);

  renderLayers();

  clearInspector();

  updateCanvasSize();
}


/* =========================================================
   HISTORY
========================================================= */

function pushHistory(html) {

  const clean = normalizeHTML(html);

  if (!clean) return;

  if (
    state.history[state.historyIndex] === clean
  ) {
    return;
  }

  state.history =
    state.history.slice(
      0,
      state.historyIndex + 1
    );

  state.history.push(clean);

  if (state.history.length > 50) {
    state.history.shift();
  }

  state.historyIndex =
    state.history.length - 1;

  updateHistoryButtons();
}


function undo() {

  if (state.historyIndex <= 0) {
    showToast("Nothing to undo.");
    return;
  }

  state.historyIndex--;

  state.html =
    state.history[state.historyIndex];

  websitePreview.srcdoc =
    injectEditorBridge(state.html);

  clearInspector();

  renderLayers();

  updateHistoryButtons();
}


function redo() {

  if (
    state.historyIndex >=
    state.history.length - 1
  ) {
    showToast("Nothing to redo.");
    return;
  }

  state.historyIndex++;

  state.html =
    state.history[state.historyIndex];

  websitePreview.srcdoc =
    injectEditorBridge(state.html);

  clearInspector();

  renderLayers();

  updateHistoryButtons();
}


function updateHistoryButtons() {

  const undoBtn = $("#undoBtn");
  const redoBtn = $("#redoBtn");

  if (undoBtn) {
    undoBtn.disabled =
      state.historyIndex <= 0;

    undoBtn.style.opacity =
      undoBtn.disabled ? ".35" : "1";
  }

  if (redoBtn) {
    redoBtn.disabled =
      state.historyIndex >=
      state.history.length - 1;

    redoBtn.style.opacity =
      redoBtn.disabled ? ".35" : "1";
  }
}


/* =========================================================
   IFRAME MESSAGES
========================================================= */

window.addEventListener("message", event => {

  const data = event.data;

  if (!data || data.type !== "SAMBHAV_SELECT") {
    return;
  }

  state.selectedSelector =
    data.selector;

  openInspector(data);
});


/* =========================================================
   INSPECTOR
========================================================= */

function openInspector(data) {

  if (!inspectorContent) return;

  const template =
    $("#inspectorTemplate");

  if (!template) return;

  inspectorContent.innerHTML = "";

  inspectorContent.appendChild(
    template.content.cloneNode(true)
  );

  selectedType.textContent =
    `<${data.tag}>`;

  mobileSelectionName.textContent =
    `${data.tag} selected`;

  if (window.innerWidth <= 850) {
    inspector.classList.add("mobile-open");
  }


  const editText = $("#editText");
  const fontSizeInput = $("#fontSizeInput");
  const fontWeightInput = $("#fontWeightInput");

  const textColorInput = $("#textColorInput");
  const textColorText = $("#textColorText");

  const backgroundColorInput =
    $("#backgroundColorInput");

  const backgroundColorText =
    $("#backgroundColorText");

  const paddingInput = $("#paddingInput");
  const radiusInput = $("#radiusInput");

  const shadowInput = $("#shadowInput");


  if (editText) {
    editText.value =
      data.text || "";
  }

  if (fontSizeInput) {
    fontSizeInput.value =
      parseInt(data.fontSize) || 16;
  }

  if (fontWeightInput) {
    fontWeightInput.value =
      String(data.fontWeight || "400");
  }


  const textColor =
    rgbToHex(data.color) || "#ffffff";

  const backgroundColor =
    rgbToHex(data.background) || "#111111";


  if (textColorInput) {
    textColorInput.value =
      textColor;
  }

  if (textColorText) {
    textColorText.value =
      textColor;
  }

  if (backgroundColorInput) {
    backgroundColorInput.value =
      backgroundColor;
  }

  if (backgroundColorText) {
    backgroundColorText.value =
      backgroundColor;
  }

  if (paddingInput) {
    paddingInput.value =
      Number(data.padding) || 0;
  }

  if (radiusInput) {
    radiusInput.value =
      Number(data.radius) || 0;
  }

  if (shadowInput) {
    shadowInput.checked =
      Boolean(data.shadow);
  }


  bindInspectorEvents();
}


function clearInspector() {

  state.selectedSelector = null;
  state.selectedElement = null;

  if (selectedType) {
    selectedType.textContent =
      "No selection";
  }

  if (mobileSelectionName) {
    mobileSelectionName.textContent =
      "Nothing selected";
  }

  if (inspectorContent) {

    inspectorContent.innerHTML = `
      <div class="inspector-empty">

        <div class="empty-select-icon">⌁</div>

        <strong>Select an element</strong>

        <p>
          Click something inside the website
          preview to edit it.
        </p>

      </div>
    `;
  }

  if (inspector) {
    inspector.classList.remove("mobile-open");
  }
}


/* =========================================================
   GET SELECTED ELEMENT
========================================================= */

function getSelectedElement() {

  if (!state.selectedSelector) {
    return null;
  }

  try {

    const doc =
      websitePreview.contentDocument;

    if (!doc) return null;

    return doc.querySelector(
      state.selectedSelector
    );

  } catch {
    return null;
  }
}


/* =========================================================
   UPDATE SELECTED ELEMENT
========================================================= */

function updateSelectedElement(callback) {

  const element =
    getSelectedElement();

  if (!element) {
    showToast("Select an element first.");
    return;
  }

  callback(element);

  saveCurrentDocument();
}


/* =========================================================
   SAVE CURRENT DOCUMENT
========================================================= */

function saveCurrentDocument() {

  try {

    const doc =
      websitePreview.contentDocument;

    if (!doc) return;

    const html =
      "<!DOCTYPE html>\n" +
      doc.documentElement.outerHTML;

    state.html =
      normalizeHTML(html);

    pushHistory(state.html);

    renderLayers();

  } catch (error) {

    console.error(error);

  }
}


/* =========================================================
   INSPECTOR EVENTS
========================================================= */

function bindInspectorEvents() {

  const editText = $("#editText");

  const fontSizeInput =
    $("#fontSizeInput");

  const fontWeightInput =
    $("#fontWeightInput");

  const textColorInput =
    $("#textColorInput");

  const textColorText =
    $("#textColorText");

  const backgroundColorInput =
    $("#backgroundColorInput");

  const backgroundColorText =
    $("#backgroundColorText");

  const paddingInput =
    $("#paddingInput");

  const radiusInput =
    $("#radiusInput");

  const shadowInput =
    $("#shadowInput");


  if (editText) {

    editText.addEventListener(
      "input",
      () => {

        updateSelectedElement(el => {

          el.innerText =
            editText.value;

        });

      }
    );
  }


  if (fontSizeInput) {

    fontSizeInput.addEventListener(
      "input",
      () => {

        updateSelectedElement(el => {

          el.style.fontSize =
            `${fontSizeInput.value}px`;

        });

      }
    );
  }


  if (fontWeightInput) {

    fontWeightInput.addEventListener(
      "change",
      () => {

        updateSelectedElement(el => {

          el.style.fontWeight =
            fontWeightInput.value;

        });

      }
    );
  }


  function setTextColor(value) {

    if (!isValidColor(value)) return;

    updateSelectedElement(el => {

      el.style.color = value;

    });

    if (textColorInput) {
      textColorInput.value =
        normalizeHex(value);
    }

    if (textColorText) {
      textColorText.value =
        normalizeHex(value);
    }
  }


  if (textColorInput) {

    textColorInput.addEventListener(
      "input",
      () => {

        setTextColor(
          textColorInput.value
        );

      }
    );
  }


  if (textColorText) {

    textColorText.addEventListener(
      "change",
      () => {

        setTextColor(
          textColorText.value.trim()
        );

      }
    );
  }


  function setBackground(value) {

    if (!isValidColor(value)) return;

    updateSelectedElement(el => {

      el.style.backgroundColor =
        value;

    });

    if (backgroundColorInput) {
      backgroundColorInput.value =
        normalizeHex(value);
    }

    if (backgroundColorText) {
      backgroundColorText.value =
        normalizeHex(value);
    }
  }


  if (backgroundColorInput) {

    backgroundColorInput.addEventListener(
      "input",
      () => {

        setBackground(
          backgroundColorInput.value
        );

      }
    );
  }


  if (backgroundColorText) {

    backgroundColorText.addEventListener(
      "change",
      () => {

        setBackground(
          backgroundColorText.value.trim()
        );

      }
    );
  }


  if (paddingInput) {

    paddingInput.addEventListener(
      "input",
      () => {

        updateSelectedElement(el => {

          el.style.padding =
            `${Math.max(
              0,
              Number(paddingInput.value) || 0
            )}px`;

        });

      }
    );
  }


  if (radiusInput) {

    radiusInput.addEventListener(
      "input",
      () => {

        updateSelectedElement(el => {

          el.style.borderRadius =
            `${Math.max(
              0,
              Number(radiusInput.value) || 0
            )}px`;

        });

      }
    );
  }


  if (shadowInput) {

    shadowInput.addEventListener(
      "change",
      () => {

        updateSelectedElement(el => {

          el.style.boxShadow =
            shadowInput.checked
              ? "0 15px 40px rgba(0,0,0,.22)"
              : "none";

        });

      }
    );
  }
}


/* =========================================================
   COLOR HELPERS
========================================================= */

function rgbToHex(color) {

  if (!color) return null;

  if (
    color.startsWith("#")
  ) {
    return normalizeHex(color);
  }

  const match =
    color.match(
      /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/
    );

  if (!match) {
    return null;
  }

  return (
    "#" +
    [match[1], match[2], match[3]]
      .map(x =>
        Number(x)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}


function normalizeHex(value) {

  if (!value) return "#000000";

  let hex =
    String(value).trim();

  if (!hex.startsWith("#")) {
    return hex;
  }

  if (hex.length === 4) {

    return "#" +
      hex[1] + hex[1] +
      hex[2] + hex[2] +
      hex[3] + hex[3];
  }

  return hex.toLowerCase();
}


function isValidColor(value) {

  if (!value) return false;

  const test =
    new Option().style;

  test.color = value;

  return test.color !== "";
}


/* =========================================================
   DUPLICATE
========================================================= */

function duplicateSelected() {

  const element =
    getSelectedElement();

  if (!element) {

    showToast("Select an element first.");

    return;
  }

  const clone =
    element.cloneNode(true);

  element.parentNode.insertBefore(
    clone,
    element.nextSibling
  );

  saveCurrentDocument();

  showToast("Element duplicated.");
}


/* =========================================================
   DELETE
========================================================= */

function deleteSelected() {

  const element =
    getSelectedElement();

  if (!element) {

    showToast("Select an element first.");

    return;
  }

  if (
    element.tagName.toLowerCase() === "body" ||
    element.tagName.toLowerCase() === "html"
  ) {

    showToast("That element cannot be deleted.");

    return;
  }

  element.remove();

  state.selectedSelector = null;

  saveCurrentDocument();

  clearInspector();

  showToast("Element deleted.");
}


/* =========================================================
   ADD ELEMENTS
========================================================= */

function addElement(type) {

  const doc =
    websitePreview.contentDocument;

  if (!doc || !doc.body) {

    showToast("Generate a website first.");

    return;
  }

  let element = null;


  if (type === "text") {

    element =
      doc.createElement("h2");

    element.textContent =
      "New heading";

    element.style.margin =
      "20px";

    element.style.fontSize =
      "32px";

    element.style.color =
      "#111";

  }


  if (type === "button") {

    element =
      doc.createElement("button");

    element.textContent =
      "Get Started";

    element.style.margin =
      "20px";

    element.style.padding =
      "12px 22px";

    element.style.border =
      "0";

    element.style.borderRadius =
      "10px";

    element.style.background =
      "#111";

    element.style.color =
      "#fff";

    element.style.cursor =
      "pointer";

  }


  if (type === "card") {

    element =
      doc.createElement("div");

    element.innerHTML = `
      <h3>New Card</h3>
      <p>Edit this card from the inspector.</p>
    `;

    element.style.margin =
      "20px";

    element.style.padding =
      "24px";

    element.style.borderRadius =
      "16px";

    element.style.background =
      "#f3f3f3";

    element.style.color =
      "#111";

  }


  if (type === "section") {

    element =
      doc.createElement("section");

    element.innerHTML = `
      <h2>New Section</h2>
      <p>Add your content here.</p>
    `;

    element.style.minHeight =
      "250px";

    element.style.padding =
      "60px 30px";

    element.style.background =
      "#111";

    element.style.color =
      "#fff";

  }


  if (!element) return;

  doc.body.appendChild(element);

  saveCurrentDocument();

  const selector =
    getElementSelector(element);

  state.selectedSelector =
    selector;

  websitePreview.contentWindow.postMessage({
    type: "SAMBHAV_CLEAR"
  }, "*");

  setTimeout(() => {

    openInspector({
      selector,
      tag: element.tagName.toLowerCase(),
      text: element.innerText || "",
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
      fontSize: parseInt(getComputedStyle(element).fontSize) || 16,
      fontWeight: getComputedStyle(element).fontWeight,
      padding: parseInt(getComputedStyle(element).paddingTop) || 0,
      radius: parseInt(getComputedStyle(element).borderRadius) || 0,
      shadow: getComputedStyle(element).boxShadow !== "none"
    });

  }, 50);

  showToast(
    `${type.charAt(0).toUpperCase() + type.slice(1)} added.`
  );
}


/* =========================================================
   LAYERS
========================================================= */

function renderLayers() {

  if (!layersList) return;

  const doc =
    websitePreview.contentDocument;

  if (!doc || !doc.body) {

    layersList.innerHTML = `
      <div class="layers-empty">
        Generate a website to see layers.
      </div>
    `;

    return;
  }

  const elements =
    [...doc.body.querySelectorAll("*")]
      .slice(0, 80);

  if (!elements.length) {

    layersList.innerHTML = `
      <div class="layers-empty">
        No editable elements.
      </div>
    `;

    return;
  }

  layersList.innerHTML = "";

  elements.forEach(element => {

    const item =
      document.createElement("button");

    item.className =
      "layer-item";

    item.type =
      "button";

    const tag =
      element.tagName.toLowerCase();

    let label =
      element.innerText?.trim()
        .split("\n")[0]
        .slice(0, 25);

    if (!label) {
      label = tag;
    }

    item.innerHTML = `
      <span class="layer-tag">
        ${escapeHTML(tag)}
      </span>

      <span class="layer-name">
        ${escapeHTML(label)}
      </span>
    `;

    item.addEventListener("click", () => {

      const selector =
        getElementSelector(element);

      state.selectedSelector =
        selector;

      openInspector({
        selector,
        tag,
        text: element.innerText || "",
        color: getComputedStyle(element).color,
        background: getComputedStyle(element).backgroundColor,
        fontSize: parseInt(getComputedStyle(element).fontSize) || 16,
        fontWeight: getComputedStyle(element).fontWeight,
        padding: parseInt(getComputedStyle(element).paddingTop) || 0,
        radius: parseInt(getComputedStyle(element).borderRadius) || 0,
        shadow: getComputedStyle(element).boxShadow !== "none"
      });

    });

    layersList.appendChild(item);
  });
}


/* =========================================================
   ESCAPE
========================================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   GENERATE
========================================================= */

async function generateWebsite() {

  if (state.generating) {
    return;
  }

  const prompt =
    promptInput.value.trim();

  if (!prompt) {

    showToast("Describe the website first.");

    promptInput.focus();

    return;
  }

  if (prompt.length > 12000) {

    showToast("Your prompt is too long.");

    return;
  }


  state.generating = true;

  generateBtn.disabled = true;

  generateBtn.style.opacity = ".65";
  generateBtn.style.pointerEvents = "none";


  showGeneration();

  startGenerationTimer();


  updateGenerationProgress(
    8,
    "INITIALIZING",
    "Understanding your idea",
    "Preparing the design system...",
    0
  );


  try {

    await sleep(550);


    updateGenerationProgress(
      25,
      "PLANNING",
      "Designing your experience",
      "Choosing layout, typography and visual direction...",
      1
    );


    await sleep(550);


    updateGenerationProgress(
      43,
      "BUILDING",
      "Building the interface",
      "Generating responsive HTML, CSS and interactions...",
      2
    );


    const response =
      await fetch(
        BACKEND_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            prompt
          })
        }
      );


    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Backend returned an invalid response."
      );
    }


    if (!response.ok) {

      throw new Error(
        data?.error ||
        `Generation failed (${response.status})`
      );
    }


    if (
      !data ||
      data.success !== true ||
      !data.html
    ) {

      throw new Error(
        "The AI did not return a valid website."
      );
    }


    updateGenerationProgress(
      78,
      "FINISHING",
      "Polishing the details",
      "Making everything responsive and ready...",
      3
    );


    await sleep(700);


    const html =
      normalizeHTML(data.html);

    if (!html) {
      throw new Error(
        "Generated HTML was empty."
      );
    }


    updateGenerationProgress(
      100,
      "COMPLETE",
      "Your website is ready",
      "Opening the visual editor...",
      3
    );


    await sleep(450);


    state.originalHTML =
      html;

    state.history = [];
    state.historyIndex = -1;

    state.html = html;


    showBuilder();

    loadWebsite(
      html,
      true
    );


    showToast(
      "Website generated successfully."
    );

  } catch (error) {

    console.error(
      "Sambhav generation error:",
      error
    );


    showLanding();

    showToast(
      error?.message ||
      "Something went wrong while generating."
    );

  } finally {

    stopGenerationTimer();

    state.generating = false;

    generateBtn.disabled = false;

    generateBtn.style.opacity = "";
    generateBtn.style.pointerEvents = "";
  }
}


/* =========================================================
   SLEEP
========================================================= */

function sleep(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


/* =========================================================
   PREVIEW MODE
========================================================= */

function enterPreview() {

  if (!state.html) {

    showToast("Generate a website first.");

    return;
  }

  state.previewMode = true;

  /*
    Remove editor bridge so generated buttons,
    links and interactions behave normally.
  */

  websitePreview.srcdoc =
    normalizeHTML(state.html);

  if (canvasEmpty) {
    canvasEmpty.classList.add("hidden");
  }

  showToast("Preview mode enabled.");
}


function exitPreview() {

  state.previewMode = false;

  websitePreview.srcdoc =
    injectEditorBridge(state.html);

  showToast("Back to editor.");
}


/* =========================================================
   DEVICE SWITCH
========================================================= */

function setDevice(device) {

  state.device = device;

  deviceFrame.classList.remove(
    "desktop",
    "tablet",
    "mobile"
  );

  deviceFrame.classList.add(device);


  $$(".device-button").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.device === device
    );

  });


  const label =
    $("#canvasSizeLabel");

  if (label) {

    label.textContent =
      device === "desktop"
        ? "Responsive"
        : device === "tablet"
          ? "768 × responsive"
          : "390 × responsive";
  }
}


/* =========================================================
   UPDATE CANVAS SIZE
========================================================= */

function updateCanvasSize() {

  setDevice(state.device);
}


/* =========================================================
   REFRESH
========================================================= */

function refreshWebsite() {

  if (!state.html) {

    showToast("Nothing to refresh.");

    return;
  }

  state.selectedSelector = null;

  websitePreview.srcdoc =
    state.previewMode
      ? state.html
      : injectEditorBridge(state.html);

  clearInspector();

  showToast("Preview refreshed.");
}


/* =========================================================
   EXPORT
========================================================= */

function exportWebsite() {

  if (!state.html) {

    showToast("Generate a website first.");

    return;
  }

  const clean =
    normalizeHTML(state.html);

  const blob =
    new Blob(
      [clean],
      { type: "text/html;charset=utf-8" }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = "sambhav-website.html";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showToast("Website exported.");
}


/* =========================================================
   RESET
========================================================= */

function resetWebsite() {

  if (!state.originalHTML) {

    showToast("Nothing to reset.");

    return;
  }

  state.html =
    normalizeHTML(
      state.originalHTML
    );

  pushHistory(state.html);

  websitePreview.srcdoc =
    injectEditorBridge(state.html);

  clearInspector();

  renderLayers();

  showToast("Website reset.");
}


/* =========================================================
   PROJECT NAME
========================================================= */

function renameProject() {

  const current =
    $("#projectNameBtn");

  if (!current) return;

  const name =
    prompt(
      "Project name:",
      current.textContent.trim()
    );

  if (!name) return;

  current.textContent =
    name.trim().slice(0, 50);
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

if (generateBtn) {

  generateBtn.addEventListener(
    "click",
    generateWebsite
  );
}


if (promptInput) {

  promptInput.addEventListener(
    "keydown",
    event => {

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "Enter"
      ) {

        event.preventDefault();

        generateWebsite();
      }

    }
  );
}


/* Examples */

$$(".example-chip").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      promptInput.value =
        button.dataset.prompt || "";

      promptInput.focus();
    }
  );

});


/* Undo / redo */

$("#undoBtn")?.addEventListener(
  "click",
  undo
);

$("#redoBtn")?.addEventListener(
  "click",
  redo
);


/* Refresh */

$("#refreshBtn")?.addEventListener(
  "click",
  refreshWebsite
);


/* Export */

$("#exportBtn")?.addEventListener(
  "click",
  exportWebsite
);


/* Preview */

$("#previewBtn")?.addEventListener(
  "click",
  () => {

    if (!state.previewMode) {
      enterPreview();
    } else {
      exitPreview();
    }

  }
);


/* Back */

$("#backToHomeBtn")?.addEventListener(
  "click",
  () => {

    if (
      state.html &&
      !confirm(
        "Return to the home screen? Your current editor state will be lost."
      )
    ) {
      return;
    }

    showLanding();

  }
);


/* Rename */

$("#projectNameBtn")?.addEventListener(
  "click",
  renameProject
);


/* Duplicate */

$("#duplicateBtn")?.addEventListener(
  "click",
  duplicateSelected
);


/* Delete */

$("#deleteBtn")?.addEventListener(
  "click",
  deleteSelected
);


/* Close inspector */

$("#closeInspectorBtn")?.addEventListener(
  "click",
  () => {

    inspector.classList.remove(
      "mobile-open"
    );

    websitePreview.contentWindow?.postMessage({
      type: "SAMBHAV_CLEAR"
    }, "*");

  }
);


/* Mobile inspector */

$("#mobileInspectorOpen")?.addEventListener(
  "click",
  () => {

    if (!state.selectedSelector) {

      showToast("Select an element first.");

      return;
    }

    inspector.classList.add(
      "mobile-open"
    );

  }
);


/* Add elements */

$$("[data-add]").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      addElement(
        button.dataset.add
      );

    }
  );

});


/* Device buttons */

$$(".device-button").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      setDevice(
        button.dataset.device
      );

    }
  );

});


/* Sidebar tabs */

$$(".sidebar-tab").forEach(tab => {

  tab.addEventListener(
    "click",
    () => {

      const panel =
        tab.dataset.panel;

      $$(".sidebar-tab").forEach(item => {
        item.classList.remove("active");
      });

      tab.classList.add("active");


      $("#elementsPanel")
        ?.classList.toggle(
          "hidden",
          panel !== "elements"
        );

      $("#layersPanel")
        ?.classList.toggle(
          "hidden",
          panel !== "layers"
        );

    }
  );

});


/* Escape */

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {

      if (inspector) {
        inspector.classList.remove(
          "mobile-open"
        );
      }

      if (state.previewMode) {
        exitPreview();
      }
    }

  }
);


/* =========================================================
   IFRAME LOAD
========================================================= */

websitePreview?.addEventListener(
  "load",
  () => {

    if (!state.previewMode) {

      /*
        Make sure iframe has a white background
        while loading unusual generated documents.
      */

      try {

        const body =
          websitePreview.contentDocument?.body;

        if (body) {
          body.style.minHeight = "100%";
        }

      } catch {}

    }

    setTimeout(() => {

      renderLayers();

    }, 100);

  }
);


/* =========================================================
   INITIAL STATE
========================================================= */

function initialize() {

  showLanding();

  updateHistoryButtons();

  setDevice("desktop");

  if (promptInput) {
    promptInput.focus();
  }
}


initialize();