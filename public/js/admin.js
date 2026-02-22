// ===== STATE =====
let token = localStorage.getItem('admin_token');
let adminCategories = [];
let adminMenuItems = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        showDashboard();
    }
});

// ===== AUTH =====
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.textContent = '';

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        token = data.token;
        localStorage.setItem('admin_token', token);
        showDashboard();
    } catch (err) {
        errorEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

function handleLogout() {
    token = null;
    localStorage.removeItem('admin_token');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    loadCategories();
    loadMenuItems();
    loadOrders();
}

function authHeaders() {
    return {
        'Authorization': `Bearer ${token}`
    };
}

function authHeadersJSON() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// ===== NAVIGATION =====
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ==================== CATEGORIES ====================

async function loadCategories() {
    try {
        const res = await fetch('/api/admin/categories', { headers: authHeaders() });
        if (res.status === 401 || res.status === 403) return handleLogout();
        adminCategories = await res.json();
        renderCategoriesTable();
        populateCategoryDropdown();
    } catch (err) {
        console.error('Load categories error:', err);
    }
}

function renderCategoriesTable() {
    const tbody = document.getElementById('categoriesBody');
    if (adminCategories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No categories yet</td></tr>';
        return;
    }

    tbody.innerHTML = adminCategories.map(cat => {
        const imgCell = cat.image
            ? `<img src="${cat.image}" alt="${cat.name}" class="table-img">`
            : `<div class="table-emoji">📁</div>`;
        const status = cat.isActive
            ? '<span class="status-badge status-active">Active</span>'
            : '<span class="status-badge status-inactive">Inactive</span>';

        return `
      <tr>
        <td>${imgCell}</td>
        <td><strong>${cat.name}</strong></td>
        <td>${cat._count?.menuItems || 0}</td>
        <td>${cat.sortOrder}</td>
        <td>${status}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="editCategory(${cat.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCategory(${cat.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
}

function openCategoryModal(cat = null) {
    document.getElementById('categoryModalTitle').textContent = cat ? 'Edit Category' : 'Add Category';
    document.getElementById('categoryId').value = cat ? cat.id : '';
    document.getElementById('categoryName').value = cat ? cat.name : '';
    document.getElementById('categorySortOrder').value = cat ? cat.sortOrder : 0;
    document.getElementById('categoryImage').value = '';
    document.getElementById('categoryImagePreview').innerHTML = cat && cat.image
        ? `<img src="${cat.image}" alt="${cat.name}">` : '';
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('categoryModal').classList.remove('active');
}

function editCategory(id) {
    const cat = adminCategories.find(c => c.id === id);
    if (cat) openCategoryModal(cat);
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('categoryName').value);
    formData.append('sortOrder', document.getElementById('categorySortOrder').value);
    const imageFile = document.getElementById('categoryImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    const btn = document.getElementById('categorySubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: authHeaders(), body: formData });
        if (!res.ok) throw new Error('Failed');
        closeCategoryModal();
        loadCategories();
    } catch (err) {
        alert('Error saving category');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? All its menu items will also be deleted.')) return;
    try {
        await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
        loadCategories();
        loadMenuItems();
    } catch (err) {
        alert('Error deleting category');
    }
}

// ==================== MENU ITEMS ====================

async function loadMenuItems() {
    try {
        const res = await fetch('/api/admin/menu-items', { headers: authHeaders() });
        if (res.status === 401 || res.status === 403) return handleLogout();
        adminMenuItems = await res.json();
        renderMenuItemsTable();
    } catch (err) {
        console.error('Load menu items error:', err);
    }
}

function renderMenuItemsTable() {
    const tbody = document.getElementById('menuItemsBody');
    if (adminMenuItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No menu items yet</td></tr>';
        return;
    }

    tbody.innerHTML = adminMenuItems.map(item => {
        const imgCell = item.image
            ? `<img src="${item.image}" alt="${item.name}" class="table-img">`
            : `<div class="table-emoji">🍴</div>`;
        const vegBadge = item.isVeg
            ? '<span class="status-badge status-active">Veg</span>'
            : '<span class="status-badge status-inactive">Non-Veg</span>';
        const availBadge = item.isAvailable
            ? '<span class="status-badge status-active">Yes</span>'
            : '<span class="status-badge status-inactive">No</span>';

        return `
      <tr>
        <td>${imgCell}</td>
        <td><strong>${item.name}</strong></td>
        <td>${item.category?.name || '-'}</td>
        <td>₹${item.price}</td>
        <td>${vegBadge}</td>
        <td>${availBadge}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-secondary btn-sm" onclick="editMenuItem(${item.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteMenuItem(${item.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
}

function populateCategoryDropdown() {
    const select = document.getElementById('menuItemCategory');
    select.innerHTML = '<option value="">Select category</option>' +
        adminCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function openMenuItemModal(item = null) {
    document.getElementById('menuItemModalTitle').textContent = item ? 'Edit Menu Item' : 'Add Menu Item';
    document.getElementById('menuItemId').value = item ? item.id : '';
    document.getElementById('menuItemName').value = item ? item.name : '';
    document.getElementById('menuItemPrice').value = item ? item.price : '';
    document.getElementById('menuItemDesc').value = item ? (item.description || '') : '';
    document.getElementById('menuItemCategory').value = item ? item.categoryId : '';
    document.getElementById('menuItemIsVeg').checked = item ? item.isVeg : true;
    document.getElementById('menuItemIsAvailable').checked = item ? item.isAvailable : true;
    document.getElementById('menuItemImage').value = '';
    document.getElementById('menuItemImagePreview').innerHTML = item && item.image
        ? `<img src="${item.image}" alt="${item.name}">` : '';
    document.getElementById('menuItemModal').classList.add('active');
}

function closeMenuItemModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('menuItemModal').classList.remove('active');
}

function editMenuItem(id) {
    const item = adminMenuItems.find(i => i.id === id);
    if (item) openMenuItemModal(item);
}

async function handleMenuItemSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('menuItemId').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('menuItemName').value);
    formData.append('price', document.getElementById('menuItemPrice').value);
    formData.append('description', document.getElementById('menuItemDesc').value);
    formData.append('categoryId', document.getElementById('menuItemCategory').value);
    formData.append('isVeg', document.getElementById('menuItemIsVeg').checked);
    formData.append('isAvailable', document.getElementById('menuItemIsAvailable').checked);
    const imageFile = document.getElementById('menuItemImage').files[0];
    if (imageFile) formData.append('image', imageFile);

    const btn = document.getElementById('menuItemSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const url = id ? `/api/admin/menu-items/${id}` : '/api/admin/menu-items';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: authHeaders(), body: formData });
        if (!res.ok) throw new Error('Failed');
        closeMenuItemModal();
        loadMenuItems();
    } catch (err) {
        alert('Error saving menu item');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
    }
}

async function deleteMenuItem(id) {
    if (!confirm('Delete this menu item?')) return;
    try {
        await fetch(`/api/admin/menu-items/${id}`, { method: 'DELETE', headers: authHeaders() });
        loadMenuItems();
    } catch (err) {
        alert('Error deleting menu item');
    }
}

// ==================== ORDERS ====================

async function loadOrders() {
    try {
        const res = await fetch('/api/admin/orders', { headers: authHeaders() });
        if (res.status === 401 || res.status === 403) return handleLogout();
        const orders = await res.json();
        renderOrdersTable(orders);
    } catch (err) {
        console.error('Load orders error:', err);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersBody');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No orders yet</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const itemsList = order.items.map(i => `${i.menuItem?.name || 'Unknown'} x${i.quantity}`).join(', ');
        const statusClass = order.status === 'completed' ? 'status-completed'
            : order.status === 'pending' ? 'status-pending' : 'status-active';
        const date = new Date(order.createdAt).toLocaleString();

        return `
      <tr>
        <td><strong>${order.serialNumber}</strong></td>
        <td>${order.customerName || 'Guest'}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itemsList}">${itemsList}</td>
        <td>₹${order.totalAmount}</td>
        <td>
          <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)" style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:0.8rem;">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td style="font-size:0.8rem;color:var(--text-secondary);">${date}</td>
      </tr>
    `;
    }).join('');
}

async function updateOrderStatus(orderId, status) {
    try {
        await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: authHeadersJSON(),
            body: JSON.stringify({ status })
        });
    } catch (err) {
        alert('Error updating order status');
        loadOrders();
    }
}
