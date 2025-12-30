'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ZoomIn, ZoomOut, Info, X, RotateCcw, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

// Planet data with realistic colors and orbital info
const PLANETS = [
  {
    id: 'sun',
    name: 'Sole',
    nameIt: 'Sole',
    color: '#FDB813',
    radius: 40,
    orbitRadius: 0,
    orbitPeriod: 0,
    description: 'La nostra stella, centro del sistema solare. Contiene il 99.86% di tutta la massa del sistema.',
    facts: ['Temperatura: 5.778 K', 'Diametro: 1.391.000 km', 'Eta: 4.6 miliardi di anni'],
    glow: true,
  },
  {
    id: 'mercury',
    name: 'Mercury',
    nameIt: 'Mercurio',
    color: '#B5B5B5',
    radius: 6,
    orbitRadius: 70,
    orbitPeriod: 88,
    description: 'Il pianeta piu vicino al Sole e il piu piccolo del sistema solare.',
    facts: ['Periodo orbitale: 88 giorni', 'Temperatura: -180 a 430 C', 'Nessun satellite'],
  },
  {
    id: 'venus',
    name: 'Venus',
    nameIt: 'Venere',
    color: '#E6C229',
    radius: 10,
    orbitRadius: 100,
    orbitPeriod: 225,
    description: 'Chiamato "stella del mattino", ha una densa atmosfera di anidride carbonica.',
    facts: ['Periodo orbitale: 225 giorni', 'Temperatura: 465 C', 'Ruota al contrario'],
  },
  {
    id: 'earth',
    name: 'Earth',
    nameIt: 'Terra',
    color: '#4B8BBE',
    radius: 11,
    orbitRadius: 140,
    orbitPeriod: 365,
    description: 'Il nostro pianeta, lunico conosciuto a ospitare la vita.',
    facts: ['Periodo orbitale: 365 giorni', 'Temperatura media: 15 C', '1 satellite: Luna'],
  },
  {
    id: 'mars',
    name: 'Mars',
    nameIt: 'Marte',
    color: '#C1440E',
    radius: 8,
    orbitRadius: 180,
    orbitPeriod: 687,
    description: 'Il pianeta rosso, obiettivo delle future esplorazioni umane.',
    facts: ['Periodo orbitale: 687 giorni', 'Temperatura: -60 C', '2 satelliti: Phobos e Deimos'],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    nameIt: 'Giove',
    color: '#C99039',
    radius: 28,
    orbitRadius: 260,
    orbitPeriod: 4333,
    description: 'Il gigante gassoso, il pianeta piu grande del sistema solare.',
    facts: ['Periodo orbitale: 12 anni', 'Grande Macchia Rossa', '95 satelliti conosciuti'],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    nameIt: 'Saturno',
    color: '#E4D191',
    radius: 24,
    orbitRadius: 340,
    orbitPeriod: 10759,
    description: 'Famoso per i suoi magnifici anelli di ghiaccio e roccia.',
    facts: ['Periodo orbitale: 29 anni', 'Anelli larghi 282.000 km', '146 satelliti conosciuti'],
    hasRings: true,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    nameIt: 'Urano',
    color: '#B5E3E3',
    radius: 16,
    orbitRadius: 420,
    orbitPeriod: 30687,
    description: 'Un gigante di ghiaccio che ruota su un fianco.',
    facts: ['Periodo orbitale: 84 anni', 'Asse inclinato di 98 gradi', '28 satelliti conosciuti'],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    nameIt: 'Nettuno',
    color: '#4B70DD',
    radius: 15,
    orbitRadius: 480,
    orbitPeriod: 60190,
    description: 'Il pianeta piu lontano, con i venti piu veloci del sistema solare.',
    facts: ['Periodo orbitale: 165 anni', 'Venti fino a 2.100 km/h', '16 satelliti conosciuti'],
  },
];

// Star field for background
const STARS = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  opacity: Math.random() * 0.5 + 0.5,
  twinkleSpeed: Math.random() * 2 + 1,
}));

export default function ShowcaseSolarSystemPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<typeof PLANETS[0] | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [time, setTime] = useState(0);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = 0;
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      if (isPlaying) {
        setTime(prev => prev + deltaTime * 0.001 * speed);
      }

      // Clear canvas
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 1100 * zoom;

      // Draw stars (twinkling)
      STARS.forEach(star => {
        const twinkle = Math.sin(currentTime * 0.001 * star.twinkleSpeed) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.beginPath();
        ctx.arc(
          (star.x / 100) * canvas.width,
          (star.y / 100) * canvas.height,
          star.size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });

      // Draw orbits
      PLANETS.slice(1).forEach(planet => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 10]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, planet.orbitRadius * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw planets
      PLANETS.forEach(planet => {
        let x = centerX;
        let y = centerY;

        if (planet.orbitRadius > 0) {
          const angle = (time / planet.orbitPeriod) * Math.PI * 2;
          x = centerX + Math.cos(angle) * planet.orbitRadius * scale;
          y = centerY + Math.sin(angle) * planet.orbitRadius * scale;
        }

        // Glow effect for sun
        if (planet.glow) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, planet.radius * scale * 2);
          gradient.addColorStop(0, 'rgba(253, 184, 19, 0.8)');
          gradient.addColorStop(0.4, 'rgba(253, 184, 19, 0.3)');
          gradient.addColorStop(1, 'rgba(253, 184, 19, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, planet.radius * scale * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Planet
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(x, y, planet.radius * scale, 0, Math.PI * 2);
        ctx.fill();

        // Saturn's rings
        if (planet.hasRings) {
          ctx.strokeStyle = 'rgba(228, 209, 145, 0.6)';
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.ellipse(x, y, planet.radius * scale * 1.8, planet.radius * scale * 0.4, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Hover effect
        if (hoveredPlanet === planet.id) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, planet.radius * scale + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Planet name label
        if (planet.id !== 'sun' && zoom > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(planet.nameIt, x, y + planet.radius * scale + 18);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, zoom, hoveredPlanet, time]);

  // Handle canvas click to select planet
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 1100 * zoom;

    // Check if clicked on a planet
    for (const planet of PLANETS) {
      let planetX = centerX;
      let planetY = centerY;

      if (planet.orbitRadius > 0) {
        const angle = (time / planet.orbitPeriod) * Math.PI * 2;
        planetX = centerX + Math.cos(angle) * planet.orbitRadius * scale;
        planetY = centerY + Math.sin(angle) * planet.orbitRadius * scale;
      }

      const distance = Math.sqrt((x - planetX) ** 2 + (y - planetY) ** 2);
      if (distance < planet.radius * scale + 10) {
        setSelectedPlanet(planet);
        return;
      }
    }
  }, [zoom, time]);

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 1100 * zoom;

    let found = false;
    for (const planet of PLANETS) {
      let planetX = centerX;
      let planetY = centerY;

      if (planet.orbitRadius > 0) {
        const angle = (time / planet.orbitPeriod) * Math.PI * 2;
        planetX = centerX + Math.cos(angle) * planet.orbitRadius * scale;
        planetY = centerY + Math.sin(angle) * planet.orbitRadius * scale;
      }

      const distance = Math.sqrt((x - planetX) ** 2 + (y - planetY) ** 2);
      if (distance < planet.radius * scale + 10) {
        setHoveredPlanet(planet.id);
        canvas.style.cursor = 'pointer';
        found = true;
        break;
      }
    }

    if (!found) {
      setHoveredPlanet(null);
      canvas.style.cursor = 'default';
    }
  }, [zoom, time]);

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            Sistema Solare
          </h1>
          <p className="text-white/60 mt-1">Esplora i pianeti del nostro sistema</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setTime(0); setZoom(1); }}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-4 mb-4 bg-white/5 rounded-lg p-3">
        <span className="text-sm text-white/60 w-20">Velocita:</span>
        <Slider
          value={[speed]}
          onValueChange={(values: number[]) => setSpeed(values[0])}
          min={0.1}
          max={5}
          step={0.1}
          className="flex-1"
        />
        <span className="text-sm text-white font-mono w-16">{speed.toFixed(1)}x</span>
      </div>

      {/* Canvas container */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="w-full h-full"
        />

        {/* Planet quick select */}
        <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap max-w-md">
          {PLANETS.slice(1).map(planet => (
            <button
              key={planet.id}
              onClick={() => setSelectedPlanet(planet)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: `${planet.color}30`,
                borderColor: planet.color,
                borderWidth: 1,
                color: planet.color,
              }}
            >
              {planet.nameIt}
            </button>
          ))}
        </div>

        {/* Hint */}
        <div className="absolute top-4 right-4 text-white/40 text-xs">
          Clicca su un pianeta per saperne di piu
        </div>
      </div>

      {/* Planet info modal */}
      <AnimatePresence>
        {selectedPlanet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedPlanet(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <Card className="bg-slate-900/90 border-white/20 w-[400px] max-w-[90vw]">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-full"
                        style={{
                          backgroundColor: selectedPlanet.color,
                          boxShadow: selectedPlanet.glow
                            ? `0 0 30px ${selectedPlanet.color}`
                            : 'none',
                        }}
                      />
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {selectedPlanet.nameIt}
                        </h2>
                        <p className="text-white/60 text-sm">{selectedPlanet.name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedPlanet(null)}
                      className="text-white/60 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <p className="text-white/80 mb-4">{selectedPlanet.description}</p>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
                      Fatti interessanti
                    </h3>
                    <ul className="space-y-1">
                      {selectedPlanet.facts.map((fact, i) => (
                        <li key={i} className="text-white/70 text-sm flex items-center gap-2">
                          <Info className="w-3 h-3 text-purple-400" />
                          {fact}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10">
                    <p className="text-xs text-purple-300">
                      In modalita completa, i Maestri potrebbero spiegarti molto di piu su ogni pianeta!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
