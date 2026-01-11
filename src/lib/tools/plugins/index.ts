/**
 * Tool Plugins - Plugin Registration
 * Central registry for all tool plugins in the system
 * Plugins integrated with maestro tool system and voice interaction
 */

import { ToolRegistry } from '../plugin/registry';
import { quizPlugin } from './quiz-plugin';
import { demoPlugin } from './demo-plugin';
import { flashcardPlugin } from './flashcard-plugin';
import { mindmapPlugin } from './mindmap-plugin';
import { summaryPlugin } from './summary-plugin';
import { diagramPlugin } from './diagram-plugin';
import { timelinePlugin } from './timeline-plugin';
import { searchPlugin } from './search-plugin';
import { archivePlugin } from './archive-plugin';

/**
 * Register all available tool plugins with the registry
 * Called during app initialization to populate the plugin system
 * Each plugin follows ToolPlugin interface with voice support
 *
 * @param registry - The ToolRegistry instance to register plugins with
 */
/**
 * Export all plugins for testing and direct access
 */
export {
  demoPlugin,
  quizPlugin,
  flashcardPlugin,
  mindmapPlugin,
  summaryPlugin,
  diagramPlugin,
  timelinePlugin,
  searchPlugin,
  archivePlugin,
};

export function registerAllPlugins(registry: ToolRegistry): void {
  // Educational tools - Interactive visualizations
  registry.register(demoPlugin);

  // Assessment tools
  registry.register(quizPlugin);

  // Creation tools - Content generation
  registry.register(flashcardPlugin);
  registry.register(mindmapPlugin);
  registry.register(summaryPlugin);
  registry.register(diagramPlugin);
  registry.register(timelinePlugin);

  // Utility tools - Search and navigation
  registry.register(searchPlugin);
  registry.register(archivePlugin);
}

export default registerAllPlugins;
