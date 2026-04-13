/**
 * PHARMACIE EBEMA — Application Logic
 * Vanilla JS, no framework — data stored in localStorage
 */

'use strict';

/* ============================================================
   STORAGE HELPERS
   ============================================================ */
const DB_KEYS = {
  medicaments:  'ebema_medicaments',
  ventes:       'ebema_ventes',
  fournisseurs: 'ebema_fournisseurs',
};

function dbGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}

function dbSet(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = 'success') {
  const el = document.getElementById('appToast');
  el.className = `toast align-items-center border-0 toast-${type}`;
  document.getElementById('toastMessage').textContent = message;
  const t = bootstrap.Toast.getOrCreateInstance(el, { delay: 3000 });
  t.show();
}

/* ============================================================
   CLOCK
   ============================================================ */
function updateClock() {
  const now = new Date();
  document.getElementById('clockDisplay').textContent =
    now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* ============================================================
   NAVIGATION
   ============================================================ */
const pages = ['dashboard', 'medicaments', 'stock', 'ventes', 'historique', 'fournisseurs'];
const pageTitles = {
  dashboard:   'Tableau de bord',
  medicaments: 'Médicaments',
  stock:       'Gestion du stock',
  ventes:      'Caisse — Nouvelle vente',
  historique:  'Historique des ventes',
  fournisseurs:'Fournisseurs',
};

function showPage(page) {
  pages.forEach(p => {
    const section = document.getElementById(`page-${p}`);
    const link    = document.querySelector(`[data-page="${p}"]`);
    if (section) section.classList.toggle('d-none', p !== page);
    if (link)    link.classList.toggle('active', p === page);
  });
  document.getElementById('pageTitle').textContent = pageTitles[page] || page;

  // Refresh relevant page data
  if (page === 'dashboard')    renderDashboard();
  if (page === 'medicaments')  renderMedicaments();
  if (page === 'stock')        renderStock();
  if (page === 'ventes')       populateVenteSelect();
  if (page === 'historique')   renderHistorique();
  if (page === 'fournisseurs') renderFournisseurs();
}

/* ============================================================
   FORMAT HELPERS
   ============================================================ */
function formatCurrency(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FC'; }

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  const medicaments = dbGet(DB_KEYS.medicaments);
  const ventes      = dbGet(DB_KEYS.ventes);
  const today       = new Date().toLocaleDateString('fr-FR');

  const ventesAujourdHui = ventes.filter(v => {
    const d = new Date(v.date).toLocaleDateString('fr-FR');
    return d === today;
  });

  const totalJour = ventesAujourdHui.reduce((s, v) => s + (v.total || 0), 0);
  const alertes   = medicaments.filter(m => (m.quantite || 0) <= (m.seuil || 0));

  document.getElementById('kpi-ventes-jour').textContent  = formatCurrency(totalJour);
  document.getElementById('kpi-medicaments').textContent  = medicaments.length;
  document.getElementById('kpi-alertes').textContent      = alertes.length;
  document.getElementById('kpi-transactions').textContent = ventesAujourdHui.length;

  const tbody = document.getElementById('tbody-alertes');
  if (alertes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">Aucune alerte</td></tr>';
    return;
  }
  tbody.innerHTML = alertes.map(m => `
    <tr>
      <td>${escHtml(m.nom)}</td>
      <td>${escHtml(m.categorie)}</td>
      <td><span class="badge ${m.quantite === 0 ? 'badge-empty' : 'badge-low'}">${m.quantite}</span></td>
      <td>${m.seuil}</td>
    </tr>`).join('');
}

/* ============================================================
   MEDICAMENTS
   ============================================================ */
let currentMedId = null;

function renderMedicaments(filter = '') {
  let meds = dbGet(DB_KEYS.medicaments);
  if (filter) {
    const q = filter.toLowerCase();
    meds = meds.filter(m =>
      m.nom.toLowerCase().includes(q) ||
      (m.categorie || '').toLowerCase().includes(q)
    );
  }
  const tbody = document.getElementById('tbody-medicaments');
  if (meds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Aucun médicament enregistré</td></tr>';
    return;
  }
  tbody.innerHTML = meds.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="fw-semibold">${escHtml(m.nom)}</td>
      <td>${escHtml(m.categorie)}</td>
      <td>${escHtml(m.forme)}</td>
      <td>${(m.prix || 0).toLocaleString('fr-FR')}</td>
      <td>
        <span class="badge ${stockBadgeClass(m)}">${m.quantite}</span>
      </td>
      <td>${m.seuil}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editMedicament('${m.id}')">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteMedicament('${m.id}')">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

function stockBadgeClass(m) {
  if (m.quantite === 0) return 'badge-empty';
  if (m.quantite <= m.seuil) return 'badge-low';
  return 'badge-ok';
}

function openAddMedicament() {
  currentMedId = null;
  document.getElementById('modalMedicamentTitle').textContent = 'Ajouter un médicament';
  document.getElementById('formMedicament').reset();
  document.getElementById('medId').value = '';
  document.getElementById('medSeuil').value = 5;
  document.getElementById('medQuantite').value = 0;
}

function editMedicament(id) {
  const meds = dbGet(DB_KEYS.medicaments);
  const m    = meds.find(x => x.id === id);
  if (!m) return;
  currentMedId = id;
  document.getElementById('modalMedicamentTitle').textContent = 'Modifier un médicament';
  document.getElementById('medId').value          = m.id;
  document.getElementById('medNom').value         = m.nom;
  document.getElementById('medCategorie').value   = m.categorie;
  document.getElementById('medForme').value       = m.forme;
  document.getElementById('medPrix').value        = m.prix;
  document.getElementById('medQuantite').value    = m.quantite;
  document.getElementById('medSeuil').value       = m.seuil;
  document.getElementById('medDescription').value = m.description || '';
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalMedicament'));
  modal.show();
}

function deleteMedicament(id) {
  if (!confirm('Supprimer ce médicament ?')) return;
  const meds = dbGet(DB_KEYS.medicaments).filter(m => m.id !== id);
  dbSet(DB_KEYS.medicaments, meds);
  renderMedicaments(document.getElementById('searchMedicament').value);
  showToast('Médicament supprimé.', 'error');
}

document.getElementById('formMedicament').addEventListener('submit', function (e) {
  e.preventDefault();
  const meds = dbGet(DB_KEYS.medicaments);
  const id   = document.getElementById('medId').value || generateId();
  const med  = {
    id,
    nom:         document.getElementById('medNom').value.trim(),
    categorie:   document.getElementById('medCategorie').value,
    forme:       document.getElementById('medForme').value,
    prix:        parseFloat(document.getElementById('medPrix').value) || 0,
    quantite:    parseInt(document.getElementById('medQuantite').value, 10) || 0,
    seuil:       parseInt(document.getElementById('medSeuil').value, 10) || 0,
    description: document.getElementById('medDescription').value.trim(),
  };
  if (!med.nom) { showToast('Le nom du médicament est obligatoire.', 'error'); return; }
  if (med.prix < 0) { showToast('Le prix ne peut pas être négatif.', 'error'); return; }

  const idx = meds.findIndex(m => m.id === id);
  if (idx >= 0) meds[idx] = med; else meds.push(med);
  dbSet(DB_KEYS.medicaments, meds);

  bootstrap.Modal.getInstance(document.getElementById('modalMedicament')).hide();
  renderMedicaments(document.getElementById('searchMedicament').value);
  showToast(idx >= 0 ? 'Médicament mis à jour.' : 'Médicament ajouté.', 'success');
});

document.getElementById('btnAddMedicament').addEventListener('click', openAddMedicament);
document.getElementById('searchMedicament').addEventListener('input', function () {
  renderMedicaments(this.value);
});

/* ============================================================
   STOCK
   ============================================================ */
function renderStock() {
  const meds  = dbGet(DB_KEYS.medicaments);
  const tbody = document.getElementById('tbody-stock');
  if (meds.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Aucun produit</td></tr>';
    return;
  }
  tbody.innerHTML = meds.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="fw-semibold">${escHtml(m.nom)}</td>
      <td>${escHtml(m.categorie)}</td>
      <td>${m.quantite}</td>
      <td>${m.seuil}</td>
      <td><span class="badge ${stockBadgeClass(m)}">${stockLabel(m)}</span></td>
    </tr>`).join('');

  // Populate stock modal select
  const sel = document.getElementById('stockMedSelect');
  sel.innerHTML = '<option value="">-- Choisir --</option>' +
    meds.map(m => `<option value="${m.id}">${escHtml(m.nom)} (stock: ${m.quantite})</option>`).join('');
}

function stockLabel(m) {
  if (m.quantite === 0) return 'Rupture';
  if (m.quantite <= m.seuil) return 'Stock bas';
  return 'Disponible';
}

document.getElementById('formEntreeStock').addEventListener('submit', function (e) {
  e.preventDefault();
  const id  = document.getElementById('stockMedSelect').value;
  const qte = parseInt(document.getElementById('stockQte').value, 10);
  if (!id || qte <= 0) { showToast('Sélectionnez un médicament et une quantité valide.', 'error'); return; }

  const meds = dbGet(DB_KEYS.medicaments);
  const idx  = meds.findIndex(m => m.id === id);
  if (idx < 0) return;
  meds[idx].quantite = (meds[idx].quantite || 0) + qte;
  dbSet(DB_KEYS.medicaments, meds);

  bootstrap.Modal.getInstance(document.getElementById('modalEntreeStock')).hide();
  this.reset();
  renderStock();
  showToast(`+${qte} unités ajoutées au stock.`, 'success');
});

/* ============================================================
   VENTES (CAISSE)
   ============================================================ */
let panier = [];

function populateVenteSelect() {
  const meds = dbGet(DB_KEYS.medicaments).filter(m => m.quantite > 0);
  const sel  = document.getElementById('selectMedicamentVente');
  sel.innerHTML = '<option value="">-- Choisir un médicament --</option>' +
    meds.map(m => `<option value="${m.id}" data-prix="${m.prix}">${escHtml(m.nom)} — ${m.prix.toLocaleString('fr-FR')} FC (qté: ${m.quantite})</option>`).join('');
}

function renderPanier() {
  const tbody = document.getElementById('tbody-panier');
  const emptyRow = document.getElementById('panier-empty');
  if (panier.length === 0) {
    tbody.innerHTML = '<tr id="panier-empty"><td colspan="5" class="text-center text-muted py-2">Panier vide</td></tr>';
    updateTotals();
    return;
  }
  tbody.innerHTML = panier.map((item, i) => `
    <tr>
      <td>${escHtml(item.nom)}</td>
      <td>${item.qte}</td>
      <td>${item.prix.toLocaleString('fr-FR')}</td>
      <td class="fw-semibold">${(item.qte * item.prix).toLocaleString('fr-FR')}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${i})">
          <i class="bi bi-x"></i>
        </button>
      </td>
    </tr>`).join('');
  updateTotals();
}

function removeFromCart(i) {
  panier.splice(i, 1);
  renderPanier();
}

function updateTotals() {
  const total = panier.reduce((s, item) => s + item.qte * item.prix, 0);
  document.getElementById('sous-total').textContent  = formatCurrency(total);
  document.getElementById('total-vente').textContent = formatCurrency(total);
  const recu  = parseFloat(document.getElementById('montantRecu').value) || 0;
  const rendu = recu - total;
  const el    = document.getElementById('rendu-monnaie');
  el.textContent = formatCurrency(Math.max(0, rendu));
  el.className   = rendu < 0
    ? 'col-6 text-end fw-bold text-danger'
    : 'col-6 text-end fw-bold text-primary';
}

document.getElementById('btnAddToCart').addEventListener('click', function () {
  const sel  = document.getElementById('selectMedicamentVente');
  const qte  = parseInt(document.getElementById('qteVente').value, 10) || 1;
  const id   = sel.value;
  if (!id) { showToast('Sélectionnez un médicament.', 'error'); return; }

  const meds = dbGet(DB_KEYS.medicaments);
  const med  = meds.find(m => m.id === id);
  if (!med)               { showToast('Médicament introuvable.', 'error'); return; }
  if (med.quantite < qte) { showToast('Stock insuffisant.', 'error'); return; }

  const existing = panier.find(x => x.id === id);
  if (existing) {
    if (med.quantite < existing.qte + qte) { showToast('Stock insuffisant.', 'error'); return; }
    existing.qte += qte;
  } else {
    panier.push({ id: med.id, nom: med.nom, prix: med.prix, qte });
  }
  renderPanier();
  document.getElementById('qteVente').value = 1;
});

document.getElementById('montantRecu').addEventListener('input', updateTotals);

document.getElementById('btnValiderVente').addEventListener('click', function () {
  if (panier.length === 0) { showToast('Le panier est vide.', 'error'); return; }
  const total  = panier.reduce((s, x) => s + x.qte * x.prix, 0);
  const recu   = parseFloat(document.getElementById('montantRecu').value) || 0;
  if (recu < total) { showToast('Montant reçu insuffisant.', 'error'); return; }

  // Deduct stock
  const meds = dbGet(DB_KEYS.medicaments);
  panier.forEach(item => {
    const idx = meds.findIndex(m => m.id === item.id);
    if (idx >= 0) meds[idx].quantite = Math.max(0, meds[idx].quantite - item.qte);
  });
  dbSet(DB_KEYS.medicaments, meds);

  // Save sale
  const ventes = dbGet(DB_KEYS.ventes);
  ventes.unshift({
    id:      generateId(),
    date:    new Date().toISOString(),
    client:  document.getElementById('clientNom').value.trim() || 'Client',
    items:   [...panier],
    total,
    rendu:   recu - total,
  });
  dbSet(DB_KEYS.ventes, ventes);

  // Reset
  panier = [];
  renderPanier();
  document.getElementById('montantRecu').value = 0;
  document.getElementById('clientNom').value   = '';
  populateVenteSelect();
  showToast('Vente enregistrée avec succès !', 'success');
});

/* ============================================================
   HISTORIQUE
   ============================================================ */
function renderHistorique(filterDate = '') {
  let ventes = dbGet(DB_KEYS.ventes);
  if (filterDate) {
    ventes = ventes.filter(v => {
      const d = new Date(v.date).toLocaleDateString('fr-CA'); // YYYY-MM-DD
      return d === filterDate;
    });
  }
  const tbody = document.getElementById('tbody-historique');
  if (ventes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Aucune vente</td></tr>';
    return;
  }
  tbody.innerHTML = ventes.map((v, i) => {
    const produits = (v.items || []).map(x => `${escHtml(x.nom)} ×${x.qte}`).join(', ');
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${new Date(v.date).toLocaleString('fr-FR')}</td>
      <td>${escHtml(v.client)}</td>
      <td class="small">${produits}</td>
      <td class="fw-semibold">${(v.total || 0).toLocaleString('fr-FR')}</td>
    </tr>`;
  }).join('');
}

document.getElementById('filterDate').addEventListener('change', function () {
  renderHistorique(this.value);
});

document.getElementById('btnResetFilter').addEventListener('click', function () {
  document.getElementById('filterDate').value = '';
  renderHistorique();
});

document.getElementById('btnClearHistory').addEventListener('click', function () {
  if (!confirm('Vider tout l\'historique des ventes ?')) return;
  dbSet(DB_KEYS.ventes, []);
  renderHistorique();
  showToast('Historique vidé.', 'info');
});

/* ============================================================
   FOURNISSEURS
   ============================================================ */
function renderFournisseurs() {
  const fournisseurs = dbGet(DB_KEYS.fournisseurs);
  const grid = document.getElementById('grid-fournisseurs');
  if (fournisseurs.length === 0) {
    grid.innerHTML = '<div class="col-12 text-muted text-center py-3">Aucun fournisseur enregistré</div>';
    return;
  }
  grid.innerHTML = fournisseurs.map(f => `
    <div class="col-md-6 col-xl-4">
      <div class="card shadow-sm h-100">
        <div class="card-body">
          <h6 class="card-title fw-bold"><i class="bi bi-truck me-1 text-primary"></i>${escHtml(f.nom)}</h6>
          ${f.tel      ? `<p class="mb-1 small"><i class="bi bi-telephone me-1"></i>${escHtml(f.tel)}</p>` : ''}
          ${f.email    ? `<p class="mb-1 small"><i class="bi bi-envelope me-1"></i>${escHtml(f.email)}</p>` : ''}
          ${f.adresse  ? `<p class="mb-1 small"><i class="bi bi-geo-alt me-1"></i>${escHtml(f.adresse)}</p>` : ''}
          ${f.produits ? `<p class="mb-0 small text-muted">${escHtml(f.produits)}</p>` : ''}
        </div>
        <div class="card-footer bg-transparent d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="editFournisseur('${f.id}')">
            <i class="bi bi-pencil"></i> Modifier
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteFournisseur('${f.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>`).join('');
}

function editFournisseur(id) {
  const list = dbGet(DB_KEYS.fournisseurs);
  const f    = list.find(x => x.id === id);
  if (!f) return;
  document.getElementById('modalFournisseurTitle').textContent = 'Modifier un fournisseur';
  document.getElementById('fournId').value      = f.id;
  document.getElementById('fournNom').value     = f.nom;
  document.getElementById('fournTel').value     = f.tel || '';
  document.getElementById('fournEmail').value   = f.email || '';
  document.getElementById('fournAdresse').value = f.adresse || '';
  document.getElementById('fournProduits').value= f.produits || '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalFournisseur')).show();
}

function deleteFournisseur(id) {
  if (!confirm('Supprimer ce fournisseur ?')) return;
  const list = dbGet(DB_KEYS.fournisseurs).filter(f => f.id !== id);
  dbSet(DB_KEYS.fournisseurs, list);
  renderFournisseurs();
  showToast('Fournisseur supprimé.', 'error');
}

document.getElementById('formFournisseur').addEventListener('submit', function (e) {
  e.preventDefault();
  const list = dbGet(DB_KEYS.fournisseurs);
  const id   = document.getElementById('fournId').value || generateId();
  const f    = {
    id,
    nom:      document.getElementById('fournNom').value.trim(),
    tel:      document.getElementById('fournTel').value.trim(),
    email:    document.getElementById('fournEmail').value.trim(),
    adresse:  document.getElementById('fournAdresse').value.trim(),
    produits: document.getElementById('fournProduits').value.trim(),
  };
  if (!f.nom) { showToast('Le nom est obligatoire.', 'error'); return; }

  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = f; else list.push(f);
  dbSet(DB_KEYS.fournisseurs, list);

  bootstrap.Modal.getInstance(document.getElementById('modalFournisseur')).hide();
  this.reset();
  document.getElementById('fournId').value = '';
  document.getElementById('modalFournisseurTitle').textContent = 'Ajouter un fournisseur';
  renderFournisseurs();
  showToast(idx >= 0 ? 'Fournisseur mis à jour.' : 'Fournisseur ajouté.', 'success');
});

/* ============================================================
   XSS PROTECTION
   ============================================================ */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ============================================================
   SIDEBAR TOGGLE
   ============================================================ */
document.getElementById('toggleSidebar').addEventListener('click', function () {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  }
});

// Close sidebar on mobile when clicking a nav link
document.querySelectorAll('[data-page]').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    showPage(this.dataset.page);
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

/* ============================================================
   INIT
   ============================================================ */
(function init() {
  // Clock
  updateClock();
  setInterval(updateClock, 30000);

  // Initial page
  showPage('dashboard');
})();
