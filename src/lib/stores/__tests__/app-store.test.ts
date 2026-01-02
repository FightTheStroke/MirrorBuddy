/**
 * Tests for app-store focus mode functionality
 * @module stores/app-store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../app-store';

describe('app-store', () => {
  describe('useUIStore - Focus Mode', () => {
    beforeEach(() => {
      // Reset store to initial state
      useUIStore.setState({
        sidebarOpen: true,
        settingsOpen: false,
        currentView: 'maestri',
        focusMode: false,
        focusTool: null,
        focusToolType: null,
        focusMaestroId: null,
        focusInteractionMode: 'chat',
      });
    });

    describe('initial state', () => {
      it('has focusMode disabled by default', () => {
        const state = useUIStore.getState();
        expect(state.focusMode).toBe(false);
      });

      it('has focusInteractionMode set to chat by default', () => {
        const state = useUIStore.getState();
        expect(state.focusInteractionMode).toBe('chat');
      });

      it('has null focus tool and type initially', () => {
        const state = useUIStore.getState();
        expect(state.focusTool).toBeNull();
        expect(state.focusToolType).toBeNull();
        expect(state.focusMaestroId).toBeNull();
      });
    });

    describe('enterFocusMode', () => {
      it('enables focus mode with tool type', () => {
        const { enterFocusMode } = useUIStore.getState();
        enterFocusMode('mindmap');

        const state = useUIStore.getState();
        expect(state.focusMode).toBe(true);
        expect(state.focusToolType).toBe('mindmap');
      });

      it('sets maestro ID when provided', () => {
        const { enterFocusMode } = useUIStore.getState();
        enterFocusMode('quiz', 'euclide-matematica');

        const state = useUIStore.getState();
        expect(state.focusMaestroId).toBe('euclide-matematica');
      });

      it('defaults to chat interaction mode', () => {
        const { enterFocusMode } = useUIStore.getState();
        enterFocusMode('flashcard');

        const state = useUIStore.getState();
        expect(state.focusInteractionMode).toBe('chat');
      });

      it('sets voice interaction mode when specified', () => {
        const { enterFocusMode } = useUIStore.getState();
        enterFocusMode('mindmap', 'euclide-matematica', 'voice');

        const state = useUIStore.getState();
        expect(state.focusInteractionMode).toBe('voice');
      });

      it('sets chat interaction mode when specified', () => {
        const { enterFocusMode } = useUIStore.getState();
        enterFocusMode('summary', undefined, 'chat');

        const state = useUIStore.getState();
        expect(state.focusInteractionMode).toBe('chat');
      });

      it('clears focus tool when entering', () => {
        useUIStore.setState({ focusTool: { type: 'quiz', data: {} } as never });

        const { enterFocusMode } = useUIStore.getState();
        enterFocusMode('mindmap');

        const state = useUIStore.getState();
        expect(state.focusTool).toBeNull();
      });
    });

    describe('setFocusTool', () => {
      it('sets the focus tool', () => {
        const { setFocusTool } = useUIStore.getState();
        const tool = { type: 'mindmap' as const, data: { title: 'Test' } };

        setFocusTool(tool as never);

        const state = useUIStore.getState();
        expect(state.focusTool).toEqual(tool);
      });

      it('can clear the focus tool', () => {
        useUIStore.setState({ focusTool: { type: 'quiz', data: {} } as never });

        const { setFocusTool } = useUIStore.getState();
        setFocusTool(null);

        const state = useUIStore.getState();
        expect(state.focusTool).toBeNull();
      });
    });

    describe('exitFocusMode', () => {
      it('disables focus mode', () => {
        useUIStore.setState({ focusMode: true });

        const { exitFocusMode } = useUIStore.getState();
        exitFocusMode();

        const state = useUIStore.getState();
        expect(state.focusMode).toBe(false);
      });

      it('clears focus tool', () => {
        useUIStore.setState({
          focusMode: true,
          focusTool: { type: 'quiz', data: {} } as never,
        });

        const { exitFocusMode } = useUIStore.getState();
        exitFocusMode();

        const state = useUIStore.getState();
        expect(state.focusTool).toBeNull();
      });

      it('clears focus tool type', () => {
        useUIStore.setState({
          focusMode: true,
          focusToolType: 'mindmap',
        });

        const { exitFocusMode } = useUIStore.getState();
        exitFocusMode();

        const state = useUIStore.getState();
        expect(state.focusToolType).toBeNull();
      });

      it('clears maestro ID', () => {
        useUIStore.setState({
          focusMode: true,
          focusMaestroId: 'euclide-matematica',
        });

        const { exitFocusMode } = useUIStore.getState();
        exitFocusMode();

        const state = useUIStore.getState();
        expect(state.focusMaestroId).toBeNull();
      });

      it('resets interaction mode to chat', () => {
        useUIStore.setState({
          focusMode: true,
          focusInteractionMode: 'voice',
        });

        const { exitFocusMode } = useUIStore.getState();
        exitFocusMode();

        const state = useUIStore.getState();
        expect(state.focusInteractionMode).toBe('chat');
      });

      it('resets all focus state in one call', () => {
        useUIStore.setState({
          focusMode: true,
          focusTool: { type: 'quiz', data: {} } as never,
          focusToolType: 'quiz',
          focusMaestroId: 'euclide-matematica',
          focusInteractionMode: 'voice',
        });

        const { exitFocusMode } = useUIStore.getState();
        exitFocusMode();

        const state = useUIStore.getState();
        expect(state).toMatchObject({
          focusMode: false,
          focusTool: null,
          focusToolType: null,
          focusMaestroId: null,
          focusInteractionMode: 'chat',
        });
      });
    });

    describe('UI state interactions', () => {
      it('toggles sidebar', () => {
        const { toggleSidebar } = useUIStore.getState();

        expect(useUIStore.getState().sidebarOpen).toBe(true);
        toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(false);
        toggleSidebar();
        expect(useUIStore.getState().sidebarOpen).toBe(true);
      });

      it('sets sidebar open state directly', () => {
        const { setSidebarOpen } = useUIStore.getState();

        setSidebarOpen(false);
        expect(useUIStore.getState().sidebarOpen).toBe(false);
        setSidebarOpen(true);
        expect(useUIStore.getState().sidebarOpen).toBe(true);
      });

      it('toggles settings', () => {
        const { toggleSettings } = useUIStore.getState();

        expect(useUIStore.getState().settingsOpen).toBe(false);
        toggleSettings();
        expect(useUIStore.getState().settingsOpen).toBe(true);
        toggleSettings();
        expect(useUIStore.getState().settingsOpen).toBe(false);
      });

      it('sets current view', () => {
        const { setCurrentView } = useUIStore.getState();

        setCurrentView('chat');
        expect(useUIStore.getState().currentView).toBe('chat');

        setCurrentView('voice');
        expect(useUIStore.getState().currentView).toBe('voice');

        setCurrentView('flashcards');
        expect(useUIStore.getState().currentView).toBe('flashcards');
      });
    });
  });
});
