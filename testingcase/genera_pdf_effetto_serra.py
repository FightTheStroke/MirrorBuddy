#!/usr/bin/env python3
"""
Genera PDF accessibile per Mario - EFFETTO SERRA E CAMBIAMENTI CLIMATICI
Basato su: 1-5-26, 12:37 Microsoft Lens.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor
import os
import math

# Percorsi
OUTPUT_PDF = "/Users/roberdan/Downloads/EFFETTO_SERRA_MARIO.pdf"

# Colori
GRIGIO_CHIARO = HexColor("#F5F5F5")
GRIGIO_SCURO = HexColor("#333333")
NERO = black
BIANCO = white

# Font - Helvetica (standard, no issues)
FONT_NORMAL = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
FONT_ITALIC = 'Helvetica-Oblique'


def calcola_punto_bordo_ellisse(cx, cy, rx, ry, target_x, target_y):
    angle = math.atan2(target_y - cy, target_x - cx)
    return (cx + rx * math.cos(angle), cy + ry * math.sin(angle))


def calcola_punto_bordo_box(box_cx, box_cy, box_w, box_h, target_x, target_y):
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
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 26)
    c.drawCentredString(A4[0]/2, y, titolo.upper())
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.line(2*cm, y - 10, A4[0] - 2*cm, y - 10)
    return y - 40


def disegna_box_concetto(c, titolo, contenuti, y):
    box_height = 30 + len(contenuti) * 25 + 20
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(2)
    c.roundRect(2*cm, y - box_height, A4[0] - 4*cm, box_height, 10, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 15)
    c.drawString(2.5*cm, y - 25, titolo.upper())
    c.setFont(FONT_NORMAL, 12)
    current_y = y - 50
    for contenuto in contenuti:
        c.drawString(3*cm, current_y, "-> " + contenuto.upper())
        current_y -= 25
    return y - box_height - 15


def disegna_esempio(c, testo, y):
    c.setStrokeColor(NERO)
    c.setLineWidth(1)
    c.setDash([5, 3])
    c.roundRect(3*cm, y - 40, A4[0] - 6*cm, 35, 5, fill=0, stroke=1)
    c.setDash([])
    c.setFont(FONT_ITALIC, 11)
    c.drawString(3.5*cm, y - 25, "ESEMPIO: " + testo.upper())
    return y - 55


def crea_copertina(c):
    c.setFillColor(BIANCO)
    c.rect(0, 0, A4[0], A4[1], fill=1)
    c.setStrokeColor(NERO)
    c.setLineWidth(4)
    c.rect(1*cm, 1*cm, A4[0] - 2*cm, A4[1] - 2*cm, fill=0)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 38)
    c.drawCentredString(A4[0]/2, A4[1] - 5*cm, "SCIENZE")

    c.setFont(FONT_BOLD, 28)
    c.drawCentredString(A4[0]/2, A4[1] - 7*cm, "EFFETTO SERRA E")
    c.drawCentredString(A4[0]/2, A4[1] - 8.2*cm, "CAMBIAMENTI CLIMATICI")

    c.setFont(FONT_NORMAL, 18)
    c.drawCentredString(A4[0]/2, A4[1] - 11*cm, "MATERIALE DI STUDIO")
    c.drawCentredString(A4[0]/2, A4[1] - 12*cm, "PER MARIO")

    c.setFont(FONT_NORMAL, 14)
    y = A4[1] - 15*cm
    argomenti = [
        "1. I CAMBIAMENTI CLIMATICI",
        "2. COS'E' IL CALORE",
        "3. L'EFFETTO SERRA",
        "4. I GAS SERRA",
        "5. PAROLE CHIAVE"
    ]
    for arg in argomenti:
        c.drawCentredString(A4[0]/2, y, arg)
        y -= 25

    c.setFont(FONT_ITALIC, 11)
    c.drawCentredString(A4[0]/2, 3*cm, "FONT GRANDE - TUTTO MAIUSCOLO - CONCETTI SEMPLICI")
    c.drawCentredString(A4[0]/2, 2.5*cm, "ADATTATO PER DSA")


def crea_mappa_panoramica(c):
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 24)
    c.drawCentredString(A4[0]/2, y, "PANORAMICA: LA CATENA DEL PROBLEMA")
    c.setLineWidth(3)
    c.line(3*cm, y - 15, A4[0] - 3*cm, y - 15)
    y -= 50

    c.setFont(FONT_NORMAL, 12)
    c.drawCentredString(A4[0]/2, y, "QUESTA MAPPA TI MOSTRA COME TUTTO E' COLLEGATO")
    y -= 60

    # Catena verticale: INQUINAMENTO -> GAS SERRA -> EFFETTO SERRA -> SURRISCALDAMENTO -> EVENTI ESTREMI
    steps = [
        ("1. INQUINAMENTO", "BRUCIAMO COMBUSTIBILI"),
        ("2. GAS SERRA", "CO2, METANO NELL'ARIA"),
        ("3. EFFETTO SERRA", "L'ARIA SI SCALDA"),
        ("4. SURRISCALDAMENTO", "TEMPERATURE AUMENTANO"),
        ("5. EVENTI ESTREMI", "ALLUVIONI, GRANDINATE")
    ]

    box_w, box_h = 200, 50
    cx = A4[0] / 2
    start_y = y

    for i, (titolo, sotto) in enumerate(steps):
        by = start_y - i * 90

        # Box
        c.setFillColor(GRIGIO_CHIARO if i % 2 == 0 else BIANCO)
        c.setStrokeColor(NERO)
        c.setLineWidth(2)
        c.roundRect(cx - box_w/2, by - box_h/2, box_w, box_h, 8, fill=1, stroke=1)

        # Testo
        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 12)
        c.drawCentredString(cx, by + 10, titolo)
        c.setFont(FONT_NORMAL, 10)
        c.drawCentredString(cx, by - 10, sotto)

        # Freccia verso il prossimo
        if i < len(steps) - 1:
            c.setStrokeColor(NERO)
            c.setLineWidth(2)
            arrow_y = by - box_h/2 - 5
            c.line(cx, arrow_y, cx, arrow_y - 30)
            # Punta freccia
            c.line(cx, arrow_y - 30, cx - 8, arrow_y - 22)
            c.line(cx, arrow_y - 30, cx + 8, arrow_y - 22)


def crea_sezione_cambiamenti(c):
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "1. I CAMBIAMENTI CLIMATICI", y)

    y = disegna_box_concetto(c, "COSA STA SUCCEDENDO?", [
        "NEL MONDO CI SONO EVENTI ESTREMI",
        "TROMBE D'ARIA, GRANDINATE, ALLUVIONI",
        "ONDATE DI CALDO FORTISSIMO",
        "QUESTI EVENTI SONO SEMPRE PIU' FREQUENTI"
    ], y)

    y = disegna_box_concetto(c, "QUAL E' LA CAUSA?", [
        "LA CAUSA E' IL SURRISCALDAMENTO GLOBALE",
        "CIOE' LA TERRA SI STA SCALDANDO TROPPO",
        "E QUESTO CAMBIA IL CLIMA"
    ], y)

    y = disegna_box_concetto(c, "PERCHE' SI SCALDA?", [
        "COLPA DELL'EFFETTO SERRA ESAGERATO",
        "L'EFFETTO SERRA NORMALE E' UTILE",
        "MA NOI L'ABBIAMO AUMENTATO TROPPO",
        "CON L'INQUINAMENTO (I GAS CHE EMETTIAMO)"
    ], y)

    y = disegna_esempio(c, "BRUCIAMO BENZINA, CARBONE, GAS -> PIU' CO2 NELL'ARIA", y)


def crea_sezione_calore(c):
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "2. COS'E' IL CALORE", y)

    y = disegna_box_concetto(c, "LA MATERIA E' FATTA DI MOLECOLE", [
        "TUTTO E' FATTO DI MOLECOLE PICCOLISSIME",
        "UN BICCHIERE D'ACQUA = MILIARDI DI MOLECOLE",
        "LE MOLECOLE SI MUOVONO E VIBRANO"
    ], y)

    y = disegna_box_concetto(c, "CALORE = MOVIMENTO MOLECOLE", [
        "PIU' LE MOLECOLE SI MUOVONO = PIU' CALDO",
        "MENO SI MUOVONO = PIU' FREDDO",
        "QUINDI: CALORE = VIBRAZIONE MOLECOLE"
    ], y)

    y = disegna_esempio(c, "PENTOLA SUL FUOCO: LE MOLECOLE SI MUOVONO DI PIU'", y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "L'ARIA E' FATTA DI MOLECOLE", [
        "ANCHE L'ARIA E' MATERIA (ANCHE SE NON SI VEDE)",
        "E' UN MIX DI GAS: OSSIGENO, AZOTO, CO2...",
        "L'ARIA E' ATTRAVERSATA DA RADIAZIONI"
    ], y)

    y = disegna_box_concetto(c, "LE RADIAZIONI", [
        "ALCUNE RADIAZIONI SONO VISIBILI (LUCE)",
        "ALTRE SONO INVISIBILI (RAGGI INFRAROSSI)",
        "I RAGGI INFRAROSSI CI DANNO CALORE",
        "IL SOLE MANDA RAGGI INFRAROSSI ALLA TERRA"
    ], y)


def crea_sezione_effetto_serra(c):
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "3. L'EFFETTO SERRA", y)

    y = disegna_box_concetto(c, "COME FUNZIONA?", [
        "ALCUNI GAS NELL'ARIA SI CHIAMANO 'GAS SERRA'",
        "LE LORO MOLECOLE VIBRANO COME I RAGGI INFRAROSSI",
        "QUINDI ASSORBONO FACILMENTE GLI INFRAROSSI",
        "E SI SCALDANO!"
    ], y)

    y = disegna_box_concetto(c, "RICORDA LA FORMULA", [
        "MOVIMENTO MOLECOLE = CALORE",
        "INFRAROSSI FANNO MUOVERE I GAS SERRA",
        "QUINDI I GAS SERRA SI SCALDANO",
        "E SCALDANO L'ARIA INTORNO"
    ], y)

    y = disegna_box_concetto(c, "E' UNA COSA BUONA O CATTIVA?", [
        "L'EFFETTO SERRA NORMALE E' POSITIVO!",
        "SENZA DI ESSO FAREBBE TROPPO FREDDO",
        "IL PROBLEMA E' QUANDO CE N'E' TROPPO",
        "TROPPI GAS SERRA = TROPPO CALDO"
    ], y)


def crea_mappa_effetto_serra(c):
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 20)
    c.drawCentredString(A4[0]/2, y, "MAPPA: COME FUNZIONA L'EFFETTO SERRA")
    c.setLineWidth(2)
    c.line(4*cm, y - 10, A4[0] - 4*cm, y - 10)

    cx, cy = A4[0]/2, A4[1]/2
    rx, ry = 70, 30

    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.ellipse(cx - rx, cy - ry, cx + rx, cy + ry, fill=1, stroke=1)
    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(cx, cy + 5, "EFFETTO SERRA")

    nodi = [
        (cx - 170, cy + 130, "SOLE", ["MANDA RAGGI", "INFRAROSSI"]),
        (cx + 170, cy + 130, "GAS SERRA", ["ASSORBONO", "INFRAROSSI"]),
        (cx - 170, cy - 130, "CALORE", ["MOLECOLE", "SI MUOVONO"]),
        (cx + 170, cy - 130, "ARIA CALDA", ["TEMPERATURA", "AUMENTA"]),
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
        c.drawCentredString(nx, ny + 15, titolo)
        c.setFont(FONT_NORMAL, 9)
        for i, s in enumerate(sotto):
            c.drawCentredString(nx, ny - 5 - i*14, s)


def crea_sezione_gas_serra(c):
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "4. I GAS SERRA", y)

    y = disegna_box_concetto(c, "QUALI SONO I GAS SERRA?", [
        "CO2 = ANIDRIDE CARBONICA (IL PRINCIPALE)",
        "CH4 = METANO (MOLTO POTENTE!)",
        "N2O = OSSIDO DI AZOTO",
        "O3 = OZONO"
    ], y)

    y = disegna_box_concetto(c, "IL PROBLEMA: LA CO2", [
        "LA CO2 ESISTE GIA' IN NATURA",
        "MA NOI NE ABBIAMO AGGIUNTA TROPPA",
        "OGNI VOLTA CHE BRUCIAMO QUALCOSA = CO2",
        "AUTO, RISCALDAMENTO, INDUSTRIE..."
    ], y)

    y = disegna_esempio(c, "BRUCI BENZINA -> ESCE CO2 DAL TUBO DI SCARICO", y)

    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_box_concetto(c, "IL METANO: SUPER PERICOLOSO", [
        "IL METANO SCALDA 30 VOLTE PIU' DELLA CO2!",
        "VIENE DAGLI ALLEVAMENTI DI ANIMALI",
        "LE MUCCHE PRODUCONO TANTO METANO"
    ], y)

    y = disegna_box_concetto(c, "COS'E' IL PERMAFROST?", [
        "E' UNO STRATO DI GHIACCIO PERMANENTE",
        "SI TROVA NELLE ZONE PIU' FREDDE (ARTICO)",
        "SOTTO IL GHIACCIO C'E' METANO E CO2 INTRAPPOLATI"
    ], y)

    y = disegna_box_concetto(c, "IL CIRCOLO VIZIOSO", [
        "IL CALDO SCIOGLIE IL PERMAFROST",
        "SCIOGLIENDOSI LIBERA METANO E CO2",
        "PIU' GAS SERRA = PIU' CALDO",
        "PIU' CALDO = PIU' PERMAFROST SI SCIOGLIE"
    ], y)


def crea_parole_chiave(c):
    c.showPage()
    y = A4[1] - 2*cm

    y = disegna_titolo_sezione(c, "5. PAROLE CHIAVE DA RICORDARE", y)

    parole = [
        ("INQUINAMENTO", "QUANDO METTIAMO SOSTANZE NOCIVE NELL'ARIA"),
        ("GAS SERRA", "GAS CHE INTRAPPOLANO IL CALORE (CO2, METANO)"),
        ("EFFETTO SERRA", "IL RISCALDAMENTO DELL'ARIA CAUSATO DAI GAS"),
        ("SURRISCALDAMENTO", "QUANDO LA TERRA SI SCALDA TROPPO"),
        ("EVENTI ESTREMI", "ALLUVIONI, GRANDINATE, ONDATE DI CALORE"),
        ("MOLECOLE", "PARTICELLE PICCOLISSIME CHE FORMANO LA MATERIA"),
        ("INFRAROSSI", "RAGGI INVISIBILI CHE PORTANO CALORE"),
        ("PERMAFROST", "GHIACCIO PERMANENTE CHE SI STA SCIOGLIENDO"),
    ]

    for parola, definizione in parole:
        c.setFillColor(GRIGIO_CHIARO)
        c.setStrokeColor(NERO)
        c.setLineWidth(1)
        c.roundRect(2*cm, y - 45, A4[0] - 4*cm, 40, 5, fill=1, stroke=1)

        c.setFillColor(NERO)
        c.setFont(FONT_BOLD, 12)
        c.drawString(2.5*cm, y - 20, parola)
        c.setFont(FONT_NORMAL, 10)
        c.drawString(2.5*cm, y - 38, definizione)

        y -= 55

        if y < 3*cm:
            c.showPage()
            y = A4[1] - 2*cm


def crea_sintesi_finale(c):
    c.showPage()
    y = A4[1] - 2*cm

    c.setFont(FONT_BOLD, 24)
    c.drawCentredString(A4[0]/2, y, "SINTESI FINALE")
    c.setLineWidth(3)
    c.line(4*cm, y - 15, A4[0] - 4*cm, y - 15)
    y -= 60

    # Box grande con la catena
    c.setFillColor(GRIGIO_CHIARO)
    c.setStrokeColor(NERO)
    c.setLineWidth(3)
    c.roundRect(2*cm, y - 280, A4[0] - 4*cm, 270, 15, fill=1, stroke=1)

    c.setFillColor(NERO)
    c.setFont(FONT_BOLD, 14)
    c.drawCentredString(A4[0]/2, y - 30, "LA CATENA DEL PROBLEMA:")

    c.setFont(FONT_NORMAL, 13)
    steps = [
        "1. L'INQUINAMENTO PRODUCE GAS SERRA",
        "2. I GAS SERRA AUMENTANO L'EFFETTO SERRA",
        "3. L'EFFETTO SERRA CAUSA IL SURRISCALDAMENTO",
        "4. IL SURRISCALDAMENTO CAUSA EVENTI ESTREMI",
        "5. GLI EVENTI ESTREMI SONO: ALLUVIONI, GRANDINATE..."
    ]

    step_y = y - 70
    for step in steps:
        c.drawCentredString(A4[0]/2, step_y, step)
        step_y -= 35
        if step != steps[-1]:
            # Freccia
            c.setFont(FONT_BOLD, 16)
            c.drawCentredString(A4[0]/2, step_y + 10, "v")
            c.setFont(FONT_NORMAL, 13)


def main():
    print("Creazione PDF Effetto Serra per Mario...")

    c = canvas.Canvas(OUTPUT_PDF, pagesize=A4)

    print("  - Copertina...")
    crea_copertina(c)

    print("  - Mappa panoramica...")
    crea_mappa_panoramica(c)

    print("  - Sezione: Cambiamenti climatici...")
    crea_sezione_cambiamenti(c)

    print("  - Sezione: Cos'e' il calore...")
    crea_sezione_calore(c)

    print("  - Sezione: Effetto serra...")
    crea_sezione_effetto_serra(c)

    print("  - Mappa effetto serra...")
    crea_mappa_effetto_serra(c)

    print("  - Sezione: Gas serra...")
    crea_sezione_gas_serra(c)

    print("  - Parole chiave...")
    crea_parole_chiave(c)

    print("  - Sintesi finale...")
    crea_sintesi_finale(c)

    c.save()

    print(f"\nPDF creato: {OUTPUT_PDF}")
    print(f"Dimensione: {os.path.getsize(OUTPUT_PDF) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
