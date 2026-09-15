import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { useGoogleDrive } from '../use-google-drive';
import { GooglePickerButton } from '../google-picker-button';

const picker = vi.hoisted(() => ({ openPicker: vi.fn() }));
vi.mock('../use-google-picker', () => ({
  useGooglePicker: () => ({ ...picker, isLoading: false, isReady: true, error: null }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ isConnected: false })));
  vi.stubGlobal('location', {
    ...window.location,
    origin: 'https://school.example:8443',
    pathname: '/fr/study-kit',
    search: '',
    assign: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Google OAuth document navigation', () => {
  function expectOAuthRedirect() {
    expect(window.location.assign).toHaveBeenCalledOnce();
    const destination = new URL(vi.mocked(window.location.assign).mock.calls[0][0].toString());
    expect(destination.origin).toBe('https://school.example:8443');
    expect(destination.pathname).toBe('/api/auth/google');
    expect(destination.searchParams.get('userId')).toBe('account&one');
    expect(destination.searchParams.get('returnUrl')).toBe('/fr/study-kit');
    expect(picker.openPicker).not.toHaveBeenCalled();
  }

  it('connect loads the OAuth handler as a document, preserving the return path', async () => {
    const { result } = renderHook(() => useGoogleDrive({ userId: 'account&one' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.connect());
    expectOAuthRedirect();
  });

  it('the disconnected picker uses the same OAuth flow', async () => {
    render(<GooglePickerButton userId="account&one" onFileSelect={vi.fn()} />);
    const button = screen.getByRole('button');
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expectOAuthRedirect();
  });

  it('the connected picker opens in place without document navigation', async () => {
    vi.mocked(fetch).mockImplementation(async (url) =>
      Response.json(
        String(url).includes('/status')
          ? { isConnected: true }
          : { files: [{ id: 'file' }], breadcrumbs: [], hasMore: false },
      ),
    );
    render(<GooglePickerButton userId="account" onFileSelect={vi.fn()} />);
    const button = screen.getByRole('button');
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(picker.openPicker).toHaveBeenCalledOnce();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
