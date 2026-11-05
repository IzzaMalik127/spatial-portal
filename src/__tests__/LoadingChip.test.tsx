import { act, render, screen } from '@testing-library/react';
import { LoadingChip } from '../components/LoadingChip';

describe('<LoadingChip />', () => {
  it('appears while tiles are loading and disappears when done', () => {
    let emit: (n: number) => void = () => {};
    const viewer = {
      scene: { globe: { tileLoadProgressEvent: { addEventListener: (cb: (n: number) => void) => ((emit = cb), () => {}) } } },
    };
    render(<LoadingChip viewer={viewer as never} />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => emit(7));
    expect(screen.getByRole('status')).toHaveTextContent('Loading map detail');
    act(() => emit(0));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
