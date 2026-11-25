import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Materials from '../Materials';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/materials?')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { id: '1', title: 'Algebra', subject: 'Math', semester: '1', uploader: { name: 'Alice' }, fileName: 'a.pdf', uploadDate: new Date().toISOString(), averageRating: 4, totalRatings: 2 },
          ],
        }),
      });
    }
    if (url.includes('/download')) {
      return Promise.resolve({ ok: true, blob: async () => new Blob(['x']) });
    }
    if (url.includes('/rate')) {
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders materials list and allows rating open', async () => {
  render(<Materials />);
  await waitFor(() => expect(screen.getByText('Algebra')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /rate algebra/i }));
  expect(screen.getByText('Rate this material')).toBeInTheDocument();
});

