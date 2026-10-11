
const API_URL = "https://website-builder-backend-nu.vercel.app/api/generate";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

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

  const editorStyle = `
    [data-sambhav-selected="true"] {
      outline: 2px solid #9b7cff !important;
      outline-offset: 3px !important;
      cursor: pointer !important;
    }
    [data-sambhav-selected="true"]:focus {
      outline: 2px solid #9b7cff !important;
    }
  `;

  function toast(message) {
    if (!el.toast || !el.toastText) {
      console.log(message);
      return;
    }

    el.toastText.textContent = message;
    el.toast.classList.add("show");

    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
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
      el.projectName.innerHTML = "";
      el.projectName.append(
        document.createTextNode(projectName + " ")
      );

      const arrow = document.createElement("span");
      arrow.textContent = "⌄";
      el.projectName.append(arrow);
    }
  }

  function safeFilename(name) {
    return (name || "website")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
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
    editorToken = (
      window.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2) + Date.now()
    );

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

  function selectElement(node) {
    if (!node || node === document.body ||
        node === document.documentElement) return;

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
    const node = event.target.closest(
      "h1,h2,h3,h4,h5,h6,p,span,a,button,li,small,strong,em," +
      "blockquote,img,figure,article,section,div"
    );

    if (!node || node === document.body) return;

    event.preventDefault();
    event.stopPropagation();
    selectElement(node);
  }, true);

  window.addEventListener("message", event => {
    const msg = event.data;

    if (!msg || msg.source !== "sambhav-parent" ||
        msg.token !== token) return;

    if (msg.type === "select") {
      selectElement(document.querySelector(msg.selector));
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
            current.src = String(value);
          }
          break;

        case "delete":
          current.remove();
          current = null;
          send("deselected");
          return;
      }

      selectElement(current);
      send("changed");
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
      node.style.cssText =
        "box-sizing:border-box;margin:20px;padding:20px;";

      if (msg.kind === "button") {
        node.textContent = "Your call to action";
        node.href = "#";
        node.style.cssText +=
          "display:inline-block;background:#7957ff;color:white;" +
          "padding:12px 20px;border-radius:10px;text-decoration:none;";
      } else if (msg.kind === "image") {
        node.src = "https://placehold.co/800x500?text=Your+Image";
        node.alt = "Your image";
        node.style.cssText += "display:block;width:100%;max-width:600px;height:auto;";
      } else if (msg.kind === "card") {
        node.innerHTML = "<h2>New card</h2><p>Add your content here.</p>";
        node.style.cssText += "border:1px solid #ddd;border-radius:16px;";
      } else if (msg.kind === "section") {
        node.innerHTML = "<h2>New section</h2><p>Write something here.</p>";
      } else {
        node.textContent = "Your new heading";
      }

      document.body.appendChild(node);
      selectElement(node);
      send("changed");
    }

    if (msg.type === "duplicate" && current) {
      const copy = current.cloneNode(true);
      copy.removeAttribute("data-sambhav-selected");
      copy.removeAttribute("id");
      current.after(copy);
      selectElement(copy);
      send("changed");
    }

    if (msg.type === "layers") {
      const items = [...document.body.querySelectorAll(
        "h1,h2,h3,h4,p,button,a,img,section,article"
      )].filter(node => !node.closest("[data-sambhav-editor]"));

      send("layers", {
        items: items.slice(0, 150).map((node, index) => ({
          index,
          tag: node.tagName.toLowerCase(),
          text: (node.innerText || node.alt || "").trim().slice(0, 70)
        }))
      });
    }

    if (msg.type === "export") {
      const clone = document.documentElement.cloneNode(true);

      clone.querySelectorAll(
        "script[data-sambhav-editor],style[data-sambhav-editor]"
      ).forEach(node => node.remove());

      clone.querySelectorAll("[data-sambhav-selected]").forEach(node => {
        node.removeAttribute("data-sambhav-selected");
      });

      const output = "<!DOCTYPE html>\\n" + clone.outerHTML;

      send("exported", { html: output });
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

    if (/<\/head\s*>/i.test(output)) {
      output = output.replace(/<\/head\s*>/i, editorCSS + "</head>");
    } else {
      output = editorCSS + output;
    }

    if (/<\/body\s*>/i.test(output)) {
      output = output.replace(/<\/body\s*>/i, editorScript + "</body>");
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
    if (!html) return;

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
    if (redo) redo.disabled = historyIndex >= history.length - 1;
  }

  function loadHTML(html, addHistory = true) {
    currentHTML = html;
    selected = null;
    frameReady = false;

    if (el.inspectorContent) {
      el.inspectorContent.innerHTML = `
        <div class="inspector-empty">
          <div class="empty-select-icon">⌁</div>
          <strong>Select an element</strong>
          <p>Click an element in the preview to edit it.</p>
        </div>`;
    }

    el.preview.srcdoc = injectEditor(html);
    el.frame.hidden = false;
    el.frame.style.display = "block";

    if (el.empty) el.empty.hidden = true;

    if (addHistory) remember(html);
  }

  function saveCurrentState() {
    if (!currentHTML) return;
    remember(currentHTML);
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

    if (el.inspectorContent) {
      const template = $("#inspectorTemplate");

      if (template) {
        el.inspectorContent.replaceChildren(
          template.content.cloneNode(true)
        );
      }

      // Add an image URL field to the existing inspector.
      if (data.isImage) {
        const section = document.createElement("div");
        section.className = "inspector-section";
        section.innerHTML = `
          <div class="section-title">IMAGE <span>06</span></div>
          <label class="field-label" for="imageUrlInput">
            Image URL
          </label>
          <input
            id="imageUrlInput"
            class="field-input"
            type="url"
            placeholder="https://example.com/photo.jpg"
          >
          <button id="applyImageUrlBtn" class="secondary-button" type="button">
            Apply image URL
          </button>
        `;
        el.inspectorContent.prepend(section);

        $("#imageUrlInput").value = data.src || "";

        $("#applyImageUrlBtn").addEventListener("click", () => {
          const value = $("#imageUrlInput").value.trim();

          try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) {
              throw new Error("Use an HTTP or HTTPS image URL.");
            }
          } catch {
            toast("Enter a valid image URL.");
            return;
          }

          edit("image", value);
        });
      }

      const textInput = $("#editText");
      if (textInput) {
        textInput.value = data.isImage ? (data.text || "") : data.text;
        textInput.addEventListener("change", () => {
          edit("text", textInput.value);
        });
      }

      bindValue("#fontSizeInput", data.fontSize, value => edit("fontSize", value));
      bindValue("#fontWeightInput", data.fontWeight, value => edit("fontWeight", value));
      bindValue("#paddingInput", data.padding, value => edit("padding", value));
      bindValue("#radiusInput", data.radius, value => edit("radius", value));

      bindColor("#textColorInput", "#textColorText", data.color, "color");
      bindColor("#backgroundColorInput", "#backgroundColorText", data.background, "background");

      const shadow = $("#shadowInput");
      if (shadow) {
        shadow.checked = !!data.shadow;
        shadow.addEventListener("change", () => edit("shadow", shadow.checked));
      }

      $("#resetElementBtn")?.addEventListener("click", () => {
        if (!confirm("Reset the selected element's inline styles?")) return;
        toast("Use undo to restore the previous version if needed.");
      });
    }

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

      callback(Math.max(
        Number(input.min || 0),
        Math.min(Number(input.max || 1000), value)
      ));
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

    sendToFrame("edit", { property, value });

    // The iframe reports the updated document after editing.
    saveCurrentState();
  }

  function buildLayers() {
    sendToFrame("layers");
  }

  function addElement(kind) {
    if (!frameReady) {
      toast("Generate a website first.");
      return;
    }

    sendToFrame("add", { kind });
    toast("Element added.");
  }

  function requestExport(openPreview = false) {
    if (!currentHTML) {
      toast("Generate a website before exporting.");
      return;
    }

    const handler = event => {
      if (
        event.source !== el.preview.contentWindow ||
        event.data?.source !== "sambhav-editor" ||
        event.data?.token !== editorToken ||
        event.data?.type !== "exported"
      ) return;

      window.removeEventListener("message", handler);

      const html = event.data.html;
      if (typeof html !== "string" || !html.trim()) {
        toast("Could not prepare the export.");
        return;
      }

      if (openPreview) {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = safeFilename(projectName) + ".html";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Exported " + safeFilename(projectName) + ".html");
      }
    };

    window.addEventListener("message", handler);
    sendToFrame("export");

    setTimeout(() => {
      window.removeEventListener("message", handler);
    }, 5000);
  }

  // Accept messages only from the current preview iframe and editor session.
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
      updateSelection(data);
      return;
    }

    if (data.type === "deselected") {
      selected = null;
      if (el.selectedType) el.selectedType.textContent = "Nothing selected";
      return;
    }

    if (data.type === "changed") {
      // Keep an up-to-date export snapshot.
      sendToFrame("export");
      return;
    }

    if (data.type === "exported") {
      currentHTML = data.html;
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
          sendToFrame("select", {
            selector: item.tag + ":nth-of-type(" + (item.index + 1) + ")"
          });
        });

        list.appendChild(button);
      });
    }
  });

  async function generateWebsite() {
    const prompt = el.prompt?.value.trim();

    if (!prompt) {
      toast("Describe your website first.");
      el.prompt?.focus();
      return;
    }

    if (busy) return;

    setBusy(true);
    screen(el.generation);
    setProgress(5);

    if (el.title) el.title.textContent = "Creating your website...";
    if (el.subtitle) el.subtitle.textContent = "Connecting to Sambhav AI.";

    generationStarted = Date.now();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (el.timer) {
        el.timer.textContent =
          ((Date.now() - generationStarted) / 1000).toFixed(1) + "s";
      }
    }, 100);

    try {
      setProgress(20);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      if (typeof data.html !== "string" || !data.html.trim()) {
        throw new Error("The backend returned no website HTML.");
      }

      setProgress(75);

      currentHTML = data.html;
      history = [];
      historyIndex = -1;

      setProjectName(
        prompt.split(/\s+/).slice(0, 5).join(" ")
          .replace(/[.,!?]+$/, "") || "My Website"
      );

      loadHTML(currentHTML);
      screen(el.builder);
      setProgress(100);
      toast("Website generated!");

    } catch (error) {
      console.error(error);
      screen(el.landing);
      toast(error.message || "Generation failed.");
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
      el.prompt.value = button.dataset.prompt || "";
      el.prompt.focus();
    });
  });

  $("#emptyGenerateBtn")?.addEventListener("click", () => {
    screen(el.landing);
    el.prompt?.focus();
  });

  $("#cancelGenerationBtn")?.addEventListener("click", () => screen(el.landing));
  $("#backToHomeBtn")?.addEventListener("click", () => screen(el.landing));

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
    const next = prompt("Name your website:", projectName);
    if (next?.trim()) setProjectName(next);
  });

  $$("[data-add]").forEach(button => {
    button.addEventListener("click", () => addElement(button.dataset.add));
  });

  // Add an Image tool automatically if the HTML doesn't already have one.
  const elementGrid = $(".element-grid");
  if (elementGrid && ! $('[data-add="image"]')) {
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
    sendToFrame("duplicate");
    toast("Element duplicated.");
  });

  $("#deleteBtn")?.addEventListener("click", () => {
    if (!selected) return toast("Select an element first.");
    if (!confirm("Delete this element?")) return;
    sendToFrame("edit", { property: "delete" });
    selected = null;
    toast("Element deleted.");
  });

  $("#closeInspectorBtn")?.addEventListener("click", () => {
    el.inspector?.classList.toggle("closed");
  });

  $("#mobileInspectorOpen")?.addEventListener("click", () => {
    el.inspector?.classList.remove("closed");
    el.inspector?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  $$(".sidebar-tab").forEach(button => {
    button.addEventListener("click", () => {
      $$(".sidebar-tab").forEach(tab => {
        tab.classList.toggle("active", tab === button);
        tab.setAttribute("aria-selected", String(tab === button));
      });

      const showElements = button.dataset.panel === "elements";
      $("#elementsPanel").hidden = !showElements;
      $("#layersPanel").hidden = showElements;
      $("#elementsPanel").classList.toggle("hidden", !showElements);
      $("#layersPanel").classList.toggle("hidden", showElements);

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

      $("#canvasSizeLabel").textContent = labels[device] || "Responsive";
    });
  });

  // Initial state
  screen(el.landing);
  setProgress(0);
  setProjectName("Untitled Website");
  updateHistoryButtons();
});
