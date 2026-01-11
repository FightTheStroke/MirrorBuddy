'use client';

import { motion } from 'framer-motion';

interface AuraRingsProps {
  isVoiceActive: boolean;
  isConnected: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  outputLevel: number;
  inputLevel: number;
}

/**
 * Animated aura rings for maestro avatar
 * Displays three concentric animated rings when voice is active
 */
export function AuraRings({
  isVoiceActive,
  isConnected,
  isSpeaking,
  isMuted,
  outputLevel,
  inputLevel,
}: AuraRingsProps) {
  if (!isVoiceActive || !isConnected) return null;

  // Calculate aura intensity based on voice activity
  const getAuraIntensity = () => {
    if (isSpeaking) return outputLevel;
    if (!isMuted) return inputLevel;
    return 0.1;
  };

  const auraIntensity = getAuraIntensity();

  return (
    <>
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-white/30"
        animate={{
          scale: isSpeaking ? [1, 1.15 + auraIntensity * 0.1, 1] : [1, 1.08, 1],
          opacity: [0.2, 0.4 + auraIntensity * 0.3, 0.2],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 0.8 : 2,
          ease: 'easeInOut',
        }}
        style={{
          width: '100px',
          height: '100px',
          margin: '-10px',
        }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-white/40"
        animate={{
          scale: isSpeaking ? [1, 1.12 + auraIntensity * 0.08, 1] : [1, 1.06, 1],
          opacity: [0.3, 0.5 + auraIntensity * 0.4, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 0.7 : 1.8,
          ease: 'easeInOut',
        }}
        style={{
          width: '90px',
          height: '90px',
          margin: '-5px',
        }}
      />
      {/* Inner ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-white/50"
        animate={{
          scale: isSpeaking ? [1, 1.08 + auraIntensity * 0.06, 1] : [1, 1.04, 1],
          opacity: [0.4, 0.6 + auraIntensity * 0.3, 0.4],
        }}
        transition={{
          repeat: Infinity,
          duration: isSpeaking ? 0.6 : 1.5,
          ease: 'easeInOut',
        }}
        style={{
          width: '85px',
          height: '85px',
          margin: '-2.5px',
        }}
      />
    </>
  );
}
