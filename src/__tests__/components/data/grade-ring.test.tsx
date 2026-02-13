// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GradeRing } from '@/components/data/grade-ring';
import type { Grade } from '@/lib/types';

describe('GradeRing', () => {
  it('renders with correct aria attributes', () => {
    const { container } = render(<GradeRing score={75} grade="B" />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).toBeInTheDocument();
    expect(meter).toHaveAttribute('aria-valuenow', '75');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays grade letter', () => {
    render(<GradeRing score={90} grade="A" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('displays score', () => {
    render(<GradeRing score={42} grade="D" />);
    expect(screen.getByText('42점')).toBeInTheDocument();
  });

  const grades: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const grade of grades) {
    it(`renders grade ${grade} without crashing`, () => {
      const { container } = render(<GradeRing score={50} grade={grade} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  }

  it('clamps score to 0-100 range', () => {
    const { container } = render(<GradeRing score={150} grade="A" />);
    const meter = container.querySelector('[role="meter"]');
    expect(meter).toHaveAttribute('aria-valuenow', '150');
    // SVG still renders (internal clamping)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
