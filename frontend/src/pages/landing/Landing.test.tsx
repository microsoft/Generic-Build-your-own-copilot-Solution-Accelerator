import { render, screen } from '@testing-library/react'
import { AppStateContext } from '../../state/AppProvider'
import '@testing-library/jest-dom'
import Landing from './Landing'
//import  FeatureCard  from '../../components/FeatureCard/FeatureCard'
import Contoso from '../../assets/Contoso.svg'

jest.mock('../../components/FeatureCard/FeatureCard', () => {
  return jest.fn(({ icon, title, description }) => (
    <div data-testid="card-mock">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ))
})

const mockAppState = {
  frontendSettings: {
    ui: {
      chat_logo: 'test-logo.svg',
      chat_title: 'Test Chat Title',
      chat_description: 'Test chat description'
    }
  }
}

const mockDispatch = jest.fn()

const renderComponent = (appState: any) => {
  return render(
    <AppStateContext.Provider value={{ state: appState, dispatch: mockDispatch }}>
      <Landing />
    </AppStateContext.Provider>
  )
}

describe('Landing Component', () => {
  test('renders with correct title and description', () => {
    renderComponent(mockAppState)
    expect(screen.getByText('Test Chat Title')).toBeInTheDocument()
    expect(screen.getByText('Test chat description')).toBeInTheDocument()
  })

  test('renders feature cards', () => {
    renderComponent(mockAppState)
    expect(screen.getAllByTestId('card-mock')).toHaveLength(2)
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })

  test('renders Contoso logo when chat_logo is not provided', () => {
    const mockStateWithoutLogo = {
      ...mockAppState,
      frontendSettings: {
        ui: {
          chat_logo: undefined,
          chat_title: 'Test Chat Title',
          chat_description: 'Test chat description'
        }
      }
    }

    renderComponent(mockStateWithoutLogo)
    const img = screen.getByRole('img', { hidden: true })
    expect(img).toHaveAttribute('src', Contoso)
  })
})
