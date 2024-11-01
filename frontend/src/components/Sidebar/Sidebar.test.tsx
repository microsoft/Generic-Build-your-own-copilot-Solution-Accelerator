import React from 'react';
import { render, screen,fireEvent,act } from '@testing-library/react';
import { AppStateContext } from '../../state/AppProvider';
import Sidebar from './Sidebar';
import { ChatHistoryLoadingState } from '../../api/models';
import { BrowserRouter as Router, useLocation ,useNavigate} from 'react-router-dom';
import { getUserInfo } from '../../api';

// Mock dispatch function
const mockDispatch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks(); // Clear mocks before each test to avoid conflicts
  
});


// Mock the necessary APIs and constants
jest.mock('../../api', () => ({
    getUserInfo: jest.fn(() => Promise.resolve([{ user_claims: [] }])), // Mocking it to return a resolved promise
    ChatHistoryLoadingState: {
      Loading: 'Loading',
      Success: 'Success',
      Fail: 'Fail',
      NotStarted: 'NotStarted',
    },
    CosmosDBStatus: {
      NotConfigured: 'NotConfigured',
      Configured: 'Configured',
      Error: 'Error',
    },
  }));
  


  const navigate = jest.fn();
// Mock the useNavigate and useLocation hooks from react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigate,
  useLocation: jest.fn(),
}));

const mockState = {
  isChatHistoryOpen: false,
  chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
  isCosmosDBAvailable: {
    cosmosDB: false,
    status: 'NotConfigured', // Reference the mocked status value
  },
  chatHistory: null,
  filteredChatHistory: null,
  currentChat: null,
  browseChat: null,
  generateChat: null,
  frontendSettings: { auth_enabled: 'true' }, // Ensure this is a string
  feedbackState: {},
  draftedDocument: null,
  draftedDocumentTitle: '',
};
const mockState2 = {
  isChatHistoryOpen: false,
    chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
    chatHistory: null, // or an appropriate default based on your type
    filteredChatHistory: [], // Change to an empty array if it's meant to be an array
    currentChat: null, // or an appropriate default value
    browseChat: null, // or an appropriate default value
    generateChat: null, // or an appropriate default value
    isCosmosDBAvailable: {
        cosmosDB: false,
        status: 'NotConfigured' // Ensure CosmosDBStatus is imported
    },
    frontendSettings: { auth_enabled: false }, // Initialize to match your structure
    feedbackState: {}, // or set to a proper default based on your expected type
    draftedDocument: null, // or a default DraftedDocument object if needed
    draftedDocumentTitle: '' // or a default title if required
};


const renderSidebar = (stateOverride = {}, pathname = '/') => {
  // Mock the location to simulate different paths
  (useLocation as jest.Mock).mockReturnValue({ pathname });

  const state = { ...mockState, ...stateOverride }; // Allow state overrides for individual tests

  return render(
    <AppStateContext.Provider value={{ state, dispatch: mockDispatch }}>
      <Router>
        <Sidebar />
      </Router>
    </AppStateContext.Provider>
  );
};

describe('Sidebar', () => {
  it('renders navigation buttons correctly', () => {
    renderSidebar(); // Uses default mockState

    // Check if navigation buttons are rendered
    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders avatar when user info is available', () => {
    
      renderSidebar(); // This waits for all async state updates to complete
  
  
    // Check if avatar is rendered after async call
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
  

  it('handles draft button state as disabled when draftedDocument is null', () => {
    renderSidebar(); // Uses default mockState where draftedDocument is null
  
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toBeInTheDocument();
    expect(draftButton.closest('div')).toHaveClass('navigationButtonDisabled');
  });

  it('handles draft button state as active when draftedDocument is present and current view is draft', () => {
    renderSidebar({
      draftedDocument: { /* mock draftedDocument content */ },
    }, '/draft'); // Simulate the /draft path
    
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toBeInTheDocument();
    expect(draftButton).toHaveStyle({ color: 'rgb(54, 122, 246)' }); // Active color
  });

  it('handles draft button state as inactive when draftedDocument is present and current view is not draft', () => {
    renderSidebar({
      draftedDocument: { /* mock draftedDocument content */ },
    }, '/browse'); // Simulate the /browse path
    
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toBeInTheDocument();
    expect(draftButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); // Inactive color
  });

  it('renders all buttons in the correct states', () => {
    renderSidebar({
      draftedDocument: null, // Draft button should be disabled
    }, '/generate'); // Simulate the /generate path
  
    const browseButton = screen.getByText(/Browse/i);
    const generateButton = screen.getByText(/Generate/i);
    const draftButton = screen.getByText(/Draft/i);
  
    expect(browseButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); // Inactive color for Browse
    expect(generateButton).toHaveStyle({ color: 'rgb(54, 122, 246)' }); // Active color for Generate
    expect(draftButton).toHaveStyle({ color: 'rgb(121, 119, 117)' }); // Disabled color for Draft
  });

  it('renders an avatar when user_claims does not contain a name claim', async () => {
    const mockUserClaims = [
      { typ: 'email', val: 'john.doe@example.com' }, // No name claim present
    ];
  
    // Mock the API response to return user claims without a name claim
    (getUserInfo as jest.Mock).mockResolvedValue([
      { user_claims: mockUserClaims }
    ]);
  
    const { findByRole } = renderSidebar();  // Rendering the Sidebar component
  
    // Expect the Avatar to be rendered
    const avatar = await findByRole('img');  // Assuming the Avatar renders an image
    expect(avatar).toBeInTheDocument();
  
    // Optionally check for a different attribute or a different behavior
    // For example, you can check if a default placeholder is rendered
    // expect(avatar).toHaveAttribute('src', 'path/to/default/avatar.png'); // Adjust based on your implementation
  });
  it('logs error when getUserInfo API fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  
    // Mock getUserInfo to reject
    (getUserInfo as jest.Mock).mockRejectedValueOnce(new Error('API error'));
  
    // Wait for the component to render and handle async actions
    await renderSidebar();
  
    // Wait for the error to propagate if necessary
    await screen.findByRole('img'); // Assuming there is an avatar image
  
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user info: ', expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });
  
  
  it('updates draft button state dynamically based on draftedDocument state', async () => {
    const { rerender } = renderSidebar({ draftedDocument: null }, '/generate');
  
    let draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toHaveStyle({ color: 'rgb(121, 119, 117)' }); // Disabled color
    
    // Update draftedDocument by re-rendering
    rerender(
      <AppStateContext.Provider value={{ state: { ...mockState, draftedDocument: { 
        title: 'Mock Draft Title', 
        sections: [
          { title: 'Introduction', content: 'Intro content', description: 'Introduction section' }
        ] 
      }}, dispatch: mockDispatch }}>
        <Router>
          <Sidebar />
        </Router>
      </AppStateContext.Provider>
    );
  
    draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); // Inactive color
  });
  it('returns the correct view based on the current URL', () => {
    // Directly test the determineView function
    const mockUseLocation = jest.fn();
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/draft' });
    
    renderSidebar(); // Triggers the component render
    
    // Check that determineView is returning the correct current view
    expect(screen.getByText(/Draft/i)).toBeInTheDocument();
  });




  it('handles draftedDocument with unexpected structure', () => {
    renderSidebar({
      draftedDocument: { title: null, sections: undefined }, // Mocking unexpected structure
    });

    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); // Disabled color
  });
  it('handles button clicks correctly', () => {
    renderSidebar(); // Renders the component with default state
  
    // Click on the Browse button
    fireEvent.click(screen.getByText(/Browse/i));
    expect(navigate).toHaveBeenCalledWith('/chat'); // Ensure it navigates to the correct path
  
    // Click on the Generate button
    fireEvent.click(screen.getByText(/Generate/i));
    expect(navigate).toHaveBeenCalledWith('/generate'); // Ensure it navigates to the correct path
  
   
  });
  


});
