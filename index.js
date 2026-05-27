const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { sendEmail } = require('./notifier');
require('dotenv').config();

const STATE_FILE = path.join(__dirname, 'state.txt');
const LOG_FILE = path.join(__dirname, 'changes.log');
const SCREENSHOT_FILE = path.join(__dirname, 'last_change.png');
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_MINUTES || '30') * 60 * 1000;

// Eliminar captura anterior al iniciar para asegurar que se cree de nuevo
if (fs.existsSync(SCREENSHOT_FILE)) {
    fs.unlinkSync(SCREENSHOT_FILE);
}

let isFirstCheck = true;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Guarda un registro del cambio en un archivo de log.
 */
function logChange(message) {
    const timestamp = new Date().toLocaleString();
    const logEntry = `[${timestamp}] 🚀 CAMBIO DETECTADO: ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
}

/**
 * Función para probar la configuración de email.
 */
async function testEmailConfig() {
    console.log('\n📧 Enviando correo de prueba...');
    const testMessage = `Este es un mensaje de prueba del Avisador OposEdu.\n\nSi recibes esto, tu configuración de correo es CORRECTA.\n\nFecha: ${new Date().toLocaleString()}`;
    
    // Si existe una captura previa, la incluimos en el test
    const attachment = fs.existsSync(SCREENSHOT_FILE) ? SCREENSHOT_FILE : null;
    await sendEmail('Prueba de Configuración - Avisador OposEdu', testMessage, attachment);
    
    console.log('✅ Proceso de prueba finalizado. Revisa tu bandeja de entrada.');
    showMenu();
}

/**
 * Función principal de chequeo.
 */
async function checkForChanges() {
    console.log(`\n🔍 [${new Date().toLocaleString()}] Iniciando comprobación...`);
    
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        console.log(`🌐 Navegando a ${process.env.TARGET_URL}...`);
        await page.goto(process.env.TARGET_URL, { waitUntil: 'networkidle' });

        // Seleccionar valores
        console.log(`🧪 Aplicando filtros: Cuerpo=${process.env.COS_VALUE}, Especialidad=${process.env.ESPECIALITAT_VALUE}`);
        
        await page.selectOption('#cosSelect', process.env.COS_VALUE);
        await page.waitForTimeout(1000); 
        await page.selectOption('#especialitatSelect', process.env.ESPECIALITAT_VALUE);

        console.log('🔘 Ejecutando filtro...');
        const filterButton = await page.$('button[onclick*="goToFilter"], input[onclick*="goToFilter"], a[onclick*="goToFilter"]');
        
        if (filterButton) {
            await filterButton.click();
        } else {
            await page.evaluate(() => {
                if (typeof goToFilter === 'function') {
                    goToFilter();
                }
            });
        }

        await page.waitForLoadState('networkidle');
        
        // Esperar un poco más para asegurar que el JavaScript de la web ha renderizado la tabla
        await page.waitForTimeout(5000); 

        // Captura inicial si es la primera vez que se ejecuta en esta sesión
        if (isFirstCheck) {
            console.log('📸 Generando captura inicial (last_change.png)...');
            await page.screenshot({ path: SCREENSHOT_FILE, fullPage: true });
            isFirstCheck = false;
        }

        // Función de normalización: quita TODO lo que no sea letras o números básicos
        const normalize = (text) => {
            if (!text) return '';
            return text
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Quita acentos
                .replace(/[^a-z0-9]/g, '') // Quita TODO excepto letras y números
                .trim();
        };

        const rawContent = await page.evaluate(() => {
            // Intentamos capturar el body entero si los selectores específicos fallan,
            // pero quitando elementos que sabemos que son ruido.
            const toRemove = document.querySelectorAll('script, style, iframe, .header, .footer, select, button, input');
            toRemove.forEach(el => el.remove());
            
            return document.body.innerText;
        });

        const currentContent = normalize(rawContent);

        // Bajamos el umbral de seguridad a 20 caracteres por si la web es muy escueta
        if (!currentContent || currentContent.length < 20) {
            console.error('❌ La extracción sigue siendo demasiado corta. Es posible que la web no haya cargado los resultados a tiempo.');
            return;
        }

        // Leer estado anterior con codificación explícita
        if (!fs.existsSync(STATE_FILE)) {
            console.log('📝 Inicializando archivo de estado por primera vez...');
            fs.writeFileSync(STATE_FILE, currentContent, 'utf8');
            console.log('✅ Estado inicial guardado. A partir de ahora te avisaré si algo cambia.');
            return;
        }

        const rawStored = fs.readFileSync(STATE_FILE, 'utf8');
        const previousContent = normalize(rawStored);

        if (currentContent !== previousContent) {
            console.log('🚀 ¡CAMBIO REAL DETECTADO!');

            await page.screenshot({ path: SCREENSHOT_FILE, fullPage: true });

            const logMsg = `Cuerpo ${process.env.COS_VALUE}, Especialidad ${process.env.ESPECIALITAT_VALUE}`;
            logChange(logMsg);

            const message = `Se ha detectado un cambio en el portal de oposiciones.\n\nFiltros: Cuerpo ${process.env.COS_VALUE}, Especialidad ${process.env.ESPECIALITAT_VALUE}\n\nURL: ${process.env.TARGET_URL}`;
            await sendEmail('ALERTA: Cambio detectado en OposEdu', message, SCREENSHOT_FILE);

            // Guardar el contenido normalizado para que la próxima comparación sea exacta
            fs.writeFileSync(STATE_FILE, currentContent, 'utf8');
            console.log('✅ Estado actualizado (formato normalizado) y notificación enviada.');
        } else {
            console.log('✅ Sin cambios (el contenido coincide tras normalización).');
        }


    } catch (error) {
        console.error('❌ Error durante la comprobación:', error);
    } finally {
        if (browser) await browser.close();
    }
}

/**
 * Inicia el modo monitor continuo.
 */
function startMonitor() {
    console.log('\n🚀 Modo Monitor Activo');
    console.log(`⏰ Revisando cada ${process.env.CHECK_INTERVAL_MINUTES} minutos.`);
    console.log('Presiona Ctrl+C para detener.');

    // Ejecución inmediata
    checkForChanges();

    // Programar ejecuciones
    setInterval(checkForChanges, CHECK_INTERVAL);
}

/**
 * Muestra el menú interactivo.
 */
function showMenu() {
    console.log('\n--- MENÚ AVISADOR OPOS ---');
    console.log('1. Mandar correo de prueba');
    console.log('2. Monitorizar la web (Bucle continuo)');
    console.log('3. Salir');
    
    rl.question('\nElige una opción: ', (choice) => {
        switch (choice) {
            case '1':
                testEmailConfig();
                break;
            case '2':
                startMonitor();
                break;
            case '3':
                console.log('¡Hasta luego!');
                process.exit(0);
                break;
            default:
                console.log('Opción no válida.');
                showMenu();
                break;
        }
    });
}

// Iniciar aplicación
showMenu();
