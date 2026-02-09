// Tesseract ESM (läuft auf GitHub Pages)
import Tesseract from "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js";

const fileEl = document.getElementById("file");
const runBtn = document.getElementById("run");
const outEl = document.getElementById("out");
const previewEl = document.getElementById("preview");
const summaryEl = document.getElementById("summary");
const icsEl = document.getElementById("ics");
const dlBtn = document.getElementById("download");
const demoBtn = document.getElementById("demo");
const statusEl = document.getElementById("status");
const spinEl = document.getElementById("spin");
const ocrPct = document.getElementById("ocrPct");
const barFill = document.getElementById("barFill");

let lastEvents = [];
let lastIcs = "";

fileEl.addEventListener("change", () => {
  const f = fileEl.files?.[0];
  statusEl.textContent = f ? `Ausgewählt: ${f.name}` : "Warte auf Bild…";
});

runBtn.addEventListener("click", async () => {
  const file = fileEl.files?.[0];
  if (!file) return setStatus("Bitte erst ein Bild auswählen.");

  setBusy(true);
  outEl.textContent = "OCR startet…";
  updateProgress(0);

  try {
    const { data } = await Tesseract.recognize(file, "deu", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          updateProgress(Math.round(m.progress * 100));
        }
      },
    });

    const text = (data.text || "").trim();
    outEl.textContent = text || "Kein Text erkannt.";

    lastEvents = parseShifts(text);
    lastIcs = buildIcs(lastEvents);

    render(eventsToLines(lastEvents), lastIcs);
    setStatus(lastEvents.length ? "Termine erkannt ✅" : "Keine Termine erkannt (Text prüfen).");
  } catch (e) {
    console.error(e);
    setStatus("OCR Fehler. (Tipp: anderes Bild / höherer Kontrast)");
    outEl.textContent = String(e);
  } finally {
    setBusy(false);
  }
});

demoBtn.addEventListener("click", () => {
  lastEvents = [
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 11, 17, 45), new Date(2026, 1, 11, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 15, 13, 45), new Date(2026, 1, 15, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 18, 17, 45), new Date(2026, 1, 18, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 22, 14, 45), new Date(2026, 1, 22, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 25, 17, 45), new Date(2026, 1, 25, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 2, 1, 14, 45), new Date(2026, 2, 1, 22, 15)),
  ];
  lastIcs = buildIcs(lastEvents);
  render(eventsToLines(lastEvents), lastIcs);
  setStatus("Demo erzeugt ✅");
});

dlBtn.addEventListener("click", () => {
  const blob = new Blob([lastIcs], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dienstplan.ics";
  a.click();
  URL.revokeObjectURL(url);
});

function setBusy(on) {
  spinEl.style.display = on ? "inline-block" : "none";
  runBtn.disabled = on;
  demoBtn.disabled = on;
  if (on) setStatus("OCR läuft…");
}

function setStatus(t) {
  statusEl.textContent = t;
}

function updateProgress(p) {
  ocrPct.textContent = p ? `${p}%` : "bereit";
  barFill.style.width = `${p}%`;
}

function render(lines, ics) {
  const has = lines.length > 0;
  previewEl.textContent = has ? lines.join("\n") : "Noch keine Vorschau.";
  summaryEl.textContent = has ? `${lines.length} Termin(e) erkannt.` : "Keine Termine erkannt.";
  icsEl.textContent = has ? ics : "Noch keine ICS erzeugt.";
  dlBtn.disabled = !has;
}

function eventsToLines(events) {
  return events.map((e) => `${fmtDE(e.start)} – ${fmtTime(e.end)} | ${e.title}`);
}

function fmtDE(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy} ${fmtTime(d)}`;
}
function fmtTime(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function mkEvent(title, start, end) {
  return { title, start, end, description: "Automatisch aus Screenshot extrahiert" };
}

// ---------------- Parser ----------------
function normalizeText(t){
  return (t || "")
    .replace(/\r\n/g, "\n")     // WICHTIG: Windows -> Unix
    .replace(/\r/g, "\n")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/S/g, "5")
    .replace(/O/g, "0")
    .replace(/[ \t]+/g, " ");  // Mehrfachspaces glätten
}

function detectMonthYear(text) {
  const t = (text || "").toLowerCase();

  const monthMap = [
    [["januar","jan"], 1],
    [["februar","feb"], 2],
    [["märz","maerz","mrz"], 3],
    [["april","apr"], 4],
    [["mai"], 5],
    [["juni","jun"], 6],
    [["juli","jul"], 7],
    [["august","aug"], 8],
    [["september","sep"], 9],
    [["oktober","okt"], 10],
    [["november","nov"], 11],
    [["dezember","dez"], 12],
  ];

  let month = null;
  for (const [names, num] of monthMap) {
    if (names.some((n) => new RegExp(`\\b${n}\\.?\\b`, "i").test(t))) {
      month = num; break;
    }
  }

  const y = (t.match(/\b(20\d{2})\b/) || [])[1];
  return { year: y ? Number(y) : null, month };
}

function parseShifts(rawText){
  const text = normalizeText(rawText);

  const now = new Date();
  const { year: yAuto, month: mAuto } = detectMonthYear(text);
  let currentYear = yAuto ?? now.getFullYear();
  let currentMonth = mAuto ?? (now.getMonth() + 1);

  // Matcht Block:
  // 11 17:45 - 22:15
  // MI. Kasse - Total Kriftel
  // (tolerant für Spaces, Punkt, und Zeilenenden)
  const rePair =
    /(?:^|\n)\s*(\d{1,2})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*\n\s*(Mo|Di|Mi|Do|Fr|Sa|So)\.?\s*(.*?)(?=\n|$)/gim;

  let lastDaySeen = 0;
  const events = [];

  let m;
  while ((m = rePair.exec(text)) !== null) {
    const day = Number(m[1]);
    const startStr = m[2];
    const endStr = m[3];
    const title = (m[5] || "Dienst").trim() || "Dienst";

    // Monatswechsel (25 -> 01)
    if (lastDaySeen && day < lastDaySeen) {
      currentMonth += 1;
      if (currentMonth > 12) { currentMonth = 1; currentYear += 1; }
    }
    lastDaySeen = day;

    const start = toDateTimeLocal(currentYear, currentMonth, day, startStr);
    const end = toDateTimeLocal(currentYear, currentMonth, day, endStr);
    if (end < start) end.setDate(end.getDate() + 1);

    events.push(mkEvent(title, start, end));
  }

  console.log("parseShifts events:", events); // <- zum Prüfen
  return events;
}

function toDateTimeLocal(y, m, d, hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

// ---------------- ICS ----------------
function pad(n) { return String(n).padStart(2, "0"); }
function fmtIcsLocal(dt) {
  return (
    dt.getFullYear() +
    pad(dt.getMonth() + 1) +
    pad(dt.getDate()) +
    "T" +
    pad(dt.getHours()) +
    pad(dt.getMinutes()) +
    pad(dt.getSeconds())
  );
}
function escapeIcs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function buildIcs(events) {
  const now = new Date();
  const dtstamp = fmtIcsLocal(now);

  const vevents = events.map((e, idx) => {
    const uid = `${dtstamp}-${idx}@dienstplan.local`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${fmtIcsLocal(e.start)}`,
      `DTEND:${fmtIcsLocal(e.end)}`,
      `SUMMARY:${escapeIcs(e.title)}`,
      `DESCRIPTION:${escapeIcs(e.description || "")}`,
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dienstplan OCR//DE",
    "CALSCALE:GREGORIAN",
    vevents,
    "END:VCALENDAR",
    ""
  ].join("\r\n");
}
