import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; // for the "toBeInTheDocument" matcher
import { BrowserRouter as Router } from 'react-router-dom';
import FeatureCard from './FeatureCard';  // Do not import FeatureCardProps here
 
// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));
 
// Helper function to render the FeatureCard
const renderFeatureCard = (props: React.ComponentProps<typeof FeatureCard>) => {
  return render(
    <Router>
      <FeatureCard {...props} />
    </Router>
  );
};
 
describe('FeatureCard', () => {
  const mockNavigate = jest.fn();
 
  beforeEach(() => {
    // Clear all mock calls before each test
    mockNavigate.mockClear();
  });
 
  const props = {
    icon: <svg>Icon</svg>, // A simple mock of an icon
    title: 'Feature Title',
    description: 'Feature description goes here.',
    urlSuffix: '/feature-url',
  };
 
  test('renders correctly with the provided props', () => {
    const { getByText, getByRole } = renderFeatureCard(props);
 
    // Check if title and description are rendered correctly
    expect(getByText(props.title)).toBeInTheDocument();
    expect(getByText(props.description)).toBeInTheDocument();
 
    // Check if the icon is rendered (if it's in the SVG)
    expect(getByText(/Icon/i)).toBeInTheDocument(); // assuming the icon is an SVG
  });
 
  // test('navigates to the correct URL when clicked', () => {
  //   const { getByText } = renderFeatureCard(props);
 
  //   // Trigger a click event
  //   fireEvent.click(getByText(props.title));
 
  //   // Verify if navigate function was called with the correct URL
  //   expect(mockNavigate).toHaveBeenCalledWith(props.urlSuffix);
  // });
 
  test('applies correct CSS classes for styles', () => {
    const { container } = renderFeatureCard(props);
 
    const card = container.firstChild;
 
    // Ensure that the card is not null before performing actions on it
    if (card) {
      // Check if the card has the correct classes applied (e.g., border-radius, box-shadow)
      expect(card).toHaveClass(' ___qzrx270_0000000 f1prgvpd fnvar9b f6dzj5z f1atq3b4 fxugw4r f1hgep9b fang18a f4zyqsv fv7agxq foipia9 f8491dx');
     
      // Verify if hover effect exists by simulating hover and checking styles (optional depending on the library)
      fireEvent.mouseOver(card);
      // Add any assertions based on expected hover styles (e.g., border, shadow)
    } else {
      throw new Error('Card element was not found');
    }
  });
 
 
  test('handles missing props gracefully', () => {
    // Test with missing description or title
    const { getByText, queryByText } = renderFeatureCard({
        icon: props.icon,
        urlSuffix: props.urlSuffix,
        title: "Partial Card",
        description: ''
    });
 
    // Ensure it renders even if description is missing
    expect(getByText('Partial Card')).toBeInTheDocument();
    expect(queryByText('Feature description goes here.')).toBeNull();
  });
 
  // test('fires click event correctly for different titles', () => {
  //   const { getByText } = renderFeatureCard(props);
 
  //   // Fire a click event on the title and assert navigate function is called
  //   fireEvent.click(getByText(props.title));
  //   expect(mockNavigate).toHaveBeenCalledWith(props.urlSuffix);
  // });
 
  test('renders the correct icon', () => {
    const { container } = renderFeatureCard(props);
 
    // Ensure the icon is correctly rendered (in this case, the <svg> element)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
  it('navigates to the correct URL when clicked', () => {
    // Create mock navigate function
    const mockNavigate = jest.fn();
    // Mock the useNavigate hook to return our mock function
    require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
 
    const { getByText, queryByText } = renderFeatureCard({
      icon: props.icon,
      urlSuffix: props.urlSuffix,
      title: "Feature Card",
      description: ''
  });
   
 
    // Find the card element (you can find it by text, role, etc.)
    const card = getByText(/Feature Card/i);
 
    // Simulate a click on the card
    fireEvent.click(card);
 
    // Assert that the navigate function was called with the correct URL suffix
    expect(mockNavigate).toHaveBeenCalledWith(props.urlSuffix);
  });
});