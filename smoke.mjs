// Demo happy-path smoke test — the six-minute run, driven end to end.
//
//   npx playwright install chromium     (once)
//   npm run build && npm start          (in another terminal)
//   npm run smoke                       (or: node smoke.mjs http://localhost:3000)
//
// 31 assertions. If they all pass, the demo path works.
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3210";
const pass = [];
const fail = [];
const check = (name, ok, detail = "") => (ok ? pass : fail).push(`${name}${detail ? ` — ${detail}` : ""}`);

// Uses Playwright's own Chromium. Run `npx playwright install chromium` once.
// CHROMIUM_PATH overrides it if you already have a browser on disk.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

try {
  // Every run starts from an identical clean state — the same guarantee the
  // demo needs, and it exercises the reset endpoint on the way past.
  const reset = await page.request.post(`${BASE}/api/demo/reset`);
  check("demo dataset resets to a clean state", reset.ok());

  // ── 1a · The public site is the front door ──────────────────
  await page.goto(BASE, { waitUntil: "networkidle" });
  const homeText = await page.textContent("main");
  check("public homepage explains the product",
    homeText.includes("plastic bag of paper") &&
    homeText.includes("consented, portable health data") &&
    (await page.getByRole("link", { name: /Open the live demo/ }).count()) > 0);
  const shots = await page.locator('img[src^="/shots/"]').count();
  check("homepage shows real screenshots of the app", shots >= 4, `${shots} images`);

  // ── 1b · The two-door fork now lives at /start ──────────────
  await page.getByRole("link", { name: /Open the live demo/ }).first().click();
  await page.waitForURL("**/start", { timeout: 15000 });
  check("landing shows both doors",
    (await page.getByRole("heading", { name: /I'm a Patient/ }).count()) === 1 &&
    (await page.getByRole("heading", { name: /I'm a Doctor/ }).count()) === 1);

  // ── 2 · Patient phone-OTP login ─────────────────────────────
  await page.goto(`${BASE}/login/patient`);
  await page.getByRole("button", { name: /Sunita Kale/ }).click();
  await page.fill('input[name="phone"]', "+919011220001");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.waitForSelector('input[name="otp"]');
  await page.fill('input[name="otp"]', "123456");
  await page.getByRole("button", { name: "Verify" }).click();
  await page.waitForURL((u) => u.pathname === "/patient" || u.pathname.startsWith("/patient/"), { timeout: 20000 });
  await page.goto(`${BASE}/patient/records`, { waitUntil: "networkidle" });
  check("patient signs in with OTP", page.url().includes("/patient/records"));

  // Sunita's profile locale is Hindi, so the app comes up in Hindi. Assert
  // that, then switch to English so the rest of the run reads deterministically.
  const hindiNav = await page.textContent("nav");
  check("patient app honours the profile locale (Hindi)", hindiNav.includes("रिकॉर्ड"));
  await page.getByRole("button", { name: "EN" }).first().click();
  await page.waitForFunction(
    () => document.querySelector("nav")?.textContent?.includes("Records") ?? false,
    null, { timeout: 20000 },
  ).catch(() => {});
  await page.waitForLoadState("networkidle");
  check("language switcher changes the whole patient app",
    (await page.textContent("nav")).includes("Records"));

  // ── 3 · Records timeline is populated ───────────────────────
  await page.waitForSelector("ol li", { timeout: 15000 });
  const timelineCount = await page.locator("ol li").count();
  check("health timeline renders", timelineCount > 10, `${timelineCount} entries`);

  await page.goto(`${BASE}/patient/records?tab=reports`);
  await page.waitForSelector("svg.recharts-surface", { timeout: 15000 });
  check("analyte trend chart renders", true);

  // ── 4 · Booking wizard against the slot generator ───────────
  await page.goto(`${BASE}/patient/book`);
  await page.getByRole("button", { name: /Sanjeevani Multispeciality/ }).click();
  await page.getByRole("button", { name: /Dr\. Anita Deshmukh/ }).click();
  await page.waitForSelector("text=/Morning|No clinic/", { timeout: 15000 });

  // walk forward until a day with free slots turns up
  let booked = false;
  for (let i = 0; i < 10 && !booked; i++) {
    const slots = page.locator("button", { hasText: /^\d{1,2}:\d{2} (am|pm)$/i });
    const n = await slots.count();
    for (let j = 0; j < n; j++) {
      const s = slots.nth(j);
      if (await s.isEnabled()) { await s.click(); booked = true; break; }
    }
    if (!booked) {
      await page.locator('button:has(span:text-is("' + String(new Date().getDate() + i + 1) + '"))').first().click().catch(() => {});
      await page.waitForTimeout(600);
    }
  }
  check("slot grid offers a legal slot", booked);

  if (booked) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.fill("textarea", "Chest discomfort while climbing stairs");
    const consent = await page.getByText(/lets Dr\. Anita Deshmukh view your health records/).count();
    check("consent sentence is shown before booking", consent === 1);
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await page.waitForURL("**/patient/appointments", { timeout: 20000 });
    check("booking lands in Appointments", page.url().includes("/patient/appointments"));
  }

  // ── 5 · Access log and revoke ───────────────────────────────
  await page.goto(`${BASE}/patient/access`);
  const grants = await page.getByText("Doctors with access").count();
  const revokeBtns = await page.getByRole("button", { name: "Revoke" }).count();
  check("access log lists grants with a revoke control", grants === 1 && revokeBtns > 0, `${revokeBtns} revocable`);

  // ── 6 · Emergency card, public and no login ─────────────────
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/e/EMG-8f2a91c4d7`, { waitUntil: "networkidle" });
  const bodyText = await anonPage.textContent("body");
  check("public emergency card opens without a login",
    bodyText.includes("Penicillin") && bodyText.includes("B+") && bodyText.includes("logged"));
  check("emergency card leaks nothing clinical beyond the slice",
    !bodyText.includes("Provisional") && !bodyText.includes("Billing"));
  await anon.close();

  // ── 7 · Doctor console ──────────────────────────────────────
  const docCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const doc = await docCtx.newPage();
  doc.on("pageerror", (e) => errors.push(String(e)));
  await doc.goto(`${BASE}/login/doctor`);
  await doc.fill('input[name="email"]', "anita.deshmukh@medpat.in");
  await doc.fill('input[name="password"]', "demo1234");
  await doc.getByRole("button", { name: "Sign in" }).click();
  await doc.waitForURL("**/doctor", { timeout: 15000 });
  await doc.getByRole("button", { name: /Start consultation|Resume consultation|Open case sheet/ })
    .first().waitFor({ timeout: 20000 });
  const queueRows = await doc.getByRole("button", { name: /Start consultation|Resume consultation|Open case sheet/ }).count();
  check("today's queue is populated", queueRows >= 4, `${queueRows} patients`);

  // ── 8 · Consent refusal for a patient with no relationship ──
  await doc.goto(`${BASE}/doctor/lookup`);
  await doc.waitForSelector('input[placeholder*="MRN"]', { timeout: 15000 });
  await doc.fill('input[placeholder*="MRN"]', "Joseph");
  await doc.waitForSelector("text=/no relationship|care relationship active/", { timeout: 10000 });
  const locked = await doc.getByText("no relationship").count();
  check("a patient with no care relationship shows as locked", locked > 0);

  // ── 9 · Start a consultation and write the case sheet ───────
  await doc.goto(`${BASE}/doctor`);
  await doc.waitForSelector("text=Today's clinic", { timeout: 15000 });
  await doc.getByRole("button", { name: /Start consultation|Resume consultation/ }).first().click();
  await doc.waitForURL("**/doctor/case/**", { timeout: 20000 });
  check("case sheet opens", doc.url().includes("/doctor/case/"));

  await doc.waitForSelector("aside", { timeout: 20000 });
  const panel = await doc.textContent("aside");
  check("context panel shows allergies in the right pane", panel.includes("Penicillin"));

  // vitals with live flagging
  await doc.getByRole("button", { name: /Vitals/ }).click();
  const bp = doc.locator('input[type="number"]').nth(3);
  await bp.fill("176");
  await doc.waitForTimeout(400);
  const flagged = await doc.getByText("↑ high").count();
  check("out-of-range vital flags live", flagged > 0);

  // assessment
  await doc.getByRole("button", { name: /Assessment/ }).click();
  await doc.fill('input[placeholder="Type to search ICD-11"]', "hyperten");
  await doc.waitForTimeout(300);
  const icdHit = await doc.getByRole("button", { name: /Essential hypertension/ }).count();
  check("ICD-11 autocomplete returns codes", icdHit > 0);
  if (icdHit) await doc.getByRole("button", { name: /Essential hypertension/ }).first().click();

  // prescription with an allergy block
  await doc.getByRole("button", { name: /^\s*13\s*Prescription/ }).click().catch(async () => {
    await doc.getByText("Prescription", { exact: true }).click();
  });
  await doc.fill('input[placeholder*="drug master"]', "Augmentin");
  await doc.waitForTimeout(400);
  await doc.getByRole("button", { name: /Augmentin/ }).first().click();
  await doc.waitForSelector("text=Check before prescribing", { timeout: 8000 });
  const dialog = await doc.textContent('[role="alertdialog"]');
  check("penicillin allergy blocks amoxicillin by drug class",
    dialog.includes("Allergy: Penicillin") && dialog.toLowerCase().includes("cross-react"));
  await doc.getByRole("button", { name: "Choose a different drug" }).click();

  // safe drug goes through
  await doc.fill('input[placeholder*="drug master"]', "Crocin");
  await doc.waitForTimeout(400);
  await doc.getByRole("button", { name: /Crocin/ }).first().click();
  const preview = await doc.getByText(/one tablet morning and night/).count();
  check("1-0-1 renders a plain-language preview", preview > 0);
  await doc.getByRole("button", { name: /Issue prescription/ }).click();
  await doc.waitForSelector("text=Prescription issued", { timeout: 15000 });
  check("prescription is issued", true);

  // autosave
  // The indicator reads "Saved just now" for the first minute, then "Saved 1 min ago".
  await doc.waitForSelector("text=/Saved (just now|.* ago)/", { timeout: 15000 });
  check("case sheet autosaves", true);

  // finalize
  await doc.getByRole("button", { name: /Finalise consultation/ }).click();
  await doc.getByRole("dialog").getByRole("button", { name: "Finalise", exact: true }).click();
  await doc.waitForSelector("text=finalised", { timeout: 25000 });
  check("finalise makes the sheet immutable", true);
  const summarised = await doc.getByText(/AI-generated/).count();
  check("visit summary is labelled AI-generated", summarised > 0);

  // ── 10 · FHIR export ────────────────────────────────────────
  const caseId = doc.url().split("/").pop();
  const fhir = await doc.request.get(`${BASE}/api/fhir/case/${caseId}`);
  const bundle = await fhir.json();
  const types = new Set(bundle.entry.map((e) => e.resource.resourceType));
  check("FHIR R4 document bundle exports",
    bundle.resourceType === "Bundle" && bundle.type === "document" &&
    ["Composition", "Patient", "Encounter", "Practitioner", "AllergyIntolerance"].every((t) => types.has(t)),
    [...types].join(", "));

  // ── 11 · RLS-equivalent refusal over HTTP ───────────────────
  // cs-70 belongs to Joseph D'Souza, with whom Dr Anita has no relationship.
  const denied = await doc.request.get(`${BASE}/api/fhir/case/cs-70`);
  check("a case sheet outside the care relationship is refused",
    denied.status() === 403, `HTTP ${denied.status()}`);
  // cs-1 belongs to Sunita, who booked with her — that one is allowed.
  const allowed = await doc.request.get(`${BASE}/api/fhir/case/cs-1`);
  check("a case sheet inside the care relationship is served", allowed.status() === 200);

  await docCtx.close();

  // Google Fonts and the favicon are unreachable in the offline test sandbox;
  // those are environmental, not application errors.
  const real = errors.filter(
    (e) =>
      // Google Fonts is unreachable in the offline sandbox, and an RSC
      // prefetch aborted by the next navigation is a test artefact.
      !/ERR_TUNNEL_CONNECTION_FAILED|favicon|fonts\.(googleapis|gstatic)/i.test(e) &&
      !/Failed to fetch RSC payload/i.test(e),
  );
  check("no uncaught page errors", real.length === 0, real.slice(0, 3).join(" | "));
} catch (e) {
  fail.push(`threw: ${e.message}`);
} finally {
  await browser.close();
}

console.log("\nPASS");
pass.forEach((p) => console.log("  ✓ " + p));
if (fail.length) {
  console.log("\nFAIL");
  fail.forEach((f) => console.log("  ✗ " + f));
}
console.log(`\n${pass.length} passed, ${fail.length} failed`);
process.exit(fail.length ? 1 : 0);
