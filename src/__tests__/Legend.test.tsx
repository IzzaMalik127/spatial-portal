import { render, screen } from '@testing-library/react';
import { Legend } from '../components/Legend';

describe('<Legend />', () => {
  it('explains every asset status colour', () => {
    render(<Legend />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('Under maintenance')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });
});
