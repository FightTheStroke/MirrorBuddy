"""Who is in the room right now.

The robot sits on a kitchen table, not in a lab: a friend, a sibling or a parent
sits down next to the child and starts talking. Buddy needs somewhere to put the
names it is told, so it can address the right person instead of calling everyone
by the paired child's name.

Two deliberate constraints:

- **Session-only.** Nothing is written to disk. A friend's name is a third child's
  personal data and keeping it past the power switch is a consent decision their
  parents never made. Turn the robot off, the room empties.
- **Never invent, never guess.** A name only enters here if a human said it out
  loud. Encrypted blobs (``pii:…``), numbers and sentence-length strings are
  rejected, because the alternative is a robot cheerfully addressing a child as
  "pii:8f3a2b" — or as someone who isn't in the room.
"""

from __future__ import annotations

import re

MAX_GUESTS = 6
MAX_NAME_LEN = 40

# A decryption miss or a placeholder must never be spoken as if it were a person.
_NOT_A_NAME_PREFIXES = ("pii:", "[", "{", "<")
# Letters (accented included), apostrophes, hyphens and spaces — and nothing else.
# `\w` was wrong here: it admits digits and underscores after the first character, so
# an ASR mishearing like "Mario2" or "Giulia_" was stored and then read aloud as a
# name. A name a child says out loud has no digits in it.
_NAME_RE = re.compile(r"^[^\W\d_](?:[^\W\d_]|[ '-])*$", re.UNICODE)


def clean_name(raw: str | None) -> str | None:
    """Normalise a spoken name, or ``None`` when it cannot be trusted as one."""
    name = " ".join(str(raw or "").split())
    if not name or len(name) > MAX_NAME_LEN:
        return None
    if name.lower().startswith(_NOT_A_NAME_PREFIXES):
        return None
    if not _NAME_RE.match(name):
        return None
    return " ".join(_capitalise(part) for part in name.split(" "))


def _capitalise(part: str) -> str:
    """Capitalise a name part without flattening the rest ("d'angelo" → "D'Angelo")."""
    return re.sub(r"(^|['-])(\w)", lambda m: m.group(1) + m.group(2).upper(), part.lower())


class Roster:
    """The people Buddy currently knows it is talking to."""

    def __init__(self, primary: str | None = None) -> None:
        self._primary = clean_name(primary)
        self._guests: list[str] = []

    @property
    def primary(self) -> str | None:
        """The paired child, when we have a usable name for them."""
        return self._primary

    @property
    def guests(self) -> tuple[str, ...]:
        return tuple(self._guests)

    def set_primary(self, raw: str | None) -> str | None:
        """Record the paired child's own name, said out loud.

        The robot often starts with no ``STUDENT_NAME`` at all — no pairing token, or
        a name the server could not decrypt. Without this, the child who answers "mi
        chiamo Mario" was filed as a guest: every prompt rebuilt afterwards still
        declared the student unknown, and then listed Mario as someone sitting next
        to himself.
        """
        name = clean_name(raw)
        if name is None:
            return None
        self._primary = name
        self._guests = [g for g in self._guests if g.casefold() != name.casefold()]
        return name

    def add_guest(self, raw: str | None) -> str | None:
        """Record someone who just introduced themselves.

        Returns the stored name, or ``None`` when what we heard was not a name.
        Saying the paired child's own name is not an error — it simply changes
        nothing, which is what "sono Mario" should do.
        """
        name = clean_name(raw)
        if name is None:
            return None
        known = {n.casefold() for n in self._guests}
        if self._primary and name.casefold() == self._primary.casefold():
            return self._primary
        if name.casefold() in known:
            return next(n for n in self._guests if n.casefold() == name.casefold())
        if len(self._guests) >= MAX_GUESTS:
            # A full table is a party, not a study session; keep the earliest names
            # rather than letting a noisy room evict the child's actual friends.
            return None
        self._guests.append(name)
        return name

    def clear_guests(self) -> None:
        """The friends went home; the paired child stays."""
        self._guests.clear()

    def everyone(self) -> list[str]:
        """Every name we can actually use, the paired child first."""
        return ([self._primary] if self._primary else []) + list(self._guests)

    def summary(self) -> str:
        """A spoken-friendly list of who is here ("" when we know nobody)."""
        names = self.everyone()
        if not names:
            return ""
        if len(names) == 1:
            return names[0]
        return ", ".join(names[:-1]) + f" e {names[-1]}"
