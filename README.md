Dienstplan Screenshot → Apple Kalender

Kleine Web-App zum Konvertieren eines Dienstplan-Screenshots in Kalendertermine (.ics).

Läuft komplett im Browser – kein Server, kein Upload, keine Datenübertragung.

---

Funktionen
	•	Screenshot hochladen
	•	OCR mit Tesseract.js (Deutsch)
	•	Schichten automatisch erkennen (Datum + Zeit + Titel)
	•	Export als .ics
	•	Import in Apple / Google / Outlook Kalender

---

Tech Stack
	•	HTML / CSS / Vanilla JS
	•	Tesseract.js (OCR)
	•	iCalendar (.ics)
	•	GitHub Pages Hosting
	•	kein Backend

---

Nutzung
	1.	Seite öffnen
	2.	Screenshot hochladen
	3.	„OCR starten“
	4.	„ICS herunterladen“
	5.	Datei öffnen → Kalender importiert automatisch

---

Deployment (GitHub Pages)

Repo → Settings → Pages

Source: Deploy from branch
Branch: main / root

Danach erreichbar unter:

https://<username>.github.io/<repo>/


---

Projektstruktur

index.html   UI
app.js       OCR + Parser + ICS Export
style.css    Design
README.md


---

Parser

Erkennt automatisch Zeilen im Format:

15 13:45 - 22:15
So. Kasse - Total

	•	Datum + Zeit werden extrahiert
	•	nächste Zeile wird als Titel verwendet
	•	Monatswechsel wird erkannt (25 → 01)
	•	unabhängig vom Wochentag (robust gegen OCR-Fehler)

---

Hinweise
	•	bessere Ergebnisse bei hohem Kontrast
	•	Screenshot zuschneiden
	•	Browser-Cache nach Updates leeren (Strg/Cmd + Shift + R)

---

Lizenz

MIT
