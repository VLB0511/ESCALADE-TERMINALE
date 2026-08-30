'use strict';

    const APP_KEY = 'andera-escalade-suivi-terminal-v1';
    const ROUTE_LEVELS = ['4b', '4c', '5a', '5b', '5c', '6a', '6b'];
    const SESSION_COUNT = 9;
    const CLIP_PARAMETERS = [
      'Position stable',
      'Vitesse de clipage',
      'Hauteur de clipage entre le bassin et les yeux du grimpeur'
    ];
    const MOULINETTE_PARAMETERS = [
      'Premier temps : tirer sur la corde qui vient du haut',
      'Temps 2 et 3 rapides',
      'Ne jamais lâcher le brin de vie et faire descendre une main après l’autre',
      'Corde souple, non sèche'
    ];
    const COMPETENCIES = [
      {
        id: 1,
        title: 'Assurer en moulinette en 5 temps',
        short: 'Assurer en moulinette',
        levels: [
          '1 critère validé',
          '2 critères validés',
          '3 critères validés',
          '4 critères validés'
        ]
      },
      {
        id: 2,
        title: 'Assurer en tête',
        short: 'Assurer en tête',
        levels: [
          'Assurage peu sécurisé, contre-assureur nécessaire',
          'Assurage sécurisé avec remarques ou aides nécessaires',
          'Assurage sécurisé, anticipé et responsabilisé',
          'Assurage sécurisé, anticipé, y compris pour gérer une chute en tête sans contre-assureur'
        ]
      },
      {
        id: 3,
        title: 'Le clipage',
        short: 'Clipage',
        levels: [
          '0 paramètre maîtrisé',
          '1 paramètre maîtrisé',
          '2 paramètres maîtrisés',
          '3 paramètres maîtrisés'
        ]
      },
      {
        id: 4,
        title: "S'entraîner sérieusement",
        short: "S'entraîner sérieusement",
        levels: [
          '2 voies tentées ou moins par séance',
          '3 voies tentées par séance',
          '4 voies tentées par séance',
          'Plus de 4 voies tentées par séance'
        ]
      },
      {
        id: 5,
        title: 'Pose des pieds',
        short: 'Pose des pieds',
        levels: [
          'Pose sans regarder, pose « canard »',
          'Repositionnement systématique après la pose du pied',
          'Pose sur le premier tiers du pied, non anticipée',
          'Pose sur le premier tiers du pied, anticipée, sans repositionnement'
        ]
      },
      {
        id: 6,
        title: 'Communication de la cordée',
        short: 'Communication',
        levels: [
          'Pas de communication audible, ou vocabulaire imprécis',
          'Communication uniquement à l’arrivée ou en cas de difficulté',
          'Communication attendue au départ et en haut',
          'Non utilisé pour cette compétence'
        ],
        maxLevel: 3
      },
      {
        id: 7,
        title: 'Chuter',
        short: 'Chuter',
        levels: [
          'Se lâcher sans prévenir, en moulinette',
          'En moulinette, engager un mouvement vers le haut puis chuter',
          'Chute en tête au niveau de la dégaine',
          'Chute en tête, une dégaine au-dessus du dernier point clippé'
        ]
      }
    ];

    let state = loadState();
    let session = { role: null, studentId: null, teacherStudentId: null, sessionIndex: 0, summary: false };
    let refreshWarningEnabled = false;

    function freshSession() {
      return {
        competencies: Array(7).fill(null),
        moulinetteParams: [false, false, false, false],
        moulinetteParamsTouched: false,
        clipParams: [false, false, false],
        clipParamsTouched: false,
        maxRoute: '',
        projectCompetency: '',
        targetRoute: '',
        teacherComment: '',
        savedAt: '',
        submitted: false
      };
    }

    function freshStudent(name, className, pinHash) {
      return {
        id: window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now() + Math.random()),
        name: name.trim(),
        className: className.trim(),
        pinHash,
        sessions: Array.from({ length: SESSION_COUNT }, freshSession)
      };
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(APP_KEY);
        if (!raw) return { teacherPinHash: '', students: [], createdAt: new Date().toISOString() };
        const parsed = JSON.parse(raw);
        parsed.students = Array.isArray(parsed.students) ? parsed.students : [];
        parsed.students.forEach(student => {
          student.sessions = Array.isArray(student.sessions) ? student.sessions : [];
          while (student.sessions.length < SESSION_COUNT) student.sessions.push(freshSession());
          student.sessions = student.sessions.slice(0, SESSION_COUNT);
          student.sessions.forEach(item => {
            item.competencies = Array.isArray(item.competencies) ? item.competencies.slice(0, 7) : Array(7).fill(null);
            while (item.competencies.length < 7) item.competencies.push(null);
            item.moulinetteParams = Array.isArray(item.moulinetteParams) ? item.moulinetteParams.slice(0, 4).map(Boolean) : [false, false, false, false];
            while (item.moulinetteParams.length < 4) item.moulinetteParams.push(false);
            item.moulinetteParamsTouched = Boolean(item.moulinetteParamsTouched);
            item.clipParams = Array.isArray(item.clipParams) ? item.clipParams.slice(0, 3).map(Boolean) : [false, false, false];
            while (item.clipParams.length < 3) item.clipParams.push(false);
            item.clipParamsTouched = Boolean(item.clipParamsTouched);
            item.submitted = Boolean(item.submitted);
          });
        });
        return parsed;
      } catch (error) {
        return { teacherPinHash: '', students: [], createdAt: new Date().toISOString() };
      }
    }

    function persist() {
      localStorage.setItem(APP_KEY, JSON.stringify(state));
    }

    async function hashPin(pin) {
      const bytes = new TextEncoder().encode(pin);
      if (window.crypto?.subtle) {
        const digest = await window.crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
      }
      // Repli local pour les navigateurs anciens ou certains contextes file://.
      let hash = 2166136261;
      for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, 16777619);
      }
      return `fallback-${(hash >>> 0).toString(16)}`;
    }

    function esc(value) {
      return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    function sessionLabel(index) { return `Séance ${index + 1}`; }
    function currentStudent() { return state.students.find(student => student.id === (session.role === 'student' ? session.studentId : session.teacherStudentId)); }
    function currentSessionData() {
      const student = currentStudent();
      return student ? student.sessions[session.sessionIndex] : null;
    }

    const CHART_COLORS = ['#0b5ea8', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#16a34a', '#db2777'];

    function chartY(level) {
      return 360 - ((level - 1) / 3) * 300;
    }

    function chartX(sessionIndex) {
      return 86 + sessionIndex * (760 / (SESSION_COUNT - 1));
    }

    function chartPath(values) {
      let path = '';
      let drawing = false;
      values.forEach((value, index) => {
        if (!value) { drawing = false; return; }
        const command = drawing ? 'L' : 'M';
        path += `${command} ${chartX(index)} ${chartY(value)} `;
        drawing = true;
      });
      return path.trim();
    }

    function renderMiniProgressChart(student, comp, compIndex) {
      const width = 460;
      const height = 275;
      const left = 42;
      const right = 12;
      const top = 24;
      const bottom = 48;
      const plotWidth = width - left - right;
      const plotHeight = 170;
      const x = index => left + index * (plotWidth / (SESSION_COUNT - 1));
      const y = level => top + plotHeight - ((level - 1) / 3) * plotHeight;
      const values = student.sessions.map(item => item.competencies[compIndex]);
      let path = '';
      let drawing = false;
      values.forEach((value, index) => {
        if (!value) { drawing = false; return; }
        path += `${drawing ? 'L' : 'M'} ${x(index)} ${y(value)} `;
        drawing = true;
      });
      const grid = [1,2,3,4].map(level => `<line x1="${left}" x2="${width - right}" y1="${y(level)}" y2="${y(level)}" stroke="#dbe7f2" stroke-width="1"></line><text x="25" y="${y(level) + 4}" fill="#617489" font-size="12" font-weight="700">${level}</text>`).join('');
      const labels = student.sessions.map((item, index) => `<text x="${x(index)}" y="${height - 18}" text-anchor="middle" fill="#617489" font-size="11">${index + 1}</text>`).join('');
      const points = values.map((value, index) => value ? `<circle cx="${x(index)}" cy="${y(value)}" r="5" fill="${CHART_COLORS[compIndex]}" stroke="#fff" stroke-width="2"><title>Séance ${index + 1} · niveau ${value}</title></circle>` : '').join('');
      return `<article class="mini-chart-card"><h4>${comp.id}. ${esc(comp.title)}</h4><svg class="mini-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Progression de ${esc(comp.title)} sur neuf séances"><rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="#fff"></rect>${grid}<line x1="${left}" x2="${width - right}" y1="${y(1)}" y2="${y(1)}" stroke="#9fb6c9" stroke-width="1.5"></line><line x1="${left}" x2="${left}" y1="${top}" y2="${y(1)}" stroke="#9fb6c9" stroke-width="1.5"></line>${labels}<text x="${width / 2}" y="${height - 3}" text-anchor="middle" fill="#617489" font-size="11" font-weight="700">Séances</text><path d="${path.trim()}" fill="none" stroke="${CHART_COLORS[compIndex]}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>${points}</svg></article>`;
    }

    function renderProgressChart(student) {
      const width = 1080;
      const rowHeight = 88;
      const top = 28;
      const left = 190;
      const right = 24;
      const bottom = 56;
      const plotWidth = width - left - right;
      const height = top + rowHeight * COMPETENCIES.length + bottom;
      const x = index => left + index * (plotWidth / (SESSION_COUNT - 1));
      const rowY = compIndex => top + compIndex * rowHeight;
      const y = (compIndex, level) => rowY(compIndex) + 68 - ((level - 1) / 3) * 54;
      const dashStyles = ['', '10 6', '3 5', '14 5 3 5', '7 4', '2 7', '16 4'];
      const sessionLabels = student.sessions.map((item, index) => `<text class="chart-session-label" text-anchor="middle" x="${x(index)}" y="${height - 24}">${index + 1}</text>`).join('');
      const rows = COMPETENCIES.map((comp, compIndex) => {
        const values = student.sessions.map(item => canTeacherSee(item) ? item.competencies[compIndex] : null);
        const currentValues = values.filter(Boolean);
        let path = '';
        let drawing = false;
        values.forEach((value, index) => {
          if (!value) { drawing = false; return; }
          path += `${drawing ? 'L' : 'M'} ${x(index)} ${y(compIndex, value)} `;
          drawing = true;
        });
        const rowTop = rowY(compIndex);
        const grid = [1,2,3,4].map(level => `<line class="chart-grid-line" x1="${left}" x2="${width - right}" y1="${y(compIndex, level)}" y2="${y(compIndex, level)}"></line>`).join('');
        const points = values.map((value, index) => value ? `<circle class="chart-point" cx="${x(index)}" cy="${y(compIndex, value)}" r="6" fill="${CHART_COLORS[compIndex]}"><title>${esc(comp.short)} · séance ${index + 1} · niveau ${value}</title></circle>` : '').join('');
        const emptyHint = currentValues.length ? '' : `<text x="${width - right - 8}" y="${rowTop + 51}" text-anchor="end" fill="#9aa9b6" font-size="12">À renseigner</text>`;
        return `<g><rect x="8" y="${rowTop + 3}" width="${width - 16}" height="${rowHeight - 6}" rx="12" fill="${compIndex % 2 ? '#ffffff' : '#fbfdff'}"></rect><rect x="18" y="${rowTop + 18}" width="7" height="46" rx="3.5" fill="${CHART_COLORS[compIndex]}"></rect><text x="36" y="${rowTop + 34}" fill="#052f57" font-size="13" font-weight="900">${comp.id}. ${esc(comp.short)}</text><text x="36" y="${rowTop + 54}" fill="#617489" font-size="11">Niveau 1 à 4</text>${grid}<text class="chart-axis-label" x="${left - 25}" y="${y(compIndex, 4) + 4}">4</text><text class="chart-axis-label" x="${left - 25}" y="${y(compIndex, 1) + 4}">1</text><path class="chart-line" d="${path.trim()}" stroke="${CHART_COLORS[compIndex]}" stroke-dasharray="${dashStyles[compIndex]}"></path>${points}${emptyHint}</g>`;
      }).join('');
      const legend = COMPETENCIES.map((comp, index) => `<span class="legend-item"><i class="legend-dot" style="background:${CHART_COLORS[index]}"></i>${comp.id}. ${esc(comp.short)}</span>`).join('');
      return `<div class="card summary-card" style="box-shadow:none; padding:16px"><h3>Graphique unique des 7 compétences</h3><p class="summary-help">Les 7 compétences sont affichées dans un seul graphique, sur les 9 séances. Chaque ligne colorée correspond à une compétence, avec le niveau 1 en bas et le niveau 4 en haut. Les données manquantes restent visibles comme « À renseigner ».</p><svg class="progress-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Graphique unique des sept compétences sur neuf séances"><rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="#f5f9fd"></rect>${rows}<line x1="${left}" x2="${width - right}" y1="${height - bottom + 8}" y2="${height - bottom + 8}" stroke="#9fb6c9" stroke-width="1.5"></line>${sessionLabels}<text class="chart-axis-label" text-anchor="middle" x="${left + plotWidth / 2}" y="${height - 5}">Séances</text></svg><div class="chart-legend">${legend}</div>${renderProgressTable(student)}</div>`;
    }

    function renderProgressTable(student) {
      const headers = student.sessions.map((item, index) => `<th scope="col">S${index + 1}</th>`).join('');
      const rows = COMPETENCIES.map((comp, compIndex) => `<tr><th scope="row">${comp.id}. ${esc(comp.short)}</th>${student.sessions.map(item => { const value = canTeacherSee(item) ? item.competencies[compIndex] : null; return `<td>${value ? `<span class="level-cell level-${value}">${value}</span>` : '<span class="empty-cell">·</span>'}</td>`; }).join('')}</tr>`).join('');
      return `<h3 style="margin:22px 0 8px">Détail séance par séance</h3><div class="progress-table-wrap"><table class="progress-table"><thead><tr><th scope="col">Compétence</th>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    function iconSvg() {
      return `<svg viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 52 25 24l8 10 8-12 19 30H4Z" fill="#bce5ff" opacity=".95"/>
        <path d="m4 52 14-18 7 8 8-10 10 20H4Z" fill="#73b9eb"/>
        <path d="m34 52 10-21 16 21H34Z" fill="#8bd1f5"/>
        <circle cx="31" cy="15" r="5" fill="#fff"/>
        <path d="M29 20c-4 3-6 6-7 10l-5 7m12-14 8 5 7-7m-11 2-3 11 8 7m-16-7 7 7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }

    function renderTopbar(title, subtitle, actions = '') {
      return `<header class="topbar"><div class="topbar-inner">
        <div class="brand"><div class="brand-icon">${iconSvg()}</div><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>
        ${actions ? `<div class="top-actions">${actions}</div>` : ''}
      </div></header>`;
    }

    function render() {
      if (!state.teacherPinHash) return renderSetup();
      if (!session.role) return renderLogin();
      if (session.role === 'teacher') return renderTeacher();
      return renderStudent();
    }

    function mount(html) {
      document.getElementById('app').innerHTML = html;
    }

    function renderSetup() {
      mount(`${renderTopbar('Escalade Terminale', 'Suivi individuel des élèves')}
        <main class="main narrow"><section class="card login-card">
          <div class="login-hero"><h2>Bienvenue</h2><p>Configurez l’accès enseignant avant de créer les fiches élèves.</p></div>
          <div class="notice warning"><strong>Prototype local.</strong> Les données sont enregistrées uniquement dans ce navigateur. Pour un usage réel sur plusieurs téléphones, il faudra connecter cette interface à un serveur sécurisé avec authentification.</div>
          <hr class="divider">
          <form id="setup-form">
            <div class="field"><label for="teacher-pin">Code enseignant</label><input id="teacher-pin" name="pin" type="password" inputmode="numeric" minlength="4" autocomplete="new-password" required placeholder="4 chiffres minimum"></div>
            <div class="field"><label for="teacher-pin-confirm">Confirmer le code</label><input id="teacher-pin-confirm" name="pinConfirm" type="password" inputmode="numeric" minlength="4" autocomplete="new-password" required></div>
            <button class="btn btn-primary btn-block" type="submit">Créer l’accès enseignant</button>
          </form>
          <p class="footer-note">Aucun compte, cookie publicitaire, police externe ou outil de suivi n’est utilisé par ce fichier.</p>
        </section></main>`);
      document.getElementById('setup-form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const pin = String(form.get('pin') || '');
        const confirm = String(form.get('pinConfirm') || '');
        if (pin.length < 4 || pin !== confirm) return toast('Les deux codes doivent être identiques et comporter au moins 4 caractères.');
        state.teacherPinHash = await hashPin(pin);
        persist();
        toast('Accès enseignant créé.');
        render();
      });
    }

    function roleIconSvg(kind) {
      if (kind === 'teacher') {
        return `<svg viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="16" r="9" fill="#ffd6b3"/>
          <path d="M23 15c1-8 17-10 19 1-4-2-9-3-15-1Z" fill="#5b3b2c"/>
          <path d="M17 55c1-12 7-20 15-20s14 8 15 20H17Z" fill="#8b5cf6"/>
          <path d="M19 43c5 3 9 4 13 4s8-1 13-4" fill="none" stroke="#6d28d9" stroke-width="3" stroke-linecap="round"/>
          <rect x="35" y="29" width="18" height="20" rx="3" fill="#fff" stroke="#0b5ea8" stroke-width="3" transform="rotate(7 35 29)"/>
          <path d="m39 36 9 1m-8 5 6 1" stroke="#73b9eb" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="51" cy="12" r="5" fill="#facc15"/>
          <path d="M51 9v6m-3-3h6" stroke="#7c4a00" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
      }
      return `<svg viewBox="0 0 64 64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 54 23 31l8 9 10-16 18 30H5Z" fill="#8bd1f5"/>
        <path d="m5 54 13-16 7 8 7-7 10 15H5Z" fill="#c7edff"/>
        <circle cx="29" cy="14" r="6" fill="#ffd6b3"/>
        <path d="M29 8c-5 0-8 4-7 8 3-2 7-3 12-2 0-4-2-6-5-6Z" fill="#3f2d26"/>
        <path d="M27 21c-5 4-7 9-8 15l-6 7m13-17 10 6 8-8m-12 1-3 12 9 9m-18-5 8 7" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="47" cy="22" r="3.5" fill="#facc15" stroke="#7c4a00" stroke-width="1.5"/>
        <circle cx="55" cy="31" r="3.5" fill="#22c55e" stroke="#087443" stroke-width="1.5"/>
      </svg>`;
    }

    function renderLogin() {
      const studentOptions = state.students.length ? state.students.map(student => `<option value="${esc(student.id)}">${esc(student.name)}${student.className ? ` · ${esc(student.className)}` : ''}</option>`).join('') : '<option value="">Aucun élève créé</option>';
      mount(`${renderTopbar('Escalade Terminale', 'Connexion au suivi individuel')}
        <main class="main narrow"><section class="card login-card">
          <div class="login-hero"><h2>Choisissez votre espace</h2><p>Une icône, puis votre code de connexion.</p></div>
          <div class="role-grid" aria-label="Choisir un type de connexion">
            <button class="role-card" type="button" data-role-choice="teacher" aria-controls="teacher-panel"><span class="role-icon">${roleIconSvg('teacher')}</span><strong>Connexion prof</strong><span>Gérer les élèves et consulter les fiches</span></button>
            <button class="role-card" type="button" data-role-choice="student" aria-controls="student-panel"><span class="role-icon">${roleIconSvg('student')}</span><strong>Connexion élève</strong><span>Renseigner ses séances et ses objectifs</span></button>
          </div>
          <div id="teacher-panel" class="login-panel hidden"><form id="teacher-login"><h3>Connexion prof</h3><div class="field"><label for="teacher-login-pin">Code enseignant</label><input id="teacher-login-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required></div><button class="btn btn-primary btn-block" type="submit">Entrer dans l’espace prof</button></form></div>
          <div id="student-panel" class="login-panel hidden"><form id="student-login"><h3>Connexion élève</h3><div class="field"><label for="student-select">Élève</label><select id="student-select" name="studentId" ${state.students.length ? '' : 'disabled'}>${studentOptions}</select></div><div class="field"><label for="student-pin">Code personnel</label><input id="student-pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required ${state.students.length ? '' : 'disabled'}></div><button class="btn btn-secondary btn-block" type="submit" ${state.students.length ? '' : 'disabled'}>Entrer dans mon suivi</button></form>${state.students.length ? '' : '<p class="muted small" style="margin:12px 0 0">L’enseignant doit d’abord créer les élèves.</p>'}</div>
          <div class="notice" style="margin-top:18px"><strong>Protection des données :</strong> ce prototype ne transfère pas les informations vers Internet. Les données restent dans ce navigateur.</div>
        </section></main>`);
      document.querySelectorAll('[data-role-choice]').forEach(button => button.addEventListener('click', () => {
        const panel = document.getElementById(`${button.dataset.roleChoice}-panel`);
        panel.classList.remove('hidden');
        panel.querySelector('input, select')?.focus();
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }));
      document.getElementById('teacher-login').addEventListener('submit', async event => {
        event.preventDefault();
        const pin = new FormData(event.currentTarget).get('pin');
        if (await hashPin(pin) !== state.teacherPinHash) return toast('Code enseignant incorrect.');
        session = { role: 'teacher', studentId: null, teacherStudentId: state.students[0]?.id || null, sessionIndex: 0, summary: false };
        enableRefreshGuard();
        render();
      });
      document.getElementById('student-login').addEventListener('submit', async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const student = state.students.find(item => item.id === form.get('studentId'));
        if (!student || await hashPin(form.get('pin')) !== student.pinHash) return toast('Élève ou code personnel incorrect.');
        session = { role: 'student', studentId: student.id, teacherStudentId: null, sessionIndex: firstIncomplete(student), summary: false };
        enableRefreshGuard();
        render();
      });
    }

    function firstIncomplete(student) {
      const index = student.sessions.findIndex(item => item.competencies.some(value => value === null));
      return index < 0 ? 0 : index;
    }

    function isSessionComplete(data) {
      return Boolean(data && data.competencies?.every(Boolean) && data.maxRoute && data.projectCompetency && data.targetRoute);
    }

    function canTeacherSee(data) {
      return session.role !== 'teacher' || Boolean(data?.submitted);
    }

    function teacherActions() {
      return `<button class="btn btn-ghost" data-action="export">Exporter</button><button class="btn btn-ghost" data-action="logout">Se déconnecter</button>`;
    }

    function renderTeacher() {
      const student = currentStudent();
      mount(`${renderTopbar('Espace enseignant', 'Suivi individuel escalade · 9 séances', teacherActions())}
        <main class="main"><div class="dashboard-grid">
          <aside class="card"><div class="section-heading"><div><h2>Élèves</h2><p class="muted small">${state.students.length} fiche(s)</p></div><button class="btn btn-primary" data-action="show-add">Ajouter</button></div>
            <div id="add-student-box" class="hidden"></div>
            <div class="student-list">${state.students.length ? state.students.map(item => `<button class="student-item ${student?.id === item.id ? 'active' : ''}" data-student-id="${esc(item.id)}"><strong>${esc(item.name)}</strong><span>${esc(item.className || 'Classe non renseignée')}</span></button>`).join('') : '<div class="empty">Ajoutez le premier élève.</div>'}</div>
            <hr class="divider"><div class="toolbar"><button class="btn btn-secondary" data-action="import">Importer une sauvegarde</button><button class="btn btn-light-danger" data-action="clear-all">Effacer toutes les données</button></div>
            <input id="import-file" class="hidden" type="file" accept="application/json,.json">
          </aside>
          <section class="card">${student ? renderTeacherStudent(student) : '<div class="empty">Sélectionnez un élève pour afficher ses 9 pages de suivi.</div>'}</section>
        </div><p class="footer-note">Le code enseignant et les codes élèves sont stockés sous forme d’empreinte dans ce navigateur. Cette protection locale ne remplace pas une authentification serveur.</p></main>`);
      bindTeacherEvents();
    }

    function renderTeacherStudent(student) {
      const data = student.sessions[session.sessionIndex];
      return `<div class="section-heading"><div><h2>${esc(student.name)}</h2><p class="muted">${esc(student.className || 'Classe non renseignée')} · ${session.summary ? 'Récapitulatif des progrès' : sessionLabel(session.sessionIndex)}</p></div><button class="btn btn-light-danger" data-action="delete-student" data-id="${esc(student.id)}">Supprimer l’élève</button></div>
        ${session.summary || !data.submitted ? '' : renderTeacherQuickSummary(student)}
        <div class="tabs" aria-label="Choisir une séance ou le récapitulatif"><button class="tab ${session.summary ? 'active' : ''}" data-summary-view="true">Récapitulatif</button>${student.sessions.map((item, index) => `<button class="tab ${!session.summary && index === session.sessionIndex ? 'active' : ''}" data-session-index="${index}">${sessionLabel(index)}${item.submitted ? ' ✓' : ''}</button>`).join('')}</div>
        ${session.summary ? renderProgressChart(student) : data.submitted ? `<div class="notice" style="margin:14px 0">Séance transmise. Les niveaux sélectionnés apparaissent avec les mêmes couleurs que dans l’espace élève. Vous pouvez ajouter un commentaire visible par l’élève.</div><div class="grid grid-2"><div>${renderCompetencyReadOnly(data)}</div><div>${renderSessionMetaReadOnly(data)}${renderTeacherCommentForm(data)}</div></div>` : `<div class="notice warning" style="margin:14px 0"><strong>Séance non encore transmise.</strong><br>Les niveaux saisis par l’élève restent masqués jusqu’à l’enregistrement complet de la séance.</div><div class="empty">En attente de la validation de l’élève.</div>`}`;
    }

    function renderTeacherQuickSummary(student) {
      const current = student.sessions[session.sessionIndex];
      const visible = Boolean(current?.submitted);
      return `<div><h3 style="margin-top:4px">Synthèse rapide de ${sessionLabel(session.sessionIndex)}</h3><div class="quick-summary">${COMPETENCIES.map((comp, index) => {
        const level = visible ? current.competencies[index] : null;
        return `<div class="quick-item"><strong>${comp.id}. ${esc(comp.short)}</strong><span class="quick-level ${level ? `level-${level}` : 'quick-none'}">${level || '·'}</span><div class="muted" style="font-size:.72rem;margin-top:5px">${level ? 'Renseigné' : 'Non renseigné'}</div></div>`;
      }).join('')}</div></div>`;
    }

    function renderLevelIndicators(comp, value) {
      const max = comp.maxLevel || 4;
      return `<div class="level-indicators" aria-label="Indicateurs de ${esc(comp.title)}">${[1,2,3,4].filter(level => level <= max).map(level => `<div class="level-indicator ${value === level ? 'current' : ''}"><span class="level-mark level-${level}">${level}</span><span>${esc(comp.levels[level - 1])}</span></div>`).join('')}</div>`;
    }

    function renderParameterChecklist(data, key, parameters, readonly = false, label = '') {
      const params = Array.isArray(data[key]) ? data[key] : Array(parameters.length).fill(false);
      const count = params.filter(Boolean).length;
      const touched = Boolean(data[`${key}Touched`]);
      const result = touched ? (key === 'clipParams' ? count + 1 : (count || 'à renseigner')) : 'à renseigner';
      const resultClass = touched && result !== 'à renseigner' ? `level-${result}` : 'quick-none';
      const countText = `${count}/${parameters.length} paramètre${count > 1 ? 's' : ''} maîtrisé${count > 1 ? 's' : ''}`;
      return `<div class="skill-params" aria-label="${esc(label)}">${parameters.map((parameter, index) => `<label class="skill-param ${params[index] ? 'checked' : ''}"><input type="checkbox" data-param-key="${esc(key)}" data-param-index="${index}" ${params[index] ? 'checked' : ''} ${readonly ? 'disabled' : ''}><span>${esc(parameter)}</span></label>`).join('')}</div><div class="skill-count">${countText} · niveau calculé : <span class="quick-level ${resultClass}">${result}</span></div>`;
    }

    function renderMoulinetteParameters(data, readonly = false) {
      return renderParameterChecklist(data, 'moulinetteParams', MOULINETTE_PARAMETERS, readonly, 'Les 4 critères de l’assurage en moulinette en 5 temps');
    }

    function renderClipParameters(data, readonly = false) {
      return renderParameterChecklist(data, 'clipParams', CLIP_PARAMETERS, readonly, 'Les 3 paramètres du clipage');
    }

    function renderCompetencyReadOnly(data) {
      return `<div class="competency-list">${COMPETENCIES.map((comp, index) => {
        const value = data.competencies[index];
        const max = comp.maxLevel || 4;
        return `<article class="competency-card"><div class="competency-title">${comp.id}. ${esc(comp.title)}</div><div class="level-buttons">${[1,2,3,4].map(level => `<button class="level-btn level-${level} ${value === level ? 'selected' : ''}" disabled ${level > max ? 'aria-hidden="true"' : ''}>${level}</button>`).join('')}</div>${comp.id === 1 ? renderMoulinetteParameters(data, true) : comp.id === 3 ? renderClipParameters(data, true) : ''}${renderLevelIndicators(comp, value)}<p class="muted small" style="margin:9px 0 0">${value ? esc(comp.levels[value - 1]) : 'Non renseigné'}</p></article>`;
      }).join('')}</div>`;
    }

    function renderSessionMetaReadOnly(data) {
      return `<div class="card" style="box-shadow:none; padding:16px; margin-bottom:16px"><h3>Repères de séance</h3><div class="field"><label>Niveau max en moulinette</label><div class="pill">${esc(data.maxRoute || 'Non renseigné')}</div></div><div class="field"><label>Projet pour la séance suivante</label><div class="pill">${esc(data.projectCompetency ? `${data.projectCompetency} · objectif ${data.targetRoute || 'à préciser'}` : 'Non renseigné')}</div></div><div class="field" style="margin-bottom:0"><label>Dernière sauvegarde</label><div class="muted small">${esc(formatDate(data.savedAt))}</div></div></div>`;
    }

    function renderTeacherCommentForm(data) {
      return `<form id="comment-form"><h3>Commentaire de l’enseignant</h3><div class="field"><label for="teacher-comment">Visible par l’élève</label><textarea id="teacher-comment" name="comment" placeholder="Retour, conseil ou objectif pour la prochaine séance...">${esc(data.teacherComment)}</textarea></div><button class="btn btn-success" type="submit">Enregistrer le commentaire</button></form>`;
    }

    function bindTeacherEvents() {
      document.querySelectorAll('[data-student-id]').forEach(button => button.addEventListener('click', () => { session.teacherStudentId = button.dataset.studentId; session.sessionIndex = 0; render(); }));
      document.querySelectorAll('[data-session-index]').forEach(button => button.addEventListener('click', () => { session.sessionIndex = Number(button.dataset.sessionIndex); session.summary = false; render(); }));
      document.querySelector('[data-summary-view]')?.addEventListener('click', () => { session.summary = true; render(); });
      document.querySelector('[data-action="show-add"]')?.addEventListener('click', showAddStudent);
      document.querySelector('[data-action="delete-student"]')?.addEventListener('click', deleteStudent);
      document.querySelector('[data-action="clear-all"]')?.addEventListener('click', clearAll);
      document.querySelector('[data-action="export"]')?.addEventListener('click', exportData);
      document.querySelector('[data-action="import"]')?.addEventListener('click', () => document.getElementById('import-file').click());
      document.getElementById('import-file')?.addEventListener('change', importData);
      document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);
      document.getElementById('comment-form')?.addEventListener('submit', event => {
        event.preventDefault();
        const data = currentSessionData();
        data.teacherComment = new FormData(event.currentTarget).get('comment') || '';
        data.savedAt = new Date().toISOString();
        persist();
        toast('Commentaire enregistré et visible par l’élève.');
        render();
      });
    }

    function showAddStudent() {
      const box = document.getElementById('add-student-box');
      box.classList.remove('hidden');
      box.innerHTML = `<form id="add-student-form" class="notice" style="margin-bottom:14px"><div class="field"><label for="new-name">Nom et prénom</label><input id="new-name" name="name" required autocomplete="off"></div><div class="field"><label for="new-class">Classe</label><input id="new-class" name="className" placeholder="Ex. T3" autocomplete="off"></div><div class="field"><label for="new-pin">Code personnel de l’élève</label><input id="new-pin" name="pin" type="password" inputmode="numeric" minlength="4" required autocomplete="new-password"></div><div class="toolbar"><button class="btn btn-success" type="submit">Créer la fiche</button><button class="btn btn-secondary" type="button" data-action="cancel-add">Annuler</button></div></form>`;
      document.getElementById('add-student-form').addEventListener('submit', async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const name = String(form.get('name') || '').trim();
        const pin = String(form.get('pin') || '');
        if (!name || pin.length < 4) return toast('Renseignez le nom et un code d’au moins 4 caractères.');
        const student = freshStudent(name, form.get('className') || '', await hashPin(pin));
        state.students.push(student);
        persist();
        session.teacherStudentId = student.id;
        session.sessionIndex = 0;
        toast('Fiche élève créée.');
        render();
      });
      document.querySelector('[data-action="cancel-add"]').addEventListener('click', render);
      document.getElementById('new-name').focus();
    }

    function deleteStudent() {
      const student = currentStudent();
      if (!student) return;
      if (!confirm(`Supprimer définitivement la fiche de ${student.name} dans ce navigateur ?`)) return;
      state.students = state.students.filter(item => item.id !== student.id);
      session.teacherStudentId = state.students[0]?.id || null;
      session.sessionIndex = 0;
      persist();
      toast('Fiche supprimée.');
      render();
    }

    function clearAll() {
      if (!confirm('Effacer tous les élèves et toutes les séances de ce navigateur ? Cette action est irréversible sans sauvegarde.')) return;
      state.students = [];
      persist();
      session.teacherStudentId = null;
      toast('Données élèves effacées.');
      render();
    }

    function renderStudent() {
      const student = currentStudent();
      if (!student) { logout(); return; }
      const data = currentSessionData();
      mount(`${renderTopbar('Mon suivi escalade', `${student.name}${student.className ? ` · ${student.className}` : ''}`, '<button class="btn btn-ghost" data-action="logout">Se déconnecter</button>')}
        <main class="main"><section class="card"><div class="section-heading"><div><h2>${sessionLabel(session.sessionIndex)}</h2><p class="muted">Renseigne les niveaux atteints, ton niveau max en moulinette et ton projet.</p></div><span class="pill"><span class="status-dot ${data.submitted ? '' : 'off'}"></span>${data.submitted ? 'Séance transmise' : 'Brouillon non visible par le prof'}</span></div>
          <div class="tabs" aria-label="Choisir une séance ou le récapitulatif"><button class="tab ${session.summary ? 'active' : ''}" data-summary-view="true">Récapitulatif</button>${student.sessions.map((item, index) => `<button class="tab ${!session.summary && index === session.sessionIndex ? 'active' : ''}" data-session-index="${index}">${sessionLabel(index)}</button>`).join('')}</div>
          ${session.summary ? renderProgressChart(student) : `<form id="student-session-form"><div class="grid grid-2" style="margin-top:16px"><div><h3>Mes compétences</h3><div class="competency-list">${renderCompetencyInputs(data)}</div></div><div><h3>Mes repères</h3>${renderStudentMetaInputs(data)}<div class="notice success" style="margin-top:16px"><strong>Commentaire de l’enseignant</strong><div class="readonly-comment" style="margin-top:8px">${esc(data.teacherComment || 'Pas encore de commentaire pour cette séance.')}</div></div></div></div><div class="toolbar" style="margin-top:18px"><button class="btn btn-primary" type="submit">Enregistrer ma séance</button><span class="muted small">Les niveaux sont sauvegardés dans ce navigateur.</span></div></form>`}
        </section><p class="footer-note">Les niveaux 1 à 4 sont représentés uniquement par leur numéro et leur couleur. Pour la compétence 6, le niveau 4 n’est pas utilisé.</p></main>`);
      bindStudentEvents();
    }

    function renderCompetencyInputs(data) {
      return COMPETENCIES.map((comp, index) => {
        const value = data.competencies[index];
        const max = comp.maxLevel || 4;
        return `<article class="competency-card"><div class="competency-title">${comp.id}. ${esc(comp.title)}</div><div class="level-buttons" role="group" aria-label="${esc(comp.title)}">${[1,2,3,4].map(level => `<button type="button" class="level-btn level-${level} ${value === level ? 'selected' : ''}" data-level-index="${index}" data-level="${level}" ${comp.id === 3 || level > max ? 'disabled title="Le niveau de clipage est calculé à partir des paramètres cochés"' : ''}>${level}</button>`).join('')}</div>${comp.id === 1 ? renderMoulinetteParameters(data) : comp.id === 3 ? renderClipParameters(data) : ''}${renderLevelIndicators(comp, value)}<p class="muted small" style="margin:9px 0 0">${value ? esc(comp.levels[value - 1]) : 'Choisis un niveau'}</p></article>`;
      }).join('');
    }

    function renderStudentMetaInputs(data) {
      const projectOptions = COMPETENCIES.map(comp => `<option value="${esc(comp.short)}" ${data.projectCompetency === comp.short ? 'selected' : ''}>${comp.id}. ${esc(comp.short)}</option>`).join('');
      const routeOptions = `<option value="">À préciser</option>${ROUTE_LEVELS.map(level => `<option value="${level}" ${data.targetRoute === level ? 'selected' : ''}>${level}</option>`).join('')}`;
      return `<div class="field"><label for="max-route">Niveau max en moulinette</label><select id="max-route" name="maxRoute"><option value="">À renseigner</option>${ROUTE_LEVELS.map(level => `<option value="${level}" ${data.maxRoute === level ? 'selected' : ''}>${level}</option>`).join('')}</select></div><div class="field"><label for="project-competency">Projet pour la séance suivante${session.sessionIndex === SESSION_COUNT - 1 ? ' ou après le cycle' : ''}</label><select id="project-competency" name="projectCompetency"><option value="">Choisir une compétence</option>${projectOptions}</select></div><div class="field"><label for="target-route">Niveau de grimpe visé</label><select id="target-route" name="targetRoute">${routeOptions}</select></div>`;
    }

    function bindStudentEvents() {
      document.querySelectorAll('[data-session-index]').forEach(button => button.addEventListener('click', () => { session.sessionIndex = Number(button.dataset.sessionIndex); session.summary = false; render(); }));
      document.querySelector('[data-summary-view]')?.addEventListener('click', () => { session.summary = true; render(); });
      document.querySelectorAll('[data-level-index]').forEach(button => button.addEventListener('click', () => {
        const data = currentSessionData();
        data.competencies[Number(button.dataset.levelIndex)] = Number(button.dataset.level);
        data.submitted = false;
        persist();
        render();
      }));
      document.querySelectorAll('[data-param-key]').forEach(input => input.addEventListener('change', () => {
        const data = currentSessionData();
        const key = input.dataset.paramKey;
        const index = Number(input.dataset.paramIndex);
        const length = key === 'moulinetteParams' ? 4 : 3;
        if (!Array.isArray(data[key])) data[key] = Array(length).fill(false);
        data[key][index] = input.checked;
        data[`${key}Touched`] = true;
        const count = data[key].filter(Boolean).length;
        data.competencies[key === 'moulinetteParams' ? 0 : 2] = key === 'clipParams' ? count + 1 : (count || null);
        data.submitted = false;
        persist();
        render();
      }));
      document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);
      const studentForm = document.getElementById('student-session-form');
      if (!studentForm) return;
      studentForm.addEventListener('submit', event => {
        event.preventDefault();
        const data = currentSessionData();
        const form = new FormData(event.currentTarget);
        data.maxRoute = form.get('maxRoute') || '';
        data.projectCompetency = form.get('projectCompetency') || '';
        data.targetRoute = form.get('targetRoute') || '';
        data.savedAt = new Date().toISOString();
        data.submitted = isSessionComplete(data);
        persist();
        toast(data.submitted ? 'Séance transmise au professeur.' : 'Brouillon enregistré. Complète la séance pour la transmettre au professeur.');
        render();
      });
    }

    function formatDate(value) {
      if (!value) return 'Jamais';
      try { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
      catch { return value; }
    }

    function toast(message) {
      const node = document.getElementById('toast');
      node.textContent = message;
      node.classList.add('show');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
    }

    function logout() {
      session = { role: null, studentId: null, teacherStudentId: null, sessionIndex: 0, summary: false };
      refreshWarningEnabled = false;
      render();
    }

    function exportData() {
      const payload = JSON.stringify({ exportedAt: new Date().toISOString(), app: APP_KEY, data: state }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sauvegarde-escalade-${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast('Sauvegarde JSON exportée.');
    }

    function importData(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const incoming = parsed.data || parsed;
          if (!incoming || typeof incoming !== 'object' || !Array.isArray(incoming.students) || typeof incoming.teacherPinHash !== 'string') throw new Error('format');
          if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
          state = incoming;
          persist();
          session.teacherStudentId = state.students[0]?.id || null;
          session.sessionIndex = 0;
          toast('Sauvegarde importée.');
          render();
        } catch { toast('Fichier JSON non reconnu.'); }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    function enableRefreshGuard() {
      refreshWarningEnabled = true;
    }

    document.addEventListener('keydown', event => {
      const refresh = event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');
      if (refresh && refreshWarningEnabled) {
        event.preventDefault();
        toast('Rafraîchissement bloqué dans l’application. Utilisez le bouton de déconnexion.');
      }
    });

    window.addEventListener('beforeunload', event => {
      if (!refreshWarningEnabled) return;
      event.preventDefault();
      event.returnValue = 'Utilisez le bouton de déconnexion pour quitter l’application.';
    });

    render();
