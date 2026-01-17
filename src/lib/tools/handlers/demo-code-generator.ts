// ============================================================================
// DEMO CODE GENERATOR
// AI-powered code generation for interactive demonstrations
// ============================================================================

import { chatCompletion } from '@/lib/ai/providers';
import { logger } from '@/lib/logger';

/**
 * Technical agent that generates SPECTACULAR HTML/CSS/JS from description
 * Creates interactive visualizations for ANY subject
 */
export async function generateDemoCode(description: {
  title: string;
  concept: string;
  visualization: string;
  interaction: string;
  wowFactor?: string;
}): Promise<{ html: string; css: string; js: string } | null> {
  const prompt = `Crea una demo SPETTACOLARE e INTERATTIVA per:
TITOLO: ${description.title}
CONCETTO: ${description.concept}
VISUALIZZAZIONE: ${description.visualization}
INTERAZIONE: ${description.interaction}
${description.wowFactor ? `WOW: ${description.wowFactor}` : ''}

=== ESEMPI DI DEMO PER MATERIA (ispirati a questi) ===

MATEMATICA - Frazioni:
- Pizza/torta che si divide in fette cliccabili
- Slider per scegliere denominatore, fette si animano
- Colora le fette per rappresentare la frazione
- Confronta frazioni side-by-side

MATEMATICA - Moltiplicazione:
- Griglia di blocchi colorati (righe × colonne)
- Blocchi appaiono uno per uno con animazione
- Cambia numeri e vedi la griglia trasformarsi
- Conta animata del totale

FISICA - Gravità:
- Oggetti diversi (piuma, palla, mattone) che cadono
- Slider per cambiare gravità (Terra, Luna, Giove)
- Tracce colorate delle traiettorie
- Timer e velocimetro in tempo reale

FISICA - Onde:
- Corda/molla che vibra con animazione fluida
- Slider per frequenza e ampiezza
- Vedi lunghezza d'onda cambiare
- Punti che oscillano su e giù

STORIA - Timeline:
- Linea del tempo navigabile con drag
- Eventi come card che appaiono con hover
- Zoom in/out per dettagli
- Personaggi animati che raccontano

STORIA - Mappe:
- Mappa che cambia confini nel tempo
- Slider temporale (es: 1800-2000)
- Paesi che si colorano/espandono
- Popup con info su ogni cambiamento

GEOGRAFIA - Ciclo dell'acqua:
- Animazione continua: evaporazione → nuvole → pioggia
- Clicca su ogni fase per spiegazione
- Sole che scalda, nuvole che si formano
- Particelle d'acqua che si muovono

GEOGRAFIA - Climi:
- Mappa o globo con zone climatiche
- Hover per vedere temperatura, pioggia
- Animazione stagioni che cambiano
- Confronto tra climi diversi

ITALIANO - Analisi grammaticale:
- Frase che si scompone in parole
- Ogni parola si colora per tipo (nome, verbo, aggettivo)
- Drag & drop per riordinare
- Tooltip con spiegazione grammaticale

ITALIANO - Figure retoriche:
- Testo che si trasforma visivamente
- Metafora: parola → immagine
- Similitudine: connessione animata
- Click per vedere la trasformazione

SCIENZE - Cellula:
- Cellula grande esplorabile
- Zoom su ogni organello
- Hover per nome e funzione
- Animazioni dei processi interni

SCIENZE - Fotosintesi:
- Pianta con foglia in sezione
- Sole → luce entra nella foglia
- CO2 entra, O2 esce (particelle animate)
- Glucosio si forma (molecole che si assemblano)

CHIMICA - Reazioni:
- Molecole che si avvicinano
- Legami che si rompono/formano
- Energia rilasciata (flash, particelle)
- Equazione che si bilancia visivamente

CHIMICA - Stati della materia:
- Contenitore con particelle
- Slider temperatura: freddo → caldo
- Particelle si muovono più velocemente
- Cambio di stato visibile (ghiaccio → acqua → vapore)

ARTE - Prospettiva:
- Scena 3D semplificata
- Linee di fuga che appaiono
- Punto di fuga che si può spostare
- Oggetti che cambiano dimensione

MUSICA - Onde sonore:
- Visualizzazione forma d'onda
- Bottoni per note diverse
- Frequenza → altezza visiva
- Colori diversi per ogni nota

=== TEMPLATE BASE (PERSONALIZZA!) ===

HTML:
<div class="demo-container">
  <canvas id="bgCanvas"></canvas>
  <div class="content">
    <h1 class="title">${description.title}</h1>
    <div class="visualization" id="viz"></div>
    <div class="controls">
      <input type="range" id="slider1" min="1" max="10" value="3">
      <span id="val1">3</span>
      <button id="actionBtn" class="glow-btn">Esegui!</button>
    </div>
    <div class="result" id="result"></div>
  </div>
</div>

CSS (OBBLIGATORIO - stile spettacolare):
*{margin:0;padding:0;box-sizing:border-box}
.demo-container{min-height:100vh;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden;position:relative}
#bgCanvas{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none}
.content{background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-radius:24px;padding:40px;max-width:600px;width:90%;box-shadow:0 25px 80px rgba(0,0,0,0.4),0 0 40px rgba(99,102,241,0.3);position:relative;z-index:1;text-align:center}
.title{font-size:2.5rem;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:30px;font-weight:800}
.visualization{min-height:200px;background:linear-gradient(145deg,#f0f0f0,#ffffff);border-radius:16px;margin:20px 0;padding:20px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;box-shadow:inset 0 2px 10px rgba(0,0,0,0.1)}
.controls{display:flex;align-items:center;justify-content:center;gap:20px;margin:20px 0;flex-wrap:wrap}
input[type="range"]{width:150px;height:8px;-webkit-appearance:none;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:4px;cursor:pointer}
input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;background:#fff;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.2);cursor:grab}
.glow-btn{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:16px 40px;border-radius:50px;font-size:1.2rem;font-weight:600;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 20px rgba(102,126,234,0.4)}
.glow-btn:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 8px 30px rgba(102,126,234,0.6)}
.glow-btn:active{transform:scale(0.98)}
.result{font-size:3rem;font-weight:800;color:#667eea;margin-top:20px;min-height:60px;opacity:0;transform:scale(0.5);transition:all 0.5s cubic-bezier(0.175,0.885,0.32,1.275)}
.result.show{opacity:1;transform:scale(1)}
.block{width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;animation:popIn 0.3s ease backwards;box-shadow:0 4px 15px rgba(0,0,0,0.2)}
@keyframes popIn{from{transform:scale(0) rotate(-180deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.confetti{position:fixed;width:10px;height:10px;border-radius:2px;animation:confettiFall 3s ease-out forwards;pointer-events:none;z-index:1000}
@keyframes confettiFall{0%{transform:translateY(-100vh) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

JS (OBBLIGATORIO - animazioni spettacolari):
// Canvas background con particelle
const canvas=document.getElementById('bgCanvas');
const ctx=canvas.getContext('2d');
canvas.width=window.innerWidth;
canvas.height=window.innerHeight;
const particles=[];
const colors=['#667eea','#764ba2','#f093fb','#f5576c','#4facfe','#00f2fe'];
for(let i=0;i<80;i++){particles.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*4+2,dx:(Math.random()-0.5)*2,dy:(Math.random()-0.5)*2,color:colors[Math.floor(Math.random()*colors.length)],alpha:Math.random()*0.5+0.3})}
function animateBg(){ctx.clearRect(0,0,canvas.width,canvas.height);particles.forEach(p=>{p.x+=p.dx;p.y+=p.dy;if(p.x<0||p.x>canvas.width)p.dx*=-1;if(p.y<0||p.y>canvas.height)p.dy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.color;ctx.globalAlpha=p.alpha;ctx.fill();ctx.globalAlpha=1});requestAnimationFrame(animateBg)}
animateBg();
window.addEventListener('resize',()=>{canvas.width=innerWidth;canvas.height=innerHeight});

// Confetti explosion
function confetti(){for(let i=0;i<50;i++){const c=document.createElement('div');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=colors[Math.floor(Math.random()*colors.length)];c.style.animationDelay=Math.random()*0.5+'s';document.body.appendChild(c);setTimeout(()=>c.remove(),3000)}}

// PERSONALIZZA DA QUI IN BASE AL CONCETTO
const viz=document.getElementById('viz');
const result=document.getElementById('result');
const slider1=document.getElementById('slider1');
const val1=document.getElementById('val1');
const actionBtn=document.getElementById('actionBtn');

slider1.addEventListener('input',e=>{val1.textContent=e.target.value;updateVisualization()});
actionBtn.addEventListener('click',calculate);

function updateVisualization(){
  // Aggiungi logica specifica per il concetto
  viz.innerHTML='';
  const n=parseInt(slider1.value);
  for(let i=0;i<n;i++){
    const block=document.createElement('div');
    block.className='block';
    block.style.background=colors[i%colors.length];
    block.style.animationDelay=i*0.1+'s';
    block.textContent=i+1;
    viz.appendChild(block);
  }
}

function calculate(){
  result.classList.remove('show');
  setTimeout(()=>{
    result.textContent='Risultato: '+slider1.value;
    result.classList.add('show');
    confetti();
  },100);
}

updateVisualization();

ADATTA IL CODICE AL CONCETTO "${description.concept}" mantenendo lo stile spettacolare!
- Se è MATEMATICA: blocchi colorati che si moltiplicano/sommano con animazioni
- Se è FISICA: particelle, onde, simulazioni con canvas
- Se è altro: visualizzazione creativa appropriata

Rispondi SOLO con JSON (no markdown, no spiegazioni):
{"html":"...","css":"...","js":"..."}`;

  try {
    const result = await chatCompletion(
      [{ role: 'user', content: prompt }],
      'Sei un generatore di codice. Rispondi SOLO con JSON valido.',
      { temperature: 0.7, maxTokens: 4000 }
    );

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Failed to parse demo code JSON');
      return null;
    }

    const code = JSON.parse(jsonMatch[0]);
    return {
      html: code.html || '',
      css: code.css || '',
      js: code.js || '',
    };
  } catch (error) {
    logger.error('Failed to generate demo code', undefined, error);
    return null;
  }
}
