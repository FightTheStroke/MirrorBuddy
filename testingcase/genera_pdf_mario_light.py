#!/usr/bin/env python3
"""
Genera PDF LIGHT per Mario - LE FORZE
Identico alla versione completa ma senza pagine scansionate del libro.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
import os
import math

# Percorsi
OUTPUT_PDF = "/Users/roberdan/Downloads/FISICA_MARIO_LIGHT.pdf"

# Colori
GRIGIO_CHIARO = HexColor("#F5F5F5")
GRIGIO_SCURO = HexColor("#333333")
NERO = black
BIANCO = white

# Font Helvetica
FONT_NORMAL = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
FONT_ITALIC = 'Helvetica-Oblique'

# Riferimento libro
UNITA = "UNITA' 3: I VETTORI E LE FORZE"


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

    # Calcola intersezione con ogni lato del box
    half_w = box_w / 2
    half_h = box_h / 2

    # Prova intersezione con lato destro/sinistro
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

    # Prova intersezione con lato sopra/sotto
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
    # Linea sotto
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.line(2*cm, y - 10, A4[0] - 2*cm, y - 10)
    return y - 40


def disegna_sottotitolo(c, testo, y):
    """Disegna un sottotitolo."""
    c.setFillColor(GRIGIO_SCURO)
    c.setFont(FONT_BOLD, 18)
    c.drawString(2*cm, y, testo.upper())
    return y - 30


def disegna_testo(c, testo, y, indent=2*cm):
    """Disegna testo normale."""
    c.setFillColor(NERO)
    c.setFont(FONT_NORMAL, 14)

    # Wrap text manualmente
    max_width = A4[0] - 4*cm
    words = testo.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = current_line + " " + word if current_line else word
        if c.stringWidth(test_line, "Helvetica", 14) < max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    for line in lines:
        c.drawString(indent, y, line.upper())
        y -= 22

    return y - 10


def disegna_box_concetto(c, titolo, contenuti, y):
    """Disegna un box con un concetto."""
    box_height = 30 + len(contenuti) * 25 + 20

    # Box sfondo
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, y - box_height, A4[0] - 4*cm, box_height, 10, fill=1, stroke=1)

    # Titolo box
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawString(2.5*cm, y - 25, titolo.upper())

    # Contenuti
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
    # Sfondo
    c.setFillColor(BIANCO)
    c.rect(0, 0, A4[0], A4[1], fill=1)

    # Bordo
    c.setStrokeColor(NERO)
    c.setLineWidth(4)
    c.rect(1*cm, 1*cm, A4[0] - 2*cm, A4[1] - 2*cm, fill=0)

    # Titolo principale
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 42)
    c.drawCentredString(A4[0]/2, A4[1] - 6*cm, "FISICA")

    c.setFont(FONT_BOLD, 36)
    c.drawCentredString(A4[0]/2, A4[1] - 8*cm, "LE FORZE")

    # Sottotitolo
    c.setFont(FONT_NORMAL, 20)
    c.drawCentredString(A4[0]/2, A4[1] - 11*cm, "MATERIALE DI STUDIO")
    c.drawCentredString(A4[0]/2, A4[1] - 12*cm, "PER MARIO")

    # Contenuto
    c.setFont(FONT_NORMAL, 16)
    y = A4[1] - 15*cm
    argomenti = [
        "1. LE FORZE",
        "2. LA FORZA ELASTICA",
        "3. LA FORZA-PESO",
        "4. ESERCIZI (71, 74, 76)"
    ]
    for arg in argomenti:
        c.drawCentredString(A4[0]/2, y, arg)
        y -= 30

    # Footer
    c.setFont(FONT_ITALIC, 12)
    c.drawCentredString(A4[0]/2, 3*cm, "FONT GRANDE - TUTTO MAIUSCOLO - CONCETTI SEMPLICI")
    c.drawCentredString(A4[0]/2, 2.5*cm, "ADATTATO PER DSA")


def crea_super_mappa(c):
    """Crea una mappa panoramica di tutti gli argomenti per orientarsi."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(A4[0]/2, y, "PANORAMICA: COSA STUDIEREMO")
    c.setLineWidth(3)
    c.line(3*cm, y - 15, A4[0] - 3*cm, y - 15)
    y -= 50

    # Sottotitolo esplicativo
    c.setFont(FONT_NORMAL, 14)
    c.drawCentredString(A4[0]/2, y, "QUESTA MAPPA TI AIUTA A CAPIRE COME SONO COLLEGATI GLI ARGOMENTI")
    y -= 80

    # Nodo centrale "FORZE"
    cx, cy = A4[0]/2, A4[1]/2
    rx, ry = 70, 35

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(4)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(cx, cy + 5, "LE FORZE")

    # I tre argomenti principali come nodi
    argomenti = [
        # (x, y, titolo, sottotitolo, formula)
        (cx - 180, cy + 140, "1. LE FORZE", "SPINTA E TIRATA", "NEWTON (N)"),
        (cx + 180, cy + 140, "2. FORZA ELASTICA", "MOLLE", "F = K × X"),
        (cx, cy - 150, "3. FORZA-PESO", "GRAVITA'", "P = M × G"),
    ]

    # Box esercizi in basso a destra
    ex_x, ex_y = cx + 180, cy - 150
    argomenti.append((ex_x, ex_y, "4. ESERCIZI", "71, 74, 76", "APPLICA FORMULE"))

    box_w, box_h = 150, 90

    for ax, ay, titolo, sotto1, sotto2 in argomenti:
        # Calcola punti sui bordi
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, ax, ay)
        punto_box = calcola_punto_bordo_box(ax, ay, box_w, box_h, cx, cy)

        # Linea
        c.setStrokeColor(NERO)
        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        # Box
        c.setFillColor(BIANCO)
        c.setStrokeColor(NERO)
        c.setLineWidth(3)
        c.roundRect(ax - box_w/2, ay - box_h/2, box_w, box_h, 12, fill=1, stroke=1)

        # Testo
        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 13)
        c.drawCentredString(ax, ay + 25, titolo)
        c.setFont(FONT_NORMAL, 11)
        c.drawCentredString(ax, ay + 5, sotto1)
        c.setFont(FONT_BOLD, 11)
        c.drawCentredString(ax, ay - 15, sotto2)

    # Box istruzioni in basso
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, 2*cm, A4[0] - 4*cm, 80, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(A4[0]/2, 2*cm + 60, "COME USARE QUESTO MATERIALE:")
    c.setFont(FONT_NORMAL, 12)
    c.drawCentredString(A4[0]/2, 2*cm + 40, "1. LEGGI LE PAGINE DEL LIBRO")
    c.drawCentredString(A4[0]/2, 2*cm + 25, "2. STUDIA IL RIASSUNTO SEMPLIFICATO")
    c.drawCentredString(A4[0]/2, 2*cm + 10, "3. USA LA MAPPA MENTALE PER RIPASSARE")


def crea_sezione_forze(c):
    """Crea la sezione sulle forze - MIGLIORATA."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "1. LE FORZE", y)

    # Concetto 1 - MIGLIORATO
    y = disegna_box_concetto(c, "COS'E' UNA FORZA?", [
        "UNA FORZA E' UNA SPINTA O UNA TIRATA",
        "USA I MUSCOLI PER FARE FORZA",
        "ANCHE IL VENTO E IL MOTORE FANNO FORZA",
    ], y)
    y = disegna_esempio(c, "SPINGI IL CARRELLO, SOLLEVI UNO ZAINO", y)

    # Concetto 2 - MIGLIORATO con gravita'
    y = disegna_box_concetto(c, "DUE TIPI DI FORZE", [
        "CONTATTO: DEVI TOCCARE (SPINGERE PORTA)",
        "DISTANZA: NON TOCCHI (CALAMITA, GRAVITA')",
        "LA GRAVITA' E' UNA FORZA A DISTANZA!",
    ], y)

    if y < 6*cm:
        c.showPage()
        y = A4[1] - 2*cm

    # Concetto 3
    y = disegna_box_concetto(c, "COSA FA UNA FORZA?", [
        "CAMBIA LA VELOCITA' (ACCELERA O FRENA)",
        "DEFORMA GLI OGGETTI (SCHIACCIA, ALLUNGA)",
        "CAMBIA LA DIREZIONE DEL MOVIMENTO",
    ], y)
    y = disegna_esempio(c, "I FRENI RALLENTANO, LA PALLINA SI SCHIACCIA", y)

    c.showPage()
    y = A4[1] - 2*cm

    # Concetto 4 - MIGLIORATO
    y = disegna_box_concetto(c, "COME SI MISURA LA FORZA?", [
        "STRUMENTO: IL DINAMOMETRO (HA UNA MOLLA)",
        "UNITA' DI MISURA: IL NEWTON (SIMBOLO N)",
        "1 NEWTON = PESO DI UNA MELA PICCOLA",
    ], y)

    # Concetto 5 - MIGLIORATO con vettore
    y = disegna_box_concetto(c, "LA FORZA E' UN VETTORE", [
        "HA UN'INTENSITA' (QUANTO E' FORTE)",
        "HA UNA DIREZIONE (VERSO DOVE VA)",
        "HA UN VERSO (DESTRA/SINISTRA, SU/GIU')",
        "PUNTO DI APPLICAZIONE (DOVE AGISCE)",
    ], y)

    # Concetto 6
    y = disegna_box_concetto(c, "SOMMA DELLE FORZE", [
        "PIU' FORZE = FORZA RISULTANTE (TOTALE)",
        "STESSA DIREZIONE: SI SOMMANO",
        "DIREZIONE OPPOSTA: SI SOTTRAGGONO",
    ], y)
    y = disegna_esempio(c, "2 PERSONE SPINGONO AUTO = FORZE SI SOMMANO", y)


def crea_mappa_forze(c):
    """Crea mappa mentale delle forze."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA MENTALE: LE FORZE")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    # Nodo centrale - dimensioni ellisse
    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 80, 30  # semi-assi ellisse

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 20)
    c.drawCentredString(cx, cy + 5, "LE FORZE")

    # Rami
    nodi = [
        (cx - 180, cy + 150, "COS'E'?", ["SPINTA", "TIRATA"]),
        (cx + 180, cy + 150, "TIPI", ["CONTATTO", "DISTANZA"]),
        (cx - 200, cy, "EFFETTI", ["VELOCITA'", "DEFORMA"]),
        (cx + 200, cy, "MISURA", ["DINAMOMETRO", "NEWTON (N)"]),
        (cx - 150, cy - 150, "VETTORE", ["INTENSITA'", "DIREZIONE"]),
        (cx + 150, cy - 150, "SOMMA", ["RISULTANTE", "TOTALE"]),
    ]

    box_w, box_h = 120, 80

    for nx, ny, titolo, sotto in nodi:
        # Calcola punti sui bordi (non dal centro!)
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        # Linea dal bordo ellisse al bordo box
        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        # Box nodo
        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        # Testo
        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(nx, ny + 20, titolo)
        c.setFont(FONT_NORMAL, 10)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 5 - i*15, s)


def crea_sezione_elastica(c):
    """Crea la sezione sulla forza elastica - MIGLIORATA."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "2. LA FORZA ELASTICA", y)

    # Concetto 1
    y = disegna_box_concetto(c, "COS'E' LA MOLLA?", [
        "OGGETTO CHE SI ALLUNGA E SI ACCORCIA",
        "QUANDO LA LASCI, TORNA COME PRIMA",
        "SI TROVA IN PENNE, MATERASSI, AUTO",
    ], y)

    # Concetto 2 - MIGLIORATO con proporzionalita'
    y = disegna_box_concetto(c, "LA LEGGE DI HOOKE", [
        "PIU' TIRI, PIU' SI ALLUNGA",
        "SONO DIRETTAMENTE PROPORZIONALI!",
        "FORMULA: F = K × X",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    # Box formula grande
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(3*cm, y - 120, A4[0] - 6*cm, 110, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(A4[0]/2, y - 40, "F = K × X")

    c.setFont(FONT_NORMAL, 14)
    c.drawCentredString(A4[0]/2, y - 70, "F = FORZA (IN NEWTON)")
    c.drawCentredString(A4[0]/2, y - 90, "K = COSTANTE ELASTICA (DUREZZA MOLLA)")
    c.drawCentredString(A4[0]/2, y - 110, "X = ALLUNGAMENTO (IN METRI)")

    y -= 150

    # Concetto 3 - MIGLIORATO
    y = disegna_box_concetto(c, "LA COSTANTE ELASTICA K", [
        "OGNI MOLLA HA IL SUO VALORE K",
        "SI MISURA IN N/M (NEWTON AL METRO)",
        "K GRANDE = MOLLA RIGIDA (DURA)",
        "K PICCOLO = MOLLA MORBIDA",
    ], y)

    # Concetto 4
    y = disegna_box_concetto(c, "FORZA DI RICHIAMO", [
        "LA MOLLA VUOLE TORNARE NORMALE",
        "SPINGE NELLA DIREZIONE OPPOSTA",
        "E' SEMPRE OPPOSTA ALL'ALLUNGAMENTO",
    ], y)

    # Concetto 5
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "IL DINAMOMETRO", [
        "STRUMENTO CON UNA MOLLA DENTRO",
        "USA LA LEGGE DI HOOKE",
        "PIU' TIRI, PIU' SI ALLUNGA LA MOLLA",
        "LEGGI LA FORZA SULLA SCALA",
    ], y)
    y = disegna_esempio(c, "APPENDI UN PESO, LEGGI QUANTI NEWTON", y)


def crea_mappa_elastica(c):
    """Crea mappa mentale forza elastica."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA MENTALE: FORZA ELASTICA")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    # Nodo centrale - dimensioni ellisse
    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 90, 35  # semi-assi ellisse

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(cx, cy + 10, "FORZA")
    c.drawCentredString(cx, cy - 10, "ELASTICA")

    # Box formula al centro sotto
    formula_box_y = cy - 80
    formula_box_h = 35
    c.setFillColor(BIANCO)
    c.roundRect(cx - 60, formula_box_y, 120, formula_box_h, 5, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(cx, cy - 58, "F = K × X")

    # Rami
    nodi = [
        (cx - 180, cy + 130, "MOLLA", ["SI ALLUNGA", "TORNA INDIETRO"]),
        (cx + 180, cy + 130, "HOOKE", ["PROPORZIONALE", "PIU' TIRI = PIU' LUNGO"]),
        (cx - 200, cy - 20, "K", ["COSTANTE", "N/M", "DUREZZA"]),
        (cx + 200, cy - 20, "RICHIAMO", ["FORZA OPPOSTA", "TORNA NORMALE"]),
        (cx, cy - 180, "DINAMOMETRO", ["MISURA FORZE", "USA MOLLA"]),
    ]

    box_w, box_h = 130, 70

    for nx, ny, titolo, sotto in nodi:
        # Calcola punti sui bordi
        if ny > cy:
            # Nodi sopra: partono dal bordo ellisse
            punto_start = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        else:
            # Nodi sotto/lato: partono dal box formula
            formula_cx = cx
            formula_cy = formula_box_y + formula_box_h / 2
            punto_start = calcola_punto_bordo_box(formula_cx, formula_cy, 120, formula_box_h, nx, ny)

        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, punto_start[0], punto_start[1])

        c.setLineWidth(2)
        c.line(punto_start[0], punto_start[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(nx, ny + 15, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 5 - i*12, s)


def crea_sezione_peso(c):
    """Crea la sezione sulla forza-peso - MIGLIORATA."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "3. LA FORZA-PESO", y)

    # Concetto 1
    y = disegna_box_concetto(c, "COS'E' IL PESO?", [
        "LA FORZA CHE TI TIRA VERSO IL BASSO",
        "LA TERRA TI ATTIRA VERSO DI SE'",
        "E' UNA FORZA A DISTANZA (GRAVITA')",
    ], y)
    y = disegna_esempio(c, "LANCIA UNA PALLA, CADE GIU'", y)

    # Concetto 2 - Formula
    y = disegna_box_concetto(c, "LA FORMULA DEL PESO", [
        "P = M × G",
        "P = PESO (IN NEWTON)",
        "M = MASSA (IN KG)",
        "G = GRAVITA' (SULLA TERRA = 9,8 ≈ 10)",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    # Box formula grande
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(3*cm, y - 100, A4[0] - 6*cm, 90, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 32)
    c.drawCentredString(A4[0]/2, y - 40, "P = M × G")

    c.setFont(FONT_NORMAL, 14)
    c.drawCentredString(A4[0]/2, y - 70, "SE HAI MASSA 50 KG:")
    c.drawCentredString(A4[0]/2, y - 90, "PESO = 50 × 10 = 500 NEWTON")

    y -= 130

    # Concetto 3 - MIGLIORATO con vettore/scalare
    y = disegna_box_concetto(c, "MASSA E PESO: SONO DIVERSI!", [
        "MASSA = SCALARE (SOLO UN NUMERO)",
        "PESO = VETTORE (HA DIREZIONE: GIU')",
        "MASSA SI MISURA IN KG (BILANCIA)",
        "PESO SI MISURA IN NEWTON (DINAMOMETRO)",
    ], y)

    c.showPage()
    y = A4[1] - 2*cm

    # Tabella confronto
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(A4[0]/2, y, "CONFRONTO MASSA VS PESO")
    y -= 40

    # Box sinistra - MASSA
    c.setFillColor(BIANCO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, y - 200, 8*cm, 190, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(6*cm, y - 25, "MASSA")
    c.setFont(FONT_NORMAL, 12)
    testi_massa = [
        "QUANTA ROBA C'E'",
        "E' UNO SCALARE",
        "SI MISURA IN KG",
        "NON CAMBIA MAI",
        "SULLA LUNA: UGUALE",
        "BILANCIA A BRACCI",
    ]
    for i, t in enumerate(testi_massa):
        c.drawCentredString(6*cm, y - 55 - i*25, t)

    # Box destra - PESO
    c.setFillColor(BIANCO)
    c.roundRect(A4[0] - 10*cm, y - 200, 8*cm, 190, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(A4[0] - 6*cm, y - 25, "PESO")
    c.setFont(FONT_NORMAL, 12)
    testi_peso = [
        "FORZA CHE TI TIRA",
        "E' UN VETTORE",
        "SI MISURA IN N",
        "CAMBIA COL PIANETA",
        "SULLA LUNA: 1/6",
        "DINAMOMETRO",
    ]
    for i, t in enumerate(testi_peso):
        c.drawCentredString(A4[0] - 6*cm, y - 55 - i*25, t)

    y -= 230

    y = disegna_esempio(c, "TERRA: 500 N, LUNA: 80 N (MENO GRAVITA')", y)


def crea_mappa_peso(c):
    """Crea mappa mentale forza-peso."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0]/2, y, "MAPPA MENTALE: FORZA-PESO")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    # Nodo centrale - dimensioni ellisse
    cx, cy = A4[0]/2, A4[1]/2 + 2*cm
    rx, ry = 90, 35  # semi-assi ellisse

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(cx, cy + 10, "FORZA-PESO")
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(cx, cy - 12, "P = M × G")

    # Rami
    nodi = [
        (cx - 180, cy + 130, "COS'E'?", ["FORZA GIU'", "GRAVITA'"]),
        (cx + 180, cy + 130, "FORMULA", ["P = M × G", "G ≈ 10"]),
        (cx - 200, cy, "MASSA", ["SCALARE", "IN KG", "NON CAMBIA"]),
        (cx + 200, cy, "PESO", ["VETTORE", "IN NEWTON", "CAMBIA!"]),
        (cx - 150, cy - 150, "MISURA", ["BILANCIA", "DINAMOMETRO"]),
        (cx + 150, cy - 150, "PIANETI", ["TERRA: 100%", "LUNA: 17%"]),
    ]

    box_w, box_h = 120, 75

    for nx, ny, titolo, sotto in nodi:
        # Calcola punti sui bordi (non dal centro!)
        punto_ellisse = calcola_punto_bordo_ellisse(cx, cy, rx, ry, nx, ny)
        punto_box = calcola_punto_bordo_box(nx, ny, box_w, box_h, cx, cy)

        c.setLineWidth(2)
        c.line(punto_ellisse[0], punto_ellisse[1], punto_box[0], punto_box[1])

        c.setFillColor(BIANCO)
        c.roundRect(nx - box_w/2, ny - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 11)
        c.drawCentredString(nx, ny + 20, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 2 - i*14, s)


# ============================================================
# SEZIONE ESERCIZI
# ============================================================

def crea_guida_esercizio_71(c):
    """Guida passo-passo per l'esercizio 71."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "ESERCIZIO 71 - GUIDA", y)

    # Testo problema
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "IL PROBLEMA DICE:")
    y -= 25

    c.setFont(FONT_NORMAL, 13)
    c.drawString(2*cm, y, "UN ELASTICO HA COSTANTE K = 44 N/M")
    y -= 20
    c.drawString(2*cm, y, "LO TIRI CON UNA FORZA DI 9,6 N")
    y -= 20
    c.drawString(2*cm, y, "QUANTO SI ALLUNGA?")
    y -= 40

    # Box formula
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(2*cm, y - 80, A4[0] - 4*cm, 75, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawString(2.5*cm, y - 25, "USA LA FORMULA:")
    c.setFont(FONT_BOLD, 24)
    c.drawCentredString(A4[0]/2, y - 55, "F = K × X")

    y -= 110

    # Passi
    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 1: SCRIVI COSA SAI")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "F = 9,6 N (LA FORZA)")
    y -= 20
    c.drawString(3*cm, y, "K = 44 N/M (LA COSTANTE)")
    y -= 20
    c.drawString(3*cm, y, "X = ? (DEVI TROVARE QUESTO!)")
    y -= 35

    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 2: GIRA LA FORMULA")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "DA: F = K × X")
    y -= 20
    c.drawString(3*cm, y, "A:  X = F ÷ K")
    y -= 35

    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 3: METTI I NUMERI")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "X = 9,6 ÷ 44")
    y -= 35

    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 4: FAI IL CALCOLO")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "9,6 ÷ 44 = 0,218...")
    y -= 35

    # Risultato
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(3*cm, y - 50, A4[0] - 6*cm, 45, 8, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(A4[0]/2, y - 30, "RISPOSTA: X = 0,22 M")
    c.setFont(FONT_NORMAL, 12)
    c.drawCentredString(A4[0]/2, y - 45, "(L'ELASTICO SI ALLUNGA DI 22 CENTIMETRI)")


def crea_guida_esercizio_74(c):
    """Guida passo-passo per l'esercizio 74."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "ESERCIZIO 74 - GUIDA", y)

    # Testo problema
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "IL PROBLEMA DICE:")
    y -= 25

    c.setFont(FONT_NORMAL, 13)
    c.drawString(2*cm, y, "GUARDA IL GRAFICO CON DUE MOLLE (A E B)")
    y -= 20
    c.drawString(2*cm, y, "RISPONDI A 3 DOMANDE:")
    y -= 30

    # Domanda 1
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, y - 100, A4[0] - 4*cm, 95, 8, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)
    c.drawString(2.5*cm, y - 20, "DOMANDA 1: QUALE MOLLA E' PIU' RIGIDA?")
    c.setFont(FONT_NORMAL, 12)
    c.drawString(2.5*cm, y - 40, "GUARDA IL GRAFICO:")
    c.drawString(2.5*cm, y - 55, "→ LA MOLLA A SI ALLUNGA POCO = PIU' RIGIDA")
    c.drawString(2.5*cm, y - 70, "→ LA MOLLA B SI ALLUNGA TANTO = PIU' MORBIDA")
    c.setFont(FONT_BOLD, 12)
    c.drawString(2.5*cm, y - 90, "RISPOSTA: LA MOLLA A E' PIU' RIGIDA")

    y -= 120

    # Domanda 2
    c.setFillColor(GRIGIO_CHIARO)
    c.roundRect(2*cm, y - 130, A4[0] - 4*cm, 125, 8, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)
    c.drawString(2.5*cm, y - 20, "DOMANDA 2: CALCOLA K PER OGNI MOLLA")
    c.setFont(FONT_NORMAL, 12)
    c.drawString(2.5*cm, y - 40, "USA: K = F ÷ X")
    c.drawString(2.5*cm, y - 60, "MOLLA A: DAL GRAFICO LEGGI F=10N, X=2,8CM=0,028M")
    c.drawString(2.5*cm, y - 75, "         K = 10 ÷ 0,028 = 360 N/M")
    c.drawString(2.5*cm, y - 95, "MOLLA B: DAL GRAFICO LEGGI F=4N, X=5,5CM=0,055M")
    c.drawString(2.5*cm, y - 110, "         K = 4 ÷ 0,055 = 73 N/M")

    y -= 150

    # Domanda 3
    c.setFillColor(GRIGIO_CHIARO)
    c.roundRect(2*cm, y - 110, A4[0] - 4*cm, 105, 8, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 13)
    c.drawString(2.5*cm, y - 20, "DOMANDA 3: ALLUNGAMENTO CON F = 13 N")
    c.setFont(FONT_NORMAL, 12)
    c.drawString(2.5*cm, y - 40, "USA: X = F ÷ K")
    c.drawString(2.5*cm, y - 60, "MOLLA A: X = 13 ÷ 360 = 0,036 M = 3,6 CM")
    c.drawString(2.5*cm, y - 80, "MOLLA B: X = 13 ÷ 73 = 0,18 M = 18 CM")

    y -= 130

    # Riepilogo
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(A4[0]/2, y, "RISPOSTE: K(A)=360 N/M, K(B)=73 N/M")
    y -= 20
    c.drawCentredString(A4[0]/2, y, "X(A)=3,6 CM, X(B)=18 CM")


def crea_guida_esercizio_76(c):
    """Guida passo-passo per l'esercizio 76."""
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "ESERCIZIO 76 - GUIDA", y)

    # Testo problema
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "IL PROBLEMA DICE:")
    y -= 25

    c.setFont(FONT_NORMAL, 13)
    c.drawString(2*cm, y, "UNA MOLLA HA K = 250 N/M")
    y -= 20
    c.drawString(2*cm, y, "A RIPOSO E' LUNGA 20,0 CM")
    y -= 20
    c.drawString(2*cm, y, "LA LUNGHEZZA AUMENTA DEL 25%")
    y -= 20
    c.drawString(2*cm, y, "TROVA LA FORZA!")
    y -= 40

    # Box formula
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(2*cm, y - 80, A4[0] - 4*cm, 75, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawString(2.5*cm, y - 25, "USA LA FORMULA:")
    c.setFont(FONT_BOLD, 24)
    c.drawCentredString(A4[0]/2, y - 55, "F = K × X")

    y -= 110

    # Passi
    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 1: TROVA L'ALLUNGAMENTO X")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "LA MOLLA AUMENTA DEL 25%")
    y -= 20
    c.drawString(3*cm, y, "25% DI 20 CM = ?")
    y -= 20
    c.drawString(3*cm, y, "25 ÷ 100 × 20 = 5 CM")
    y -= 20
    c.drawString(3*cm, y, "QUINDI X = 5 CM = 0,05 M")
    y -= 35

    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 2: SCRIVI COSA SAI")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "K = 250 N/M")
    y -= 20
    c.drawString(3*cm, y, "X = 0,05 M")
    y -= 35

    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 3: USA LA FORMULA")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "F = K × X")
    y -= 20
    c.drawString(3*cm, y, "F = 250 × 0,05")
    y -= 35

    c.setFont(FONT_BOLD, 14)
    c.drawString(2*cm, y, "PASSO 4: FAI IL CALCOLO")
    y -= 25
    c.setFont(FONT_NORMAL, 13)
    c.drawString(3*cm, y, "250 × 0,05 = 12,5")
    y -= 35

    # Risultato
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(3*cm, y - 50, A4[0] - 6*cm, 45, 8, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(A4[0]/2, y - 30, "RISPOSTA: F = 12,5 N")


def crea_promemoria_formula(c):
    """Crea un foglio promemoria con la formula."""
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(A4[0]/2, y, "PROMEMORIA FORMULE")
    c.setLineWidth(3)
    c.line(3*cm, y - 15, A4[0] - 3*cm, y - 15)
    y -= 60

    # Formula 1
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(2*cm, y - 120, A4[0] - 4*cm, 115, 15, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(A4[0]/2, y - 25, "FORZA ELASTICA (MOLLE)")
    c.setFont(FONT_BOLD, 36)
    c.drawCentredString(A4[0]/2, y - 65, "F = K × X")
    c.setFont(FONT_NORMAL, 14)
    c.drawCentredString(A4[0]/2, y - 95, "F = FORZA (N)  |  K = COSTANTE (N/M)  |  X = ALLUNGAMENTO (M)")

    y -= 150

    # Come trovare X
    c.setFillColor(BIANCO)
    c.roundRect(2*cm, y - 80, 7*cm, 75, 10, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(5.5*cm, y - 20, "TROVI X?")
    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(5.5*cm, y - 50, "X = F ÷ K")

    # Come trovare K
    c.setFillColor(BIANCO)
    c.roundRect(A4[0] - 9*cm, y - 80, 7*cm, 75, 10, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(A4[0] - 5.5*cm, y - 20, "TROVI K?")
    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(A4[0] - 5.5*cm, y - 50, "K = F ÷ X")

    y -= 120

    # Percentuale
    c.setFillColor(GRIGIO_CHIARO)
    c.roundRect(2*cm, y - 100, A4[0] - 4*cm, 95, 15, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 18)
    c.drawCentredString(A4[0]/2, y - 25, "COME CALCOLARE LA PERCENTUALE")
    c.setFont(FONT_NORMAL, 16)
    c.drawCentredString(A4[0]/2, y - 55, "25% DI 20 = 25 ÷ 100 × 20 = 5")
    c.setFont(FONT_NORMAL, 14)
    c.drawCentredString(A4[0]/2, y - 85, "(DIVIDI PER 100, POI MOLTIPLICA)")

    y -= 130

    # Unita di misura
    c.setFillColor(BIANCO)
    c.roundRect(2*cm, y - 100, A4[0] - 4*cm, 95, 10, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(A4[0]/2, y - 20, "ATTENZIONE ALLE UNITA'!")
    c.setFont(FONT_NORMAL, 14)
    c.drawCentredString(A4[0]/2, y - 50, "CM → M: DIVIDI PER 100")
    c.drawCentredString(A4[0]/2, y - 70, "ESEMPIO: 5 CM = 5 ÷ 100 = 0,05 M")


def main():
    """Funzione principale."""
    print("Creazione PDF completo per Mario...")

    # Crea canvas
    c = canvas.Canvas(OUTPUT_PDF, pagesize=A4)

    # 1. COPERTINA
    print("  - Copertina...")
    crea_copertina(c)

    # 2. SUPER-MAPPA PANORAMICA
    print("  - Super-mappa panoramica...")
    crea_super_mappa(c)

    # 3. ARGOMENTO 1: LE FORZE
    print("  - Sezione: Le Forze...")
    crea_sezione_forze(c)

    # Mappa mentale
    crea_mappa_forze(c)

    # 3. ARGOMENTO 2: FORZA ELASTICA
    print("  - Sezione: Forza Elastica...")
    crea_sezione_elastica(c)

    # Mappa mentale
    crea_mappa_elastica(c)

    # 4. ARGOMENTO 3: FORZA-PESO
    print("  - Sezione: Forza-Peso...")
    crea_sezione_peso(c)

    # Mappa mentale
    crea_mappa_peso(c)

    # 5. ESERCIZI
    print("  - Sezione: Esercizi...")
    crea_promemoria_formula(c)

    # Guide esercizi
    crea_guida_esercizio_71(c)
    crea_guida_esercizio_74(c)
    crea_guida_esercizio_76(c)

    # Salva
    c.save()

    print(f"\n✓ PDF creato: {OUTPUT_PDF}")
    print(f"  Dimensione: {os.path.getsize(OUTPUT_PDF) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
