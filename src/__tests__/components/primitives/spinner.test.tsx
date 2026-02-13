import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '@/components/primitives/Spinner';

describe('Spinner', () => {
  it('keeps backward-compatible defaults', () => {
    render(<Spinner />);
    const status = screen.getByRole('status', { name: 'Loading' });
    const svg = status.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-6', 'w-6', 'text-brand-500', 'animate-spin', 'ease-linear');
  });

  it('applies size and color variants', () => {
    render(<Spinner size="lg" color="muted" srLabel="불러오는 중" className="custom-class" />);
    const status = screen.getByRole('status', { name: '불러오는 중' });
    const svg = status.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-8', 'w-8', 'text-text-tertiary', 'custom-class');
  });

  it('renders an optional label below the spinner', () => {
    render(<Spinner color="white" srLabel="로딩 상태" label="잠시만 기다려 주세요" />);
    const status = screen.getByRole('status', { name: '로딩 상태' });

    expect(within(status).getByText('잠시만 기다려 주세요')).toHaveClass('text-white');
    expect(within(status).getByText('로딩 상태')).toHaveClass('sr-only');
  });
});
