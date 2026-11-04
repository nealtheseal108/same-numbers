const PUBLIC = true; // static public copy: saved results only, no code, no live runs
/* Same Numbers. Everything on screen comes from data/ (recorded artifacts and results computed on Neal’s Mac)
   or from a live run stream. Nothing here calls a model or the network.
   Timers carry the core flow, not requestAnimationFrame, so a hidden page still finishes every step. */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n0 = v => Number(v).toLocaleString('en-US');
const usd = v => '$' + Number(v).toFixed(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('still');   // ?still=1 shows the same path without changing system settings
const REPLAY_SECONDS = Number(params.get('replay')) || 16;
const RUNS_PATH = 'a-wsip-generalize/integration-runs';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = iso => { const [, m, d] = iso.slice(0, 10).split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; };
/* Evidence is read from local records. A home folder path is cut down before it reaches the screen. */
const scrubHome = t => String(t).replace(/\/Users\/[^/\s"']+/g, '~');
const ev = (key, text) => `<button class="num" data-ev="${esc(key)}">${esc(text)}</button>`;
const ORGANS = { brain: 'Brain', liver: 'Liver', lung: 'Lung', breast: 'Breast', colon: 'Colon' };

const METHODS = [
  { id: 'abmil', published: { source: "Shao and others, TransMIL paper, NeurIPS 2021, Table 1", rows: [["CAMELYON16", "Find cancer that spread to lymph nodes", "0.868", "0.876"], ["TCGA-NSCLC", "Tell two lung cancer types apart", "0.772", "0.866"], ["TCGA-RCC", "Tell three kidney cancer types apart", "0.893", "0.970"]] },  name: 'ABMIL', says: 'Scores each patch of a slide by how much it matters.', paper: 'Ilse, Tomczak and Welling, 2018',
    does: 'It looks at every patch of a slide, gives each one a score for how much it matters, and makes one call for the whole slide from the high-scoring patches.',
    why: 'The scores double as a map, so a pathologist can see which parts of the slide drove the call. It is small and fast, which is why new methods are usually compared against it.',
    instead: 'Pick TransMIL when the answer depends on how regions of the slide relate to each other. Pick DTFD-MIL when the lab has only a few slides to learn from.' },
  { id: 'transmil', published: { source: "Shao and others, TransMIL paper, NeurIPS 2021, Table 1", rows: [["CAMELYON16", "Find cancer that spread to lymph nodes", "0.884", "0.931"], ["TCGA-NSCLC", "Tell two lung cancer types apart", "0.884", "0.960"], ["TCGA-RCC", "Tell three kidney cancer types apart", "0.947", "0.988"]] },  name: 'TransMIL', says: 'Reads a slide’s patches together, like words in a sentence.', paper: 'Shao and others, 2021',
    does: 'It reads all of a slide’s patches together, so each patch is judged in the context of the others, the way a word is read in a sentence.',
    why: 'It helps when the answer depends on patterns spread across the slide, not on one spot. That is the case ABMIL handles worst, because it scores each patch on its own.',
    instead: 'Pick ABMIL when the lab needs a fast baseline or a clear map of which regions mattered. TransMIL is heavier to train, and its map is less direct.' },
  { id: 'dtfd-mil', published: { source: "Zhang and others, DTFD-MIL paper, arXiv 2203.12081, Tables 1 and 2 (AFS version)", rows: [["CAMELYON16", "Find cancer that spread to lymph nodes", "0.908", "0.946"], ["TCGA lung", "Tell two lung cancer types apart", "0.891", "0.951"]] },  name: 'DTFD-MIL', says: 'Splits a slide into smaller groups of patches and learns in two tiers.', paper: 'Zhang and others, 2022',
    does: 'It splits each slide into smaller groups of patches, learns from each group, then combines what it learned in a second tier.',
    why: 'Each slide becomes several training examples instead of one. That helps most when a lab has only a few hundred slides, which is common for rare cancers.',
    instead: 'Pick ABMIL when the lab has plenty of slides and wants the simplest method. DTFD-MIL has more settings to get right.' },
];
const DATASETS = {
  'CAMELYON16': { name: 'Lymph nodes from breast cancer patients', ask: 'Has the breast cancer spread to the lymph nodes?', why: 'Spread to the lymph nodes means a more advanced stage, and it changes the treatment.' },
  'TCGA-NSCLC': { name: 'Non-small cell lung cancer', ask: 'Is it adenocarcinoma or squamous cell carcinoma, the two main types?', why: 'Doctors choose different drugs for the two types.' },
  'TCGA lung': { name: 'Non-small cell lung cancer', ask: 'Is it adenocarcinoma or squamous cell carcinoma, the two main types?', why: 'Doctors choose different drugs for the two types.' },
  'TCGA-RCC': { name: 'Kidney cancer', ask: 'Which of three types is it: clear cell, papillary or chromophobe?', why: 'The type changes the outlook and the treatment.' },
};
const STAGE_COPY = {
  s12: { name: 'Read the method', roles: 'Analyst, Reviewer', does: 'Reads the published code, cites each fact, and plans every change as add-on or shared.' },
  s3: { name: 'Run the original', roles: 'Reference runner', does: 'Runs the authors’ own code and saves its numbers as the answer key.' },
  sx: { name: 'Extend the framework', roles: 'Planner, Builder', does: 'Asks for a shared-code change only when an add-on cannot do the job.' },
  s4: { name: 'Write the add-on', roles: 'Adapter author', does: 'Writes the method into the lab’s software as add-on code.' },
  s5: { name: 'Compare', roles: 'Parity checker', does: 'Writes the test that checks the copy against the answer key, and never loosens it.' },
};
const ROLE = {
  analyst: ['The analyst', 'An agent is reading the method’s code and citing what it finds.'],
  reviewer: ['The reviewer', 'An agent is matching the method to your framework and listing the lab’s decisions.'],
  reference_runner: ['The reference runner', 'An agent is running the original code in a locked-down space and saving its numbers.'],
  extension_planner: ['The planner', 'An agent is checking whether the shared framework needs anything new.'],
  extension_builder: ['The builder', 'An agent is adding optional features to the shared framework.'],
  adapter_author: ['The adapter author', 'An agent is writing the method’s add-on code.'],
  parity_checker: ['The parity checker', 'An agent is writing the test that compares your copy with the original.'],
};
/* Plain names for the deliberate mistakes. The record's own description stays beside each one. */
const MISTAKES = {
  abmil: {
    threshold: 'Decision cutoff 0.75 instead of the original’s 0.5',
    loss_weight: 'Training loss multiplied by 0.5',
    optimizer_lr: 'Learning rate 0.001 instead of the original’s 0.0005',
    weight_decay: 'Weight decay 0 instead of the original’s 0.0001',
    initialization: 'One starting weight table scaled by 0.5',
    sample_order: 'Training slides visited in a different order',
    selection_rule: 'Keeps the first round’s model instead of the last',
    label_mapping: 'Positive and negative labels swapped',
  },
  transmil: {
    loss_weight: 'Training loss multiplied by 0.5',
    learning_rate: 'Learning rate 10 times too high',
    weight_decay: 'Weight decay raised to 0.001',
    initialization: 'Final layer’s starting weights doubled',
    sample_order: 'Training slides listed in reverse order',
    selection_rule: 'Early stopping waits 5 rounds longer',
    label_mapping: 'Class order reversed, so labels flip',
    accumulation: 'One update per slide instead of one per two',
    instance_order: 'Each slide’s patches read in reverse order',
  },
  'dtfd-mil': {
    loss_weight: 'First tier’s loss weighted 0.5 instead of 1',
    tier2_weight_decay: 'Second tier’s weight decay 0.001 instead of 0.0001',
    tier_update_order: 'Second tier updated before the first',
    initialization: 'One starting value moved by 0.01',
    sample_order: 'Training slides drawn by a different random method',
    selection_window: 'Every round can be picked, not only the late ones',
    label_mapping: 'Class order reversed, so labels flip',
    pseudo_bag_groups: '3 groups per slide instead of 4',
    gradient_clipping: 'Gradient limit 0.001 instead of 5',
  },
};
/* The records' caveats, in plain words. Each keeps the record's own number and its source file. */
const CAVEATS = {
  abmil: [
    'Compared with the original after 3 declared changes to it, not with its published runs on a graphics card.',
    'Two made-up test cases of 8 and 10 slides, with 1 to 12 patches each, run on a regular processor. No real tissue was in this comparison.',
    'The original’s image step, which turns a patch picture into numbers, was replaced on both sides by a provisional decision, so it was never compared.',
    '12 decisions along the way were answered by the agent and marked provisional. No lab member has confirmed them.',
    'An agent wrote the comparison tests, and the tool checked them with tamper runs. The independent verifier built on Oct 27 lists only CLAM, so it has not judged this method.',
  ],
  transmil: [
    'Compared with the original after 9 declared changes to it, not with its published runs on a graphics card.',
    'Two made-up test cases of 10 and 17 slides, with 5 to 195 patches each, run on a regular processor. No real tissue was in this comparison.',
    'Sets of more than 4,096 numbers were compared at each step through a sample of 64 numbers plus summary values. The starting and final weights were compared in full.',
    'One value is not an exact match: the average validation loss differs by one rounding step, 0.00000006. It is recorded, the agent provisionally approved it, and the report lists it as pending lab approval.',
    '19 decisions along the way were answered by the agent and marked provisional. No lab member has confirmed them.',
    'An agent wrote the comparison tests, and the tool checked them with tamper runs. The independent verifier built on Oct 27 lists only CLAM, so it has not judged this method.',
  ],
  'dtfd-mil': [
    'Compared with the original after 4 declared changes to it, not with its published runs on a graphics card.',
    'Two made-up test cases of 20 and 24 slides, with 2 to 24 patches each, run on a regular processor. No real tissue was in this comparison.',
    'Sets of more than 100,000 numbers were stored in full for the first 2 steps only. Later steps keep the first 16 rows and one summary value.',
    '26 decisions along the way were answered by the agent and marked provisional. No lab member has confirmed them. One optional decision was left unanswered.',
    'An agent wrote the comparison tests, and the tool checked them with tamper runs. The independent verifier built on Oct 27 lists only CLAM, so it has not judged this method.',
  ],
};
const HEADLINE = { sample_order: 'Different order. Caught.', tier_update_order: 'Different order. Caught.', selection_rule: 'Different choice. Caught.', selection_window: 'Different choice. Caught.', label_mapping: 'Different labels. Caught.' };

const S = {
  step: 1, method: 'abmil', replays: {}, summary: null, prepared: null, slides: {}, order: [], files: {}, decisions: {}, saved: {}, reports: {}, live: {},
  proofState: 'idle', proof: null, proofSource: null, proofError: null, mistake: null, signed: null, plain: {}, heatSlide: 'breast', sheetOpen: [], running: false, replayDone: null, tiling: {}, animating: false, loaded: false,
};
const cur = () => S.replays[S.method];
const curMethod = () => METHODS.find(m => m.id === S.method);
const fileData = () => S.files[S.method];

/* ---- Light table: one thumbnail, one canvas on top, drawn in slide coordinates ---- */
class LightTable {
  constructor(host) { this.host = host; this.plate = null; this.paint = null; new ResizeObserver(() => this.fit()).observe(host); }
  async show(organ) {
    this.organ = organ;
    const s = S.slides[organ], plate = el('div', 'plate');
    const img = new Image(); img.alt = `${ORGANS[organ]} slide, ${s.case_submitter_id}`; img.src = `data/slides/${organ}/thumb.jpg`;
    const canvas = el('canvas');
    plate.append(img, canvas);
    await img.decode().catch(() => {});
    this.host.querySelectorAll('.plate').forEach(n => n.remove());
    this.host.append(plate);
    this.plate = plate; this.canvas = canvas; this.ratio = s.thumb_size[0] / s.thumb_size[1]; this.dim = s.dimensions; this.paint = null;
    this.fit();
  }
  fit() {
    if (!this.plate) return;
    const W = this.host.clientWidth, H = this.host.clientHeight;
    if (W <= 0 || H <= 0) return;
    let w = W, h = W / this.ratio; if (h > H) { h = H; w = H * this.ratio; }
    this.plate.style.width = w + 'px'; this.plate.style.height = h + 'px';
    const dpr = devicePixelRatio || 1;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.sx = this.canvas.width / this.dim[0]; this.sy = this.canvas.height / this.dim[1];
    if (this.paint) this.paint(1);
  }
  clear() { this.paint = null; const c = this.canvas; if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); }
  animate(paint, ms) {
    this.paint = paint;
    if (reduced || !ms) { paint(1); return Promise.resolve(); }
    return new Promise(done => { const t0 = performance.now();
      const id = setInterval(() => { if (this.paint !== paint) { clearInterval(id); return done(); }
        const p = Math.max(0, Math.min(1, (performance.now() - t0) / ms)); paint(p);
        if (p >= 1) { clearInterval(id); done(); } }, 33); });
  }
  sweep(coords, patch, ms) {
    const ctx = this.canvas.getContext('2d');
    return this.animate(p => { ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const n = Math.floor(coords.length * p), w = patch * this.sx, h = patch * this.sy;
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(58,43,184,.5)'; ctx.fillStyle = 'rgba(58,43,184,.14)';
      for (let i = 0; i < n; i++) { const x = coords[i][0] * this.sx, y = coords[i][1] * this.sy; ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h); }
    }, ms);
  }
  heat(coords, weights, patch, ms) {
    const ctx = this.canvas.getContext('2d'), order = weights.map((_, i) => i).sort((a, b) => weights[a] - weights[b]);
    const rank = new Float32Array(weights.length); order.forEach((id, r) => { rank[id] = r / Math.max(order.length - 1, 1); });
    return this.animate(p => { ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const n = Math.floor(order.length * p), w = patch * this.sx + .5, h = patch * this.sy + .5;
      for (let i = 0; i < n; i++) { const id = order[i]; ctx.fillStyle = ramp(rank[id], .62); ctx.fillRect(coords[id][0] * this.sx, coords[id][1] * this.sy, w, h); }
    }, ms);
  }
}
const RAMP = [[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]];
function ramp(t, a) { const x = t * (RAMP.length - 1), i = Math.min(Math.floor(x), RAMP.length - 2), f = x - i;
  const c = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f)); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

/* ---- Moving between steps ---- */
function renderSpines() {
  const d = cur(), f = fileData();
  $('#spine1title').textContent = d.name;
  $('#state1').textContent = 'Picked';
  const replayed = S.replayDone === S.method;
  $('#state2').innerHTML = replayed ? `${ev('files', `${f.files.length} files`)}, ${ev('cost', usd(d.cost))}`
    : replay && replay.d === d && !replay.done ? 'Replay playing' : 'Next';
  const proofed = S.proof && S.proofState !== 'idle';
  $('#state3').textContent = S.proofState === 'running' ? 'Checking now' : proofed && realVerdict() ? realVerdict().spine : replayed ? 'Next' : 'Not yet';
  $('#state4').innerHTML = S.signed ? `${S.signed === 'accept' ? 'Accepted' : 'Rejected'} as practice. Nothing was merged.`
    : proofed && replayed ? `${ev('files:framework', `${f.counts.framework} shared files`)}. Waiting for a person.` : 'Not yet';
}
function openStep(n, { focus = true } = {}) {
  S.step = n;
  $$('.step').forEach(li => {
    const on = Number(li.dataset.step) === n;
    li.classList.toggle('open', on);
    const b = $('.spine', li);
    if (on) { b.setAttribute('aria-current', 'step'); b.tabIndex = -1; } else { b.removeAttribute('aria-current'); b.removeAttribute('tabindex'); }
  });
  const replayed = S.replayDone === S.method;
  if (n === 3 && !replayed) renderLocked(3);
  else if (n === 4 && !(replayed && S.proof)) renderLocked(4);
  else ({ 1: renderPick, 2: enterAdd, 3: renderProof, 4: renderSignoff })[n]();
  renderSpines();
  if (focus) $(`#panel${n}`).focus({ preventScroll: true });
  if (innerWidth < 992) $(`.step[data-step="${n}"]`).scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
}
function setMethod(id) {
  if (id === S.method) return;
  stopReplay();
  S.method = id; S.proofState = 'idle'; S.proof = null; S.proofSource = null; S.proofError = null; S.mistake = null; S.signed = null; S.replayDone = null;
  renderPickButton(); renderSpines();
}

/* A step that has nothing to show yet says what comes first, and offers that action. */
function renderLocked(n) {
  const name = cur().name, playing = replay && replay.d === cur() && !replay.done, replayed = S.replayDone === S.method;
  const [title, say, label, go] = n === 3
    ? ['Code proves it', `${name} has not been added yet. Watch the AI step first, then this check can run.`, playing ? 'Back to the replay' : `Watch AI add ${name}`, 2]
    : ['You approve', replayed ? 'There is nothing to sign off yet. Run the check first.' : `${name} has not been added or checked yet. There is nothing to sign off.`, replayed ? 'Go to the check' : playing ? 'Back to the replay' : `Watch AI add ${name}`, replayed ? 3 : 2];
  $(`#panel${n}`).innerHTML = `<div class="topline"><h2><span class="stepn">${n}</span>${title}</h2></div>
    <p class="locked">${esc(say)}</p>
    <div class="actions"><button class="btn" id="unlock">${esc(label)}</button><button class="link" data-explain>Explain this step</button></div>`;
  $('#unlock').onclick = () => openStep(go);
}

/* ---- Step 1 ---- */
function renderPick() {
  const rows = METHODS.map(m => `<label class="choice"><input type="radio" name="method" value="${m.id}" ${m.id === S.method ? 'checked' : ''}>
    <span class="row"><b>${esc(m.name)}</b><span>${esc(m.says)}</span></span></label>`).join('');
  $('#panel1').innerHTML = `
    <div class="topline brand"><h2>Same Numbers</h2><span>For medical AI labs that compare cancer-slide methods</span></div>
    <h1>Add a published AI method to your lab’s code, and prove it gives the same numbers.</h1>
    <div class="intro">
      <div><p class="why">Copied by hand, one small slip can quietly change a lab’s results.</p>
        <p class="lede">Here, AI does the copying, plain code checks the numbers against the original, and a person signs off on anything that touches shared code.</p></div>
      <figure><img src="data/slides/breast/tile-1.jpg" alt="A patch of stained breast tissue, pink and purple">
        <figcaption>A patch of a real tissue slide. These methods read hundreds or thousands of patches at a time.</figcaption></figure>
    </div>
    <fieldset class="pick"><legend><span class="stepn">1</span>Pick a method to add</legend>${rows}</fieldset>
    <div class="actions"><button class="btn" id="watch"></button>
      <button class="link" data-explain>Explain this step</button>
      <button class="link" data-slides>Try it on a real slide</button></div>
    <p class="small foot">Real records: three AI runs from Oct 26, replayed here, and saved results of checks run on Neal’s Mac. No AI runs during this demo.</p>`;
  $$('input[name="method"]').forEach(i => i.onchange = () => setMethod(i.value));
  $('#watch').onclick = () => { openStep(2); startReplay(); };
  renderPickButton();
}
function renderPickButton() { const b = $('#watch'); if (b) b.textContent = `Watch AI add ${cur().name}`; }

/* ---- Step 2: a replay of a recorded run ---- */
let replay = null;
const speedOf = d => Math.round(d.wall_seconds / REPLAY_SECONDS);
function clockOf(sec) { const s = Math.floor(sec); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function enterAdd() {
  const d = cur();
  renderAdd();
  if (S.replayDone === S.method) paintFinished();
  else if (replay && replay.d === d && !replay.done) { catchUp(replay); }
  else startReplay();
}
function renderAdd() {
  const d = cur(), m = S.summary;
  const rows = d.stages.map(st => { const c = STAGE_COPY[st.id];
    return `<li class="stage" data-id="${st.id}"><div><b>${c.name}</b><small>${c.roles}</small><small class="does">${c.does}</small></div><div class="bar"><i></i></div><div class="res"></div></li>`; }).join('');
  $('#panel2').innerHTML = `
    <div class="topline"><h2><span class="stepn">2</span>AI adds it</h2><span>Five stages, seven agent roles.</span></div>
    <p class="replay">My agents built this on ${shortDate(d.date)}. This is their real run, sped up ${ev('speed', `${speedOf(d)}x`)}.</p>
    <p class="now" id="now" aria-live="polite">The run starts.</p>
    <ol class="stages">${rows}</ol>
    <div class="sofar">
      <div class="pile"><span class="label" id="pileA">New add-on code</span><div class="squares" id="squaresA"></div></div>
      <div class="pile"><span class="label" id="pileB">Shared framework</span><div class="squares" id="squaresB"></div></div>
      <div><div class="money" id="money">$0.00</div><div class="moneynote" id="moneynote">Spent, of ${ev('cost', usd(d.cost))} for this run</div></div>
    </div>
    <div class="notes">
      <p class="small"><span id="filesLabel">Files so far</span>, labeled afterward from the recorded patches. Recorded time <button class="num" data-ev="speed"><span id="clock">0:00:00</span></button>.</p>
      <p class="small">Prompts frozen and answer key committed before the run: the instructions and answer key were locked first. ${ev('total', usd(m.total_usd))} for all three methods.</p>
    </div>
    <div class="actions"><button class="btn" id="addNext">Skip to the end</button>
      <button class="link" id="again">Replay again</button>
      <button class="link" id="record">Show the full record</button>
      <button class="link" data-explain>Explain this step</button></div>`;
  $('#addNext').onclick = () => { if (S.replayDone === S.method) openStep(3); else finishReplay(); };
  $('#again').onclick = startReplay;
  $('#record').onclick = openRecord;
}
function stopReplay() { if (replay) { clearInterval(replay.timer); replay.done = true; } replay = null; }
function resetReplayView() {
  $$('#panel2 .stage').forEach(li => { li.classList.remove('run', 'done'); $('.bar i', li).style.width = '0'; $('.res', li).textContent = ''; });
  $$('#squaresA,#squaresB').forEach(n => { n.innerHTML = ''; });
  if ($('#filesLabel')) $('#filesLabel').textContent = 'Files so far';
  if ($('#pileA')) { $('#pileA').textContent = 'New add-on code'; $('#pileB').textContent = 'Shared framework'; }
  if ($('#moneynote')) $('#moneynote').innerHTML = `Spent, of ${ev('cost', usd(cur().cost))} for this run`;
  if ($('#money')) $('#money').textContent = '$0.00';
  if ($('#now')) $('#now').textContent = 'The run starts.';
  if ($('#addNext')) $('#addNext').textContent = 'Skip to the end';
}
function startReplay() {
  stopReplay(); S.replayDone = null;
  const d = cur();
  if (S.step === 2) resetReplayView();
  const r = replay = { d, speed: d.wall_seconds / REPLAY_SECONDS, i: 0, t0: performance.now(), cost: 0, done: false, seen: new Set(), t: 0, timer: 0, script: lineScript(d), shownAt: 0 };
  renderSpines();
  if (reduced) return finishReplay();
  r.timer = setInterval(() => { if (replay !== r || r.done) return;
    const t = (performance.now() - r.t0) / 1000 * r.speed;
    advance(r, t);
    nextLine(r, t);
    if (t >= d.wall_seconds && !r.script.length && performance.now() - r.shownAt >= DWELL_MS) finishReplay(); }, 50);
}
/* The big sentence is a short queue, so each line stays long enough to read. Bars, files and cost keep real time.
   Stage openers come first, then the three moments, then the rest, as many as fit in the replay. */
const DWELL_MS = 1800;
function lineScript(d) {
  const lines = [], seen = new Set();
  const once = (key, e, text, rank) => { if (seen.has(key)) return; seen.add(key); lines.push({ t: e.t, text, rank }); };
  const OPENS_STAGE = ['analyst', 'reference_runner', 'extension_planner', 'adapter_author', 'parity_checker'];
  for (const e of d.events) {
    if (e.type === 'agent' && ROLE[e.role]) once(e.role, e, ROLE[e.role][1], OPENS_STAGE.includes(e.role) ? 1 : 3);
    if (e.type === 'denied' && e.role === 'adapter_author') once('denied', e, 'An agent tried a command outside its allow-list. It was refused.', 2);
    if (e.type === 'tool' && e.tag === 'tamper') once('tamper', e, 'The tool changed a stored set of numbers on purpose. The test caught it.', 2);
    if (e.type === 'gate' && /\d+ decision/.test(e.text)) once('gate', e, say(e), 2);
    if (e.type === 'fail') once('fail', e, say(e), 3);
  }
  const budget = Math.max(3, Math.floor(REPLAY_SECONDS * 1000 / DWELL_MS));
  return lines.sort((a, b) => a.rank - b.rank || a.t - b.t).slice(0, budget).sort((a, b) => a.t - b.t);
}
function nextLine(r, t) {
  const now = performance.now();
  if (!r.script.length || r.script[0].t > t || (r.shownAt && now - r.shownAt < DWELL_MS)) return;
  const line = r.script.shift(); r.shownAt = now; r.line = line.text;
  if (S.step === 2 && $('#now')) $('#now').textContent = line.text;
}
function catchUp(r) { r.i = 0; r.cost = 0; r.seen = new Set(); advance(r, r.t); if (r.line) $('#now').textContent = r.line; }
function advance(r, t) {
  const { d } = r; r.t = t;
  if (S.step === 2 && $('#clock')) $('#clock').textContent = clockOf(Math.min(t, d.wall_seconds));
  while (r.i < d.events.length && d.events[r.i].t <= t) fire(r, d.events[r.i++]);
  if (S.step !== 2) return;
  for (const st of d.stages) {
    const li = $(`.stage[data-id="${st.id}"]`);
    if (st.start == null || !li) continue;
    const p = Math.min(1, Math.max(0, (t - st.start) / Math.max(st.end - st.start, 1)));
    $('.bar i', li).style.width = p * 100 + '%';
    li.classList.toggle('run', p > 0 && p < 1);
    if (p >= 1 && !li.classList.contains('done')) { li.classList.add('done'); $('.res', li).innerHTML = stageResult(st); }
  }
}
function stageResult(st) {
  const rejected = st.attempts.filter(a => !a.passed).length;
  const shared = fileData().files.filter(f => f.category === 'B' && f.stages.includes(STAGE_COPY[st.id].name)).length;
  const bits = [];
  if (st.skipped) bits.push('No shared changes proposed');
  if (shared) bits.push(`<span class="also">${st.id === 's4' ? 'Also changed' : 'Changed'} ${shared} shared file${shared === 1 ? '' : 's'}</span>`);
  if (rejected) bits.push(`${rejected} attempt${rejected > 1 ? 's' : ''} rejected`);
  bits.push(ev(`stagecost:${st.id}`, usd(st.cost)));
  return bits.join('<br>');
}
function fire(r, e) {
  if (e.cost_so_far != null) { r.cost = e.cost_so_far; if (S.step === 2) $('#money').textContent = usd(r.cost); }
  if (e.type === 'accept' && ['extension_builder', 'adapter_author', 'parity_checker'].includes(e.role)) addSquares(r, e.role);
}
const ROLE_STAGE = { extension_builder: 'Extend the framework', adapter_author: 'Write the add-on', parity_checker: 'Compare' };
function addSquares(r, role) {
  for (const f of fileData().files) {
    if (!f.stages.includes(ROLE_STAGE[role]) || r.seen.has(f.path)) continue;
    r.seen.add(f.path);
    const shared = f.category === 'B', box = $(shared ? '#squaresB' : '#squaresA');
    if (box && S.step === 2) box.append(el('i', 'sq ' + (shared ? 'b' : 'a')));
  }
}
function paintFinished() {
  const d = cur();
  const r = { d, i: 0, cost: 0, seen: new Set(), t: d.wall_seconds + 1 };
  resetReplayView();
  advance(r, r.t);
  $('#money').innerHTML = ev('cost', usd(d.cost));
  $('#moneynote').textContent = 'Spent on this run';
  $('#filesLabel').textContent = 'Files changed';
  $('#pileA').textContent = `New add-on code, ${fileData().counts.addon} files`;
  $('#pileB').textContent = `Shared framework, ${fileData().counts.framework} files`;
  $('#now').textContent = `Done. ${fileData().files.length} files changed for ${usd(d.cost)}. Next, a program checks the result.`;
  $('#addNext').textContent = 'See the proof';
}
function finishReplay() {
  const r = replay; if (!r) return;
  clearInterval(r.timer); r.done = true;
  S.replayDone = S.method;
  if (S.step === 2) paintFinished();
  renderSpines();
}
function say(e) {
  const who = e.role && ROLE[e.role] ? ROLE[e.role][0] : 'The tool';
  switch (e.type) {
    case 'note': return 'The run starts.';
    case 'agent': return (e.attempt > 1 ? 'Second try. ' : '') + (ROLE[e.role] ? ROLE[e.role][1] : e.text);
    case 'finish': return `${who} handed in its work.`;
    case 'check': { if (e.checks) { const done = e.checks.filter(c => c.passed).length;
        return e.passed ? `The tool checked the work: ${done} of ${e.checks.length} checks passed.` : `The tool found problems: ${done} of ${e.checks.length} checks passed.`; }
      const m = /(\d+) citations, (\d+) broken/.exec(e.text);
      return m ? `The tool checked ${n0(m[1])} citations to the code. ${n0(m[2])} were broken.` : e.text; }
    case 'problem': return 'The tool found a problem in this attempt.';
    case 'fail': return `The tool rejected this attempt and sent it back to ${who.toLowerCase()}.`;
    case 'accept': return `The tool accepted the work from ${who.toLowerCase()}.`;
    case 'denied': return `The agent’s allow-list refused a ${e.text.replace('Allow-list refused ', '')} request from ${who.toLowerCase()}.`;
    case 'tool': if (e.tag === 'tamper') return 'The tool changed a stored set of numbers on purpose. The test caught it.';
      { const m = /(\d+) passed/.exec(e.detail || ''); return m ? `The tool ran the tests: ${n0(m[1])} passed.` : e.role === 'reference_runner' ? 'The tool ran the original code in the locked-down space.' : null; }
    case 'gate': { const m = /(\d+) decision/.exec(e.text); return m ? `An agent answered ${m[1]} decision${m[1] === '1' ? '' : 's'} in the lab’s place, marked provisional.` : null; }
    case 'plan': { const m = /(\d+) proposal/.exec(e.text); return m ? `The planner proposed ${m[1]} change${m[1] === '1' ? '' : 's'} to the framework.` : null; }
    case 'result': { const m = /: ([\d,]+) tensors, max abs (\S+),/.exec(e.text); return m ? `One test case: ${m[1]} sets of numbers compared, biggest gap ${Number(m[2])}.` : null; }
    case 'mutation': { const id = /Mutation (\S+):/.exec(e.text); return id ? `Deliberate mistake caught: ${MISTAKES[S.method][id[1].replace(/:$/, '')] || id[1]}.` : null; }
    case 'final': return 'The run finished.';
    default: return null;
  }
}
function openRecord() {
  const d = cur(), run = d.run_id;
  const body = el('div');
  const toolBug = S.method !== 'abmil' ? ' The analyst rejections in TransMIL and DTFD-MIL came from a bug in the citation checker, fixed afterward, not from a mistake in the agent’s work.' : '';
  body.append(el('p', '', `These ${n0(d.events.length)} events were extracted from this run’s records, in order. Rejected attempts and allow-list refusals are marked.${toolBug}`));
  const list = el('div');
  list.innerHTML = d.events.map(e => { const flag = ['fail', 'denied', 'problem'].includes(e.type) || e.tag === 'failed';
    return `<div class="ev${flag ? ' flag' : ''}"><time>${clockOf(e.t)}</time><div><b>${esc(say(e) || e.text)}</b>
      <small>${esc(scrubHome(e.text))}${e.detail ? `, ${esc(scrubHome(e.detail))}` : ''}</small><small class="mono">${esc(`${RUNS_PATH}/${run}/${e.src}`)}</small></div></div>`; }).join('');
  body.append(list);
  pushSheet('The full record', body);
}

/* ---- Step 3: the check ---- */
const timeLabel = s => s < 90 ? `about ${Math.max(5, Math.round(s / 5) * 5)} seconds` : `about ${Math.round(s / 30) / 2} minutes`;
/* Rounded from full runs of tools/prove.py on Neal’s Mac, Oct 31: ABMIL 9 to 25.1 s, DTFD-MIL 137.8 to 153.3 s, TransMIL 203.5 to 273.4 s. */
const CHECK_SECONDS = { abmil: 15, 'dtfd-mil': 150, transmil: 240 };
function passed(result) { const r = result.report;
  return result.exit_code === 0 && r.cases.length > 0 && r.cases.every(c => c.status === 'passed' && c.max_abs === 0) && r.mutations.every(m => m.detected) && r.resume.equal === true; }
function rounding(result) {
  for (const diff of result.report.recorded_differences || []) {
    for (const v of Object.values(diff.measured_this_run || {})) if (v > 0) {
      const m = Object.values(diff.measured || {}).find(x => x.max_abs > 0);
      return { id: diff.id, value: v, reference: m && m.reference, candidate: m && m.candidate, status: diff.status };
    }
  }
  return null;
}
function realVerdict() {
  const p = S.proof; if (!p) return null;
  if (!passed(p)) return { head: 'The check did not pass.', cls: 'mid', spine: 'Did not pass' };
  return rounding(p) ? { head: 'Same numbers, with one rounding difference.', cls: 'long', spine: 'Same numbers, with one rounding difference.' }
    : { head: 'Same numbers.', cls: '', spine: 'Same numbers.' };
}
const realCase = p => { const c = Object.entries(p.bands.cases); return (c.find(([, v]) => v.tensors_different > 0) || c[0] || [null, null]); };
function mistakeRecord(p, id) { return p.report.mutations.find(m => m.id === id); }
function mistakeBand(p, id) { const m = p.bands.mistakes[id]; if (!m) return [null, null]; const c = Object.entries(m); return c[0]; }
function textDifference(message) {
  const first = (message || '').split(' | ')[0];
  let m = /exact\.[^:]*: (?:length )?(.+?) in the reference, (.+?) in the candidate/.exec(first);
  if (!m) m = /exact\.[^:]*: expected (.+?), candidate (.+)$/.exec(first);
  if (!m) {
    const l = /exact\.[^:]*: length (\d+) != (\d+)/.exec(first);
    // TransMIL's test prints "length <copy> != <original>". DTFD-MIL's prints the original first.
    if (l) m = S.method === 'transmil' ? [0, `${l[2]} items`, `${l[1]} items`] : [0, `${l[1]} items`, `${l[2]} items`];
  }
  return m ? { original: m[1].replace(/^'|'$/g, ''), copy: m[2].replace(/^'|'$/g, '') } : null;
}

function renderProof() {
  const st = S.proofState, p = S.proof;
  const secs = CHECK_SECONDS[S.method];
  const label = st === 'broken' ? 'Broken on purpose. These numbers come from the same run.'
    : p && S.proofSource === 'saved' ? `Saved result from ${shortDate(p.run_at)}. A program ran this check. No AI was called.`
    : st === 'running' ? 'A program is running this check on Neal’s Mac now. No AI is called.'
    : p ? 'A program ran this check on Neal’s Mac just now. No AI was called.' : 'A program runs this check on Neal’s Mac. No AI is called while it runs.';
  $('#panel3').innerHTML = `
    <div class="topline"><h2><span class="stepn">3</span>Code proves it</h2><span class="${st === 'running' ? 'live' : ''}">${label}</span></div>
    <div class="bands" id="bands">
      <div class="bandrow"><div class="bl">Original code <span id="capO"></span></div><div class="bandbox"><canvas id="bandO"></canvas></div></div>
      <div class="bandrow"><div class="bl">Your copy <span id="capC"></span></div><div class="bandbox"><canvas id="bandC"></canvas></div></div>
      <div class="bandrow"><div class="bl">Difference <span id="capD">A pink square means that number is not exactly equal.</span></div>
        <div class="bandbox diffbox"><canvas id="bandD"></canvas><div class="diffnote" id="diffnote"></div><div class="cover" id="cover">Not compared yet.</div></div></div>
    </div>
    <div class="verdictbox" id="verdictbox" role="status"></div>
    <div id="under"></div>
    <div class="fine" id="fine"></div>
    <div class="actions" id="proofActions"></div>`;
  renderUnder(); renderFine(); renderProofActions(secs);
  drawBands();
}
function renderTicks() {
  const run = S.run, ticks = $('#ticks'); if (!run || !ticks) return;
  ticks.innerHTML = Array.from({ length: run.total }, (_, i) => {
    const r = run.results[i];
    return `<i class="${r ? (r.ok ? 'ok' : 'bad') : i === run.results.length ? 'cur' : ''}"></i>`;
  }).join('');
  const line = $('#testline'), bar = $('#tally'), log = $('#testlog');
  if (line) line.textContent = run.line;
  if (bar && run.total) bar.textContent = `${run.results.length} of ${run.total} checks finished. ${run.results.filter(r => r.caught).length} of ${run.mistakes} deliberate mistakes caught so far.`;
  if (log) log.innerHTML = run.results.slice(-3).reverse().map(r => `<li>${esc(r.text)}</li>`).join('');
}
function renderUnder() {
  const box = $('#verdictbox'), under = $('#under'), st = S.proofState, p = S.proof;
  if (st === 'running') {
    box.innerHTML = `<p class="verdict waiting" id="testline">Starting the real tests.</p><div class="ticks" id="ticks" aria-hidden="true"></div><p class="tally" id="tally"></p>`;
    under.innerHTML = '<ol class="testlog" id="testlog"></ol>';
    renderTicks(); return;
  }
  if (S.proofError) { box.innerHTML = `<p class="verdict waiting">${esc(S.proofError.title)}</p>`; under.innerHTML = `<p class="stats">${S.proofError.body}</p>`; return; }
  if (!p) {
    box.innerHTML = `<p class="verdict waiting">Your copy is ready. Compare it with the original.</p>`;
    under.innerHTML = ''; return;
  }
  if (st === 'broken') return renderBroken();
  const v = realVerdict(), r = p.report, tensors = r.cases.reduce((a, c) => a + c.tensors_compared, 0), gap = Math.max(...r.cases.map(c => c.max_abs));
  const rd = rounding(p);
  box.innerHTML = `<p class="verdict ${v.cls}">${esc(v.head)}</p>`;
  under.innerHTML = passed(p) ? `<p class="tested">Tested on small made-up data against a patched copy of the original, not on real tissue.</p>
    <p class="stats">${ev('tensors', n0(tensors))} sets of numbers compared. Biggest gap is ${ev('gap', String(gap))}${rd ? ', apart from the one rounding difference below' : ''}.${r.resume.equal ? ' Stopping and resuming gave the same numbers too.' : ''}</p>
    ${rd ? `<p class="stats"><i class="pinkline"></i>One value differs by 0.00000006, the smallest step this number format stores: ${ev('rounding', rd.reference.toFixed(10))} in the original, ${ev('rounding', rd.candidate.toFixed(10))} in your copy. The difference is recorded and waiting for lab approval.</p>` : ''}`
    : `<p class="stats">${r.cases.filter(c => c.status !== 'passed').length} comparison${r.cases.filter(c => c.status !== 'passed').length === 1 ? '' : 's'} failed, ${r.mutations.filter(m => !m.detected).length} deliberate mistakes were missed, exit code ${p.exit_code}. See ${ev('tensors', 'the report')}.</p>`;
}
function renderBroken() {
  const p = S.proof, id = S.mistake, rec = mistakeRecord(p, id), band = mistakeBand(p, id)[1];
  const text = textDifference(rec && rec.message);
  const head = !rec || !rec.detected ? 'This mistake was not caught.' : HEADLINE[id] || 'Different numbers. Caught.';
  $('#verdictbox').innerHTML = `<p class="verdict mid">${esc(head)}</p>`;
  const name = MISTAKES[S.method][id] || id;
  const bits = [`<p class="tested">${esc(name)}.</p>`, '<p class="stats">Tested on small made-up data against a patched copy of the original, not on real tissue.</p>'];
  if (text) bits.push(`<p class="stats">The check found: ${ev(`mistake:${id}`, text.original)} in the original, ${ev(`mistake:${id}`, text.copy)} in your copy.</p>`);
  if (band && band.tensors_different) bits.push(`<p class="stats">${ev(`mistake:${id}`, n0(band.numbers_different))} of ${n0(band.numbers)} numbers differ.</p>`);
  else if (band && text) bits.push('<p class="stats">No number in this run changed. The check caught it anyway.</p>');
  else if (!text) bits.push(`<p class="stats">See ${ev(`mistake:${id}`, 'the record')} of this mistake.</p>`);
  $('#under').innerHTML = bits.join('');
}
function renderFine() {
  const m = S.method, tamper = Object.values(S.reports[m].checks.find(c => c.name === 'tamper_detected').detail);
  const mutations = (S.proof || { report: S.reports[m].parity.report }).report.mutations;
  const all = tamper.every(t => t.caught) && mutations.every(x => x.detected);
  $('#fine').innerHTML = `
    <p>An AI agent wrote this test, so the tool tested the test: ${ev('mistakes', `${mutations.length} mistakes`)} added to the code, and stored numbers changed on purpose ${ev('tamper', `${tamper.length} times`)} during the Oct 26 run. ${all ? 'All caught.' : 'Not all were caught.'} Our separate verifier covers only ${ev('verifier', 'one other method')} so far, so this one is not independently verified.</p>
    ${m === 'abmil' ? '<p>The original’s image step, which turns a patch picture into numbers, was replaced on both sides, so it was never compared.</p>' : ''}`;
}
function renderProofActions(secs) {
  const box = $('#proofActions'), st = S.proofState, p = S.proof, saved = S.saved[S.method];
  const run = `Run the check${secs ? ` (${timeLabel(secs)})` : ''}`;
  const explain = '<button class="link" data-explain>Explain this step</button>';
  const trySlide = '<button class="link" data-slides>Try it on a real slide</button>';
  if (st === 'running') {
    box.innerHTML = `<button class="btn" disabled>Running the check</button><button class="link" id="stopCheck">Stop the check</button>${explain}`;
    $('#stopCheck').onclick = () => S.stopCheck && S.stopCheck(); return;
  }
  if (st === 'broken') {
    box.innerHTML = `<button class="btn" id="unbreak">Back to the real copy</button><button class="link" id="breakOther">Try another mistake</button>${explain}`;
    $('#unbreak').onclick = () => { S.mistake = null; S.proofState = 'real'; renderProof(); $('#proofActions .btn').focus(); };
    $('#breakOther').onclick = openMistakes; return;
  }
  if (!p) {
    const offerSaved = Boolean(saved);
    box.innerHTML = `<button class="btn" id="runCheck" ${S.running ? 'disabled' : ''}>${S.running ? 'Waiting for the other run' : esc(run)}</button>
      ${offerSaved ? `<button class="link" id="showSaved">Show the saved result (saved ${shortDate(saved.run_at)})</button>` : ''}${explain}`;
    $('#runCheck').onclick = runCheck;
    if ($('#showSaved')) $('#showSaved').onclick = showSaved;
    return;
  }
  const ok = passed(p);
  box.innerHTML = `<button class="btn" id="toSign">Go to sign-off</button>
    ${ok ? '<button class="link" id="breakIt">See it catch a mistake</button>' : ''}${trySlide}
    <button class="link" id="rerun">Run again</button>${explain}`;
  $('#toSign').onclick = () => openStep(4);
  if ($('#breakIt')) $('#breakIt').onclick = openMistakes;
  $('#rerun').onclick = runCheck;
  $('#rerun').disabled = S.running;
}
function testKind(test) {
  const name = (/^test_mutation_is_detected\[(.+)\]/.exec(test) || [])[1];
  return name ? { mistake: MISTAKES[S.method][name] || name } : test.startsWith('test_resume') ? { resume: true } : {};
}
function startLabel(test) {
  const k = testKind(test);
  return k.mistake ? `Trying a deliberate mistake: ${k.mistake}.` : k.resume ? 'Stopping halfway, resuming, comparing again.' : 'Comparing your copy with the original.';
}
function doneLabel(test, ok) {
  const k = testKind(test);
  if (k.mistake) return `${ok ? 'Caught' : 'Missed'}: ${k.mistake}.`;
  if (k.resume) return ok ? 'Stopping and resuming gave the same numbers.' : 'Stopping and resuming changed the numbers.';
  return ok ? 'A test case matched the original.' : 'A test case did not match the original.';
}
function runCheck() {
  if (PUBLIC) return showSaved();
  if (S.running) return;
  const id = S.method; S.running = true;
  S.proofState = 'running'; S.proof = null; S.proofError = null; S.mistake = null; S.proofSource = 'live';
  S.run = { total: 0, results: [], line: 'Starting the real tests.', mistakes: S.reports[id].parity.declaration.mutations.length };
  renderProof(); renderSpines();
  const es = new EventSource(`/api/prove?method=${id}`);
  let ended = false;
  const stop = () => { ended = true; es.close(); S.running = false; S.stopCheck = null; };
  const fail = (title, body) => { stop(); S.proofState = 'idle'; S.proof = null; S.proofError = { title, body }; if (S.method === id) { renderProof(); renderSpines(); } };
  S.stopCheck = async () => { fail('Check stopped.', 'Nothing was saved. Press Run the check to start again.'); await fetch('/api/stop', { method: 'POST' }).catch(() => {}); };
  const show = () => { if (S.method === id) renderTicks(); };
  es.onmessage = async ev => {
    const m = JSON.parse(ev.data);
    if (m.kind === 'collected') { S.run.total = m.total; show(); }
    if (m.kind === 'start') { S.run.total = m.total; S.run.line = `Check ${Math.min(m.done + 1, m.total)} of ${m.total}. ${startLabel(m.test)}`; show(); }
    if (m.kind === 'test') {
      const ok = m.outcome === 'passed';
      S.run.results.push({ ok, caught: ok && Boolean(testKind(m.test).mistake), text: doneLabel(m.test, ok) });
      if (S.run.results.length === m.total) S.run.line = `All ${m.total} checks finished.`;
      show();
    }
    if (m.kind === 'busy') fail('Another run is going on Neal’s Mac.', 'Wait for it to finish, then press Run the check.');
    if (m.kind === 'missing') fail('The check cannot start.', `This Mac is missing ${m.paths.map(p => `<code>${esc(p)}</code>`).join(', ')}. The saved result is still available.`);
    if (m.kind === 'failed') fail('The tests did not finish.', esc(m.detail));
    if (m.kind === 'done') {
      const result = await fetch(`data/proof/${id}.last.json`).then(r => r.json());
      stop();
      if (S.method !== id) { if (S.step === 3) renderProof(); return; }
      if (!reduced) await sleep(1000);   // hold the finished tally for a moment, so it can be read
      await reveal(result, 'live');
    }
  };
  es.onerror = () => { if (!ended) fail('The run stream closed.', 'See the terminal running ./run.sh. The saved result is still available.'); };
}
async function showSaved() { await reveal(S.saved[S.method], 'saved'); }
async function reveal(result, source) {
  S.proof = result; S.proofSource = source; S.proofState = 'real'; S.mistake = null; S.proofError = null;
  renderSpines();
  if (S.step === 3) await playCheck();
}
/* The one piece of unprompted motion: the copy slides onto the original, the difference wipes in, then the verdict lands.
   Timers finish the sequence even if the page is hidden and animations stall. */
async function playCheck() {
  S.animating = !reduced;
  renderProof();
  if (reduced) return;
  const box = $('#verdictbox'), under = $('#under'), cap = $('#capD'), cover = $('#cover'), note = $('#diffnote');
  [box, under, cap, note].forEach(n => { n.style.visibility = 'hidden'; });
  cover.textContent = '';
  const copy = $('#bandC'), orig = $('#bandO'), bands = $('#bands');
  const ghost = copy.cloneNode(); ghost.classList.add('ghost');
  ghost.width = copy.width; ghost.height = copy.height; ghost.getContext('2d').drawImage(copy, 0, 0);
  const a = copy.getBoundingClientRect(), b = orig.getBoundingClientRect(), root = bands.getBoundingClientRect();
  ghost.style.top = (a.top - root.top) + 'px'; ghost.style.width = a.width + 'px'; ghost.style.height = a.height + 'px';
  bands.append(ghost);
  const slide = ghost.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${b.top - a.top}px)` }], { duration: 700, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
  const wipe = cover.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], { duration: 800, delay: 750, easing: 'linear', fill: 'forwards' });
  await Promise.race([Promise.all([slide.finished, wipe.finished]), sleep(2000)]);
  S.animating = false;
  ghost.remove(); cover.remove();
  [note, box, under, cap].forEach(n => { n.style.visibility = ''; });
}

/* Plain caption for the difference band. It ties the sample of squares to the full count. */
function diffCaption(band, cells) {
  const pink = cells.filter(c => c.d).length, shown = cells.length;
  if (!band.tensors_different) return 'No number in this sample differs.';
  if (band.tensors_different === 1 && pink === 1) return `The one number that differs, moved into this sample of ${n0(shown)} so you can see it.`;
  if (band.tensors_different <= 40) {
    const word = band.numbers_different === band.tensors_different ? 'numbers' : 'sets of numbers';
    return `Showing ${n0(pink)} of the ${n0(band.tensors_different)} ${word} that differ. Some were moved into this sample of ${n0(shown)} so you can see them.`;
  }
  return `${n0(pink)} of the ${n0(shown)} numbers in this sample differ.`;
}
/* One square is one real number. Colour is its rank among the original's numbers. */
const COLS = 60;
function hemaMix(t) { const a = [239, 241, 247], b = [58, 43, 184]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; }
function fitCanvas(cv) { const w = cv.clientWidth, h = cv.clientHeight, dpr = devicePixelRatio || 1;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, w, h }; }
function paintBand(cv, values, sorted) {
  const { ctx, w, h } = fitCanvas(cv), cell = w / COLS;
  ctx.clearRect(0, 0, w, h);
  values.forEach((v, i) => { const x = (i % COLS) * cell, y = Math.floor(i / COLS) * cell;
    if (v == null) { ctx.fillStyle = '#EFF1F7'; } else {
      let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
      ctx.fillStyle = hemaMix(.08 + .92 * Math.min(1, lo / Math.max(sorted.length - 1, 1))); }
    ctx.fillRect(x, y, Math.ceil(cell) - 1, Math.ceil(cell) - 1); });
}
function paintDiff(cv, cells) {
  const { ctx, w, h } = fitCanvas(cv), cell = w / COLS;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#F2387F';
  cells.forEach((c, i) => { if (c.d) ctx.fillRect((i % COLS) * cell, Math.floor(i / COLS) * cell, Math.ceil(cell) - 1, Math.ceil(cell) - 1); });
}
function drawBands() {
  const O = $('#bandO'), C = $('#bandC'), D = $('#bandD'); if (!O) return;
  const p = S.proof || null, base = p || S.saved[S.method];
  const st = S.proofState;
  const band = base ? (st === 'broken' ? mistakeBand(p, S.mistake) : realCase(base))[1] : null;
  const fallback = base && st === 'broken' && !band ? realCase(base)[1] : null;
  const cells = (band || fallback || { cells: [] }).cells;
  const sorted = cells.map(c => c.o).filter(v => v != null).sort((a, b) => a - b);
  paintBand(O, cells.map(c => c.o), sorted);
  const compared = p && st !== 'running' && (st !== 'broken' || band);
  if (compared) paintBand(C, cells.map(c => c.c), sorted);
  else { const { ctx, w, h } = fitCanvas(C); ctx.fillStyle = '#EFF1F7'; ctx.fillRect(0, 0, w, h); }
  paintDiff(D, compared ? cells : []);
  const cover = $('#cover');
  if (cover) {
    if (compared && !S.animating) cover.remove();
    else if (!compared) cover.textContent = st === 'running' ? 'Comparing.' : st === 'broken' ? 'The check stopped before it reached these numbers.' : 'Not compared yet.';
  }
  const shown = (band || fallback);
  $('#capO').innerHTML = shown ? `${ev('band', `${n0(cells.length)} of ${n0(shown.numbers)} numbers`)}, one square each` : '';
  $('#capC').textContent = compared ? '' : st === 'running' ? 'Running now' : st === 'broken' ? 'Not captured' : 'Waiting for the check';
  const note = $('#diffnote');
  note.innerHTML = '';
  if (compared && band) {
    const pink = cells.filter(c => c.d).length;
    if (st === 'broken' || band.tensors_different) $('#capD').textContent = diffCaption(band, cells);
    else $('#capD').textContent = 'Three of the compared pairs: original on the left, your copy on the right.';
    if (st !== 'broken' && !pink) {
      const pairs = cells.filter(c => c.o != null && c.c != null && !c.d && !Number.isInteger(c.o)).slice(0, 3);
      note.innerHTML = `<b>No differences found</b><div class="pairs">${pairs.map(c => `<div>${c.o}<i>=</i>${c.c}</div>`).join('')}</div>`;
    } else if (st !== 'broken') note.innerHTML = `<b>${pink === 1 ? 'One difference found' : `${n0(pink)} differences found`}</b>`;
  }
}
let bandResize = 0;
new ResizeObserver(() => { clearTimeout(bandResize); bandResize = setTimeout(() => { if (S.step === 3 && !S.animating) drawBands(); }, 80); }).observe(document.documentElement);

function openMistakes() {
  const m = S.method, decl = S.reports[m].parity.declaration.mutations;
  const body = el('div');
  body.append(el('p', '', `Pick one real mistake. Each was put into the add-on on purpose during ${S.proofSource === 'saved' ? 'the saved run' : 'the run you just watched'}, and the check caught it. The record behind each one opens from its numbers.`));
  const rank = id => { const i = Object.keys(MISTAKES[m]).indexOf(id); return i < 0 ? 99 : i; };
  for (const item of [...decl].sort((a, b) => rank(a.id) - rank(b.id))) {
    const b = el('button', 'mistake' + (S.mistake === item.id ? ' on' : ''), `<b>${esc(MISTAKES[m][item.id] || item.id)}</b>`);
    b.onclick = async () => { closeSheet(); S.mistake = item.id; S.proofState = 'broken'; await playCheck(); renderSpines(); };
    body.append(b);
  }
  pushSheet('See it catch a mistake', body);
}

/* ---- Step 4 ---- */
const fileRank = x => x.path.startsWith('wsip/') ? 0 : x.path.startsWith('tests/') ? 2 : 1;
function renderSignoff() {
  const d = cur(), f = fileData(), notes = S.plain[S.method] || {};
  const sorted = list => [...list].sort((a, b) => fileRank(a) - fileRank(b) || a.path.localeCompare(b.path));
  const add = sorted(f.files.filter(x => x.category !== 'B')), fw = sorted(f.files.filter(x => x.category === 'B'));
  const path = x => esc(x.path).replace(/\//g, '/<wbr>').replace(/_/g, '_<wbr>');
  const row = x => `<button class="file shared" data-file="${esc(x.path)}"><span class="plain">${esc(notes[x.path] || '')}</span><span class="meta"><span class="p">${path(x)}</span><span class="c">+${n0(x.added)} −${n0(x.removed)}</span></span></button>`;
  const addRow = x => `<button class="file" data-file="${esc(x.path)}" aria-label="${esc(x.path)}"><span class="p">${esc(x.path.replace(/^wsip\/methods\//, ''))}</span><span class="c">+${n0(x.added)} −${n0(x.removed)}</span></button>`;
  const n = S.decisions[S.method].count, dtfd = S.method === 'dtfd-mil' ? ' One optional decision was left unanswered.' : '';
  const signed = S.signed;
  const ask = signed === 'accept' ? `Accepted. ${esc(d.name)} is ready to run in the lab’s code.`
    : signed === 'reject' ? 'You rejected this, as practice. In the tool, a rejection stops the run.' : 'Waiting for a person.';
  const next = METHODS[(METHODS.findIndex(m => m.id === S.method) + 1) % METHODS.length];
  $('#panel4').innerHTML = `
    <div class="topline"><h2><span class="stepn">4</span>You approve</h2><span>${signed ? 'Practice only. The real changes are still waiting for review.' : 'Not merged. Nobody has signed off yet.'}</span></div>
    <p class="ask" id="ask" aria-live="polite">${ask}</p>
    ${signed === 'accept' ? `<section class="adds next" aria-label="What happens next">
      <h3>Next: ${esc(d.name)} runs on the lab’s slides</h3>
      <p class="adds-lede">In the real tool, a lab member merges these changes. From then on, ${esc(d.name)} runs on the lab’s slides like any other method, and its results sit next to theirs.</p>
      <h4 class="pub-h">What ${esc(d.name)} found on real slides, in published work</h4>
      <table class="pub"><thead><tr><th>Slides</th><th>What the model decides, and why it matters</th><th>Accuracy</th><th>AUC</th></tr></thead><tbody>
        ${curMethod().published.rows.map(r => { const k = DATASETS[r[0]] || { name: r[1], ask: '', why: '' };
          return `<tr><td><b>${esc(k.name)}</b><small>${esc(r[0])}</small></td><td>${esc(k.ask)}<small>${esc(k.why)}</small></td><td class="n">${r[2]}<small>about ${Math.round(Number(r[2]) * 100)} of 100 slides right</small></td><td class="n"><span class="aucbar" style="--v:${Math.max(0, (Number(r[3]) - 0.5) * 2)}"></span>${r[3]}</td></tr>`; }).join('')}
      </tbody></table>
      <p class="adds-foot"><b>How to read AUC:</b> take one slide that has the condition and one that does not. AUC is how often the model scores the first one higher. 1.0 is perfect, and 0.5 is a coin flip. Source: ${esc(curMethod().published.source)}. These are the authors' results on slides the model never saw in training. The lab's copy has not been tested on these slide sets yet. That benchmark is the next step.</p>
      <div class="actions"><button class="btn" id="seeRun">See ${esc(d.name)} on a real slide</button></div>
      <p class="adds-foot">The slides are real cancer slides from TCGA, a public archive. The model in this demo is barely trained, so its map shows the code runs. It is not a diagnosis.</p>
    </section>` : ''}
    <p class="askwhy">Matching numbers show the copy matches the patched original on these small test cases. They do not show that a change to shared code is safe for everything else that uses it.</p>
    <section class="adds" aria-label="What ${esc(d.name)} adds for the lab">
      <h3>What ${esc(d.name)} adds for the lab <i>${esc(curMethod().paper)}</i></h3>
      <div class="adds-grid">
        <div><b>What it does</b><p>${esc(curMethod().does)}</p></div>
        <div><b>Why a lab adds it</b><p>${esc(curMethod().why)}</p></div>
        <div><b>When to pick another</b><p>${esc(curMethod().instead)}</p></div>
      </div>
      <p class="adds-foot">With ${esc(d.name)} in the lab’s code, it runs on the same slides and the same splits as the methods already there, so the comparison is fair. <button class="link" data-slides>See it on a real slide</button></p>
    </section>
    <div class="split">
      <button class="a" style="flex:${add.length}" data-ev="files:addon">${add.length} add-on</button>
      <button class="b" style="flex:${fw.length}" data-ev="files:framework">${fw.length} shared</button>
    </div>
    <div class="cols">
      <div class="col a"><h3>New add-on code <i>for ${esc(d.name)} only</i></h3><div class="rows" id="rowsA">${add.map(addRow).join('')}</div><p class="rowhint" id="hintA"></p></div>
      <div class="col b"><h3>Shared framework, needs a person</h3><div class="rows" id="rowsB">${fw.map(row).join('')}</div><p class="rowhint" id="hintB"></p></div>
    </div>
    <div class="records">
      <p>An agent answered all ${ev('decisions', String(n))} decisions in the lab’s place, marked provisional. No lab member has confirmed them.${dtfd}</p>
      <p>In these Oct 26 runs, the add-on stage edited shared code without stopping, and nobody has reviewed those edits. On ${ev('oct30', 'Oct 30')} the tool was changed so those edits stop for a person. No run has gone through that stop yet.</p>
      <p class="plain">These labels were computed afterward from the recorded patches.</p>
    </div>
    <div class="actions" id="signActions"></div>
    <p class="practice" id="practice">${signed ? 'Practice sign-off, on this page only. Nothing was merged.' : 'Practice only. This page saves nothing and changes no code.'}</p>`;
  const explain = '<button class="link" data-explain>Explain this step</button>';
  const box = $('#signActions');
  if (!signed) {
    box.innerHTML = `<button class="btn" id="accept">Accept these changes</button><button class="btn quiet" id="reject">Reject these changes</button>${explain}`;
    const sign = choice => () => { S.signed = choice; renderSignoff(); renderSpines(); ($('#seeRun') || $('#another')).focus(); };
    $('#accept').onclick = sign('accept'); $('#reject').onclick = sign('reject');
  } else {
    box.innerHTML = `<button class="btn" id="another">Try another method</button><span class="chose">${signed === 'accept' ? 'Accepted, as practice' : 'Rejected, as practice'}</span>
      <button class="link" id="undoSign">Change my answer</button>${explain}`;
    $('#another').onclick = () => { setMethod(next.id); openStep(1); };
    const see = $('#seeRun');
    if (see) see.onclick = async () => { S.live[S.method] = S.live[S.method] || await savedHeat(); openSlides(); };
    $('#undoSign').onclick = () => { S.signed = null; renderSignoff(); renderSpines(); $('#accept').focus(); };
  }
  watchRows('#rowsA', '#hintA'); watchRows('#rowsB', '#hintB');
}
/* A list that does not fit says so, so no file is silently cut off. */
function watchRows(list, hint) {
  const box = $(list), out = $(hint), rows = [...box.children];
  const update = () => {
    const limit = box.scrollTop + box.clientHeight + 1, seen = rows.filter(r => r.offsetTop - box.offsetTop + r.offsetHeight <= limit).length;
    out.textContent = box.scrollHeight <= box.clientHeight + 1 ? '' : seen < rows.length ? `Showing ${seen} of ${rows.length}, scroll for the rest` : `Showing all ${rows.length}`;
  };
  box.onscroll = update; update();
}

/* ---- Sheets ---- */
const sheet = () => $('#sheet');
function showTop() {
  const top = S.sheetOpen[S.sheetOpen.length - 1], box = $('#sheetBody');
  box.replaceChildren(top.node); box.scrollTop = 0;
  $('#sheetTitle').textContent = top.title;
  $('#sheetBack').hidden = S.sheetOpen.length < 2;
  if (top.after) top.after();
}
function pushSheet(title, node, after) {
  S.sheetOpen.push({ title, node, after });
  if (!sheet().open) sheet().showModal();
  showTop();
  $('#sheetTitle').focus();
}
function closeSheet() { S.sheetOpen = []; if (sheet().open) sheet().close(); }

/* Explain: four answers for each step, then the words. */
const EXPLAIN = {
  1: { title: 'Step 1: Pick a method', what: 'You choose one published AI method to add to your lab’s shared code. This demo holds three: ABMIL, TransMIL and DTFD-MIL.',
    who: 'A person. A person starts the job, and a person ends it.',
    why: 'Labs compare methods. That comparison means little if a method was copied in with a small mistake, because the results change and nothing looks wrong.',
    not: 'This page does not take a new method. It shows three methods with one recorded run each.' },
  2: { title: 'Step 2: AI adds it', what: 'AI agents read the method’s code, run the original in a locked-down space, extend the framework if they must, write the add-on, then write a test that compares it with the original. After each stage, a program checks the work and can reject it.',
    who: 'Seven AI agent roles across five stages: analyst, reviewer, reference runner, extension planner, extension builder, adapter author and parity checker. The word adapter means add-on.',
    why: 'Copying a method by hand is easy to get subtly wrong. Agents can do the copying, as long as something other than the agents checks the result.',
    not: 'This is a sped-up replay of a recorded run. No AI is running now. Three methods, one run each. This is not a success rate. An answer key lists what a correct reading of the method should find. The agent that ran the tool wrote it, and no person has verified it.' },
  3: { title: 'Step 3: Code proves it', what: 'A program runs your copy and compares its numbers with the numbers stored from the original, one set at a time. Then it runs deliberate mistakes through the same comparison, to show the check can fail.',
    who: 'A program on Neal’s Mac, and no AI is called while it runs. An AI agent wrote the comparison test and chose the deliberate mistakes. The tool then changed stored numbers on purpose to confirm the test notices.',
    why: 'A program reports the result, not the agent that wrote the add-on. An AI agent did write this test, so the result is not independent.',
    not: 'The test uses small made-up data against a patched copy of the original, not real tissue. Not a certification. Three methods, one run each. This is not a success rate. The independent verifier covers only CLAM so far, so these methods are not independently verified.' },
  4: { title: 'Step 4: You approve', what: 'The changed files are split in two. New add-on code belongs to one method. Changes to the shared framework can affect every method, so they need a person. Open any file to read its real changes.',
    who: 'A person. An agent answered the lab’s decisions in the lab’s place, marked provisional, and no lab member has confirmed them.',
    why: 'Matching numbers show the copy matches the patched original on these small test cases. They do not show that a change to shared code is safe for everything else that uses it.',
    not: 'The buttons on this step are practice. This page saves nothing and changes no code. The labels were computed afterward from the recorded patches. Nothing here has been merged.' },
};
const WORD = {
  method: ['Method', 'A published AI recipe for reading tissue slides.'],
  framework: ['Framework', 'Your lab’s shared code that runs every method. Here it is called WSIP.'],
  addon: ['Add-on', 'Code that belongs to one method only. The records call this an adapter.'],
  slide: ['Slide', 'A scan of a tissue sample.'], patch: ['Patch', 'A small square cut from a slide.'],
  agent: ['Agent', 'An AI program given one job and a limited set of tools.'],
  role: ['Agent role', 'One job in the run, such as reading the method or writing the add-on.'],
  locked: ['Locked-down space', 'A sandbox on the Mac: no network, and code can write only inside its own work folder.'],
  allow: ['Allow-list', 'The commands an agent may use. Anything else is refused.'],
  frozen: ['Prompts frozen', 'The written instructions for the agents were fixed before the run.'],
  key: ['Answer key', 'A list of what a correct reading of the method should find. It was committed before the run.'],
  provisional: ['Provisional', 'Answered for now by an agent, and waiting for a person to confirm.'],
  set: ['Set of numbers', 'One tensor, a named block of numbers the method produces while it runs.'],
  patched: ['Patched copy', 'The original code with a few declared changes, so it can run here on small test data.'],
  mistake: ['Deliberate mistake', 'An error put into the add-on on purpose, to show the check can fail.'],
  tamper: ['Tamper run', 'The tool changes a stored block of numbers on purpose and runs the test again. The test must fail.'],
  verifier: ['Independent verifier', 'A separate comparison program that a person reviews, so agents do not judge themselves. It covers only CLAM so far.'],
  clam: ['CLAM', 'A slide-reading method the framework already held, before these three.'],
  image: ['Image step', 'The part of a method that turns a patch picture into numbers.'],
  rounding: ['Rounding step', 'The smallest change a number format can store. Here it is 0.00000006.'],
  merged: ['Merged', 'Added to the lab’s real shared code.'],
};
const STEP_WORDS = { 1: ['method', 'framework', 'addon', 'slide', 'patch'],
  2: ['agent', 'role', 'addon', 'framework', 'locked', 'allow', 'frozen', 'key', 'provisional'],
  3: ['set', 'patched', 'mistake', 'tamper', 'verifier', 'clam'],
  4: ['addon', 'framework', 'provisional', 'merged', 'clam'] };
function openExplain() {
  const x = EXPLAIN[S.step], body = el('div');
  const keys = [...STEP_WORDS[S.step], ...(S.step === 3 && S.method === 'abmil' ? ['image'] : []), ...(S.step === 3 && S.method === 'transmil' ? ['rounding'] : [])];
  const words = keys.map(k => WORD[k]);
  body.innerHTML = `<h3>What happens</h3><p>${esc(x.what)}</p><h3>Who does it</h3><p>${esc(x.who)}</p><h3>Why it matters</h3><p>${esc(x.why)}</p>
    <h3>What this does not show</h3><p>${esc(x.not)}</p>
    ${S.step === 3 ? `<h3>From the records of ${esc(cur().name)}</h3>${CAVEATS[S.method].map((text, i) => `<p>${esc(text)} <span class="small mono">${esc(cur().caveats[i].src)}</span></p>`).join('')}` : ''}
    <h3>Words on this screen</h3><dl class="words">${words.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>`;
  pushSheet(x.title, body);
}

/* Evidence: what a number means, and the real file behind it. */
const textCache = {};
const getText = async url => textCache[url] ||= await fetch(url).then(r => r.ok ? r.text() : 'This file is not in the public copy of this site.');
function codeBlock(text, needles = [], cls = '') {
  const lines = text.split('\n'), hit = l => needles.some(n => n instanceof RegExp ? n.test(l) : l.includes(n));
  const pre = el('pre', 'code ' + cls);
  pre.innerHTML = lines.map((l, i) => `<span class="ln${hit(l) ? ' hit' : ''}"><i>${i + 1}</i>${esc(l)}</span>`).join('');
  return pre;
}
const runPath = rel => `${RUNS_PATH}/${cur().run_id}/${rel}`;
function evidenceFor(key) {
  const m = S.method, d = cur(), base = `data/evidence/${m}`;
  const report = { url: `${base}/parity-report.json`, origin: runPath('stage5/parity-report.json'), copy: `data/evidence/${m}/parity-report.json` };
  const heldout = { url: 'data/evidence/heldout_results.json', origin: 'a-wsip-verification/deliverables/2026-10-26/eval-scripts/heldout_results.json', copy: 'data/evidence/heldout_results.json' };
  const proof = S.proof ? { url: `data/proof/${m}.${S.proofSource === 'saved' ? '' : 'last.'}json`, origin: S.proofSource === 'saved' ? `data/proof/${m}.json, written by tools/build_proof.py` : `data/proof/${m}.last.json, written by tools/prove.py on Neal’s Mac`, json: x => ({ run_at: x.run_at, seconds: x.seconds, exit_code: x.exit_code, evidence: x.evidence, report: x.report }) } : null;
  const replayFile = { url: `data/replay/${m}.json`, origin: `data/replay/${m}.json, from ${runPath('')}. Only the fields behind this number are shown.` };
  const filesFile = { url: `${base}/files.json`, origin: `data/evidence/${m}/files.json, written by tools/build_evidence.py` };
  const commitFile = { url: 'data/evidence/commit-a2dc88d.txt', origin: 'a-wsip-verification, commit a2dc88d' };
  const fileNote = `Each file is counted once across stages, using today’s classifier, wsip/integration/changes.py at commit a2dc88d. That commit moved one test file per method from framework to add-on, so older records show one more framework file.`;
  if (key === 'speed') return { title: 'How fast this replay plays', says: `The recorded run took ${clockOf(d.wall_seconds)} from start to finish. This replay lasts ${REPLAY_SECONDS} seconds, so it plays ${speedOf(d)} times faster. The times come from the run’s own records.`, files: [{ ...replayFile, json: x => ({ run_id: x.run_id, started_at: x.started_at, wall_seconds: x.wall_seconds }), needles: ['"wall_seconds"'] }] };
  if (key === 'cost') return { title: `What ${d.name} cost`, says: `${usd(d.cost)} is the agent spend for this one recorded run. The three runs together cost ${usd(S.summary.total_usd)}. The three figures are ${METHODS.map(x => usd(S.replays[x.id].cost)).join(', ')}, which add to ${usd(METHODS.reduce((a, x) => a + S.replays[x.id].cost, 0))} after rounding.`, files: [{ ...heldout, needles: [d.run_id + ': USD', 'TOTAL USD'] }] };
  if (key === 'total') return { title: 'What all three runs cost', says: `${usd(S.summary.total_usd)} for TransMIL, ABMIL and DTFD-MIL together. The exact sum of every attempt’s recorded spend is 34.7094.`, files: [{ ...heldout, needles: ['TOTAL USD'] }] };
  if (key.startsWith('stagecost:')) { const st = d.stages.find(s => s.id === key.split(':')[1]); return { title: `What “${STAGE_COPY[st.id].name}” cost`, says: `${usd(st.cost)} across ${st.attempts.length} agent attempt${st.attempts.length === 1 ? '' : 's'} in this stage.`, files: [{ ...replayFile, json: x => { const y = x.stages.find(q => q.id === st.id); return { stage: y.title, cost: y.cost, attempts: y.attempts.map(a => ({ role: a.label, attempt: a.attempt, cost: a.cost, passed: a.passed })) }; }, needles: [`"cost": "${st.cost}"`] }] }; }
  if (key === 'files' || key.startsWith('files:')) { const c = fileData().counts; return { title: key === 'files:framework' ? 'Files that change the shared framework' : key === 'files:addon' ? 'Files of new add-on code' : 'Files this run changed', says: `${c.addon} files of new add-on code and ${c.framework} changes to the shared framework. ${fileNote}`, files: [{ ...filesFile, needles: ['"addon"', '"framework"'] }, commitFile] }; }
  if (key === 'tensors') return { title: 'Sets of numbers compared', says: 'A set of numbers is one tensor: a named block of numbers the method produces while it runs. The count below comes from this check’s report, and the Oct 26 report is shown under it.', files: [...(proof ? [{ ...proof, needles: ['"tensors_compared"'] }] : []), { ...report, needles: ['"tensors_compared"'] }] };
  if (key === 'gap') return { title: 'The biggest gap', says: `The largest difference found between any stored original number and the matching number in your copy. Comparison tolerance is 0, so a value must be exactly equal to pass.${m === 'transmil' ? ' One recorded value and its copies may differ by one rounding step.' : ''}`, files: [...(proof ? [{ ...proof, needles: ['"max_abs"'] }] : []), { ...report, needles: ['"max_abs"', '"atol"'] }] };
  if (key === 'mistakes') return { title: 'Deliberate mistakes', says: 'Each deliberate mistake is put into the add-on on purpose, and the same comparison must fail. The agent that wrote the test also chose these mistakes and wrote them down in the report’s declaration.', files: [...(proof ? [{ ...proof, needles: ['"detected"'] }] : []), { ...report, needles: ['"detected"', '"description"'] }] };
  if (key === 'tamper') return { title: 'Tamper runs', says: 'During the Oct 26 run the tool, not the agent, changed one stored block of numbers at a time, in one test case, and re-ran the test. Each change must make the test fail. This shows that the agent’s test is really reading the stored numbers.', files: [{ url: `${base}/checks.json`, origin: runPath('stage5/attempt-1/checks.json'), copy: `data/evidence/${m}/checks.json`, needles: ['"tamper_detected"', '"caught"'] }] };
  if (key === 'rounding') return { title: 'The one rounding difference', says: 'The original adds these values up with less precision than the framework does, so one average differs by 0.00000006, the smallest step this number format stores. The record keeps it as a known difference that is waiting for lab approval. Every decision made from this value still matched.', files: [{ ...report, needles: ['"reference": 0.66', '"candidate": 0.66', '"status": "pending lab approval"'] }] };
  if (key === 'band') { const c = S.proof || S.saved[m]; return { title: 'What the squares are', says: `Each square is one real number from a test case of this check, taken from one of the sets of numbers along the run, evenly spread. When only a few sets differ, those are moved in, so a difference always shows. Darker means larger among the numbers shown. The numbers come from the original’s stored evidence and from the live comparison, read by a small observer added around the test’s own compare function. The observer only reads, and it changes no result.`, files: c ? [{ url: S.proof ? proof.url : `data/proof/${m}.json`, origin: S.proof ? proof.origin : `data/proof/${m}.json, written by tools/build_proof.py`, json: x => ({ run_at: x.run_at, cases: Object.fromEntries(Object.entries(x.bands.cases).map(([k, v]) => [k, { tensors: v.tensors, numbers: v.numbers, tensors_different: v.tensors_different, numbers_different: v.numbers_different, first_three_squares: v.cells.slice(0, 3) }])) }), needles: ['"numbers"'] }] : [] }; }
  if (key.startsWith('mistake:')) { const id = key.split(':')[1], [caseName, b] = mistakeBand(S.proof, id); return { title: MISTAKES[m][id] || id, says: b ? `On test case ${caseName}, ${n0(b.numbers_different)} of ${n0(b.numbers)} numbers differ across ${n0(b.tensors_different)} sets of numbers. The first entry below is what the check reported when it stopped.` : 'The check stopped at this difference, before it compared any tensor, so there are no squares to paint.', files: [{ ...proof, json: x => ({ mutation: x.report.mutations.find(y => y.id === id), declared: S.reports[m].parity.declaration.mutations.find(y => y.id === id), tapped: b ? { case: caseName, tensors: b.tensors, numbers: b.numbers, tensors_different: b.tensors_different, numbers_different: b.numbers_different, first_different: b.first_different } : null }), needles: ['"message"', '"numbers_different"'] }] }; }
  if (key === 'verifier') return { title: 'The independent verifier', says: 'A separate comparison program that a person reviews, so agents do not judge themselves. Its list holds only CLAM so far, a method the framework already held. TransMIL, ABMIL and DTFD-MIL are not on it, so they are not independently verified.', files: [{ url: 'data/evidence/comparison-specs-registry.json', origin: 'a-wsip-verification, references/comparison-specs/registry.json', copy: 'data/evidence/comparison-specs-registry.json', needles: ['"clam"'] }] };
  if (key === 'oct30') return { title: 'The Oct 30 change', says: 'After this commit, a framework change in the add-on stage or the compare stage creates a required decision for a person, and rejecting it stops the run. The Oct 26 runs came before this change, and no run has gone through it yet.', files: [{ url: 'data/evidence/commit-6bd975b.txt', origin: 'a-wsip-verification, commit 6bd975b. Excerpt, with the part about this stop.', excerpt: t => { const [head, subject] = [t.split('\n')[0], t.split('\n')[2]], i = t.indexOf('- Accepted stages write'), j = t.indexOf('- Prompts extension_builder'); return `${head}\n\n${subject}\n\n${t.slice(i, j).trim()}`; }, needles: ['required <stage>_framework_changes', 'stop_kind=human'] }] };
  if (key.startsWith('tiles:')) { const o = key.split(':')[1], s = S.slides[o]; return { title: `${ORGANS[o]} slide`, says: `${n0(s.tiles)} patches with tissue were kept out of ${n0(s.grid_total)} on a 256-pixel grid. Case ${s.case_submitter_id}, project ${s.project}, from the open-access files of TCGA, a public cancer slide archive.`, files: [{ url: 'data/slides/prepared.json', origin: 'data/slides/prepared.json, written by tools/prepare_slides.py', needles: [`"tiles": ${s.tiles}`, `"case_submitter_id": "${s.case_submitter_id}"`] }] }; }
  return null;
}
async function openEvidence(key) {
  if (key === 'decisions') return openDecisions();
  const e = evidenceFor(key); if (!e) return;
  const body = el('div'); body.append(el('p', '', esc(e.says)));
  pushSheet(e.title, body);
  for (const f of e.files) {
    const label = el('p', 'source', `<b>${esc(f.origin)}</b>${f.copy ? `<br>Copy on Neal’s Mac: ${esc(f.copy)}` : ''}`);
    body.append(label);
    try {
      let text = await getTextFresh(f);
      const block = codeBlock(text, f.needles || []);
      body.append(block);
      const first = $('.hit', block);
      if (first) block.scrollTop = Math.max(0, first.offsetTop - block.offsetTop - 60);
    } catch (err) { body.append(el('p', '', esc(`This file is missing: ${f.url}`))); }
  }
}
async function getTextFresh(f) {
  if (f.json) { const data = await fetch(f.url).then(r => { if (!r.ok) throw new Error('missing'); return r.json(); }); return scrubHome(JSON.stringify(f.json(data), null, 1)); }
  const text = scrubHome(await getText(f.url));
  return f.excerpt ? f.excerpt(text) : text;
}
function openDecisions() {
  const m = S.method, dec = S.decisions[m], body = el('div');
  body.innerHTML = `<p>${dec.count} decisions, all answered by an agent in the lab’s place and marked provisional. No lab member has confirmed them.${m === 'dtfd-mil' ? ' One optional decision was left unanswered.' : ''}</p>
    ${dec.decisions.map(x => `<div class="decision"><p>${esc(x.question)}</p><p class="choice-line">Agent’s answer: ${esc(x.choice)}</p><p class="small">${esc(x.step)}. Answered by an agent, marked provisional.</p></div>`).join('')}
    <p class="source"><b>${esc(runPath('answers.json'))}</b><br><b>${esc(runPath('pipeline/answers.json'))}</b><br>Copies on Neal’s Mac: data/evidence/${m}/answers.json, pipeline-answers.json, decisions.json</p>`;
  pushSheet('Decisions an agent answered', body);
}
async function openFile(path) {
  const f = fileData().files.find(x => x.path === path), shared = f.category === 'B', body = el('div');
  body.innerHTML = `<p><span class="tag ${shared ? 'b' : 'a'}">${shared ? 'Shared framework, needs a person' : 'New add-on code'}</span></p>
    ${(S.plain[S.method] || {})[path] ? `<p><b>In plain words:</b> ${esc(S.plain[S.method][path])}</p>` : ''}
    ${f.notes.length ? `<p><b>The record’s note:</b> ${esc(f.notes.join(' '))}</p>` : ''}
    <p><b>Why this label:</b> ${esc(f.reason)}. <span class="small">Computed afterward by wsip/integration/changes.py at commit a2dc88d.</span></p>
    <p>${n0(f.added)} ${f.added === 1 ? 'line' : 'lines'} added, ${n0(f.removed)} removed, in the stage “${esc(f.stages.join('” and “'))}”.</p>`;
  pushSheet(path, body);
  if (PUBLIC) { body.append(el('p', 'small', 'The code itself is not in the public copy of this site.')); return; }
  for (const part of f.parts) {
    const text = await getText(`data/evidence/${S.method}/${part.patch}`);
    const block = text.split(/^(?=diff --git )/m).find(b => b.startsWith(`diff --git a/${path} `));
    body.append(el('p', 'source', `<b>${esc(runPath(ORIGIN_PATCH[part.patch]))}</b><br>Copy on Neal’s Mac: data/evidence/${esc(S.method)}/${esc(part.patch)}`));
    const pre = el('pre', 'code tall');
    pre.innerHTML = (block || '').split('\n').map((l, i) => `<span class="ln ${l.startsWith('+') && !l.startsWith('+++') ? 'add' : l.startsWith('-') && !l.startsWith('---') ? 'del' : l.startsWith('@@') || l.startsWith('diff') ? 'meta' : ''}"><i>${i + 1}</i>${esc(l)}</span>`).join('');
    body.append(pre);
  }
}
const ORIGIN_PATCH = { 'extension.accepted.patch': 'extension/builder/accepted.patch', 'stage4.accepted.patch': 'stage4/accepted.patch', 'stage5.accepted.patch': 'stage5/accepted.patch' };

/* ---- Slide sheet: try it on a real slide ---- */
let slideNode = null, table = null;
async function tiling(organ) { return S.tiling[organ] ||= await fetch(`data/slides/${organ}/tiling.json`).then(r => r.json()); }
function openSlides() {
  if (!slideNode) buildSlides();
  pushSheet('Try it on a real slide', slideNode, () => { syncSlides(); selectSlide(S.heatSlide); });
}
function buildSlides() {
  slideNode = el('div');
  slideNode.innerHTML = `<p class="tested" style="margin:0 0 .15rem">This shows the added method running on real slides inside the lab’s code.</p>
    <p class="small" style="margin:0 0 .7rem">A pipeline demonstration: it shows the code runs. It is not a diagnosis, and no accuracy is measured.</p>
    <div class="thumbs" id="thumbs"></div>
    <div class="lighttable" id="table"></div>
    <div class="heatlegend" id="heatlegend" hidden></div>
    <p class="small" id="heatNote" style="margin-top:.4rem"></p>
    <p class="runline" id="runline" role="status"></p>
    <div class="sheet-actions"><button class="btn" id="runSlides"></button><button class="link" id="savedSlides">Show the last saved run</button></div>
    <div class="topTiles" id="topTiles"></div>
    <p class="small" id="topCaption" style="margin-top:.35rem"></p>
    <p class="source" id="heatSource"></p>`;
  $('#thumbs', slideNode).innerHTML = S.order.map(o => { const s = S.slides[o];
    return `<div class="thumbwrap"><button class="thumb" data-organ="${o}" aria-pressed="false"><img src="data/slides/${o}/thumb.jpg" alt=""><b>${ORGANS[o]}</b></button><small class="small">${ev(`tiles:${o}`, n0(s.tiles))} patches</small></div>`; }).join('');
  $$('.thumb', slideNode).forEach(b => b.onclick = () => selectSlide(b.dataset.organ));
  table = new LightTable($('#table', slideNode));
  $('#runSlides', slideNode).onclick = runSlides;
  $('#savedSlides', slideNode).onclick = async () => { S.live[S.method] = await savedHeat(); showHeat(); };
}
async function savedHeat() { return fetch(`data/live/${S.method}.json`).then(r => r.ok ? r.json() : null).catch(() => null); }
async function syncSlides() {
  const name = cur().name;
  const saved = await savedHeat();
  const secs = saved ? saved.wall_seconds : null;
  const b = $('#runSlides', slideNode);
  b.disabled = S.running; b.textContent = S.running ? `Running ${name}` : `Run ${name} on these five slides${secs ? ` (${timeLabel(secs)})` : ''}`;
  $('#savedSlides', slideNode).hidden = !saved;
}
async function selectSlide(organ) {
  S.heatSlide = organ;
  $$('.thumb', slideNode).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.organ === organ)));
  if (S.live[S.method]) return showHeat();
  clearHeat();
  const s = S.slides[organ];
  $('#runline', slideNode).textContent = `${ORGANS[organ]}, case ${s.case_submitter_id}, from TCGA, a public cancer slide archive. Each outlined square is a patch with tissue.`;
  await table.show(organ); const t = await tiling(organ);
  if (S.heatSlide === organ) table.sweep(t.coords, t.patch, 1100);
}
function clearHeat() {
  $('#heatlegend', slideNode).hidden = true;
  ['#topTiles', '#topCaption', '#heatNote', '#heatSource'].forEach(q => { $(q, slideNode).textContent = ''; });
}
function runSlides() {
  if (PUBLIC) { savedHeat().then(r => { if (r) { S.live[S.method] = r; showHeat(); } }); return; }
  if (S.running) return;
  S.running = true;
  const id = S.method, name = cur().name, line = $('#runline', slideNode), b = $('#runSlides', slideNode);
  b.disabled = true; b.textContent = `Running ${name}`; delete S.live[id];
  clearHeat();
  line.textContent = 'Starting the framework on Neal’s Mac.'; table.clear();
  const es = new EventSource(`/api/run?method=${id}`);
  let ended = false;
  const end = () => { ended = true; es.close(); S.running = false; syncSlides(); if (S.step === 3 && S.proofState !== 'running') renderProof(); };
  es.onmessage = async ev => { const m = JSON.parse(ev.data);
    if (m.kind === 'busy') { line.textContent = 'Another run is going on Neal’s Mac. Wait for it to finish.'; end(); }
    if (m.kind === 'loaded') line.textContent = `Loaded ${Object.keys(m.tiles).length} slides through the framework.`;
    if (m.kind === 'epoch') line.textContent = `Training round ${m.epoch + 1} on ${m.sample_ids.join(', ')}.`;
    if (m.kind === 'scored') line.textContent = `Scored the ${m.slide} slide: ${n0(m.tiles)} patches.`;
    if (m.kind === 'error') line.textContent = `The run failed: ${m.error}`;
    if (m.kind === 'missing') { line.textContent = `This Mac is missing ${m.paths.join(', ')}. The saved run is still available.`; end(); }
    if (m.kind === 'done') { S.live[id] = await fetch(`data/live/${id}.json`).then(r => r.json()); if (S.method === id) { line.textContent = `Finished in ${m.wall_seconds.toFixed(1)} seconds on Neal’s Mac.`; showHeat(true); } }
    if (m.kind === 'exit') end(); };
  es.onerror = () => { if (!ended) { line.textContent = 'The run stream closed. See the terminal running ./run.sh. The saved run is still available.'; end(); } };
}
async function showHeat(keepLine) {
  const res = S.live[S.method]; if (!res) return;
  const organ = S.heatSlide, r = res.slides[organ], t = await tiling(organ), d = cur();
  await table.show(organ); await table.heat(t.coords, r.weights, t.patch, 900);
  const stops = Array.from({ length: 12 }, (_, i) => ramp(i / 11, 1)).join(','), attention = r.kind === 'attention';
  const legend = $('#heatlegend', slideNode); legend.hidden = false;
  legend.innerHTML = `<span>Lower</span><span class="ramp" style="background:linear-gradient(90deg,${stops})"></span><span>Higher. Colors show rank among ${n0(r.tiles)} patches.</span>`;
  if (!keepLine) { const when = new Date(res.created.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')); $('#runline', slideNode).textContent = `Saved run from ${MONTHS[when.getMonth()]} ${when.getDate()}, ${res.wall_seconds.toFixed(1)} seconds on Neal’s Mac.`; }
  $('#topTiles', slideNode).innerHTML = r.top.map(x => `<img alt="High-ranked patch from the ${ORGANS[organ]} slide" src="data/live/${S.method}/${x.file}?${Date.now()}">`).join('');
  $('#topCaption', slideNode).textContent = `Top ${r.top.length === 6 ? 'six' : r.top.length} patches by rank.`;
  const widest = Math.max(...S.prepared.slides.map(x => x.tiles));
  $('#heatNote', slideNode).textContent = `This run uses patch features computed earlier on Neal’s Mac. Barely trained model, labels picked only so training can run. This map says nothing about the tissue.${attention ? '' : ' TransMIL’s map is gradient saliency, not attention.'} Slides here reach ${n0(widest)} patches, and the number check covered at most ${n0(d.parity_max_instances)} per slide, so this shows the code runs, not that it matches the original here.`;
  $('#heatSource', slideNode).textContent = `data/live/${S.method}.json, written by tools/wsip_run.py`;
}

/* ---- Wiring ---- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-ev],[data-open],[data-explain],[data-file],[data-slides]');
  if (!t || !S.loaded) return;
  if (t.dataset.ev) return openEvidence(t.dataset.ev);
  if (t.dataset.open) return openStep(Number(t.dataset.open));
  if ('explain' in t.dataset) return openExplain();
  if (t.dataset.file) return openFile(t.dataset.file);
  if ('slides' in t.dataset) return openSlides();
});
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || !S.loaded) return;
  if (sheet().open) return;
  if ('1234'.includes(e.key)) return openStep(Number(e.key));
  if (e.key === 'e' || e.key === 'E' || e.key === '?' || (e.key === '/' && e.shiftKey)) return openExplain();
  if (e.key === 't' || e.key === 'T') return openSlides();
});

async function main() {
  const get = (u, fallback) => fetch(u).then(r => { if (r.ok) return r.json(); if (fallback !== undefined) return fallback; throw new Error(`Missing ${u}`); });
  const [prepared, summary, plain] = await Promise.all([get('data/slides/prepared.json'), get('data/replay/summary.json'), get('data/evidence/plain-notes.json', {})]);
  S.prepared = prepared; S.summary = summary; S.plain = plain; S.order = prepared.slides.map(s => s.organ);
  prepared.slides.forEach(s => { S.slides[s.organ] = s; });
  await Promise.all(METHODS.map(async m => {
    const [d, files, decisions, saved, parity, checks] = await Promise.all([get(`data/replay/${m.id}.json`), get(`data/evidence/${m.id}/files.json`), get(`data/evidence/${m.id}/decisions.json`),
      get(`data/proof/${m.id}.json`, null), get(`data/evidence/${m.id}/parity-report.json`), get(`data/evidence/${m.id}/checks.json`)]);
    S.replays[m.id] = d; S.files[m.id] = files; S.decisions[m.id] = decisions; S.saved[m.id] = saved; S.reports[m.id] = { parity, checks: checks.checks };
  }));
  S.loaded = true;
  $('#sheetClose').onclick = closeSheet;
  $('#sheetBack').onclick = () => { S.sheetOpen.pop(); showTop(); };
  sheet().addEventListener('close', () => { S.sheetOpen = []; });
  sheet().addEventListener('click', e => { if (e.target === sheet()) closeSheet(); });
  openStep(1, { focus: false });
  void document.body.offsetWidth;   // settle the first layout, so turning on the transition animates nothing
  document.documentElement.classList.add('ready');
}
main().catch(err => { document.body.innerHTML = `<p style="padding:3rem">The page could not load its records: ${esc(err.message)}. Check that ./run.sh is running and that data/evidence and data/replay exist.</p>`; });
