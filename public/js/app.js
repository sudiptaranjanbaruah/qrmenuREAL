// ===== STATE =====
let categories = [];
let menuItems = [];
let filteredItems = [];
let cart = JSON.parse(localStorage.getItem('qrmenu_cart')) || {};
let activeCategory = null;
let vegFilter = 'all';
let searchQuery = '';
let whatsappNumber = '';

// Category image URLs (fallback when no uploaded image)
const CATEGORY_IMAGES = {
  'Burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop',
  'Pizza': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  'Starters': 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=200&h=200&fit=crop',
  'Drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop',
  'Desserts': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop',
  'Rice & Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&h=200&fit=crop',
  'Pasta': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&h=200&fit=crop',
  'Salads': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
  'Sandwiches': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&h=200&fit=crop',
  'Soups': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=200&h=200&fit=crop',
  'Noodles': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop',
  'Momos': 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=200&h=200&fit=crop'
};

const ALL_CATEGORY_IMG = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop';

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    await Promise.all([loadCategories(), loadMenu(), loadConfig()]);
    updateCartUI(); // Initial cart render from localStorage
    hideLoading();
  } catch (err) {
    console.error('Init error:', err);
    hideLoading();
  }
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    whatsappNumber = data.whatsappNumber || '';
  } catch (err) {
    console.error('Config load error:', err);
  }
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

// ===== API CALLS =====
async function loadCategories() {
  const res = await fetch('/api/categories');
  categories = await res.json();
  renderCategories();
}

async function loadMenu(categoryId = null, search = '') {
  let url = '/api/menu';
  const params = [];
  if (categoryId) params.push(`category=${categoryId}`);
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (params.length) url += '?' + params.join('&');

  const res = await fetch(url);
  menuItems = await res.json();
  applyFilters();
}

// ===== RENDER CATEGORIES =====
function renderCategories() {
  const container = document.getElementById('categoriesContainer');

  // "All" category
  let html = `
    <div class="category-item ${!activeCategory ? 'active' : ''}" onclick="selectCategory(null)">
      <div class="category-circle">
        <img src="${ALL_CATEGORY_IMG}" alt="All" loading="lazy">
      </div>
      <span class="category-name">All</span>
    </div>
  `;

  categories.forEach(cat => {
    const fallbackImg = CATEGORY_IMAGES[cat.name] || ALL_CATEGORY_IMG;
    const imgSrc = cat.image || fallbackImg;

    html += `
      <div class="category-item ${activeCategory === cat.id ? 'active' : ''}" onclick="selectCategory(${cat.id})">
        <div class="category-circle">
          <img src="${imgSrc}" alt="${cat.name}" loading="lazy">
        </div>
        <span class="category-name">${cat.name}</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ===== SELECT CATEGORY =====
function selectCategory(categoryId) {
  activeCategory = categoryId;
  renderCategories();
  loadMenu(categoryId, searchQuery);

  const title = document.getElementById('menuTitle');
  if (categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    title.textContent = cat ? cat.name : 'Our Menu';
  } else {
    title.textContent = 'Our Menu';
  }
}

// ===== SEARCH =====
let searchTimeout;
function handleSearch(value) {
  searchQuery = value;
  document.getElementById('searchClear').style.display = value ? 'block' : 'none';

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadMenu(activeCategory, value);
  }, 300);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  document.getElementById('searchClear').style.display = 'none';
  loadMenu(activeCategory);
}

// ===== VEG FILTER =====
function setVegFilter(filter) {
  vegFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  applyFilters();
}

function applyFilters() {
  if (vegFilter === 'all') {
    filteredItems = [...menuItems];
  } else if (vegFilter === 'veg') {
    filteredItems = menuItems.filter(i => i.isVeg);
  } else {
    filteredItems = menuItems.filter(i => !i.isVeg);
  }
  renderMenu();
}

// ===== RENDER MENU =====
function renderMenu() {
  const grid = document.getElementById('menuGrid');
  const noResults = document.getElementById('noResults');

  if (filteredItems.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';

  grid.innerHTML = filteredItems.map((item, i) => {
    const inCart = cart[item.id];
    const vegClass = item.isVeg ? 'veg' : 'nonveg';
    const imgContent = item.image
      ? `<img src="${item.image}" alt="${item.name}" loading="lazy">`
      : `<div class="placeholder-icon">${item.name.charAt(0)}</div>`;

    return `
      <div class="menu-card" style="animation-delay:${i * 0.05}s">
        <div class="menu-card-image">
          ${imgContent}
        </div>
        <div class="menu-card-info">
          <div>
            <div class="menu-card-top">
              <div class="menu-item-name">
                <span class="veg-indicator ${vegClass}"><span class="dot"></span></span>
                ${item.name}
              </div>
            </div>
            <p class="menu-item-desc">${item.description || ''}</p>
          </div>
          <div class="menu-card-bottom">
            <span class="menu-item-price">₹${item.price}</span>
            ${inCart
        ? `<div class="qty-controls">
                  <button class="qty-btn" onclick="updateCart(${item.id}, -1)">-</button>
                  <span class="qty-value">${inCart.quantity}</span>
                  <button class="qty-btn" onclick="updateCart(${item.id}, 1)">+</button>
                </div>`
        : `<button class="add-btn" onclick="addToCart(${item.id})">ADD</button>`
      }
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== CART =====
function addToCart(itemId) {
  const item = menuItems.find(i => i.id === itemId);
  if (!item) return;

  if (cart[itemId]) {
    cart[itemId].quantity += 1;
  } else {
    cart[itemId] = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1
    };
  }

  updateCartUI();
  renderMenu();
  showToast(`${item.name} added to cart`);
}

function updateCart(itemId, delta) {
  if (!cart[itemId]) return;
  cart[itemId].quantity += delta;
  if (cart[itemId].quantity <= 0) {
    delete cart[itemId];
  }
  updateCartUI();
  renderMenu();
}

function updateCartUI() {
  const count = Object.values(cart).reduce((sum, i) => sum + i.quantity, 0);
  const total = Object.values(cart).reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const countEl = document.getElementById('cartCount');
  countEl.textContent = count;
  countEl.classList.toggle('visible', count > 0);

  const cartItemsEl = document.getElementById('cartItems');
  const cartFooter = document.getElementById('cartFooter');

  // Save to local storage
  localStorage.setItem('qrmenu_cart', JSON.stringify(cart));

  if (count === 0) {
    cartFooter.style.display = 'none';
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty</p>
        <p class="cart-empty-sub">Add some delicious items!</p>
      </div>
    `;
    return;
  }

  cartFooter.style.display = 'block';

  cartItemsEl.innerHTML = Object.values(cart).map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}</div>
      </div>
      <div class="cart-item-controls">
        <button onclick="updateCart(${item.id}, -1)">-</button>
        <span class="qty">${item.quantity}</span>
        <button onclick="updateCart(${item.id}, 1)">+</button>
      </div>
    </div>
  `).join('');

  document.getElementById('cartTotal').textContent = `₹${total}`;
}

// ===== CART TOGGLE =====
function toggleCart() {
  const panel = document.getElementById('cartPanel');
  const overlay = document.getElementById('cartOverlay');
  const isOpen = panel.classList.contains('active');

  panel.classList.toggle('active');
  overlay.classList.toggle('active');
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

// ===== PLACE ORDER =====
async function placeOrder() {
  const items = Object.values(cart);
  if (items.length === 0) return;

  const btn = document.getElementById('orderBtn');
  btn.disabled = true;
  btn.innerHTML = 'Placing order...';

  try {
    const customerName = document.getElementById('customerName').value || 'Guest';
    const customerPhone = document.getElementById('customerPhone').value || '';

    const orderData = {
      customerName,
      customerPhone,
      items: items.map(i => ({
        menuItemId: i.id,
        quantity: i.quantity
      }))
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!res.ok) throw new Error('Order failed');

    const order = await res.json();

    // Build WhatsApp message
    let message = `*New Order - ${order.serialNumber}*\n\n`;
    message += `Name: ${customerName}\n`;
    if (customerPhone) message += `Phone: ${customerPhone}\n`;
    message += `\n*Order Details:*\n`;

    order.items.forEach(item => {
      message += `- ${item.menuItem.name} x${item.quantity} — ₹${item.price * item.quantity}\n`;
    });

    message += `\n*Total: ₹${order.totalAmount}*`;
    message += `\nOrder #: ${order.serialNumber}`;

    // Open WhatsApp
    const whatsappNumber = '918486287593'; // Your number here
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Clear cart
    cart = {};
    localStorage.removeItem('qrmenu_cart');
    updateCartUI();
    renderMenu();
    toggleCart();
    showToast(`Order #${order.serialNumber} placed!`);

  } catch (err) {
    console.error('Order error:', err);
    showToast('Failed to place order. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.128.556 4.124 1.528 5.858L0 24l6.335-1.486A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.94 0-3.748-.564-5.274-1.528l-.378-.224-3.758.882.945-3.636-.247-.394A9.946 9.946 0 0 1 2 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
      </svg>
      Order via WhatsApp
    `;
  }
}

// ===== TOAST =====
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
