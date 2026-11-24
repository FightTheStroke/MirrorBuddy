"""Spot3 «Ci sono» — GPT-6 Astra's script, with the robot's real reply added.

Picture: real local app (frame-stepped captures), on screen or on drawn laptop/phone over the
blurred desk plate; CG robot clips (declared as 3D reconstruction); the real robot phone clip
(declared, original audio). Voices: MirrorBuddy's realtime voice model (synthetic, declared).
"""
import json
import os
import subprocess
import sys

CODE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("DEMO_WORK") or os.path.join(os.path.dirname(CODE), "work")
HERE = os.path.join(ROOT, "spot3")  # generated layers, segments, voice takes
FF, FP = "ffmpeg", "ffprobe"
FPS = 24
SEG, OVL, VOX = (os.path.join(HERE, d) for d in ("segments", "overlays", "voice"))
OUTDIR = os.environ.get("DEMO_OUT") or os.path.join(ROOT, "out")
NAME = "mirrorbuddy-ci-sono-v3"
ENC = ["-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p", "-r", str(FPS), "-bf", "0"]
REAL = os.path.join(ROOT, "rep", "clean5.mp4")
PLATE = os.path.join(ROOT, "film", "segments", "room_plate.png")
LAPTOP = {"x": 384, "y": 132, "w": 1152, "h": 648}
PHONE = {"x": 766, "y": 70, "w": 388, "h": 840}
CHAT = "c_chat"
FULL = [0, 0, 2880, 1620]
VOICES = "voice2"

SHOTS = [
    {"id": "s01", "kind": "ui", "take": CHAT, "in": 2.0, "dur": 4.2, "a": [0, 720, 1600, 900], "b": [60, 790, 1460, 821], "label": "app0"},
    {"id": "s02", "kind": "dev", "dev": "laptop", "take": CHAT, "in": 6.2, "dur": 3.4, "z": [1.0, 1.05], "label": "app"},
    {"id": "s03", "kind": "ui", "take": "a_full", "in": 3.4, "dur": 2.7, "a": [560, 380, 2200, 1238], "b": [700, 460, 1960, 1103], "label": "app"},
    {"id": "s04", "kind": "ui", "take": CHAT, "in": 9.0, "dur": 2.2, "a": [1560, 60, 1320, 742], "b": [1800, 160, 1080, 608], "label": "app"},
    {"id": "s05", "kind": "ui", "take": CHAT, "in": 11.5, "dur": 2.3, "a": [160, 60, 2400, 1350], "b": [300, 100, 2100, 1181], "label": "app"},
    {"id": "s06", "kind": "ui", "take": "a_visivo", "in": 4.6, "dur": 2.4, "a": FULL, "b": [240, 135, 2400, 1350], "label": "app"},
    {"id": "s07", "kind": "ui", "take": CHAT, "in": 13.9, "dur": 3.3, "a": [0, 330, 1600, 900], "b": [0, 400, 1380, 776], "label": "euclide"},
    {"id": "s08", "kind": "dev", "dev": "laptop", "take": CHAT, "in": 14.9, "dur": 2.0, "play": 1.0, "z": [1.06, 1.10], "label": "app"},
    {"id": "s09", "kind": "ui", "take": CHAT, "in": 16.9, "dur": 3.0, "a": [0, 720, 1600, 900], "b": [60, 790, 1460, 821], "label": "app"},
    {"id": "s10", "kind": "ui", "take": CHAT, "in": 19.7, "dur": 2.2, "a": FULL, "b": [200, 120, 2400, 1350], "label": "app"},
    {"id": "s11", "kind": "ui", "take": CHAT, "in": 24.4, "dur": 3.9, "a": FULL, "b": [780, 500, 2100, 1120], "label": "app"},
    {"id": "s12", "kind": "dev", "dev": "laptop", "take": CHAT, "in": 28.3, "dur": 3.2, "z": [1.0, 1.06], "label": "app"},
    {"id": "s13", "kind": "ui", "take": "k_chars", "in": 1.2, "dur": 2.9, "a": FULL, "b": [260, 120, 2400, 1350], "label": "chars"},
    {"id": "s14", "kind": "ui", "take": "k_chars", "in": 5.0, "dur": 3.0, "a": FULL, "b": [260, 60, 2400, 1350], "label": "chars"},
    {"id": "s15", "kind": "ui", "take": "q_gate", "in": 1.3, "dur": 3.0, "a": [640, 230, 1760, 990], "b": [820, 330, 1360, 765], "label": "app"},
    {"id": "s16", "kind": "ui", "take": "q_gate", "in": 5.2, "dur": 2.0, "a": [540, 40, 1100, 619], "b": [600, 70, 1000, 563], "label": "app"},
    {"id": "s17", "kind": "ui", "take": "t_transp", "in": 0.6, "dur": 3.4, "a": [400, 0, 2080, 1170], "b": [480, 60, 1900, 1069], "label": "app"},
    {"id": "s18", "kind": "dev", "dev": "phone", "take": "p_phone", "in": 0.4, "dur": 2.9, "z": [1.0, 1.05], "label": "app"},
    {"id": "s19", "kind": "ui", "take": "g_prof", "in": 2.2, "dur": 3.0, "a": FULL, "b": [200, 110, 2480, 1395], "label": "prof"},
    {"id": "s20", "kind": "ui", "take": "g_prof", "in": 5.8, "dur": 2.6, "a": [200, 110, 2480, 1395], "b": [360, 200, 2240, 1260], "label": "prof"},
    {"id": "s21", "kind": "cg", "src": "F42", "in": 0.0, "dur": 2.6, "label": "cg"},
    {"id": "s22", "kind": "real", "in": 24.55, "dur": 4.65, "zoom": 1.0, "label": "real"},
    {"id": "s25", "kind": "real", "in": 44.35, "dur": 5.35, "zoom": 1.22, "label": "real"},
    {"id": "s25b", "kind": "real", "in": 49.70, "dur": 5.40, "zoom": 1.18, "label": "real"},
    {"id": "s26", "kind": "dev", "dev": "laptop", "take": CHAT, "in": 31.0, "dur": 4.4, "play": 1.0, "z": [1.0, 1.04], "label": "app"},
    {"id": "s27", "kind": "card", "dur": 2.6},
]
# Voice cues: (id, shot, offset, role, caption) — take chosen automatically from VOICES/report.txt
CUES = [
    ("s_risposta", "s01", 2.0, "S", "Mi dici la risposta?"),
    ("n_tutor", "s02", 0.25, "N", "MirrorBuddy. Un tutor con intelligenza artificiale."),
    ("n_uguali", "s03", 0.55, "N", "Non siamo tutti uguali."),
    ("n_modo", "s05", 0.1, "N", "Nemmeno il modo di imparare."),
    ("e_ottavi", "s07", 0.35, "E", "Tre quarti: quanti ottavi sono?"),
    ("s_sei", "s09", 1.4, "S", "Sei ottavi."),
    ("e_unaltro", "s10", 0.3, "E", "E con un ottavo in più?"),
    ("s_ci_sono", "s11", 0.9, "S", "Sette ottavi. Ci sono."),
    ("n_insieme", "s12", 0.35, "N", "Non al posto tuo. Insieme a te."),
    ("n_coach", "s13", 0.3, "N", "Un coach, per trovare il tuo metodo."),
    ("n_buddy", "s14", 0.3, "N", "Un buddy, per non sentirti sola."),
    ("n_genitori", "s15", 0.4, "N", "E uno spazio per i genitori."),
    ("n_percorso", "s16", 0.3, "N", "Per seguire il percorso."),
    ("n_regole", "s17", 0.5, "N", "Con protezioni e regole chiare."),
    ("n_device", "s18", 0.3, "N", "Sul computer. Sul telefono."),
    ("n_curiosita", "s19", 0.4, "N", "La curiosità non si ferma qui."),
    ("n_robot", "s21", 0.2, "N", "E anche su un piccolo robot."),
    ("n_chiusa", "s26", 0.4, "N", "MirrorBuddy. La scuola che si adatta a chi impara."),
]
REAL_AUDIO = [
    (24.55, 29.20, "s22", 0.0, "B", "«Fammi parlare per esempio con Feynman, voglio una lezione di fisica.»"),
    (44.35, 49.70, "s25", 0.0, "R", "Proviamoci: la fisica quantistica studia le cose piccolissime, come gli atomi e le particelle."),
    (49.70, 55.10, "s25b", 0.0, "R", "Lì le regole sono molto diverse da quelle a cui siamo abituati."),
]
TOP = {"s_risposta", "s_sei", "s_ci_sono"}
LABELS = {
    "app0": "App reale · dialogo dimostrativo · studentessa di fantasia, voci sintetiche",
    "app": "App reale · dialogo dimostrativo",
    "euclide": "Euclide · Maestro AI · voce sintetica",
    "chars": "App reale · Coach e Buddy sono personaggi AI",
    "prof": "App reale · Professori: personaggi AI",
    "cg": "Reachy Mini · ricostruzione 3D",
    "real": "Ripresa reale · audio originale · Feynman è un personaggio AI",
}
FOOTER = ("Studentessa di fantasia; risposte del Maestro preparate per la dimostrazione; voci sintetiche. "
          "Ripresa del robot reale con audio originale, montaggio ridotto. I Maestri sono intelligenze artificiali.")
SFX = [("keys", "s01", 0.2, 0.25), ("click", "s01", 4.05, 0.5), ("click", "s04", 1.05, 0.5), ("keys", "s09", 0.2, 0.25),
       ("click", "s09", 2.35, 0.5), ("keys", "s11", 0.2, 0.25), ("click", "s11", 2.85, 0.5),
       ("click", "s15", 2.9, 0.5)]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(" ".join(map(str, cmd))[:900] + "\n" + r.stderr[-1500:] + "\n")
        raise SystemExit(1)
    return r


def nfr(s):
    return int(round(s * FPS))


def dur(path):
    return float(run([FP, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout)


def ease(n):
    return f"(0.5-0.5*cos(PI*min(n/{max(n - 1, 1)},1)))"


def take_input(s):
    return ["-framerate", str(FPS), "-start_number", str(nfr(s["in"])),
            "-i", os.path.join(ROOT, "takes-spot3", s["take"], "%05d.jpg")]


def seg_ui(s, out):
    n = nfr(s["dur"])
    a, b = s["a"], s["b"]
    t = ease(n)
    L = lambda i: f"({a[i]}+({b[i]}-{a[i]})*{t})"
    z = f"(1920/{L(2)})"
    vf = f"scale=w='2880*{z}':h='1620*{z}':eval=frame:flags=lanczos,crop=1920:1080:x='{L(0)}*{z}':y='{L(1)}*{z}'"
    run([FF, "-y", "-loglevel", "error", *take_input(s), "-vf", vf, "-frames:v", str(n), *ENC, out])


def seg_dev(s, out):
    n = nfr(s["dur"])
    R = LAPTOP if s["dev"] == "laptop" else PHONE
    z0, z1 = s["z"]
    t = ease(n)
    z = f"({z0}+({z1}-{z0})*{t})"
    play = s.get("play")
    pre = f"trim=end_frame={nfr(play)},tpad=stop_mode=clone:stop_duration={s['dur']}," if play else ""
    cx, cy = R["x"] + R["w"] / 2, R["y"] + R["h"] / 2
    fc = (f"[1:v]{pre}scale={R['w']}:{R['h']}:flags=lanczos,format=rgba[sc];"
          f"[3:v]format=gray,crop={R['w']}:{R['h']}:{R['x']}:{R['y']}[m];[sc][m]alphamerge[scm];"
          f"[0:v]scale=1920:1080,format=rgba[bg];[bg][scm]overlay={R['x']}:{R['y']}[a];"
          f"[a][2:v]overlay=0:0,format=yuv420p,"
          f"scale=w='1920*{z}':h='1080*{z}':eval=frame:flags=lanczos,"
          f"crop=1920:1080:x='{cx}*{z}-{cx}':y='{cy}*{z}-{cy}'[v]")
    run([FF, "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", PLATE, *take_input(s),
         "-loop", "1", "-framerate", str(FPS), "-i", os.path.join(OVL, f"{s['dev']}.png"),
         "-loop", "1", "-framerate", str(FPS), "-i", os.path.join(OVL, f"mask_{s['dev']}.png"),
         "-filter_complex", fc, "-map", "[v]", "-frames:v", str(n), *ENC, out])


def seg_cg(s, out):
    src = os.path.join(ROOT, "spot", "lib", f"robot_{s['src']}.mp4")
    if dur(src) - s["in"] + 1e-3 < s["dur"]:
        raise SystemExit(f"{s['id']}: clip too short")
    run([FF, "-y", "-loglevel", "error", "-ss", f"{s['in']:.3f}", "-i", src, "-vf", f"scale=1920:1080:flags=lanczos,fps={FPS}",
         "-frames:v", str(nfr(s["dur"])), "-an", *ENC, out])


def seg_real(s, out):
    # the vertical phone clip kept whole, on a warm dark ground; zoom > 1 tightens on the robot's head
    h = 1000
    w = int(round(h * 576 / 1024 / 2) * 2)
    z = s["zoom"]
    fg = (f"scale={int(w * z) // 2 * 2}:{int(h * z) // 2 * 2}:flags=lanczos,crop={w}:{h}:(iw-{w})/2:(ih-{h})*0.25,"
          "eq=contrast=1.03:saturation=1.04,unsharp=5:5:0.4")
    fc = (f"color=c=0x1b1815:s=1920x1080:r={FPS}[bg];[0:v]fps={FPS},{fg},format=rgba[fg];"
          f"[bg][fg]overlay=(W-w)/2:40:shortest=1,format=yuv420p[v]")
    run([FF, "-y", "-loglevel", "error", "-ss", f"{s['in']:.3f}", "-i", REAL, "-filter_complex", fc,
         "-map", "[v]", "-frames:v", str(nfr(s["dur"])), "-an", *ENC, out])


def seg_card(s, out):
    run([FF, "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", os.path.join(OVL, "card.png"),
         "-vf", "format=yuv420p,fade=t=in:d=0.6:color=0xf6f3ee", "-frames:v", str(nfr(s["dur"])), *ENC, out])


FORCE = {"n_chiusa": "n_chiusa_t3"}  # transcriber writes «Mirror Buddy» as two words


def pick_take(line_id):
    """Takes the transcription check heard verbatim; the one of median length among them."""
    if line_id in FORCE:
        return FORCE[line_id]
    import re
    ok = []
    with open(os.path.join(HERE, VOICES, "report.txt"), encoding="utf-8") as report:
        lines = report.readlines()
    for l in lines:
        m = re.match(rf"{line_id} t(\d+)\s+missing=-", l)
        if m:
            f = os.path.join(HERE, VOICES, "takes", f"{line_id}_t{m.group(1)}.wav")
            ok.append((dur(f), f"{line_id}_t{m.group(1)}"))
    if not ok:
        raise SystemExit(f"no clean take for {line_id}")
    ok.sort()
    return ok[(len(ok) - 1) // 2][1]


def trim_voice(name):
    src = os.path.join(HERE, VOICES, "takes", name + ".wav")
    dst = os.path.join(HERE, VOICES, "sel", name + ".wav")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    sr = "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04"
    run([FF, "-y", "-loglevel", "error", "-i", src, "-af", f"{sr},areverse,{sr},areverse,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000", dst])
    return dst, dur(dst)


def main():
    starts, t = {}, 0.0
    for s in SHOTS:
        starts[s["id"]] = t
        t += nfr(s["dur"]) / FPS
    total = t
    cues = []
    for cid, shot, off, role, cap in CUES:
        take = pick_take(cid)
        print("   take", take)
        f, d = trim_voice(take)
        cues.append({"id": cid, "file": f, "at": starts[shot] + off, "dur": d, "role": role, "cap": cap})
    for i, (a, b, shot, off, role, cap) in enumerate(REAL_AUDIO):
        cues.append({"id": f"real{i}", "src": (a, b), "at": starts[shot] + off, "dur": b - a, "role": role, "cap": cap})
    cues.sort(key=lambda c: c["at"])
    print(f"{NAME} {total:.2f}s · {len(SHOTS)} shots")
    for c in cues:
        print(f"  {c['at']:6.2f} +{c['dur']:4.2f} {c['id']}")
    for x, y in zip(cues, cues[1:]):
        if x["at"] + x["dur"] > y["at"] + 0.05:
            print(f"  WARNING overlap {x['id']} -> {y['id']} ({x['at'] + x['dur'] - y['at']:.2f}s)")
    if "--plan" in sys.argv:
        return

    with open(os.path.join(HERE, "overlays.json"), "w", encoding="utf-8") as out:
        json.dump({"laptop": LAPTOP, "phone": PHONE, "labels": LABELS, "footer": FOOTER,
                   "captions": [{"id": c["id"], "role": c["role"], "text": c["cap"], "top": c["id"] in TOP} for c in cues]},
                  out, ensure_ascii=False, indent=1)
    run(["node", os.path.join(CODE, "overlays.mjs")])
    os.makedirs(SEG, exist_ok=True)
    files = []
    for s in SHOTS:
        out = os.path.join(SEG, f"{s['id']}.mp4")
        {"ui": seg_ui, "dev": seg_dev, "cg": seg_cg, "real": seg_real, "card": seg_card}[s["kind"]](s, out)
        files.append(out)
    pic = os.path.join(SEG, "picture.mp4")
    cmd = [FF, "-y", "-loglevel", "error"]
    for f in files:
        cmd += ["-i", f]
    cmd += ["-filter_complex", "".join(f"[{i}:v]setsar=1[q{i}];" for i in range(len(files))) + "".join(f"[q{i}]" for i in range(len(files))) + f"concat=n={len(files)}:v=1:a=0[v]",
            "-map", "[v]", "-c:v", "libx264", "-preset", "fast", "-crf", "8", "-pix_fmt", "yuv420p", "-r", str(FPS), "-bf", "0", pic]
    run(cmd)

    layers, lab = [], []
    for s in SHOTS:
        if not s.get("label"):
            continue
        a, b = starts[s["id"]], starts[s["id"]] + nfr(s["dur"]) / FPS
        if lab and lab[-1][0] == f"label_{s['label']}" and abs(lab[-1][2] - a) < 1e-6:
            lab[-1][2] = b
        else:
            lab.append([f"label_{s['label']}", a, b])
    layers += lab
    layers.append(["endtitle", starts["s26"] + 0.3, starts["s26"] + nfr(4.4) / FPS])
    for i, c in enumerate(cues):
        end = c["at"] + c["dur"] + 0.3
        if i + 1 < len(cues):
            end = min(end, cues[i + 1]["at"] - 0.04)
        layers.append([f"cap_{c['id']}", c["at"], end])
    silent = os.path.join(OUTDIR, f"{NAME}-senza-audio.mp4")
    cmd = [FF, "-y", "-loglevel", "error", "-i", pic]
    for name, _a, _b in layers:
        cmd += ["-loop", "1", "-framerate", str(FPS), "-i", os.path.join(OVL, name + ".png")]
    chain, last = [f"[0:v]setpts=N/({FPS}*TB)[base]"], "base"
    for i, (name, a, b) in enumerate(layers, start=1):
        chain.append(f"[{last}][{i}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[v{i}]")
        last = f"v{i}"
    chain.append(f"[{last}]fade=t=out:st={total - 0.6:.3f}:d=0.6[vf]")
    cmd += ["-filter_complex", ";".join(chain), "-map", "[vf]", "-t", f"{total:.3f}", *ENC, "-an", silent]
    run(cmd)

    # sound: synthetic voices + original robot-clip audio + UI foley over a quiet continuous room bed
    cmd, parts, names = [FF, "-y", "-loglevel", "error"], [], []
    k = 0
    for c in cues:
        if "file" in c:
            cmd += ["-i", c["file"]]
            parts.append(f"[{k}:a]aresample=48000,highpass=f=70,adelay={int(c['at'] * 1000)}:all=1[a{k}]")
        else:
            a, b = c["src"]
            cmd += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", REAL]
            parts.append(f"[{k}:a]aresample=48000,afftdn=nr=8,volume=1.25,afade=t=in:d=0.08,"
                         f"afade=t=out:st={b - a - 0.12:.3f}:d=0.12,adelay={int(c['at'] * 1000)}:all=1[a{k}]")
        names.append(f"[a{k}]")
        k += 1
    for name, shot, off, gain in SFX:
        cmd += ["-i", os.path.join(ROOT, "spot", "sfx", f"{name}.wav")]
        parts.append(f"[{k}:a]aresample=48000,volume={gain},adelay={int((starts[shot] + off) * 1000)}:all=1[a{k}]")
        names.append(f"[a{k}]")
        k += 1
    cmd += ["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anoisesrc=color=brown:amplitude=0.5:sample_rate=48000"]
    parts.append(f"[{k}:a]highpass=f=70,lowpass=f=900,volume=0.03,afade=t=in:d=0.6,afade=t=out:st={total - 1.4:.3f}:d=1.4[tone]")
    parts.append(f"{''.join(names)}amix=inputs={len(names)}:normalize=0,apad=whole_dur={total:.3f}[vox]")
    parts.append("[vox][tone]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[mix]")
    wav = os.path.join(SEG, "mix.wav")
    cmd += ["-filter_complex", ";".join(parts), "-map", "[mix]", "-t", f"{total:.3f}", "-ac", "2", wav]
    run(cmd)
    final = os.path.join(OUTDIR, f"{NAME}.mp4")
    run([FF, "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", "-shortest", final])
    with open(os.path.join(HERE, "timeline.json"), "w", encoding="utf-8") as out:
        json.dump({"total": total, "starts": starts, "cues": [{k: v for k, v in c.items() if k != "file"} for c in cues]},
                  out, indent=1)
    print("written", final)


if __name__ == "__main__":
    main()
