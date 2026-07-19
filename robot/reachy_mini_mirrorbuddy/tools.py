"""Realtime tool (function-calling) schemas and Maestro resolution.

These tools let the student drive everything by voice — no screen needed:
- ``list_professors``   → Buddy enumerates who is available.
- ``call_professor``    → switch to another MirrorBuddy Maestro (persona + voice).
- ``look_at_homework``  → capture one camera frame so Buddy can read the exercise.

The schemas are sent in ``session.update`` and the model calls them autonomously.
"""

from __future__ import annotations

from typing import Any

from .mirrorbuddy_client import Maestro

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "list_professors",
        "description": (
            "Elenca i professori (Maestri) MirrorBuddy disponibili con la loro materia. "
            "Usalo quando lo studente chiede chi c'e' o con chi puo' parlare."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "type": "function",
        "name": "call_professor",
        "description": (
            "Passa la conversazione a un altro professore MirrorBuddy, cambiando persona e voce. "
            "Usalo quando lo studente chiede un altro professore o un'altra materia "
            "(es. 'voglio matematica', 'chiama Galileo', 'parliamo di arte')."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Nome del professore o materia richiesta (es. 'Galileo', 'matematica', 'storia').",
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
]


def _norm(s: str) -> str:
    return " ".join(str(s or "").lower().split())


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
    # 3) subject / specialty contains the query token(s).
    tokens = [t for t in q.split() if len(t) > 2]
    best: tuple[int, Maestro] | None = None
    for m in maestri:
        hay = f"{_norm(m.subject)} {_norm(m.specialty)} {_norm(m.teaching_style)}"
        score = sum(1 for t in tokens if t in hay)
        if score and (best is None or score > best[0]):
            best = (score, m)
    return best[1] if best else None


def professors_summary(maestri: list[Maestro], limit: int = 26) -> str:
    """A compact spoken-friendly list of professors and their subjects."""
    parts = []
    for m in maestri[:limit]:
        name = m.display_name or m.name
        subject = m.subject or m.specialty
        parts.append(f"{name} ({subject})" if subject else name)
    return "; ".join(parts)
