
const API_URL = "https://website-builder-backend-nu.vercel.app/api/generate";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const el = {
    landing: $("#landingScreen"),
    generation: $("#generationScreen"),
    builder: $("#builderScreen"),
    prompt: $("#promptInput"),
    generate: $("#generateBtn"),
    preview: $("#websitePreview"),
    frame: $("#deviceFrame"),
    empty: $("#canvasEmpty"),
    canvas: $("#canvasArea"),
    inspector: $("#inspector"),
    inspectorContent: $("#inspectorContent"),
    selectedType: $("#selectedType"),
    toast: $("#toast"),
    toastText: $("#toastText"),
    projectName: $("#projectNameBtn"),
    progress: $("#generationProgress"),
    progressText: $("#progressText"),
    title: $("#generationTitle"),
    subtitle: $("#generationSubtitle"),
    stage: $("#generationStage"),
    timer: $("#generationTimer")
  };

  let projectName = "Untitled Website";
  let currentHTML = "";
  let selected = null;
  let history = [];
  let historyIndex = -1;
  let busy = false;
  let generationStarted = 0;
  let timerInterval = null;
  let frameReady = false;
  let editorToken = "";
  let snapshotPending = false;
  let toastTimeout = null;
  let exportTimeout = null;

  // Smooth progress variables
  let progressInterval = null;
  let livePercent = 0;

  const editorStyle = `[data-sambhav-selected="true"] {
outline: 2px solid #9b7cff !important;
outline-offset: 3px !important;
cursor: pointer !important;
}

[data-sambhav-selected="true"]:focus {
outline: 2px solid #9b7cff !important;
}`;

  const watermarkCSS = `
<style id="sambhav-branding">
.sambhav-watermark {
  position: fixed;
  right: 16px;
  bottom: 14px;
  z-index: 2147483647;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 14px;
  background: rgba(15,15,20,.78);
  color: #fff !important;
  font: 500 12px/1.2 system-ui, sans-serif;
  text-decoration: none !important;
  box-shadow: 0 4px 24px rgba(0,0,0,.2);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: transform .2s ease, background .2s ease;
}

.sambhav-watermark:hover {
  transform: translateY(-2px);
  background: rgba(35,25,55,.94);
}

.sambhav-watermark .sambhav-mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #a78bfa, #6d5cff);
  color: white;
  font-size: 13px;
  font-weight: 800;
}

@media print {
  .sambhav-watermark {
    display: none !important;
  }
}
</style>`;

  const watermarkHTML = `
<a
class="sambhav-watermark"
href="https://sambhav-glitch07.github.io/Website-Builder-/"
target="_blank"
rel="noopener noreferrer"
aria-label="Created by Sambhav AI"

«»

<span class="sambhav-mark"></span>
<span>Created by Sambhav AI</span>
</a>`;

  function toast(message) {
    if (!el.toast || !el.toastText) {
      console.log(message);
      return;
    }

    el.toastText.textContent = message;
    el.toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 2800);
  }

  function screen(which) {
    [el.landing, el.generation, el.builder].forEach(node => {
      if (node) node.hidden = true;
    });

    if (which) which.hidden = false;
  }

  function setProgress(value) {
    const amount = Math.max(0, Math.min(100, value));

    if (el.progress) el.progress.style.width = amount + "%";
    if (el.progressText) el.progressText.textContent = amount + "%";

    $("#generationProgressBar")?.setAttribute(
      "aria-valuenow",
      String(amount)
    );
  }

  // Smoothly animate progress while the website is generating.
  function startSmoothProgress() {
    stopSmoothProgress();

    livePercent = 1;
    setProgress(livePercent);

    progressInterval = setInterval(() => {
      if (livePercent >= 95) {
        stopSmoothProgress();
        return;
      }

      livePercent += 1;
      setProgress(livePercent);
    }, 180);
  }

  // Smoothly complete the progress bar after generation succeeds.
  function completeSmoothProgress() {
    stopSmoothProgress();

    progressInterval = setInterval(() => {
      if (livePercent >= 100) {
        stopSmoothProgress();
        setProgress(100);
        return;
      }

      livePercent = Math.min(livePercent + 2, 100);
      setProgress(livePercent);
    }, 35);
  }

  function stopSmoothProgress() {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function setBusy(value) {
    busy = value;

    if (el.generate) {
      el.generate.disabled = value;
      el.generate.setAttribute("aria-busy", String(value));
    }
  }

  function setProjectName(name) {
    projectName = (name || "").trim().slice(0, 100) || "Untitled Website";

    if (el.projectName) {
      el.projectName.replaceChildren();
      el.projectName.append(document.createTextNode(projectName + " "));

      const arrow = document.createElement("span");
      arrow.textContent = "⌄";
      el.projectName.append(arrow);
    }
  }

  function safeFilename(name) {
    return (name || "website")
      .replace(/[<>:"\/\\|?*\x00-\x1F]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "website";
  }

  function hexColor(value) {
    if (!value) return "#000000";
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;

    const match = value.match(
      /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i
    );

    if (!match) return "#000000";

    return "#" + match.slice(1, 4)
      .map(n => Number(n).toString(16).padStart(2, "0"))
      .join("");
  }

  function injectEditor(html) {
    editorToken =
      window.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now();

    const editorScript = `
<script data-sambhav-editor>
(() => {
  const token = ${JSON.stringify(editorToken)};

  const send = (type, data = {}) => {
    parent.postMessage({
      source: "sambhav-editor",
      token,
      type,
      ...data
    }, "*");
  };

  const style = document.createElement("style");
  style.dataset.sambhavEditor = "true";
  style.textContent = ${JSON.stringify(editorStyle)};
  document.head.appendChild(style);

  let current = null;
  let layerCounter = 0;

  function selectElement(node) {
    if (
      !node ||
      node === document.body ||
      node === document.documentElement ||
      node.closest("[data-sambhav-editor]")
    ) return;

    current?.removeAttribute("data-sambhav-selected");
    current = node;
    current.setAttribute("data-sambhav-selected", "true");

    const css = getComputedStyle(node);

    send("selected", {
      tag: node.tagName.toLowerCase(),
      text: node.innerText || node.alt || "",
      color: css.color,
      background: css.backgroundColor,
      fontSize: parseFloat(css.fontSize) || 16,
      fontWeight: css.fontWeight || "400",
      padding: parseFloat(css.paddingTop) || 0,
      radius: parseFloat(css.borderRadius) || 0,
      shadow: css.boxShadow !== "none",
      isImage: node.tagName === "IMG",
      src: node.tagName === "IMG" ? node.getAttribute("src") || "" : ""
    });
  }

  document.addEventListener("click", event => {
    const target = event.target;

    if (!(target instanceof Element)) return;
    if (target.closest("[data-sambhav-editor]")) return;
    if (target.closest(".sambhav-watermark")) return;

    const node = target.closest(
      "h1,h2,h3,h4,h5,h6,p,span,a,button,li,small,strong,em," +
      "blockquote,img,figure,article,section,div,input,textarea,label"
    );

    if (!node) return;
    if (
      node === document.body ||
      node === document.documentElement ||
      node.closest("[data-sambhav-editor]") ||
      node.closest(".sambhav-watermark")
    ) return;

    event.preventDefault();
    event.stopPropagation();

    selectElement(node);
  }, true);

  window.addEventListener("message", event => {
    const msg = event.data;

    if (
      !msg ||
      msg.source !== "sambhav-parent" ||
      msg.token !== token
    ) return;

    if (msg.type === "select") {
      try {
        selectElement(document.querySelector(msg.selector));
      } catch (error) {
        console.warn("Invalid layer selector", error);
      }
      return;
    }

    if (msg.type === "edit" && current) {
      const value = msg.value;

      switch (msg.property) {
        case "text":
          if (current.tagName === "IMG") {
            current.alt = String(value);
          } else {
            current.textContent = String(value);
          }
          break;

        case "color":
          current.style.setProperty("color", value);
          break;

        case "background":
          current.style.setProperty("background-color", value);
          break;

        case "fontSize":
          current.style.setProperty("font-size", Number(value) + "px");
          break;

        case "fontWeight":
          current.style.setProperty("font-weight", String(value));
          break;

        case "padding":
          current.style.setProperty("padding", Number(value) + "px");
          break;

        case "radius":
          current.style.setProperty("border-radius", Number(value) + "px");
          break;

        case "shadow":
          current.style.setProperty(
            "box-shadow",
            value ? "0 8px 28px rgba(0,0,0,.22)" : "none"
          );
          break;

        case "image":
          if (current.tagName === "IMG") {
            current.setAttribute("src", String(value));
          }
          break;

        case "delete":
          current.remove();
          current = null;
          send("deselected");
          send("changed");
          return;

        case "reset":
          current.removeAttribute("style");
          break;
      }

      selectElement(current);
      send("changed");
      return;
    }

    if (msg.type === "add") {
      const node = document.createElement(
        msg.kind === "button" ? "a" :
        msg.kind === "image" ? "img" :
        msg.kind === "section" ? "section" :
        msg.kind === "card" ? "article" :
        "h2"
      );

      node.dataset.sambhavAdded = "true";
      node.style.cssText = "box-sizing:border-box;margin:20px;padding:20px;";

      if (msg.kind === "button") {
        node.textContent = "Your call to action";
        node.href = "#";
        node.style.cssText +=
          "display:inline-block;background:#7957ff;color:white;" +
          "padding:12px 20px;border-radius:10px;text-decoration:none;";
      } else if (msg.kind === "image") {
        node.src = "https://placehold.co/800x500?text=Your+Image";
        node.alt = "Your image";
        node.style.cssText +=
          "display:block;width:100%;max-width:600px;height:auto;";
      } else if (msg.kind === "card") {
        const heading = document.createElement("h2");
        heading.textContent = "New card";

        const paragraph = document.createElement("p");
        paragraph.textContent = "Add your content here.";

        node.append(heading, paragraph);
        node.style.cssText += "border:1px solid #ddd;border-radius:16px;";
      } else if (msg.kind === "section") {
        const heading = document.createElement("h2");
        heading.textContent = "New section";

        const paragraph = document.createElement("p");
        paragraph.textContent = "Write something here.";

        node.append(heading, paragraph);
      } else {
        node.textContent = "Your new heading";
      }

      document.body.appendChild(node);
      selectElement(node);
      send("changed");
      return;
    }

    if (msg.type === "duplicate" && current) {
      const copy = current.cloneNode(true);
      copy.removeAttribute("data-sambhav-selected");
      copy.removeAttribute("data-sambhav-layer-id");
      copy.removeAttribute("id");

      current.after(copy);
      selectElement(copy);
      send("changed");
      return;
    }

    if (msg.type === "layers") {
      const selector = [
        "h1", "h2", "h3", "h4", "h5", "h6", "p",
        "button", "a", "img", "section", "article"
      ].join(",");

      const items = [...document.body.querySelectorAll(selector)]
        .filter(node =>
          !node.closest("[data-sambhav-editor]") &&
          !node.closest(".sambhav-watermark")
        );

      send("layers", {
        items: items.slice(0, 150).map(node => {
          if (!node.dataset.sambhavLayerId) {
            node.dataset.sambhavLayerId = "layer-" + (++layerCounter);
          }

          return {
            selector: '[data-sambhav-layer-id="' +
              node.dataset.sambhavLayerId + '"]',
            tag: node.tagName.toLowerCase(),
            text: (node.innerText || node.alt || "").trim().slice(0, 70)
          };
        })
      });
      return;
    }

    if (msg.type === "export") {
      const clone = document.documentElement.cloneNode(true);

      clone.querySelectorAll(
        "script[data-sambhav-editor],style[data-sambhav-editor]"
      ).forEach(node => node.remove());

      clone.querySelectorAll(
        "[data-sambhav-selected],[data-sambhav-layer-id]"
      ).forEach(node => {
        node.removeAttribute("data-sambhav-selected");
        node.removeAttribute("data-sambhav-layer-id");
      });

      send("exported", {
        html: "<!DOCTYPE html>\\n" + clone.outerHTML
      });
    }
  });

  send("ready");
})();
<\/script>`;

    const editorCSS = `
<style data-sambhav-editor>
${editorStyle}
</style>`;

    let output = String(html);

    // Add the watermark to generated websites, avoiding duplicates.
    if (!/class=["'][^"']*\bsambhav-watermark\b/i.test(output)) {
      if (/<\/body\s*>/i.test(output)) {
        output = output.replace(
          /<\/body\s*>/i,
          watermarkHTML + "</body>"
        );
      } else {
        output += watermarkHTML;
      }
    }

    // Add watermark and editor styles to the document.
    if (/<\/head\s*>/i.test(output)) {
      output = output.replace(
        /<\/head\s*>/i,
        watermarkCSS + editorCSS + "</head>"
      );
    } else {
      output = watermarkCSS + editorCSS + output;
    }

    // Keep the existing editor script injection.
    if (/<\/body\s*>/i.test(output)) {
      output = output.replace(
        /<\/body\s*>/i,
        editorScript + "</body>"
      );
    } else {
      output += editorScript;
    }

    return output;
  }

  function sendToFrame(type, payload = {}) {
    if (!el.preview?.contentWindow || !editorToken) return;

    el.preview.contentWindow.postMessage({
      source: "sambhav-parent",
      token: editorToken,
      type,
      ...payload
    }, "*");
  }

  function remember(html) {
    if (typeof html !== "string" || !html.trim()) return;

    if (history[historyIndex] === html) {
      updateHistoryButtons();
      return;
    }

    history = history.slice(0, historyIndex + 1);
    history.push(html);

    if (history.length > 40) history.shift();

    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const undo = $("#undoBtn");
    const redo = $("#redoBtn");

    if (undo) undo.disabled = historyIndex <= 0;
    if (redo) {
      redo.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
    }
  }

  function loadHTML(html, addHistory = true) {
    if (typeof html !== "string" || !html.trim()) {
      toast("No website HTML is available to load.");
      return;
    }

    currentHTML = html;
    selected = null;
    frameReady = false;
    snapshotPending = false;

    if (el.inspectorContent) {
      el.inspectorContent.innerHTML = `
        <div class="inspector-empty">
          <div class="empty-select-icon">⌁</div>
          <strong>Select an element</strong>
          <p>Click an element in the preview to edit it.</p>
        </div>`;
    }

    if (el.selectedType) {
      el.selectedType.textContent = "Nothing selected";
    }

    if (el.preview) el.preview.srcdoc = injectEditor(html);

    if (el.frame) {
      el.frame.hidden = false;
      el.frame.style.display = "block";
    }

    if (el.empty) el.empty.hidden = true;

    if (addHistory) remember(html);
  }

  function goHistory(index) {
    if (index < 0 || index >= history.length) return;

    historyIndex = index;
    updateHistoryButtons();
    loadHTML(history[index], false);
  }

  function updateSelection(data) {
    selected = data;

    if (el.selectedType) {
      el.selectedType.textContent =
        data.tag.toUpperCase() + (data.isImage ? " · IMAGE" : "");
    }

    if (!el.inspectorContent) return;

    const template = $("#inspectorTemplate");

    if (template) {
      el.inspectorContent.replaceChildren(template.content.cloneNode(true));
    }

    if (data.isImage) {
      const section = document.createElement("div");
      section.className = "inspector-section";

      section.innerHTML = `
        <div class="section-title">IMAGE <span>06</span></div>
        <label class="field-label" for="imageUrlInput">Image URL</label>
        <input id="imageUrlInput" class="field-input" type="url"
               placeholder="https://example.com/photo.jpg">
        <button id="applyImageUrlBtn" class="secondary-button" type="button">
          Apply image URL
        </button>`;

      el.inspectorContent.prepend(section);
      $("#imageUrlInput").value = data.src || "";

      $("#applyImageUrlBtn").addEventListener("click", () => {
        const value = $("#imageUrlInput").value.trim();

        try {
          const url = new URL(value);
          if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Invalid protocol");
          }
        } catch {
          toast("Enter a valid HTTP or HTTPS image URL.");
          return;
        }

        edit("image", value);
      });
    }

    const textInput = $("#editText");

    if (textInput) {
      textInput.value = data.text || "";
      textInput.addEventListener("change", () => {
        edit("text", textInput.value);
      });
    }

    bindValue("#fontSizeInput", data.fontSize, value => edit("fontSize", value));
    bindValue("#fontWeightInput", data.fontWeight, value => edit("fontWeight", value));
    bindValue("#paddingInput", data.padding, value => edit("padding", value));
    bindValue("#radiusInput", data.radius, value => edit("radius", value));

    bindColor("#textColorInput", "#textColorText", data.color, "color");
    bindColor(
      "#backgroundColorInput",
      "#backgroundColorText",
      data.background,
      "background"
    );

    const shadow = $("#shadowInput");

    if (shadow) {
      shadow.checked = !!data.shadow;
      shadow.addEventListener("change", () => {
        edit("shadow", shadow.checked);
      });
    }

    $("#resetElementBtn")?.addEventListener("click", () => {
      if (!confirm("Reset the selected element's inline styles?")) return;
      edit("reset");
    });

    if ($("#mobileSelectionName")) {
      $("#mobileSelectionName").textContent = data.tag;
    }

    buildLayers();
  }

  function bindValue(selector, initial, callback) {
    const input = $(selector);
    if (!input) return;

    input.value = initial;

    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;

      const min = input.min === "" ? 0 : Number(input.min);
      const max = input.max === "" ? 1000 : Number(input.max);

      callback(Math.max(min, Math.min(max, value)));
    });
  }

  function bindColor(pickerSelector, textSelector, initial, property) {
    const picker = $(pickerSelector);
    const text = $(textSelector);
    const color = hexColor(initial);

    if (picker) picker.value = color;
    if (text) text.value = color;

    picker?.addEventListener("input", () => {
      if (text) text.value = picker.value;
      edit(property, picker.value);
    });

    text?.addEventListener("change", () => {
      if (!/^#[0-9a-f]{6}$/i.test(text.value)) {
        toast("Enter a color like #ffffff.");
        text.value = picker?.value || color;
        return;
      }

      if (picker) picker.value = text.value;
      edit(property, text.value);
    });
  }

  function edit(property, value) {
    if (!selected) {
      toast("Select an element in the preview first.");
      return;
    }

    snapshotPending = true;
    sendToFrame("edit", { property, value });
  }

  function buildLayers() {
    if (frameReady) sendToFrame("layers");
  }

  function addElement(kind) {
    if (!frameReady) {
      toast("Generate a website first.");
      return;
    }

    snapshotPending = true;
    sendToFrame("add", { kind });
    toast("Element added.");
  }

  function requestExport(openPreview = false) {
    if (!currentHTML) {
      toast("Generate a website before exporting.");
      return;
    }

    let previewTab = null;

    // Open synchronously during the button click to avoid popup blocking.
    if (openPreview) {
      previewTab = window.open("about:blank", "_blank");

      if (!previewTab) {
        toast("Allow pop-ups to open the website preview.");
        return;
      }
    }

    clearTimeout(exportTimeout);

    const handler = event => {
      if (
        event.source !== el.preview?.contentWindow ||
        event.data?.source !== "sambhav-editor" ||
        event.data?.token !== editorToken ||
        event.data?.type !== "exported"
      ) return;

      window.removeEventListener("message", handler);
      clearTimeout(exportTimeout);

      const html = event.data.html;

      if (typeof html !== "string" || !html.trim()) {
        previewTab?.close();
        toast("Could not prepare the website.");
        return;
      }

      currentHTML = html;

      const blob = new Blob([html], {
        type: "text/html;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);

      if (openPreview) {
        try {
          previewTab.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error) {
          URL.revokeObjectURL(url);
          previewTab.close();
          toast("Could not open the preview.");
        }
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = safeFilename(projectName) + ".html";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Website exported successfully.");
      }
    };

    window.addEventListener("message", handler);
    sendToFrame("export");

    exportTimeout = setTimeout(() => {
      window.removeEventListener("message", handler);
      previewTab?.close();
      toast("Preview timed out. Refresh and try again.");
    }, 5000);
  }

  window.addEventListener("message", event => {
    if (
      event.source !== el.preview?.contentWindow ||
      event.data?.source !== "sambhav-editor" ||
      event.data?.token !== editorToken
    ) return;

    const data = event.data;

    if (data.type === "ready") {
      frameReady = true;
      toast("Editor ready. Click an element to edit it.");
      return;
    }

    if (data.type === "selected") {
      console.log("Sambhav selected element:", data);
      updateSelection(data);
      return;
    }

    if (data.type === "deselected") {
      selected = null;
      if (el.selectedType) el.selectedType.textContent = "Nothing selected";
      return;
    }

    if (data.type === "changed") {
      snapshotPending = true;
      sendToFrame("export");
      return;
    }

    if (data.type === "exported") {
      if (typeof data.html !== "string" || !data.html.trim()) return;

      currentHTML = data.html;

      if (snapshotPending) {
        remember(data.html);
        snapshotPending = false;
      }
      return;
    }

    if (data.type === "layers") {
      const list = $("#layersList");
      if (!list) return;

      list.replaceChildren();

      if (!data.items?.length) {
        list.textContent = "No editable layers found.";
        return;
      }

      data.items.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "layer-item";
        button.textContent =
          item.tag.toUpperCase() + " — " + (item.text || "Untitled");

        button.addEventListener("click", () => {
          sendToFrame("select", { selector: item.selector });
        });

        list.appendChild(button);
      });
    }
  });

  async function generateWebsite() {
    const promptText = el.prompt?.value.trim();

    if (!promptText) {
      toast("Describe your website first.");
      el.prompt?.focus();
      return;
    }

    if (busy) return;

    setBusy(true);
    screen(el.generation);
    startSmoothProgress();

    if (el.title) el.title.textContent = "Creating your website...";
    if (el.subtitle) el.subtitle.textContent = "Connecting to Sambhav AI.";
    if (el.stage) el.stage.textContent = "PHASE 01 / DISCOVERY";

    generationStarted = Date.now();

    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      if (el.timer) {
        el.timer.textContent =
          ((Date.now() - generationStarted) / 1000).toFixed(1) + "s";
      }
    }, 100);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error || data.message || `Request failed (${response.status})`
        );
      }

      const generatedHTML =
        typeof data.html === "string" ? data.html :
        typeof data.data?.html === "string" ? data.data.html :
        typeof data.result?.html === "string" ? data.result.html :
        typeof data.website === "string" ? data.website :
        "";

      if (!generatedHTML.trim()) {
        throw new Error("The backend returned no website HTML.");
      }

      currentHTML = generatedHTML;
      history = [];
      historyIndex = -1;
      snapshotPending = false;

      setProjectName(
        promptText.split(/\s+/).slice(0, 5).join(" ")
          .replace(/[.,!?]+$/, "") || "My Website"
      );

      loadHTML(currentHTML);
      screen(el.builder);
      completeSmoothProgress();
      toast("Website generated!");

    } catch (error) {
      stopSmoothProgress();
      console.error("Website generation failed:", error);
      screen(el.landing);
      toast(error.message || "Generation failed. Please try again.");
    } finally {
      clearInterval(timerInterval);
      setBusy(false);
    }
  }

  el.generate?.addEventListener("click", generateWebsite);

  el.prompt?.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      generateWebsite();
    }
  });

  $$(".example-chip").forEach(button => {
    button.addEventListener("click", () => {
      if (!el.prompt) return;
      el.prompt.value = button.dataset.prompt || "";
      el.prompt.focus();
    });
  });

  $("#emptyGenerateBtn")?.addEventListener("click", () => {
    screen(el.landing);
    el.prompt?.focus();
  });

  $("#cancelGenerationBtn")?.addEventListener("click", () => {
    clearInterval(timerInterval);
    stopSmoothProgress();
    setBusy(false);
    screen(el.landing);
  });

  $("#backToHomeBtn")?.addEventListener("click", () => {
    screen(el.landing);
  });

  $("#exportBtn")?.addEventListener("click", () => requestExport(false));
  $("#previewBtn")?.addEventListener("click", () => requestExport(true));

  $("#refreshBtn")?.addEventListener("click", () => {
    if (currentHTML) {
      loadHTML(currentHTML, false);
      toast("Preview refreshed.");
    }
  });

  $("#undoBtn")?.addEventListener("click", () => {
    if (historyIndex > 0) goHistory(historyIndex - 1);
  });

  $("#redoBtn")?.addEventListener("click", () => {
    if (historyIndex < history.length - 1) goHistory(historyIndex + 1);
  });

  $("#projectNameBtn")?.addEventListener("click", () => {
    const next = window.prompt("Name your website:", projectName);
    if (next?.trim()) setProjectName(next);
  });

  $$("[data-add]").forEach(button => {
    button.addEventListener("click", () => addElement(button.dataset.add));
  });

  const elementGrid = $(".element-grid");

  if (elementGrid && !$('[data-add="image"]')) {
    const imageButton = document.createElement("button");
    imageButton.type = "button";
    imageButton.className = "element-card";
    imageButton.dataset.add = "image";
    imageButton.innerHTML =
      '<span class="element-icon">▧</span><strong>Image</strong><small>Add a photo</small>';

    imageButton.addEventListener("click", () => addElement("image"));
    elementGrid.appendChild(imageButton);
  }

  $("#duplicateBtn")?.addEventListener("click", () => {
    if (!selected) return toast("Select an element first.");

    snapshotPending = true;
    sendToFrame("duplicate");
    toast("Element duplicated.");
  });

  $("#deleteBtn")?.addEventListener("click", () => {
    if (!selected) return toast("Select an element first.");
    if (!confirm("Delete this element?")) return;

    snapshotPending = true;
    sendToFrame("edit", { property: "delete" });
    selected = null;
    toast("Element deleted.");
  });

  $("#closeInspectorBtn")?.addEventListener("click", () => {
    el.inspector?.classList.remove("open");
    el.inspector?.classList.add("closed");
  });

  $("#mobileInspectorOpen")?.addEventListener("click", () => {
    el.inspector?.classList.add("open");
    el.inspector?.classList.remove("closed");

    el.inspector?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });

  $$(".sidebar-tab").forEach(button => {
    button.addEventListener("click", () => {
      $$(".sidebar-tab").forEach(tab => {
        tab.classList.toggle("active", tab === button);
        tab.setAttribute("aria-selected", String(tab === button));
      });

      const showElements = button.dataset.panel === "elements";
      const elementsPanel = $("#elementsPanel");
      const layersPanel = $("#layersPanel");

      if (elementsPanel) {
        elementsPanel.hidden = !showElements;
        elementsPanel.classList.toggle("hidden", !showElements);
      }

      if (layersPanel) {
        layersPanel.hidden = showElements;
        layersPanel.classList.toggle("hidden", showElements);
      }

      if (!showElements) buildLayers();
    });
  });

  const deviceWidths = {
    desktop: "100%",
    tablet: "768px",
    mobile: "390px"
  };

  $$(".device-button").forEach(button => {
    button.addEventListener("click", () => {
      const device = button.dataset.device;

      $$(".device-button").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      if (el.frame) {
        el.frame.className = "device-frame " + device;
        el.frame.style.width = deviceWidths[device] || "100%";
        el.frame.style.maxWidth = "100%";
      }

      const labels = {
        desktop: "Desktop · Responsive",
        tablet: "Tablet · Responsive",
        mobile: "Mobile · Responsive"
      };

      const sizeLabel = $("#canvasSizeLabel");
      if (sizeLabel) {
        sizeLabel.textContent = labels[device] || "Responsive";
      }
    });
  });

  screen(el.landing);
  setProgress(0);
  setProjectName("Untitled Website");
  updateHistoryButtons();
});
