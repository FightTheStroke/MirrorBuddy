#!/usr/bin/env python3
"""
Genera PDF per Mario usando HTML + weasyprint.
Stesso stile dell'HTML che funzionava bene.
"""

import fitz  # PyMuPDF
import base64
import os
from weasyprint import HTML, CSS

PDF_ORIGINALE = "/Users/roberdan/Downloads/1-5-26, 12:34 Microsoft Lens.pdf"
OUTPUT_PDF = "/Users/roberdan/Downloads/ATMOSFERA_COMPLETO_MARIO.pdf"
OUTPUT_HTML = "/Users/roberdan/Downloads/ATMOSFERA_COMPLETO_MARIO.html"


def estrai_pagina_base64(pdf_path, page_num, dpi=120):
    """Estrae pagina come base64 per embedding in HTML."""
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img_data = pix.tobytes("png")
    doc.close()
    return base64.b64encode(img_data).decode('utf-8')


# CSS ottimizzato per DSA e stampa
CSS_STYLE = """
@import url('https://fonts.cdnfonts.com/css/opendyslexic');

@page {
    size: A4;
    margin: 2cm;
}

@media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
}

* { box-sizing: border-box; }

body {
    font-family: 'OpenDyslexic', 'Comic Sans MS', Arial, sans-serif;
    font-size: 18px;
    line-height: 1.8;
    letter-spacing: 0.03em;
    color: #000000;
    background-color: #ffffff;
    margin: 0;
    padding: 20px;
    text-transform: uppercase;
}

h1 {
    font-size: 28px;
    margin: 30px 0 20px 0;
    color: #000000;
    border-bottom: 3px solid #000000;
    padding-bottom: 10px;
    text-align: center;
}

h2 {
    font-size: 22px;
    margin: 25px 0 15px 0;
    color: #000000;
    border-bottom: 2px solid #000000;
    padding-bottom: 8px;
}

.copertina {
    text-align: center;
    padding: 40px 20px;
    border: 3px solid #000;
    margin-bottom: 30px;
}

.copertina h1 {
    font-size: 36px;
    border: none;
    margin-bottom: 10px;
}

.copertina h2 {
    font-size: 28px;
    border: none;
    margin-bottom: 30px;
}

.copertina .sottotitolo {
    font-size: 18px;
    margin: 20px 0;
}

.copertina .argomenti {
    font-size: 14px;
    margin-top: 40px;
    text-align: left;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
}

.concetto {
    margin-bottom: 20px;
    padding: 20px;
    background: #f5f5f5;
    border: 2px solid #000000;
    border-radius: 8px;
}

.concetto-titolo {
    font-weight: 700;
    font-size: 20px;
    margin-bottom: 12px;
    color: #000000;
}

.concetto p {
    margin: 8px 0;
}

.esempio {
    margin-top: 12px;
    padding: 12px;
    background: #ffffff;
    border: 2px dashed #000000;
    border-radius: 6px;
    font-size: 16px;
}

.pagina-libro {
    text-align: center;
    margin: 20px 0;
    padding: 10px;
    border: 1px solid #ccc;
}

.pagina-libro img {
    max-width: 100%;
    height: auto;
    border: 1px solid #000;
}

.pagina-libro .didascalia {
    font-size: 14px;
    margin-top: 10px;
    font-style: italic;
}

.mappa {
    margin: 20px 0;
    padding: 20px;
    background: #fafafa;
    border: 2px solid #000;
    border-radius: 8px;
}

.mappa-titolo {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 15px;
    padding: 10px;
    background: #e0e0e0;
    border-radius: 20px;
}

.mappa-nodi {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
}

.mappa-nodo {
    flex: 0 0 45%;
    padding: 12px;
    background: #fff;
    border: 2px solid #000;
    border-radius: 6px;
    text-align: center;
}

.mappa-nodo strong {
    display: block;
    margin-bottom: 5px;
}

.footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 2px solid #000000;
    font-size: 12px;
    text-align: center;
}

.page-break {
    page-break-before: always;
    height: 0;
}
"""


def genera_html():
    """Genera l'HTML completo."""

    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>L'ATMOSFERA E IL CLIMA - MARIO</title>
    <style>{CSS_STYLE}</style>
</head>
<body>

<!-- COPERTINA -->
<div class="copertina">
    <h1>SCIENZE</h1>
    <h2>L'ATMOSFERA E IL CLIMA</h2>
    <div class="sottotitolo">MATERIALE DI STUDIO PER MARIO</div>
    <div class="argomenti">
        1. PRESSIONE ATMOSFERICA<br>
        2. I VENTI<br>
        3. CIRCOLAZIONE ATMOSFERICA<br>
        4. UMIDITA' E FENOMENI<br>
        5. NUBI E PRECIPITAZIONI<br>
        6. PERTURBAZIONI<br>
        7. TEMPO E CLIMA
    </div>
</div>

<div class="footer">FONT GRANDE - TUTTO MAIUSCOLO - CONCETTI SEMPLICI - ADATTATO PER DSA</div>

<!-- SEZIONE 1: PRESSIONE -->
<div class="page-break"></div>
<h1>1. LA PRESSIONE ATMOSFERICA</h1>

<div class="concetto">
    <div class="concetto-titolo">COS'E' LA PRESSIONE?</div>
    <p>→ L'ARIA HA UN PESO E PREME SU DI NOI</p>
    <p>→ SI MISURA IN MILLIBAR (MBAR) O ETTOPASCAL (HPA)</p>
    <p>→ VALORE NORMALE: 1013 MBAR</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">COME VARIA LA PRESSIONE?</div>
    <p>→ IN ALTO (MONTAGNA): PRESSIONE BASSA</p>
    <p>→ IN BASSO (MARE): PRESSIONE ALTA</p>
    <p>→ CON IL CALDO: ARIA SALE, PRESSIONE SCENDE</p>
    <p>→ CON IL FREDDO: ARIA SCENDE, PRESSIONE SALE</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">ZONE DI ALTA E BASSA PRESSIONE</div>
    <p>→ ALTA PRESSIONE (ANTICICLONE) = BEL TEMPO</p>
    <p>→ BASSA PRESSIONE (CICLONE) = BRUTTO TEMPO</p>
    <p>→ L'ARIA VA DALL'ALTA ALLA BASSA PRESSIONE</p>
    <div class="esempio">
        ESEMPIO: PALLONCINO SI GONFIA IN MONTAGNA (MENO PRESSIONE)
    </div>
</div>

<div class="concetto">
    <div class="concetto-titolo">LE ISOBARE</div>
    <p>→ LINEE CHE UNISCONO PUNTI CON STESSA PRESSIONE</p>
    <p>→ SULLE CARTE DEL METEO</p>
    <p>→ ISOBARE VICINE = VENTO FORTE</p>
    <p>→ ISOBARE LONTANE = VENTO DEBOLE</p>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: PRESSIONE (1013 MBAR)</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>ALTA (A)</strong>ANTICICLONE<br>BEL TEMPO</div>
        <div class="mappa-nodo"><strong>BASSA (B)</strong>CICLONE<br>PIOGGIA</div>
        <div class="mappa-nodo"><strong>ISOBARE</strong>LINEE<br>CARTE METEO</div>
        <div class="mappa-nodo"><strong>GRADIENTE</strong>DA A VERSO B<br>CAUSA VENTO</div>
    </div>
</div>

<!-- SEZIONE 2: VENTI -->
<div class="page-break"></div>
<h1>2. I VENTI</h1>

<div class="concetto">
    <div class="concetto-titolo">COS'E' IL VENTO?</div>
    <p>→ ARIA CHE SI MUOVE</p>
    <p>→ VA DALL'ALTA ALLA BASSA PRESSIONE</p>
    <p>→ SI MISURA IN KM/H O NODI</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">COSA INFLUENZA IL VENTO?</div>
    <p>→ GRADIENTE BARICO (DIFFERENZA DI PRESSIONE)</p>
    <p>→ EFFETTO DI CORIOLIS (ROTAZIONE TERRA)</p>
    <p>→ ATTRITO CON IL SUOLO</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">TIPI DI VENTI</div>
    <p>→ PLANETARI: ALISEI (TROPICI), VENTI OCCIDENTALI</p>
    <p>→ PERIODICI: MONSONI (STAGIONALI)</p>
    <p>→ LOCALI: BREZZE (GIORNO/NOTTE)</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">LE BREZZE</div>
    <p>→ DI GIORNO: DAL MARE VERSO TERRA (BREZZA DI MARE)</p>
    <p>→ DI NOTTE: DALLA TERRA VERSO IL MARE (BREZZA DI TERRA)</p>
    <p>→ IL MARE SI SCALDA E RAFFREDDA PIU' LENTAMENTE</p>
    <div class="esempio">
        ESEMPIO: D'ESTATE AL MARE: POMERIGGIO VENTO FRESCO DAL MARE
    </div>
</div>

<div class="concetto">
    <div class="concetto-titolo">I MONSONI</div>
    <p>→ VENTI CHE CAMBIANO CON LE STAGIONI</p>
    <p>→ ESTATE: DAL MARE (PIOGGE FORTI)</p>
    <p>→ INVERNO: DALLA TERRA (SECCO)</p>
    <p>→ TIPICI DELL'ASIA (INDIA, CINA)</p>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: I VENTI</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>PLANETARI</strong>ALISEI<br>OCCIDENTALI</div>
        <div class="mappa-nodo"><strong>PERIODICI</strong>MONSONI<br>STAGIONALI</div>
        <div class="mappa-nodo"><strong>LOCALI</strong>BREZZE<br>GIORNO/NOTTE</div>
        <div class="mappa-nodo"><strong>CORIOLIS</strong>DEVIA I VENTI<br>ROTAZIONE TERRA</div>
    </div>
</div>

<!-- SEZIONE 3: CIRCOLAZIONE -->
<div class="page-break"></div>
<h1>3. CIRCOLAZIONE ATMOSFERICA</h1>

<div class="concetto">
    <div class="concetto-titolo">COME SI MUOVE L'ARIA SULLA TERRA?</div>
    <p>→ L'ARIA CALDA SALE (ALL'EQUATORE)</p>
    <p>→ L'ARIA FREDDA SCENDE (AI POLI)</p>
    <p>→ SI FORMANO GRANDI "CELLE" DI CIRCOLAZIONE</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">LE TRE CELLE</div>
    <p>→ CELLA DI HADLEY: EQUATORE → 30° (TROPICI)</p>
    <p>→ CELLA DI FERREL: 30° → 60° (ZONE TEMPERATE)</p>
    <p>→ CELLA POLARE: 60° → POLI</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">LE CORRENTI A GETTO</div>
    <p>→ FIUMI D'ARIA VELOCISSIMI (FINO A 500 KM/H!)</p>
    <p>→ VOLANO A 10 KM DI ALTEZZA</p>
    <p>→ GLI AEREI LI USANO PER ANDARE PIU' VELOCI</p>
    <p>→ SEPARANO ARIA CALDA E ARIA FREDDA</p>
    <div class="esempio">
        ESEMPIO: VOLO ROMA-NEW YORK: 9 ORE. RITORNO: 7 ORE (CORRENTE A GETTO)
    </div>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: CIRCOLAZIONE GLOBALE</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>HADLEY</strong>EQUATORE-30°<br>TROPICI</div>
        <div class="mappa-nodo"><strong>FERREL</strong>30°-60°<br>ZONE TEMPERATE</div>
        <div class="mappa-nodo"><strong>POLARE</strong>60°-POLI<br>ARIA FREDDA</div>
        <div class="mappa-nodo"><strong>CORRENTI GETTO</strong>500 KM/H<br>10 KM ALTEZZA</div>
    </div>
</div>

<!-- SEZIONE 4: UMIDITA' -->
<div class="page-break"></div>
<h1>4. UMIDITA' ATMOSFERICA</h1>

<div class="concetto">
    <div class="concetto-titolo">COS'E' L'UMIDITA'?</div>
    <p>→ VAPORE ACQUEO NELL'ARIA (ACQUA INVISIBILE)</p>
    <p>→ VIENE DALL'EVAPORAZIONE DI MARI E LAGHI</p>
    <p>→ PIU' FA CALDO, PIU' VAPORE PUO' STARE NELL'ARIA</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">UMIDITA' RELATIVA</div>
    <p>→ QUANTA ACQUA C'E' RISPETTO AL MASSIMO POSSIBILE</p>
    <p>→ SI MISURA IN PERCENTUALE (%)</p>
    <p>→ 100% = ARIA SATURA (NON PUO' PIU' CONTENERE ACQUA)</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">FENOMENI AL SUOLO</div>
    <p>→ RUGIADA: GOCCIOLINE SULL'ERBA AL MATTINO</p>
    <p>→ BRINA: RUGIADA GHIACCIATA (SOTTO 0°C)</p>
    <p>→ NEBBIA: NUVOLA A LIVELLO DEL SUOLO</p>
    <div class="esempio">
        ESEMPIO: D'INVERNO: VETRI APPANNATI (CONDENSA)
    </div>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: UMIDITA'</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>COS'E'?</strong>VAPORE ACQUEO<br>ACQUA INVISIBILE</div>
        <div class="mappa-nodo"><strong>RELATIVA</strong>IN %<br>100% = SATURA</div>
        <div class="mappa-nodo"><strong>RUGIADA</strong>GOCCE<br>AL MATTINO</div>
        <div class="mappa-nodo"><strong>NEBBIA</strong>NUVOLA BASSA<br>AL SUOLO</div>
    </div>
</div>

<!-- SEZIONE 5: NUBI -->
<div class="page-break"></div>
<h1>5. NUBI E PRECIPITAZIONI</h1>

<div class="concetto">
    <div class="concetto-titolo">COME SI FORMANO LE NUBI?</div>
    <p>→ L'ARIA CALDA SALE E SI RAFFREDDA</p>
    <p>→ IL VAPORE SI CONDENSA IN GOCCIOLINE</p>
    <p>→ LE GOCCIOLINE FORMANO LE NUBI</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">I TIPI DI NUBI</div>
    <p>→ CIRRI: ALTE, SOTTILI, A FILAMENTI (BELLO)</p>
    <p>→ CUMULI: A "BATUFFOLI", BIANCHE (VARIABILE)</p>
    <p>→ STRATI: GRIGIE, COPRONO IL CIELO (PIOGGIA LEGGERA)</p>
    <p>→ CUMULONEMBI: ALTE TORRI, TEMPORALI!</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">LE PRECIPITAZIONI</div>
    <p>→ PIOGGIA: GOCCE D'ACQUA (SOPRA 0°C)</p>
    <p>→ NEVE: CRISTALLI DI GHIACCIO (SOTTO 0°C)</p>
    <p>→ GRANDINE: CHICCHI DI GHIACCIO (TEMPORALI FORTI)</p>
    <div class="esempio">
        ESEMPIO: TEMPORALE ESTIVO: CUMULONEMBO → GRANDINE
    </div>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: NUBI E PRECIPITAZIONI</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>CIRRI</strong>ALTE<br>FILAMENTI</div>
        <div class="mappa-nodo"><strong>CUMULI</strong>BATUFFOLI<br>BIANCHI</div>
        <div class="mappa-nodo"><strong>STRATI</strong>GRIGIE<br>COPRONO CIELO</div>
        <div class="mappa-nodo"><strong>CUMULONEMBI</strong>TORRI<br>TEMPORALI</div>
    </div>
</div>

<!-- SEZIONE 6: PERTURBAZIONI -->
<div class="page-break"></div>
<h1>6. LE PERTURBAZIONI</h1>

<div class="concetto">
    <div class="concetto-titolo">COSA SONO LE PERTURBAZIONI?</div>
    <p>→ CAMBIAMENTI TEMPORANEI DEL TEMPO</p>
    <p>→ PORTANO NUVOLE, PIOGGIA, VENTO</p>
    <p>→ DURANO DA POCHE ORE A QUALCHE GIORNO</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">I CICLONI TROPICALI (URAGANI)</div>
    <p>→ NASCONO SUGLI OCEANI CALDI (TROPICI)</p>
    <p>→ VENTI FORTISSIMI (OLTRE 300 KM/H!)</p>
    <p>→ HANNO UN "OCCHIO" CALMO AL CENTRO</p>
    <p>→ PORTANO PIOGGE VIOLENTE E INONDAZIONI</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">I FRONTI</div>
    <p>→ CONFINE TRA DUE MASSE D'ARIA DIVERSE</p>
    <p>→ FRONTE FREDDO: ARIA FREDDA SPINGE VIA CALDA</p>
    <p>→ FRONTE CALDO: ARIA CALDA SOPRA FREDDA</p>
    <p>→ FRONTE OCCLUSO: I DUE SI INCONTRANO</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">I TORNADO (TROMBE D'ARIA)</div>
    <p>→ VORTICE VIOLENTO CHE TOCCA TERRA</p>
    <p>→ VENTI FINO A 500 KM/H!</p>
    <p>→ DURA 5-15 MINUTI MA FA GRANDI DANNI</p>
    <p>→ TIPICI DEGLI USA (TORNADO ALLEY)</p>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: PERTURBAZIONI</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>CICLONI</strong>URAGANI<br>OCEANI CALDI</div>
        <div class="mappa-nodo"><strong>TORNADO</strong>TROMBE D'ARIA<br>500 KM/H</div>
        <div class="mappa-nodo"><strong>FRONTE FREDDO</strong>ARIA FREDDA<br>AVANZA</div>
        <div class="mappa-nodo"><strong>FRONTE CALDO</strong>ARIA CALDA<br>SOPRA</div>
    </div>
</div>

<!-- SEZIONE 7: TEMPO E CLIMA -->
<div class="page-break"></div>
<h1>7. TEMPO E CLIMA</h1>

<div class="concetto">
    <div class="concetto-titolo">TEMPO VS CLIMA: SONO DIVERSI!</div>
    <p>→ TEMPO: CONDIZIONI DI OGGI (ORA, DOMANI)</p>
    <p>→ CLIMA: MEDIA SU TANTI ANNI (30 ANNI)</p>
    <p>→ "OGGI PIOVE" = TEMPO</p>
    <p>→ "QUI PIOVE MOLTO IN INVERNO" = CLIMA</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">COSA STUDIA IL METEO?</div>
    <p>→ TEMPERATURA, PRESSIONE, UMIDITA'</p>
    <p>→ VENTO, NUVOLOSITA', PRECIPITAZIONI</p>
    <p>→ USA SATELLITI, RADAR, STAZIONI METEO</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">I FATTORI DEL CLIMA</div>
    <p>→ LATITUDINE: PIU' LONTANO DALL'EQUATORE = PIU' FREDDO</p>
    <p>→ ALTITUDINE: PIU' IN ALTO = PIU' FREDDO</p>
    <p>→ VICINANZA AL MARE: CLIMA PIU' MITE</p>
    <p>→ CORRENTI MARINE: POSSONO SCALDARE O RAFFREDDARE</p>
</div>

<div class="concetto">
    <div class="concetto-titolo">ISOLA DI CALORE URBANA</div>
    <p>→ IN CITTA' FA PIU' CALDO CHE IN CAMPAGNA</p>
    <p>→ ASFALTO E CEMENTO TRATTENGONO IL CALORE</p>
    <p>→ MENO ALBERI = MENO OMBRA</p>
    <p>→ FINO A 3°C DI DIFFERENZA!</p>
</div>

<div class="mappa">
    <div class="mappa-titolo">MAPPA: TEMPO E CLIMA</div>
    <div class="mappa-nodi">
        <div class="mappa-nodo"><strong>TEMPO</strong>OGGI<br>DOMANI</div>
        <div class="mappa-nodo"><strong>CLIMA</strong>MEDIA<br>30 ANNI</div>
        <div class="mappa-nodo"><strong>LATITUDINE</strong>EQUATORE=CALDO<br>POLI=FREDDO</div>
        <div class="mappa-nodo"><strong>CITTA'</strong>ISOLA CALORE<br>+3°C</div>
    </div>
</div>

<div class="footer">
    MATERIALE CREATO PER MARIO - SCIENZE: L'ATMOSFERA E IL CLIMA
</div>

</body>
</html>
"""
    return html


def main():
    print("Generazione PDF per Mario - ATMOSFERA E CLIMA...")
    print("  Metodo: HTML → PDF (weasyprint)")

    # Genera HTML
    print("  - Generazione HTML...")
    html_content = genera_html()

    # Salva HTML (utile per debug)
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"  - HTML salvato: {OUTPUT_HTML}")

    # Converti in PDF
    print("  - Conversione in PDF...")
    HTML(string=html_content).write_pdf(OUTPUT_PDF)

    print(f"\n✓ PDF creato: {OUTPUT_PDF}")
    print(f"  Dimensione: {os.path.getsize(OUTPUT_PDF) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
