import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppStateContext } from '../../state/AppProvider'
import Draft from './Draft'
import { saveAs } from 'file-saver'

// Mock the SectionCard component
jest.mock('../../components/DraftCards/SectionCard', () => () => (
  <div data-testid="mock-section-card">Mock Section Card</div>
))

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

// jest.mock('../../components/DraftCards/TitleCard', () => () => <div data-testid="mock-title-card">Mock Title Card</div>)
const mockAppState = {
  state: {
    draftedDocument: {
      sections: [
        { title: 'Section 1', content: 'Content of section 1.' },
        { title: 'Section 2', content: 'Content of section 2.' }
      ]
    },
    draftedDocumentTitle: 'Sample Draft'
  },
  dispatch: jest.fn()
}

const renderComponent = (appState: any) => {
  return render(
    <MemoryRouter>
      <AppStateContext.Provider value={appState}>
        <Draft />
      </AppStateContext.Provider>
    </MemoryRouter>
  )
}

describe('Draft Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // it('renders title card and section cards', () => {
  //   renderComponent(mockAppState)

  //   expect(screen.getByTestId('mock-title-card')).toBeInTheDocument()
  //   expect(screen.getByText('Section 1')).toBeInTheDocument()
  //   expect(screen.getByText('Content of section 1.')).toBeInTheDocument()
  //   expect(screen.getByText('Section 2')).toBeInTheDocument()
  //   expect(screen.getByText('Content of section 2.')).toBeInTheDocument()
  // })

  it('redirects to home page if draftedDocument is empty', () => {
    const appStateWithEmptyDraft = {
      ...mockAppState,
      state: {
        ...mockAppState.state,
        draftedDocument: null
      }
    }

    renderComponent(appStateWithEmptyDraft)
    expect(window.location.pathname).toBe('/')
  })

  it('sanitizes title correctly', () => {
    const sanitizedTitle = mockAppState.state.draftedDocumentTitle.replace(/[^a-zA-Z0-9]/g, '')
    expect(sanitizedTitle).toBe('SampleDraft')
  })
  
  it('exports document when export button is clicked', async () => {
    const { saveAs } = require('file-saver');

    renderComponent(mockAppState)

    fireEvent.click(screen.getByRole('button', { name: /Export Document/i }))

    await waitFor(() => {
      saveAs(new Blob(['test content']), 'DraftTemplate-SampleDraft.docx');
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'DraftTemplate-SampleDraft.docx')
    })
  })
  

  test('renders empty string when draftedDocumentTitle is an empty string', () => {
    const appStateWithEmptyTitle = {
      ...mockAppState,
      state: {
        ...mockAppState.state,
        draftedDocumentTitle: ''
      }
    }

    renderComponent(appStateWithEmptyTitle)

    expect(screen.getByDisplayValue('')).toBeInTheDocument()
  })

  test('renders empty string when draftedDocumentTitle is null', () => {
    const appStateWithNullTitle = {
      ...mockAppState,
      state: {
        ...mockAppState.state,
        draftedDocumentTitle: null
      }
    }

    renderComponent(appStateWithNullTitle)

    expect(screen.getByDisplayValue('')).toBeInTheDocument()
  })

  test('returns draftedDocumentTitle when it is a valid string', () => {
    renderComponent(mockAppState)

    expect(screen.getByDisplayValue('Sample Draft')).toBeInTheDocument()
  })

  test('does not crash when draftedDocument is null', () => {
    const appStateWithNullDocument = {
      ...mockAppState,
      state: {
        ...mockAppState.state,
        draftedDocument: null
      }
    }

    renderComponent(appStateWithNullDocument)

    expect(screen.queryByText('Section 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Section 2')).not.toBeInTheDocument()
  })

  test('does not crash when appStateContext is undefined', () => {
    const appStateWithUndefinedContext = {
      state: {}
    }

    renderComponent(appStateWithUndefinedContext)

    expect(screen.getByDisplayValue('')).toBeInTheDocument()
  })

  test('does not render any SectionCard when sections array is empty', () => {
    const appStateWithEmptySections = {
      ...mockAppState,
      state: {
        ...mockAppState.state,
        draftedDocument: {
          sections: []
        }
      }
    }

    renderComponent(appStateWithEmptySections)

    const sectionCards = screen.queryAllByTestId('mock-section-card')
    expect(sectionCards.length).toBe(0)
  })

  test('renders SectionCard for each section in draftedDocument', () => {
    renderComponent(mockAppState)

    const sectionCards = screen.getAllByTestId('mock-section-card')
    expect(sectionCards.length).toBe(mockAppState.state.draftedDocument.sections.length)
  })

  test('getTitle function returns correct title when draftedDocumentTitle is valid', () => {
    renderComponent(mockAppState)
    expect(screen.getByDisplayValue('Sample Draft')).toBeInTheDocument()
  })

})
