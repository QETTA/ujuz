// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>클릭</Button>);
    expect(screen.getByRole('button', { name: '클릭' })).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    render(<Button>기본</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-brand-500');
  });

  it('applies secondary variant', () => {
    render(<Button variant="secondary">보조</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-surface-elevated');
  });

  it('applies ghost variant', () => {
    render(<Button variant="ghost">투명</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
  });

  it('applies danger variant', () => {
    render(<Button variant="danger">위험</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-danger');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">작은</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');

    rerender(<Button size="lg">큰</Button>);
    expect(screen.getByRole('button').className).toContain('h-12');
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>클릭</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>비활성</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when loading', () => {
    render(<Button loading>로딩</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});
