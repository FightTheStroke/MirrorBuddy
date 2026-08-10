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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    // reachy-mini.org resolves but never answers: the vendor site is reachymini.net.
    expect(aboutRobot).toHaveAttribute('href', expect.stringContaining('reachymini.net'));
  });

  it('sends the visitor to the vendor site in their own language', () => {
    // The test suite mocks useLocale() to 'it', and the vendor publishes /it/.
    render(<RobotSection />);

    const aboutRobot = screen.getByRole('link', {
      name: getTranslation('welcome.robot.aboutRobot'),
    });

    expect(aboutRobot).toHaveAttribute('href', 'https://reachymini.net/it/');
  });

  it('shows the robot in motion, self-hosted in two codecs', () => {
    // Hotlinking the vendor GIF would cost 6.8MB and leak visitor IPs to a
    // third party; we ship a 79KB video from our own origin instead.
    const { container } = render(<RobotSection />);

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('poster', expect.stringContaining('reachy-poster'));

    const sources = Array.from(container.querySelectorAll('video source')).map((s) =>
      s.getAttribute('type'),
    );
    expect(sources).toContain('video/webm');
    expect(sources).toContain('video/mp4');
  });

  it('never plays sound and never demands attention', () => {
    const { container } = render(<RobotSection />);

    const video = container.querySelector('video');
    // An autoplaying video with audio on a landing page is hostile, and a
    // non-muted autoplay is blocked by browsers anyway.
    expect(video).toHaveProperty('muted', true);
    expect(video).not.toHaveAttribute('controls');
  });

  it('describes the video for assistive technology', () => {
    const { container } = render(<RobotSection />);

    const video = container.querySelector('video');
    expect(video?.getAttribute('aria-label')).toBe(getTranslation('welcome.robot.videoAlt'));
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

describe('RobotSection media delivery', () => {
  /**
   * The proxy rewrites unknown paths under a locale prefix, so /robot/x.mp4
   * became a 307 to /it/robot/x.mp4 and the video silently failed to load.
   * Rendering the markup correctly is not enough: the bytes have to be
   * reachable, which depends on the proxy exempting the directory.
   */
  it('serves its media from a directory the proxy leaves alone', () => {
    const componentSource = readFileSync(
      join(process.cwd(), 'apps/web/src/app/[locale]/welcome/components/robot-section.tsx'),
      'utf-8',
    );
    const proxySource = readFileSync(join(process.cwd(), 'apps/web/src/proxy.ts'), 'utf-8');

    const assetPaths = [...componentSource.matchAll(/["'](\/[a-z0-9-]+\/[^"']+\.(?:mp4|webm|webp|png|jpg|svg))["']/gi)]
      .map((m) => m[1]);

    expect(assetPaths.length).toBeGreaterThan(0);

    const unreachable = assetPaths.filter((assetPath) => {
      const dir = `/${assetPath.split('/')[1]}`;
      return !proxySource.includes(`'${dir}'`);
    });

    expect(unreachable).toEqual([]);
  });
});
