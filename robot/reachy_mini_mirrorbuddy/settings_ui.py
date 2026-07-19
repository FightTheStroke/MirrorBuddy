"""Minimal in-app settings UI (FastAPI routes).

Mounted on the Reachy Mini app's built-in settings web server. It lets you:
- see whether the required configuration is present,
- pick which Maestro to embody, the DSA profile and the student name,
- enter the Azure Realtime credentials (written to the instance ``.env``).

The page is deliberately tiny and dependency-free (inline HTML + fetch).
"""

from __future__ import annotations

import logging
from pathlib import Path

from .config import config

logger = logging.getLogger(__name__)

# Keys we allow the UI to persist into the instance .env file.
_EDITABLE_KEYS = (
    "AZURE_OPENAI_REALTIME_ENDPOINT",
    "AZURE_OPENAI_REALTIME_API_KEY",
    "AZURE_OPENAI_REALTIME_DEPLOYMENT",
    "AZURE_OPENAI_REALTIME_API_VERSION",
    "MIRRORBUDDY_URL",
    "MIRRORBUDDY_LOCALE",
    "MIRRORBUDDY_MAESTRO_ID",
    "MIRRORBUDDY_DSA_PROFILE",
    "MIRRORBUDDY_STUDENT_NAME",
)


def mount_settings_routes(app, instance_path: str | None) -> None:
    """Attach the settings routes to the app's FastAPI ``settings_app``."""
    from fastapi import Request
    from fastapi.responses import HTMLResponse, JSONResponse

    env_path = Path(instance_path) / ".env" if instance_path else Path(".env")

    @app.get("/", response_class=HTMLResponse)
    async def index() -> str:  # noqa: D401 - route
        return _PAGE

    @app.get("/api/status")
    async def status() -> JSONResponse:
        config.reload()
        return JSONResponse(
            {
                "ready": not config.missing(),
                "missing": config.missing(),
                "maestroId": config.MAESTRO_ID,
                "dsaProfile": config.DSA_PROFILE,
                "studentName": config.STUDENT_NAME,
                "mirrorbuddyUrl": config.MIRRORBUDDY_URL,
                "locale": config.LOCALE,
            }
        )

    @app.get("/api/maestri")
    async def maestri() -> JSONResponse:
        from .mirrorbuddy_client import MirrorBuddyClient

        try:
            client = MirrorBuddyClient(config.MIRRORBUDDY_URL, locale=config.LOCALE)
            items = [
                {"id": m.id, "name": m.display_name, "subject": m.subject, "voice": m.voice}
                for m in client.fetch_maestri()
            ]
            return JSONResponse({"maestri": items})
        except Exception as e:
            logger.warning("maestri fetch failed: %s", e)
            return JSONResponse({"maestri": [], "error": "upstream unavailable"}, status_code=502)

    @app.post("/api/config")
    async def save_config(request: Request) -> JSONResponse:
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "error": "invalid JSON"}, status_code=400)
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "expected object"}, status_code=400)

        updates = {k: str(v) for k, v in body.items() if k in _EDITABLE_KEYS and v is not None}
        try:
            _write_env(env_path, updates)
        except Exception as e:
            logger.error("failed to write .env: %s", e)
            return JSONResponse({"ok": False, "error": "could not save configuration"}, status_code=500)

        # Reload from the instance .env we just wrote (not the process cwd), so the
        # first-run wait loop in main.py sees the new Azure keys without a restart.
        config.env_path = str(env_path)
        config.reload()
        return JSONResponse({"ok": True, "ready": not config.missing(), "missing": config.missing()})


def _write_env(env_path: Path, updates: dict[str, str]) -> None:
    """Merge ``updates`` into the .env file, preserving existing keys."""
    if not updates:
        return
    env_path.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            existing[k.strip()] = v
    existing.update(updates)
    body = "\n".join(f"{k}={v}" for k, v in existing.items()) + "\n"
    env_path.write_text(body, encoding="utf-8")


_PAGE = """<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>MirrorBuddy Robot — Impostazioni</title>
<style>
 body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#1a1a2e}
 h1{font-size:1.4rem} label{display:block;margin:.6rem 0 .2rem;font-weight:600;font-size:.9rem}
 input,select{width:100%;padding:.5rem;border:1px solid #ccc;border-radius:8px;font-size:1rem}
 button{margin-top:1rem;padding:.6rem 1.2rem;border:0;border-radius:8px;background:#5b47e0;color:#fff;font-size:1rem;cursor:pointer}
 .status{padding:.6rem;border-radius:8px;margin:.5rem 0;font-size:.9rem}
 .ok{background:#e4f8ec;color:#0a7a3d} .warn{background:#fff3e0;color:#a35b00}
 small{color:#666}
</style>
</head>
<body>
<h1>🤖 MirrorBuddy Robot</h1>
<div id="status" class="status warn">Carico…</div>
<label>Endpoint Azure Realtime</label>
<input id="AZURE_OPENAI_REALTIME_ENDPOINT" placeholder="https://<risorsa>.openai.azure.com/"/>
<label>Azure API key</label>
<input id="AZURE_OPENAI_REALTIME_API_KEY" type="password" placeholder="(rimane solo sul robot)"/>
<label>Deployment realtime</label>
<input id="AZURE_OPENAI_REALTIME_DEPLOYMENT" placeholder="gpt-realtime"/>
<label>Maestro (chi impersona Buddy)</label>
<select id="MIRRORBUDDY_MAESTRO_ID"><option value="">— default (italiano) —</option></select>
<label>Profilo DSA</label>
<select id="MIRRORBUDDY_DSA_PROFILE">
 <option value="cerebral">Paralisi cerebrale</option>
 <option value="dyslexia">Dislessia</option>
 <option value="dyscalculia">Discalculia</option>
 <option value="adhd">ADHD</option>
 <option value="autism">Autismo</option>
 <option value="motor">Motorio</option>
 <option value="visual">Visivo</option>
 <option value="auditory">Uditivo</option>
 <option value="default">Nessuno</option>
</select>
<label>Nome dello studente</label>
<input id="MIRRORBUDDY_STUDENT_NAME" placeholder="Mario"/>
<button onclick="save()">Salva</button>
<p><small>La chiave Azure resta solo su questo robot (file .env locale).</small></p>
<script>
async function load(){
 const s=await (await fetch('./api/status')).json();
 const box=document.getElementById('status');
 if(s.ready){box.className='status ok';box.textContent='✅ Pronto';}
 else{box.className='status warn';box.textContent='⚠️ Manca: '+(s.missing||[]).join(', ');}
 for(const k of ['MIRRORBUDDY_DSA_PROFILE','MIRRORBUDDY_STUDENT_NAME']){
  if(s[k==='MIRRORBUDDY_DSA_PROFILE'?'dsaProfile':'studentName']) document.getElementById(k).value=s[k==='MIRRORBUDDY_DSA_PROFILE'?'dsaProfile':'studentName'];
 }
 try{
  const m=await (await fetch('./api/maestri')).json();
  const sel=document.getElementById('MIRRORBUDDY_MAESTRO_ID');
  (m.maestri||[]).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name+' — '+x.subject+' ('+x.voice+')';sel.appendChild(o);});
  if(s.maestroId) sel.value=s.maestroId;
 }catch(e){}
}
async function save(){
 const ids=['AZURE_OPENAI_REALTIME_ENDPOINT','AZURE_OPENAI_REALTIME_API_KEY','AZURE_OPENAI_REALTIME_DEPLOYMENT','MIRRORBUDDY_MAESTRO_ID','MIRRORBUDDY_DSA_PROFILE','MIRRORBUDDY_STUDENT_NAME'];
 const body={};ids.forEach(i=>{const v=document.getElementById(i).value.trim();if(v)body[i]=v;});
 const r=await (await fetch('./api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).json();
 load();
 alert(r.ok?'Salvato!':'Errore: '+(r.error||'?'));
}
load();
</script>
</body>
</html>
"""
