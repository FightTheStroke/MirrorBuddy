/**
 * Planet data for Solar System showcase
 */

export interface Planet {
  id: string;
  name: string;
  nameIt: string;
  color: string;
  radius: number;
  orbitRadius: number;
  orbitPeriod: number;
  description: string;
  facts: string[];
  glow?: boolean;
  hasRings?: boolean;
}

export const PLANETS: Planet[] = [
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
export const STARS = Array.from({ length: 200 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  opacity: Math.random() * 0.5 + 0.5,
  twinkleSpeed: Math.random() * 2 + 1,
}));
