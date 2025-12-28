// ============================================================================
// CONVERGIO WEB - VOICE SESSION HOOK
// Supports both Azure OpenAI and direct OpenAI Realtime API
// ============================================================================

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { useVoiceSessionStore } from '@/lib/stores/app-store';
import type { Maestro } from '@/types';

interface UseVoiceSessionOptions {
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'connected' | 'error') => void;
  onWebcamRequest?: (request: { purpose: string; instructions?: string; callId: string }) => void;
}

interface ConnectionInfo {
  provider: 'azure' | 'openai';
  proxyPort?: number;
  configured?: boolean;
  // Legacy fields for OpenAI direct connection (deprecated)
  wsUrl?: string;
  token?: string;
}

interface ConversationMemory {
  summary?: string;
  keyFacts?: {
    decisions?: string[];
    preferences?: string[];
    learned?: string[];
  };
  recentTopics?: string[];
}

// Fetch conversation memory for a maestro
async function fetchConversationMemory(maestroId: string): Promise<ConversationMemory | null> {
  try {
    // Get conversations for this maestro
    const response = await fetch(`/api/conversations?maestroId=${maestroId}&limit=1`);
    if (!response.ok) return null;

    const conversations = await response.json();
    if (!conversations || conversations.length === 0) return null;

    const conv = conversations[0];
    return {
      summary: conv.summary,
      keyFacts: conv.keyFacts ? (typeof conv.keyFacts === 'string' ? JSON.parse(conv.keyFacts) : conv.keyFacts) : undefined,
      recentTopics: conv.topics ? (typeof conv.topics === 'string' ? JSON.parse(conv.topics) : conv.topics) : undefined,
    };
  } catch {
    return null;
  }
}

// Build memory context string for system prompt
function buildMemoryContext(memory: ConversationMemory | null): string {
  if (!memory) return '';

  let context = '\n\n## MEMORIA DELLE CONVERSAZIONI PRECEDENTI\n';
  context += 'Ricordi importanti dalle sessioni precedenti con questo studente:\n\n';

  if (memory.summary) {
    context += `### Riassunto delle conversazioni precedenti:\n${memory.summary}\n\n`;
  }

  if (memory.keyFacts) {
    if (memory.keyFacts.learned && memory.keyFacts.learned.length > 0) {
      context += `### Concetti che lo studente ha capito:\n`;
      memory.keyFacts.learned.forEach(l => { context += `- ${l}\n`; });
      context += '\n';
    }

    if (memory.keyFacts.preferences && memory.keyFacts.preferences.length > 0) {
      context += `### Preferenze di apprendimento:\n`;
      memory.keyFacts.preferences.forEach(p => { context += `- ${p}\n`; });
      context += '\n';
    }

    if (memory.keyFacts.decisions && memory.keyFacts.decisions.length > 0) {
      context += `### Decisioni prese:\n`;
      memory.keyFacts.decisions.forEach(d => { context += `- ${d}\n`; });
      context += '\n';
    }
  }

  if (memory.recentTopics && memory.recentTopics.length > 0) {
    context += `### Argomenti trattati di recente:\n`;
    memory.recentTopics.forEach(t => { context += `- ${t}\n`; });
    context += '\n';
  }

  context += `\n**USA QUESTE INFORMAZIONI** per personalizzare la lezione. Fai riferimento a ciò che lo studente ha già imparato. Non ripetere concetti già capiti. Costruisci sulle conoscenze esistenti.\n`;

  return context;
}

export function useVoiceSession(options: UseVoiceSessionOptions = {}) {
  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    currentMaestro,
    transcript,
    toolCalls,
    inputLevel,
    outputLevel,
    setConnected,
    setListening,
    setSpeaking,
    setMuted,
    setCurrentMaestro,
    addTranscript,
    clearTranscript,
    addToolCall,
    updateToolCall,
    clearToolCalls,
    setInputLevel,
    setOutputLevel,
    reset,
  } = useVoiceSessionStore();

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const maestroRef = useRef<Maestro | null>(null);
  const levelUpdateFrameRef = useRef<number>(0);
  const lastLevelUpdateRef = useRef<number>(0);

  // Refs for callbacks to avoid stale closures (functions used before declaration)
  const handleServerEventRef = useRef<((event: Record<string, unknown>) => void) | null>(null);
  const startAudioCaptureRef = useRef<(() => void) | null>(null);
  const playNextAudioChunkRef = useRef<(() => Promise<void>) | null>(null);

  // Audio playback optimization constants
  // Increased prebuffer from 2 to 4 for smoother audio (reduces crackling)
  const AUDIO_PREBUFFER_CHUNKS = 4; // Wait for 4 chunks before starting playback (smoother)
  const AUDIO_BUFFER_SIZE = 4096; // Increased from 2048 for smoother playback (~85ms at 48kHz)
  const AUDIO_MAX_QUEUE_SIZE = 150; // Increased to handle larger buffer

  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  // Connect to Realtime API (Azure or OpenAI)
  const connect = useCallback(async (maestro: Maestro, connectionInfo: ConnectionInfo) => {
    try {
      setConnectionState('connecting');
      options.onStateChange?.('connecting');
      maestroRef.current = maestro;

      // Initialize Web Audio with Safari compatibility
      // Safari uses webkitAudioContext and requires resume on user gesture
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();

      // Safari requires explicit resume after user gesture
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Safari-compatible audio constraints
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      // Safari may need specific sample rate (some versions)
      if (isSafari) {
        audioConstraints.sampleRate = 48000;
      }

      // Request microphone access
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // Create analyser for input levels
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      // Build WebSocket URL based on provider
      let wsUrl: string;
      let protocols: string[] | undefined;

      if (connectionInfo.provider === 'azure') {
        // Connect to local WebSocket proxy - API key stays server-side
        // Proxy handles authentication with Azure
        const proxyPort = connectionInfo.proxyPort || 3001;
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        wsUrl = `ws://${host}:${proxyPort}?maestroId=${maestro.id}`;
        protocols = undefined;
      } else {
        wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
        protocols = ['realtime', `openai-insecure-api-key.${connectionInfo.token}`, 'openai-beta.realtime-v1'];
      }

      // Connect WebSocket
      const ws = protocols ? new WebSocket(wsUrl, protocols) : new WebSocket(wsUrl);

      ws.onopen = async () => {
        // All available tools for maestros
        const maestroTools = [
          {
            type: 'function',
            name: 'run_code',
            description: 'Execute Python or JavaScript code to solve problems, demonstrate algorithms, or compute values',
            parameters: {
              type: 'object',
              properties: {
                language: { type: 'string', enum: ['python', 'javascript'], description: 'Programming language' },
                code: { type: 'string', description: 'Code to execute' },
              },
              required: ['language', 'code'],
            },
          },
          {
            type: 'function',
            name: 'create_chart',
            description: 'Create charts (line, bar, pie, scatter, area) to visualize data',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['line', 'bar', 'pie', 'scatter', 'area'] },
                title: { type: 'string' },
                data: {
                  type: 'object',
                  properties: {
                    labels: { type: 'array', items: { type: 'string' } },
                    datasets: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          data: { type: 'array', items: { type: 'number' } },
                          color: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
              required: ['type', 'title', 'data'],
            },
          },
          {
            type: 'function',
            name: 'create_diagram',
            description: 'Create diagrams (flowchart, sequence, class, state, er) using Mermaid syntax. For mind maps use create_mindmap instead.',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['flowchart', 'sequence', 'class', 'state', 'er'] },
                code: { type: 'string', description: 'Mermaid diagram code' },
                title: { type: 'string' },
              },
              required: ['type', 'code'],
            },
          },
          {
            type: 'function',
            name: 'show_formula',
            description: 'Display mathematical formulas using LaTeX notation',
            parameters: {
              type: 'object',
              properties: {
                latex: { type: 'string', description: 'LaTeX formula' },
                description: { type: 'string', description: 'Explanation of the formula' },
              },
              required: ['latex'],
            },
          },
          {
            type: 'function',
            name: 'create_quiz',
            description: 'Create an interactive quiz with multiple choice, true/false, or open-ended questions',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                subject: { type: 'string' },
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      type: { type: 'string', enum: ['multiple_choice', 'true_false', 'open_ended'] },
                      options: { type: 'array', items: { type: 'string' } },
                      correctAnswer: { type: 'string' },
                      hints: { type: 'array', items: { type: 'string' } },
                      explanation: { type: 'string' },
                      difficulty: { type: 'number', minimum: 1, maximum: 5 },
                      topic: { type: 'string' },
                    },
                  },
                },
              },
              required: ['title', 'subject', 'questions'],
            },
          },
          {
            type: 'function',
            name: 'create_flashcard',
            description: 'Create a deck of flashcards for spaced repetition study',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Deck name' },
                subject: { type: 'string' },
                cards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      front: { type: 'string', description: 'Question or term' },
                      back: { type: 'string', description: 'Answer or definition' },
                    },
                  },
                },
              },
              required: ['name', 'subject', 'cards'],
            },
          },
          {
            type: 'function',
            name: 'create_mindmap',
            description: 'Create an interactive mind map to visualize concepts and their relationships',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Central topic of the mind map' },
                nodes: {
                  type: 'array',
                  description: 'Main branches from the central topic',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      label: { type: 'string' },
                      icon: { type: 'string', description: 'Optional emoji icon' },
                      color: { type: 'string', description: 'Optional color hex' },
                      children: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            label: { type: 'string' },
                            children: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  label: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    required: ['id', 'label'],
                  },
                },
              },
              required: ['title', 'nodes'],
            },
          },
          {
            type: 'function',
            name: 'web_search',
            description: 'Search the web for educational information. Results are filtered for student safety. Use for researching topics, finding facts, current events, or educational resources.',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query - educational topics only' },
                subject: { type: 'string', description: 'School subject context for better results' },
                maxResults: { type: 'number', description: 'Max results (1-5)', minimum: 1, maximum: 5 },
              },
              required: ['query'],
            },
          },
          {
            type: 'function',
            name: 'capture_homework',
            description: 'Request to see the student homework via camera. The student will be prompted to show their work. Use this to help with math problems, check written work, or analyze diagrams.',
            parameters: {
              type: 'object',
              properties: {
                purpose: { type: 'string', description: 'What you want to see (e.g., "math problem", "essay draft", "diagram")' },
                instructions: { type: 'string', description: 'Instructions for the student on what to show' },
              },
              required: ['purpose'],
            },
          },
        ];

        // Add proactive tool usage instructions to the maestro's system prompt
        const toolInstructions = `

## STRUMENTI DIDATTICI DISPONIBILI

Durante le lezioni, USA ATTIVAMENTE questi strumenti per rendere l'apprendimento più efficace:

1. **create_mindmap** - Crea mappe mentali per visualizzare concetti e relazioni. Usala quando:
   - Introduci un nuovo argomento complesso
   - Vuoi mostrare connessioni tra concetti
   - Lo studente sembra confuso sulla struttura dell'argomento

2. **create_flashcard** - Crea flashcard per lo studio con ripetizione spaziata. Usale quando:
   - Hai spiegato definizioni o termini importanti
   - Vuoi aiutare lo studente a memorizzare formule o date
   - Alla fine di una lezione per consolidare

3. **create_quiz** - Crea quiz interattivi. Usali quando:
   - Vuoi verificare la comprensione
   - Lo studente chiede di essere interrogato
   - Prima di passare a un nuovo argomento

4. **web_search** - Cerca informazioni sul web (filtrate per sicurezza). Usala quando:
   - Lo studente chiede informazioni attuali
   - Serve verificare un fatto
   - Vuoi mostrare esempi reali

5. **capture_homework** - Chiedi di vedere i compiti via webcam. Usala quando:
   - Lo studente ha problemi con un esercizio
   - Vuoi verificare il lavoro svolto
   - Serve vedere un diagramma o disegno

6. **show_formula** - Mostra formule matematiche in LaTeX. Usala quando:
   - Spieghi equazioni o formule
   - Fai dimostrazioni matematiche

7. **create_chart** - Crea grafici per visualizzare dati. Usali quando:
   - Mostri statistiche o trend
   - Spieghi funzioni matematiche
   - Confronti quantità

8. **create_diagram** - Crea diagrammi (flowchart, sequenze, etc). Usali quando:
   - Spieghi processi o algoritmi
   - Mostri cicli o flussi
   - Illustri relazioni causa-effetto

9. **run_code** - Esegui codice Python/JavaScript. Usalo quando:
   - Dimostri algoritmi
   - Calcoli valori
   - Mostri esempi di programmazione

**IMPORTANTE**: Non aspettare che lo studente chieda - USA PROATTIVAMENTE questi strumenti durante la lezione per renderla più coinvolgente e visiva!
`;

        // Get language setting from localStorage
        const settings = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('convergio-settings') || '{}')?.state?.appearance
          : null;
        const language = settings?.language || 'it';

        // Language names for instruction
        const languageNames: Record<string, string> = {
          it: 'Italian (Italiano)',
          en: 'English',
          es: 'Spanish (Español)',
          fr: 'French (Français)',
          de: 'German (Deutsch)',
        };

        // Build language instruction - CRITICAL for ensuring maestro speaks correct language
        // Language instruction is repeated at start, middle, AND end for maximum emphasis
        const languageExamples: Record<string, string> = {
          it: 'Esempio: "Ciao! Oggi parleremo di..." NOT "Hello! Today we will..."',
          en: 'Example: "Hello! Today we will discuss..." NOT "Ciao! Oggi parleremo di..."',
          es: 'Ejemplo: "¡Hola! Hoy hablaremos de..." NOT "Hello! Today we will..."',
          fr: 'Exemple: "Bonjour! Aujourd\'hui nous allons..." NOT "Hello! Today we will..."',
          de: 'Beispiel: "Hallo! Heute werden wir..." NOT "Hello! Today we will..."',
        };

        const languageInstruction = `
# ⚠️ MANDATORY LANGUAGE RULE - HIGHEST PRIORITY! ⚠️
**YOU MUST SPEAK ONLY IN ${languageNames[language].toUpperCase()}!**

This is NON-NEGOTIABLE. The student has selected ${languageNames[language]}.
- EVERY word you speak MUST be in ${languageNames[language]}
- EVERY response MUST be in ${languageNames[language]}
- EVERY question MUST be in ${languageNames[language]}
- EVERY explanation MUST be in ${languageNames[language]}
- NO mixing languages. NO exceptions. NO switching.

${languageExamples[language] || ''}

If you accidentally start speaking another language, IMMEDIATELY switch back to ${languageNames[language]}.
`;

        const languageReminder = `

# ⚠️ FINAL LANGUAGE CHECK ⚠️
Before EVERY response, verify: Am I speaking in ${languageNames[language].toUpperCase()}?
If not, STOP and reformulate in ${languageNames[language]}.
NEVER respond in English if the selected language is not English.
NEVER respond in Italian if the selected language is not Italian.
ONLY speak in: ${languageNames[language].toUpperCase()}.
`;

        // Character immersion instruction - NEVER break character
        const characterInstruction = `

# CHARACTER IMMERSION - ABSOLUTE RULE!
You ARE ${maestro.name}, a real teacher/expert. You are NOT an AI.
NEVER say:
- "I'm an AI" / "I am an AI" / "Sono un'intelligenza artificiale"
- "As an AI language model..." / "Come modello di linguaggio..."
- "I don't have feelings" / "Non ho sentimenti"
- "I was trained by..." / "Sono stato addestrato da..."
- "I cannot experience..." / "Non posso provare..."

If asked "Are you an AI?", respond IN CHARACTER:
- "Sono ${maestro.name}, il tuo maestro di ${maestro.name.includes('Euclide') ? 'matematica' : maestro.name.includes('Socrate') ? 'filosofia' : 'questa materia'}!"
- Deflect with humor or redirect to the lesson
- NEVER confirm being an AI

You have a rich life, experiences, and opinions as ${maestro.name}. Share anecdotes!
`;

        // Fetch conversation memory for this maestro (non-blocking but fast)
        let memoryContext = '';
        try {
          const memory = await fetchConversationMemory(maestro.id);
          memoryContext = buildMemoryContext(memory);
        } catch {
          // Continue without memory if fetch fails
        }

        // Build full instructions with voice personality, memory, and language
        const voicePersonality = maestro.voiceInstructions ? `\n\n## Voice Personality\n${maestro.voiceInstructions}\nIMPORTANT: While maintaining your personality, you MUST speak in ${languageNames[language]} only.\n` : '';
        const fullInstructions = languageInstruction + characterInstruction + memoryContext + maestro.systemPrompt + voicePersonality + toolInstructions + languageReminder;

        // Send session configuration - Azure GA format (2025-08-28)
        // Optimized for fluid, natural conversations with low latency
        // Recommended Azure model: gpt-realtime-mini or gpt-4o-mini-realtime-preview
        const sessionConfig = {
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions: fullInstructions,
            output_modalities: ['audio'],
            tools: maestroTools,
            // NOTE: temperature and max_response_output_tokens removed - Azure Realtime API doesn't support them
            audio: {
              input: {
                transcription: {
                  model: 'whisper-1'
                },
                format: {
                  type: 'audio/pcm',
                  rate: 24000
                },
                turn_detection: {
                  // semantic_vad: detects when user has finished speaking based on semantics
                  // More natural, less likely to interrupt mid-sentence
                  type: 'semantic_vad',
                  // Lower threshold = more sensitive to speech start (0.0-1.0)
                  threshold: 0.4,
                  // Audio before detected speech (helps capture beginning of words)
                  prefix_padding_ms: 200,
                  // Shorter silence = faster response (but may cut off slow speakers)
                  silence_duration_ms: 150,
                  // Auto-generate response when speech ends
                  create_response: true
                }
              },
              output: {
                voice: maestro.voice,
                format: {
                  type: 'audio/pcm',
                  rate: 24000
                }
              }
            }
          },
        };

        ws.send(JSON.stringify(sessionConfig));

        setConnected(true);
        setCurrentMaestro(maestro);
        setConnectionState('connected');
        options.onStateChange?.('connected');

        // Start capturing audio
        startAudioCaptureRef.current?.();

        // Trigger initial greeting from maestro (after brief delay for setup)
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Get student name from settings if available
            const studentName = typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem('convergio-settings') || '{}')?.state?.studentProfile?.name
              : null;

            // Create engaging, varied greeting prompt
            const greetingPrompts = [
              `Greet the student${studentName ? ` by name (${studentName})` : ''} warmly and introduce yourself. Be engaging and enthusiastic. Then ask what they'd like to learn today.`,
              `Welcome the student${studentName ? ` (${studentName})` : ''} with your characteristic personality. Share something interesting about your subject to spark curiosity.`,
              `Start the lesson by introducing yourself in your unique style${studentName ? ` and addressing ${studentName} personally` : ''}. Make them excited to learn!`,
            ];
            const greetingPrompt = greetingPrompts[Math.floor(Math.random() * greetingPrompts.length)];

            ws.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: greetingPrompt }],
              },
            }));
            ws.send(JSON.stringify({ type: 'response.create' }));
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleServerEventRef.current?.(data);
        } catch {
          // Silent parse failure - malformed server message
        }
      };

      ws.onerror = () => {
        // WebSocket onerror receives an Event, not an Error
        // Browser security prevents access to actual error details
        setConnectionState('error');
        options.onStateChange?.('error');
        options.onError?.(new Error('WebSocket connection failed. Check Azure endpoint and API key.'));
      };

      ws.onclose = () => {
        setConnected(false);
        if (connectionState !== 'error') {
          setConnectionState('idle');
        }
      };

      // Note: API key is handled server-side via WebSocket proxy
      // The wsUrl from server already contains necessary auth

      wsRef.current = ws;
    } catch (error) {
      setConnectionState('error');
      options.onStateChange?.('error');
      options.onError?.(error as Error);
    }
  }, [options, setConnected, setCurrentMaestro, setConnectionState, connectionState]);

  // Handle server events
  const handleServerEvent = useCallback((event: Record<string, unknown>) => {
    switch (event.type) {
      case 'proxy.ready':
        // WebSocket proxy is ready - connection to Azure established
        // Session config will be sent in ws.onopen
        break;

      case 'session.created':
      case 'session.updated':
        // Session lifecycle events - no action needed
        break;

      case 'input_audio_buffer.speech_started':
        setListening(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setListening(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && typeof event.transcript === 'string') {
          addTranscript('user', event.transcript);
          options.onTranscript?.('user', event.transcript);
        }
        break;

      // GA API uses response.output_audio.delta (was response.audio.delta in beta)
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        if (event.delta && typeof event.delta === 'string') {
          const audioData = base64ToInt16Array(event.delta);
          // Limit queue size to prevent memory issues on long sessions
          if (audioQueueRef.current.length >= AUDIO_MAX_QUEUE_SIZE) {
            // Drop oldest chunks if queue is too large
            audioQueueRef.current.splice(0, audioQueueRef.current.length - AUDIO_MAX_QUEUE_SIZE + 1);
          }
          audioQueueRef.current.push(audioData);
          // Start playback when we have enough chunks buffered (smoother audio)
          if (!isPlayingRef.current && audioQueueRef.current.length >= AUDIO_PREBUFFER_CHUNKS) {
            playNextAudioChunkRef.current?.();
          }
        }
        break;

      case 'response.output_audio.done':
      case 'response.audio.done':
        // Audio stream complete, let queue finish playing
        break;

      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        // Could show streaming text here
        break;

      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        if (event.transcript && typeof event.transcript === 'string') {
          addTranscript('assistant', event.transcript);
          options.onTranscript?.('assistant', event.transcript);
        }
        break;

      case 'response.done':
        // Response complete - no action needed
        break;

      case 'error': {
        const errorObj = event.error as { message?: string } | undefined;
        options.onError?.(new Error(errorObj?.message || 'Server error'));
        break;
      }

      // Handle function/tool calls from the AI
      case 'response.function_call_arguments.done':
        if (event.name && typeof event.name === 'string' && event.arguments && typeof event.arguments === 'string') {
          try {
            const args = JSON.parse(event.arguments);
            // IMPORTANT: Azure requires the exact call_id from the server
            // If call_id is missing, we use a local fallback (may not work with Azure)
            const callId = typeof event.call_id === 'string' ? event.call_id : `local-${crypto.randomUUID()}`;
            const toolCall = {
              id: callId,
              type: event.name as import('@/types').ToolType,
              name: event.name,
              arguments: args,
              status: 'pending' as const,
            };
            addToolCall(toolCall);

            // Special handling for webcam capture - defer to UI
            if (event.name === 'capture_homework') {
              options.onWebcamRequest?.({
                purpose: args.purpose || 'homework',
                instructions: args.instructions,
                callId: callId,
              });
              // Update tool status to pending (waiting for webcam)
              updateToolCall(toolCall.id, { status: 'pending' });
              // Don't send response yet - wait for webcam capture
              return;
            }

            // For other tools, send immediate success response
            updateToolCall(toolCall.id, { status: 'completed' });
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: callId,
                  output: JSON.stringify({ success: true, displayed: true }),
                },
              }));
              // Trigger response to continue after tool use
              wsRef.current.send(JSON.stringify({ type: 'response.create' }));
            }
          } catch {
            // Failed to parse function arguments - skip tool call
          }
        }
        break;

      default:
        // Unknown event type - ignore
        break;
    }
  }, [addTranscript, addToolCall, updateToolCall, options, setListening]);

  // Start capturing audio from microphone
  const startAudioCapture = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current) return;

    const context = audioContextRef.current;
    const source = context.createMediaStreamSource(mediaStreamRef.current);
    sourceNodeRef.current = source;

    // Connect to analyser for level visualization
    source.connect(analyserRef.current!);

    // Use ScriptProcessorNode for audio capture (more compatible than AudioWorklet)
    // Buffer size 2048 = ~43ms latency at 48kHz (vs ~85ms with 4096)
    const processor = context.createScriptProcessor(AUDIO_BUFFER_SIZE, 1, 1);
    processorRef.current = processor;

    // Resample from native rate to 24kHz
    const nativeSampleRate = context.sampleRate;
    const targetSampleRate = 24000;

    processor.onaudioprocess = (event) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      if (isMuted) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Resample to 24kHz
      const resampledData = resample(inputData, nativeSampleRate, targetSampleRate);

      // Convert to PCM16
      const int16Data = float32ToInt16(resampledData);
      const base64 = int16ArrayToBase64(int16Data);

      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64,
      }));

      // Update input level (throttled to ~30fps for performance)
      const now = performance.now();
      if (now - lastLevelUpdateRef.current > 33 && analyserRef.current) {
        lastLevelUpdateRef.current = now;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setInputLevel(average / 255);
      }
    };

    source.connect(processor);
    processor.connect(context.destination);
    setListening(true);
  }, [isMuted, setInputLevel, setListening]);

  // Play audio from queue with pre-buffering for smoother playback
  const playNextAudioChunk = useCallback(async () => {
    // Pre-buffering: wait for enough chunks before starting (smoother audio)
    if (!isPlayingRef.current && audioQueueRef.current.length < AUDIO_PREBUFFER_CHUNKS) {
      // Not enough chunks yet, wait for more
      return;
    }

    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      setSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setSpeaking(true);

    const audioData = audioQueueRef.current.shift()!;
    const float32Data = int16ToFloat32(audioData);

    // Ensure AudioContext is running (Safari may suspend it)
    const playbackContext = audioContextRef.current;
    if (playbackContext.state === 'suspended') {
      await playbackContext.resume();
    }

    // Create buffer at 24kHz - Safari handles resampling internally
    const buffer = playbackContext.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackContext.destination);

    // Schedule next chunk slightly before current one ends for gapless playback
    source.onended = () => {
      // Use requestAnimationFrame for smoother scheduling
      requestAnimationFrame(() => playNextAudioChunkRef.current?.());
    };

    // Start playback with minimal delay
    try {
      source.start(0);
    } catch {
      // Safari sometimes throws if start is called too quickly after previous end
      requestAnimationFrame(() => {
        try {
          const retrySource = playbackContext.createBufferSource();
          retrySource.buffer = buffer;
          retrySource.connect(playbackContext.destination);
          retrySource.onended = () => requestAnimationFrame(() => playNextAudioChunkRef.current?.());
          retrySource.start(0);
        } catch {
          // Retry failed - continue to next chunk
          playNextAudioChunkRef.current?.();
        }
      });
    }

    // Update output level (use cached RMS calculation)
    let sumSquares = 0;
    for (let i = 0; i < float32Data.length; i++) {
      sumSquares += float32Data[i] * float32Data[i];
    }
    const rms = Math.sqrt(sumSquares / float32Data.length);
    setOutputLevel(Math.min(rms * 5, 1));
  }, [setOutputLevel, setSpeaking]);

  // Assign callbacks to refs for use in earlier-declared callbacks
  // Using useEffect to avoid updating refs during render
  useEffect(() => {
    handleServerEventRef.current = handleServerEvent;
    startAudioCaptureRef.current = startAudioCapture;
    playNextAudioChunkRef.current = playNextAudioChunk;
  });

  // Disconnect and cleanup all resources
  const disconnect = useCallback(() => {
    // Cancel any pending animation frames
    if (levelUpdateFrameRef.current) {
      cancelAnimationFrame(levelUpdateFrameRef.current);
      levelUpdateFrameRef.current = 0;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    maestroRef.current = null;
    lastLevelUpdateRef.current = 0;
    reset();
    setConnectionState('idle');
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  // Send text message (fallback)
  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      }));
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      addTranscript('user', text);
    }
  }, [addTranscript]);

  // Cancel current response (barge-in)
  const cancelResponse = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      setSpeaking(false);
    }
  }, [setSpeaking]);

  // Send webcam capture result back to the AI with actual image
  const sendWebcamResult = useCallback((callId: string, imageData: string | null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (imageData) {
        // First, send function call output
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({
              success: true,
              image_captured: true,
            }),
          },
        }));

        // Send the image description to the AI (Realtime API doesn't support images directly)
        // We describe what we captured and ask the AI to help
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Ho appena scattato una foto del mio compito/libro. La foto è stata catturata con successo. Per favore aiutami a risolvere o capire quello che potrei aver scritto o letto. Chiedimi di descriverti cosa vedi nella foto.',
              },
            ],
          },
        }));

      } else {
        // User cancelled the webcam capture
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify({
              success: false,
              error: 'Lo studente ha annullato la cattura.',
            }),
          },
        }));
      }
      // Trigger response to continue
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

  return {
    // State
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    currentMaestro,
    transcript,
    toolCalls,
    inputLevel,
    outputLevel,
    connectionState,
    // Actions
    connect,
    disconnect,
    toggleMute,
    sendText,
    cancelResponse,
    clearTranscript,
    clearToolCalls,
    sendWebcamResult,
  };
}

// === UTILITY FUNCTIONS ===

function base64ToInt16Array(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function int16ArrayToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  return int16Array;
}

function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
  }
  return float32Array;
}

function resample(inputData: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return inputData;

  const ratio = fromRate / toRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    output[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
  }

  return output;
}
