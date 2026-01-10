'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PLANETS } from './data/planets';
import { useSolarSystemAnimation } from './hooks/use-solar-system-animation';
import { PlanetInfoModal } from './components/planet-info-modal';

export default function ShowcaseSolarSystemPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selectedPlanet, setSelectedPlanet] = useState<typeof PLANETS[0] | null>(null);
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);

  const { time, setTime } = useSolarSystemAnimation({
    isPlaying,
    speed,
    zoom,
    hoveredPlanet,
    canvasRef,
  });

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

      <AnimatePresence>
        {selectedPlanet && (
          <PlanetInfoModal
            planet={selectedPlanet}
            onClose={() => setSelectedPlanet(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
