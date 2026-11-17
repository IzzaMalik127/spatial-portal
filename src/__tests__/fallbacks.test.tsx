import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GestureHint } from '../components/GestureHint';
import { LayerPanel } from '../components/LayerPanel';
import { OfflineBanner } from '../components/OfflineBanner';
import { TokenNotice } from '../components/TokenNotice';
import { getDeviceInfo } from '../config';
import { AppProvider, initialState, useApp } from '../store/appStore';
import { pickInitialQuality } from '../utils/quality';

const stubMedia = (matching: string[]) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: matching.includes(q), addEventListener() {}, removeEventListener() {} }));

afterEach(() => vi.unstubAllGlobals());

describe('no Cesium token: a clean fallback instead of red errors', () => {
  it('switches the two token-only layers off with a "needs token" note', () => {
    render(<LayerPanel layers={initialState.layers} dispatch={vi.fn()} hasIonToken={false} />);
    for (const name of [/Digital Elevation Model/i, /3D Tileset/i]) {
      expect(screen.getByRole('checkbox', { name })).toBeDisabled();
    }
    expect(screen.getAllByText('needs token')).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps every free layer usable without a token', () => {
    render(<LayerPanel layers={initialState.layers} dispatch={vi.fn()} hasIonToken={false} />);
    for (const name of [/satellite/i, /Street map/i, /WMS/i, /Infrastructure assets/i, /drone/i]) {
      expect(screen.getByRole('checkbox', { name })).toBeEnabled();
    }
  });

  it('enables the token layers when a token exists', () => {
    render(<LayerPanel layers={initialState.layers} dispatch={vi.fn()} hasIonToken />);
    expect(screen.getByRole('checkbox', { name: /Digital Elevation Model/i })).toBeEnabled();
    expect(screen.queryByText('needs token')).toBeNull();
  });

  it('explains how to add a token, and disappears once one is set', () => {
    const { rerender } = render(<TokenNotice hasIonToken={false} />);
    expect(screen.getByRole('note')).toHaveTextContent('VITE_CESIUM_ION_TOKEN');
    rerender(<TokenNotice hasIonToken />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('offline mode', () => {
  it('shows a banner while offline and hides it when the connection returns', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByRole('status')).toHaveTextContent('offline');
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('touch and mobile behaviour', () => {
  it('the sidebar starts closed on a phone-sized screen, open on a desktop', () => {
    const open = () => renderHook(() => useApp(), { wrapper: AppProvider }).result.current.state.sidebarOpen;
    stubMedia(['(max-width: 768px)']);
    expect(open()).toBe(false);
    stubMedia([]);
    expect(open()).toBe(true);
  });

  it('detects a touch-first device (coarse pointer), not a laptop with an optional touch screen', () => {
    stubMedia(['(pointer: coarse)']);
    expect(getDeviceInfo().touch).toBe(true);
    stubMedia([]);
    expect(getDeviceInfo().touch).toBe(false);
  });

  it('phones and weak computers start on the light preset; good computers start balanced', () => {
    expect(pickInitialQuality({ smallScreen: true, touch: true })).toBe('low');
    expect(pickInitialQuality({ smallScreen: false, touch: true })).toBe('low');
    expect(pickInitialQuality({ smallScreen: false, touch: false, memoryGb: 2 })).toBe('low');
    expect(pickInitialQuality({ smallScreen: false, touch: false, cores: 2 })).toBe('low');
    expect(pickInitialQuality({ smallScreen: false, touch: false, memoryGb: 8, cores: 4 })).toBe('balanced');
  });

  it('shows the gesture hint only on touch screens, and hides it after a tap', async () => {
    const { unmount } = render(<GestureHint show={false} />);
    expect(screen.queryByRole('note')).toBeNull();
    unmount();
    render(<GestureHint show />);
    expect(screen.getByRole('note')).toHaveTextContent('Pinch to zoom');
    await userEvent.click(screen.getByRole('note'));
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('hides the gesture hint by itself after a few seconds', () => {
    vi.useFakeTimers();
    render(<GestureHint show seconds={5} />);
    expect(screen.getByRole('note')).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(5100));
    expect(screen.queryByRole('note')).toBeNull();
    vi.useRealTimers();
  });
});
