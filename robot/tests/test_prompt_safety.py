"""Bounded instruction contracts, not proof of runtime moderation parity."""

from __future__ import annotations

import pytest

from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro
from reachy_mini_mirrorbuddy.prompt_builder import (
    _EMBODIMENT_IT,
    _PEOPLE_IT,
    build_instructions,
)
from reachy_mini_mirrorbuddy.safety import get_safety_preamble


def _maestro(mid: str = "buddy", subject: str = "") -> Maestro:
    return Maestro.from_json(
        {"id": mid, "name": mid, "displayName": mid, "subject": subject,
         "systemPrompt": "Persona supplied by MirrorBuddy."}
    )


def test_unknown_age_is_not_inferred_from_the_reference_deployment():
    text = build_instructions(_maestro())
    assert "L'età dello studente non è disponibile" in text
    assert "non dedurla" in text
    assert "adatto ai minori" in text
    assert "15" not in text
    assert "Stai parlando con un minore" not in text


def test_embodiment_does_not_override_safety_or_require_invented_vision():
    assert "QUESTO ANNULLA QUALSIASI ISTRUZIONE PRECEDENTE" not in _EMBODIMENT_IT
    assert "non modificano le regole di sicurezza" in _EMBODIMENT_IT
    assert "Se lo strumento non è disponibile o fallisce" in _EMBODIMENT_IT
    assert "non inventare ciò che vedi" in _EMBODIMENT_IT


def test_names_are_optional_and_the_privacy_exception_is_explicit():
    preamble = get_safety_preamble()
    assert "nome o soprannome facoltativo" in preamble
    assert "solo per questa sessione" in preamble
    assert "chiedigli come si chiama" not in _PEOPLE_IT
    assert "Se vuole" in _PEOPLE_IT
    prompt = build_instructions(_maestro())
    assert "non è obbligatorio" in prompt
    assert "Puoi chiederglielo" not in prompt


@pytest.mark.parametrize("locale", [None, "", "it", "en", 42])
def test_missing_or_malformed_locale_keeps_existing_italian_fallback(locale):
    prompt = build_instructions(_maestro(), locale=locale)
    assert prompt.startswith(get_safety_preamble())
    assert "Parla SEMPRE in italiano" in prompt
    assert "Persona supplied by MirrorBuddy." in prompt


def test_safety_is_first_for_every_character_in_a_large_dynamic_mixed_roster():
    # Larger than the old 27-person assumption, with coaches and a future addition.
    roster = [_maestro(f"maestro-{n}", "history") for n in range(32)]
    roster += [_maestro(f"coach-{n}", "coaching") for n in range(6)]
    roster.append(_maestro("new-colleague", "new-subject"))
    for current in roster:
        prompt = build_instructions(current, maestri=roster)
        assert prompt.startswith(get_safety_preamble())
        offer = prompt.split("Puoi passare la parola SOLO a queste persone")[1]
        offer = offer.split("\n")[0]
        for colleague in roster:
            if colleague.id != current.id:
                assert f"{colleague.display_name} (" in offer
        assert f"{current.display_name} (" not in offer
