"use strict";

/*
  SAMBHAV AI WEBSITE BUILDER

  Configure BACKEND_URL to your existing backend.
  The expected endpoint is POST /api/generate.

  Suggested request:
  { "prompt": "Build a portfolio website" }

  Suggested response:
  {
    "html": "<main>...</main>",
    "css": "body { ... }",
    "js": "console.log('Website ready');"
  }

  Do not put private AI API keys in this file.
*/

const BACKEND_URL ="https://website-builder-backend-nu.vercel.app/api/generate";

// Initial editable example project
const starterFiles = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My First Website</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="nav">
    <a class="logo" href="#">NOVA<span>.</span></a>
    <a class="nav-link" href="#about">About</a>
  </nav>

  <main class="hero">
    <p class="eyebrow">YOUR NEXT BIG IDEA</p>
    <h1>Build beyond<br><span>the ordinary.</span></h1>
    <p class="description">
      A beautiful website starts with an idea.
      Use Sambhav AI Studio to bring yours to life.
    </p>
    <a class="cta" href="#about">Explore more ↗</a>
  </main>

  <section class="about" id="about">
    <h2>Made for your ideas.</h2>
    <p>Edit the HTML, CSS and JavaScript in the editor to customise this page.</p>
  </section>

  <script src="script.js"><\/script>
</body>
</html>`,

  css: `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #090711;
  color: #ffffff;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 8%;
  border-bottom: 1px solid #29233c;
}

.logo {
  color: white;
  font-size: 22px;
  font-weight: 800;
  text-decoration: none;
}

.logo span,
.hero h1 span {
  color: #bd78ff;
}

.nav-link {
  color: #d3c8e7;
  text-decoration: none;
}

.hero {
  padding: 110px 8%;
  background: radial-gradient(ellipse at 80% 20%, #41215b, transparent 50%);
}

.eyebrow {
  color: #d18aff;
  font-size: 12px;
  letter-spacing: 3px;
}

.hero h1 {
  font-size: clamp(42px, 7vw, 82px);
  line-height: 1.05;
  margin: 20px 0;
}

.description,
.about p {
  color: #aaa2bb;
  line-height: 1.8;
  max-width: 540px;
}

.cta {
  display: inline-block;
  margin-top: 22px;
  padding: 14px 20px;
  border-radius: 8px;
  background: linear-gradient(100deg, #8438ed, #d13b9d);
  color: white;
  text-decoration: none;
}

.about {
  padding: 55px 8%;
  background: #100e1b;
}

.about h2 {
  font-size: 28px;
}`,

  js: `// Your website JavaScript
console.log("Website loaded successfully");

// Example interactive button:
document.querySelectorAll(".cta").forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Explore button clicked");
  });
});`
};

const state = {
  activeFile: "html",
  files: { ...starterFiles },
  savedFiles: { ...starterFiles },
  busy: false,
  toastTimer: null
};

const $ = (selector) => document.querySelector(selector);

const codeEditor = $("#codeEditor");
const lineNumbers = $("#lineNumbers");
const promptInput = $("#promptInput");
const generateBtn = $("#generateBtn");
const previewFrame = $("#previewFrame");
const previewCanvas = $("#previewCanvas");
const connectionStatus = $("#connectionStatus");
const previewStatus = $("#previewStatus");
const footerMessage = $("#footerMessage");
const fileStatus = $("#fileStatus");
const lineCount = $("#lineCount");
const promptCount = $("#promptCount");
const toast = $("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function setStatus(message) {
  connectionStatus.textContent = message;
}

function setFooter(message) {
  footerMessage.textContent = message;
}

function updateLineNumbers() {
  const total = Math.max(1, codeEditor.value.split("\n").length);

  lineNumbers.textContent = Array.from(
    { length: total },
    (_, index) => index + 1
  ).join("\n");

  lineCount.textContent = total;
}

function openFile(fileName) {
  state.activeFile = fileName;
  codeEditor.value = state.files[fileName];

  document.querySelectorAll(".file-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.file === fileName);
  });

  fileStatus.textContent = {
    html: "index.html",
    css: "style.css",
    js: "script.js"
  }[fileName];

  updateLineNumbers();
}

function saveCurrentEditor() {
  state.files[state.activeFile] = codeEditor.value;
}

function buildDocument() {
  const html = state.files.html || "";
  const css = state.files.css || "";
  const js = state.files.js || "";

  // Embed CSS and JS for a portable, single-file preview.
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  const safeJs = js.replace(/<\/script/gi, "<\\/script");

  let documentHtml = html;

  if (/<\/head\s*>/i.test(documentHtml)) {
    documentHtml = documentHtml.replace(
      /<\/head\s*>/i,
      `<style>${safeCss}</style></head>`
    );
  } else {
    documentHtml = `<style>${safeCss}</style>\n${documentHtml}`;
  }

  if (/<\/body\s*>/i.test(documentHtml)) {
    documentHtml = documentHtml.replace(
      /<\/body\s*>/i,
      `<script>${safeJs}<\/script></body>`
    );
  } else {
    documentHtml += `\n<script>${safeJs}<\/script>`;
  }

  return documentHtml;
}

function renderPreview() {
  saveCurrentEditor();

  previewFrame.srcdoc = buildDocument();
  previewStatus.textContent = "Updated";
  setFooter("Preview updated successfully.");
}

function selectView(view) {
  document.querySelectorAll(".side-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  if (view === "editor") {
    $("#workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    codeEditor.focus();
  } else if (view === "preview") {
    $("#previewPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } else {
    $("#builderView").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    promptInput.focus();
  }
}

function normaliseGeneratedFiles(data) {
  // Support common API response formats.
  const result = data?.files || data?.website || data?.result || data;

  let html = result?.html ?? result?.["index.html"];
  let css = result?.css ?? result?.["style.css"];
  let js = result?.js ?? result?.javascript ?? result?.["script.js"];

  // Some backends return generated files inside a nested object.
  if (typeof result?.code === "object" && result.code !== null) {
    html ??= result.code.html ?? result.code["index.html"];
    css ??= result.code.css ?? result.code["style.css"];
    js ??= result.code.js ?? result.code["script.js"];
  }

  // Support a single HTML string returned by the backend.
  if (!html && typeof result?.code === "string") {
    html = result.code;
  }

  if (!html && typeof result?.content === "string") {
    html = result.content;
  }

  // Strip Markdown fences when the backend returns code blocks.
  const clean = (value) => {
    if (typeof value !== "string") return null;

    return value
      .replace(/^```(?:html|css|javascript|js)?\s*/i, "")
      .replace(/\s*```$/, "");
  };

  html = clean(html);
  css = clean(css);
  js = clean(js);

  if (!html && !css && !js) {
    throw new Error(
      "The backend response did not contain HTML, CSS or JavaScript. Check its response format."
    );
  }

  return {
    html: html ?? state.files.html,
    css: css ?? state.files.css,
    js: js ?? state.files.js
  };
}

async function generateWebsite() {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showToast("Enter a website idea first.");
    promptInput.focus();
    return;
  }

  if (state.busy) return;

  saveCurrentEditor();
  state.busy = true;
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  setStatus("Connecting to backend...");
  setFooter("Waiting for your backend to generate the website.");

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        `Backend returned non-JSON data (HTTP ${response.status}). Check the API route.`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message ||
        `Backend request failed (HTTP ${response.status}).`
      );
    }

    const generated = normaliseGeneratedFiles(data);

    state.files = generated;
    state.savedFiles = { ...generated };

    openFile("html");
    renderPreview();

    setStatus("Backend connected");
    showToast("Website generated successfully!");
    setFooter("Generated files are ready to edit and download.");
  } catch (error) {
    console.error("Website generation error:", error);

    setStatus("Backend connection failed");
    setFooter(error.message || "Could not generate the website.");

    showToast(error.message || "Could not connect to the backend.");
  } finally {
    state.busy = false;
    generateBtn.disabled = false;
    generateBtn.innerHTML = "<span>✦</span> Generate Website";
  }
}

function downloadFile(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadWebsite() {
  saveCurrentEditor();

  // Produce a single self-contained HTML file.
  downloadFile(
    "website.html",
    buildDocument(),
    "text/html;charset=utf-8"
  );

  showToast("Downloaded website.html");
}

function resetProject() {
  if (!confirm("Reset all editor files to the starter website?")) {
    return;
  }

  state.files = { ...starterFiles };
  state.savedFiles = { ...starterFiles };

  openFile("html");
  renderPreview();

  showToast("Project reset to starter files.");
}

function setDevice(device) {
  previewCanvas.classList.remove(
    "device-desktop",
    "device-tablet",
    "device-mobile"
  );

  previewCanvas.classList.add(`device-${device}`);

  document.querySelectorAll(".device-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.device === device);
  });
}

function openPreviewInNewTab() {
  saveCurrentEditor();

  const blob = new Blob([buildDocument()], {
    type: "text/html;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank", "noopener,noreferrer");

  if (!tab) {
    URL.revokeObjectURL(url);
    showToast("Allow pop-ups to open the preview.");
    return;
  }

  // Keep the blob URL available for the new tab.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// File switching
document.querySelectorAll(".file-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    saveCurrentEditor();
    openFile(tab.dataset.file);
  });
});

// Navigation
document.querySelectorAll(".side-item").forEach((item) => {
  item.addEventListener("click", () => selectView(item.dataset.view));
});

// Prompt suggestions
document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt;
    promptCount.textContent = `${promptInput.value.length} characters`;
    promptInput.focus();
  });
});

promptInput.addEventListener("input", () => {
  promptCount.textContent = `${promptInput.value.length} characters`;
});

// Editor changes update the local project.
codeEditor.addEventListener("input", () => {
  saveCurrentEditor();
  updateLineNumbers();
  previewStatus.textContent = "Changes pending";
});

codeEditor.addEventListener("keydown", (event) => {
  // Support indentation with the Tab key.
  if (event.key === "Tab") {
    event.preventDefault();

    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const value = codeEditor.value;

    codeEditor.value =
      value.slice(0, start) + "  " + value.slice(end);

    codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;

    saveCurrentEditor();
    updateLineNumbers();
  }

  // Ctrl/Cmd + Enter runs the preview.
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    renderPreview();
  }
});

$("#generateBtn").addEventListener("click", generateWebsite);
$("#runBtn").addEventListener("click", renderPreview);
$("#refreshBtn").addEventListener("click", renderPreview);
$("#downloadBtn").addEventListener("click", downloadWebsite);
$("#resetBtn").addEventListener("click", resetProject);
$("#openPreviewBtn").addEventListener("click", openPreviewInNewTab);

document.querySelectorAll(".device-btn").forEach((button) => {
  button.addEventListener("click", () => setDevice(button.dataset.device));
});

// Initial project preview.
openFile("html");
renderPreview();
setStatus("Builder ready");