const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { sendEmail } = require('./notifier');
require('dotenv').config();

const LOG_FILE = path.join(__dirname, 'changes.log');
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_MINUTES || '30') * 60 * 1000;

/**
 * Parsea los objetivos de monitorización desde el .env
 */
function getMonitorTargets() {
    const rawTargets = process.env.MONITOR_TARGETS || '';
    if (!rawTargets) {
        // Fallback para compatibilidad hacia atrás o si no está configurado correctamente
        if (process.env.COS_VALUE && process.env.ESPECIALITAT_VALUE) {
            return [{
                cos: process.env.COS_VALUE,
                especialitat: process.env.ESPECIALITAT_VALUE,
                name: 'Especialidad Principal'
            }];
        }
        return [];
    }

    return rawTargets.split('|').map(targetStr => {
        const [cos, especialitat, name] = targetStr.split(':');
        return { cos, especialitat, name: name || `${cos}:${especialitat}` };
    });
}

const targets = getMonitorTargets();

/**
 * Obtiene la ruta del archivo de estado para un objetivo específico
 */
function getStateFilePath(target) {
    return path.join(__dirname, `state_${target.cos}_${target.especialitat}.txt`);
}

/**
 * Obtiene la ruta de la captura para un objetivo específico
 */
function getScreenshotPath(target) {
    return path.join(__dirname, `last_change_${target.cos}_${target.especialitat}.png`);
}

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
    
    await sendEmail('Prueba de Configuración - Avisador OposEdu', testMessage);
    
    console.log('✅ Proceso de prueba finalizado. Revisa tu bandeja de entrada.');
    showMenu();
}

/**
 * Comprueba cambios para un objetivo específico.
 */
async function checkTarget(page, target, isFirstCheck) {
    console.log(`\n🔍 [${new Date().toLocaleString()}] Comprobando: ${target.name} (${target.cos}:${target.especialitat})...`);
    
    const STATE_FILE = getStateFilePath(target);
    const SCREENSHOT_FILE = getScreenshotPath(target);

    try {
        console.log(`🌐 Navegando a ${process.env.TARGET_URL}...`);
        await page.goto(process.env.TARGET_URL, { waitUntil: 'networkidle' });

        // Seleccionar valores
        console.log(`🧪 Aplicando filtros: Cuerpo=${target.cos}, Especialidad=${target.especialitat}`);
        
        await page.selectOption('#cosSelect', target.cos);
        await page.waitForTimeout(1000); 
        await page.selectOption('#especialitatSelect', target.especialitat);

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
        await page.waitForTimeout(5000); 

        // Captura inicial si es necesario
        if (isFirstCheck || !fs.existsSync(STATE_FILE)) {
            console.log(`📸 Generando captura inicial para ${target.name}...`);
            await page.screenshot({ path: SCREENSHOT_FILE, fullPage: true });
        }

        // Función de normalización
        const normalize = (text) => {
            if (!text) return '';
            return text
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") 
                .replace(/[^a-z0-9]/g, '') 
                .trim();
        };

        const rawContent = await page.evaluate(() => {
            const toRemove = document.querySelectorAll('script, style, iframe, .header, .footer, select, button, input');
            toRemove.forEach(el => el.remove());
            return document.body.innerText;
        });

        const currentContent = normalize(rawContent);

        if (!currentContent || currentContent.length < 20) {
            console.error(`❌ La extracción para ${target.name} es demasiado corta.`);
            return;
        }

        if (!fs.existsSync(STATE_FILE)) {
            console.log(`📝 Guardando estado inicial para ${target.name}...`);
            fs.writeFileSync(STATE_FILE, currentContent, 'utf8');
            return;
        }

        const rawStored = fs.readFileSync(STATE_FILE, 'utf8');
        const previousContent = normalize(rawStored);

        if (currentContent !== previousContent) {
            console.log(`🚀 ¡CAMBIO DETECTADO en ${target.name}!`);

            await page.screenshot({ path: SCREENSHOT_FILE, fullPage: true });

            const logMsg = `${target.name} (Cuerpo ${target.cos}, Especialidad ${target.especialitat})`;
            logChange(logMsg);

            const message = `Se ha detectado un cambio en el portal de oposiciones.\n\nEspecialidad: ${target.name}\nCuerpo: ${target.cos}\nEspecialidad ID: ${target.especialitat}\n\nURL: ${process.env.TARGET_URL}`;
            await sendEmail(`ALERTA: Cambio en ${target.name}`, message, SCREENSHOT_FILE);

            fs.writeFileSync(STATE_FILE, currentContent, 'utf8');
            console.log(`✅ Estado de ${target.name} actualizado y notificación enviada.`);
        } else {
            console.log(`✅ ${target.name}: Sin cambios.`);
        }

    } catch (error) {
        console.error(`❌ Error comprobando ${target.name}:`, error);
    }
}

let sessionFirstCheck = true;

/**
 * Función principal que recorre todos los objetivos.
 */
async function checkForChanges() {
    if (targets.length === 0) {
        console.error('❌ No hay objetivos de monitorización configurados en el .env (MONITOR_TARGETS).');
        return;
    }

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        for (const target of targets) {
            await checkTarget(page, target, sessionFirstCheck);
        }
        
        sessionFirstCheck = false;

    } catch (error) {
        console.error('❌ Error general durante la comprobación:', error);
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
    console.log(`Target(s): ${targets.map(t => t.name).join(', ')}`);
    console.log('Presiona Ctrl+C para detener.');

    checkForChanges();
    setInterval(checkForChanges, CHECK_INTERVAL);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Muestra el menú interactivo.
 */
function showMenu() {
    console.log('\n--- MENÚ AVISADOR OPOS (MULTI-TARGET) ---');
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

showMenu();
