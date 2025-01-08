import { render, screen, waitFor } from '@testing-library/react';
import { useParams } from 'react-router-dom';
import Document from './Document';
import { documentRead } from '../../api/api';

// Mock the documentRead API call
jest.mock('../../api/api', () => ({
  documentRead: jest.fn(),
}));

// Mock useParams hook
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
}));

describe('Document Component', () => {
  const mockDocumentData = {
    content: 'Sample content',
    full_content: 'This is the full content of the document.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    render(<Document />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders document content when fetched successfully', async () => {
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    (documentRead as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockDocumentData),
    });

    render(<Document />);

    await waitFor(() => {
      expect(screen.getByText(mockDocumentData.full_content)).toBeInTheDocument();
    });
  });

  test('renders error message when document is not found', async () => {
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    (documentRead as jest.Mock).mockRejectedValue(new Error('Document not found'));

    render(<Document />);

    await waitFor(() => {
      expect(screen.getByText(/document not found/i)).toBeInTheDocument();
    });
  });

  test('does not fetch document if id is not provided', () => {
    (useParams as jest.Mock).mockReturnValue({ id: undefined });
    render(<Document />);
    
    expect(documentRead).not.toHaveBeenCalled();
  });
});