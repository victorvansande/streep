# 🍺 KSA Digitaal Streepkarton

Een mobiel-eerst webapp die het klassieke kartonnen streepbord van de KSA digitaal nabootst, inclusief echt **turven** (groepjes van 5 met schuine streep), **4-cijferige pincodes**, **volledige synchronisatie in real-time** tussen alle smartphones, en **afrekening/archivering**.

---

## 📱 Mobiel Gebruiksgemak (iOS & Android)

- **Authentieke Kartonnen Look**: Warme kartontextuur, viltstiftlettertypes (Permanent Marker & Kalam) en echte handgetekende turfstreepjes (`卌`).
- **Pincode Beveiliging**: 
  - Iedereen stelt de eerste keer een eigen 4-cijferige code in.
  - **Streepjes trekken voor elkaar**: Als iemands gsm plat is, kan een vriend op zijn eigen gsm het streepje zetten door simpelweg de pincode van de vriend in te voeren!
  - **Onthoud mij op deze gsm**: Optie om op je eigen smartphone ingelogd te blijven voor snelle 1-klik consumpties zonder telkens je code in te toetsen (met directe vergrendelknop).
- **Consumpties**:
  - `🍺 +1 Pint`: Snelle 1-streep knop
  - `⚡ +5`: Snel 5 strepen ineens (bv. bij een rondje geven)
  - `🥤 Keuze`: Kies uit **Pintje**, **Cola**, **Cola Zero**, **Fanta**, **Sprite**, **Bruiswater**
  - `↩️`: Laatste streepje terugdraaien indien vergist
- **Live Gesynchroniseerd**: Veranderingen verschijnen direct op ieders scherm via WebSockets.
- **Afrekening & WhatsApp**: 
  - Overzicht wie wat moet betalen (1 streepje = € 1,00).
  - 1-klik knop om de volledige afrekening direct in de leiding WhatsApp-groep te delen.
  - "Nieuwe Periode Starten": Archiveert het oude karton en zet alle streepjes weer op 0 voor een fris karton (pincodes en ledenlijst blijven behouden!).

---

## 👥 Geladen Leiding (26 leden)
Daan, Dominique, Eline, Emile, Floris, Gino, Hanne, Jassin, Jules, Julie, Len, Leon, Lex, Luna, Mart, Matthijs, Merlijn, Olivier, Phebe, Riet, Rik, Rosan, Siebe, Vicce, Lotte, Tobias.

---

## 🚀 Hoe starten?

### Lokaal starten (op laptop/PC in het KSA lokaal of thuis):
Dubbelklik op `start.bat` of voer uit in powershell/terminal:
```bash
node server.js
```

### Smartphone verbinden:
1. Zorg dat je smartphone op hetzelfde Wi-Fi netwerk zit (of gebruik hotspot).
2. Surf op je smartphone naar het getoonde IP-adres (bv. `http://10.0.1.113:3000`), of scan de **QR-code** op het tabblad **"Verbinden"**.
3. **Tip voor iOS/Android**: Tik op *"Zet op beginscherm"* (Add to Home Screen) in Safari of Chrome zodat het als een echte native app werkt!
