// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from '@/components/ai/chat-input';

describe('ChatInput', () => {
  it('renders input and send button', () => {
    render(<ChatInput onSend={vi.fn()} />);
    expect(screen.getByLabelText('메시지 입력')).toBeInTheDocument();
    expect(screen.getByLabelText('전송')).toBeInTheDocument();
  });

  it('calls onSend with trimmed text', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByLabelText('메시지 입력');
    fireEvent.change(input, { target: { value: '  테스트 메시지  ' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSend).toHaveBeenCalledWith('테스트 메시지');
  });

  it('clears input after send', () => {
    render(<ChatInput onSend={vi.fn()} />);

    const input = screen.getByLabelText('메시지 입력') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '안녕' } });
    fireEvent.submit(input.closest('form')!);

    expect(input.value).toBe('');
  });

  it('does not send empty message', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByLabelText('메시지 입력');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('renders suggestion chips', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} suggestions={['입소 확률', '대기 현황']} />);

    expect(screen.getByText('입소 확률')).toBeInTheDocument();
    expect(screen.getByText('대기 현황')).toBeInTheDocument();
  });

  it('sends suggestion text on chip click', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} suggestions={['입소 확률']} />);

    fireEvent.click(screen.getByText('입소 확률'));
    expect(onSend).toHaveBeenCalledWith('입소 확률');
  });

  it('disables input when disabled prop is set', () => {
    render(<ChatInput onSend={vi.fn()} disabled />);
    expect(screen.getByLabelText('메시지 입력')).toBeDisabled();
  });
});
