import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// import  '@testing-library/jest-dom/extend-expect';
import TitleCard from './TitleCard';
import { AppStateContext } from '../../state/AppProvider';

const contextValue = {
    state: {
      draftedDocumentTitle: null,
      isChatHistoryOpen: false,
      chatHistoryLoadingState: 'idle',
      isCosmosDBAvailable: true,
      chatHistory: [],
    },
  };
  
const mockDispatch = jest.fn();

const renderWithContext = (contextValue : any) => {
  return render(
    <AppStateContext.Provider value={contextValue}>
      <TitleCard />
    </AppStateContext.Provider>
  );
};

describe('TitleCard', () => {
  it('renders the title and input field', () => {
    const contextValue = {
      state: {
        draftedDocumentTitle: '',
        isChatHistoryOpen: false,
        chatHistoryLoadingState: 'idle',
        isCosmosDBAvailable: true,
        chatHistory: []
      },
      dispatch: mockDispatch,
    };

    renderWithContext(contextValue);

    expect(screen.getByText('Draft Document')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('displays the correct initial title value', () => {
    const contextValue = {
      state: {
        draftedDocumentTitle: 'Initial Title',
        isChatHistoryOpen: false,
        chatHistoryLoadingState: 'idle',
        isCosmosDBAvailable: true,
        chatHistory: []
      },
      dispatch: mockDispatch,
    };

    renderWithContext(contextValue);

    expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
  });

  it('calls dispatch with the correct action on input change', () => {
    const contextValue = {
      state: {
        draftedDocumentTitle: '',
        isChatHistoryOpen: false,
        chatHistoryLoadingState: 'idle',
        isCosmosDBAvailable: true,
        chatHistory: []
      },
      dispatch: mockDispatch,
    };

    renderWithContext(contextValue);

    const input = screen.getByLabelText('Title');
    fireEvent.change(input, { target: { value: 'New Title' } });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_DRAFTED_DOCUMENT_TITLE',
      payload: 'New Title',
    });
  });

  test('renders null string when draftedDocumentTitle is an null string', () => {
    const contextValue = {
      state: {
        draftedDocumentTitle: null,
        isChatHistoryOpen: false,
        chatHistoryLoadingState: 'idle',
        isCosmosDBAvailable: true,
        chatHistory: []
      },
      dispatch: mockDispatch,
    };
 
    renderWithContext(contextValue);
 
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  })

  test('renders empty string when draftedDocumentTitle is an empty string', () => {
    const contextValue = {
      state: {
        draftedDocumentTitle: ' ',
        isChatHistoryOpen: false,
        chatHistoryLoadingState: 'idle',
        isCosmosDBAvailable: true,
        chatHistory: []
      },
      dispatch: mockDispatch,
    };
 
    renderWithContext(contextValue);
 
    expect(screen.getByDisplayValue('')).toBeInTheDocument();
  })

  it('throws an error if AppStateContext is not provided', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TitleCard />)).toThrow(
      'useAppState must be used within a AppStateProvider'
    );

    consoleError.mockRestore();
  });
});
