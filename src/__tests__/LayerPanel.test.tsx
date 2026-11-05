import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerPanel } from '../components/LayerPanel';
import { initialState } from '../store/appStore';

describe('<LayerPanel />', () => {
  it('dispatches toggleLayer when a checkbox is clicked', async () => {
    const dispatch = vi.fn();
    render(<LayerPanel layers={initialState.layers} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Street map/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleLayer', id: 'osm' });
  });

  it('shows an error message for a failed layer', () => {
    const layers = initialState.layers.map((l) =>
      l.id === 'assets' ? { ...l, status: 'error' as const, error: 'Request failed (500)' } : l,
    );
    render(<LayerPanel layers={layers} dispatch={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed (500)');
  });

  it('shows an opacity slider with a sensible default for an enabled map layer', () => {
    const layers = initialState.layers.map((l) => (l.id === 'osm' ? { ...l, enabled: true } : l));
    render(<LayerPanel layers={layers} dispatch={vi.fn()} />);
    const slider = screen.getByRole('slider', { name: /Street map opacity/i });
    expect(Number((slider as HTMLInputElement).value)).toBeCloseTo(0.5);
  });
});
