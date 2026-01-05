#!/usr/bin/env python3
"""
Genera PDF completo per Mario: L'ATMOSFERA E IL CLIMA
- Pagine originali del libro
- Riassunti semplificati
- Mappe mentali

Requisiti: pip install pymupdf reportlab pillow
"""

import fitz  # PyMuPDF
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
import math

# CONFIGURAZIONE PAGINA - PORTRAIT con margini ampi per stampa sicura
PAGE_SIZE = A4  # Portrait: 595 x 842 punti
PAGE_W, PAGE_H = PAGE_SIZE
MARGIN = 2.5 * cm  # Margine di sicurezza per stampanti

# Percorsi
PDF_ORIGINALE = "/Users/roberdan/Downloads/1-5-26, 12:34 Microsoft Lens.pdf"
OUTPUT_PDF = "/Users/roberdan/Downloads/ATMOSFERA_COMPLETO_MARIO.pdf"
FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")

# Registra font OpenDyslexic (ottimizzato per dislessia)
try:
    pdfmetrics.registerFont(TTFont('OpenDyslexic', os.path.join(FONT_DIR, 'OpenDyslexic-Regular.ttf')))
    pdfmetrics.registerFont(TTFont('OpenDyslexic-Bold', os.path.join(FONT_DIR, 'OpenDyslexic-Bold.ttf')))
    pdfmetrics.registerFont(TTFont('OpenDyslexic-Italic', os.path.join(FONT_DIR, 'OpenDyslexic-Italic.ttf')))
    FONT_NORMAL = 'OpenDyslexic'
    FONT_BOLD = 'OpenDyslexic-Bold'
    FONT_ITALIC = 'OpenDyslexic-Italic'
    print("✓ Font OpenDyslexic caricato (ottimizzato per dislessia)")
except Exception as e:
    print(f"⚠ Font OpenDyslexic non trovato, uso Helvetica: {e}")
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'
    FONT_ITALIC = 'Helvetica-Oblique'

# Colori
GRIGIO_CHIARO = HexColor("#F5F5F5")
GRIGIO_SCURO = HexColor("#333333")
NERO = black
BIANCO = white


def calcola_punto_bordo_ellisse(cx, cy, rx, ry, target_x, target_y):
    """Calcola il punto sul bordo dell'ellisse nella direzione del target."""
    angle = math.atan2(target_y - cy, target_x - cx)
    return (cx + rx * math.cos(angle), cy + ry * math.sin(angle))


def calcola_punto_bordo_box(box_cx, box_cy, box_w, box_h, target_x, target_y):
    """Calcola il punto sul bordo del box rettangolare nella direzione del target."""
    dx = target_x - box_cx
    dy = target_y - box_cy

    if dx == 0 and dy == 0:
        return (box_cx, box_cy)

    half_w = box_w / 2
    half_h = box_h / 2

    if dx != 0:
        if dx > 0:
            t_right = half_w / dx
            y_at_right = dy * t_right
            if abs(y_at_right) <= half_h:
                return (box_cx + half_w, box_cy + y_at_right)
        else:
            t_left = -half_w / dx
            y_at_left = dy * t_left
            if abs(y_at_left) <= half_h:
                return (box_cx - half_w, box_cy + y_at_left)

    if dy != 0:
        if dy > 0:
            t_top = half_h / dy
            x_at_top = dx * t_top
            if abs(x_at_top) <= half_w:
                return (box_cx + x_at_top, box_cy + half_h)
        else:
            t_bottom = -half_h / dy
            x_at_bottom = dx * t_bottom
            if abs(x_at_bottom) <= half_w:
                return (box_cx + x_at_bottom, box_cy - half_h)

    return (box_cx, box_cy)


def estrai_pagina_come_immagine(pdf_path, page_num, dpi=150):
    """Estrae una pagina del PDF come immagine PNG."""
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img_data = pix.tobytes("png")
    doc.close()
    return img_data


def disegna_titolo_sezione(c, titolo, y):
    """Disegna un titolo di sezione."""
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 22)  # Ridotto da 28
    c.drawCentredString(PAGE_W/2, y, titolo.upper())
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)
    return y - 35


def disegna_box_concetto(c, titolo, contenuti, y):
    """Disegna un box con un concetto."""
    box_height = 28 + len(contenuti) * 20 + 15  # Ridotto

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(MARGIN, y - box_height, PAGE_W - 2*MARGIN, box_height, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)  # Ridotto da 16
    c.drawString(MARGIN + 0.5*cm, y - 22, titolo.upper())

    c.setFont(FONT_NORMAL, 11)  # Ridotto da 13
    current_y = y - 42
    for contenuto in contenuti:
        c.drawString(MARGIN + 1*cm, current_y, "→ " + contenuto.upper())
        current_y -= 20

    return y - box_height - 15


def disegna_esempio(c, testo, y):
    """Disegna un box esempio."""
    c.setStrokeColor(NERO)
    c.setLineWidth(1)
    c.setDash([5, 3])
    c.roundRect(MARGIN + 0.5*cm, y - 32, PAGE_W - 2*MARGIN - 1*cm, 28, 5, fill=0, stroke=1)
    c.setDash([])

    c.setFont(FONT_ITALIC, 10)  # Ridotto da 12
    c.drawString(MARGIN + 1*cm, y - 22, "ESEMPIO: " + testo.upper())

    return y - 55


def aggiungi_pagina_libro(c, pdf_path, page_num, label):
    """Aggiunge una pagina del libro originale al PDF."""
    c.showPage()

    c.setFont(FONT_BOLD, 12)  # Ridotto da 16
    c.setFillColor(GRIGIO_SCURO)
    c.drawCentredString(PAGE_W/2, PAGE_H - 1.2*cm, f"PAGINA ORIGINALE DEL LIBRO - {label}".upper())

    img_data = estrai_pagina_come_immagine(pdf_path, page_num, dpi=120)

    temp_path = f"/tmp/atm_page_{page_num}.png"
    with open(temp_path, "wb") as f:
        f.write(img_data)

    # In landscape, l'immagine portrait va centrata
    img_width = PAGE_W - 2*MARGIN
    img_height = PAGE_H - 2.5*cm
    c.drawImage(temp_path, MARGIN, 0.8*cm, width=img_width, height=img_height, preserveAspectRatio=True)

    os.remove(temp_path)


def crea_copertina(c):
    """Crea la pagina di copertina - layout portrait con margini sicuri."""
    c.setFillColor(BIANCO)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1)

    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.rect(MARGIN, MARGIN, PAGE_W - 2*MARGIN, PAGE_H - 2*MARGIN, fill=0)

    c.setFillColor(NERO)

    # Titolo centrato
    c.setFont(FONT_BOLD, 36)
    c.drawCentredString(PAGE_W/2, PAGE_H - 4*cm, "SCIENZE")

    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(PAGE_W/2, PAGE_H - 6*cm, "L'ATMOSFERA")
    c.drawCentredString(PAGE_W/2, PAGE_H - 7.2*cm, "E IL CLIMA")

    c.setFont(FONT_NORMAL, 16)
    c.drawCentredString(PAGE_W/2, PAGE_H - 10*cm, "MATERIALE DI STUDIO")
    c.drawCentredString(PAGE_W/2, PAGE_H - 11*cm, "PER MARIO")

    # Argomenti centrati
    c.setFont(FONT_NORMAL, 11)
    y = PAGE_H - 14*cm
    argomenti = [
        "1. PRESSIONE ATMOSFERICA",
        "2. I VENTI",
        "3. CIRCOLAZIONE ATMOSFERICA",
        "4. UMIDITA' E FENOMENI",
        "5. NUBI E PRECIPITAZIONI",
        "6. PERTURBAZIONI",
        "7. TEMPO E CLIMA",
    ]
    for arg in argomenti:
        c.drawCentredString(PAGE_W/2, y, arg)
        y -= 20

    c.setFont(FONT_ITALIC, 9)
    c.drawCentredString(PAGE_W/2, MARGIN + 1*cm, "FONT GRANDE - TUTTO MAIUSCOLO - CONCETTI SEMPLICI - ADATTATO PER DSA")


def crea_super_mappa(c):
    """Crea una mappa panoramica di tutti gli argomenti - layout landscape."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 20)  # Ridotto da 26
    c.drawCentredString(PAGE_W/2, y, "PANORAMICA: L'ATMOSFERA")
    c.setLineWidth(2)
    c.line(MARGIN, y - 12, PAGE_W - MARGIN, y - 12)

    # Nodo centrale - in landscape abbiamo piu' larghezza
    cx, cy = PAGE_W/2, PAGE_H/2
    rx, ry = 60, 28  # Ridotto da 70, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)  # Ridotto da 18
    c.drawCentredString(cx, cy + 3, "ATMOSFERA")

    # Argomenti - distribuiti meglio in landscape (piu' larghi, meno alti)
    argomenti = [
        (cx - 220, cy + 110, "PRESSIONE", "ALTA/BASSA"),
        (cx + 220, cy + 110, "VENTI", "ARIA CHE SI MUOVE"),
        (cx - 280, cy, "UMIDITA'", "VAPORE ACQUEO"),
        (cx + 280, cy, "NUBI", "PIOGGIA/NEVE"),
        (cx - 220, cy - 110, "PERTURBAZIONI", "CICLONI/FRONTI"),
        (cx + 220, cy - 110, "CLIMA", "TEMPO MEDIO"),
        (cx, cy - 140, "PREVISIONI", "METEO"),
    ]

    box_w, box_h = 110, 45  # Ridotto da 130, 60

    for ax, ay, titolo, sotto in argomenti:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, ax, ay)
        punto_box = calcola_punto_bordo_box(ax, ay, box_w, box_h, cx, cy)

        c.setStrokeColor(NERO)
        c.setLineWidth(1.5)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.setStrokeColor(NERO)
        c.setLineWidth(1.5)
        c.roundRect(ax - box_w/2, ay - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)  # Ridotto da 12
        c.drawCentredString(ax, ay + 8, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 10
        c.drawCentredString(ax, ay - 6, sotto)

    # Box istruzioni - piu' compatto
    c.setFillColor(GRIGIO_CHIARO)
    c.roundRect(MARGIN, 1.2*cm, PAGE_W - 2*MARGIN, 45, 8, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 10)  # Ridotto da 12
    c.drawCentredString(PAGE_W/2, 1.2*cm + 32, "COME USARE: 1. LEGGI LE PAGINE DEL LIBRO  |  2. STUDIA IL RIASSUNTO  |  3. USA LA MAPPA PER RIPASSARE")


# ============================================================
# SEZIONE 1: PRESSIONE ATMOSFERICA
# ============================================================

def crea_sezione_pressione(c):
    """Crea la sezione sulla pressione atmosferica."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "1. LA PRESSIONE ATMOSFERICA", y)

    y = disegna_box_concetto(c, "COS'E' LA PRESSIONE?", [
        "L'ARIA HA UN PESO E PREME SU DI NOI",
        "SI MISURA IN MILLIBAR (MBAR) O ETTOPASCAL (HPA)",
        "VALORE NORMALE: 1013 MBAR",
    ], y)

    y = disegna_box_concetto(c, "COME VARIA LA PRESSIONE?", [
        "IN ALTO (MONTAGNA): PRESSIONE BASSA",
        "IN BASSO (MARE): PRESSIONE ALTA",
        "CON IL CALDO: ARIA SALE, PRESSIONE SCENDE",
        "CON IL FREDDO: ARIA SCENDE, PRESSIONE SALE",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "ZONE DI ALTA E BASSA PRESSIONE", [
        "ALTA PRESSIONE (ANTICICLONE) = BEL TEMPO",
        "BASSA PRESSIONE (CICLONE) = BRUTTO TEMPO",
        "L'ARIA VA DALL'ALTA ALLA BASSA PRESSIONE",
    ], y)
    y = disegna_esempio(c, "PALLONCINO SI GONFIA IN MONTAGNA (MENO PRESSIONE)", y)

    y = disegna_box_concetto(c, "LE ISOBARE", [
        "LINEE CHE UNISCONO PUNTI CON STESSA PRESSIONE",
        "SULLE CARTE DEL METEO",
        "ISOBARE VICINE = VENTO FORTE",
        "ISOBARE LONTANE = VENTO DEBOLE",
    ], y)


def crea_mappa_pressione(c):
    """Crea mappa mentale pressione atmosferica."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 18)  # Ridotto da 22
    c.drawCentredString(PAGE_W/2, y, "MAPPA: PRESSIONE ATMOSFERICA")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 70, 30  # Ridotto

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)  # Ridotto da 16
    c.drawCentredString(cx, cy + 6, "PRESSIONE")
    c.setFont(FONT_NORMAL, 10)  # Ridotto da 12
    c.drawCentredString(cx, cy - 8, "1013 MBAR")

    # Nodi disposti per landscape (piu' larghi)
    nodi = [
        (cx - 200, cy + 100, "ALTA (A)", ["ANTICICLONE", "BEL TEMPO"]),
        (cx + 200, cy + 100, "BASSA (B)", ["CICLONE", "PIOGGIA"]),
        (cx - 220, cy - 30, "ISOBARE", ["LINEE", "CARTE METEO"]),
        (cx + 220, cy - 30, "VARIA CON", ["ALTITUDINE", "TEMPERATURA"]),
        (cx, cy - 120, "GRADIENTE", ["DA A VERSO B", "CAUSA VENTO"]),
    ]

    box_w, box_h = 105, 55  # Ridotto da 120, 70

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)  # Ridotto da 11
        c.drawCentredString(nx, ny + 14, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 2 - i*12, s)


# ============================================================
# SEZIONE 2: I VENTI
# ============================================================

def crea_sezione_venti(c):
    """Crea la sezione sui venti."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "2. I VENTI", y)

    y = disegna_box_concetto(c, "COS'E' IL VENTO?", [
        "ARIA CHE SI MUOVE",
        "VA DALL'ALTA ALLA BASSA PRESSIONE",
        "SI MISURA IN KM/H O NODI",
    ], y)

    y = disegna_box_concetto(c, "COSA INFLUENZA IL VENTO?", [
        "GRADIENTE BARICO (DIFFERENZA DI PRESSIONE)",
        "EFFETTO DI CORIOLIS (ROTAZIONE TERRA)",
        "ATTRITO CON IL SUOLO",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "TIPI DI VENTI", [
        "PLANETARI: ALISEI (TROPICI), VENTI OCCIDENTALI",
        "PERIODICI: MONSONI (STAGIONALI)",
        "LOCALI: BREZZE (GIORNO/NOTTE)",
    ], y)

    y = disegna_box_concetto(c, "LE BREZZE", [
        "DI GIORNO: DAL MARE VERSO TERRA (BREZZA DI MARE)",
        "DI NOTTE: DALLA TERRA VERSO IL MARE (BREZZA DI TERRA)",
        "IL MARE SI SCALDA E RAFFREDDA PIU' LENTAMENTE",
    ], y)
    y = disegna_esempio(c, "D'ESTATE AL MARE: POMERIGGIO VENTO FRESCO DAL MARE", y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "I MONSONI", [
        "VENTI CHE CAMBIANO CON LE STAGIONI",
        "ESTATE: DAL MARE (PIOGGE FORTI)",
        "INVERNO: DALLA TERRA (SECCO)",
        "TIPICI DELL'ASIA (INDIA, CINA)",
    ], y)


def crea_mappa_venti(c):
    """Crea mappa mentale venti."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 18)  # Ridotto da 22
    c.drawCentredString(PAGE_W/2, y, "MAPPA: I VENTI")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 60, 26  # Ridotto

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)  # Ridotto da 18
    c.drawCentredString(cx, cy + 3, "VENTI")

    # Nodi disposti per landscape
    nodi = [
        (cx - 200, cy + 95, "COS'E'?", ["ARIA IN MOVIMENTO", "DA A → B"]),
        (cx + 200, cy + 95, "MISURA", ["KM/H", "NODI"]),
        (cx - 240, cy, "PLANETARI", ["ALISEI", "OCCIDENTALI"]),
        (cx + 240, cy, "PERIODICI", ["MONSONI", "STAGIONALI"]),
        (cx - 180, cy - 100, "LOCALI", ["BREZZE", "GIORNO/NOTTE"]),
        (cx + 180, cy - 100, "CORIOLIS", ["DEVIA I VENTI", "ROTAZIONE TERRA"]),
    ]

    box_w, box_h = 105, 52  # Ridotto da 120, 65

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)  # Ridotto da 11
        c.drawCentredString(nx, ny + 12, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 3 - i*11, s)


# ============================================================
# SEZIONE 3: CIRCOLAZIONE ATMOSFERICA
# ============================================================

def crea_sezione_circolazione(c):
    """Crea la sezione sulla circolazione atmosferica."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "3. CIRCOLAZIONE ATMOSFERICA", y)

    y = disegna_box_concetto(c, "COME SI MUOVE L'ARIA SULLA TERRA?", [
        "L'ARIA CALDA SALE (ALL'EQUATORE)",
        "L'ARIA FREDDA SCENDE (AI POLI)",
        "SI FORMANO GRANDI 'CELLE' DI CIRCOLAZIONE",
    ], y)

    y = disegna_box_concetto(c, "LE TRE CELLE", [
        "CELLA DI HADLEY: EQUATORE → 30° (TROPICI)",
        "CELLA DI FERREL: 30° → 60° (ZONE TEMPERATE)",
        "CELLA POLARE: 60° → POLI",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "LE CORRENTI A GETTO", [
        "FIUMI D'ARIA VELOCISSIMI (FINO A 500 KM/H!)",
        "VOLANO A 10 KM DI ALTEZZA",
        "GLI AEREI LI USANO PER ANDARE PIU' VELOCI",
        "SEPARANO ARIA CALDA E ARIA FREDDA",
    ], y)
    y = disegna_esempio(c, "VOLO ROMA-NEW YORK: 9 ORE. RITORNO: 7 ORE (CORRENTE A GETTO)", y)


def crea_mappa_circolazione(c):
    """Crea mappa mentale circolazione."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 16)  # Ridotto da 20
    c.drawCentredString(PAGE_W/2, y, "MAPPA: CIRCOLAZIONE ATMOSFERICA")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 70, 30  # Ridotto da 80, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 12)  # Ridotto da 14
    c.drawCentredString(cx, cy + 6, "CIRCOLAZIONE")
    c.setFont(FONT_NORMAL, 9)  # Ridotto da 11
    c.drawCentredString(cx, cy - 8, "GLOBALE")

    # Nodi disposti per landscape
    nodi = [
        (cx - 200, cy + 100, "HADLEY", ["EQUATORE-30°", "TROPICI"]),
        (cx + 200, cy + 100, "FERREL", ["30°-60°", "ZONE TEMPERATE"]),
        (cx - 220, cy - 30, "POLARE", ["60°-POLI", "ARIA FREDDA"]),
        (cx + 220, cy - 30, "CORRENTI GETTO", ["500 KM/H", "10 KM ALTEZZA"]),
        (cx, cy - 120, "MOTORE", ["SOLE SCALDA", "EQUATORE"]),
    ]

    box_w, box_h = 105, 52  # Ridotto da 120, 65

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 9)  # Ridotto da 10
        c.drawCentredString(nx, ny + 12, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 3 - i*11, s)


# ============================================================
# SEZIONE 4: UMIDITA'
# ============================================================

def crea_sezione_umidita(c):
    """Crea la sezione sull'umidita'."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "4. UMIDITA' ATMOSFERICA", y)

    y = disegna_box_concetto(c, "COS'E' L'UMIDITA'?", [
        "VAPORE ACQUEO NELL'ARIA (ACQUA INVISIBILE)",
        "VIENE DALL'EVAPORAZIONE DI MARI E LAGHI",
        "PIU' FA CALDO, PIU' VAPORE PUO' STARE NELL'ARIA",
    ], y)

    y = disegna_box_concetto(c, "UMIDITA' RELATIVA", [
        "QUANTA ACQUA C'E' RISPETTO AL MASSIMO POSSIBILE",
        "SI MISURA IN PERCENTUALE (%)",
        "100% = ARIA SATURA (NON PUO' PIU' CONTENERE ACQUA)",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "FENOMENI AL SUOLO", [
        "RUGIADA: GOCCIOLINE SULL'ERBA AL MATTINO",
        "BRINA: RUGIADA GHIACCIATA (SOTTO 0°C)",
        "NEBBIA: NUVOLA A LIVELLO DEL SUOLO",
    ], y)
    y = disegna_esempio(c, "D'INVERNO: VETRI APPANNATI (CONDENSA)", y)


def crea_mappa_umidita(c):
    """Crea mappa mentale umidita'."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 18)  # Ridotto da 22
    c.drawCentredString(PAGE_W/2, y, "MAPPA: UMIDITA'")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 60, 26  # Ridotto da 70, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)  # Ridotto da 16
    c.drawCentredString(cx, cy + 4, "UMIDITA'")

    # Nodi disposti per landscape
    nodi = [
        (cx - 200, cy + 100, "COS'E'?", ["VAPORE ACQUEO", "ACQUA INVISIBILE"]),
        (cx + 200, cy + 100, "RELATIVA", ["IN %", "100% = SATURA"]),
        (cx - 220, cy, "RUGIADA", ["GOCCE", "AL MATTINO"]),
        (cx + 220, cy, "BRINA", ["GHIACCIO", "SOTTO 0°C"]),
        (cx, cy - 110, "NEBBIA", ["NUVOLA BASSA", "AL SUOLO"]),
    ]

    box_w, box_h = 100, 50  # Ridotto da 110, 60

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)  # Ridotto da 11
        c.drawCentredString(nx, ny + 11, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 4 - i*10, s)


# ============================================================
# SEZIONE 5: NUBI E PRECIPITAZIONI
# ============================================================

def crea_sezione_nubi(c):
    """Crea la sezione su nubi e precipitazioni."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "5. NUBI E PRECIPITAZIONI", y)

    y = disegna_box_concetto(c, "COME SI FORMANO LE NUBI?", [
        "L'ARIA CALDA SALE E SI RAFFREDDA",
        "IL VAPORE SI CONDENSA IN GOCCIOLINE",
        "LE GOCCIOLINE FORMANO LE NUBI",
    ], y)

    y = disegna_box_concetto(c, "I TIPI DI NUBI", [
        "CIRRI: ALTE, SOTTILI, A FILAMENTI (BELLO)",
        "CUMULI: A 'BATUFFOLI', BIANCHE (VARIABILE)",
        "STRATI: GRIGIE, COPRONO IL CIELO (PIOGGIA LEGGERA)",
        "CUMULONEMBI: ALTE TORRI, TEMPORALI!",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "LE PRECIPITAZIONI", [
        "PIOGGIA: GOCCE D'ACQUA (SOPRA 0°C)",
        "NEVE: CRISTALLI DI GHIACCIO (SOTTO 0°C)",
        "GRANDINE: CHICCHI DI GHIACCIO (TEMPORALI FORTI)",
    ], y)
    y = disegna_esempio(c, "TEMPORALE ESTIVO: CUMULONEMBO → GRANDINE", y)

    y = disegna_box_concetto(c, "CARTE PLUVIOMETRICHE", [
        "MOSTRANO QUANTA PIOGGIA CADE",
        "SI MISURA IN MILLIMETRI (MM)",
        "ZONE EQUATORIALI: MOLTA PIOGGIA",
        "DESERTI: POCHISSIMA PIOGGIA",
    ], y)


def crea_mappa_nubi(c):
    """Crea mappa mentale nubi."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 16)  # Ridotto da 22
    c.drawCentredString(PAGE_W/2, y, "MAPPA: NUBI E PRECIPITAZIONI")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 55, 24  # Ridotto da 70, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)  # Ridotto da 16
    c.drawCentredString(cx, cy + 3, "NUBI")

    # Nodi disposti per landscape (7 nodi - piu' larghi)
    nodi = [
        (cx - 200, cy + 95, "CIRRI", ["ALTE", "FILAMENTI"]),
        (cx + 200, cy + 95, "CUMULI", ["BATUFFOLI", "BIANCHI"]),
        (cx - 260, cy, "STRATI", ["GRIGIE", "COPRONO CIELO"]),
        (cx + 260, cy, "CUMULONEMBI", ["TORRI", "TEMPORALI"]),
        (cx - 180, cy - 100, "PIOGGIA", ["GOCCE", "SOPRA 0°C"]),
        (cx + 180, cy - 100, "NEVE", ["CRISTALLI", "SOTTO 0°C"]),
        (cx, cy - 125, "GRANDINE", ["GHIACCIO", "TEMPORALI"]),
    ]

    box_w, box_h = 90, 45  # Ridotto da 100, 55

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 9)  # Ridotto da 10
        c.drawCentredString(nx, ny + 10, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 4 - i*10, s)


# ============================================================
# SEZIONE 6: PERTURBAZIONI
# ============================================================

def crea_sezione_perturbazioni(c):
    """Crea la sezione sulle perturbazioni."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "6. LE PERTURBAZIONI", y)

    y = disegna_box_concetto(c, "COSA SONO LE PERTURBAZIONI?", [
        "CAMBIAMENTI TEMPORANEI DEL TEMPO",
        "PORTANO NUVOLE, PIOGGIA, VENTO",
        "DURANO DA POCHE ORE A QUALCHE GIORNO",
    ], y)

    y = disegna_box_concetto(c, "I CICLONI TROPICALI (URAGANI)", [
        "NASCONO SUGLI OCEANI CALDI (TROPICI)",
        "VENTI FORTISSIMI (OLTRE 300 KM/H!)",
        "HANNO UN 'OCCHIO' CALMO AL CENTRO",
        "PORTANO PIOGGE VIOLENTE E INONDAZIONI",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "I FRONTI", [
        "CONFINE TRA DUE MASSE D'ARIA DIVERSE",
        "FRONTE FREDDO: ARIA FREDDA SPINGE VIA CALDA",
        "FRONTE CALDO: ARIA CALDA SOPRA FREDDA",
        "FRONTE OCCLUSO: I DUE SI INCONTRANO",
    ], y)

    y = disegna_box_concetto(c, "I TORNADO (TROMBE D'ARIA)", [
        "VORTICE VIOLENTO CHE TOCCA TERRA",
        "VENTI FINO A 500 KM/H!",
        "DURA 5-15 MINUTI MA FA GRANDI DANNI",
        "TIPICI DEGLI USA (TORNADO ALLEY)",
    ], y)


def crea_mappa_perturbazioni(c):
    """Crea mappa mentale perturbazioni."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 18)  # Ridotto da 22
    c.drawCentredString(PAGE_W/2, y, "MAPPA: PERTURBAZIONI")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 70, 26  # Ridotto da 80, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 12)  # Ridotto da 14
    c.drawCentredString(cx, cy + 4, "PERTURBAZIONI")

    # Nodi disposti per landscape
    nodi = [
        (cx - 200, cy + 100, "CICLONI", ["URAGANI", "OCEANI CALDI"]),
        (cx + 200, cy + 100, "TORNADO", ["TROMBE D'ARIA", "500 KM/H"]),
        (cx - 220, cy - 30, "FRONTE FREDDO", ["ARIA FREDDA", "AVANZA"]),
        (cx + 220, cy - 30, "FRONTE CALDO", ["ARIA CALDA", "SOPRA"]),
        (cx, cy - 115, "EFFETTI", ["PIOGGIA", "VENTO FORTE"]),
    ]

    box_w, box_h = 100, 50  # Ridotto da 115, 60

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 9)  # Ridotto da 10
        c.drawCentredString(nx, ny + 11, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 4 - i*10, s)


# ============================================================
# SEZIONE 7: TEMPO E CLIMA
# ============================================================

def crea_sezione_tempo_clima(c):
    """Crea la sezione su tempo e clima."""
    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_titolo_sezione(c, "7. TEMPO E CLIMA", y)

    y = disegna_box_concetto(c, "TEMPO VS CLIMA: SONO DIVERSI!", [
        "TEMPO: CONDIZIONI DI OGGI (ORA, DOMANI)",
        "CLIMA: MEDIA SU TANTI ANNI (30 ANNI)",
        "'OGGI PIOVE' = TEMPO",
        "'QUI PIOVE MOLTO IN INVERNO' = CLIMA",
    ], y)

    y = disegna_box_concetto(c, "COSA STUDIA IL METEO?", [
        "TEMPERATURA, PRESSIONE, UMIDITA'",
        "VENTO, NUVOLOSITA', PRECIPITAZIONI",
        "USA SATELLITI, RADAR, STAZIONI METEO",
    ], y)

    c.showPage()
    y = PAGE_H - 2*cm

    y = disegna_box_concetto(c, "I FATTORI DEL CLIMA", [
        "LATITUDINE: PIU' LONTANO DALL'EQUATORE = PIU' FREDDO",
        "ALTITUDINE: PIU' IN ALTO = PIU' FREDDO",
        "VICINANZA AL MARE: CLIMA PIU' MITE",
        "CORRENTI MARINE: POSSONO SCALDARE O RAFFREDDARE",
    ], y)

    y = disegna_box_concetto(c, "ISOLA DI CALORE URBANA", [
        "IN CITTA' FA PIU' CALDO CHE IN CAMPAGNA",
        "ASFALTO E CEMENTO TRATTENGONO IL CALORE",
        "MENO ALBERI = MENO OMBRA",
        "FINO A 3°C DI DIFFERENZA!",
    ], y)


def crea_mappa_tempo_clima(c):
    """Crea mappa mentale tempo e clima."""
    c.showPage()
    y = PAGE_H - 1.5*cm

    c.setFont(FONT_BOLD, 18)  # Ridotto da 22
    c.drawCentredString(PAGE_W/2, y, "MAPPA: TEMPO E CLIMA")
    c.setLineWidth(2)
    c.line(MARGIN, y - 10, PAGE_W - MARGIN, y - 10)

    cx, cy = PAGE_W/2, PAGE_H/2 + 1.5*cm
    rx, ry = 70, 30  # Ridotto da 80, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 12)  # Ridotto da 14
    c.drawCentredString(cx, cy + 8, "TEMPO")
    c.setFont(FONT_BOLD, 12)  # Ridotto da 14
    c.drawCentredString(cx, cy - 8, "CLIMA")

    # Nodi disposti per landscape
    nodi = [
        (cx - 200, cy + 100, "TEMPO", ["OGGI", "DOMANI"]),
        (cx + 200, cy + 100, "CLIMA", ["MEDIA", "30 ANNI"]),
        (cx - 240, cy, "LATITUDINE", ["EQUATORE=CALDO", "POLI=FREDDO"]),
        (cx + 240, cy, "ALTITUDINE", ["ALTO=FREDDO", "-6°C/1000M"]),
        (cx - 180, cy - 100, "MARE", ["CLIMA MITE", "MENO SBALZI"]),
        (cx + 180, cy - 100, "CITTA'", ["ISOLA CALORE", "+3°C"]),
    ]

    box_w, box_h = 100, 50  # Ridotto da 110, 60

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 9)  # Ridotto da 10
        c.drawCentredString(nx, ny + 11, titolo)
        c.setFont(FONT_NORMAL, 8)  # Ridotto da 9
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 4 - i*10, s)


# ============================================================
# MAIN
# ============================================================

def main():
    """Funzione principale."""
    print("Creazione PDF completo per Mario - ATMOSFERA E CLIMA...")

    c = canvas.Canvas(OUTPUT_PDF, pagesize=PAGE_SIZE)

    # COPERTINA
    print("  - Copertina...")
    crea_copertina(c)

    # SUPER-MAPPA
    print("  - Super-mappa panoramica...")
    crea_super_mappa(c)

    # SEZIONE 1: PRESSIONE
    print("  - Sezione: Pressione atmosferica...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 0, "PRESSIONE ATMOSFERICA")
    crea_sezione_pressione(c)
    crea_mappa_pressione(c)

    # SEZIONE 2: VENTI
    print("  - Sezione: I venti...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 1, "I VENTI (1/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 4, "MONSONI E BREZZE (2/2)")
    crea_sezione_venti(c)
    crea_mappa_venti(c)

    # SEZIONE 3: CIRCOLAZIONE
    print("  - Sezione: Circolazione atmosferica...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 2, "CIRCOLAZIONE (1/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 3, "CORRENTI A GETTO (2/2)")
    crea_sezione_circolazione(c)
    crea_mappa_circolazione(c)

    # SEZIONE 4: UMIDITA'
    print("  - Sezione: Umidita'...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 5, "UMIDITA'")
    crea_sezione_umidita(c)
    crea_mappa_umidita(c)

    # SEZIONE 5: NUBI
    print("  - Sezione: Nubi e precipitazioni...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 6, "NUBI (1/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 7, "PRECIPITAZIONI (2/2)")
    crea_sezione_nubi(c)
    crea_mappa_nubi(c)

    # SEZIONE 6: PERTURBAZIONI
    print("  - Sezione: Perturbazioni...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 8, "PERTURBAZIONI (1/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 9, "FRONTI E TORNADO (2/2)")
    crea_sezione_perturbazioni(c)
    crea_mappa_perturbazioni(c)

    # SEZIONE 7: TEMPO E CLIMA
    print("  - Sezione: Tempo e clima...")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 10, "PREVISIONI (1/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 11, "STRUMENTI METEO (2/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 12, "TEMPO E CLIMA (1/2)")
    aggiungi_pagina_libro(c, PDF_ORIGINALE, 13, "FATTORI CLIMA (2/2)")
    crea_sezione_tempo_clima(c)
    crea_mappa_tempo_clima(c)

    # Salva
    c.save()

    print(f"\n✓ PDF creato: {OUTPUT_PDF}")
    print(f"  Dimensione: {os.path.getsize(OUTPUT_PDF) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
