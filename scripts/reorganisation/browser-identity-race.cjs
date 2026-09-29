// Run against local frontend :3000 and backend :2003 with Playwright available.
// The farm endpoints are intercepted with synthetic data; no real farm is changed.
// Set PLAYWRIGHT_MODULE and CHROME_PATH if they are outside the usual Node/Chrome paths.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

function packet(id = 901, username = `Synthetic ${id}`) {
  return {
    frmid: id, username, isabo: false, aboLifetime: false, tryitRevision: 1,
    farmMeta: { updated: 1790500000000, balance: { sfl: 12, coins: 250 }, tradeTax: 10, vip: false },
    Bumpkin: [{ lvl: 1 }], constants: {},
    itables: { it: { Sunflower: { instock: 0, yield: 1, pcost: 0, dailysfl: 0, farmit: 1 } } },
    boostables: { nft: { A: { isactive: 0, tryit: 0 } } },
    homeData: { amount: 0, _source: { section: 'home', contentHash: 'home-v1' } },
    invData: { _source: { section: 'inv', contentHash: 'inv-v1' } },
    sectionHashes: { home: 'section-v1', inv: 'inv-v1' }, tableHashes: { 'itables.it': 'table-v1' },
  };
}

let activeBrowser = null;
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  activeBrowser = browser;
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  let held = null;
  let waitHeld = null;
  let heldFarm = null;
  let waitHeldFarm = null;
  const holdNextNav = id => { held = { id, arrived: new Promise(resolve => { waitHeld = resolve; }) }; };
  const holdNextFarm = id => { heldFarm = { id, arrived: new Promise(resolve => { waitHeldFarm = resolve; }) }; };
  const waitNav = promise => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`No nav request; seen ${JSON.stringify(requests.slice(-8).map(r => ({ path: r.path, frmid: r.body.frmid, mode: r.body.mode, include: r.body.include })))} `)), 12000))]);
  const farmIdFor = value => ({ alpha: 901, beta: 902, gamma: 903 })[String(value).toLowerCase()] || Number(value);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/getfarm|getdatacrypto/.test(request.url())) requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() }); });
  await page.route('**/getfarm', async route => {
    const body = route.request().postDataJSON();
    const id = farmIdFor(body.frmid);
    if (heldFarm && id === heldFarm.id) {
      const pending = heldFarm;
      heldFarm = null;
      pending.route = route;
      waitHeldFarm(pending);
      return;
    }
    const responseId = String(body.frmid) === '904' ? 905 : id;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(packet(responseId, ({ 901: 'Alpha', 902: 'Beta', 903: 'Gamma' })[responseId] || `Synthetic ${responseId}`)) });
  });
  await page.route('**/getdatacrypto', async route => {
    const body = route.request().postDataJSON();
    if (held && body.mode === 'nav' && Number(body.frmid) === held.id) {
      const pending = held;
      held = null;
      pending.route = route;
      waitHeld(pending);
      return;
    }
    const id = Number(body.frmid) || 901;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ priceData: [0, 0, 0.1], allData: packet(id) }) });
  });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
  await page.locator('button[name=getFarm]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('button[name=getFarm]')?.disabled, null, { timeout: 15000 });
  const identity = async () => (await page.locator('.App-h1').innerText()).split('\n')[0];
  let lastLoadAt = 0;
  const load = async (input, expected) => {
    const remaining = 6200 - (Date.now() - lastLoadAt);
    if (remaining > 0) await page.waitForTimeout(remaining);
    await page.waitForFunction(() => !document.querySelector('button[name=getFarm]')?.disabled);
    await page.locator('input[name=inputValue]').fill(input);
    await page.locator('button[name=getFarm]').click();
    lastLoadAt = Date.now();
    try { await page.waitForFunction(name => document.querySelector('.App-h1')?.innerText.includes(name), expected, { timeout: 10000 }); }
    catch (error) {
      console.log(JSON.stringify({ failedLoad: input, header: await identity(), recentRequests: requests.slice(-8).map(r => ({ path: r.path, frmid: r.body.frmid, mode: r.body.mode })), errors: errors.slice(-8), visible: (await page.locator('body').innerText()).slice(0, 350) }));
      throw error;
    }
    await page.waitForFunction(() => !document.querySelector('button[name=getFarm]')?.disabled);
  };
  const selectPage = async label => {
    await page.locator('.header-page-select .cd-btn').click();
    await page.getByRole('option', { name: label, exact: true }).click();
  };
  const release = async pending => pending.route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ priceData: [0, 0, 0.1], allData: packet(pending.id) }) });
  await load('901', 'Alpha');
  if (await page.locator('.pagecoach-overlay').count()) await page.keyboard.press('Escape');
  holdNextNav(901);
  const oldAPromise = held.arrived;
  await selectPage('Craft');
  const oldA = await waitNav(oldAPromise);
  await load('Beta', 'Beta');
  await release(oldA);
  await page.waitForTimeout(300);
  const afterOldA = await identity();

  holdNextNav(902);
  const oldBPromise = held.arrived;
  await selectPage('Cook');
  const oldB = await waitNav(oldBPromise);
  await load('Alpha', 'Alpha');
  await release(oldB);
  await page.waitForTimeout(300);
  const afterOldB = await identity();

  holdNextNav(901);
  const oldA2Promise = held.arrived;
  await selectPage('Fish');
  const oldA2 = await waitNav(oldA2Promise);
  await load('903', 'Gamma');
  await release(oldA2);
  await page.waitForTimeout(300);
  const afterOldA2 = await identity();

  const waitCooldown = async () => {
    const remaining = 6200 - (Date.now() - lastLoadAt);
    if (remaining > 0) await page.waitForTimeout(remaining);
  };
  await waitCooldown();
  const mismatchRequest = page.waitForRequest(req => req.url().endsWith('/getfarm') && req.postDataJSON()?.frmid === '904');
  await page.locator('input[name=inputValue]').fill('904');
  await page.locator('button[name=getFarm]').click();
  lastLoadAt = Date.now();
  await mismatchRequest;
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !document.querySelector('button[name=getFarm]')?.disabled);
  const afterMismatch = await identity();
  const mismatchSnapshot = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('SFLManData'))?.dataSet?.options?.farmId; } catch { return null; } });

  holdNextNav(903);
  const oldCPromise = held.arrived;
  await selectPage('Map');
  const oldC = await waitNav(oldCPromise);
  await waitCooldown();
  holdNextFarm(902);
  const pendingBetaPromise = heldFarm.arrived;
  await page.locator('input[name=inputValue]').fill('Beta');
  await page.locator('button[name=getFarm]').click();
  lastLoadAt = Date.now();
  const pendingBeta = await waitNav(pendingBetaPromise);
  await release(oldC);
  await page.waitForTimeout(300);
  const duringBetaLoad = await identity();
  await pendingBeta.route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(packet(902, 'Beta')) });
  await page.waitForFunction(() => document.querySelector('.App-h1')?.innerText.includes('Beta'));
  const afterBetaLoad = await identity();

  holdNextNav(902);
  const oldB2Promise = held.arrived;
  await selectPage('Flower');
  const oldB2 = await waitNav(oldB2Promise);
  await load('903', 'Gamma');
  await release(oldB2);
  await page.waitForTimeout(300);
  const afterBToC = await identity();
  const snapshot = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('SFLManData'))?.dataSet?.options?.farmId; } catch { return null; } });
  assert.match(afterOldA, /^Beta/);
  assert.match(afterOldB, /^Alpha/);
  assert.match(afterOldA2, /^Gamma/);
  assert.match(afterMismatch, /^Gamma/);
  assert.equal(mismatchSnapshot, 903);
  assert.match(duringBetaLoad, /^Gamma/);
  assert.match(afterBetaLoad, /^Beta/);
  assert.match(afterBToC, /^Gamma/);
  assert.equal(snapshot, 903);
  assert.deepEqual(requests.filter(r => r.path.includes('getfarm')).map(r => r.body.frmid), ['901', 'Beta', 'Alpha', '903', '904', 'Beta', '903']);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ afterOldA, afterOldB, afterOldA2, afterMismatch, mismatchSnapshot, duringBetaLoad, afterBetaLoad, afterBToC, snapshot, requests: requests.filter(r => r.path.includes('getfarm')).map(r => r.body.frmid), errors: errors.slice(0, 15) }));
  await browser.close();
  activeBrowser = null;
})().catch(async error => { console.error(error); if (activeBrowser) await activeBrowser.close(); process.exitCode = 1; });
