import React from 'react';
import { render, screen,fireEvent,act } from '@testing-library/react';
import { AppStateContext } from '../../state/AppProvider';
import Sidebar from './Sidebar';
import { ChatHistoryLoadingState } from '../../api/models';
import { BrowserRouter as Router, useLocation ,useNavigate} from 'react-router-dom';
import { getUserInfo } from '../../api';

const mockDispatch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); 
  
});

jest.mock('../../api', () => ({
    getUserInfo: jest.fn(() => Promise.resolve([{ user_claims: [] }])),
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
    status: 'NotConfigured', 
  },
  chatHistory: null,
  filteredChatHistory: null,
  currentChat: null,
  browseChat: null,
  generateChat: null,
  frontendSettings: { auth_enabled: 'true' },
  feedbackState: {},
  draftedDocument: null,
  draftedDocumentTitle: '',
  isGenerating: false,
  isRequestInitiated: false,
  failedSections : [],
  isFailedReqInitiated : false
};
const mockState2 = {
  isChatHistoryOpen: false,
    chatHistoryLoadingState: ChatHistoryLoadingState.Loading,
    chatHistory: null, 
    filteredChatHistory: [], 
    currentChat: null, 
    browseChat: null, 
    generateChat: null,
    isCosmosDBAvailable: {
        cosmosDB: false,
        status: 'NotConfigured' 
    },
    frontendSettings: { auth_enabled: false }, 
    feedbackState: {}, 
    draftedDocument: null,
    draftedDocumentTitle: ''
};
const renderSidebar = (stateOverride = {}, pathname = '/') => {
  
  (useLocation as jest.Mock).mockReturnValue({ pathname });
  const state = { ...mockState, ...stateOverride }; 
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
    renderSidebar(); 
    
    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
  it('renders avatar when user info is available', () => {
    
      renderSidebar(); 
  
  
    
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
  
  it('handles draft button state as disabled when draftedDocument is null', () => {
    renderSidebar(); 
  
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toBeInTheDocument();
    expect(draftButton.closest('div')).toHaveClass('navigationButtonDisabled');
  });
  it('handles draft button state as active when draftedDocument is present and current view is draft', () => {
    renderSidebar({
      draftedDocument: { /* mock draftedDocument content */ },
    }, '/draft'); 
    
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toBeInTheDocument();
    expect(draftButton).toHaveStyle({ color: 'rgb(54, 122, 246)' }); 
  });
  it('handles draft button state as inactive when draftedDocument is present and current view is not draft', () => {
    renderSidebar({
      draftedDocument: { /* mock draftedDocument content */ },
    }, '/browse'); 
    
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toBeInTheDocument();
    expect(draftButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); 
  });
  it('renders all buttons in the correct states', () => {
    renderSidebar({
      draftedDocument: null, 
    }, '/generate'); 
  
    const browseButton = screen.getByText(/Browse/i);
    const generateButton = screen.getByText(/Generate/i);
    const draftButton = screen.getByText(/Draft/i);
  
    expect(browseButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); 
    expect(generateButton).toHaveStyle({ color: 'rgb(54, 122, 246)' }); 
    expect(draftButton).toHaveStyle({ color: 'rgb(121, 119, 117)' }); 
  });
  it('renders an avatar when user_claims does not contain a name claim', async () => {
    const mockUserClaims = [
      { typ: 'email', val: 'john.doe@example.com' }, 
    ];
  
    
    (getUserInfo as jest.Mock).mockResolvedValue([
      { user_claims: mockUserClaims }
    ]);
  
    const { findByRole } = renderSidebar();  
  
    
    const avatar = await findByRole('img');  
    expect(avatar).toBeInTheDocument();
  
    
  });
  it('logs error when getUserInfo API fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
  
   
    (getUserInfo as jest.Mock).mockRejectedValueOnce(new Error('API error'));
  
   
    await renderSidebar();
  
    
    await screen.findByRole('img'); 
  
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user info: ', expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });
  
  
  it('updates draft button state dynamically based on draftedDocument state', async () => {
    const { rerender } = renderSidebar({ draftedDocument: null }, '/generate');
  
    let draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toHaveStyle({ color: 'rgb(121, 119, 117)' }); 
    
    
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
    expect(draftButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); 
  });
  it('returns the correct view based on the current URL', () => {
   
    const mockUseLocation = jest.fn();
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/draft' });
    
    renderSidebar(); 
    
    
    expect(screen.getByText(/Draft/i)).toBeInTheDocument();
  });
  it('handles draftedDocument with unexpected structure', () => {
    renderSidebar({
      draftedDocument: { title: null, sections: undefined }, 
    });
    const draftButton = screen.getByText(/Draft/i);
    expect(draftButton).toHaveStyle({ color: 'rgb(190, 187, 184)' }); 
  });
  it('handles button clicks correctly', () => {
    renderSidebar(); 
  
    
    fireEvent.click(screen.getByText(/Browse/i));
    expect(navigate).toHaveBeenCalledWith('/chat'); 
  
   
    fireEvent.click(screen.getByText(/Generate/i));
    expect(navigate).toHaveBeenCalledWith('/generate'); 
  
   
  });
  
});