import { render, screen } from '@testing-library/react';
import { AssetInfoPanel } from '../components/AssetInfoPanel';

describe('<AssetInfoPanel />', () => {
  it('shows a hint when nothing is selected', () => {
    render(<AssetInfoPanel asset={null} onClose={vi.fn()} />);
    expect(screen.getByText(/Click a marker/i)).toBeInTheDocument();
  });

  it('renders asset metadata and pick timing', () => {
    render(
      <AssetInfoPanel
        asset={{ id: 'BLD-101', name: 'Office Block', source: 'entity', properties: { floors: 12 }, pickMs: 4 }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Office Block')).toBeInTheDocument();
    expect(screen.getByText('floors')).toBeInTheDocument();
    expect(screen.getByText(/picked in 4 ms/)).toBeInTheDocument();
  });
});
