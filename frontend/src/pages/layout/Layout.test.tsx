import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AppStateContext } from '../../state/AppProvider'
import Layout from './Layout'

// Mocking the Clipboard API for testing
Object.assign(global, {
  navigator: {
    clipboard: {
      writeText: jest.fn()
    }
  }
})

describe('Layout', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  const mockDispatch = jest.fn()

  const mockAppState = {
    state: {
      frontendSettings: { ui: { title: 'Test App', show_share_button: true } },
      isCosmosDBAvailable: { status: 'Configured' },
      isChatHistoryOpen: false
    },
    dispatch: mockDispatch
  }

  const renderWithContext = (mockAppState: any) => {
    render(
      <AppStateContext.Provider value={mockAppState}>
        <Router>
          <Layout />
        </Router>
      </AppStateContext.Provider>
    )
  }

  it('renders layout with correct title and share button', () => {
    renderWithContext(mockAppState)

    expect(screen.getByText('Test App')).toBeInTheDocument()

    const shareButton = screen.getByText('Share')
    expect(shareButton).toBeInTheDocument()
  })

  it('opens and closes the share dialog when the share button is clicked', async () => {
    renderWithContext(mockAppState)

    const shareButton = screen.getByText('Share')
    fireEvent.click(shareButton)

    await waitFor(() => {
      expect(screen.getByText('Share the web app')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Share the web app')).not.toBeInTheDocument()
    })
  })

  it('copies URL to clipboard when the copy button is clicked', async () => {
    const mockWriteText = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    renderWithContext(mockAppState)

    const shareButton = screen.getByText('Share')
    fireEvent.click(shareButton)

    const copyButton = screen.getByLabelText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      //expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
      expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
    })

    expect(screen.getByText('Copied URL')).toBeInTheDocument()
  })

  it('should trigger handleCopyClick when Enter key is pressed', () => {
    // Mock the clipboard function
    const mockWriteText = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    // Render the component
    renderWithContext(mockAppState)

    const shareButton = screen.getByText('Share')
    fireEvent.click(shareButton)

    // Find the copy button container
    const copyButton = screen.getByLabelText('Copy')

    // Simulate keydown event for the Enter key
    fireEvent.keyDown(copyButton, { key: 'Enter', code: 'Enter' });

    // Assert that the clipboard writeText function is called
    expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByText('Copied URL')).toBeInTheDocument();
  });

  it('should trigger handleCopyClick when Space key is pressed', () => {
    // Mock the clipboard function
    const mockWriteText = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    // Render the component
    renderWithContext(mockAppState)

    const shareButton = screen.getByText('Share')
    fireEvent.click(shareButton)

    // Find the copy button container
    const copyButton = screen.getByLabelText('Copy')

    // Simulate keydown event for the Space key
    fireEvent.keyDown(copyButton, { key: ' ', code: 'Space' });

    // Assert that the clipboard writeText function is called
    expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByText('Copied URL')).toBeInTheDocument();
  });

  it('should not trigger handleCopyClick for other keys', () => {
    // Mock the clipboard function
    const mockWriteText = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    // Render the component
    renderWithContext(mockAppState)

    const shareButton = screen.getByText('Share')
    fireEvent.click(shareButton)

    // Find the copy button container
    const copyButton = screen.getByLabelText('Copy')

    // Simulate keydown event for an unrelated key
    fireEvent.keyDown(copyButton, { key: 'Tab', code: 'Tab' });

    // Assert that the clipboard writeText function is not called
    expect(mockWriteText).not.toHaveBeenCalled();
  });

  it('toggles history visibility when history button is clicked', async () => {

    jest.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      pathname: '/generate',
    });
 
    renderWithContext(mockAppState)

    const historyButton = screen.getByText('Show template history')
    expect(historyButton).toBeInTheDocument()

    fireEvent.click(historyButton)

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_CHAT_HISTORY' })
  })

  it('resizes and adjusts button labels based on window size', () => {
    renderWithContext(mockAppState)

    expect(screen.getByText('Share')).toBeInTheDocument()

    global.innerWidth = 400
    fireEvent.resize(window)

    expect(screen.queryByText('Share')).not.toBeInTheDocument()
  })
  
  it('toggles history button visibility based on path', () => {
    renderWithContext(mockAppState)
    expect(screen.queryByText('Show template history')).not.toBeInTheDocument()
  })
})
