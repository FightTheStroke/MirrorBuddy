#!/usr/bin/env python3
"""
Genera PDF LIGHT per Mario: L'ATMOSFERA E IL CLIMA
Identico alla versione completa ma senza pagine scansionate del libro.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
import os
import math

# Percorsi
OUTPUT_PDF = "/Users/roberdan/Downloads/ATMOSFERA_MARIO_LIGHT.pdf"

# Colori
GRIGIO_CHIARO = HexColor("#F5F5F5")
GRIGIO_SCURO = HexColor("#333333")
NERO = black
BIANCO = white

# Font Helvetica (stesso del PDF fisica)
FONT_NORMAL = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
FONT_ITALIC = 'Helvetica-Oblique'


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


def disegna_titolo_sezione(c, titolo, y):
    """Disegna un titolo di sezione."""
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(A4[0]/2, y, titolo.upper())
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.line(2*cm, y - 10, A4[0] - 2*cm, y - 10)
    return y - 40


def disegna_box_concetto(c, titolo, contenuti, y):
    """Disegna un box con un concetto."""
    box_height = 30 + len(contenuti) * 25 + 20

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, y - box_height, A4[0] - 4*cm, box_height, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawString(2.5*cm, y - 25, titolo.upper())

    c.setFont(FONT_NORMAL, 13)
    current_y = y - 50
    for contenuto in contenuti:
        c.drawString(3*cm, current_y, "→ " + contenuto.upper())
        current_y -= 25

    return y - box_height - 20


def disegna_esempio(c, testo, y):
    """Disegna un box esempio."""
    c.setStrokeColor(NERO)
    c.setLineWidth(1)
    c.setDash([5, 3])
    c.roundRect(3*cm, y - 40, A4[0] - 6*cm, 35, 5, fill=0, stroke=1)
    c.setDash([])

    c.setFont(FONT_ITALIC, 12)
    c.drawString(3.5*cm, y - 25, "ESEMPIO: " + testo.upper())

    return y - 55


def crea_copertina(c):
    """Crea la pagina di copertina."""
    c.setFillColor(BIANCO)
    c.rect(0, 0, A4[0], A4[1], fill=1)

    c.setStrokeColor(NERO)
    c.setLineWidth(4)
    c.rect(1*cm, 1*cm, A4[0] - 2*cm, A4[1] - 2*cm, fill=0)

    c.setFillColor(NERO)

    c.setFont(FONT_BOLD, 42)
    c.drawCentredString(A4[0]/2, A4[1] - 6*cm, "SCIENZE")

    c.setFont(FONT_BOLD, 32)
    c.drawCentredString(A4[0]/2, A4[1] - 8*cm, "L'ATMOSFERA")
    c.drawCentredString(A4[0]/2, A4[1] - 9.2*cm, "E IL CLIMA")

    c.setFont(FONT_NORMAL, 20)
    c.drawCentredString(A4[0]/2, A4[1] - 12*cm, "MATERIALE DI STUDIO")
    c.drawCentredString(A4[0]/2, A4[1] - 13*cm, "PER MARIO")

    c.setFont(FONT_NORMAL, 14)
    y = A4[1] - 16*cm
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
        c.drawCentredString(A4[0]/2, y, arg)
        y -= 25

    c.setFont(FONT_ITALIC, 12)
    c.drawCentredString(A4[0]/2, 3*cm, "FONT GRANDE - TUTTO MAIUSCOLO - CONCETTI SEMPLICI")
    c.drawCentredString(A4[0]/2, 2.5*cm, "ADATTATO PER DSA")


def crea_super_mappa(c):
    """Crea una mappa panoramica di tutti gli argomenti."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(A4[0]/2, y, "PANORAMICA: L'ATMOSFERA")
    c.setLineWidth(3)
    c.line(3*cm, y - 15, A4[0] - 3*cm, y - 15)

    cx, cy = A4[0]/2, A4[1]/2
    rx, ry = 70, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(4)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 20)
    c.drawCentredString(cx, cy + 5, "ATMOSFERA")

    argomenti = [
        (cx - 180, cy + 150, "PRESSIONE", "ALTA/BASSA"),
        (cx + 180, cy + 150, "VENTI", "ARIA CHE MUOVE"),
        (cx - 200, cy, "UMIDITA'", "VAPORE ACQUEO"),
        (cx + 200, cy, "NUBI", "PIOGGIA/NEVE"),
        (cx - 150, cy - 150, "PERTURBAZIONI", "CICLONI/FRONTI"),
        (cx + 150, cy - 150, "CLIMA", "TEMPO MEDIO"),
    ]

    box_w, box_h = 130, 70

    for ax, ay, titolo, sotto in argomenti:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, ax, ay)
        punto_box = calcola_punto_bordo_box(ax, ay, box_w, box_h, cx, cy)

        c.setStrokeColor(NERO)
        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.setStrokeColor(NERO)
        c.setLineWidth(3)
        c.roundRect(ax - box_w/2, ay - box_h/2, box_w, box_h, 12, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 13)
        c.drawCentredString(ax, ay + 15, titolo)
        c.setFont(FONT_NORMAL, 11)
        c.drawCentredString(ax, ay - 5, sotto)

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, 2*cm, A4[0] - 4*cm, 60, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 12)
    c.drawCentredString(A4[0]/2, 2*cm + 45, "COME USARE QUESTO MATERIALE:")
    c.setFont(FONT_NORMAL, 11)
    c.drawCentredString(A4[0]/2, 2*cm + 28, "1. LEGGI LE PAGINE DEL LIBRO  |  2. STUDIA IL RIASSUNTO")
    c.drawCentredString(A4[0]/2, 2*cm + 12, "3. USA LA MAPPA MENTALE PER RIPASSARE")


# ============================================================
# SEZIONE 1: PRESSIONE ATMOSFERICA
# ============================================================

def crea_sezione_pressione(c):
    """Crea la sezione sulla pressione atmosferica."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "1. LA PRESSIONE ATMOSFERICA", y)

    y = disegna_box_concetto(c, "COS'E' LA PRESSIONE?", [
        "L'ARIA HA UN PESO E PREME SU DI NOI",
        "SI MISURA IN MILLIBAR (MBAR)",
        "VALORE NORMALE: 1013 MBAR",
    ], y)

    y = disegna_box_concetto(c, "COME VARIA LA PRESSIONE?", [
        "IN ALTO (MONTAGNA): PRESSIONE BASSA",
        "IN BASSO (MARE): PRESSIONE ALTA",
        "CON IL CALDO: ARIA SALE, PRESSIONE SCENDE",
        "CON IL FREDDO: ARIA SCENDE, PRESSIONE SALE",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "ZONE DI ALTA E BASSA PRESSIONE", [
        "ALTA PRESSIONE (ANTICICLONE) = BEL TEMPO",
        "BASSA PRESSIONE (CICLONE) = BRUTTO TEMPO",
        "L'ARIA VA DALL'ALTA ALLA BASSA PRESSIONE",
    ], y)
    y = disegna_esempio(c, "PALLONCINO SI GONFIA IN MONTAGNA", y)

    y = disegna_box_concetto(c, "LE ISOBARE", [
        "LINEE CHE UNISCONO PUNTI CON STESSA PRESSIONE",
        "SULLE CARTE DEL METEO",
        "ISOBARE VICINE = VENTO FORTE",
        "ISOBARE LONTANE = VENTO DEBOLE",
    ], y)


def crea_mappa_pressione(c):
    """Crea mappa mentale pressione atmosferica."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA: PRESSIONE ATMOSFERICA")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 80, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(cx, cy + 8, "PRESSIONE")
    c.setFont(FONT_NORMAL, 12)
    c.drawCentredString(cx, cy - 10, "1013 MBAR")

    nodi = [
        (cx - 170, cy + 130, "ALTA (A)", ["ANTICICLONE", "BEL TEMPO"]),
        (cx + 170, cy + 130, "BASSA (B)", ["CICLONE", "PIOGGIA"]),
        (cx - 180, cy - 20, "ISOBARE", ["LINEE", "CARTE METEO"]),
        (cx + 180, cy - 20, "VARIA CON", ["ALTITUDINE", "TEMPERATURA"]),
        (cx, cy - 150, "GRADIENTE", ["DA A VERSO B", "CAUSA VENTO"]),
    ]

    box_w, box_h = 120, 70

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 11)
        c.drawCentredString(nx, ny + 18, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 2 - i*14, s)


# ============================================================
# SEZIONE 2: I VENTI
# ============================================================

def crea_sezione_venti(c):
    """Crea la sezione sui venti."""
    c.showPage()
    y = A4[1] - 2*cm

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
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "TIPI DI VENTI", [
        "PLANETARI: ALISEI, VENTI OCCIDENTALI",
        "PERIODICI: MONSONI (STAGIONALI)",
        "LOCALI: BREZZE (GIORNO/NOTTE)",
    ], y)

    y = disegna_box_concetto(c, "LE BREZZE", [
        "DI GIORNO: DAL MARE VERSO TERRA",
        "DI NOTTE: DALLA TERRA VERSO IL MARE",
        "IL MARE SI SCALDA PIU' LENTAMENTE",
    ], y)
    y = disegna_esempio(c, "D'ESTATE AL MARE: POMERIGGIO VENTO FRESCO", y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "I MONSONI", [
        "VENTI CHE CAMBIANO CON LE STAGIONI",
        "ESTATE: DAL MARE (PIOGGE FORTI)",
        "INVERNO: DALLA TERRA (SECCO)",
        "TIPICI DELL'ASIA (INDIA, CINA)",
    ], y)


def crea_mappa_venti(c):
    """Crea mappa mentale venti."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA: I VENTI")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 70, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(cx, cy + 5, "VENTI")

    nodi = [
        (cx - 170, cy + 130, "COS'E'?", ["ARIA IN MOVIMENTO", "DA A VERSO B"]),
        (cx + 170, cy + 130, "MISURA", ["KM/H", "NODI"]),
        (cx - 190, cy, "PLANETARI", ["ALISEI", "OCCIDENTALI"]),
        (cx + 190, cy, "PERIODICI", ["MONSONI", "STAGIONALI"]),
        (cx - 140, cy - 140, "LOCALI", ["BREZZE", "GIORNO/NOTTE"]),
        (cx + 140, cy - 140, "CORIOLIS", ["DEVIA I VENTI", "ROTAZIONE TERRA"]),
    ]

    box_w, box_h = 120, 65

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 11)
        c.drawCentredString(nx, ny + 15, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 3 - i*13, s)


# ============================================================
# SEZIONE 3: CIRCOLAZIONE ATMOSFERICA
# ============================================================

def crea_sezione_circolazione(c):
    """Crea la sezione sulla circolazione atmosferica."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "3. CIRCOLAZIONE ATMOSFERICA", y)

    y = disegna_box_concetto(c, "COME SI MUOVE L'ARIA SULLA TERRA?", [
        "L'ARIA CALDA SALE (ALL'EQUATORE)",
        "L'ARIA FREDDA SCENDE (AI POLI)",
        "SI FORMANO GRANDI 'CELLE' DI CIRCOLAZIONE",
    ], y)

    y = disegna_box_concetto(c, "LE TRE CELLE", [
        "CELLA DI HADLEY: EQUATORE - 30 GRADI",
        "CELLA DI FERREL: 30 - 60 GRADI",
        "CELLA POLARE: 60 GRADI - POLI",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "LE CORRENTI A GETTO", [
        "FIUMI D'ARIA VELOCISSIMI (500 KM/H!)",
        "VOLANO A 10 KM DI ALTEZZA",
        "GLI AEREI LI USANO PER ANDARE PIU' VELOCI",
        "SEPARANO ARIA CALDA E ARIA FREDDA",
    ], y)
    y = disegna_esempio(c, "VOLO ROMA-NEW YORK: 9 ORE, RITORNO: 7 ORE", y)


def crea_mappa_circolazione(c):
    """Crea mappa mentale circolazione."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 20)
    c.drawCentredString(A4[0]/2, y, "MAPPA: CIRCOLAZIONE ATMOSFERICA")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 80, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(cx, cy + 8, "CIRCOLAZIONE")
    c.setFont(FONT_NORMAL, 11)
    c.drawCentredString(cx, cy - 10, "GLOBALE")

    nodi = [
        (cx - 160, cy + 130, "HADLEY", ["EQUATORE-30", "TROPICI"]),
        (cx + 160, cy + 130, "FERREL", ["30-60 GRADI", "ZONE TEMPERATE"]),
        (cx - 180, cy - 30, "POLARE", ["60-POLI", "ARIA FREDDA"]),
        (cx + 180, cy - 30, "CORRENTI GETTO", ["500 KM/H", "10 KM ALTEZZA"]),
        (cx, cy - 150, "MOTORE", ["SOLE SCALDA", "EQUATORE"]),
    ]

    box_w, box_h = 120, 65

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(nx, ny + 15, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 3 - i*13, s)


# ============================================================
# SEZIONE 4: UMIDITA'
# ============================================================

def crea_sezione_umidita(c):
    """Crea la sezione sull'umidita'."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "4. UMIDITA' ATMOSFERICA", y)

    y = disegna_box_concetto(c, "COS'E' L'UMIDITA'?", [
        "VAPORE ACQUEO NELL'ARIA (ACQUA INVISIBILE)",
        "VIENE DALL'EVAPORAZIONE DI MARI E LAGHI",
        "PIU' FA CALDO, PIU' VAPORE PUO' STARE NELL'ARIA",
    ], y)

    y = disegna_box_concetto(c, "UMIDITA' RELATIVA", [
        "QUANTA ACQUA C'E' RISPETTO AL MASSIMO",
        "SI MISURA IN PERCENTUALE (%)",
        "100% = ARIA SATURA (NON PUO' PIU' CONTENERE)",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "FENOMENI AL SUOLO", [
        "RUGIADA: GOCCIOLINE SULL'ERBA AL MATTINO",
        "BRINA: RUGIADA GHIACCIATA (SOTTO 0 GRADI)",
        "NEBBIA: NUVOLA A LIVELLO DEL SUOLO",
    ], y)
    y = disegna_esempio(c, "D'INVERNO: VETRI APPANNATI (CONDENSA)", y)


def crea_mappa_umidita(c):
    """Crea mappa mentale umidita'."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA: UMIDITA'")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 70, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(cx, cy + 5, "UMIDITA'")

    nodi = [
        (cx - 160, cy + 130, "COS'E'?", ["VAPORE ACQUEO", "ACQUA INVISIBILE"]),
        (cx + 160, cy + 130, "RELATIVA", ["IN %", "100% = SATURA"]),
        (cx - 180, cy, "RUGIADA", ["GOCCE", "AL MATTINO"]),
        (cx + 180, cy, "BRINA", ["GHIACCIO", "SOTTO 0 GRADI"]),
        (cx, cy - 140, "NEBBIA", ["NUVOLA BASSA", "AL SUOLO"]),
    ]

    box_w, box_h = 110, 60

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 11)
        c.drawCentredString(nx, ny + 13, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 5 - i*12, s)


# ============================================================
# SEZIONE 5: NUBI E PRECIPITAZIONI
# ============================================================

def crea_sezione_nubi(c):
    """Crea la sezione su nubi e precipitazioni."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "5. NUBI E PRECIPITAZIONI", y)

    y = disegna_box_concetto(c, "COME SI FORMANO LE NUBI?", [
        "L'ARIA CALDA SALE E SI RAFFREDDA",
        "IL VAPORE SI CONDENSA IN GOCCIOLINE",
        "LE GOCCIOLINE FORMANO LE NUBI",
    ], y)

    y = disegna_box_concetto(c, "I TIPI DI NUBI", [
        "CIRRI: ALTE, SOTTILI (BELLO)",
        "CUMULI: A 'BATUFFOLI' BIANCHE (VARIABILE)",
        "STRATI: GRIGIE, COPRONO IL CIELO",
        "CUMULONEMBI: ALTE TORRI, TEMPORALI!",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "LE PRECIPITAZIONI", [
        "PIOGGIA: GOCCE D'ACQUA (SOPRA 0 GRADI)",
        "NEVE: CRISTALLI DI GHIACCIO (SOTTO 0 GRADI)",
        "GRANDINE: CHICCHI DI GHIACCIO (TEMPORALI)",
    ], y)
    y = disegna_esempio(c, "TEMPORALE ESTIVO: CUMULONEMBO - GRANDINE", y)

    y = disegna_box_concetto(c, "CARTE PLUVIOMETRICHE", [
        "MOSTRANO QUANTA PIOGGIA CADE",
        "SI MISURA IN MILLIMETRI (MM)",
        "ZONE EQUATORIALI: MOLTA PIOGGIA",
        "DESERTI: POCHISSIMA PIOGGIA",
    ], y)


def crea_mappa_nubi(c):
    """Crea mappa mentale nubi."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA: NUBI E PRECIPITAZIONI")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 70, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(cx, cy + 5, "NUBI")

    nodi = [
        (cx - 160, cy + 130, "CIRRI", ["ALTE", "FILAMENTI"]),
        (cx + 160, cy + 130, "CUMULI", ["BATUFFOLI", "BIANCHI"]),
        (cx - 190, cy, "STRATI", ["GRIGIE", "COPRONO CIELO"]),
        (cx + 190, cy, "CUMULONEMBI", ["TORRI", "TEMPORALI"]),
        (cx - 140, cy - 130, "PIOGGIA", ["GOCCE", "SOPRA 0 GRADI"]),
        (cx + 140, cy - 130, "NEVE", ["CRISTALLI", "SOTTO 0 GRADI"]),
        (cx, cy - 160, "GRANDINE", ["GHIACCIO", "TEMPORALI"]),
    ]

    box_w, box_h = 100, 55

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(nx, ny + 12, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 5 - i*11, s)


# ============================================================
# SEZIONE 6: PERTURBAZIONI
# ============================================================

def crea_sezione_perturbazioni(c):
    """Crea la sezione sulle perturbazioni."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "6. LE PERTURBAZIONI", y)

    y = disegna_box_concetto(c, "COSA SONO LE PERTURBAZIONI?", [
        "CAMBIAMENTI TEMPORANEI DEL TEMPO",
        "PORTANO NUVOLE, PIOGGIA, VENTO",
        "DURANO DA POCHE ORE A QUALCHE GIORNO",
    ], y)

    y = disegna_box_concetto(c, "I CICLONI TROPICALI (URAGANI)", [
        "NASCONO SUGLI OCEANI CALDI",
        "VENTI FORTISSIMI (OLTRE 300 KM/H!)",
        "HANNO UN 'OCCHIO' CALMO AL CENTRO",
        "PORTANO PIOGGE VIOLENTE E INONDAZIONI",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

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
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA: PERTURBAZIONI")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 80, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(cx, cy + 5, "PERTURBAZIONI")

    nodi = [
        (cx - 160, cy + 130, "CICLONI", ["URAGANI", "OCEANI CALDI"]),
        (cx + 160, cy + 130, "TORNADO", ["TROMBE D'ARIA", "500 KM/H"]),
        (cx - 180, cy - 20, "FRONTE FREDDO", ["ARIA FREDDA", "AVANZA"]),
        (cx + 180, cy - 20, "FRONTE CALDO", ["ARIA CALDA", "SOPRA"]),
        (cx, cy - 140, "EFFETTI", ["PIOGGIA", "VENTO FORTE"]),
    ]

    box_w, box_h = 115, 60

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(nx, ny + 13, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 4 - i*12, s)


# ============================================================
# SEZIONE 7: TEMPO E CLIMA
# ============================================================

def crea_sezione_tempo_clima(c):
    """Crea la sezione su tempo e clima."""
    c.showPage()
    y = A4[1] - 2*cm

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
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "I FATTORI DEL CLIMA", [
        "LATITUDINE: LONTANO DALL'EQUATORE = FREDDO",
        "ALTITUDINE: PIU' IN ALTO = PIU' FREDDO",
        "VICINANZA AL MARE: CLIMA PIU' MITE",
        "CORRENTI MARINE: SCALDANO O RAFFREDDANO",
    ], y)

    y = disegna_box_concetto(c, "ISOLA DI CALORE URBANA", [
        "IN CITTA' FA PIU' CALDO CHE IN CAMPAGNA",
        "ASFALTO E CEMENTO TRATTENGONO IL CALORE",
        "MENO ALBERI = MENO OMBRA",
        "FINO A 3 GRADI DI DIFFERENZA!",
    ], y)


def crea_mappa_tempo_clima(c):
    """Crea mappa mentale tempo e clima."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA: TEMPO E CLIMA")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 80, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(cx, cy + 10, "TEMPO")
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(cx, cy - 10, "CLIMA")

    nodi = [
        (cx - 160, cy + 130, "TEMPO", ["OGGI", "DOMANI"]),
        (cx + 160, cy + 130, "CLIMA", ["MEDIA", "30 ANNI"]),
        (cx - 190, cy, "LATITUDINE", ["EQUATORE=CALDO", "POLI=FREDDO"]),
        (cx + 190, cy, "ALTITUDINE", ["ALTO=FREDDO", "-6 GRADI/1000M"]),
        (cx - 150, cy - 130, "MARE", ["CLIMA MITE", "MENO SBALZI"]),
        (cx + 150, cy - 130, "CITTA'", ["ISOLA CALORE", "+3 GRADI"]),
    ]

    box_w, box_h = 110, 60

    for nx, ny, titolo, sotto in nodi:
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 10)
        c.drawCentredString(nx, ny + 13, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 4 - i*12, s)


# ============================================================
# MAIN
# ============================================================

def main():
    """Funzione principale."""
    print("Creazione PDF LIGHT per Mario - ATMOSFERA E CLIMA...")

    c = canvas.Canvas(OUTPUT_PDF, pagesize=A4)

    # COPERTINA
    print("  - Copertina...")
    crea_copertina(c)

    # SUPER-MAPPA
    print("  - Super-mappa panoramica...")
    crea_super_mappa(c)

    # SEZIONE 1: PRESSIONE
    print("  - Sezione: Pressione atmosferica...")
    crea_sezione_pressione(c)
    crea_mappa_pressione(c)

    # SEZIONE 2: VENTI
    print("  - Sezione: I venti...")
    crea_sezione_venti(c)
    crea_mappa_venti(c)

    # SEZIONE 3: CIRCOLAZIONE
    print("  - Sezione: Circolazione atmosferica...")
    crea_sezione_circolazione(c)
    crea_mappa_circolazione(c)

    # SEZIONE 4: UMIDITA'
    print("  - Sezione: Umidita'...")
    crea_sezione_umidita(c)
    crea_mappa_umidita(c)

    # SEZIONE 5: NUBI
    print("  - Sezione: Nubi e precipitazioni...")
    crea_sezione_nubi(c)
    crea_mappa_nubi(c)

    # SEZIONE 6: PERTURBAZIONI
    print("  - Sezione: Perturbazioni...")
    crea_sezione_perturbazioni(c)
    crea_mappa_perturbazioni(c)

    # SEZIONE 7: TEMPO E CLIMA
    print("  - Sezione: Tempo e clima...")
    crea_sezione_tempo_clima(c)
    crea_mappa_tempo_clima(c)

    # Salva
    c.save()

    print(f"\n✓ PDF creato: {OUTPUT_PDF}")
    print(f"  Dimensione: {os.path.getsize(OUTPUT_PDF) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
