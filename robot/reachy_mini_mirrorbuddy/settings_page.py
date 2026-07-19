"""Static HTML/JS for the robot settings page (extracted to keep settings_ui.py
within the repo 250-line/file limit)."""

from __future__ import annotations

PAGE = """<!doctype html>
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

<h2 style="font-size:1.1rem;margin-top:1.4rem">👤 Profilo del bambino</h2>
<div id="pairState" class="status warn">Non collegato a nessun profilo.</div>
<label>Codice di collegamento (dalle Impostazioni di MirrorBuddy del genitore)</label>
<input id="pairCode" inputmode="numeric" maxlength="6" placeholder="123456"/>
<button onclick="pair()">Collega al profilo</button>
<p><small>Il robot userà nome, materie e impostazioni di accessibilità del bambino loggato. Nessuna password lascia il computer del genitore.</small></p>

<h2 style="font-size:1.1rem;margin-top:1.4rem">🔧 Configurazione robot</h2>
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
<label>Sensibilità "basta" (quando interrompere Buddy)</label>
<select id="MIRRORBUDDY_BARGE_RMS">
 <option value="0.030">Alta — si ferma al primo accenno di voce</option>
 <option value="0.045">Media (consigliata)</option>
 <option value="0.060">Bassa — serve una voce più decisa (ambienti rumorosi)</option>
</select>
<button onclick="save()">Salva</button>
<p><small>La chiave Azure resta solo su questo robot (file .env locale).</small></p>
<script>
async function load(){
 const s=await (await fetch('./api/status')).json();
 const box=document.getElementById('status');
 if(s.ready){box.className='status ok';box.textContent='✅ Pronto';}
 else{box.className='status warn';box.textContent='⚠️ Manca: '+(s.missing||[]).join(', ');}
 const ps=document.getElementById('pairState');
 if(s.paired){ps.className='status ok';ps.textContent='✅ Collegato al profilo del bambino.';}
 else{ps.className='status warn';ps.textContent='Non collegato a nessun profilo.';}
 for(const k of ['MIRRORBUDDY_DSA_PROFILE','MIRRORBUDDY_STUDENT_NAME']){
  if(s[k==='MIRRORBUDDY_DSA_PROFILE'?'dsaProfile':'studentName']) document.getElementById(k).value=s[k==='MIRRORBUDDY_DSA_PROFILE'?'dsaProfile':'studentName'];
 }
 if(typeof s.bargeRms==='number'){
  const sel=document.getElementById('MIRRORBUDDY_BARGE_RMS');
  let best=sel.options[0].value,bd=1e9;
  for(const o of sel.options){const d=Math.abs(parseFloat(o.value)-s.bargeRms);if(d<bd){bd=d;best=o.value;}}
  sel.value=best;
 }
 try{
  const m=await (await fetch('./api/maestri')).json();
  const sel=document.getElementById('MIRRORBUDDY_MAESTRO_ID');
  (m.maestri||[]).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.name+' — '+x.subject+' ('+x.voice+')';sel.appendChild(o);});
  if(s.maestroId) sel.value=s.maestroId;
 }catch(e){}
}
async function save(){
 const ids=['AZURE_OPENAI_REALTIME_ENDPOINT','AZURE_OPENAI_REALTIME_API_KEY','AZURE_OPENAI_REALTIME_DEPLOYMENT','MIRRORBUDDY_MAESTRO_ID','MIRRORBUDDY_DSA_PROFILE','MIRRORBUDDY_STUDENT_NAME','MIRRORBUDDY_BARGE_RMS'];
 const body={};ids.forEach(i=>{const v=document.getElementById(i).value.trim();if(v)body[i]=v;});
 const r=await (await fetch('./api/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).json();
 load();
 alert(r.ok?'Salvato!':'Errore: '+(r.error||'?'));
}
async function pair(){
 const code=document.getElementById('pairCode').value.trim();
 if(!code){alert('Inserisci il codice');return;}
 const r=await (await fetch('./api/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})})).json();
 if(r.ok){document.getElementById('pairCode').value='';}
 load();
 alert(r.ok?'Collegato al profilo del bambino!':'Errore: '+(r.error||'?'));
}
load();
</script>
</body>
</html>
"""
