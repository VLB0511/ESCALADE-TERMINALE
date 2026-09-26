/* =========================================================
   Escalade — Suivi individuel
   Application 100% côté client, sans rechargement de page.
   Les données (liste d'élèves + fiches) sont stockées via
   window.storage en mode "partagé" : elles sont visibles par
   toute personne qui ouvre cette application (nécessaire pour
   que l'enseignant voie les fiches de tous les élèves).
   ========================================================= */

/* ---------- Référentiel des 7 compétences ---------- */
const COMPETENCES = [
  { id:1, nom:"Assurer en moulinette (5 temps)", max:4,
    desc:"Niveau = nombre de critères validés parmi les 4 suivants : tirer sur la corde qui vient du haut (1er temps) ; temps 2 et 3 rapides ; ne jamais lâcher le brin de vie et faire descendre une main après l'autre ; corde souple, non sèche.",
    niveaux:{1:"1 critère validé",2:"2 critères validés",3:"3 critères validés",4:"4 critères validés"} },
  { id:2, nom:"Assurer en tête", max:4,
    desc:"Référentiel bac, AFL3.",
    niveaux:{
      1:"Assurage peu sécurisé, contre-assureur nécessaire. Assure autocentré.",
      2:"Assurage sécurisé avec remarques ou aides nécessaires. Assure en retard.",
      3:"Assurage sécurisé, prise de responsabilité auprès d'autres élèves. Assure en anticipant, dans le temps du grimpeur.",
      4:"Assurage sécurisé, prise de responsabilité auprès d'autres élèves. Assure en anticipant, y compris pour gérer une chute en tête sans contre-assureur." } },
  { id:3, nom:"Clipage", max:4,
    desc:"3 paramètres évalués : position stable, vitesse de clipage, hauteur de clipage (entre le bassin et les yeux du grimpeur).",
    niveaux:{1:"0 paramètre maîtrisé",2:"1 paramètre maîtrisé",3:"2 paramètres maîtrisés",4:"3 paramètres maîtrisés"} },
  { id:4, nom:"S'entraîner sérieusement", max:4,
    desc:"Référentiel bac, AFL2 — nombre de voies tentées par séance.",
    niveaux:{1:"2 voies tentées ou moins",2:"3 voies tentées",3:"4 voies tentées",4:"Plus de 4 voies tentées"} },
  { id:5, nom:"Pose des pieds", max:4,
    desc:"",
    niveaux:{
      1:"Pose sans regarder, pose « canard ».",
      2:"Repositionnement systématique après la pose du pied.",
      3:"Pose sur le premier tiers du pied, non anticipée (un pied dans le vide avant, sans raison d'équilibre).",
      4:"Pose sur le premier tiers du pied, anticipée : pied posé sans repositionnement, pas de pied dans le vide." } },
  { id:6, nom:"Communication de la cordée", max:3,
    desc:"Pas de niveau 4 pour cette compétence.",
    niveaux:{
      1:"Pas de communication audible, ou vocabulaire imprécis.",
      2:"Communication uniquement à l'arrivée ou en cas de difficulté (« sec »).",
      3:"« Parti » et attente de la réponse au départ ; « sec » et attente de la réponse en haut." } },
  { id:7, nom:"Chuter", max:4,
    desc:"",
    niveaux:{
      1:"Se lâcher sans prévenir, en moulinette.",
      2:"En moulinette, engager un mouvement vers le haut puis chuter.",
      3:"Chute en tête, au niveau de la dégaine.",
      4:"Chute en tête, une dégaine au-dessus du dernier point clippé." } }
];
const NB_SEANCES = 9;
const GRADES_MOULINETTE = ["4b","4c","5a","5b","5c","6a","6b"];

/* ---------- Icône (grimpeur sur montagne, fond vert) ----------
   Encodée directement en base64 pour n'avoir aucun fichier
   externe à gérer (utile pour un dépôt GitHub minimal) : elle
   sert à la fois au favicon (voir index.html), au manifest.json,
   et à l'icône affichée dans le bandeau ci-dessous. */
const ICON_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIyMiIgZmlsbD0iIzFGNkI0QSIvPgo8cGF0aCBkPSJNOCA3NiBMMzQgMzggTDQ3IDU2IEw1OSAyOCBMOTMgNzYgWiIgZmlsbD0iI0YzRjhGNCIvPgo8cGF0aCBkPSJNMzQgMzggTDQ3IDU2IEw0MSA1NiBMMzEgNDQgWiIgZmlsbD0iIzE1M0YyRCIgb3BhY2l0eT0iMC40Ii8+CjxjaXJjbGUgY3g9IjY2IiBjeT0iNDIiIHI9IjQuMyIgZmlsbD0iI0YzRjhGNCIvPgo8cGF0aCBkPSJNNjYgNDYuNSBMNjIuNSA1OCBNNjYgNDYuNSBMNzIuNSA1NSBNNjYgNDkgTDU5LjUgNTIuNSBNNjYgNDkgTDc0IDQ0LjUiIHN0cm9rZT0iI0YzRjhGNCIgc3Ryb2tlLXdpZHRoPSIzLjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
function setIcons(){
  document.getElementById('topbarIcon').src = ICON_DATA_URI;
}

/* ---------- Configuration Google Sheets (à renseigner une fois) ----------
   Pour que les élèves remplissent depuis leur téléphone personnel et
   que l'enseignant·e voie tout au même endroit, l'application peut se
   connecter à une feuille Google Sheets via un petit script Google
   (voir le fichier INSTALLATION.md fourni avec l'application).
   Une fois votre script Google déployé, collez son URL ci-dessous
   entre les guillemets. Tant que c'est vide, l'application utilise un
   stockage de repli (voir plus bas).                                  */
const SHEETS_API_URL = ""; // ex: "https://script.google.com/macros/s/XXXXXXXX/exec"

/* ---------- Stockage (partagé entre enseignant et élèves) ----------
   Trois niveaux, du meilleur au plus limité :
   1) Google Sheets (SHEETS_API_URL renseignée) : synchronisation
      réelle entre tous les appareils (élèves sur leur téléphone,
      enseignant·e sur son ordinateur) — c'est la solution à utiliser
      pour un usage réel en classe avec des téléphones personnels.
   2) window.storage (stockage partagé Claude), disponible seulement
      si l'application est ouverte comme document/artefact Claude.
   3) localStorage du navigateur : propre à chaque appareil, aucune
      synchronisation — utilisé seulement si rien d'autre n'est
      disponible (mode dégradé, avec avertissement à l'écran).       */
const useSheets = !!SHEETS_API_URL;
const hasCloudStorage = (typeof window !== 'undefined' && !!window.storage);
const isSynced = useSheets || hasCloudStorage;

async function sheetsGet(key){
  try{
    const res = await fetch(`${SHEETS_API_URL}?action=get&key=${encodeURIComponent(key)}`);
    const data = await res.json();
    return data.value != null ? data.value : null;
  }catch(e){ return null; }
}
async function sheetsSet(key, value){
  try{
    await fetch(SHEETS_API_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'set', key, value})
    });
    return true;
  }catch(e){ return false; }
}
async function sheetsDelete(key){
  try{
    await fetch(SHEETS_API_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'delete', key})
    });
  }catch(e){ /* ignoré */ }
}

const Store = {
  async getRoster(){
    if(useSheets){ const v = await sheetsGet('roster'); return v ? JSON.parse(v) : []; }
    if(hasCloudStorage){
      try{ const r = await window.storage.get('roster', true); return r ? JSON.parse(r.value) : []; }
      catch(e){ return []; }
    }
    try{ return JSON.parse(localStorage.getItem('vl_roster')||'[]'); }catch(e){ return []; }
  },
  async saveRoster(list){
    if(useSheets){ return sheetsSet('roster', JSON.stringify(list)); }
    if(hasCloudStorage){
      try{ await window.storage.set('roster', JSON.stringify(list), true); return true; }
      catch(e){ return false; }
    }
    try{ localStorage.setItem('vl_roster', JSON.stringify(list)); return true; }catch(e){ return false; }
  },
  async getEleve(id){
    if(useSheets){ const v = await sheetsGet('eleve_'+id); return v ? JSON.parse(v) : null; }
    if(hasCloudStorage){
      try{ const r = await window.storage.get('eleve_'+id, true); return r ? JSON.parse(r.value) : null; }
      catch(e){ return null; }
    }
    try{ const raw = localStorage.getItem('vl_eleve_'+id); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
  },
  async saveEleve(id, data){
    if(useSheets){ return sheetsSet('eleve_'+id, JSON.stringify(data)); }
    if(hasCloudStorage){
      try{ await window.storage.set('eleve_'+id, JSON.stringify(data), true); return true; }
      catch(e){ return false; }
    }
    try{ localStorage.setItem('vl_eleve_'+id, JSON.stringify(data)); return true; }catch(e){ return false; }
  },
  async deleteEleve(id){
    if(useSheets){ return sheetsDelete('eleve_'+id); }
    if(hasCloudStorage){
      try{ await window.storage.delete('eleve_'+id, true); }catch(e){ /* clé déjà absente */ }
      return;
    }
    try{ localStorage.removeItem('vl_eleve_'+id); }catch(e){}
  },
  async getPin(){
    if(useSheets){ return sheetsGet('teacher_pin'); }
    if(hasCloudStorage){
      try{ const r = await window.storage.get('teacher_pin', true); return r ? r.value : null; }
      catch(e){ return null; }
    }
    try{ return localStorage.getItem('vl_pin') || null; }catch(e){ return null; }
  },
  async savePin(pin){
    if(useSheets){ return sheetsSet('teacher_pin', pin); }
    if(hasCloudStorage){
      try{ await window.storage.set('teacher_pin', pin, true); return true; }
      catch(e){ return false; }
    }
    try{ localStorage.setItem('vl_pin', pin); return true; }catch(e){ return false; }
  }
};

/* ---------- Utilitaires ---------- */
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function uid(){ return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function initials(name){
  return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
}
function emptySeance(){
  return { competences:{}, moulinette:"", projet:"", niveauVise:"", rempli:false, maj:null };
}
function emptyEleve(nom){
  const seances = {};
  for(let i=1;i<=NB_SEANCES;i++) seances[i] = emptySeance();
  return { nom, seances };
}
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ---------- État global de navigation (SPA, aucun rechargement) ---------- */
const state = {
  view: 'home',            // home | eleve-select | eleve-home | eleve-seance | teacher-gate | teacher-pin-setup | teacher-dashboard | teacher-eleve
  eleveId: null,
  seanceNum: null,
  isTeacher: false,
  roster: [],
  eleveData: null,
  draft: null,             // brouillon de séance en cours d'édition
  dirty: false
};

function go(view, extra){
  Object.assign(state, {view}, extra||{});
  render();
  window.scrollTo(0,0);
}

/* Empêche toute navigation qui rechargerait la page */
window.addEventListener('beforeunload', function(e){
  if(state.dirty){
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});
document.addEventListener('submit', e=>e.preventDefault());

/* ---------- Rendu du bandeau supérieur (bouton contextuel) ---------- */
function renderTopbar(){
  const sub = document.getElementById('topbarSub');
  const btn = document.getElementById('topbarBtn');
  if(state.view==='home'){
    sub.textContent = 'Suivi individuel — escalade';
    btn.style.display = 'none';
  } else {
    sub.textContent = state.isTeacher ? 'Espace enseignant' : (state.eleveData ? state.eleveData.nom : 'Espace élève');
    btn.style.display = 'flex';
    btn.textContent = '⟲ Accueil';
    btn.onclick = ()=>{ if(confirmLeaveIfDirty()) go('home', {eleveId:null, seanceNum:null, isTeacher:false, eleveData:null, draft:null, dirty:false}); };
  }
}
function confirmLeaveIfDirty(){
  if(state.dirty){ return confirm("Des modifications de cette séance n'ont pas été enregistrées. Quitter quand même ?"); }
  return true;
}

/* ---------- Vue : Accueil ---------- */
function viewHome(){
  return `
  ${!isSynced ? `
  <div class="card" style="border-color:var(--lvl1);background:var(--lvl1-tint);">
    <p class="muted" style="color:var(--lvl1-ink);"><b>⚠️ Synchronisation non configurée.</b> Sans connexion à une feuille Google Sheets (ou sans ouverture comme document Claude), chaque appareil garde ses données en local : l'enseignant·e ne verra ici que les fiches remplies sur ce même navigateur. Pour un vrai suivi multi-élèves multi-appareils, suivez le guide INSTALLATION.md fourni avec l'application.</p>
  </div>` : ''}
  <div class="card" style="text-align:center;">
    <p class="eyebrow">Bienvenue</p>
    <h1 class="title-lg">Qui se connecte ?</h1>
    <p class="muted">Choisis ton profil pour accéder à ton suivi de séances.</p>
  </div>
  <div class="role-grid">
    <div class="role-card" onclick="onChooseRole('eleve')">
      <span class="emoji">🧗</span>
      <span class="lbl">Je suis élève</span>
    </div>
    <div class="role-card" onclick="onChooseRole('enseignant')">
      <span class="emoji">🗂️</span>
      <span class="lbl">Je suis enseignant·e</span>
    </div>
  </div>`;
}
async function onChooseRole(role){
  state.roster = await Store.getRoster();
  if(role==='eleve') go('eleve-select');
  else {
    const pin = await Store.getPin();
    if(!pin) go('teacher-pin-setup');
    else go('teacher-gate');
  }
}

/* ---------- Vue : sélection élève ---------- */
function viewEleveSelect(){
  const items = state.roster.map(e=>`
    <div class="list-item" onclick="onOpenEleve('${e.id}')">
      <div class="avatar">${esc(initials(e.nom))}</div>
      <div class="li-main">
        <div class="li-name">${esc(e.nom)}</div>
        <div class="li-sub">Toucher pour ouvrir mon suivi</div>
      </div>
      <div class="chevron">›</div>
    </div>`).join('');
  return `
  <div class="card">
    <p class="eyebrow">Espace élève</p>
    <h1 class="title-lg">Trouve ton nom</h1>
    ${state.roster.length ? `<div style="margin-top:8px;">${items}</div>` :
      `<div class="empty-state"><span class="emoji">🙈</span>Aucun élève n'a encore été ajouté.<br>Demande à ton enseignant·e de t'ajouter.</div>`}
  </div>`;
}
async function onOpenEleve(id){
  const found = state.roster.find(e=>e.id===id);
  if(!found) return;
  let data = await Store.getEleve(id);
  if(!data) data = emptyEleve(found.nom);
  go('eleve-home', {eleveId:id, eleveData:data});
}

/* ---------- Vue : accueil élève (grille des séances) ---------- */
function viewEleveHome(){
  const d = state.eleveData;
  const tiles = [];
  for(let i=1;i<=NB_SEANCES;i++){
    const s = d.seances[i];
    tiles.push(`<div class="seance-tile ${s.rempli?'done':''}" onclick="onOpenSeance(${i})">
      <div class="s-num">${i}</div>
      <div class="s-lbl">Séance</div>
      ${s.rempli?'<div class="s-dot"></div>':''}
    </div>`);
  }
  const dernier = lastFilledSeance(d);
  return `
  <div class="card">
    <p class="eyebrow">${esc(d.nom)}</p>
    <h1 class="title-lg">Mes 9 séances</h1>
    <p class="muted">Touche une séance pour la remplir ou la modifier. Un point vert indique une séance déjà renseignée.</p>
    <div class="seance-grid">${tiles.join('')}</div>
  </div>
  ${dernier ? `
  <div class="card">
    <p class="eyebrow">Dernier bilan (séance ${dernier.num})</p>
    <div class="muted" style="margin-bottom:8px;"><b style="color:var(--ink);">Projet pour la suite :</b> ${esc(dernier.s.projet)||'—'}</div>
    <div class="muted"><b style="color:var(--ink);">Niveau de grimpe visé :</b> ${esc(dernier.s.niveauVise)||'—'}</div>
  </div>` : ''}
  <div class="card">
    <button class="btn btn-ghost" onclick="onToggleReferentiel()">📖 Voir le référentiel des 7 compétences</button>
    <div id="referentielBox" style="display:none;margin-top:14px;">${renderReferentiel()}</div>
  </div>`;
}
function lastFilledSeance(d){
  for(let i=NB_SEANCES;i>=1;i--){ if(d.seances[i].rempli) return {num:i, s:d.seances[i]}; }
  return null;
}
function onToggleReferentiel(){
  const box = document.getElementById('referentielBox');
  box.style.display = box.style.display==='none' ? 'block' : 'none';
}
function renderReferentiel(){
  return COMPETENCES.map(c=>`
    <div class="competence-row">
      <div class="comp-num">${c.id}</div>
      <div class="comp-body">
        <div class="comp-name">${esc(c.nom)}</div>
        ${c.desc?`<div class="muted" style="margin-top:2px;">${esc(c.desc)}</div>`:''}
        <div style="margin-top:6px;">
          ${Object.entries(c.niveaux).map(([lvl,txt])=>`
            <div class="info-panel open" style="margin-top:6px;">
              <span class="tag-lvl" data-lvl="${lvl}"><span class="dot"></span>Niveau ${lvl}</span>
              <div class="niv-line">${esc(txt)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`).join('');
}
function onOpenSeance(num){
  const existing = state.eleveData.seances[num];
  state.draft = JSON.parse(JSON.stringify(existing));
  if(!state.draft.projet && !state.draft.rempli){
    // pré-remplissage du projet à partir de la séance précédente
    const prev = num>1 ? state.eleveData.seances[num-1] : null;
    if(prev && prev.projet) state.draft.projet = prev.projet;
  }
  state.dirty = false;
  go('eleve-seance', {seanceNum:num});
}

/* ---------- Vue : formulaire d'une séance ---------- */
function viewEleveSeance(){
  const num = state.seanceNum;
  const d = state.draft;
  const compRows = COMPETENCES.map(c=>{
    const cur = d.competences[c.id] || null;
    const btns = [];
    for(let l=1; l<=c.max; l++){
      btns.push(`<button type="button" class="level-btn" data-lvl="${l}" onclick="onSetNiveau(${c.id},${l})">
        <span class="num">${l}</span>
      </button>`);
    }
    return `
    <div class="competence-row" style="display:block;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div class="comp-num">${c.id}</div>
        <div class="comp-name" style="flex:1;">${esc(c.nom)}</div>
        <button type="button" class="info-toggle" onclick="onToggleInfo(${c.id})">ⓘ détail</button>
      </div>
      <div class="info-panel" id="info-${c.id}">
        ${c.desc?`<div style="margin-bottom:6px;">${esc(c.desc)}</div>`:''}
        ${Object.entries(c.niveaux).map(([lvl,txt])=>`<div class="niv-line"><b>Niv. ${lvl} :</b> ${esc(txt)}</div>`).join('')}
      </div>
      <div class="level-picker" data-count="${c.max}">${btns.join('')}</div>
    </div>`;
  }).join('');

  // recolorer les boutons actifs après génération (fait via post-render dans applyActiveStates)

  return `
  <div class="card">
    <p class="eyebrow">${esc(state.eleveData.nom)} · Séance ${num} / ${NB_SEANCES}</p>
    <h1 class="title-lg">Bilan de séance</h1>
    <p class="muted">Choisis ton niveau pour chacune des 7 compétences.</p>
  </div>
  <div class="card">${compRows}</div>
  <div class="card">
    <div class="field">
      <label class="field-label">Niveau max en moulinette (aujourd'hui)</label>
      <select id="fld-moulinette" onchange="onDraftField('moulinette', this.value)">
        <option value="">— Sélectionner —</option>
        ${GRADES_MOULINETTE.map(g=>`<option value="${g}" ${d.moulinette===g?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label class="field-label">Projet de compétence pour la séance suivante</label>
      <textarea id="fld-projet" placeholder="Ex. : améliorer le clipage au-dessus de la tête…" oninput="onDraftField('projet', this.value)">${esc(d.projet)}</textarea>
    </div>
    <div class="field" style="margin-bottom:4px;">
      <label class="field-label">Niveau de grimpe visé</label>
      <input type="text" id="fld-vise" placeholder="Ex. : 5c en tête" value="${esc(d.niveauVise)}" oninput="onDraftField('niveauVise', this.value)">
    </div>
  </div>
  <div class="btn-row" style="margin-top:4px;">
    <button class="btn btn-ghost" onclick="onCancelSeance()">Annuler</button>
    <button class="btn btn-primary" onclick="onSaveSeance()">Enregistrer</button>
  </div>`;
}
function onToggleInfo(id){
  const el = document.getElementById('info-'+id);
  el.classList.toggle('open');
}
function onSetNiveau(compId, lvl){
  state.draft.competences[compId] = lvl;
  state.dirty = true;
  applyActiveLevelStates();
}
function applyActiveLevelStates(){
  document.querySelectorAll('.level-btn').forEach(btn=>btn.classList.remove('active'));
  COMPETENCES.forEach(c=>{
    const cur = state.draft.competences[c.id];
    if(cur){
      const rows = document.querySelectorAll('.competence-row');
      rows.forEach(row=>{
        const numEl = row.querySelector('.comp-num');
        if(numEl && numEl.textContent==String(c.id)){
          const btn = row.querySelector(`.level-btn[data-lvl="${cur}"]`);
          if(btn) btn.classList.add('active');
        }
      });
    }
  });
}
function onDraftField(field, val){
  state.draft[field] = val;
  state.dirty = true;
}
function onCancelSeance(){
  if(!confirmLeaveIfDirty()) return;
  state.dirty = false;
  go('eleve-home');
}
async function onSaveSeance(){
  const d = state.draft;
  const nbCompletees = COMPETENCES.filter(c=>d.competences[c.id]).length;
  if(nbCompletees < COMPETENCES.length){
    if(!confirm(`Seulement ${nbCompletees} / 7 compétences renseignées. Enregistrer quand même ?`)) return;
  }
  d.rempli = nbCompletees > 0;
  d.maj = new Date().toISOString();
  state.eleveData.seances[state.seanceNum] = d;
  const ok = await Store.saveEleve(state.eleveId, state.eleveData);
  state.dirty = false;
  if(ok) showToast('Séance enregistrée ✓');
  else showToast("Échec de l'enregistrement — réessaie");
  go('eleve-home');
}

/* ---------- Espace enseignant : PIN ---------- */
let pinBuffer = '';
function viewTeacherPinSetup(){
  pinBuffer = '';
  return `
  <div class="card" style="text-align:center;">
    <p class="eyebrow">Première connexion</p>
    <h1 class="title-lg">Crée ton code enseignant</h1>
    <p class="muted">Ce code à 4 chiffres protège l'ajout/la suppression d'élèves. Choisis-en un facile à retenir — il n'est pas envoyé ni stocké ailleurs que dans cette application.</p>
    <div class="pin-dots" id="pinDots">${pinDotsHtml(0)}</div>
    ${keypadHtml('onPinSetupKey')}
  </div>`;
}
function pinDotsHtml(n){
  let h=''; for(let i=0;i<4;i++) h+=`<div class="dot ${i<n?'filled':''}"></div>`; return h;
}
function keypadHtml(handler){
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return `<div class="keypad">${keys.map(k=>k===''?'<div></div>':`<button type="button" onclick="${handler}('${k}')">${k}</button>`).join('')}</div>`;
}
let pinSetupFirst = null;
function onPinSetupKey(k){
  if(k==='⌫'){ pinBuffer = pinBuffer.slice(0,-1); }
  else if(pinBuffer.length<4){ pinBuffer += k; }
  document.getElementById('pinDots').innerHTML = pinDotsHtml(pinBuffer.length);
  if(pinBuffer.length===4){
    if(pinSetupFirst===null){
      pinSetupFirst = pinBuffer;
      pinBuffer='';
      setTimeout(()=>{
        document.getElementById('pinDots').innerHTML = pinDotsHtml(0);
        document.querySelector('main .muted').textContent = 'Confirme ton code.';
      },150);
    } else {
      if(pinBuffer===pinSetupFirst){
        Store.savePin(pinBuffer).then(()=>{ pinSetupFirst=null; onTeacherAuthed(); });
      } else {
        showToast('Les deux codes ne correspondent pas — recommence');
        pinSetupFirst = null; pinBuffer='';
        setTimeout(()=>go('teacher-pin-setup'),400);
      }
    }
  }
}
function viewTeacherGate(){
  pinBuffer='';
  return `
  <div class="card" style="text-align:center;">
    <p class="eyebrow">Espace enseignant</p>
    <h1 class="title-lg">Code d'accès</h1>
    <div class="pin-dots" id="pinDots">${pinDotsHtml(0)}</div>
    ${keypadHtml('onGateKey')}
    <button class="link-btn" style="margin-top:16px;" onclick="onForgotPin()">Code oublié ?</button>
  </div>`;
}
async function onGateKey(k){
  if(k==='⌫'){ pinBuffer = pinBuffer.slice(0,-1); }
  else if(pinBuffer.length<4){ pinBuffer += k; }
  document.getElementById('pinDots').innerHTML = pinDotsHtml(pinBuffer.length);
  if(pinBuffer.length===4){
    const real = await Store.getPin();
    if(pinBuffer===real){ onTeacherAuthed(); }
    else { showToast('Code incorrect'); pinBuffer=''; setTimeout(()=>{document.getElementById('pinDots').innerHTML = pinDotsHtml(0);},300); }
  }
}
function onForgotPin(){
  if(confirm("Réinitialiser le code enseignant ? Un nouveau code sera à créer maintenant.")){
    Store.savePin('').then(()=>go('teacher-pin-setup'));
  }
}
async function onTeacherAuthed(){
  state.isTeacher = true;
  state.roster = await Store.getRoster();
  go('teacher-dashboard');
}

/* ---------- Espace enseignant : tableau de bord ---------- */
function viewTeacherDashboard(){
  const items = state.roster.map(e=>`
    <div class="list-item" onclick="onTeacherOpenEleve('${e.id}')">
      <div class="avatar">${esc(initials(e.nom))}</div>
      <div class="li-main">
        <div class="li-name">${esc(e.nom)}</div>
        <div class="li-sub">Voir les 9 séances</div>
      </div>
      <button class="btn btn-danger-ghost btn-sm" onclick="event.stopPropagation();onDeleteEleve('${e.id}','${esc(e.nom)}')">Supprimer</button>
    </div>`).join('');
  return `
  <div class="card">
    <p class="eyebrow">Espace enseignant</p>
    <h1 class="title-lg">Mes élèves</h1>
    <p class="muted">${state.roster.length} élève(s) enregistré(s). Cette liste et les fiches sont visibles par toute personne ouvrant cette application.</p>
  </div>
  <div class="card">
    <div class="field" style="margin-bottom:10px;">
      <label class="field-label">Ajouter un élève</label>
      <div style="display:flex;gap:8px;">
        <input type="text" id="newEleveName" placeholder="Prénom Nom">
        <button class="btn btn-primary btn-sm" onclick="onAddEleve()">Ajouter</button>
      </div>
    </div>
  </div>
  <div class="card">
    ${state.roster.length ? items : `<div class="empty-state"><span class="emoji">🧗‍♀️</span>Aucun élève pour l'instant. Ajoute le premier ci-dessus.</div>`}
  </div>
  <div class="card">
    <button class="btn btn-ghost" onclick="onChangePin()">🔒 Modifier le code enseignant</button>
  </div>`;
}
async function onAddEleve(){
  const input = document.getElementById('newEleveName');
  const nom = input.value.trim();
  if(!nom){ showToast('Indique un prénom et un nom'); return; }
  const id = uid();
  state.roster.push({id, nom});
  await Store.saveRoster(state.roster);
  await Store.saveEleve(id, emptyEleve(nom));
  input.value='';
  showToast('Élève ajouté ✓');
  go('teacher-dashboard');
}
async function onDeleteEleve(id, nom){
  if(!confirm(`Supprimer ${nom} et toutes ses données de suivi ? Cette action est définitive (droit à l'effacement RGPD).`)) return;
  state.roster = state.roster.filter(e=>e.id!==id);
  await Store.saveRoster(state.roster);
  await Store.deleteEleve(id);
  showToast('Élève supprimé');
  go('teacher-dashboard');
}
function onChangePin(){
  Store.savePin('').then(()=>go('teacher-pin-setup'));
}
async function onTeacherOpenEleve(id){
  const found = state.roster.find(e=>e.id===id);
  if(!found) return;
  let data = await Store.getEleve(id);
  if(!data) data = emptyEleve(found.nom);
  go('teacher-eleve', {eleveId:id, eleveData:data});
}

/* ---------- Espace enseignant : détail d'un élève (toutes les séances) ---------- */
function viewTeacherEleve(){
  const d = state.eleveData;
  const rows = COMPETENCES.map(c=>{
    const cells = [];
    for(let i=1;i<=NB_SEANCES;i++){
      const lvl = d.seances[i].competences[c.id];
      cells.push(`<td>${lvl?`<span class="badge" data-lvl="${lvl}">${lvl}</span>`:`<span class="badge badge-empty">·</span>`}</td>`);
    }
    return `<tr><td>${c.id}. ${esc(c.nom)}</td>${cells.join('')}</tr>`;
  }).join('');
  const moulHead = [];
  for(let i=1;i<=NB_SEANCES;i++){
    const s = d.seances[i];
    moulHead.push(`<td>${esc(s.moulinette)||'—'}</td>`);
  }
  const seanceDetails = [];
  for(let i=1;i<=NB_SEANCES;i++){
    const s = d.seances[i];
    if(s.rempli){
      seanceDetails.push(`
      <div class="card" style="margin-top:10px;">
        <p class="eyebrow">Séance ${i}</p>
        <div class="muted"><b style="color:var(--ink);">Projet suivant :</b> ${esc(s.projet)||'—'}</div>
        <div class="muted" style="margin-top:4px;"><b style="color:var(--ink);">Niveau visé :</b> ${esc(s.niveauVise)||'—'}</div>
      </div>`);
    }
  }
  return `
  <div class="card">
    <p class="eyebrow">Fiche élève</p>
    <h1 class="title-lg">${esc(d.nom)}</h1>
    <p class="muted">Vue d'ensemble des 9 séances — chaque pastille indique le niveau atteint (1 à 4) pour la compétence.</p>
    <div class="legend">
      ${[1,2,3,4].map(l=>`<span class="tag-lvl" data-lvl="${l}"><span class="dot"></span>${l}</span>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="mini-table-wrap">
      <table class="mini-table">
        <thead><tr><th>Compétence</th>${Array.from({length:NB_SEANCES},(_,i)=>`<th>S${i+1}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows}
          <tr><td>Moulinette max</td>${moulHead.join('')}</tr>
        </tbody>
      </table>
    </div>
  </div>
  ${seanceDetails.length ? seanceDetails.join('') : `<div class="card"><div class="empty-state"><span class="emoji">📋</span>Aucune séance renseignée pour l'instant.</div></div>`}
  `;
}

/* ---------- Rendu principal ---------- */
function render(){
  const app = document.getElementById('app');
  let html = '';
  switch(state.view){
    case 'home': html = viewHome(); break;
    case 'eleve-select': html = viewEleveSelect(); break;
    case 'eleve-home': html = viewEleveHome(); break;
    case 'eleve-seance': html = viewEleveSeance(); break;
    case 'teacher-pin-setup': html = viewTeacherPinSetup(); break;
    case 'teacher-gate': html = viewTeacherGate(); break;
    case 'teacher-dashboard': html = viewTeacherDashboard(); break;
    case 'teacher-eleve': html = viewTeacherEleve(); break;
    default: html = viewHome();
  }
  app.innerHTML = html;
  renderTopbar();
  if(state.view==='eleve-seance') applyActiveLevelStates();
}

/* ---------- Modale RGPD ---------- */
document.getElementById('rgpdLink').addEventListener('click', ()=>{
  const root = document.getElementById('modalRoot');
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) this.remove();">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="title-md">Confidentialité &amp; RGPD</h2>
      <p class="muted" style="margin-top:10px;"><b style="color:var(--ink);">Données collectées :</b> nom de l'élève, auto-évaluations de niveau (1 à 4) sur 7 compétences, niveau de grimpe en moulinette, projet de progression et niveau visé. Aucune donnée sensible (santé, origine, etc.) n'est demandée.</p>
      <p class="muted" style="margin-top:10px;"><b style="color:var(--ink);">Responsable du traitement :</b> l'enseignant·e qui utilise cette application dans le cadre du cours d'EPS.</p>
      <p class="muted" style="margin-top:10px;"><b style="color:var(--ink);">Stockage :</b> ${isSynced ? "les données sont conservées uniquement dans le stockage relié à cette application (votre feuille Google Sheets, ou le stockage propre à Claude selon l'installation) — aucun envoi à un service tiers publicitaire, aucun cookie de suivi." : "aucune synchronisation n'a été configurée sur cet hébergement : les données restent enregistrées localement, dans ce seul navigateur, et ne sont donc pas partagées entre les appareils des élèves et celui de l'enseignant·e (voir l'avertissement en haut de l'accueil et le guide INSTALLATION.md)."}</p>
      <p class="muted" style="margin-top:10px;"><b style="color:var(--ink);">Partage :</b> la liste des élèves et leurs fiches sont visibles par toute personne accédant à cette application — à réserver à un usage en classe, sur un lien non diffusé publiquement.</p>
      <p class="muted" style="margin-top:10px;"><b style="color:var(--ink);">Droit d'accès et de suppression :</b> l'enseignant·e peut supprimer un élève et l'intégralité de ses données à tout moment depuis le tableau de bord (bouton « Supprimer »), sans possibilité de récupération ultérieure.</p>
      <p class="muted" style="margin-top:10px;"><b style="color:var(--ink);">Conservation :</b> il est recommandé de supprimer les fiches à la fin de l'année scolaire.</p>
      <button class="btn btn-primary" style="margin-top:16px;" onclick="document.getElementById('modalRoot').innerHTML=''">Fermer</button>
    </div>
  </div>`;
});

/* ---------- Démarrage ---------- */
setIcons();
render();
