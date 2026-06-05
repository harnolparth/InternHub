/*
  ================================================================
  INTERNHUB — app.js  (Complete Frontend Logic)
  ================================================================
  Pages handled:
    index.html              → landing (no auth needed)
    login.html              → login for both roles
    register.html           → register for both roles
    company-dashboard.html  → company: view roles + applicants
    post-role.html          → company: post a new role
    applicant-dashboard.html→ applicant: browse roles + my apps
  ================================================================
*/
'use strict';

//const API = 'http://localhost:5000/api';
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : '/api';

/* ── Detect current page ── */
const PAGE = (() => {
  const p = location.pathname.split('/').pop() || 'index.html';
  return p;
})();

/* ================================================================
   UTILITIES
   ================================================================ */

function getInitials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  return name.substring(0,2).toUpperCase() || '?';
}

const GRADIENTS = [
  'linear-gradient(135deg,#7c6af5,#5ee7d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#22c55e,#06b6d4)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#f97316,#eab308)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
];
function avatarGrad(name='') { return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length]; }

function sanitize(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

function daysLeft(iso) {
  if (!iso) return '';
  const diff = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  if (diff < 0)  return '<span style="color:var(--red)">Expired</span>';
  if (diff === 0) return '<span style="color:var(--amber)">Last day!</span>';
  return `<span style="color:var(--green)">${diff}d left</span>`;
}

/* toast */
function toast(msg, type='success') {
  document.getElementById('_toast')?.remove();
  const t = document.createElement('div'); t.id='_toast'; t.textContent=msg;
  const c = {success:'#22c55e',error:'#ef4444',info:'#7c6af5'};
  Object.assign(t.style,{
    position:'fixed',bottom:'22px',right:'22px',
    background: c[type]||c.info, color:'#fff',
    padding:'11px 18px', borderRadius:'10px',
    fontSize:'13px', fontWeight:'600', fontFamily:"'DM Sans',sans-serif",
    boxShadow:'0 8px 24px rgba(0,0,0,0.4)', zIndex:'9999',
    transform:'translateY(80px)', transition:'transform 0.3s ease', maxWidth:'320px'
  });
  document.body.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ t.style.transform='translateY(0)'; }));
  setTimeout(()=>{ t.style.transform='translateY(80px)'; setTimeout(()=>t.remove(),300); },3500);
}

/* loading spinner */
function showLoading(msg='Loading...') {
  let el = document.getElementById('globalLoader');
  if (!el) {
    el = document.createElement('div'); el.id='globalLoader';
    el.innerHTML=`<div class="loader-spinner"></div><div class="loader-text" id="_lmsg">${msg}</div>`;
    document.body.appendChild(el);
  } else {
    const lm=document.getElementById('_lmsg'); if(lm) lm.textContent=msg;
    el.style.display='flex';
  }
}
function hideLoading() { const el=document.getElementById('globalLoader'); if(el) el.style.display='none'; }

/* ================================================================
   SESSION — store/read logged-in user from sessionStorage
   ================================================================ */
const Session = {
  set(user) { sessionStorage.setItem('ihUser', JSON.stringify(user)); },
  get()     { try { return JSON.parse(sessionStorage.getItem('ihUser')); } catch{ return null; } },
  clear()   { sessionStorage.removeItem('ihUser'); },
};

function logout() {
  Session.clear();
  location.href = 'login.html';
}

/* Guard: redirect if not logged in, or wrong role */
function requireAuth(expectedRole) {
  const user = Session.get();
  if (!user) { location.href='login.html'; return null; }
  if (expectedRole && user.role !== expectedRole) {
    location.href = user.role==='company' ? 'company-dashboard.html' : 'applicant-dashboard.html';
    return null;
  }
  return user;
}

/* ================================================================
   API WRAPPER
   ================================================================ */
async function api(path, opts={}) {
  const user = Session.get();
  const headers = { 'Content-Type':'application/json' };
  if (user?.token) headers['Authorization'] = 'Bearer ' + user.token;

  let res, data;
  try {
    res  = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers||{}) } });
    data = await res.json();
  } catch(e) {
    throw new Error('Cannot connect to server. Is Flask running?\n  cd backend && python app.py');
  }
  if (!res.ok) {
    const msg = Array.isArray(data.details) ? data.details.join('\n') : (data.error||'Server error');
    throw new Error(msg);
  }
  return data;
}

/* ================================================================
   SHARED — navbar toggle, password toggle, role tabs
   ================================================================ */
function initNavbar() {
  const toggle = document.getElementById('navToggle');
  const links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', ()=>links.classList.toggle('open'));
    links.querySelectorAll('.nav-link').forEach(l=>l.addEventListener('click',()=>links.classList.remove('open')));
  }
}

function togglePassword(id, iconEl) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  iconEl.textContent = isHidden ? '🙈' : '👁️';
}

/* Role tab selector (login + register pages) */
let selectedRole = 'applicant';
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-tab').forEach(t=>{
    t.classList.toggle('active', t.dataset.role===role);
  });
  /* register page: show/hide company extra fields */
  const compFields = document.getElementById('companyFields');
  const appFields  = document.getElementById('applicantFields');
  const slotsBar   = document.getElementById('slotsBar');
  if (compFields) compFields.classList.toggle('hidden', role!=='company');
  if (appFields)  appFields.classList.toggle('hidden',  role==='company');
  if (slotsBar)   slotsBar.classList.toggle('hidden',   role!=='company');
}

/* ================================================================
   PAGE: LOGIN
   ================================================================ */
async function initLogin() {
  /* Pre-select role from URL ?role= */
  const urlRole = new URLSearchParams(location.search).get('role');
  if (urlRole) selectRole(urlRole);

  /* If already logged in, redirect */
  const user = Session.get();
  if (user) {
    location.href = user.role==='company' ? 'company-dashboard.html' : 'applicant-dashboard.html';
    return;
  }

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginServerErr');
    errEl.classList.add('hidden'); errEl.textContent='';

    /* Basic client validation */
    let ok = true;
    if (!email)    { showErr('loginEmailErr','Email is required.');    ok=false; }
    if (!password) { showErr('loginPasswordErr','Password is required.'); ok=false; }
    if (!ok) return;

    const btn = document.getElementById('loginBtn');
    btn.disabled=true; btn.textContent='Logging in...';
    showLoading('Logging you in...');

    try {
      const res = await api('/auth/login', {
        method:'POST',
        body: JSON.stringify({ email, password, role: selectedRole })
      });
      Session.set(res.user);
      hideLoading();
      location.href = res.user.role==='company' ? 'company-dashboard.html' : 'applicant-dashboard.html';
    } catch(err) {
      hideLoading();
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled=false; btn.textContent='Log In →';
    }
  });
}

/* ================================================================
   PAGE: REGISTER
   ================================================================ */
async function initRegister() {
  const urlRole = new URLSearchParams(location.search).get('role');
  if (urlRole) selectRole(urlRole);

  /* Load company slot count */
  try {
    const res = await api('/auth/company-slots');
    const el  = document.getElementById('slotsCount');
    if (el) el.textContent = res.available;
    const bar = document.getElementById('slotsBar');
    if (bar && res.available === 0) bar.classList.add('full');
  } catch(_) {}

  document.getElementById('registerForm').addEventListener('submit', async e => {
    e.preventDefault();
    clearAllErrors();
    const errEl = document.getElementById('regServerErr');
    errEl.classList.add('hidden'); errEl.textContent='';

    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirm').value;

    let ok = true;

    /* Shared validation */
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showErr('regEmailErr','Enter a valid email address.'); ok=false;
    }
    if (!password || password.length < 6) {
      showErr('regPasswordErr','Password must be at least 6 characters.'); ok=false;
    }
    if (password !== confirm) {
      showErr('regConfirmErr','Passwords do not match.'); ok=false;
    }

    let body = { email, password, role: selectedRole };

    if (selectedRole === 'applicant') {
      const name = document.getElementById('regName').value.trim();
      if (!name || name.length < 2) { showErr('regNameErr','Enter your full name.'); ok=false; }
      body.name = name;
    } else {
      const companyName = document.getElementById('regCompanyName').value.trim();
      const industry    = document.getElementById('regIndustry').value;
      const location    = document.getElementById('regLocation').value.trim();
      const website     = document.getElementById('regWebsite').value.trim();
      if (!companyName || companyName.length<2) { showErr('regCompanyNameErr','Enter company name.'); ok=false; }
      if (!industry)   { showErr('regIndustryErr','Select your industry.');    ok=false; }
      if (!location)   { showErr('regLocationErr','Enter company location.');  ok=false; }
      body = { ...body, companyName, industry, location, website };
    }

    if (!ok) return;

    const btn = document.getElementById('registerBtn');
    btn.disabled=true; btn.textContent='Creating account...';
    showLoading('Creating your account...');

    try {
      const res = await api('/auth/register', { method:'POST', body:JSON.stringify(body) });
      Session.set(res.user);
      hideLoading();
      location.href = res.user.role==='company' ? 'company-dashboard.html' : 'applicant-dashboard.html';
    } catch(err) {
      hideLoading();
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled=false;
      btn.textContent='Create Account →';
    }
  });
}

/* ================================================================
   PAGE: COMPANY DASHBOARD
   ================================================================ */
let companyRoles = [];
let currentAppFilter = 'all';
let currentViewRoleId = null;

async function initCompanyDashboard() {
  const user = requireAuth('company');
  if (!user) return;

  /* Fill navbar */
  const el = document.getElementById('navCompanyName');
  if (el) el.textContent = user.companyName || user.name || '';

  /* Fill company header card */
  setEl('companyNameDisplay', user.companyName || '');
  setEl('companyIndustry',    user.industry    || '');
  setEl('companyLocation',    user.location    || '');
  setEl('companyEmail',       user.email       || '');

  const avatarEl = document.getElementById('companyAvatarLg');
  if (avatarEl) {
    const initials = getInitials(user.companyName || user.name || '');
    avatarEl.textContent = initials;
    avatarEl.style.background = avatarGrad(user.companyName || '');
  }

  const websiteWrap = document.getElementById('companyWebsiteWrap');
  const websiteLink = document.getElementById('companyWebsite');
  if (user.website && websiteWrap && websiteLink) {
    websiteLink.href = user.website;
    websiteWrap.style.display = 'flex';
  }

  /* Load roles */
  await loadCompanyRoles();

  /* Search */
  document.getElementById('roleSearch')?.addEventListener('input', ()=>renderRoles());

  /* Delete confirm */
  document.getElementById('confirmDeleteRoleBtn')?.addEventListener('click', confirmDeleteRole);
}

async function loadCompanyRoles() {
  showLoading('Loading your roles...');
  try {
    const res = await api('/roles/mine');
    companyRoles = res.data || [];
    hideLoading();
    updateCompanyStats();
    renderRoles();
  } catch(err) {
    hideLoading();
    showServerOffline(document.getElementById('rolesGrid'), err.message);
  }
}

function updateCompanyStats() {
  let totalApps=0, pending=0, selected=0;
  companyRoles.forEach(r=>{
    totalApps += r.applicationCount || 0;
    pending   += r.pendingCount     || 0;
    selected  += r.selectedCount    || 0;
  });
  setEl('statRoles',    companyRoles.length);
  setEl('statApps',     totalApps);
  setEl('statPending',  pending);
  setEl('statSelected', selected);
}

function renderRoles() {
  const grid  = document.getElementById('rolesGrid');
  const empty = document.getElementById('rolesEmpty');
  if (!grid) return;

  const search = (document.getElementById('roleSearch')?.value||'').toLowerCase();
  const sort   = document.getElementById('roleSort')?.value || 'newest';

  let roles = [...companyRoles];

  if (search) {
    roles = roles.filter(r=>
      r.title.toLowerCase().includes(search) ||
      r.domain.toLowerCase().includes(search)
    );
  }

  if (sort==='newest')  roles.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if (sort==='oldest')  roles.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  if (sort==='apps')    roles.sort((a,b)=>(b.applicationCount||0)-(a.applicationCount||0));

  if (companyRoles.length===0) {
    grid.innerHTML='';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  grid.innerHTML = roles.map(r=>companyRoleCardHTML(r)).join('');
}

function companyRoleCardHTML(r) {
  const skills = (r.skills||'').split(',').slice(0,4).map(s=>`<span class="skill-chip">${sanitize(s.trim())}</span>`).join('');
  const statusBadge = r.isOpen
    ? '<span class="badge badge-green">● Open</span>'
    : '<span class="badge badge-red">Closed</span>';
  return `
    <div class="role-card" data-id="${r._id}">
      <div class="role-card-top">
        <div>
          <div class="role-title">${sanitize(r.title)}</div>
          <div class="role-company" style="color:var(--muted)">${sanitize(r.domain)}</div>
        </div>
        ${statusBadge}
      </div>
      <div class="role-meta">
        <span class="role-meta-item">📍 ${sanitize(r.location)}</span>
        <span class="role-meta-item">⏱️ ${sanitize(r.duration)}</span>
        <span class="role-meta-item">💰 ${sanitize(r.stipend)}</span>
        <span class="role-meta-item">👥 ${r.openings} opening${r.openings!==1?'s':''}</span>
        <span class="role-meta-item">🗓️ ${daysLeft(r.deadline)}</span>
      </div>
      <p class="role-desc">${sanitize(r.description)}</p>
      <div class="role-skills">${skills}</div>
      <div class="role-footer">
        <span class="role-applicants">👤 ${r.applicationCount||0} applicant${(r.applicationCount||0)!==1?'s':''}</span>
        <div class="role-actions">
          <button class="btn btn-secondary btn-sm" onclick="openApplicantsModal('${r._id}')">
            View Applicants
          </button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteRoleModal('${r._id}')">
            Delete
          </button>
        </div>
      </div>
    </div>`;
}

/* Applicants modal */
let modalApplicants = [];
async function openApplicantsModal(roleId) {
  currentViewRoleId = roleId;
  currentAppFilter  = 'all';
  const role = companyRoles.find(r=>r._id===roleId);
  setEl('applicantsModalTitle', role?.title || 'Applicants');
  setEl('applicantsModalSub',   `${role?.applicationCount||0} applicant(s) — ${sanitize(role?.domain||'')}`);

  document.getElementById('applicantsModal')?.classList.remove('hidden');
  document.getElementById('applicantsOverlay')?.classList.remove('hidden');
  document.body.style.overflow='hidden';

  /* Reset filter buttons */
  document.querySelectorAll('[data-afilter]').forEach(b=>b.classList.toggle('active',b.dataset.afilter==='all'));

  showLoading('Loading applicants...');
  try {
    const res = await api(`/applications/role/${roleId}`);
    modalApplicants = res.data || [];
    hideLoading();
    renderApplicantsList();
  } catch(err) {
    hideLoading();
    toast('Failed to load applicants: '+err.message,'error');
  }
}

function closeApplicantsModal() {
  document.getElementById('applicantsModal')?.classList.add('hidden');
  document.getElementById('applicantsOverlay')?.classList.add('hidden');
  document.body.style.overflow='';
}

function setAppFilter(btn, filter) {
  currentAppFilter = filter;
  document.querySelectorAll('[data-afilter]').forEach(b=>b.classList.toggle('active',b.dataset.afilter===filter));
  renderApplicantsList();
}

function renderApplicantsList() {
  const listEl  = document.getElementById('applicantsList');
  const emptyEl = document.getElementById('applicantsEmpty');
  if (!listEl) return;

  let apps = [...modalApplicants];
  if (currentAppFilter !== 'all') apps = apps.filter(a=>a.status===currentAppFilter);

  if (apps.length===0) {
    listEl.innerHTML='';
    emptyEl?.classList.remove('hidden');
    return;
  }
  emptyEl?.classList.add('hidden');

  listEl.innerHTML = apps.map(a=>applicantRowHTML(a)).join('');
}

function applicantRowHTML(a) {
  const statusMap = {
    Pending:     'badge-amber',
    Shortlisted: 'badge-teal',
    Selected:    'badge-green',
    Rejected:    'badge-red',
  };
  const badgeClass = statusMap[a.status] || 'badge-amber';

  return `
    <div class="applicant-row">
      <div class="avatar avatar-sm" style="background:${avatarGrad(a.applicantName||'')}">
        ${getInitials(a.applicantName||'')}
      </div>
      <div class="applicant-info">
        <div class="applicant-name">${sanitize(a.applicantName)}</div>
        <div class="applicant-detail">${sanitize(a.applicantEmail)} · ${sanitize(a.college||'')} · ${sanitize(a.phone||'')}</div>
        <div class="applicant-detail" style="margin-top:2px">
          <strong>Skills:</strong> ${sanitize(a.skills||'')}
        </div>
        <div class="applicant-detail" style="margin-top:4px;color:var(--muted);font-size:11px">
          Resume: ${sanitize((a.resume||'').substring(0,120))}${(a.resume||'').length>120?'…':''}
        </div>
      </div>
      <div class="applicant-actions">
        <span class="badge ${badgeClass}">${a.status}</span>
        <select class="btn btn-secondary btn-sm" style="padding:6px 10px;font-size:12px"
          onchange="changeAppStatus('${a._id}', this.value, this)">
          <option value="Pending"     ${a.status==='Pending'     ?'selected':''}>⏳ Pending</option>
          <option value="Shortlisted" ${a.status==='Shortlisted' ?'selected':''}>⭐ Shortlisted</option>
          <option value="Selected"    ${a.status==='Selected'    ?'selected':''}>✅ Selected</option>
          <option value="Rejected"    ${a.status==='Rejected'    ?'selected':''}>❌ Rejected</option>
        </select>
      </div>
    </div>`;
}

async function changeAppStatus(appId, newStatus, selectEl) {
  try {
    await api(`/applications/${appId}/status`, {
      method:'PUT', body:JSON.stringify({status:newStatus})
    });
    /* Update in-memory */
    const app = modalApplicants.find(a=>a._id===appId);
    if (app) app.status = newStatus;
    renderApplicantsList();
    await loadCompanyRoles(); /* refresh stats */
    toast(`Status updated to ${newStatus}`,'success');
  } catch(err) {
    toast('Failed: '+err.message,'error');
    selectEl.value = modalApplicants.find(a=>a._id===appId)?.status || 'Pending';
  }
}

/* Delete role */
let pendingDeleteRoleId = null;
function openDeleteRoleModal(roleId) {
  pendingDeleteRoleId = roleId;
  document.getElementById('deleteRoleModal')?.classList.remove('hidden');
  document.getElementById('deleteRoleOverlay')?.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeDeleteRoleModal() {
  document.getElementById('deleteRoleModal')?.classList.add('hidden');
  document.getElementById('deleteRoleOverlay')?.classList.add('hidden');
  document.body.style.overflow='';
}
async function confirmDeleteRole() {
  if (!pendingDeleteRoleId) return;
  showLoading('Deleting role...');
  try {
    await api(`/roles/${pendingDeleteRoleId}`, { method:'DELETE' });
    hideLoading();
    closeDeleteRoleModal();
    toast('Role deleted.','error');
    await loadCompanyRoles();
  } catch(err) {
    hideLoading();
    toast('Delete failed: '+err.message,'error');
  }
  pendingDeleteRoleId=null;
}

/* ================================================================
   PAGE: POST ROLE
   ================================================================ */
async function initPostRole() {
  const user = requireAuth('company');
  if (!user) return;

  const el = document.getElementById('navCompanyName');
  if (el) el.textContent = user.companyName || '';

  /* Set min date for deadline to tomorrow */
  const deadlineEl = document.getElementById('roleDeadline');
  if (deadlineEl) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    deadlineEl.min = tomorrow.toISOString().split('T')[0];
  }

  /* Char counter for description */
  const descEl   = document.getElementById('roleDesc');
  const countEl  = document.getElementById('descCount');
  if (descEl && countEl) {
    descEl.addEventListener('input',()=>{ countEl.textContent=descEl.value.length; });
  }

  document.getElementById('postRoleForm').addEventListener('submit', handlePostRole);
}

async function handlePostRole(e) {
  e.preventDefault();
  clearAllErrors();
  const errEl = document.getElementById('postServerErr');
  errEl.classList.add('hidden');

  const title     = document.getElementById('roleTitle').value.trim();
  const domain    = document.getElementById('roleDomain').value;
  const location  = document.getElementById('roleLocation').value;
  const duration  = document.getElementById('roleDuration').value;
  const stipend   = document.getElementById('roleStipend').value.trim();
  const openings  = document.getElementById('roleOpenings').value;
  const deadline  = document.getElementById('roleDeadline').value;
  const skills    = document.getElementById('roleSkills').value.trim();
  const desc      = document.getElementById('roleDesc').value.trim();

  let ok = true;
  if (!title)    { showErr('roleTitleErr',   'Role title is required.');     ok=false; }
  if (!domain)   { showErr('roleDomainErr',  'Select a domain.');            ok=false; }
  if (!location) { showErr('roleLocationErr','Select a work location.');     ok=false; }
  if (!duration) { showErr('roleDurationErr','Select duration.');            ok=false; }
  if (!stipend)  { showErr('roleStipendErr', 'Enter stipend or "Unpaid".'); ok=false; }
  if (!openings||isNaN(openings)||openings<1) { showErr('roleOpeningsErr','Enter valid number of openings.'); ok=false; }
  if (!deadline) { showErr('roleDeadlineErr','Select application deadline.'); ok=false; }
  if (!skills)   { showErr('roleSkillsErr',  'List at least one skill.');    ok=false; }
  if (!desc || desc.length<30) { showErr('roleDescErr','Write at least 30 characters.'); ok=false; }
  if (!ok) return;

  const btn = document.getElementById('postRoleBtn');
  btn.disabled=true; btn.textContent='Posting...';
  showLoading('Publishing your role...');

  try {
    await api('/roles', {
      method:'POST',
      body: JSON.stringify({ title,domain,location,duration,stipend,openings:Number(openings),deadline,skills,description:desc })
    });
    hideLoading();
    document.getElementById('postSuccessModal')?.classList.remove('hidden');
    document.getElementById('postSuccessOverlay')?.classList.remove('hidden');
    document.body.style.overflow='hidden';
  } catch(err) {
    hideLoading();
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled=false; btn.textContent='Post Role →';
  }
}

function resetPostForm() {
  document.getElementById('postRoleForm')?.reset();
  document.getElementById('descCount') && (document.getElementById('descCount').textContent='0');
  document.getElementById('postSuccessModal')?.classList.add('hidden');
  document.getElementById('postSuccessOverlay')?.classList.add('hidden');
  document.body.style.overflow='';
}

/* ================================================================
   PAGE: APPLICANT DASHBOARD
   ================================================================ */
let allRoles       = [];
let myApplications = [];
let browseDomain   = 'all';
let myAppFilter    = 'all';

async function initApplicantDashboard() {
  const user = requireAuth('applicant');
  if (!user) return;

  /* Fill welcome bar */
  const nameEl  = document.getElementById('welcomeName');
  const emailEl = document.getElementById('welcomeEmail');
  const avEl    = document.getElementById('welcomeAvatar');
  const navEl   = document.getElementById('navApplicantName');

  if (nameEl)  nameEl.textContent  = 'Welcome, ' + (user.name||'Applicant') + '!';
  if (emailEl) emailEl.textContent = user.email || '';
  if (avEl)    { avEl.textContent=getInitials(user.name||''); avEl.style.background=avatarGrad(user.name||''); }
  if (navEl)   navEl.textContent = user.name || '';

  /* Load data in parallel */
  showLoading('Loading dashboard...');
  try {
    const [rolesRes, appsRes] = await Promise.all([
      api('/roles'),
      api('/applications/mine')
    ]);
    allRoles       = rolesRes.data  || [];
    myApplications = appsRes.data   || [];
    hideLoading();
    updateApplicantStats();
    renderBrowse();
    renderMyApps();
  } catch(err) {
    hideLoading();
    showServerOffline(document.getElementById('browseGrid'), err.message);
  }

  /* Search */
  const searchEl = document.getElementById('browseSearch');
  if (searchEl) {
    let timer;
    searchEl.addEventListener('input', ()=>{
      document.getElementById('browseClear')?.classList.toggle('hidden', !searchEl.value);
      clearTimeout(timer); timer=setTimeout(renderBrowse,300);
    });
  }

  /* Apply form */
  document.getElementById('applyForm')?.addEventListener('submit', handleApply);

  /* Resume char counter */
  const resumeEl = document.getElementById('applyResume');
  const cntEl    = document.getElementById('applyCharCount');
  if (resumeEl && cntEl) {
    resumeEl.addEventListener('input',()=>{ cntEl.textContent=resumeEl.value.length; });
  }
}

function updateApplicantStats() {
  const total    = myApplications.length;
  const selected = myApplications.filter(a=>a.status==='Selected').length;
  const pending  = myApplications.filter(a=>a.status==='Pending').length;
  setEl('wStatTotal',    total);
  setEl('wStatSelected', selected);
  setEl('wStatPending',  pending);
}

function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+tabName)?.classList.add('active');
  if (btn) btn.classList.add('active');
}

function setDomainFilter(btn, domain) {
  browseDomain = domain;
  document.querySelectorAll('[data-domain]').forEach(b=>b.classList.toggle('active',b.dataset.domain===domain));
  renderBrowse();
}

function clearBrowseSearch() {
  const el = document.getElementById('browseSearch');
  if (el) el.value='';
  document.getElementById('browseClear')?.classList.add('hidden');
  renderBrowse();
}

function renderBrowse() {
  const grid       = document.getElementById('browseGrid');
  const emptyEl    = document.getElementById('browseEmpty');
  const noResultEl = document.getElementById('browseNoResults');
  if (!grid) return;

  const search = (document.getElementById('browseSearch')?.value||'').toLowerCase();
  const sort   = document.getElementById('browseSort')?.value || 'newest';
  const appliedRoleIds = new Set(myApplications.map(a=>a.roleId));

  let roles = allRoles.filter(r=>r.isOpen!==false);

  if (browseDomain!=='all') roles=roles.filter(r=>r.domain===browseDomain);
  if (search) roles=roles.filter(r=>
    r.title.toLowerCase().includes(search)||
    r.companyName.toLowerCase().includes(search)||
    (r.skills||'').toLowerCase().includes(search)||
    r.domain.toLowerCase().includes(search)
  );

  if (sort==='newest')   roles.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if (sort==='deadline') roles.sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));

  if (allRoles.length===0) {
    grid.innerHTML=''; emptyEl?.classList.remove('hidden'); noResultEl?.classList.add('hidden'); return;
  }
  emptyEl?.classList.add('hidden');
  if (roles.length===0) {
    grid.innerHTML=''; noResultEl?.classList.remove('hidden'); return;
  }
  noResultEl?.classList.add('hidden');

  grid.innerHTML = roles.map((r,i)=>applyCardHTML(r, appliedRoleIds.has(r._id), i)).join('');
}

function applyCardHTML(r, alreadyApplied, i) {
  const skills = (r.skills||'').split(',').slice(0,4).map(s=>`<span class="skill-chip">${sanitize(s.trim())}</span>`).join('');
  const compInit = getInitials(r.companyName||'');
  const compGrad = avatarGrad(r.companyName||'');
  const delay    = `animation-delay:${i*0.05}s`;

  return `
    <div class="apply-card" style="${delay}">
      <div class="apply-card-header">
        <div class="company-logo" style="background:${compGrad}">${compInit}</div>
        <div>
          <div class="apply-card-title">${sanitize(r.title)}</div>
          <div class="apply-card-company">${sanitize(r.companyName)}</div>
        </div>
      </div>
      <div class="apply-card-body">
        <div class="role-meta" style="margin-bottom:10px">
          <span class="role-meta-item">📍 ${sanitize(r.location)}</span>
          <span class="role-meta-item">⏱️ ${sanitize(r.duration)}</span>
          <span class="role-meta-item">💰 ${sanitize(r.stipend)}</span>
          <span class="role-meta-item">🗓️ ${daysLeft(r.deadline)}</span>
        </div>
        <p class="apply-card-desc">${sanitize(r.description)}</p>
        <div class="role-skills">${skills}</div>
      </div>
      <div class="apply-card-footer">
        <span style="font-size:12px;color:var(--muted)">
          👤 ${r.applicationCount||0} applied · Posted ${formatDate(r.createdAt)}
        </span>
        ${alreadyApplied
          ? '<span class="badge badge-purple">✓ Applied</span>'
          : `<button class="btn btn-primary btn-sm" onclick="openApplyModal('${r._id}')">Apply Now →</button>`
        }
      </div>
    </div>`;
}

function setMyAppFilter(btn, filter) {
  myAppFilter=filter;
  document.querySelectorAll('#tab-myapps .filter-btn').forEach(b=>b.classList.toggle('active',b===btn));
  renderMyApps();
}

function renderMyApps() {
  const listEl      = document.getElementById('myAppsList');
  const emptyEl     = document.getElementById('myAppsEmpty');
  const noResultEl  = document.getElementById('myAppsNoResults');
  if (!listEl) return;

  let apps = [...myApplications];
  if (myAppFilter!=='all') apps=apps.filter(a=>a.status===myAppFilter);

  if (myApplications.length===0) {
    listEl.innerHTML=''; emptyEl?.classList.remove('hidden'); noResultEl?.classList.add('hidden'); return;
  }
  emptyEl?.classList.add('hidden');
  if (apps.length===0) {
    listEl.innerHTML=''; noResultEl?.classList.remove('hidden'); return;
  }
  noResultEl?.classList.add('hidden');

  const statusMap = { Pending:'badge-amber', Shortlisted:'badge-teal', Selected:'badge-green', Rejected:'badge-red' };
  listEl.innerHTML = apps.map((a,i)=>`
    <div class="my-app-row" style="animation-delay:${i*0.04}s">
      <div class="avatar avatar-sm" style="background:${avatarGrad(a.roleTitle||'')}">
        ${getInitials(a.roleTitle||'')}
      </div>
      <div class="my-app-info">
        <div class="my-app-role">${sanitize(a.roleTitle)}</div>
        <div class="my-app-company">${sanitize(a.companyName)} · ${sanitize(a.domain||'')}</div>
      </div>
      <div class="my-app-date">${formatDate(a.createdAt)}</div>
      <span class="badge ${statusMap[a.status]||'badge-amber'}">${a.status}</span>
    </div>`).join('');
}

/* Apply modal */
let applyingRoleId = null;
function openApplyModal(roleId) {
  applyingRoleId = roleId;
  const role = allRoles.find(r=>r._id===roleId);
  if (!role) return;

  const infoEl = document.getElementById('applyModalRoleInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="apply-modal-role-title">${sanitize(role.title)}</div>
      <div class="apply-modal-role-company">${sanitize(role.companyName)} · ${sanitize(role.domain)}</div>`;
  }
  document.getElementById('applyRoleId').value = roleId;
  document.getElementById('applyForm')?.reset();
  document.getElementById('applyCharCount') && (document.getElementById('applyCharCount').textContent='0');
  document.getElementById('applyServerErr')?.classList.add('hidden');
  clearAllErrors();

  document.getElementById('applyModal')?.classList.remove('hidden');
  document.getElementById('applyOverlay')?.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeApplyModal() {
  document.getElementById('applyModal')?.classList.add('hidden');
  document.getElementById('applyOverlay')?.classList.add('hidden');
  document.body.style.overflow='';
}

async function handleApply(e) {
  e.preventDefault();
  clearAllErrors();
  const errEl = document.getElementById('applyServerErr');
  errEl.classList.add('hidden');

  const skills  = document.getElementById('applySkills').value.trim();
  const phone   = document.getElementById('applyPhone').value.trim();
  const college = document.getElementById('applyCollege').value.trim();
  const resume  = document.getElementById('applyResume').value.trim();
  const roleId  = document.getElementById('applyRoleId').value;

  let ok=true;
  if (!skills)                      { showErr('applySkillsErr','List your relevant skills.');           ok=false; }
  if (!/^[6-9]\d{9}$/.test(phone)) { showErr('applyPhoneErr','Enter valid 10-digit Indian number.');  ok=false; }
  if (!college||college.length<3)   { showErr('applyCollegeErr','Enter your college name.');           ok=false; }
  if (!resume||resume.length<50)    { showErr('applyResumeErr','Write at least 50 characters.');       ok=false; }
  if (!ok) return;

  const btn=document.getElementById('applySubmitBtn');
  btn.disabled=true; btn.textContent='Submitting...';
  showLoading('Submitting application...');

  try {
    const res = await api('/applications', {
      method:'POST',
      body: JSON.stringify({ roleId, skills, phone, college, resume })
    });
    hideLoading();
    closeApplyModal();
    /* Add to myApplications in memory so UI updates instantly */
    myApplications.push(res.data);
    updateApplicantStats();
    renderBrowse();
    renderMyApps();
    /* Show success popup */
    document.getElementById('applySuccessModal')?.classList.remove('hidden');
    document.getElementById('applySuccessOverlay')?.classList.remove('hidden');
    document.body.style.overflow='hidden';
  } catch(err) {
    hideLoading();
    errEl.textContent=err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled=false; btn.textContent='Submit Application →';
  }
}

function closeApplySuccess() {
  document.getElementById('applySuccessModal')?.classList.add('hidden');
  document.getElementById('applySuccessOverlay')?.classList.add('hidden');
  document.body.style.overflow='';
  switchTab('myapps', document.querySelectorAll('.tab-btn')[1]);
}

/* ================================================================
   SHARED HELPERS
   ================================================================ */
function setEl(id, val) {
  const el=document.getElementById(id); if(el) el.textContent=val;
}
function showErr(id, msg) {
  const el=document.getElementById(id); if(el) el.textContent=msg;
}
function clearAllErrors() {
  document.querySelectorAll('.error-msg').forEach(el=>el.textContent='');
  document.querySelectorAll('.form-input').forEach(el=>el.classList.remove('valid','invalid'));
}

function showServerOffline(container, msg) {
  if (!container) return;
  container.innerHTML=`
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)">
      <div style="font-size:48px;margin-bottom:14px">🔌</div>
      <h3 style="font-family:var(--font-h);color:var(--text);margin-bottom:8px">Server Not Connected</h3>
      <p style="margin-bottom:20px;white-space:pre-line;font-size:13px">${sanitize(msg)}</p>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;
                  padding:18px;display:inline-block;text-align:left;font-size:13px;line-height:2">
        <b style="color:var(--accent)">To start Flask:</b><br>
        1. Open terminal<br>
        2. <code style="color:var(--accent-2);background:rgba(0,0,0,0.3);padding:1px 6px;border-radius:4px">cd backend</code><br>
        3. <code style="color:var(--accent-2);background:rgba(0,0,0,0.3);padding:1px 6px;border-radius:4px">python app.py</code>
      </div>
      <br><br>
      <button onclick="location.reload()" class="btn btn-primary">🔄 Retry</button>
    </div>`;
}

/* Escape key closes modals */
document.addEventListener('keydown', e=>{
  if (e.key!=='Escape') return;
  closeApplicantsModal?.(); closeApplyModal?.(); closeDeleteRoleModal?.();
  document.getElementById('postSuccessModal')?.classList.add('hidden');
  document.getElementById('postSuccessOverlay')?.classList.add('hidden');
  document.body.style.overflow='';
});

/* ================================================================
   INIT — detect page and run the right function
   ================================================================ */
document.addEventListener('DOMContentLoaded', ()=>{
  initNavbar();
  if (PAGE==='login.html'                || PAGE==='') initLogin();
  else if (PAGE==='register.html')                     initRegister();
  else if (PAGE==='company-dashboard.html')            initCompanyDashboard();
  else if (PAGE==='post-role.html')                    initPostRole();
  else if (PAGE==='applicant-dashboard.html')          initApplicantDashboard();
  /* index.html needs no JS init */
});
