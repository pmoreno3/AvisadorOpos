const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

async function debugExtraction() {
    console.log('--- DEBUG EXTRACTION ---');
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(process.env.TARGET_URL, { waitUntil: 'networkidle' });
        await page.selectOption('#cosSelect', process.env.COS_VALUE);
        await page.waitForTimeout(1000); 
        await page.selectOption('#especialitatSelect', process.env.ESPECIALITAT_VALUE);

        const filterButton = await page.$('button[onclick*="goToFilter"], input[onclick*="goToFilter"], a[onclick*="goToFilter"]');
        if (filterButton) await filterButton.click();
        else await page.evaluate(() => typeof goToFilter === 'function' && goToFilter());

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const currentContent = await page.evaluate(() => {
            const container = document.querySelector('#contingut, .contingut, #main, main, .results, #results') || document.body;
            const clone = container.cloneNode(true);
            const toRemove = clone.querySelectorAll('script, style, iframe, input[type="hidden"], .timestamp, .date');
            toRemove.forEach(el => el.remove());
            return clone.innerText.trim();
        });

        console.log('CONTENT LENGTH:', currentContent.length);
        fs.writeFileSync('debug_current.txt', currentContent, 'utf8');
        
        if (fs.existsSync('state.txt')) {
            const previous = fs.readFileSync('state.txt', 'utf8');
            console.log('PREVIOUS LENGTH:', previous.length);
            console.log('IS EQUAL?', currentContent === previous);
            
            if (currentContent !== previous) {
                // Encontrar el primer índice donde difieren
                let i = 0;
                while (i < currentContent.length && i < previous.length && currentContent[i] === previous[i]) {
                    i++;
                }
                console.log(`DIFF AT INDEX ${i}:`);
                console.log(`CURRENT: "${currentContent.substring(i, i+20)}..."`);
                console.log(`PREVIOUS: "${previous.substring(i, i+20)}..."`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

debugExtraction();
