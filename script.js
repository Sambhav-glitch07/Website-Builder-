
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const landing = $("#landingScreen");
  const generation = $("#generationScreen");
  const builder = $("#builderScreen");
  const promptInput = $("#promptInput");
  const generateBtn = $("#generateBtn");
  const emptyGenerateBtn = $("#emptyGenerateBtn");
  const cancelBtn = $("#cancelGenerationBtn");
  const preview = $("#websitePreview");
  const canvasEmpty = $("#canvasEmpty");
  const deviceFrame = $("#deviceFrame");
  const inspector = $("#inspectorContent");
  const selectedType = $("#selectedType");
  const layersList = $("#layersList");
  const toast = $("#toast");
  const toastText = $("#toastText");

  if (!preview || !builder || !landing) {
    console.error("Sambhav AI: Required HTML elements are missing.");
    return;
  }

  let generatedHTML = "";
  let selectedElementId = null;
  let elementCounter = 0;
  let history = [];
  let historyIndex = -1;
  let generationTimer = null;
  let generationStarted = 0;
  let toastTimer = null;
  let currentDevice = "desktop";
  let projectName = "Untitled Website";

  const escapeHTML = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function notify(message) {
    if (!toast || !toastText) {
      console.log(message);
      return;
    }

    toastText.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function showScreen(screen) {
    [landing, generation, builder].forEach((item) => {
      if (item) item.hidden = item !== screen;
    });
  }

  function buildWebsite(prompt) {
    const description = prompt.trim();
    const title = description
      .replace(/^(create|make|build|design)\s+/i, "")
      .replace(/\b(a|an|the)\b/gi, "")
      .trim()
      .split(/[.!?\n]/)[0]
      .slice(0, 65);

    const heading = title
      ? title.charAt(0).toUpperCase() + title.slice(1)
      : "Your next big idea starts here.";

    const safeHeading = escapeHTML(heading);
    const safePrompt = escapeHTML(
      description || "A beautiful website built around your ideas."
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeHeading}</title>
<style>
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:Inter,Arial,sans-serif;background:#0b0915;color:#f8f7ff;line-height:1.6}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer}
.nav{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 7%;border-bottom:1px solid #ffffff16}
.logo{font-size:22px;font-weight:800;letter-spacing:-1px}
.logo span{color:#b39aff}
.nav a:last-child,.cta{background:linear-gradient(120deg,#a78bfa,#e879f9);color:#160d29;border-radius:12px;padding:11px 18px;font-weight:700}
.hero{max-width:1050px;margin:auto;padding:110px 24px 90px;text-align:center}
.tag{display:inline-block;padding:7px 14px;border:1px solid #a78bfa55;border-radius:30px;color:#c4b5fd;font-size:12px;letter-spacing:2px;text-transform:uppercase}
h1{font-size:clamp(38px,7vw,76px);line-height:1.08;letter-spacing:-3px;margin:28px auto;max-width:900px}
.gradient{background:linear-gradient(90deg,#c4b5fd,#f0abfc,#93c5fd);background-clip:text;-webkit-background-clip:text;color:transparent}
.description{max-width:650px;margin:0 auto 30px;color:#b8b3c9;font-size:17px}
.cta{display:inline-block;border:0;padding:14px 23px}
.features{padding:65px 7%;background:#ffffff05}
.section-title{text-align:center;font-size:32px;margin:0 0 35px}
.grid{max-width:1100px;margin:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.card{padding:25px;border:1px solid #ffffff18;border-radius:18px;background:linear-gradient(145deg,#ffffff0c,#ffffff03)}
.card h3{font-size:19px;margin:12px 0}
.card p{color:#b8b3c9;font-size:14px}
.icon{font-size:27px;color:#c4b5fd}
.about{max-width:800px;margin:auto;padding:80px 24px;text-align:center}
.about p{color:#b8b3c9}
.footer{text-align:center;padding:30px;border-top:1px solid #ffffff15;color:#a7a1b9;font-size:13px}
@media(max-width:700px){
.nav{padding:0 5%;height:66px}
.hero{padding:75px 20px 65px}
h1{letter-spacing:-1.5px}
.grid{grid-template-columns:1fr}
.features{padding:50px 20px}
.section-title{font-size:27px}
}
</style>
</head>
<body>
<header class="nav">
  <a href="#" class="logo" data-editable="Brand">Sambhav<span>Studio</span></a>
  <a href="#contact" data-editable="Navigation button">Let's talk ↗</a>
</header>
<main>
  <section class="hero">
    <span class="tag" data-editable="Eyebrow">YOUR IDEA, REIMAGINED</span>
    <h1 data-editable="Main heading">${safeHeading.replace(/&amp;/g, "&amp;")}</h1>
    <p class="description" data-editable="Description">${safePrompt}</p>
    <a href="#features" class="cta" data-editable="Main button">Explore the experience ↗</a>
  </section>
  <section class="features" id="features">
    <h2 class="section-title" data-editable="Features heading">Made for what's next.</h2>
    <div class="grid">
      <article class="card" data-editable="Feature card one">
        <span class="icon">✦</span>
        <h3>Thoughtful design</h3>
        <p>A polished visual experience with carefully considered details.</p>
      </article>
      <article class="card" data-editable="Feature card two">
        <span class="icon">◈</span>
        <h3>Built to adapt</h3>
        <p>A responsive layout designed for phones, tablets, and desktops.</p>
      </article>
      <article class="card" data-editable="Feature card three">
        <span class="icon">↗</span>
        <h3>Ready for your ideas</h3>
        <p>A flexible starting point you can customize to make it yours.</p>
      </article>
    </div>
  </section>
  <section class="about" id="contact">
    <h2 data-editable="Closing heading">Let's make something memorable.</h2>
    <p data-editable="Closing text">Your vision is the starting point. The possibilities are yours to explore.</p>
    <a href="mailto:hello@example.com" class="cta" data-editable="Contact button">Get in touch ↗</a>
  </section>
</main>
<footer class="footer" data-editable="Footer">Designed with imagination · ${safeHeading}</footer>
<script>
document.querySelectorAll('a[href^="#"]').forEach(function(link){
  link.addEventListener('click',function(event){
    var target=document.querySelector(link.getAttribute('href'));
    if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth'});}
  });
});
<\/script>
</body>
</html>`;
  }

  function getPreviewDocument() {
    try {
      return preview.contentDocument ||
        preview.contentWindow.document;
    } catch (error) {
      console.error("Cannot access preview document:", error);
      return null;
    }
  }

  function saveHistory() {
    const doc = getPreviewDocument();
    if (!doc || !doc.documentElement) return;

    const snapshot = doc.documentElement.outerHTML;

    if (history[historyIndex] === snapshot) return;

    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);

    if (history.length > 50) history.shift();

    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const undo = $("#undoBtn");
    const redo = $("#redoBtn");

    if (undo) undo.disabled = historyIndex <= 0;
    if (redo) redo.disabled =
      historyIndex < 0 || historyIndex >= history.length - 1;
  }

  function renderPreview(html, recordHistory = true) {
    generatedHTML = html;
    canvasEmpty?.setAttribute("hidden", "");

    // srcdoc displays the actual generated HTML inside the iframe.
    preview.onload = () => {
      const doc = getPreviewDocument();
      if (!doc) {
        notify("Could not load the website preview.");
        return;
      }

      doc.querySelectorAll("[data-editable]").forEach((element) => {
        if (!element.dataset.editorId) {
          element.dataset.editorId = String(++elementCounter);
        }

        element.style.cursor = "pointer";
        element.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          selectElement(element);
        });
      });

      updateLayers();
      updateHistoryButtons();

      if (recordHistory) saveHistory();
    };

    preview.srcdoc = html;
  }

  function selectElement(element) {
    if (!element) return;

    selectedElementId = element.dataset.editorId;
    const doc = getPreviewDocument();

    if (doc) {
      doc.querySelectorAll("[data-editor-id]").forEach((item) => {
        item.style.outline = "";
        item.style.outlineOffset = "";
      });

      element.style.outline = "2px solid #a78bfa";
      element.style.outlineOffset = "3px";
    }

    const label = element.dataset.editable || element.tagName.toLowerCase();

    if (selectedType) selectedType.textContent = label;

    const mobileName = $("#mobileSelectionName");
    if (mobileName) mobileName.textContent = label;

    if (!inspector) return;

    const template = $("#inspectorTemplate");
    if (!template) return;

    inspector.replaceChildren(template.content.cloneNode(true));

    const textInput = $("#editText");
    const fontSize = $("#fontSizeInput");
    const fontWeight = $("#fontWeightInput");
    const textColor = $("#textColorInput");
    const textColorText = $("#textColorText");
    const bgColor = $("#backgroundColorInput");
    const bgColorText = $("#backgroundColorText");
    const padding = $("#paddingInput");
    const radius = $("#radiusInput");
    const shadow = $("#shadowInput");

    if (textInput) textInput.value = element.innerText || "";
    if (fontSize) fontSize.value = parseInt(getComputedStyle(element).fontSize, 10) || 16;
    if (fontWeight) fontWeight.value = getComputedStyle(element).fontWeight;

    if (textColor) {
      textColor.value = rgbToHex(getComputedStyle(element).color);
    }

    if (textColorText && textColor) {
      textColorText.value = textColor.value;
    }

    if (bgColor) {
      const bg = getComputedStyle(element).backgroundColor;
      bgColor.value = rgbToHex(bg, "#111111");
    }

    if (bgColorText && bgColor) bgColorText.value = bgColor.value;

    if (padding) padding.value = parseInt(getComputedStyle(element).padding, 10) || 0;
    if (radius) radius.value = parseInt(getComputedStyle(element).borderRadius, 10) || 0;

    if (shadow) {
      shadow.checked = getComputedStyle(element).boxShadow !== "none";
    }

    const apply = (property, value) => {
      element.style[property] = value;
      generatedHTML = getPreviewHTML();
    };

    textInput?.addEventListener("input", () => {
      element.innerText = textInput.value;
      generatedHTML = getPreviewHTML();
      updateLayers();
    });

    fontSize?.addEventListener("input", () => {
      const value = clamp(fontSize.value, 8, 160);
      apply("fontSize", value + "px");
    });

    fontWeight?.addEventListener("change", () => {
      apply("fontWeight", fontWeight.value);
    });

    textColor?.addEventListener("input", () => {
      if (textColorText) textColorText.value = textColor.value;
      apply("color", textColor.value);
    });

    textColorText?.addEventListener("change", () => {
      if (validHex(textColorText.value)) {
        textColor.value = textColorText.value;
        apply("color", textColor.value);
      }
    });

    bgColor?.addEventListener("input", () => {
      if (bgColorText) bgColorText.value = bgColor.value;
      apply("backgroundColor", bgColor.value);
    });

    bgColorText?.addEventListener("change", () => {
      if (validHex(bgColorText.value)) {
        bgColor.value = bgColorText.value;
        apply("backgroundColor", bgColor.value);
      }
    });

    padding?.addEventListener("input", () => {
      apply("padding", clamp(padding.value, 0, 200) + "px");
    });

    radius?.addEventListener("input", () => {
      apply("borderRadius", clamp(radius.value, 0, 200) + "px");
    });

    shadow?.addEventListener("change", () => {
      apply(
        "boxShadow",
        shadow.checked ? "0 12px 35px #00000055" : "none"
      );
    });

    $("#resetElementBtn")?.addEventListener("click", () => {
      element.removeAttribute("style");
      generatedHTML = getPreviewHTML();
      selectElement(element);
      notify("Element styles reset.");
    });

    $("#inspector")?.classList.add("inspector-open");
  }

  function clamp(value, min, max) {
    const number = Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
  }

  function validHex(value) {
    return /^#[0-9a-f]{6}$/i.test(value);
  }

  function rgbToHex(color, fallback = "#ffffff") {
    if (validHex(color)) return color;

    const match = color.match(/\d+/g);
    if (!match || match.length < 3) return fallback;

    return "#" + match.slice(0, 3)
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("");
  }

  function getPreviewHTML() {
    const doc = getPreviewDocument();
    if (!doc || !doc.documentElement) return generatedHTML;

    const clone = doc.documentElement.cloneNode(true);

    clone.querySelectorAll("[data-editor-id]").forEach((element) => {
      element.removeAttribute("data-editor-id");
      element.style.cursor = "";
      element.style.outline = "";
      element.style.outlineOffset = "";
    });

    return "<!DOCTYPE html>\n" + clone.outerHTML;
  }

  function updateLayers() {
    const doc = getPreviewDocument();
    if (!layersList || !doc) return;

    const elements = [...doc.querySelectorAll("[data-editable]")];

    if (!elements.length) {
      layersList.innerHTML = '<div class="layers-empty">No editable layers found.</div>';
      return;
    }

    layersList.replaceChildren();

    elements.forEach((element) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "layer-item";
      button.textContent = element.dataset.editable || element.tagName.toLowerCase();

      button.addEventListener("click", () => selectElement(element));
      layersList.appendChild(button);
    });
  }

  function beginGeneration() {
    const prompt = promptInput?.value.trim();

    if (!prompt) {
      promptInput?.focus();
      notify("Describe your website idea first.");
      return;
    }

    clearInterval(generationTimer);
    generationStarted = Date.now();

    showScreen(generation);

    const progress = $("#generationProgress");
    const progressText = $("#progressText");
    const stage = $("#generationStage");
    const title = $("#generationTitle");
    const subtitle = $("#generationSubtitle");
    const timer = $("#generationTimer");
    const steps = $$(".generation-step");

    const phases = [
      ["PHASE 01 / DISCOVERY", "Understanding your idea", "Turning your vision into a design direction…"],
      ["PHASE 02 / DESIGN", "Designing your experience", "Preparing the layout and visual style…"],
      ["PHASE 03 / BUILD", "Building your website", "Putting your page together…"],
      ["PHASE 04 / POLISH", "Finishing the details", "Getting your preview ready…"]
    ];

    let percent = 0;

    generationTimer = setInterval(() => {
      percent = Math.min(100, percent + 4);

      if (progress) progress.style.width = percent + "%";
      if (progressText) progressText.textContent = percent + "%";
      if (timer) timer.textContent =
        ((Date.now() - generationStarted) / 1000).toFixed(1) + "s";

      const phaseIndex = Math.min(3, Math.floor(percent / 26));
      const phase = phases[phaseIndex];

      if (stage) stage.textContent = phase[0];
      if (title) title.textContent = phase[1];
      if (subtitle) subtitle.textContent = phase[2];

      steps.forEach((step, index) => {
        step.classList.toggle("active", index === phaseIndex);
        step.classList.toggle("completed", index < phaseIndex);
      });

      if (percent >= 100) {
        clearInterval(generationTimer);

        projectName = prompt.trim().slice(0, 35) || "Untitled Website";

        renderPreview(buildWebsite(prompt));
        showScreen(builder);

        const projectButton = $("#projectNameBtn");
        if (projectButton) {
          projectButton.innerHTML = "";
          projectButton.append(
            document.createTextNode(projectName + " "),
            Object.assign(document.createElement("span"), {
              textContent: "⌄"
            })
          );
        }

        notify("Website created. Your preview is ready!");
      }
    }, 45);
  }

  function backHome() {
    clearInterval(generationTimer);
    showScreen(landing);
  }

  generateBtn?.addEventListener("click", beginGeneration);
  emptyGenerateBtn?.addEventListener("click", () => {
    if (!promptInput?.value.trim()) {
      showScreen(landing);
      promptInput?.focus();
      notify("Enter your website idea to get started.");
      return;
    }
    beginGeneration();
  });

  cancelBtn?.addEventListener("click", backHome);
  $("#backToHomeBtn")?.addEventListener("click", backHome);

  promptInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      beginGeneration();
    }
  });

  $$(".example-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (promptInput) {
        promptInput.value = chip.dataset.prompt || "";
        promptInput.focus();
      }
    });
  });

  $$(".device-button").forEach((button) => {
    button.addEventListener("click", () => {
      currentDevice = button.dataset.device || "desktop";

      $$(".device-button").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      if (deviceFrame) {
        deviceFrame.classList.remove("desktop", "tablet", "mobile");
        deviceFrame.classList.add(currentDevice);
      }

      const label = $("#canvasSizeLabel");
      if (label) {
        label.textContent = {
          desktop: "Desktop · Responsive",
          tablet: "Tablet · Responsive",
          mobile: "Mobile · Responsive"
        }[currentDevice];
      }
    });
  });

  $$(".sidebar-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".sidebar-tab").forEach((item) => {
        item.classList.toggle("active", item === tab);
      });

      const showLayers = tab.dataset.panel === "layers";
      $("#elementsPanel")?.classList.toggle("hidden", showLayers);
      $("#layersPanel")?.classList.toggle("hidden", !showLayers);

      updateLayers();
    });
  });

  $("#closeInspectorBtn")?.addEventListener("click", () => {
    $("#inspector")?.classList.remove("inspector-open");
  });

  $("#mobileInspectorOpen")?.addEventListener("click", () => {
    $("#inspector")?.classList.add("inspector-open");
  });

  $("#refreshBtn")?.addEventListener("click", () => {
    if (generatedHTML) {
      renderPreview(getPreviewHTML(), false);
      notify("Preview refreshed.");
    } else {
      notify("Generate a website first.");
    }
  });

  $("#previewBtn")?.addEventListener("click", () => {
    if (!generatedHTML) {
      notify("Generate a website first.");
      return;
    }

    const blob = new Blob([getPreviewHTML()], {
      type: "text/html;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const tab = window.open(url, "_blank");

    if (!tab) {
      URL.revokeObjectURL(url);
      notify("Allow pop-ups to open the preview.");
      return;
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });

  $("#exportBtn")?.addEventListener("click", () => {
    if (!generatedHTML) {
      notify("Generate a website before exporting.");
      return;
    }

    const html = getPreviewHTML();
    const blob = new Blob([html], {
      type: "text/html;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = (projectName || "sambhav-website")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
      .replace(/\s+/g, "-") + ".html";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("HTML file exported.");
  });

  $("#undoBtn")?.addEventListener("click", () => {
    if (historyIndex <= 0) return;

    historyIndex--;
    renderPreview(
      "<!DOCTYPE html>\n" + history[historyIndex],
      false
    );
    updateHistoryButtons();
    notify("Undo complete.");
  });

  $("#redoBtn")?.addEventListener("click", () => {
    if (historyIndex >= history.length - 1) return;

    historyIndex++;
    renderPreview(
      "<!DOCTYPE html>\n" + history[historyIndex],
      false
    );
    updateHistoryButtons();
    notify("Redo complete.");
  });

  $("#projectNameBtn")?.addEventListener("click", () => {
    const name = window.prompt("Enter your website name:", projectName);

    if (name && name.trim()) {
      projectName = name.trim().slice(0, 80);
      $("#projectNameBtn").textContent = projectName + " ⌄";
      notify("Project name updated.");
    }
  });

  function addElement(type) {
    const doc = getPreviewDocument();

    if (!doc || !generatedHTML) {
      notify("Generate a website first.");
      return;
    }

    const main = doc.querySelector("main") || doc.body;
    let element;

    if (type === "text") {
      element = doc.createElement("h2");
      element.textContent = "Your new heading";
    } else if (type === "button") {
      element = doc.createElement("a");
      element.href = "#features";
      element.textContent = "Learn more";
      element.style.display = "inline-block";
      element.style.background = "#a78bfa";
      element.style.color = "#160d29";
      element.style.padding = "12px 20px";
      element.style.borderRadius = "10px";
    } else if (type === "card") {
      element = doc.createElement("article");
      element.innerHTML = "<h3>New card</h3><p>Add your content here.</p>";
      element.style.padding = "24px";
      element.style.border = "1px solid #ffffff30";
      element.style.borderRadius = "16px";
      element.style.margin = "16px";
    } else if (type === "section") {
      element = doc.createElement("section");
      element.innerHTML = "<h2>New section</h2><p>Write your content here.</p>";
      element.style.padding = "50px 24px";
      element.style.textAlign = "center";
    } else {
      return;
    }

    element.dataset.editable = "New " + type;
    element.dataset.editorId = String(++elementCounter);
    main.appendChild(element);

    generatedHTML = getPreviewHTML();
    selectElement(element);
    saveHistory();
    updateLayers();
    notify("Element added.");
  }

  $$("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      addElement(button.dataset.add);
    });
  });

  $("#duplicateBtn")?.addEventListener("click", () => {
    const doc = getPreviewDocument();
    const selected = doc?.querySelector(
      `[data-editor-id="${CSS.escape(selectedElementId || "")}"]`
    );

    if (!selected) {
      notify("Select an element to duplicate.");
      return;
    }

    const clone = selected.cloneNode(true);
    clone.dataset.editorId = String(++elementCounter);
    clone.dataset.editable = (clone.dataset.editable || "Element") + " copy";

    selected.after(clone);

    generatedHTML = getPreviewHTML();
    selectElement(clone);
    saveHistory();
    updateLayers();
    notify("Element duplicated.");
  });

  $("#deleteBtn")?.addEventListener("click", () => {
    const doc = getPreviewDocument();
    const selected = doc?.querySelector(
      `[data-editor-id="${CSS.escape(selectedElementId || "")}"]`
    );

    if (!selected) {
      notify("Select an element to delete.");
      return;
    }

    selected.remove();
    selectedElementId = null;
    generatedHTML = getPreviewHTML();

    if (selectedType) selectedType.textContent = "Nothing selected";
    if (inspector) inspector.innerHTML =
      '<div class="inspector-empty"><strong>Select an element</strong><p>Choose an element in the preview to edit it.</p></div>';

    saveHistory();
    updateLayers();
    notify("Element deleted.");
  });

  $("#canvasArea")?.addEventListener("click", (event) => {
    if (event.target === canvasEmpty) {
      showScreen(landing);
      promptInput?.focus();
    }
  });

  // Initial state: show the landing page and an empty preview.
  showScreen(landing);
  updateHistoryButtons();

  // Make sure the iframe has a valid document even before generation.
  preview.srcdoc =
    "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>" +
    "<body style='font-family:Arial;padding:32px;color:#777'>" +
    "<h2>Your preview is ready</h2>" +
    "<p>Enter an idea and click Generate website.</p>" +
    "</body></html>";
});
