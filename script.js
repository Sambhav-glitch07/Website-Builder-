(() => {
  'use strict';
  // Keep this URL pointed at your existing deployed backend.
  const BACKEND_URL = 'https://website-builder-backend-nu.vercel.app/api/generate';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ICON_ARROW = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  const ICON_SPARKLE = '<svg class="ui-icon ui-icon-sparkle" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/></svg>';
  const ICON_UNDO = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-2"/></svg>';
  const ICON_REDO = '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5m5 5h-9a7 7 0 0 0 0 14h2"/></svg>';
  const landing = $('#landingScreen'), generation = $('#generationScreen'), builder = $('#builderScreen');
  const promptInput = $('#promptInput'), generateBtn = $('#generateBtn'), preview = $('#websitePreview');
  const frame = $('#deviceFrame'), empty = $('#canvasEmpty'), toast = $('#toast'), toastText = $('#toastText');
  let currentHTML = '', originalHTML = '', projectName = 'Untitled Website', selectedElement = null;
  let history = [], historyIndex = -1, generating = false, previewMode = false, timerStart = 0, timerInterval = null, progressInterval = null, toastTimer = null, generationController = null;
  let selectedSelector = '', selectedElementName = '';

  function showToast(message, type = 'success') {
    if (!toast || !toastText) return;
    toastText.textContent = message; toast.classList.toggle('error', type === 'error'); toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }
  function showScreen(which) { landing.hidden = which !== 'landing'; generation.hidden = which !== 'generation'; builder.hidden = which !== 'builder'; }
  function setStage(step, percent, title, subtitle) {
    const labels = ['PHASE 01 / DISCOVERY', 'PHASE 02 / DESIGN', 'PHASE 03 / BUILD', 'PHASE 04 / POLISH'];
    $('#generationStage').textContent = labels[Math.min(step, 3)]; $('#generationProgress').style.width = `${percent}%`; $('#progressText').textContent = `${Math.round(percent)}%`;
    $('#generationTitle').textContent = title; $('#generationSubtitle').textContent = subtitle;
    $$('.generation-step').forEach((el, i) => { el.classList.toggle('active', i === step); el.classList.toggle('done', i < step); });
  }
  function startGenerationVisuals() {
    timerStart = performance.now(); let p = 3; setStage(0, p, 'Turning a spark into a universe.', 'Reading your idea and shaping the experience…');
    clearInterval(timerInterval); clearInterval(progressInterval);
    timerInterval = setInterval(() => { $('#generationTimer').textContent = `${((performance.now() - timerStart) / 1000).toFixed(1).padStart(4, '0')}s`; }, 100);
    progressInterval = setInterval(() => { if (!generating) return; p = Math.min(92, p + Math.max(.2, (92 - p) * .025)); const step = p < 28 ? 0 : p < 54 ? 1 : p < 78 ? 2 : 3; const data = [
      ['Turning a spark into a universe.', 'Reading your idea and shaping the experience…'], ['Finding the visual language.', 'Choosing structure, hierarchy and a design direction…'], ['Building your website.', 'Creating responsive sections and interactive details…'], ['Adding the final stardust.', 'Checking the generated page before opening your canvas…']
    ]; setStage(step, p, data[step][0], data[step][1]); }, 300);
  }
  function stopGenerationVisuals() { clearInterval(timerInterval); clearInterval(progressInterval); }
  function addHistory(html) { if (historyIndex < history.length - 1) history = history.slice(0, historyIndex + 1); history.push(html); if (history.length > 40) history.shift(); historyIndex = history.length - 1; updateHistoryButtons(); }
  function updateHistoryButtons() { $('#undoBtn').disabled = historyIndex <= 0; $('#redoBtn').disabled = historyIndex < 0 || historyIndex >= history.length - 1; }
  function normalizeHTML(html) {
    let out = String(html || '').trim().replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '');
    if (!/<!doctype\s+html/i.test(out)) out = '<!DOCTYPE html>\n' + out;
    if (!/<html[\s>]/i.test(out)) out = out.replace(/<!doctype[^>]*>/i, '$&\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>') + '</body></html>';
    if (!/<body[\s>]/i.test(out)) out = out.replace(/<\/html>/i, '<body></body></html>');
    if (!/<\/body>/i.test(out)) out = out.replace(/<\/html>/i, '</body></html>');
    if (!/<\/html>/i.test(out)) out += '</html>';
    return out;
  }
  function injectEditorBridge(html) {
    const bridge = `<script data-sambhav-editor-bridge>(function(){
      let last=null; const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
      function selectorFor(el){ if(!el||el===document.body||el===document.documentElement)return 'body'; if(el.id)return '#'+CSS.escape(el.id); const parts=[]; let n=el; while(n&&n!==document.body&&parts.length<5){let p=n.tagName.toLowerCase(); if(n.classList.length)p+='.'+[...n.classList].slice(0,2).map(c=>CSS.escape(c)).join('.'); const par=n.parentElement; if(par){const same=[...par.children].filter(x=>x.tagName===n.tagName);if(same.length>1)p+=':nth-of-type('+(same.indexOf(n)+1)+')'} parts.unshift(p);n=par;}return 'body > '+parts.join(' > ')}
      function select(el){if(!el||el.closest('[data-sambhav-editor-bridge]'))return; if(last)last.removeAttribute('data-sambhav-selected');last=el;el.setAttribute('data-sambhav-selected','true');parent.postMessage({type:'SAMBHAV_SELECT',selector:selectorFor(el),tag:el.tagName.toLowerCase(),text:(el.innerText||el.textContent||'').trim().slice(0,3000),fontSize:parseInt(getComputedStyle(el).fontSize)||16,fontWeight:getComputedStyle(el).fontWeight,color:rgbToHex(getComputedStyle(el).color),backgroundColor:rgbToHex(getComputedStyle(el).backgroundColor),padding:parseInt(getComputedStyle(el).paddingTop)||0,radius:parseInt(getComputedStyle(el).borderRadius)||0,shadow:getComputedStyle(el).boxShadow!=='none'},'*')}
      function rgbToHex(v){const m=v.match(/\\d+/g);if(!m||m.length<3)return '#ffffff';return '#'+m.slice(0,3).map(x=>Number(x).toString(16).padStart(2,'0')).join('')}
      document.addEventListener('click',e=>{const el=e.target.closest('body *');if(!el||el.tagName==='SCRIPT'||el.tagName==='STYLE')return;e.preventDefault();e.stopPropagation();select(el)},true);
      window.addEventListener('message',e=>{const d=e.data||{};if(d.type==='SAMBHAV_UPDATE'&&last){if(d.text!==undefined){if(last.children.length===0)last.textContent=d.text;else{const textNodes=[...last.childNodes].filter(n=>n.nodeType===3);if(textNodes.length)textNodes[0].textContent=d.text;else last.insertBefore(document.createTextNode(d.text),last.firstChild)}}if(d.styles)Object.keys(d.styles).forEach(k=>{if(d.styles[k]!==undefined)last.style[k]=d.styles[k]});}if(d.type==='SAMBHAV_CLEAR_SELECTION'&&last){last.removeAttribute('data-sambhav-selected');last=null;}if(d.type==='SAMBHAV_REFRESH_SELECTION'&&last)select(last);});
      const style=document.createElement('style');style.textContent='[data-sambhav-selected="true"]{outline:2px solid #b879ff!important;outline-offset:3px!important;cursor:crosshair!important} body *{cursor:crosshair}';document.head.appendChild(style);
    })();<\/script>`;
    const cleaned = html.replace(/<script[^>]*data-sambhav-editor-bridge[^>]*>[\s\S]*?<\/script>/gi, '');
    return /<\/body>/i.test(cleaned) ? cleaned.replace(/<\/body>/i, `${bridge}</body>`) : cleaned + bridge;
  }
  function renderPreview(html) {
    currentHTML = html; frame.classList.add('visible'); empty.hidden = true;
    frame.classList.toggle('preview-mode', previewMode);
    preview.srcdoc = injectEditorBridge(html);
    renderLayers(); clearInspector(); updateHistoryButtons();
  }
  function showBuilder(html, title) {
    currentHTML = normalizeHTML(html); originalHTML = currentHTML; projectName = title || 'Untitled Website'; $('#projectNameBtn').innerHTML = `${escapeHTML(projectName)} <span>⌄</span>`;
    showScreen('builder'); frame.classList.add('visible'); empty.hidden = true; frame.classList.remove('tablet','mobile'); frame.classList.add('desktop'); renderPreview(currentHTML); addHistory(currentHTML); setDevice('desktop');
  }
  function escapeHTML(str) { return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  async function generateWebsite() {
    const prompt = promptInput.value.trim(); if (!prompt) { promptInput.focus(); showToast('Add a website idea first', 'error'); return; } if (generating) return;
    generating = true; generateBtn.disabled = true; generateBtn.classList.add('loading'); const oldLabel = generateBtn.innerHTML; generateBtn.innerHTML = '<span class="button-star">'+ICON_SPARKLE+'</span><span>Creating your universe…</span>';
    showScreen('generation'); startGenerationVisuals(); generationController = new AbortController();
    try {
      const response = await fetch(BACKEND_URL, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify({prompt}), signal:generationController.signal, mode:'cors', cache:'no-store' });
      let data; const raw = await response.text(); try { data = JSON.parse(raw); } catch { throw new Error(`Backend returned a non-JSON response (HTTP ${response.status}). Check the Vercel deployment logs.`); }
      if (!response.ok) throw new Error(data.error || data.message || `Backend request failed (HTTP ${response.status}).`);
      if (data.success === false) throw new Error(data.error || 'The backend could not generate this website.');
      const html = data.html || data.website || data.output || data.result;
      if (typeof html !== 'string' || !html.trim()) throw new Error('The backend responded, but no HTML was returned. Check the /api/generate response format.');
      setStage(3,100,'Your universe is ready.','Opening your website canvas…'); await new Promise(resolve => setTimeout(resolve, 450)); stopGenerationVisuals(); generating = false; generateBtn.disabled = false; generateBtn.classList.remove('loading'); generateBtn.innerHTML = oldLabel; showBuilder(html, data.title || titleFromPrompt(prompt)); showToast('Website generated. Your canvas is ready');
    } catch (error) {
      stopGenerationVisuals(); generating = false; generateBtn.disabled = false; generateBtn.classList.remove('loading'); generateBtn.innerHTML = oldLabel; showScreen('landing');
      if (error.name === 'AbortError') showToast('Generation cancelled.', 'error');
      else if (error instanceof TypeError && /fetch/i.test(error.message)) showToast('Could not reach backend. Try the published HTTPS site; Acode preview may trigger CORS.', 'error');
      else showToast(error.message || 'Something went wrong while generating.', 'error');
      console.error('[Sambhav generation error]', error);
    } finally { generationController = null; }
  }
  function titleFromPrompt(prompt) { const words = prompt.replace(/[.!?].*$/s,'').trim().split(/\s+/).slice(0,4).join(' '); return words ? words.charAt(0).toUpperCase()+words.slice(1) : 'Untitled Website'; }
  function setDevice(device) {
    frame.classList.remove('desktop','tablet','mobile'); frame.classList.add(device); $$('.device-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.device===device));
    const labels={desktop:'Desktop · Responsive',tablet:'Tablet · 820px',mobile:'Mobile · 390px'}; $('#canvasSizeLabel').textContent=labels[device]||labels.desktop;
  }
  function postToPreview(message) { try { preview.contentWindow.postMessage(message, '*'); } catch (e) { console.warn('Preview message failed',e); } }
  function selectorElement(selector) { try { return preview.contentDocument.querySelector(selector); } catch { return null; } }
  function clearInspector() { selectedElement=null; selectedSelector=''; selectedElementName=''; $('#selectedType').textContent='Nothing selected'; $('#mobileSelectionName').textContent='Nothing selected'; $('#inspectorContent').innerHTML='<div class="inspector-empty"><div class="empty-select-icon">⌁</div><strong>Select an element</strong><p>Click text or a component inside your preview to adjust it here.</p></div>'; }
  function hexColor(value) { if(!value)return '#ffffff'; if(value.startsWith('#'))return value.length===4?'#'+[...value.slice(1)].map(c=>c+c).join(''):value.slice(0,7); const m=value.match(/\d+/g); return m&&m.length>=3?'#'+m.slice(0,3).map(n=>Number(n).toString(16).padStart(2,'0')).join(''):'#ffffff'; }
  function openInspector(data) {
    selectedSelector=data.selector; selectedElementName=`${data.tag.toUpperCase()} element`; selectedElement=selectorElement(selectedSelector); $('#selectedType').textContent=selectedElementName; $('#mobileSelectionName').textContent=selectedElementName;
    const template=$('#inspectorTemplate').content.cloneNode(true); $('#inspectorContent').replaceChildren(template);
    const set=(id,val)=>{const el=$('#'+id,$('#inspectorContent'));if(el&&val!==undefined&&val!==null)el.value=val;};
    set('editText',data.text||'');set('fontSizeInput',data.fontSize||16);set('fontWeightInput',String(data.fontWeight||400));const tc=hexColor(data.color),bc=hexColor(data.backgroundColor);set('textColorInput',tc);set('textColorText',tc);set('backgroundColorInput',bc);set('backgroundColorText',bc);set('paddingInput',data.padding||0);set('radiusInput',data.radius||0);const shadow=$('#shadowInput',$('#inspectorContent'));if(shadow)shadow.checked=!!data.shadow;
    bindInspector(); $('#inspector').classList.add('open'); renderLayers();
  }
  function bindInspector() {
    const root=$('#inspectorContent'); const read=id=>$('#'+id,root);
    const send=(styles={},text)=>{const msg={type:'SAMBHAV_UPDATE',styles};if(text!==undefined)msg.text=text;postToPreview(msg);scheduleSnapshot();};
    read('editText').addEventListener('input',e=>send({},e.target.value));
    read('fontSizeInput').addEventListener('input',e=>{const n=clamp(e.target.value,8,160);send({fontSize:n+'px'});});
    read('fontWeightInput').addEventListener('change',e=>send({fontWeight:e.target.value}));
    [['textColorInput','color'],['backgroundColorInput','backgroundColor']].forEach(([id,prop])=>read(id).addEventListener('input',e=>{const textId=prop==='color'?'textColorText':'backgroundColorText';read(textId).value=e.target.value;send({[prop]:e.target.value});}));
    [['textColorText','color','textColorInput'],['backgroundColorText','backgroundColor','backgroundColorInput']].forEach(([id,prop,picker])=>read(id).addEventListener('change',e=>{const value=e.target.value.trim();if(/^#[0-9a-f]{6}$/i.test(value)){read(picker).value=value;send({[prop]:value});}else showToast('Enter a valid hex color like #AABBCC','error');}));
    read('paddingInput').addEventListener('input',e=>send({padding:clamp(e.target.value,0,200)+'px'}));read('radiusInput').addEventListener('input',e=>send({borderRadius:clamp(e.target.value,0,200)+'px'}));read('shadowInput').addEventListener('change',e=>send({boxShadow:e.target.checked?'0 12px 35px rgba(0,0,0,.22)':'none'}));
    const reset=read('resetElementBtn');if(reset)reset.addEventListener('click',()=>{postToPreview({type:'SAMBHAV_UPDATE',styles:{fontSize:'',fontWeight:'',color:'',backgroundColor:'',padding:'',borderRadius:'',boxShadow:''}});postToPreview({type:'SAMBHAV_REFRESH_SELECTION'});showToast('Inline styles reset');});
  }
  let snapshotTimer=null;function scheduleSnapshot(){clearTimeout(snapshotTimer);snapshotTimer=setTimeout(()=>{try{const doc=preview.contentDocument;if(!doc)return;const clone=doc.documentElement.cloneNode(true);clone.querySelectorAll('script[data-sambhav-editor-bridge]').forEach(s=>s.remove());clone.querySelectorAll('[data-sambhav-selected]').forEach(el=>el.removeAttribute('data-sambhav-selected'));const html='<!DOCTYPE html>\n'+clone.outerHTML;if(html!==currentHTML){currentHTML=html;addHistory(currentHTML);renderLayers();}}catch(e){console.warn('Snapshot skipped',e);}},700);}
  function clamp(value,min,max){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;}
  function renderLayers(){const list=$('#layersList');if(!currentHTML){list.innerHTML='<div class="layers-empty">Generate a website to see its layers.</div>';return;}const doc=new DOMParser().parseFromString(currentHTML,'text/html');const nodes=[...doc.body.querySelectorAll('h1,h2,h3,p,a,button,img,section,header,footer,nav,article,div')].filter(el=>!['SCRIPT','STYLE'].includes(el.tagName)).slice(0,80);if(!nodes.length){list.innerHTML='<div class="layers-empty">No editable elements found.</div>';return;}list.innerHTML='';nodes.forEach((el,index)=>{const label=(el.innerText||el.getAttribute('alt')||el.tagName.toLowerCase()).trim().replace(/\s+/g,' ').slice(0,38)||el.tagName.toLowerCase();const btn=document.createElement('button');btn.type='button';btn.className='layer-item'+(selectedSelector&&el.id&&selectedSelector==='#'+CSS.escape(el.id)?' active':'');btn.innerHTML=`<span>${({H1:'H1',H2:'H2',H3:'H3',P:'P',A:'A',BUTTON:'BTN',IMG:'IMG',SECTION:'SEC',HEADER:'HDR',FOOTER:'FTR',NAV:'NAV',ARTICLE:'ART',DIV:'DIV'})[el.tagName]||'DIV'}</span><b>${escapeHTML(label)}</b>`;btn.addEventListener('click',()=>{const selector=el.id?'#'+CSS.escape(el.id):`${el.tagName.toLowerCase()}${[...doc.querySelectorAll(el.tagName.toLowerCase())].indexOf(el)>0?`:nth-of-type(${[...el.parentElement.children].filter(x=>x.tagName===el.tagName).indexOf(el)+1})`:''}`;postToPreview({type:'SAMBHAV_SELECT_BY_SELECTOR',selector});showToast('Select this layer in the preview');});list.appendChild(btn);});}
  function addElement(kind){if(!preview.contentDocument||!currentHTML){showToast('Generate a website before adding elements.','error');return;}const doc=preview.contentDocument;let el;if(kind==='text'){el=doc.createElement('h2');el.textContent='Your new heading';}else if(kind==='button'){el=doc.createElement('a');el.href='#';el.textContent='Explore more';el.style.cssText='display:inline-block;padding:12px 20px;background:#a78bfa;color:#fff;border-radius:10px;text-decoration:none;';}else if(kind==='card'){el=doc.createElement('div');el.innerHTML='<h3>New card</h3><p>Add your content here.</p>';el.style.cssText='padding:24px;border-radius:16px;background:#f2edff;color:#241735;';}else{el=doc.createElement('section');el.innerHTML='<h2>New section</h2><p>Tell your story here.</p>';el.style.cssText='padding:48px 24px;margin:24px 0;border:1px dashed #b79bff;border-radius:16px;';}el.setAttribute('data-sambhav-added','true');doc.body.appendChild(el);currentHTML=serializePreview();addHistory(currentHTML);postToPreview({type:'SAMBHAV_SELECT_BY_SELECTOR',selector:'[data-sambhav-added="true"]'});renderLayers();showToast(`${kind[0].toUpperCase()+kind.slice(1)} added`);}
  function serializePreview(){const clone=preview.contentDocument.documentElement.cloneNode(true);clone.querySelectorAll('script[data-sambhav-editor-bridge]').forEach(s=>s.remove());clone.querySelectorAll('[data-sambhav-selected]').forEach(el=>el.removeAttribute('data-sambhav-selected'));clone.querySelectorAll('[data-sambhav-added]').forEach(el=>el.removeAttribute('data-sambhav-added'));return '<!DOCTYPE html>\n'+clone.outerHTML;}
  function undo(){if(historyIndex<=0)return;historyIndex--;currentHTML=history[historyIndex];renderPreview(currentHTML);updateHistoryButtons();showToast('Undo complete');}
  function redo(){if(historyIndex>=history.length-1)return;historyIndex++;currentHTML=history[historyIndex];renderPreview(currentHTML);updateHistoryButtons();showToast('Redo complete');}
  function exportHTML(){const html=currentHTML||originalHTML;if(!html){showToast('Generate a website before exporting.','error');return;}const blob=new Blob([html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(projectName||'sambhav-website').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('HTML export is ready');}
  function togglePreview(){previewMode=!previewMode;$('#previewBtn').classList.toggle('active',previewMode);$('#previewBtn').innerHTML=previewMode?'<span>Edit</span><span class="action-glyph"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l11.5-11.5a2.1 2.1 0 0 0-3-3L5 17.9Z"/><path d="m14.5 6.5 3 3"/></svg></span>':'<span>Preview</span><span>'+ICON_ARROW+'</span>';postToPreview({type:previewMode?'SAMBHAV_CLEAR_SELECTION':'SAMBHAV_REFRESH_SELECTION'});$('#inspector').classList.toggle('preview-hidden',previewMode);showToast(previewMode?'Preview mode on':'Back to editing');}
  function cancelGeneration(){if(generationController)generationController.abort();generating=false;stopGenerationVisuals();generateBtn.disabled=false;generateBtn.classList.remove('loading');generateBtn.innerHTML='<span class="button-star">'+ICON_SPARKLE+'</span><span>Generate website</span><span class="button-arrow">'+ICON_ARROW+'</span>';showScreen('landing');}
  // Idea chips fill the prompt; they do not silently submit a generation request.
  $$('.example-chip').forEach(button=>button.addEventListener('click',()=>{const idea=(button.dataset.prompt||'').trim();if(!idea){showToast('This idea has no prompt.','error');return;}promptInput.value=idea;promptInput.focus();$$('.example-chip').forEach(chip=>chip.classList.toggle('is-selected',chip===button));showToast('Idea loaded — ready to generate');}));
  generateBtn.addEventListener('click',generateWebsite);$('#emptyGenerateBtn').addEventListener('click',()=>{showScreen('landing');promptInput.focus();});promptInput.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();generateWebsite();}});
  $('#cancelGenerationBtn').addEventListener('click',cancelGeneration);$('#backToHomeBtn').addEventListener('click',()=>{showScreen('landing');clearInspector();});$('#undoBtn').addEventListener('click',undo);$('#redoBtn').addEventListener('click',redo);$('#refreshBtn').addEventListener('click',()=>{if(currentHTML){renderPreview(currentHTML);showToast('Preview refreshed');}else showToast('Nothing to refresh yet','error');});$('#exportBtn').addEventListener('click',exportHTML);$('#previewBtn').addEventListener('click',togglePreview);
  $$('.device-button').forEach(btn=>btn.addEventListener('click',()=>setDevice(btn.dataset.device)));$$('.sidebar-tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.sidebar-tab').forEach(b=>b.classList.toggle('active',b===btn));$('#elementsPanel').classList.toggle('hidden',btn.dataset.panel!=='elements');$('#layersPanel').classList.toggle('hidden',btn.dataset.panel!=='layers');}));$$('[data-add]').forEach(btn=>btn.addEventListener('click',()=>addElement(btn.dataset.add)));
  $('#duplicateBtn').addEventListener('click',()=>{if(!selectedSelector||!preview.contentDocument){showToast('Select an element in the preview first.','error');return;}const el=preview.contentDocument.querySelector(selectedSelector);if(!el||!el.parentElement){showToast('This element cannot be duplicated.','error');return;}const clone=el.cloneNode(true);clone.removeAttribute('id');clone.removeAttribute('data-sambhav-selected');clone.setAttribute('data-sambhav-added','true');el.after(clone);currentHTML=serializePreview();addHistory(currentHTML);renderLayers();showToast('Element duplicated');});
  $('#deleteBtn').addEventListener('click',()=>{if(!selectedSelector||!preview.contentDocument){showToast('Select an element in the preview first.','error');return;}const el=preview.contentDocument.querySelector(selectedSelector);if(!el||['BODY','HTML'].includes(el.tagName)){showToast('That element cannot be deleted.','error');return;}el.remove();currentHTML=serializePreview();addHistory(currentHTML);clearInspector();renderLayers();showToast('Element deleted');});
  $('#closeInspectorBtn').addEventListener('click',()=>$('#inspector').classList.remove('open'));$('#mobileInspectorOpen').addEventListener('click',()=>$('#inspector').classList.toggle('open'));
  $('#projectNameBtn').addEventListener('click',()=>{const next=prompt('Name your website',projectName);if(next&&next.trim()){projectName=next.trim().slice(0,80);$('#projectNameBtn').innerHTML=`${escapeHTML(projectName)} <span>⌄</span>`;showToast('Project renamed');}});
  $$('.sidebar-tab').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.panel==='layers')renderLayers();}));
  preview.addEventListener('load',()=>{if(currentHTML){postToPreview({type:'SAMBHAV_CLEAR_SELECTION'});}});
  window.addEventListener('message',event=>{const data=event.data;if(!data||typeof data!=='object')return;if(data.type==='SAMBHAV_SELECT'){selectedSelector=data.selector||'';selectedElement=selectorElement(selectedSelector);openInspector(data);}});
  // Add selector-based selection support to the bridge without exposing parent access to the generated page.
  const originalInject = injectEditorBridge;
  injectEditorBridge = function(html){let result=originalInject(html);const extra=`<script data-sambhav-selector-bridge>window.addEventListener('message',function(e){var d=e.data||{};if(d.type==='SAMBHAV_SELECT_BY_SELECTOR'){try{var el=document.querySelector(d.selector);if(el){el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}}catch(_){}}});<\/script>`;return result.replace(/<\/body>/i,extra+'</body>');};
  // Subtle pointer-reactive aurora; motion stays decorative and never intercepts controls.
  const landingScreen=$('#landingScreen');landingScreen.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const x=(e.clientX/innerWidth-.5)*10,y=(e.clientY/innerHeight-.5)*8;landingScreen.style.setProperty('--pointer-x',`${x}px`);landingScreen.style.setProperty('--pointer-y',`${y}px`);});
  showScreen('landing');updateHistoryButtons();setDevice('desktop');
})();
