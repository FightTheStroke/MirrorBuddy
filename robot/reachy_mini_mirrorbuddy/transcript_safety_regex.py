"""ECMAScript non-Unicode regex compatibility for the audited safety corpus.

ASCII word/digit classes, ECMAScript whitespace, dot line terminators and UTF-16
code-unit gap lengths are intentional. Patterns are fixed, never user supplied.
"""

import re

# ECMA-262 WhiteSpace + LineTerminator (unlike Python's Unicode or ASCII \\s).
JS_SPACE = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005"
JS_SPACE += "\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
_SPACE_CLASS = re.escape(JS_SPACE)


def js_string(text: str) -> str:
    """Non-/u JavaScript regexes operate on UTF-16 units, not code points."""
    encoded = text.encode("utf-16-le", errors="surrogatepass")
    return "".join(chr(encoded[i] | encoded[i + 1] << 8) for i in range(0, len(encoded), 2))


def compile_js(source: str, flags: str = "") -> re.Pattern[str]:
    """Translate only the constructs present in the checked-in web corpus."""
    if set(flags) - {"g", "i"}:
        raise ValueError("Unsupported JavaScript regex flags")
    source = source.replace(r"[\s\S]", r"[\x00-\uffff]")
    output: list[str] = []
    inside_class = False
    index = 0
    while index < len(source):
        char = source[index]
        if char == "\\":
            escaped = source[index + 1]
            if escaped == "s":
                output.append(_SPACE_CLASS if inside_class else f"[{_SPACE_CLASS}]")
            elif escaped == "S":
                if inside_class:
                    raise ValueError("Unsupported negated space class")
                output.append(f"[^{_SPACE_CLASS}]")
            elif escaped == "/":
                output.append("/")
            else:
                output.append(source[index:index + 2])
            index += 2
            continue
        if char == "[":
            inside_class = True
        elif char == "]":
            inside_class = False
        output.append(r"[^\n\r\u2028\u2029]" if char == "." and not inside_class else char)
        index += 1
    # Every accented literal is lowercase and tested on lowercase input. The
    # original-text PII expressions contain only ASCII letters. ASCII IGNORECASE
    # therefore preserves JS /i behavior without Python's extra İ/ı/ſ/K matches.
    return re.compile("".join(output), re.ASCII | (re.IGNORECASE if "i" in flags else 0))
