/**
 * Button Component Tests
 *
 * Unit tests for Button atom component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  test('renders button with children text', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByText(/click me/i);
    expect(buttonElement).toBeInTheDocument();
  });

  test('applies primary variant class by default', () => {
    render(<Button>Test</Button>);
    const buttonElement = screen.getByText(/test/i);
    expect(buttonElement).toHaveClass('bg-blue-600');
  });

  test('applies secondary variant class when specified', () => {
    render(<Button variant="secondary">Test</Button>);
    const buttonElement = screen.getByText(/test/i);
    expect(buttonElement).toHaveClass('bg-gray-200');
  });

  test('applies correct size classes', () => {
    const { rerender } = render(<Button size="sm">Test</Button>);
    let buttonElement = screen.getByText(/test/i);
    expect(buttonElement).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Button size="lg">Test</Button>);
    buttonElement = screen.getByText(/test/i);
    expect(buttonElement).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const buttonElement = screen.getByText(/click me/i);
    fireEvent.click(buttonElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const buttonElement = screen.getByText(/disabled/i);
    expect(buttonElement).toBeDisabled();
  });

  test('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
  });

  test('is disabled when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    const buttonElement = screen.getByText(/loading.../i);
    expect(buttonElement).toBeDisabled();
  });

  test('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>);
    const buttonElement = screen.getByText(/test/i);
    expect(buttonElement).toHaveClass('custom-class');
  });

  test('supports all HTML button attributes', () => {
    render(
      <Button type="submit" name="testButton" value="testValue">
        Submit
      </Button>
    );
    const buttonElement = screen.getByText(/submit/i);
    expect(buttonElement).toHaveAttribute('type', 'submit');
    expect(buttonElement).toHaveAttribute('name', 'testButton');
  });
});
