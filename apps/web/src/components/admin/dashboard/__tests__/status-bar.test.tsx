/**
 * StatusBar Component Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../status-bar';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('StatusBar', () => {
  it('renders skeleton when loading (null props)', () => {
    render(<StatusBar healthStatus={null} safetyUnresolved={null} dailyCostEur={null} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders 3 pills with healthy status (green)', () => {
    render(<StatusBar healthStatus="healthy" safetyUnresolved={0} dailyCostEur={1.5} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByLabelText('statusBar.system: healthy')).toBeInTheDocument();
  });

  it('renders amber pill for degraded health', () => {
    render(<StatusBar healthStatus="degraded" safetyUnresolved={0} dailyCostEur={1.0} />);
    expect(screen.getByLabelText('statusBar.system: degraded')).toBeInTheDocument();
  });

  it('renders red pill for down health', () => {
    render(<StatusBar healthStatus="down" safetyUnresolved={0} dailyCostEur={1.0} />);
    expect(screen.getByLabelText('statusBar.system: down')).toBeInTheDocument();
  });

  it('renders amber pill for safetyUnresolved=2', () => {
    render(<StatusBar healthStatus="healthy" safetyUnresolved={2} dailyCostEur={1.0} />);
    expect(screen.getByLabelText('statusBar.safety: 2')).toBeInTheDocument();
  });

  it('renders cost with euro formatting', () => {
    render(<StatusBar healthStatus="healthy" safetyUnresolved={0} dailyCostEur={3.75} />);
    expect(screen.getByLabelText('statusBar.costs: €3.75')).toBeInTheDocument();
  });
});
