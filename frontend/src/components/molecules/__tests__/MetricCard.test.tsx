/**
 * MetricCard Component Tests
 *
 * Unit tests for MetricCard molecule component.
 */

import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

describe('MetricCard Component', () => {
  test('renders title and value', () => {
    render(<MetricCard title="Total Documents" value={100} />);

    expect(screen.getByText('Total Documents')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('renders icon when provided', () => {
    render(<MetricCard title="Documents" value={50} icon="📄" />);

    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  test('renders subtitle when provided', () => {
    render(
      <MetricCard
        title="Vocabulary"
        value={5000}
        subtitle="Unique terms"
      />
    );

    expect(screen.getByText('Unique terms')).toBeInTheDocument();
  });

  test('renders trend indicator when trend is provided', () => {
    render(
      <MetricCard
        title="Documents"
        value={100}
        trend="up"
        trendValue="+12%"
      />
    );

    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  test('applies correct variant border color', () => {
    const { container } = render(
      <MetricCard title="Test" value={10} variant="success" />
    );

    const card = container.firstChild;
    expect(card).toHaveClass('border-l-green-500');
  });

  test('shows loading skeleton when isLoading is true', () => {
    render(<MetricCard title="Test" value={10} isLoading={true} />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <MetricCard title="Test" value={10} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('renders string values', () => {
    render(<MetricCard title="Score" value="98.5%" />);

    expect(screen.getByText('98.5%')).toBeInTheDocument();
  });

  test('renders large number values', () => {
    render(<MetricCard title="Vocabulary" value={1234567} />);

    expect(screen.getByText('1234567')).toBeInTheDocument();
  });
});
