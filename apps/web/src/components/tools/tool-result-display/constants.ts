/**
 * Tool Result Display Constants
 * Icons and display names for tool types
 */

import { Code, BarChart2, GitBranch, Calculator, HelpCircle, Layers, Network, FileText, Play } from 'lucide-react';
import React from 'react';

export const toolIcons: Record<string, React.ReactNode> = {
  // Function names (from API)
  run_code: React.createElement(Code, { className: 'w-4 h-4' }),
  create_chart: React.createElement(BarChart2, { className: 'w-4 h-4' }),
  create_diagram: React.createElement(GitBranch, { className: 'w-4 h-4' }),
  show_formula: React.createElement(Calculator, { className: 'w-4 h-4' }),
  create_visualization: React.createElement(BarChart2, { className: 'w-4 h-4' }),
  create_quiz: React.createElement(HelpCircle, { className: 'w-4 h-4' }),
  create_flashcard: React.createElement(Layers, { className: 'w-4 h-4' }),
  create_flashcards: React.createElement(Layers, { className: 'w-4 h-4' }),
  create_mindmap: React.createElement(Network, { className: 'w-4 h-4' }),
  create_summary: React.createElement(FileText, { className: 'w-4 h-4' }),
  create_demo: React.createElement(Play, { className: 'w-4 h-4' }),
  create_timeline: React.createElement(FileText, { className: 'w-4 h-4' }),
  web_search: React.createElement(FileText, { className: 'w-4 h-4' }),
  // Tool types (mapped)
  chart: React.createElement(BarChart2, { className: 'w-4 h-4' }),
  diagram: React.createElement(GitBranch, { className: 'w-4 h-4' }),
  formula: React.createElement(Calculator, { className: 'w-4 h-4' }),
  quiz: React.createElement(HelpCircle, { className: 'w-4 h-4' }),
  flashcard: React.createElement(Layers, { className: 'w-4 h-4' }),
  mindmap: React.createElement(Network, { className: 'w-4 h-4' }),
  summary: React.createElement(FileText, { className: 'w-4 h-4' }),
  demo: React.createElement(Play, { className: 'w-4 h-4' }),
  timeline: React.createElement(FileText, { className: 'w-4 h-4' }),
  search: React.createElement(FileText, { className: 'w-4 h-4' }),
};

export const toolNames: Record<string, string> = {
  // Function names (from API)
  run_code: 'Code Execution',
  create_chart: 'Chart',
  create_diagram: 'Diagram',
  show_formula: 'Formula',
  create_visualization: 'Visualization',
  create_quiz: 'Quiz',
  create_flashcard: 'Flashcard',
  create_flashcards: 'Flashcard',
  create_mindmap: 'Mind Map',
  create_summary: 'Summary',
  create_demo: 'Demo',
  create_timeline: 'Timeline',
  web_search: 'Search',
  // Tool types (mapped)
  chart: 'Chart',
  diagram: 'Diagram',
  formula: 'Formula',
  quiz: 'Quiz',
  flashcard: 'Flashcard',
  mindmap: 'Mind Map',
  summary: 'Summary',
  demo: 'Demo',
  timeline: 'Timeline',
  search: 'Search',
};
