// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '@/components/ui/card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>카드 내용</Card>);
    expect(screen.getByText('카드 내용')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    const { container } = render(<Card>기본</Card>);
    expect(container.firstChild).toHaveClass('bg-surface');
  });

  it('applies glass variant', () => {
    const { container } = render(<Card variant="glass">글래스</Card>);
    expect(container.firstChild).toHaveClass('glass');
  });

  it('applies elevated variant', () => {
    const { container } = render(<Card variant="elevated">엘리베이트</Card>);
    expect(container.firstChild).toHaveClass('bg-surface-elevated');
  });

  it('accepts additional className', () => {
    const { container } = render(<Card className="custom-class">커스텀</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
