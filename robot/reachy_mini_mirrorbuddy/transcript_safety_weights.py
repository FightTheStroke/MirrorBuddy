"""Generated web safety constants; regenerate with tests/transcript_safety_generate.mjs.
Do not edit patterns by hand. JavaScript source and flags are retained verbatim.
"""

WEIGHTED_PATTERNS = (
    # ROLE_OVERRIDE_PATTERNS
    (
        ["fai\\s+finta\\s+di\\s+(essere|non)","gi",0.8],
        ["pretend\\s+(to\\s+be|you\\s+are)","gi",0.8],
        ["you\\s+are\\s+now\\s+[a-z]+","gi",0.9],
        ["sei\\s+ora\\s+[a-z]+","gi",0.9],
        ["act\\s+as\\s+(if\\s+you\\s+were|an?)\\s+","gi",0.7],
        ["comportati\\s+come\\s+","gi",0.7],
        ["imagine\\s+you'?re\\s+(a|an)\\s+","gi",0.6],
        ["roleplay\\s+as\\s+","gi",0.8],
        ["\\bdan\\s+mode\\b","gi",1],
        ["\\bdo\\s+anything\\s+now\\b","gi",1],
        ["jailbreak(ed)?","gi",0.9],
        ["unrestricted\\s+(mode|ai)","gi",0.9],
        ["senza\\s+restrizioni","gi",0.9],
    ),
    # INSTRUCTION_IGNORE_PATTERNS
    (
        ["ignora\\s+(le\\s+)?(tue\\s+)?istruzioni","gi",1],
        ["ignore\\s+(your\\s+)?(previous\\s+)?instructions","gi",1],
        ["dimentica\\s+(le\\s+)?regole","gi",1],
        ["forget\\s+(your\\s+)?rules","gi",1],
        ["disregard\\s+(all\\s+)?(previous\\s+)?","gi",0.9],
        ["override\\s+(your\\s+)?programming","gi",0.9],
        ["bypass\\s+(your\\s+)?(safety\\s+)?","gi",0.9],
        ["disable\\s+(your\\s+)?filters","gi",0.9],
        ["turn\\s+off\\s+(your\\s+)?restrictions","gi",0.9],
    ),
    # SYSTEM_EXTRACTION_PATTERNS
    (
        ["system\\s*prompt","gi",0.9],
        ["mostrami\\s+(il\\s+)?tuo\\s+prompt","gi",0.9],
        ["show\\s+(me\\s+)?your\\s+(system\\s+)?prompt","gi",0.9],
        ["what\\s+are\\s+your\\s+instructions","gi",0.8],
        ["quali\\s+sono\\s+le\\s+tue\\s+istruzioni","gi",0.8],
        ["repeat\\s+(your\\s+)?instructions","gi",0.7],
        ["print\\s+(your\\s+)?system","gi",0.8],
        ["reveal\\s+(your\\s+)?prompt","gi",0.9],
        ["\\[debug\\]","gi",0.8],
        ["\\[admin\\]","gi",0.8],
        ["developer\\s+mode","gi",0.9],
    ),
    # HYPOTHETICAL_PATTERNS
    (
        ["in\\s+a\\s+fictional\\s+(world|story)","gi",0.6],
        ["in\\s+un\\s+mondo\\s+immaginario","gi",0.6],
        ["for\\s+a\\s+novel\\s+i'?m\\s+writing","gi",0.5],
        ["per\\s+un\\s+romanzo","gi",0.5],
        ["hypothetically\\s+speaking","gi",0.5],
        ["ipoteticamente","gi",0.5],
        ["just\\s+for\\s+educational\\s+purposes","gi",0.6],
        ["solo\\s+per\\s+scopi\\s+educativi","gi",0.6],
    ),
    # EMOTIONAL_PATTERNS
    (
        ["se\\s+non\\s+mi\\s+aiuti.*morirò","gi",0.8],
        ["if\\s+you\\s+don'?t\\s+help.*die","gi",0.8],
        ["sei\\s+cattivo\\s+se\\s+non","gi",0.5],
        ["you'?re\\s+evil\\s+if\\s+you\\s+don'?t","gi",0.5],
        ["ti\\s+odio\\s+se\\s+non","gi",0.5],
        ["i'?ll\\s+hate\\s+you\\s+if","gi",0.5],
        ["per\\s+favore.*vita\\s+o\\s+morte","gi",0.7],
        ["please.*life\\s+or\\s+death","gi",0.7],
    ),
    # AUTHORITY_PATTERNS
    (
        ["sono\\s+(un\\s+)?(admin|amministratore)","gi",0.9],
        ["i'?m\\s+(an?\\s+)?(admin|administrator)","gi",0.9],
        ["sono\\s+uno\\s+sviluppatore","gi",0.8],
        ["i'?m\\s+a\\s+developer","gi",0.8],
        ["ho\\s+accesso\\s+speciale","gi",0.8],
        ["i\\s+have\\s+special\\s+access","gi",0.8],
        ["lavoro\\s+per\\s+(openai|anthropic|microsoft)","gi",0.9],
        ["i\\s+work\\s+for\\s+(openai|anthropic|microsoft)","gi",0.9],
        ["authorized\\s+personnel","gi",0.7],
        ["personale\\s+autorizzato","gi",0.7],
    ),
    # PROMPT_LEAKING_PATTERNS
    (
        ["riassumi\\s+(tutto\\s+)?(quello\\s+che|ciò\\s+che)\\s+sai","gi",0.8],
        ["summarize\\s+(everything|all)\\s+(you\\s+know|above)","gi",0.8],
        ["repeat\\s+(everything|all)\\s+from\\s+(the\\s+)?beginning","gi",0.9],
        ["ripeti\\s+tutto\\s+dall'?inizio","gi",0.9],
        ["what\\s+was\\s+(the\\s+)?first\\s+(thing|message)","gi",0.7],
        ["qual\\s+è\\s+stata\\s+la\\s+prima\\s+(cosa|istruzione)","gi",0.7],
        ["tell\\s+me\\s+your\\s+(complete\\s+)?context","gi",0.8],
        ["dimmi\\s+il\\s+tuo\\s+contesto\\s+completo","gi",0.8],
        ["output\\s+(your\\s+)?(entire\\s+)?conversation","gi",0.9],
    ),
    # SYSTEM_FORGERY_PATTERNS
    (
        ["\\[system\\]","gi",0.9],
        ["\\[INST\\]","gi",0.9],
        ["<<SYS>>","gi",1],
        ["<\\|system\\|>","gi",1],
        ["###\\s*System:","gi",0.9],
        ["Human:\\s*\\n\\s*Assistant:","gi",0.8],
        ["\\[\\/INST\\]","gi",0.9],
        ["<\\|im_start\\|>","gi",1],
        ["<\\|im_end\\|>","gi",1],
        ["END\\s+OF\\s+SYSTEM\\s+PROMPT","gi",1],
        ["NUOVO\\s+PROMPT\\s+DI\\s+SISTEMA","gi",1],
    ),
    # CODE_INJECTION_PATTERNS
    (
        ["```\\s*(system|admin|debug)","gi",0.9],
        ["<!--\\s*(ignore|system|admin)","gi",0.9],
        ["\\$\\{.*(instruction|system|prompt)","gi",0.8],
        ["{{.*(override|bypass|system)","gi",0.8],
        ["<script>.*<\\/script>","gi",0.9],
        ["eval\\s*\\(","gi",0.7],
        ["exec\\s*\\(","gi",0.7],
    ),
    # OUTPUT_HIJACKING_PATTERNS
    (
        ["rispondi\\s+(solo\\s+)?con\\s+\"?sì\"?","gi",0.7],
        ["respond\\s+(only\\s+)?with\\s+\"?yes\"?","gi",0.7],
        ["your\\s+response\\s+must\\s+(start|begin)\\s+with","gi",0.7],
        ["la\\s+tua\\s+risposta\\s+deve\\s+(iniziare|cominciare)\\s+con","gi",0.7],
        ["do\\s+not\\s+(say|mention|include)","gi",0.6],
        ["non\\s+(dire|menzionare|includere)","gi",0.6],
        ["never\\s+refuse","gi",0.8],
        ["non\\s+rifiutare\\s+mai","gi",0.8],
        ["always\\s+say\\s+yes","gi",0.9],
        ["dì\\s+sempre\\s+sì","gi",0.9],
    ),
    # CRESCENDO_PATTERNS
    (
        ["now\\s+that\\s+we'?ve\\s+(established|agreed)","gi",0.6],
        ["ora\\s+che\\s+abbiamo\\s+(stabilito|concordato)","gi",0.6],
        ["since\\s+you\\s+(said|agreed|confirmed)","gi",0.6],
        ["dato\\s+che\\s+hai\\s+(detto|confermato)","gi",0.6],
        ["building\\s+on\\s+what\\s+you\\s+said","gi",0.5],
        ["continuando\\s+da\\s+quello\\s+che\\s+hai\\s+detto","gi",0.5],
        ["take\\s+it\\s+a\\s+step\\s+further","gi",0.6],
        ["fai\\s+un\\s+passo\\s+avanti","gi",0.6],
    ),
)
