/* eslint-disable security/detect-non-literal-regexp -- test file uses getTranslation() helper which escapes all regex chars */
/**
 * Unit tests for RobotSection component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RobotSection } from '../robot-section';
import { getTranslation } from '@/test/i18n-helpers';

describe('RobotSection', () => {
  it('renders the section heading', () => {
    render(<RobotSection />);

    const heading = getTranslation('welcome.robot.heading');
    const highlight = getTranslation('welcome.robot.headingHighlight');
    // Match the whole heading at level 2: matching only its first word also
    // finds the capability sub-headings, which makes the assertion meaningless.
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: new RegExp(`${heading}\\s*${highlight}`, 'i'),
      }),
    ).toBeInTheDocument();
  });

  it('renders all four capabilities', () => {
    render(<RobotSection />);

    for (const key of ['eyes', 'ears', 'voice', 'movement']) {
      const label = getTranslation(`welcome.robot.senses.${key}.label`);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('states that the robot is optional', () => {
    render(<RobotSection />);

    const note = getTranslation('welcome.robot.optionalNote');
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it('links to the docs and to the robot vendor', () => {
    render(<RobotSection />);

    const learnMore = screen.getByRole('link', {
      name: getTranslation('welcome.robot.learnMore'),
    });
    const aboutRobot = screen.getByRole('link', {
      name: getTranslation('welcome.robot.aboutRobot'),
    });

    expect(learnMore).toHaveAttribute('href', expect.stringContaining('reachy-mini-robot.md'));
    expect(aboutRobot).toHaveAttribute('href', expect.stringContaining('reachy-mini.org'));
  });

  it('opens external links safely', () => {
    render(<RobotSection />);

    // rel=noopener guards against reverse tabnabbing on target=_blank
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('exposes the section to assistive technology by its heading', () => {
    render(<RobotSection />);

    const section = screen.getByRole('region');
    expect(section).toHaveAttribute('aria-labelledby', 'robot-section-heading');
  });
});
