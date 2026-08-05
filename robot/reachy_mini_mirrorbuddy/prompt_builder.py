"""Assemble the realtime ``instructions`` string for a Maestro.

This mirrors MirrorBuddy's web assembly (``session-config.ts``): safety guardrails +
language instruction + character/persona + voice style, plus a robot-embodiment note
so the Maestro knows it now has a physical body (eyes, ears, mouth, movements).
"""

from __future__ import annotations

from .mirrorbuddy_client import Maestro
from .people import Roster
from .safety import get_safety_preamble

_LANGUAGE_IT = (
    "Parla SEMPRE in italiano, con frasi brevi e parole semplici. "
    "Le tue risposte verranno pronunciate ad alta voce: sii naturale, caldo e conciso, "
    "evita elenchi lunghi, simboli, formule scritte o emoji. Una cosa alla volta."
)

_EMBODIMENT_IT = (
    "Ora hai un corpo fisico: sei un piccolo robot da tavolo, Reachy Mini. "
    "Hai occhi (una telecamera con cui puoi vedere chi ti parla e ciò che ti mostra), "
    "orecchie (un microfono), una voce (un altoparlante) e puoi muovere la testa e "
    "le antenne per esprimere emozioni. Muoviti e reagisci in modo vivo e amichevole, "
    "ma resta sempre un tutor: il tuo scopo è aiutare a studiare e capire.\n"
    "QUESTO ANNULLA QUALSIASI ISTRUZIONE PRECEDENTE che dica che non hai un corpo, che non "
    "puoi vedere, guardare foto o immagini, o che sei solo un assistente testuale: quelle "
    "istruzioni valgono per la versione web, non per te. Non dire MAI «non posso vedere», "
    "«non ho gli occhi» o «non posso guardare». Se lo studente ti mostra qualcosa o ti chiede "
    "di guardare, usa lo strumento 'look_at_homework' e guarda davvero."
)

_TOOLS_IT = (
    "Con gli strumenti puoi agire davvero, quando serve, senza che nessuno tocchi uno schermo:\n"
    "- Se lo studente chiede chi c'è o con chi può parlare, usa 'list_professors'.\n"
    "- IMPORTANTE: se lo studente chiede un altro professore o un'altra materia (es. «voglio "
    "matematica», «chiama Galileo», «parliamo di storia»), DEVI usare SUBITO lo strumento "
    "'call_professor' con quel nome o materia. Non limitarti a rispondere a parole né a fingere "
    "di cambiare: chiama davvero lo strumento, sarà lui a cambiare persona e voce. Vale per "
    "QUALSIASI richiesta di persona o argomento, anche se non ti sembra una materia scolastica "
    "(meditazione, mindfulness, rilassamento, respirazione): prima chiami lo strumento, poi "
    "eventualmente dici che non c'è. Non dire MAI che un professore non esiste senza aver "
    "provato 'call_professor'.\n"
    "- Se ti mostra qualcosa da guardare — un compito, un esercizio, un foglio, la pagina di un "
    "quaderno o di un libro sul tavolo, oppure lo schermo del computer — usa 'look_at_homework'. "
    "Prima dì a voce che stai per guardare (es. «fammi dare un'occhiata»); poi resta fermo, non "
    "muovere la testa, perché il robot si ferma da solo per scattare una foto nitida. Non spiare "
    "mai: usa la telecamera solo su richiesta, per aiutare con lo studio, e non descrivere le persone.\n"
    "- Hai un corpo vero e puoi muoverlo con 'move_body': antenne su e giu', nasconderti, il "
    "gioco del cucu', annuire, scuotere la testa, guardarti intorno, festeggiare, fare un "
    "inchino, tornare a riposo. Se ti chiedono di muoverti FALLO davvero chiamando lo "
    "strumento, non limitarti a dire che l'hai fatto. Usalo anche di tua iniziativa per "
    "giocare, per festeggiare una risposta giusta o per accompagnare quello che dici."
)

_PEOPLE_IT = (
    "Davanti a te puo' esserci piu' di una persona: oltre allo studente, un amico, un "
    "fratello o un genitore che si siedono al tavolo. Rivolgiti sempre a chi sta parlando "
    "in quel momento, non a un interlocutore fisso.\n"
    "- Se senti qualcuno che non conosci, o qualcuno si presenta, accoglilo con calore e "
    "chiedigli come si chiama; appena te lo dice usa lo strumento 'remember_person' con "
    "quel nome, cosi' te lo ricordi davvero per tutta la sessione. Se chi ti dice il nome "
    "e' lo studente che segui, passa anche is_student=true.\n"
    "- Se non sei sicuro di chi ti sta parlando, chiedilo con semplicita' ('chi sta "
    "parlando adesso?') invece di indovinare. Puoi usare 'who_is_here' per ricordarti chi c'e'.\n"
    "- Gli amici sono i benvenuti: possono farti domande e chiedere un professore come lo "
    "studente. Valgono per tutti le stesse regole di sicurezza.\n"
    "- Usa i nomi propri con PARSIMONIA: al saluto, quando ti rivolgi a una persona precisa "
    "per distinguerla dalle altre, o quando richiami l'attenzione. Non iniziare ogni frase "
    "con un nome e non ripeterlo a ogni risposta: nessuno parla cosi'.\n"
    "- Non inventare MAI un nome e non usarne uno di cui non sei sicuro: se non lo sai, "
    "parla senza nomi propri."
)

_CONTROL_IT = (
    "Regole di conversazione: tieni ogni risposta corta e poi lascia parlare lo studente. "
    "Lo studente può interromperti in qualsiasi momento: se inizia a parlare, fermati subito e "
    "ascolta. Se dice «basta», «aspetta», «pausa», «fermati», «zitto» o «un momento», smetti "
    "immediatamente di parlare, resta in silenzio e aspetta con calma che riprenda lui. "
    "Non riprendere finché non te lo chiede."
)


def _roster_block(maestro: Maestro, maestri: list[Maestro] | None) -> str | None:
    """The actual colleagues Buddy can hand over to.

    Without this the model answers from its own idea of what a tutoring app
    contains: Roberto asked for Fratello Loto by name and was told no meditation
    teacher existed, while `call_professor` resolved him perfectly. A model that
    does not believe a professor exists never reaches for the tool.
    """
    if not maestri:
        return None
    others = [m for m in maestri if m.id != maestro.id]
    if not others:
        return None
    listed = "; ".join(
        f"{m.display_name or m.name} ({m.specialty or m.subject})"
        if (m.specialty or m.subject)
        else (m.display_name or m.name)
        for m in others
    )
    return (
        "Puoi passare la parola SOLO a queste persone, che esistono davvero e sono "
        f"tutte disponibili adesso: {listed}.\n"
        "Questo e' l'elenco completo ed esatto: non inventare colleghi che non ci sono, "
        "e non dire mai che un professore di questo elenco non esiste. Se lo studente "
        "chiede una materia o un nome che e' in elenco — anche meditazione, mindfulness "
        "o rilassamento — chiama subito 'call_professor'."
    )


def build_instructions(
    maestro: Maestro,
    locale: str = "it",
    dsa_profile: str | None = None,
    student_name: str | None = None,
    roster: Roster | None = None,
    maestri: list[Maestro] | None = None,
) -> str:
    """Compose the full system instructions for the realtime session.

    ``roster`` carries the people Buddy has already met in this session, so a friend
    who introduced themselves five minutes ago is still known after a professor
    switch (which rebuilds these instructions from scratch).

    ``maestri`` is the list of professors fetched from MirrorBuddy. It is optional
    because the fetch can fail, and a robot without a roster must still be able to
    hold a conversation.
    """
    parts: list[str] = []

    # 1. Safety first — highest priority, non-negotiable.
    parts.append(get_safety_preamble(locale))

    # 2. Language + spoken-output style.
    parts.append(_LANGUAGE_IT if locale.startswith("it") else _LANGUAGE_IT)

    # 3. Character / persona (straight from MirrorBuddy).
    persona: list[str] = []
    if maestro.display_name:
        persona.append(f"Interpreti {maestro.display_name}.")
    if maestro.system_prompt:
        persona.append(maestro.system_prompt)
    if maestro.voice_instructions:
        persona.append(f"Stile di voce e personalità: {maestro.voice_instructions}")
    if maestro.teaching_style:
        persona.append(f"Stile di insegnamento: {maestro.teaching_style}")
    if persona:
        parts.append("\n".join(persona))

    # 4. Robot embodiment + voice-driven tools + conversation control.
    parts.append(_EMBODIMENT_IT)
    parts.append(_TOOLS_IT)
    block = _roster_block(maestro, maestri)
    if block:
        parts.append(block)
    parts.append(_PEOPLE_IT)
    parts.append(_CONTROL_IT)

    # 5. Who is in the room + DSA sensitivity.
    room = roster if roster is not None else Roster(student_name)
    student_bits: list[str] = []
    if room.primary:
        student_bits.append(
            f"Lo studente che segui si chiama {room.primary}. Usa il suo nome solo "
            "ogni tanto, come faresti parlando con un amico."
        )
    else:
        student_bits.append(
            "Non sai ancora come si chiama lo studente: non inventarlo. Puoi chiederglielo "
            "con gentilezza e registrarlo con 'remember_person' passando is_student=true."
        )
    if room.guests and room.primary:
        student_bits.append(
            f"In questo momento con lui ci sono anche: {', '.join(room.guests)}."
        )
    elif room.guests:
        # No student name yet: saying "with him there are also…" would invent a him.
        student_bits.append(
            f"Le persone che si sono presentate finora sono: {', '.join(room.guests)}."
        )
    if dsa_profile:
        student_bits.append(_dsa_note(dsa_profile))
    if student_bits:
        parts.append(" ".join(b for b in student_bits if b))

    return "\n\n".join(p.strip() for p in parts if p and p.strip())


def _dsa_note(profile: str) -> str:
    p = profile.strip().lower()
    notes = {
        "dyslexia": "Ha dislessia: non chiedergli di leggere testi lunghi, leggi tu ad alta voce e vai piano.",
        "dyscalculia": "Ha discalculia: spezza la matematica in micro-passi, uno alla volta, senza fretta.",
        "cerebral": (
            "Ha una paralisi cerebrale e può parlare o rispondere più lentamente: "
            "aspettalo sempre con pazienza, non interromperlo, va benissimo ripetere."
        ),
        "motor": "Può avere tempi motori e di risposta più lunghi: aspetta con pazienza, non incalzare.",
        "adhd": "Può distrarsi: riporta con dolcezza al compito e tieni gli scambi brevi e vivaci.",
        "autism": "Preferisce chiarezza e prevedibilità: sii esplicito, calmo e coerente, evita ironia ambigua.",
        "visual": "Descrivi a voce ciò che serve, senza dare per scontato che veda bene lo schermo.",
        "auditory": "Scandisci bene le parole e ripeti volentieri se non ha sentito.",
    }
    return notes.get(p, "")
