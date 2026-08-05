"""Realtime tool (function-calling) schemas and Maestro resolution.

These tools let the student drive everything by voice — no screen needed:
- ``list_professors``   → Buddy enumerates who is available.
- ``call_professor``    → switch to another MirrorBuddy Maestro (persona + voice).
- ``look_at_homework``  → capture one camera frame so Buddy can read the exercise.

The schemas are sent in ``session.update`` and the model calls them autonomously.
"""

from __future__ import annotations

import json
import re
from typing import Any

from .mirrorbuddy_client import Maestro

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "list_professors",
        "description": (
            "Elenca chi c'e' su MirrorBuddy: i professori (Maestri) con la loro materia "
            "e i coach dello studio (Melissa, Roberto, Chiara, Andrea, Favij, Laura). "
            "Usalo quando lo studente chiede chi c'e' o con chi puo' parlare."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "call_professor",
        "description": (
            "Passa la conversazione a un altro professore o coach MirrorBuddy, cambiando persona e voce. "
            "Usalo quando lo studente chiede un'altra persona o un'altra materia "
            "(es. 'voglio matematica', 'chiama Galileo', 'parliamo di arte'), "
            "e anche quando chiede aiuto sul metodo, l'organizzazione o la motivazione "
            "(es. 'chiama Andrea', 'non riesco a studiare', 'mi serve un metodo'): "
            "in quel caso passa a un coach."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Nome della persona o materia richiesta "
                        "(es. 'Galileo', 'matematica', 'storia', 'Andrea', 'metodo di studio')."
                    ),
                }
            },
            "required": ["query"],
        },
    },
    {
        "type": "function",
        "name": "look_at_homework",
        "description": (
            "Scatta una foto con la telecamera per guardare cio' che lo studente mostra e aiutarlo: "
            "un compito o esercizio, la pagina di un quaderno o di un libro appoggiato sul tavolo, "
            "lo schermo del computer, una mappa o una figura. Leggi cosa c'e' scritto e aiuta. "
            "Annuncia sempre a voce che stai guardando prima di usarlo."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": (
                        "Cosa guardare o su cosa aiutare (es. 'leggi il problema', 'che pagina e' del libro', "
                        "'controlla l'operazione', 'cosa c'e' sullo schermo')."
                    ),
                }
            },
            "required": [],
        },
    },
    {
        "type": "function",
        "name": "talk_as_friend",
        "description": (
            "Passa alla modalita' AMICO: smetti di fare il tutor e diventa Buddy, un amico con cui "
            "chiacchierare di qualsiasi cosa (la giornata, gli amici, i videogiochi, le passioni, le "
            "emozioni), NON di scuola. Usalo quando lo studente non vuole studiare, vuole solo parlare, "
            "sfogarsi o giocare (es. 'non voglio fare i compiti', 'parliamo un po'', 'raccontami qualcosa', "
            "'sei mio amico?', 'modalita' amico')."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "back_to_study",
        "description": (
            "Torna alla modalita' STUDIO con Buddy tutor, che aiuta a organizzare i compiti e chiamare i "
            "professori. Usalo quando lo studente vuole ricominciare a studiare o fare i compiti "
            "(es. 'ok torniamo ai compiti', 'aiutami a studiare', 'modalita' studio')."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "remember_person",
        "description": (
            "Registra il nome di una persona che si e' appena presentata o che ti ha detto come "
            "si chiama (un amico dello studente, un fratello, un genitore, o lo studente stesso). "
            "Usalo SUBITO dopo aver sentito il nome, cosi' te lo ricordi per tutta la conversazione "
            "e puoi rivolgerti alla persona giusta. Non usarlo con nomi che non hai sentito dire."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Il nome proprio cosi' come la persona lo ha detto (es. 'Giulia').",
                },
                "is_student": {
                    "type": "boolean",
                    "description": (
                        "true se e' lo studente che segui a dirti il proprio nome; "
                        "false o assente se e' un'altra persona (un amico, un fratello, un genitore)."
                    ),
                },
            },
            "required": ["name"],
        },
    },
    {
        "type": "function",
        "name": "who_is_here",
        "description": (
            "Ricorda chi c'e' in questo momento davanti a te: lo studente e le persone che si sono "
            "presentate. Usalo se non ricordi o non sei sicuro di come si chiama chi ti sta parlando."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "guided_meditation",
        "description": (
            "Conduci una vera sessione di meditazione: suona la campana, poi il robot resta "
            "DAVVERO in silenzio per il tempo richiesto, poi la campana chiude. Usalo quando "
            "lo studente accetta di meditare o lo chiede (es. 'meditiamo', 'facciamo un minuto "
            "di silenzio', 'mi aiuti a calmarmi'). Dopo averlo chiamato non parlare: al "
            "silenzio ci pensa il robot."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "practice": {
                    "type": "string",
                    "description": (
                        "Quale pratica: 'respiro' (respiro consapevole), 'campana' (ascolto del "
                        "suono), 'corpo' (saluto al corpo), 'sassolino' (le quattro immagini)."
                    ),
                },
                "minutes": {
                    "type": "number",
                    "description": "Durata del silenzio in minuti (tipicamente 1-5).",
                },
            },
            "required": ["practice"],
        },
    },
]


def parse_call_arguments(event: dict, fallback_name: str = "") -> tuple[str, dict]:
    """Extract (tool name, parsed args) from a ``function_call_arguments.done`` event."""
    name = event.get("name") or fallback_name
    raw = event.get("arguments") or "{}"
    try:
        args = json.loads(raw) if isinstance(raw, str) else dict(raw)
    except (ValueError, TypeError):
        args = {}
    return name, args


def _norm(s: str) -> str:
    return " ".join(str(s or "").lower().split())


# The child speaks the Italian school-subject name; the Maestro record carries an
# English code ("sport", "biology"). Without this bridge, "scienze motorie" matched
# Darwin on the single word "scienze" and Buddy handed the lesson to the wrong
# professor — then looped, apologising, while the child waited.
SUBJECT_ALIASES: dict[str, tuple[str, ...]] = {
    "sport": ("scienze motorie", "educazione fisica", "motoria", "ginnastica", "sport", "movimento"),
    "biology": ("scienze", "scienze naturali", "biologia", "natura"),
    "physics": ("fisica", "astronomia"),
    "chemistry": ("chimica",),
    "mathematics": ("matematica", "geometria", "algebra", "mate"),
    "italian": ("italiano", "letteratura", "grammatica", "epica"),
    "english": ("inglese",),
    "french": ("francese",),
    "german": ("tedesco",),
    "spanish": ("spagnolo",),
    "history": ("storia",),
    "geography": ("geografia",),
    "art": ("arte", "disegno", "immagine"),
    "music": ("musica",),
    "philosophy": ("filosofia",),
    "civics": ("educazione civica", "civica", "diritto"),
    "computerScience": ("informatica", "programmazione", "coding", "tecnologia"),
    "economics": ("economia",),
    "health": ("salute", "benessere", "educazione alla salute"),
    "internationalLaw": ("diritto internazionale",),
    "storytelling": ("storytelling", "public speaking", "raccontare"),
    # Coaches: not a school subject. A child asks for them by what they need
    # ("non riesco a studiare", "mi serve un metodo"), not by a discipline.
    "coaching": (
        "coach", "tutor", "sostegno", "metodo", "metodo di studio", "studiare",
        "organizzarmi", "concentrarmi", "motivazione", "compiti", "ansia",
    ),
}


def _alias_hit(m: Maestro, q: str) -> int:
    """Length of the longest alias of ``m`` spoken verbatim in ``q`` (0 if none).

    A child rarely names the subject on its own: they say "mi serve un metodo di
    studio". Requiring every spoken word to match would reject that, so a verbatim
    alias counts as a strong hit — and the *longest* alias wins, which is what keeps
    "scienze motorie" with the sport teacher instead of the biology one.
    """
    best = 0
    for alias in SUBJECT_ALIASES.get(str(m.subject or ""), ()):
        a = _norm(alias)
        if a and re.search(rf"(?<!\w){re.escape(a)}(?!\w)", q):
            best = max(best, len(a))
    return best


def _alias_haystack(m: Maestro) -> str:
    """Everything a child might plausibly say to mean this Maestro."""
    aliases = SUBJECT_ALIASES.get(str(m.subject or ""), ())
    return _norm(f"{m.subject} {m.specialty} {m.teaching_style} {' '.join(aliases)}")


def resolve_maestro(maestri: list[Maestro], query: str) -> Maestro | None:
    """Best-effort match of a spoken query to a Maestro by name/subject/specialty."""
    q = _norm(query)
    if not q or not maestri:
        return None

    # 1) exact id / name / display name.
    for m in maestri:
        if q in (_norm(m.id), _norm(m.name), _norm(m.display_name)):
            return m
    # 2) query mentions a professor name (or vice-versa).
    for m in maestri:
        name = _norm(m.display_name) or _norm(m.name)
        if name and (name in q or q in name):
            return m
    # 3) subject / specialty / spoken aliases.
    tokens = [t for t in q.split() if len(t) > 2]
    best: tuple[int, int, Maestro] | None = None
    for m in maestri:
        hay = _alias_haystack(m)
        # A whole-phrase hit ("scienze motorie") beats loose token overlap, which is
        # what previously let a single shared word send the child to the wrong teacher.
        phrase = 1 if q in hay else 0
        alias = _alias_hit(m, q)
        score = sum(1 for t in tokens if t in hay)
        # No phrase, no alias, and nothing meaningful matched: a query like "ai" has
        # no tokens at all, and `score < len(tokens)` would read 0 < 0 and quietly
        # elect the first professor in the roster. Switching a child's teacher on
        # noise is worse than doing nothing.
        if not phrase and not alias and (not tokens or score < len(tokens)):
            continue
        cand = (phrase, alias, score, m)
        if best is None or cand[:3] > best[:3]:
            best = cand
    return best[3] if best else None


def professors_summary(maestri: list[Maestro], limit: int = 26) -> str:
    """A compact spoken-friendly list of professors and their subjects."""
    parts = []
    for m in maestri[:limit]:
        name = m.display_name or m.name
        subject = m.subject or m.specialty
        parts.append(f"{name} ({subject})" if subject else name)
    return "; ".join(parts)
