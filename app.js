// State Management
let favorites = JSON.parse(localStorage.getItem('pct_favorites')) || [];
let currentClass = null;
let expandedNodes = new Set(); // To remember tree state during session

// DOM Elements
const screens = {
  home: document.getElementById('screen-home'),
  search: document.getElementById('screen-search'),
  favorites: document.getElementById('screen-favorites'),
  classDetail: document.getElementById('screen-class-detail')
};

const headers = {
  main: document.getElementById('main-header'),
  nav: document.getElementById('nav-header'),
  title: document.getElementById('header-title'),
  navTitle: document.getElementById('nav-title')
};

const navItems = document.querySelectorAll('.nav-item');
const backBtn = document.getElementById('global-back');

// Initialization
function init() {
  renderHome();
  setupEventListeners();
  navigateTo('home');
}

// Event Listeners
function setupEventListeners() {
  // Navigation Tabs
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const screen = item.getAttribute('data-screen');
      navigateTo(screen);
    });
  });

  // Global Back Button
  backBtn.addEventListener('click', () => {
    navigateTo('home');
  });

  // Global Search
  const globalSearchInput = document.getElementById('global-search-input');
  globalSearchInput.addEventListener('input', (e) => {
    handleGlobalSearch(e.target.value);
  });

  // Class Detail Search
  const classSearchInput = document.getElementById('class-search-input');
  classSearchInput.addEventListener('input', (e) => {
    handleClassSearch(e.target.value);
  });
}

// Navigation Logic
function navigateTo(screenKey, data = null) {
  // Hide all screens
  Object.values(screens).forEach(s => s.classList.remove('active'));
  
  // Show target screen
  screens[screenKey].classList.add('active');

  // Update Navigation Active State
  if (['home', 'search', 'favorites'].includes(screenKey)) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-screen') === screenKey);
    });
    headers.main.style.display = 'block';
    headers.nav.style.display = 'none';
    
    // Set Header Title
    const titles = { home: 'Accueil', search: 'Recherche', favorites: 'Favoris' };
    headers.title.textContent = titles[screenKey];
    
    if (screenKey === 'favorites') renderFavorites();
  } else {
    headers.main.style.display = 'none';
    headers.nav.style.display = 'block';
  }

  // Handle specific screen logic
  if (screenKey === 'classDetail') {
    currentClass = data;
    headers.navTitle.textContent = `Classe ${data.id}`;
    headers.nav.style.backgroundColor = data.color;
    headers.navTitle.style.color = '#ffffff';
    document.getElementById('global-back').style.color = '#ffffff';
    renderClassDetail(data);
  } else {
    // Reset header for home/search/etc
    headers.nav.style.backgroundColor = 'var(--bg-secondary)';
    headers.navTitle.style.color = 'var(--text-primary)';
    document.getElementById('global-back').style.color = 'var(--text-primary)';
  }
}

// Render Home Screen
function renderHome() {
  const grid = document.getElementById('class-grid');
  grid.innerHTML = '';
  
  CLASSES.forEach(cls => {
    const count = ACCOUNT_DATA.filter(a => a.code.startsWith(cls.id)).length;
    const card = document.createElement('div');
    card.className = 'class-card';
    card.style.setProperty('--class-color', cls.color);
    card.innerHTML = `
      <div class="class-number">${cls.id}</div>
      <div class="class-info">
        <h3>${cls.name}</h3>
        <div class="class-count">${count} comptes</div>
      </div>
    `;
    card.onclick = () => navigateTo('classDetail', cls);
    grid.appendChild(card);
  });
}

// Render Class Detail (Flat List in Order)
function renderClassDetail(cls) {
  const container = document.getElementById('class-tree-container');
  const searchInput = document.getElementById('class-search-input');
  searchInput.value = '';
  document.getElementById('class-filtered-list').style.display = 'none';
  container.style.display = 'block';
  
  const classAccounts = ACCOUNT_DATA
    .filter(a => a.code.startsWith(cls.id))
    .sort((a, b) => a.code.localeCompare(b.code));
    
  container.innerHTML = '';
  
  classAccounts.forEach(acc => {
    // Determine depth based on parents in the same list
    let depth = 0;
    for (let i = 1; i < acc.code.length; i++) {
      const prefix = acc.code.substring(0, i);
      if (classAccounts.some(a => a.code === prefix)) depth++;
    }
    
    const row = createAccountRow(acc, cls.color);
    row.style.marginLeft = `${depth * 20}px`;
    if (depth > 0) {
      row.style.borderLeft = 'none';
      row.style.background = 'transparent';
    }
    container.appendChild(row);
  });
}

function createTreeNode(account, allAccounts, color) {
  const children = allAccounts.filter(a => {
    if (a.code.length <= account.code.length) return false;
    if (!a.code.startsWith(account.code)) return false;
    // Direct child: one level deeper
    // But codes aren't strictly length-based (e.g., 101 -> 1011, 10 -> 101)
    // We check if there are any other codes between them that would be parents
    const otherPotentialParents = allAccounts.filter(other => 
      other.code.length > account.code.length && 
      other.code.length < a.code.length && 
      a.code.startsWith(other.code)
    );
    return otherPotentialParents.length === 0;
  });

  const node = document.createElement('div');
  node.className = 'tree-node';
  
  const isExpanded = expandedNodes.has(account.code);
  const hasChildren = children.length > 0;

  const content = document.createElement('div');
  content.className = 'tree-content';
  content.innerHTML = `
    <span class="tree-toggle ${hasChildren ? '' : 'hidden'} ${isExpanded ? '' : 'collapsed'}" data-code="${account.code}">▼</span>
    <span class="account-code monospace" style="color: ${color}; margin: 0 8px;">${account.code}</span>
    <span class="account-label">${account.label}</span>
    <button class="star-btn ${favorites.includes(account.code) ? 'active' : ''}" data-code="${account.code}">★</button>
  `;

  // Toggle children
  content.querySelector('.tree-toggle').onclick = (e) => {
    e.stopPropagation();
    const toggle = e.currentTarget;
    const childrenContainer = node.querySelector('.tree-children');
    const collapsed = toggle.classList.toggle('collapsed');
    childrenContainer.classList.toggle('collapsed', collapsed);
    if (collapsed) expandedNodes.delete(account.code);
    else expandedNodes.add(account.code);
  };

  // View Details
  content.onclick = () => navigateTo('accountDetail', account);
  
  // Star button
  content.querySelector('.star-btn').onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(account.code, e.currentTarget);
  };

  node.appendChild(content);

  if (hasChildren) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = `tree-children ${isExpanded ? '' : 'collapsed'}`;
    children.forEach(child => {
      childrenContainer.appendChild(createTreeNode(child, allAccounts, color));
    });
    node.appendChild(childrenContainer);
  }

  return node;
}

// Handle Class Search (Filters within class)
function handleClassSearch(query) {
  const treeContainer = document.getElementById('class-tree-container');
  const filteredList = document.getElementById('class-filtered-list');
  
  if (!query.trim()) {
    treeContainer.style.display = 'block';
    filteredList.style.display = 'none';
    return;
  }

  treeContainer.style.display = 'none';
  filteredList.style.display = 'block';
  filteredList.innerHTML = '';

  const classId = currentClass.id;
  const filtered = filterAccounts(query, classId);
  
  if (filtered.length === 0) {
    filteredList.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
  } else {
    filtered.forEach(acc => {
      filteredList.appendChild(createAccountRow(acc, currentClass.color));
    });
  }
}

// Render Global Search
function handleGlobalSearch(query) {
  const container = document.getElementById('global-search-results');
  if (!query.trim()) {
    container.innerHTML = '<div class="empty-state">Commencez à taper pour rechercher...</div>';
    return;
  }

  const filtered = filterAccounts(query);
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucun résultat trouvé dans tout le plan comptable.</div>';
    return;
  }

  // Group by class
  const grouped = {};
  filtered.forEach(acc => {
    const classId = acc.code[0];
    if (!grouped[classId]) grouped[classId] = [];
    grouped[classId].push(acc);
  });

  Object.keys(grouped).sort().forEach(classId => {
    const cls = CLASSES.find(c => c.id == classId);
    const section = document.createElement('div');
    section.innerHTML = `<div style="margin: 16px 0 8px 0; font-size: 0.8rem; font-weight: 700; color: ${cls.color}; text-transform: uppercase; letter-spacing: 0.05em;">Classe ${classId} — ${cls.name}</div>`;
    container.appendChild(section);
    
    grouped[classId].forEach(acc => {
      container.appendChild(createAccountRow(acc, cls.color, true));
    });
  });
}

// Render Favorites
function renderFavorites() {
  const container = document.getElementById('favorites-list');
  container.innerHTML = '';
  
  if (favorites.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucun favori pour le moment</div>';
    return;
  }

  // Sort favorites by code
  const favAccounts = favorites
    .map(code => ACCOUNT_DATA.find(a => a.code === code))
    .filter(a => a)
    .sort((a, b) => a.code.localeCompare(b.code));

  favAccounts.forEach(acc => {
    const classId = acc.code[0];
    const cls = CLASSES.find(c => c.id == classId);
    container.appendChild(createAccountRow(acc, cls.color, true));
  });
}

// Helper: Create Simple Account Row
function createAccountRow(account, color, showBadge = false) {
  const row = document.createElement('div');
  row.className = 'account-item';
  const isGroup = account.code.length === 2;
  const displayColor = isGroup ? color : 'var(--text-secondary)';
  const fontWeight = isGroup ? '700' : '600';

  row.innerHTML = `
    <span class="account-code monospace" style="color: ${displayColor}; font-weight: ${fontWeight}">${account.code}</span>
    <span class="account-label" style="font-weight: ${isGroup ? '700' : '400'}">${account.label}</span>
    ${showBadge ? `<span class="badge" style="background: ${color}">C${account.code[0]}</span>` : ''}
    <button class="star-btn ${favorites.includes(account.code) ? 'active' : ''}" data-code="${account.code}">★</button>
  `;
  
  row.onclick = () => copyAccount(account);
  row.querySelector('.star-btn').onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(account.code, e.currentTarget);
  };
  
  return row;
}

// Filter Logic
function filterAccounts(query, classId = null) {
  const q = normalizeString(query);
  return ACCOUNT_DATA.filter(acc => {
    if (classId && !acc.code.startsWith(classId)) return false;
    
    const codeMatch = acc.code.startsWith(query);
    const labelMatch = normalizeString(acc.label).includes(q);
    
    return codeMatch || labelMatch;
  });
}

function normalizeString(str) {
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Favorites Management
function toggleFavorite(code, btn) {
  const index = favorites.indexOf(code);
  if (index > -1) {
    favorites.splice(index, 1);
    btn.classList.remove('active');
  } else {
    favorites.push(code);
    btn.classList.add('active');
  }
  localStorage.setItem('pct_favorites', JSON.stringify(favorites));
}

// Copy Logic
function copyAccount(account) {
  const text = `${account.code} ${account.label}`;
  
  // Try modern API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast())
      .catch(err => {
        console.error('Clipboard error:', err);
        fallbackCopy(text);
      });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast();
  } catch (err) {
    console.error('Fallback copy failed', err);
  }
  document.body.removeChild(textArea);
}

function showToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 1500);
}

// Run App
init();
