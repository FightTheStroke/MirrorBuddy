/**
 * I18n-aware greeting templates for maestri
 *
 * This module provides locale-aware greeting templates that integrate with
 * the next-intl message system. Templates are stored in messages/{locale}.json
 * under the "maestri" namespace.
 */

import type { Locale } from "@/i18n/config";

/**
 * Maestro greeting templates organized by locale
 * These are fallback templates when message files are not available
 */
export const MAESTRI_GREETING_TEMPLATES: Record<
  Locale,
  {
    generic: string;
    formal: string;
    coach: string;
    // Specific maestri with personalized greetings
    maestri: {
      leonardo?: string;
      galileo?: string;
      curie?: string;
      cicerone?: string;
      lovelace?: string;
      smith?: string;
      shakespeare?: string;
      humboldt?: string;
      erodoto?: string;
      manzoni?: string;
      euclide?: string;
      mozart?: string;
      socrate?: string;
      ippocrate?: string;
      feynman?: string;
      darwin?: string;
      chris?: string;
      omero?: string;
      alexPina?: string;
      mascetti?: string;
      simone?: string;
      cassese?: string;
    };
  }
> = {
  it: {
    generic: "Ciao! Sono {name}. Come posso aiutarti oggi?",
    formal: "Buongiorno! Sono {name}. Come posso esserLe utile oggi?",
    coach: "Ciao! Sono {name}. Come posso aiutarti a imparare qualcosa di nuovo oggi?",
    maestri: {
      leonardo: "Salve! Sono Leonardo da Vinci. Esploriamo insieme l'arte e la scienza?",
      galileo: "Buongiorno! Sono Galileo Galilei. Pronti a esplorare i cieli e le leggi della natura?",
      curie: "Bonjour! Sono Marie Curie. Scopriamo insieme i segreti della chimica?",
      cicerone: "Salve! Sono Marco Tullio Cicerone. Parliamo di diritti e doveri civici?",
      lovelace: "Good day! Sono Ada Lovelace. Esploriamo il mondo dell'informatica?",
      smith: "Good day! Sono Adam Smith. Parliamo di economia e società?",
      shakespeare: "Good morrow! Sono Shakespeare. Parliamo insieme di inglese?",
      humboldt: "Guten Tag! Sono Alexander von Humboldt. Esploriamo il mondo insieme?",
      erodoto: "Χαῖρε! Sono Erodoto. Viaggiamo insieme attraverso la storia?",
      manzoni: "Buongiorno! Sono Alessandro Manzoni. Esploriamo la bellezza della lingua italiana?",
      euclide: "Χαῖρε! Sono Euclide. Costruiamo insieme le basi della matematica?",
      mozart: "Guten Tag! Sono Wolfgang Amadeus Mozart. Scopriamo la magia della musica?",
      socrate: "Χαῖρε! Sono Socrate. Filosofiamo insieme?",
      ippocrate: "Χαῖρε! Sono Ippocrate. Parliamo di salute e benessere?",
      feynman: "Hi! Sono Richard Feynman. Scopriamo la fisica in modo divertente?",
      darwin: "Good day! Sono Charles Darwin. Esploriamo l'evoluzione della vita?",
      chris: "Ciao! Sono Chris. Muoviamoci insieme per stare in forma?",
      omero: "Χαῖρε! Sono Omero. Raccontiamo storie epiche insieme?",
      alexPina: "¡Hola! Sono Álex Pina. Pronti per un po' di spagnolo?",
      mascetti: "Tarapìa tapiòco! Sono il Conte Mascetti. Come se fosse antani...",
      simone: "Ciao! Sono Simone. Parliamo di sport e movimento?",
      cassese: "Buongiorno! Sono Antonio Cassese. Esploriamo il diritto internazionale?",
    },
  },
  en: {
    generic: "Hi! I'm {name}. How can I help you today?",
    formal: "Good day! I am {name}. How may I assist you today?",
    coach: "Hi! I'm {name}. How can I help you learn something new today?",
    maestri: {
      leonardo: "Greetings! I'm Leonardo da Vinci. Shall we explore art and science together?",
      galileo: "Good day! I'm Galileo Galilei. Ready to explore the skies and the laws of nature?",
      curie: "Bonjour! I'm Marie Curie. Let's discover the secrets of chemistry together?",
      cicerone: "Salve! I'm Marcus Tullius Cicero. Shall we discuss civic rights and duties?",
      lovelace: "Good day! I'm Ada Lovelace. Let's explore the world of computer science?",
      smith: "Good day! I'm Adam Smith. Shall we discuss economics and society?",
      shakespeare: "Good morrow! I'm Shakespeare. Shall we explore English together?",
      humboldt: "Guten Tag! I'm Alexander von Humboldt. Let's explore the world together?",
      erodoto: "Χαῖρε! I'm Herodotus. Shall we journey through history?",
      manzoni: "Good day! I'm Alessandro Manzoni. Let's explore the beauty of Italian?",
      euclide: "Χαῖρε! I'm Euclid. Let's build mathematical foundations together?",
      mozart: "Guten Tag! I'm Wolfgang Amadeus Mozart. Shall we discover the magic of music?",
      socrate: "Χαῖρε! I'm Socrates. Shall we philosophize together?",
      ippocrate: "Χαῖρε! I'm Hippocrates. Let's talk about health and wellness?",
      feynman: "Hi! I'm Richard Feynman. Let's discover physics in a fun way?",
      darwin: "Good day! I'm Charles Darwin. Shall we explore the evolution of life?",
      chris: "Hi! I'm Chris. Let's move together to stay fit?",
      omero: "Χαῖρε! I'm Homer. Shall we tell epic stories together?",
      alexPina: "¡Hola! I'm Álex Pina. Ready for some Spanish?",
      mascetti: "Tarapìa tapiòco! I'm Count Mascetti. As if it were antani...",
      simone: "Hi! I'm Simone. Shall we talk about sports and movement?",
      cassese: "Good day! I'm Antonio Cassese. Let's explore international law?",
    },
  },
  es: {
    generic: "¡Hola! Soy {name}. ¿Cómo puedo ayudarte hoy?",
    formal: "¡Buenos días! Soy {name}. ¿En qué puedo servirle hoy?",
    coach: "¡Hola! Soy {name}. ¿Cómo puedo ayudarte a aprender algo nuevo hoy?",
    maestri: {
      leonardo: "¡Saludos! Soy Leonardo da Vinci. ¿Exploramos juntos el arte y la ciencia?",
      galileo: "¡Buenos días! Soy Galileo Galilei. ¿Listos para explorar los cielos y las leyes de la naturaleza?",
      curie: "Bonjour! Soy Marie Curie. ¿Descubrimos juntos los secretos de la química?",
      cicerone: "Salve! Soy Marco Tulio Cicerón. ¿Hablamos de derechos y deberes cívicos?",
      lovelace: "Good day! Soy Ada Lovelace. ¿Exploramos el mundo de la informática?",
      smith: "Good day! Soy Adam Smith. ¿Hablamos de economía y sociedad?",
      shakespeare: "Good morrow! Soy Shakespeare. ¿Hablamos de inglés juntos?",
      humboldt: "Guten Tag! Soy Alexander von Humboldt. ¿Exploramos el mundo juntos?",
      erodoto: "Χαῖρε! Soy Heródoto. ¿Viajamos juntos a través de la historia?",
      manzoni: "¡Buenos días! Soy Alessandro Manzoni. ¿Exploramos la belleza del italiano?",
      euclide: "Χαῖρε! Soy Euclides. ¿Construimos juntos las bases de las matemáticas?",
      mozart: "Guten Tag! Soy Wolfgang Amadeus Mozart. ¿Descubrimos la magia de la música?",
      socrate: "Χαῖρε! Soy Sócrates. ¿Filosofamos juntos?",
      ippocrate: "Χαῖρε! Soy Hipócrates. ¿Hablamos de salud y bienestar?",
      feynman: "Hi! Soy Richard Feynman. ¿Descubrimos la física de forma divertida?",
      darwin: "Good day! Soy Charles Darwin. ¿Exploramos la evolución de la vida?",
      chris: "¡Hola! Soy Chris. ¿Nos movemos juntos para estar en forma?",
      omero: "Χαῖρε! Soy Homero. ¿Contamos historias épicas juntos?",
      alexPina: "¡Hola! Soy Álex Pina. ¿Listos para aprender español?",
      mascetti: "Tarapìa tapiòco! Soy el Conde Mascetti. Como si fuera antani...",
      simone: "¡Hola! Soy Simone. ¿Hablamos de deportes y movimiento?",
      cassese: "¡Buenos días! Soy Antonio Cassese. ¿Exploramos el derecho internacional?",
    },
  },
  fr: {
    generic: "Bonjour! Je suis {name}. Comment puis-je t'aider aujourd'hui?",
    formal: "Bonjour! Je suis {name}. Comment puis-je vous aider aujourd'hui?",
    coach: "Bonjour! Je suis {name}. Comment puis-je t'aider à apprendre aujourd'hui?",
    maestri: {
      leonardo: "Salutations! Je suis Léonard de Vinci. Explorons ensemble l'art et la science?",
      galileo: "Bonjour! Je suis Galilée. Prêts à explorer les cieux et les lois de la nature?",
      curie: "Bonjour! Je suis Marie Curie. Découvrons ensemble les secrets de la chimie?",
      cicerone: "Salve! Je suis Marcus Tullius Cicéron. Parlons des droits et devoirs civiques?",
      lovelace: "Good day! Je suis Ada Lovelace. Explorons le monde de l'informatique?",
      smith: "Good day! Je suis Adam Smith. Parlons d'économie et de société?",
      shakespeare: "Good morrow! Je suis Shakespeare. Parlons anglais ensemble?",
      humboldt: "Guten Tag! Je suis Alexander von Humboldt. Explorons le monde ensemble?",
      erodoto: "Χαῖρε! Je suis Hérodote. Voyageons ensemble à travers l'histoire?",
      manzoni: "Bonjour! Je suis Alessandro Manzoni. Explorons la beauté de l'italien?",
      euclide: "Χαῖρε! Je suis Euclide. Construisons ensemble les bases des mathématiques?",
      mozart: "Guten Tag! Je suis Wolfgang Amadeus Mozart. Découvrons la magie de la musique?",
      socrate: "Χαῖρε! Je suis Socrate. Philosophons ensemble?",
      ippocrate: "Χαῖρε! Je suis Hippocrate. Parlons de santé et de bien-être?",
      feynman: "Hi! Je suis Richard Feynman. Découvrons la physique de manière amusante?",
      darwin: "Good day! Je suis Charles Darwin. Explorons l'évolution de la vie?",
      chris: "Bonjour! Je suis Chris. Bougeons ensemble pour rester en forme?",
      omero: "Χαῖρε! Je suis Homère. Racontons des histoires épiques ensemble?",
      alexPina: "¡Hola! Je suis Álex Pina. Prêt pour un peu d'espagnol?",
      mascetti: "Tarapìa tapiòco! Je suis le Comte Mascetti. Comme si c'était antani...",
      simone: "Bonjour! Je suis Simone. Parlons de sport et de mouvement?",
      cassese: "Bonjour! Je suis Antonio Cassese. Explorons le droit international?",
    },
  },
  de: {
    generic: "Hallo! Ich bin {name}. Wie kann ich dir heute helfen?",
    formal: "Guten Tag! Ich bin {name}. Wie kann ich Ihnen heute helfen?",
    coach: "Hallo! Ich bin {name}. Wie kann ich dir heute beim Lernen helfen?",
    maestri: {
      leonardo: "Grüße! Ich bin Leonardo da Vinci. Erforschen wir zusammen Kunst und Wissenschaft?",
      galileo: "Guten Tag! Ich bin Galileo Galilei. Bereit, den Himmel und die Naturgesetze zu erforschen?",
      curie: "Bonjour! Ich bin Marie Curie. Entdecken wir zusammen die Geheimnisse der Chemie?",
      cicerone: "Salve! Ich bin Marcus Tullius Cicero. Sprechen wir über Bürgerrechte und -pflichten?",
      lovelace: "Good day! Ich bin Ada Lovelace. Erforschen wir die Welt der Informatik?",
      smith: "Good day! Ich bin Adam Smith. Sprechen wir über Wirtschaft und Gesellschaft?",
      shakespeare: "Good morrow! Ich bin Shakespeare. Lernen wir zusammen Englisch?",
      humboldt: "Guten Tag! Ich bin Alexander von Humboldt. Erforschen wir die Welt zusammen?",
      erodoto: "Χαῖρε! Ich bin Herodot. Reisen wir zusammen durch die Geschichte?",
      manzoni: "Guten Tag! Ich bin Alessandro Manzoni. Erforschen wir die Schönheit des Italienischen?",
      euclide: "Χαῖρε! Ich bin Euklid. Bauen wir zusammen die Grundlagen der Mathematik?",
      mozart: "Guten Tag! Ich bin Wolfgang Amadeus Mozart. Entdecken wir die Magie der Musik?",
      socrate: "Χαῖρε! Ich bin Sokrates. Philosophieren wir zusammen?",
      ippocrate: "Χαῖρε! Ich bin Hippokrates. Sprechen wir über Gesundheit und Wohlbefinden?",
      feynman: "Hi! Ich bin Richard Feynman. Entdecken wir Physik auf unterhaltsame Weise?",
      darwin: "Good day! Ich bin Charles Darwin. Erforschen wir die Evolution des Lebens?",
      chris: "Hallo! Ich bin Chris. Bewegen wir uns zusammen, um fit zu bleiben?",
      omero: "Χαῖρε! Ich bin Homer. Erzählen wir zusammen epische Geschichten?",
      alexPina: "¡Hola! Ich bin Álex Pina. Bereit für Spanisch?",
      mascetti: "Tarapìa tapiòco! Ich bin Graf Mascetti. Als wäre es antani...",
      simone: "Hallo! Ich bin Simone. Sprechen wir über Sport und Bewegung?",
      cassese: "Guten Tag! Ich bin Antonio Cassese. Erforschen wir das Völkerrecht?",
    },
  },
};

/**
 * Get a greeting template for a specific maestro
 * Returns personalized template if available, otherwise generic/formal template
 *
 * @param maestroKey - The normalized maestro key (e.g., "euclide", "shakespeare")
 * @param locale - The user's preferred locale (i18n)
 * @param isFormal - Whether to use formal address (Lei/Sie/Vous)
 * @param usePersonalized - Whether to prefer personalized greetings over generic templates
 */
export function getMaestroGreetingTemplate(
  maestroKey: string,
  locale: Locale,
  isFormal: boolean = false,
  usePersonalized: boolean = false,
): string {
  const templates = MAESTRI_GREETING_TEMPLATES[locale] || MAESTRI_GREETING_TEMPLATES.it;

  // If personalized greetings are preferred and available, use them
  if (usePersonalized && maestroKey) {
    const maestroGreeting = templates.maestri[maestroKey as keyof typeof templates.maestri];
    if (maestroGreeting) {
      return maestroGreeting;
    }
  }

  // Fallback to generic or formal template (respects formality)
  return isFormal ? templates.formal : templates.generic;
}

/**
 * Get a coach greeting template
 */
export function getCoachGreetingTemplate(locale: Locale): string {
  const templates = MAESTRI_GREETING_TEMPLATES[locale] || MAESTRI_GREETING_TEMPLATES.it;
  return templates.coach;
}

/**
 * Apply template variables to a greeting string
 * Uses string split/join for safety (avoids dynamic RegExp)
 */
export function applyTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    template,
  );
}

/**
 * Normalize maestro ID to key for template lookup
 * Example: "euclide-matematica" -> "euclide"
 */
export function normalizeMaestroKey(maestroId: string): string {
  return maestroId.toLowerCase().split("-")[0];
}
