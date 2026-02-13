// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '@/components/ui/badge';
import type { Grade } from '@/lib/types';

describe('Badge', () => {
  it('renders status variant by default', () => {
    render(<Badge>활성</Badge>);
    const badge = screen.getByText('활성');
    expect(badge.className).toContain('bg-brand-100');
  });

  it('renders count variant', () => {
    render(<Badge variant="count">5</Badge>);
    const badge = screen.getByText('5');
    expect(badge.className).toContain('bg-danger');
  });

  const gradeColors: Record<Grade, string> = {
    A: 'bg-grade-a',
    B: 'bg-grade-b',
    C: 'bg-grade-c',
    D: 'bg-grade-d',
    E: 'bg-grade-e',
    F: 'bg-grade-f',
  };

  for (const [grade, colorClass] of Object.entries(gradeColors)) {
    it(`renders grade ${grade} with correct color`, () => {
      render(<Badge variant="grade" grade={grade as Grade} />);
      const badge = screen.getByText(grade);
      expect(badge.className).toContain(colorClass);
      expect(badge).toHaveAttribute('aria-label', `등급 ${grade}`);
    });
  }
});
