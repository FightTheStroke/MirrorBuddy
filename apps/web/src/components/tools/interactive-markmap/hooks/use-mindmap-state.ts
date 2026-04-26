/**
 * State management hook for Interactive MarkMap
 *
 * Manages nodes state, history, and undo functionality
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { MindmapNode } from '../types';
import { cloneNodes, markdownToNodes } from '../helpers';

export interface UseMindmapStateProps {
  initialMarkdown?: string;
  initialNodes?: MindmapNode[];
  onNodesChange?: (nodes: MindmapNode[]) => void;
}

export function useMindmapState({
  initialMarkdown,
  initialNodes,
  onNodesChange,
}: UseMindmapStateProps) {
  // Internal node state for modifications
  const [nodes, setNodesState] = useState<MindmapNode[]>(() => {
    if (initialNodes && initialNodes.length > 0) {
      return cloneNodes(initialNodes);
    }
    if (initialMarkdown) {
      return markdownToNodes(initialMarkdown);
    }
    return [];
  });

  // Undo history (keep last 20 states)
  const [history, setHistory] = useState<MindmapNode[][]>([]);

  // Save state for undo
  const saveToHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-20), cloneNodes(nodes)]);
  }, [nodes]);

  // Update nodes and notify parent
  const updateNodes = useCallback(
    (newNodes: MindmapNode[]) => {
      saveToHistory();
      setNodesState(newNodes);
      onNodesChange?.(newNodes);
    },
    [saveToHistory, onNodesChange]
  );

  // Undo last modification
  const undo = useCallback((): boolean => {
    if (history.length === 0) return false;
    const prevState = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setNodesState(prevState);
    onNodesChange?.(prevState);
    logger.info('[InteractiveMarkmap] Undo performed');
    return true;
  }, [history, onNodesChange]);

  // Set nodes externally
  const setNodes = useCallback(
    (newNodes: MindmapNode[]) => {
      saveToHistory();
      setNodesState(cloneNodes(newNodes));
      onNodesChange?.(newNodes);
    },
    [saveToHistory, onNodesChange]
  );

  // Get current nodes (cloned for immutability)
  const getNodes = useCallback(() => cloneNodes(nodes), [nodes]);

  return {
    nodes,
    history,
    updateNodes,
    undo,
    setNodes,
    getNodes,
  };
}
