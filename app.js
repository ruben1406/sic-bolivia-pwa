// ============================================================================
// SIC BOLIVIA PWA - COMPLETE CRUD APPLICATION
// ============================================================================

let currentUser = null;
let allOrders = [];
let selectedOrder = null;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxtEhsA3hxwSc_DFqi3cykLLuGx3LM564IP5yEccuMhNy-rfUaEJxp0oFksfc_tI__z/exec';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterOrders(e.target.value);
        });
    }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user_data');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showApp();
        loadDashboard();
    } else {
        showLogin();
    }
}

function loginWithGoogle() {
    const userName = prompt('Enter your name (for testing):') || 'Inspector';
    const userEmail = prompt('Enter your email:') || 'inspector@sic-bol.com';
    
    currentUser = {
        name: userName,
        email: userEmail,
        id: 'USR-' + Date.now()
    };
    
    localStorage.setItem('auth_token', 'mock_token_' + Date.now());
    localStorage.setItem('user_data', JSON.stringify(currentUser));
    
    showApp();
    loadDashboard();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        currentUser = null;
        allOrders = [];
        location.reload();
    }
}

// ============================================================================
// UI SWITCHING
// ============================================================================

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('userDisplay').textContent = currentUser.name;
    document.getElementById('welcomeMessage').textContent = `Inspector: ${currentUser.name} | ${new Date().toLocaleDateString()}`;
}

function switchSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.add('active');
    }
    
    const navItem = event?.target?.closest('.nav-item');
    if (navItem) {
        navItem.classList.add('active');
    }
    
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'orders') {
        loadAllOrders();
    }
}

// ============================================================================
// DASHBOARD
// ============================================================================

async function loadDashboard() {
    try {
        const orders = await getOrdersFromSheet();
        allOrders = orders;
        
        const active = orders.filter(o => o['Estado_Orden'] !== 'Completado').length;
        const completed = orders.filter(o => o['Estado_Orden'] === 'Completado').length;
        const pending = orders.filter(o => o['Estado_Orden'] === 'Pendiente').length;
        
        document.getElementById('activeOrdersCount').textContent = active;
        document.getElementById('completedOrdersCount').textContent = completed;
        document.getElementById('pendingOrdersCount').textContent = pending;
        document.getElementById('clientsCount').textContent = new Set(orders.map(o => o['ID_Cliente'])).size;
        
        const recent = orders.slice(0, 5);
        displayOrders(recent, 'recentOrdersList');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// ============================================================================
// ORDERS - READ
// ============================================================================

async function loadAllOrders() {
    try {
        if (allOrders.length === 0) {
            allOrders = await getOrdersFromSheet();
        }
        displayOrders(allOrders, 'allOrdersList');
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders');
    }
}

function filterOrders(searchTerm) {
    const filtered = allOrders.filter(order => {
        const term = searchTerm.toLowerCase();
        return (
            order['Numero_Orden']?.toLowerCase().includes(term) ||
            order['ID_Cliente']?.toLowerCase().includes(term) ||
            order['ID_Producto']?.toLowerCase().includes(term)
        );
    });
    displayOrders(filtered, 'allOrdersList');
}

function displayOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="loading">No orders found</div>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card ${order['Estado_Orden']?.toLowerCase().replace(' ', '-')}" onclick="viewOrderDetail('${order['ID_Orden']}')">
            <div class="order-header">
                <div class="order-id">${order['Numero_Orden'] || order['ID_Orden']}</div>
                <span class="order-status ${order['Estado_Orden']?.toLowerCase().replace(' ', '-')}">
                    ${order['Estado_Orden'] || 'Pending'}
                </span>
            </div>
            <div class="order-detail">
                <div><strong>Client:</strong> ${order['ID_Cliente'] || 'N/A'}</div>
                <div><strong>Product:</strong> ${order['ID_Producto'] || 'N/A'}</div>
                <div><strong>Date:</strong> ${order['Fecha_Inspeccion'] || 'N/A'}</div>
                <div><strong>Inspector:</strong> ${order['Inspector'] || 'N/A'}</div>
            </div>
        </div>
    `).join('');
}

// ============================================================================
// ORDER DETAIL - READ
// ============================================================================

async function viewOrderDetail(orderId) {
    try {
        selectedOrder = allOrders.find(o => o['ID_Orden'] === orderId);
        
        if (!selectedOrder) {
            showError('Order not found');
            return;
        }
        
        const detailContent = document.getElementById('detailContent');
        
        const lotes = await getRelatedData('Lotes', 'ID_Orden', orderId);
        const muestras = await getRelatedData('Muestras', 'ID_Orden', orderId);
        const resultados = await getRelatedData('Resultados_Lab', 'ID_Orden', orderId);
        const parametros = await getRelatedData('Parametros_Proceso', 'ID_Orden', orderId);
        const fotos = await getRelatedData('Fotos', 'ID_Orden', orderId);
        const conclusiones = await getRelatedData('Conclusiones', 'ID_Orden', orderId);
        
        let html = `
            <div class="detail-container">
                <div class="detail-header">
                    <h2>${selectedOrder['Numero_Orden']}</h2>
                    <p>${selectedOrder['Tipo_Reporte'] || 'Inspection Report'}</p>
                </div>
                
                <div class="detail-body">
                    <div class="detail-section">
                        <h3>General Information</h3>
                        <div class="detail-row">
                            <div class="detail-item">
                                <div class="detail-label">Client</div>
                                <div class="detail-value">${selectedOrder['ID_Cliente'] || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Product</div>
                                <div class="detail-value">${selectedOrder['ID_Producto'] || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-item">
                                <div class="detail-label">Date</div>
                                <div class="detail-value">${selectedOrder['Fecha_Inspeccion'] || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Inspector</div>
                                <div class="detail-value">${selectedOrder['Inspector'] || 'N/A'}</div>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-item">
                                <div class="detail-label">Location</div>
                                <div class="detail-value">${selectedOrder['Lugar_Inspeccion'] || 'N/A'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Quantity</div>
                                <div class="detail-value">${selectedOrder['Cantidad_Declarada_kg'] || 'N/A'} kg</div>
                            </div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-item">
                                <div class="detail-label">Status</div>
                                <div class="detail-value">${selectedOrder['Estado_Orden'] || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${lotes.length > 0 ? `
                        <div class="detail-section">
                            <h3>Lots (${lotes.length})</h3>
                            ${lotes.map(lote => `
                                <div class="detail-item" style="margin-bottom: 12px; padding: 12px; background: var(--light); border-radius: 8px;">
                                    <strong>${lote['Codigo_Lote']}</strong> - ${lote['Tipo_Lote']} - ${lote['Peso_Total_kg']} kg
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${muestras.length > 0 ? `
                        <div class="detail-section">
                            <h3>Samples (${muestras.length})</h3>
                            ${muestras.map(muestra => `
                                <div class="detail-item" style="margin-bottom: 12px; padding: 12px; background: var(--light); border-radius: 8px;">
                                    <strong>${muestra['Descripcion_Muestra'] || muestra['ID_Muestra']}</strong>
                                    <br>Seal: ${muestra['Numero_Sello'] || 'N/A'} | Point: ${muestra['Punto_Muestreo'] || 'N/A'} | Destiny: ${muestra['Destino'] || 'N/A'}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${resultados.length > 0 ? `
                        <div class="detail-section">
                            <h3>Lab Results (${resultados.length})</h3>
                            ${resultados.map(resultado => `
                                <div class="detail-item" style="margin-bottom: 12px; padding: 12px; background: var(--light); border-radius: 8px;">
                                    <strong>${resultado['Parametro_Analisis'] || 'N/A'}</strong>
                                    <br>Lab: ${resultado['Laboratorio'] || 'N/A'} | Result: ${resultado['Resultado'] || 'N/A'}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${parametros.length > 0 ? `
                        <div class="detail-section">
                            <h3>Process Parameters (${parametros.length})</h3>
                            ${parametros.map(param => `
                                <div class="detail-item" style="margin-bottom: 12px; padding: 12px; background: var(--light); border-radius: 8px;">
                                    <strong>${param['Nombre_Parametro']}</strong>: ${param['Valor_Registrado']} ${param['Unidad'] || ''} 
                                    <span style="color: ${param['Cumple'] ? 'green' : 'red'};">${param['Cumple'] ? '✓' : '✗'}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${fotos.length > 0 ? `
                        <div class="detail-section">
                            <h3>Photos (${fotos.length})</h3>
                            <div class="photo-gallery">
                                ${fotos.map(foto => `
                                    <div class="photo-item">
                                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--light); color: var(--primary);">
                                            📷 ${foto['Descripcion'] || 'Photo'}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="actions">
                        <button class="btn btn-primary" onclick="editOrderModal()">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-primary" onclick="generateReport('pdf')">
                            📄 Generate PDF
                        </button>
                        <button class="btn btn-primary" onclick="generateReport('docx')">
                            📝 Download Word
                        </button>
                        <button class="btn btn-secondary" onclick="goToOrders()">
                            ← Back
                        </button>
                        <button class="btn" style="background: #C1121F; color: white;" onclick="deleteOrderConfirm()">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        detailContent.innerHTML = html;
        document.getElementById('detailSection').classList.add('active');
        
    } catch (error) {
        console.error('Error loading detail:', error);
        showError('Failed to load order details');
    }
}

function goToOrders() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('ordersSection').classList.add('active');
}

// ============================================================================
// CREATE ORDER
// ============================================================================

function showCreateOrderForm() {
    const form = `
        <div class="detail-container">
            <div class="detail-header">
                <h2>Create New Order</h2>
                <p>Fill in the order details</p>
            </div>
            
            <div class="detail-body">
                <form id="createOrderForm" onsubmit="submitCreateOrder(event)">
                    <div class="detail-section">
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Order Number</label>
                            <input type="text" id="numeroOrden" placeholder="e.g., 4360-001-2025" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Report Type</label>
                            <select id="tipoReporte" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                                <option value="">Select type...</option>
                                <option value="Set Fotográfico">Set Fotográfico</option>
                                <option value="Inspección y Validación">Inspección y Validación</option>
                                <option value="Muestreo Simple">Muestreo Simple</option>
                            </select>
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Client</label>
                            <input type="text" id="cliente" placeholder="e.g., JACHA INTI INDUSTRIAL S.A." required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Product</label>
                            <input type="text" id="producto" placeholder="e.g., ORGANIC WHITE QUINOA" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Inspection Date</label>
                            <input type="date" id="fechaInspeccion" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Location</label>
                            <input type="text" id="ubicacion" placeholder="e.g., Plant address" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Quantity (kg)</label>
                            <input type="number" id="cantidad" placeholder="e.g., 1000" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Status</label>
                            <select id="estado" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                                <option value="Pendiente">Pendiente</option>
                                <option value="En Proceso">En Proceso</option>
                                <option value="Completado">Completado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">✓ Create Order</button>
                        <button type="button" class="btn btn-secondary" onclick="goToOrders()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('detailContent').innerHTML = form;
    document.getElementById('detailSection').classList.add('active');
    
    // Set today's date as default
    document.getElementById('fechaInspeccion').valueAsDate = new Date();
}

async function submitCreateOrder(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData();
        formData.append('action', 'create');
        formData.append('numero_orden', document.getElementById('numeroOrden').value);
        formData.append('tipo_reporte', document.getElementById('tipoReporte').value);
        formData.append('id_cliente', document.getElementById('cliente').value);
        formData.append('id_producto', document.getElementById('producto').value);
        formData.append('fecha_inspeccion', document.getElementById('fechaInspeccion').value);
        formData.append('lugar_inspeccion', document.getElementById('ubicacion').value);
        formData.append('inspector', currentUser.name);
        formData.append('cantidad_kg', document.getElementById('cantidad').value);
        formData.append('estado', document.getElementById('estado').value);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Order created successfully!');
            await loadDashboard();
            goToOrders();
        } else {
            showError('Error creating order: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to create order');
    }
}

// ============================================================================
// UPDATE ORDER
// ============================================================================

function editOrderModal() {
    if (!selectedOrder) return;
    
    const form = `
        <div class="detail-container">
            <div class="detail-header">
                <h2>Edit Order</h2>
                <p>${selectedOrder['Numero_Orden']}</p>
            </div>
            
            <div class="detail-body">
                <form id="editOrderForm" onsubmit="submitUpdateOrder(event)">
                    <div class="detail-section">
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Order Number</label>
                            <input type="text" id="editNumeroOrden" value="${selectedOrder['Numero_Orden'] || ''}" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Status</label>
                            <select id="editEstado" required style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                                <option value="Pendiente" ${selectedOrder['Estado_Orden'] === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="En Proceso" ${selectedOrder['Estado_Orden'] === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                                <option value="Completado" ${selectedOrder['Estado_Orden'] === 'Completado' ? 'selected' : ''}>Completado</option>
                            </select>
                        </div>
                        
                        <div class="detail-item" style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">Observations</label>
                            <textarea id="editObservaciones" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; min-height: 100px;">${selectedOrder['Observaciones'] || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="actions">
                        <button type="submit" class="btn btn-primary">✓ Update Order</button>
                        <button type="button" class="btn btn-secondary" onclick="viewOrderDetail('${selectedOrder['ID_Orden']}')">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('detailContent').innerHTML = form;
}

async function submitUpdateOrder(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData();
        formData.append('action', 'update');
        formData.append('id_orden', selectedOrder['ID_Orden']);
        formData.append('numero_orden', document.getElementById('editNumeroOrden').value);
        formData.append('estado', document.getElementById('editEstado').value);
        formData.append('observaciones', document.getElementById('editObservaciones').value);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Order updated successfully!');
            await loadDashboard();
            viewOrderDetail(selectedOrder['ID_Orden']);
        } else {
            showError('Error updating order: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to update order');
    }
}

// ============================================================================
// DELETE ORDER
// ============================================================================

function deleteOrderConfirm() {
    if (!selectedOrder) return;
    
    if (confirm(`Are you sure you want to delete order ${selectedOrder['Numero_Orden']}? This action cannot be undone.`)) {
        deleteOrder();
    }
}

async function deleteOrder() {
    try {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id_orden', selectedOrder['ID_Orden']);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Order deleted successfully!');
            await loadDashboard();
            goToOrders();
        } else {
            showError('Error deleting order: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to delete order');
    }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

async function generateReport(format) {
    if (!selectedOrder) {
        showError('No order selected');
        return;
    }
    
    try {
        const url = `${APPS_SCRIPT_URL.split('?')[0]}?id=${selectedOrder['ID_Orden']}&format=${format}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating report:', error);
        showError('Failed to generate report');
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function showError(message) {
    const container = document.querySelector('main .container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function showSuccess(message) {
    const container = document.querySelector('main .container');
    if (container) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        container.insertBefore(successDiv, container.firstChild);
        setTimeout(() => successDiv.remove(), 5000);
    }
}
