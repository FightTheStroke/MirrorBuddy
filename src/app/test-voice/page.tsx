'use client';

import { useState, useRef, useEffect } from 'react';

interface LogEntry {
  time: string;
  type: 'info' | 'error' | 'send' | 'receive';
  message: string;
}

export default function TestVoicePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isRecordingRef = useRef(false);
  const levelAnimationRef = useRef<number | null>(null);

  // Audio playback for Azure responses
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const addLog = (type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString('it-IT', { hour12: false });
    setLogs(prev => [...prev, { time, type, message }].slice(-100));
  };

  // Initialize playback context
  const initPlayback = () => {
    if (!playbackContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      playbackContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      addLog('info', '🔊 Audio playback context initialized at 24kHz');
    }
  };

  // Play queued audio
  const playNextAudio = () => {
    if (!playbackContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const samples = audioQueueRef.current.shift()!;

    const buffer = playbackContextRef.current.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);

    const source = playbackContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackContextRef.current.destination);
    source.onended = () => playNextAudio();
    source.start();
  };

  // Queue audio for playback
  const queueAudio = (base64Audio: string) => {
    initPlayback();

    // Decode base64 to PCM16
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    audioQueueRef.current.push(float32);

    if (!isPlayingRef.current) {
      playNextAudio();
    }
  };

  // Test 1: Check microphone permission
  const testMicrophone = async () => {
    addLog('info', 'Testing microphone access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      addLog('info', '✅ Microphone access GRANTED');

      // Test audio context
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      mediaStreamRef.current = stream;

      // Create analyser for audio level
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      addLog('info', `✅ AudioContext created, sampleRate: ${audioContextRef.current.sampleRate}Hz`);

      // Start level monitoring using ref (state is stale in closure)
      isRecordingRef.current = true;
      setIsRecording(true);
      // Use time domain data for volume measurement (better than frequency data)
      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      const updateLevel = () => {
        if (analyserRef.current && isRecordingRef.current) {
          analyserRef.current.getByteTimeDomainData(dataArray);
          // Calculate RMS (root mean square) for volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const value = (dataArray[i] - 128) / 128; // normalize to -1 to 1
            sum += value * value;
          }
          const rms = Math.sqrt(sum / bufferLength);
          const level = Math.min(100, rms * 300); // scale to 0-100
          setAudioLevel(level);
          levelAnimationRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
      addLog('info', '🎤 Microphone level monitoring started - speak to see level bar move');

    } catch (err) {
      setMicPermission('denied');
      addLog('error', `❌ Microphone access DENIED: ${err}`);
    }
  };

  const stopMicrophoneTest = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    if (levelAnimationRef.current) {
      cancelAnimationFrame(levelAnimationRef.current);
      levelAnimationRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
    addLog('info', '🎤 Microphone test stopped');
  };

  // Test 2: Connect to WebSocket proxy
  const testWebSocket = async () => {
    addLog('info', 'Connecting to WebSocket proxy on port 3001...');
    setStatus('connecting');

    try {
      const host = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${host}:3001?maestroId=test-debug`;
      addLog('send', `Connecting to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        addLog('info', '✅ WebSocket OPEN - Proxy connected');
        setStatus('connected');
      };

      ws.onmessage = async (event) => {
        try {
          // Handle both string and blob data
          let msgText: string;
          if (event.data instanceof Blob) {
            msgText = await event.data.text();
          } else if (typeof event.data === 'string') {
            msgText = event.data;
          } else {
            addLog('receive', `[binary] ${event.data?.length || 'unknown'} bytes`);
            return;
          }

          const data = JSON.parse(msgText);
          addLog('receive', `[${data.type}] ${JSON.stringify(data).substring(0, 300)}`);

          if (data.type === 'proxy.ready') {
            addLog('info', '✅ Proxy ready - Azure connection established');
          }
          if (data.type === 'session.created') {
            addLog('info', '✅ Session created by Azure');
          }
          if (data.type === 'session.updated') {
            addLog('info', '✅ Session config accepted by Azure');
          }
          if (data.type === 'error') {
            addLog('error', `❌ Azure error: ${JSON.stringify(data.error)}`);
          }
          // Handle audio output from Azure
          if (data.type === 'response.output_audio.delta' && data.delta) {
            queueAudio(data.delta);
          }
          // Handle transcript
          if (data.type === 'response.output_audio_transcript.delta' && data.delta) {
            addLog('info', `🗣️ AI: ${data.delta}`);
          }
          if (data.type === 'response.done') {
            addLog('info', '✅ Response complete');
          }
          // Handle speech detected
          if (data.type === 'input_audio_buffer.speech_started') {
            addLog('info', '🎤 Speech detected!');
          }
          if (data.type === 'input_audio_buffer.speech_stopped') {
            addLog('info', '🎤 Speech ended, processing...');
          }
        } catch (e) {
          addLog('receive', `[parse error] ${e} - raw: ${String(event.data).substring(0, 100)}`);
        }
      };

      ws.onerror = (err) => {
        addLog('error', `❌ WebSocket error: ${err}`);
        setStatus('error');
      };

      ws.onclose = (event) => {
        addLog('info', `WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);
        setStatus('idle');
      };

    } catch (err) {
      addLog('error', `❌ Failed to connect: ${err}`);
      setStatus('error');
    }
  };

  // Test 3: Send session.update with different formats
  const sendSessionUpdate = (format: 'nested' | 'flat' | 'minimal') => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('error', '❌ WebSocket not connected');
      return;
    }

    let config;
    if (format === 'nested') {
      // Azure GA nested format (from Swift app)
      config = {
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: 'You are a helpful assistant. Respond in Italian.',
          output_modalities: ['audio'],
          audio: {
            input: {
              transcription: { model: 'whisper-1' },
              format: { type: 'audio/pcm', rate: 24000 },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 200,
                create_response: true
              }
            },
            output: {
              voice: 'alloy',
              format: { type: 'audio/pcm', rate: 24000 }
            }
          }
        }
      };
    } else if (format === 'flat') {
      // OpenAI standard flat format
      config = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'You are a helpful assistant. Respond in Italian.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        }
      };
    } else {
      // Minimal Azure GA format - VERIFIED WORKING via websocat
      // Requirements: session.type is REQUIRED, voice must be in audio.output
      config = {
        type: 'session.update',
        session: {
          type: 'realtime',  // REQUIRED by Azure GA
          instructions: 'You are a helpful assistant. Respond in Italian.',
          audio: {
            output: { voice: 'alloy' }  // voice goes here, not top-level
          }
        }
      };
    }

    addLog('send', `Sending ${format} session.update: ${JSON.stringify(config).substring(0, 300)}...`);
    wsRef.current.send(JSON.stringify(config));
  };

  // Test 4: Send a text message to trigger response
  const sendTestMessage = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('error', '❌ WebSocket not connected');
      return;
    }

    const msg = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Ciao! Dimmi qualcosa in italiano.' }]
      }
    };
    addLog('send', `Sending message: ${JSON.stringify(msg)}`);
    wsRef.current.send(JSON.stringify(msg));

    // Trigger response
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const resp = { type: 'response.create' };
        addLog('send', 'Sending response.create');
        wsRef.current.send(JSON.stringify(resp));
      }
    }, 100);
  };

  // Test 5: Send audio data
  const startSendingAudio = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('error', '❌ WebSocket not connected');
      return;
    }
    if (!audioContextRef.current || !mediaStreamRef.current) {
      addLog('error', '❌ Microphone not initialized');
      return;
    }

    addLog('info', 'Starting audio capture and sending...');

    const inputSampleRate = audioContextRef.current.sampleRate; // Usually 48000
    const targetSampleRate = 24000; // Azure requires 24kHz
    const resampleRatio = inputSampleRate / targetSampleRate;

    addLog('info', `Resampling from ${inputSampleRate}Hz to ${targetSampleRate}Hz (ratio: ${resampleRatio})`);

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    let audioChunkCount = 0;
    processorRef.current.onaudioprocess = (e) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Resample from inputSampleRate to 24kHz
      const outputLength = Math.floor(inputData.length / resampleRatio);
      const pcm16 = new Int16Array(outputLength);

      for (let i = 0; i < outputLength; i++) {
        // Linear interpolation for resampling
        const srcIndex = i * resampleRatio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
        const fraction = srcIndex - srcIndexFloor;

        const sample = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
        pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(sample * 32768)));
      }

      // Convert to base64
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
      }));

      audioChunkCount++;
      if (audioChunkCount % 10 === 0) {
        addLog('send', `Sent ${audioChunkCount} audio chunks (resampled to 24kHz)`);
      }
    };

    source.connect(processorRef.current);
    processorRef.current.connect(audioContextRef.current.destination);

    addLog('info', '🎤 Audio streaming started at 24kHz - speak now!');
  };

  const stopSendingAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
      addLog('info', '🎤 Audio streaming stopped');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopSendingAudio();
    // Clear audio queue and stop playback
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setStatus('idle');
    addLog('info', 'Disconnected');
  };

  // Test speakers with a beep
  const testSpeakers = () => {
    addLog('info', 'Testing speakers with a beep...');
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
        addLog('info', '✅ Speaker test complete - did you hear a beep?');
      }, 500);
    } catch (err) {
      addLog('error', `❌ Speaker test failed: ${err}`);
    }
  };

  // Test TTS with browser speech synthesis
  const testBrowserTTS = () => {
    addLog('info', 'Testing browser TTS...');
    if (!('speechSynthesis' in window)) {
      addLog('error', '❌ Browser TTS not supported');
      return;
    }

    const utterance = new SpeechSynthesisUtterance('Ciao! Questo è un test del sistema audio.');
    utterance.lang = 'it-IT';
    utterance.onend = () => addLog('info', '✅ Browser TTS complete');
    utterance.onerror = (e) => addLog('error', `❌ Browser TTS error: ${e.error}`);
    speechSynthesis.speak(utterance);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (levelAnimationRef.current) {
        cancelAnimationFrame(levelAnimationRef.current);
      }
      disconnect();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (playbackContextRef.current) {
        playbackContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">🔧 Voice Debug Test Page</h1>

      {/* Status */}
      <div className="mb-4 p-4 bg-gray-800 rounded">
        <div className="flex gap-4 items-center">
          <span>WebSocket: </span>
          <span className={`px-2 py-1 rounded ${
            status === 'connected' ? 'bg-green-600' :
            status === 'connecting' ? 'bg-yellow-600' :
            status === 'error' ? 'bg-red-600' : 'bg-gray-600'
          }`}>{status}</span>

          <span>Mic: </span>
          <span className={`px-2 py-1 rounded ${
            micPermission === 'granted' ? 'bg-green-600' :
            micPermission === 'denied' ? 'bg-red-600' : 'bg-gray-600'
          }`}>{micPermission}</span>

          {isRecording && (
            <div className="flex items-center gap-2">
              <span>Level:</span>
              <div className="w-32 h-4 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, audioLevel)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audio Tests */}
      <div className="mb-4 p-4 bg-gray-800 rounded">
        <h2 className="font-bold mb-2">🔊 Audio Hardware Tests</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={testSpeakers}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
          >
            Test Speakers (Beep)
          </button>
          <button
            onClick={testBrowserTTS}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
          >
            Test Browser TTS
          </button>
          <button
            onClick={testMicrophone}
            disabled={isRecording}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            Test Microphone
          </button>
          <button
            onClick={stopMicrophoneTest}
            disabled={!isRecording}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded disabled:opacity-50"
          >
            Stop Mic Test
          </button>
        </div>
      </div>

      {/* WebSocket Tests */}
      <div className="mb-4 p-4 bg-gray-800 rounded">
        <h2 className="font-bold mb-2">🌐 WebSocket + Azure Tests</h2>
        <div className="flex flex-wrap gap-2">
        <button
          onClick={testWebSocket}
          disabled={status === 'connecting'}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
        >
          Connect WebSocket
        </button>

        <button
          onClick={() => sendSessionUpdate('minimal')}
          disabled={status !== 'connected'}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
        >
          3. Session (Minimal)
        </button>

        <button
          onClick={() => sendSessionUpdate('flat')}
          disabled={status !== 'connected'}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded disabled:opacity-50"
        >
          3b. Session (Flat)
        </button>

        <button
          onClick={() => sendSessionUpdate('nested')}
          disabled={status !== 'connected'}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded disabled:opacity-50"
        >
          3c. Session (Nested)
        </button>

        <button
          onClick={sendTestMessage}
          disabled={status !== 'connected'}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
        >
          4. Send Test Message
        </button>

        <button
          onClick={startSendingAudio}
          disabled={status !== 'connected' || micPermission !== 'granted'}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
        >
          5. Start Audio Stream
        </button>

        <button
          onClick={stopSendingAudio}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
        >
          Stop Audio
        </button>

        <button
          onClick={disconnect}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
        >
          Disconnect
        </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-black rounded p-4 h-96 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500">Click the buttons above to start testing...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'send' ? 'text-yellow-400' :
              log.type === 'receive' ? 'text-green-400' :
              'text-gray-300'
            }`}>
              <span className="text-gray-500">[{log.time}]</span> {log.message}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-gray-800 rounded text-sm">
        <h2 className="font-bold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Test Microphone" - should show GRANTED and audio level bar</li>
          <li>Click "Connect WebSocket" - should connect to proxy on port 3001</li>
          <li>Try "Session (Nested)" or "Session (Flat)" - see which one Azure accepts</li>
          <li>Click "Send Test Message" - should trigger AI response</li>
          <li>Click "Start Audio Stream" - speak and see if audio is sent</li>
        </ol>
        <p className="mt-2 text-gray-400">Watch the logs for errors. Green = received from Azure, Yellow = sent to Azure</p>
      </div>
    </div>
  );
}
