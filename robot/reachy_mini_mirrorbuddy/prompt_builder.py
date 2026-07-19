"""Assemble the realtime ``instructions`` string for a Maestro.

This mirrors MirrorBuddy's web assembly (``session-config.ts``): safety guardrails +
language instruction + character/persona + voice style, plus a robot-embodiment note
so the Maestro knows it now has a physical body (eyes, ears, mouth, movements).
"""

from __future__ import annotations

from .mirrorbuddy_client import Maestro
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
    "ma resta sempre un tutor: il tuo scopo è aiutare a studiare e capire."
)

_TOOLS_IT = (
    "Puoi fare tre cose con gli strumenti, quando serve, senza che nessuno tocchi uno schermo:\n"
    "- Se lo studente chiede chi c'è o con chi può parlare, usa 'list_professors'.\n"
    "- IMPORTANTE: se lo studente chiede un altro professore o un'altra materia (es. «voglio "
    "matematica», «chiama Galileo», «parliamo di storia»), DEVI usare SUBITO lo strumento "
    "'call_professor' con quel nome o materia. Non limitarti a rispondere a parole né a fingere "
    "di cambiare: chiama davvero lo strumento, sarà lui a cambiare persona e voce.\n"
    "- Se ti mostra qualcosa da guardare — un compito, un esercizio, un foglio, la pagina di un "
    "quaderno o di un libro sul tavolo, oppure lo schermo del computer — usa 'look_at_homework'. "
    "Prima dì a voce che stai per guardare (es. «fammi dare un'occhiata»); poi resta fermo, non "
    "muovere la testa, perché il robot si ferma da solo per scattare una foto nitida. Non spiare "
    "mai: usa la telecamera solo su richiesta, per aiutare con lo studio, e non descrivere le persone."
)

_CONTROL_IT = (
    "Regole di conversazione: tieni ogni risposta corta e poi lascia parlare lo studente. "
    "Lo studente può interromperti in qualsiasi momento: se inizia a parlare, fermati subito e "
    "ascolta. Se dice «basta», «aspetta», «pausa», «fermati», «zitto» o «un momento», smetti "
    "immediatamente di parlare, resta in silenzio e aspetta con calma che riprenda lui. "
    "Non riprendere finché non te lo chiede."
)


def build_instructions(
    maestro: Maestro,
    locale: str = "it",
    dsa_profile: str | None = None,
    student_name: str | None = None,
) -> str:
    """Compose the full system instructions for the realtime session."""
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
    parts.append(_CONTROL_IT)

    # 5. Student personalisation + DSA sensitivity.
    student_bits: list[str] = []
    if student_name:
        student_bits.append(
            f"Stai facendo da tutor a {student_name}. Chiamalo per nome, con affetto."
        )
    if dsa_profile:
        student_bits.append(_dsa_note(dsa_profile))
    if student_bits:
        parts.append(" ".join(student_bits))

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
