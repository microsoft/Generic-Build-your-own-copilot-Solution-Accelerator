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
    renderWithContext(mockAppState)

    const shareButton = screen.getByText('Share')
    fireEvent.click(shareButton)

    const copyButton = screen.getByLabelText('Copy')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
    })

    expect(screen.getByText('Copied URL')).toBeInTheDocument()
  })

  it('toggles history visibility when history button is clicked', async () => {
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
  it('shows the share button', () => {
    renderWithContext(mockAppState)
    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('opens share panel when share button is clicked', () => {
    renderWithContext(mockAppState)
    fireEvent.click(screen.getByText('Share'))
    expect(screen.getByText('Share the web app')).toBeInTheDocument()
  })

  it('copies URL to clipboard when copy button is clicked', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn()
      }
    })

    renderWithContext(mockAppState)
    fireEvent.click(screen.getByText('Share'))
    fireEvent.click(screen.getByRole('button', { name: /copy/i }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href)
    expect(screen.getByText('Copied URL')).toBeInTheDocument()
  })

  it('closes the share panel when dismissed', () => {
    renderWithContext(mockAppState)
    fireEvent.click(screen.getByText('Share'))
    fireEvent.click(screen.getByLabelText('Close'))

    expect(screen.queryByText('Share the web app')).not.toBeInTheDocument()
  })

  it('toggles history button visibility based on path', () => {
    renderWithContext(mockAppState)
    expect(screen.queryByText('Show template history')).not.toBeInTheDocument()
  })
})
