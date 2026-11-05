import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeocoderSearch } from '../components/GeocoderSearch';
import { searchPlaces } from '../services/api';
import { flyToBounds } from '../utils/camera';

vi.mock('../utils/camera', () => ({ flyToLocation: vi.fn(), flyToBounds: vi.fn() })); // keeps Cesium out of the unit test
vi.mock('../services/api', () => ({
  searchPlaces: vi.fn().mockResolvedValue([{ id: 1, label: 'Karachi Division, Sindh, Pakistan', lat: 24.86, lon: 67.0, bbox: [24.7, 25.2, 66.8, 67.5] }]),
}));

describe('<GeocoderSearch />', () => {
  it('shows suggestions, and does not reopen them after one is chosen', async () => {
    render(<GeocoderSearch viewer={{} as never} />);
    fireEvent.change(screen.getByLabelText('Search places'), { target: { value: 'Karachi' } });
    await userEvent.click(await screen.findByRole('button', { name: /Karachi Division/ }));
    await new Promise((r) => setTimeout(r, 700)); // longer than the 350 ms debounce
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(vi.mocked(searchPlaces)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(flyToBounds)).toHaveBeenCalledWith({}, 24.7, 25.2, 66.8, 67.5); // whole-area view
  });
});
