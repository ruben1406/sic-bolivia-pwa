// ============================================================================
// SIC BOLIVIA PWA - MAIN APPLICATION LOGIC
// ============================================================================

let currentUser = null;
let allOrders = [];
let selectedOrder = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
});

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterOrders(e.target.value);
        });
    }
    
    // Navigation tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            switchSection(section);
        });
    });
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
    // Note: For production, use Google OAuth 2.0
    // For MVP, we'll use a simplified authentication
    
    // Simulated login - replace with real OAuth in production
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
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Hide all nav items active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Show selected section
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.add('active');
    }
    
    // Show selected nav item active state
    const navItem = event?.target?.closest('.nav-item');
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Load data for section
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'orders') {
        loadAllOrders();
    }
}

function goToOrders() {
    switchSection('orders');
    document.querySelector('[onclick="switchSection(\'orders\')"]')?.click();
}

// ============================================================================
// DASHBOARD
// ============================================================================

async function loadDashboard() {
    try {
        const orders = await getOrdersFromSheet();
        allOrders = orders;
        
        // Calculate metrics
        const active = orders.filter(o => o['Estado_Orden'] !== 'Completado').length;
        const completed = orders.filter(o => o['Estado_Orden'] === 'Completado').length;
        const pending = orders.filter(o => o['Estado_Orden'] === 'Pendiente').length;
        
        document.getElementById('activeOrdersCount').textContent = active;
        document.getElementById('completedOrdersCount').textContent = completed;
        document.getElementById('pendingOrdersCount').textContent = pending;
        document.getElementById('clientsCount').textContent = new Set(orders.map(o => o['ID_Cliente'])).size;
        
        // Display recent orders (last 5)
        const recent = orders.slice(0, 5);
        displayOrders(recent, 'recentOrdersList');
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data');
    }
}

// ============================================================================
// ORDERS
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
// DETAIL VIEW
// ============================================================================

async function viewOrderDetail(orderId) {
    try {
        selectedOrder = allOrders.find(o => o['ID_Orden'] === orderId);
        
        if (!selectedOrder) {
            showError('Order not found');
            return;
        }
        
        const detailContent = document.getElementById('detailContent');
        
        // Get related data
        const lotes = await getRelatedData('Lotes', 'ID_Orden', orderId);
        const muestras = await getRelatedData('Muestras', 'ID_Orden', orderId);
        const resultados = await getRelatedData('Resultados_Lab', 'ID_Orden', orderId);
        const parametros = await getRelatedData('Parametros_Proceso', 'ID_Orden', orderId);
        const fotos = await getRelatedData('Fotos', 'ID_Orden', orderId);
        const conclusiones = await getRelatedData('Conclusiones', 'ID_Orden', orderId);
        
        // Build detail HTML
        let html = `
            <div class="detail-container">
                <div class="detail-header">
                    <h2>${selectedOrder['Numero_Orden']}</h2>
                    <p>${selectedOrder['Tipo_Reporte'] || 'Inspection Report'}</p>
                </div>
                
                <div class="detail-body">
                    <!-- GENERAL DATA -->
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
                    </div>
                    
                    <!-- LOTS -->
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
                    
                    <!-- SAMPLES -->
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
                    
                    <!-- LAB RESULTS -->
                    ${resultados.length > 0 ? `
                        <div class="detail-section">
                            <h3>Lab Results (${resultados.length})</h3>
                            ${resultados.map(resultado => `
                                <div class="detail-item" style="margin-bottom: 12px; padding: 12px; background: var(--light); border-radius: 8px;">
                                    <strong>${resultado['Parametro_Analisis'] || 'N/A'}</strong>
                                    <br>Lab: ${resultado['Laboratorio'] || 'N/A'} | Result: ${resultado['Resultado'] || 'N/A'} | Report: ${resultado['Numero_Reporte_Lab'] || 'N/A'}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <!-- PROCESS PARAMETERS -->
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
                    
                    <!-- PHOTOS -->
                    ${fotos.length > 0 ? `
                        <div class="detail-section">
                            <h3>Photos (${fotos.length})</h3>
                            <div class="photo-gallery">
                                ${fotos.map(foto => `
                                    <div class="photo-item" onclick="viewPhoto('${foto['Imagen'] || ''}')">
                                        ${foto['Imagen'] ? `<img src="${foto['Imagen']}" alt="${foto['Descripcion'] || ''}">` : '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #ddd;">📷</div>'}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- CONCLUSIONS -->
                    ${conclusiones.length > 0 ? `
                        <div class="detail-section">
                            <h3>Conclusions</h3>
                            <div class="detail-item" style="padding: 12px; background: var(--light); border-radius: 8px;">
                                ${conclusiones[0]['Resumen_Conclusion'] || 'No conclusion data'}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- ACTIONS -->
                    <div class="actions">
                        <button class="btn btn-primary" onclick="generateReport('pdf')">
                            📄 Generate PDF
                        </button>
                        <button class="btn btn-primary" onclick="generateReport('docx')">
                            📝 Download Word
                        </button>
                        <button class="btn btn-secondary" onclick="goToOrders()">
                            ← Back
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        detailContent.innerHTML = html;
        document.getElementById('detailSection').classList.add('active');
        document.querySelector('.nav-item[onclick*="settings"]').classList.remove('active');
        
    } catch (error) {
        console.error('Error loading detail:', error);
        showError('Failed to load order details');
    }
}

function viewPhoto(photoUrl) {
    if (photoUrl) {
        window.open(photoUrl, '_blank');
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
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbxy6lxVYxqo1kzF26gm7YN2OOzADeItBgFMDkqVkK4T1HuD1LT7P6_xFUs5XUxYqg1u/exec';  // Replace with actual URL
        const url = `${scriptUrl}?id=${selectedOrder['ID_Orden']}&format=${format}`;
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
