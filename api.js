// ============================================================================
// SIC BOLIVIA PWA - API / DATA LAYER
// ============================================================================
// Este archivo conecta con Google Sheets usando la Google Sheets API
// Necesitas habilitar la API y obtener tu spreadsheet ID

// ============================================================================
// CONFIGURATION - ACTUALIZA ESTOS VALORES
// ============================================================================

const SHEET_ID = '1KjXqTV1x3M5fTedgS9_I4rfL1qNlbwaeCAmgROouBbg'; // Replace with your Google Sheet ID
const API_KEY = 'AIzaSyCMYC3iKrmRhG_ql82tjJQeNoszlgIHukY'; // Get from Google Cloud Console

// ============================================================================
// FETCH DATA FROM GOOGLE SHEETS
// ============================================================================

async function getOrdersFromSheet() {
    try {
        const data = await fetchSheetData('Ordenes_Servicio');
        return data || [];
    } catch (error) {
        console.error('Error fetching orders:', error);
        // Return mock data if API fails (for offline/testing)
        return getMockOrders();
    }
}

async function getRelatedData(sheetName, filterColumn, filterValue) {
    try {
        const data = await fetchSheetData(sheetName);
        if (!data) return [];
        
        // Filter rows by column value
        return data.filter(row => row[filterColumn] === filterValue);
    } catch (error) {
        console.error(`Error fetching ${sheetName}:`, error);
        return [];
    }
}

async function fetchSheetData(sheetName) {
    // Google Sheets API v4 endpoint
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Sheet API error: ${response.status}`);
        }
        
        const result = await response.json();
        const values = result.values;
        
        if (!values || values.length === 0) {
            return [];
        }
        
        // Convert to array of objects
        const headers = values[0];
        const data = values.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
        
        return data;
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        throw error;
    }
}

// ============================================================================
// MOCK DATA (Para testing sin Google Sheets API)
// ============================================================================

function getMockOrders() {
    return [
        {
            'ID_Orden': 'ORD-000001',
            'Numero_Orden': '4360-004-2025',
            'Tipo_Reporte': 'Set Fotográfico',
            'ID_Cliente': 'JACHA INTI INDUSTRIAL S.A.',
            'ID_Producto': 'ORGANIC WHITE QUINOA',
            'Fecha_Inspeccion': '2025-01-15',
            'Lugar_Inspeccion': 'Plant, Ave. Panamericana Nº14 A Puerto Mejillones',
            'Inspector': 'Milton Nogales L.',
            'Cantidad_Declarada_kg': '46',
            'Estado_Orden': 'Completado',
            'Lote_Materia_Prima': 'NE0316JIB0301',
            'Lote_Producto_Terminado': 'NE0316JIB0302',
            'Presentacion': 'Big Bags de 1.150 Kg',
            'Numero_Envases': '20'
        },
        {
            'ID_Orden': 'ORD-000002',
            'Numero_Orden': '4360-016-2023',
            'Tipo_Reporte': 'Inspección y Validación',
            'ID_Cliente': 'SAITE SRL',
            'ID_Producto': 'ORGANIC NATURAL BLACK SESAME',
            'Fecha_Inspeccion': '2023-08-04',
            'Lugar_Inspeccion': 'Avenida Belen Nº 100, Urbanización Los Andes',
            'Inspector': 'Milton Nogales L.',
            'Cantidad_Declarada_kg': '26620.84',
            'Estado_Orden': 'Completado',
            'Lote_Materia_Prima': 'SNeO-L.02/2022',
            'Lote_Producto_Terminado': 'PC331565 LF194832',
            'Presentacion': 'Bolsas polipropileno ~40 kg',
            'Numero_Envases': '683'
        },
        {
            'ID_Orden': 'ORD-000003',
            'Numero_Orden': '4360-025-2025',
            'Tipo_Reporte': 'Muestreo Simple',
            'ID_Cliente': 'EXPORTADORA ABC',
            'ID_Producto': 'ORGANIC CHIA SEEDS',
            'Fecha_Inspeccion': '2025-02-10',
            'Lugar_Inspeccion': 'La Paz, Bolivia',
            'Inspector': 'Milton Nogales L.',
            'Cantidad_Declarada_kg': '5000',
            'Estado_Orden': 'En Proceso',
            'Lote_Materia_Prima': 'CHI-2025-001',
            'Lote_Producto_Terminado': 'CHI-2025-PT-001',
            'Presentacion': 'Bolsas de 25 kg',
            'Numero_Envases': '200'
        },
        {
            'ID_Orden': 'ORD-000004',
            'Numero_Orden': '4360-026-2025',
            'Tipo_Reporte': 'Inspección y Validación',
            'ID_Cliente': 'AGROINDUSTRIAL VERDE',
            'ID_Producto': 'ORGANIC RED QUINOA',
            'Fecha_Inspeccion': '2025-02-15',
            'Lugar_Inspeccion': 'Cochabamba, Bolivia',
            'Inspector': 'Milton Nogales L.',
            'Cantidad_Declarada_kg': '3000',
            'Estado_Orden': 'Pendiente',
            'Lote_Materia_Prima': 'QUN-RED-2025-01',
            'Lote_Producto_Terminado': 'QUN-RED-2025-PT-01',
            'Presentacion': 'Big Bags de 1 Ton',
            'Numero_Envases': '3'
        },
        {
            'ID_Orden': 'ORD-000005',
            'Numero_Orden': '4360-027-2025',
            'Tipo_Reporte': 'Set Fotográfico',
            'ID_Cliente': 'COOPERATIVE LA ANDINA',
            'ID_Producto': 'ORGANIC BLACK QUINOA',
            'Fecha_Inspeccion': '2025-02-20',
            'Lugar_Inspeccion': 'Oruro, Bolivia',
            'Inspector': 'Milton Nogales L.',
            'Cantidad_Declarada_kg': '2500',
            'Estado_Orden': 'Pendiente',
            'Lote_Materia_Prima': 'QUN-BLK-2025-02',
            'Lote_Producto_Terminado': 'QUN-BLK-2025-PT-02',
            'Presentacion': 'Bolsas de 50 kg',
            'Numero_Envases': '50'
        }
    ];
}

// ============================================================================
// CACHE MANAGEMENT (Para funcionar offline)
// ============================================================================

const CACHE_VERSION = 'sic-data-v1';

async function cacheOrdersData(data) {
    try {
        if ('caches' in window) {
            const cache = await caches.open(CACHE_VERSION);
            const response = new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            });
            await cache.put('orders-data', response);
        }
    } catch (error) {
        console.error('Error caching data:', error);
    }
}

async function getCachedOrdersData() {
    try {
        if ('caches' in window) {
            const cache = await caches.open(CACHE_VERSION);
            const response = await cache.match('orders-data');
            if (response) {
                return await response.json();
            }
        }
    } catch (error) {
        console.error('Error retrieving cached data:', error);
    }
    return null;
}

// ============================================================================
// SYNC DATA
// ============================================================================

async function syncData() {
    try {
        const orders = await getOrdersFromSheet();
        await cacheOrdersData(orders);
        return orders;
    } catch (error) {
        console.error('Error syncing data:', error);
        // If offline, try to get cached data
        const cached = await getCachedOrdersData();
        if (cached) {
            return cached;
        }
        return getMockOrders();
    }
}

// ============================================================================
// SETUP GOOGLE SHEETS API
// ============================================================================

function setupGoogleSheetsAPI() {
    /*
    Para usar Google Sheets API:
    
    1. Ve a https://console.cloud.google.com
    2. Crea un nuevo proyecto
    3. Habilita Google Sheets API
    4. Ve a Credenciales > Crear credencial > Clave de API
    5. Copia la API Key
    6. Reemplaza 'PEGAR_TU_GOOGLE_API_KEY_AQUI' con tu clave
    7. Comparte tu Google Sheet con "Cualquiera con el enlace"
    8. Copia el Sheet ID de la URL (la parte entre /d/ y /edit)
    9. Reemplaza 'PEGAR_TU_GOOGLE_SHEET_ID_AQUI'
    
    IMPORTANTE: Por seguridad, la API Key se verá en el navegador.
    Para producción, usa un backend intermedio con OAuth.
    */
    
    console.log('Google Sheets API configured');
    console.log('Sheet ID:', SHEET_ID);
    console.log('API Key configured:', API_KEY !== 'PEGAR_TU_GOOGLE_API_KEY_AQUI');
}

// Initialize on load
setupGoogleSheetsAPI();
