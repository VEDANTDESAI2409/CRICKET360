import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../src/renderer/components/Button';
import { Card } from '../../src/renderer/components/Card';
import { Badge } from '../../src/renderer/components/Badge';
import { Sidebar } from '../../src/renderer/components/Sidebar';
import { Header } from '../../src/renderer/components/Header';

describe('Milestone 1: UI Foundation Components', () => {
  it('1. should render Button with proper variants, icons, and click handling', () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" size="md" onClick={handleClick}>
        Save Product
      </Button>
    );

    const button = screen.getByRole('button', { name: /save product/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('bg-brand-primary');

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('2. should disable Button and show spinner when loading is true', () => {
    render(<Button loading>Processing</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('3. should render Card with title, subtitle, and body content', () => {
    render(
      <Card title="Cricket Bats" subtitle="English Willow Inventory">
        <p>Available Stock: 42 Bats</p>
      </Card>
    );

    expect(screen.getByText('Cricket Bats')).toBeInTheDocument();
    expect(screen.getByText('English Willow Inventory')).toBeInTheDocument();
    expect(screen.getByText('Available Stock: 42 Bats')).toBeInTheDocument();
  });

  it('4. should render Badge with correct styling tokens', () => {
    render(<Badge variant="brand">Milestone 1</Badge>);
    const badge = screen.getByText('Milestone 1');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-brand-light');
  });

  it('5. should render Sidebar with complete module navigation and trigger onSelectModule', () => {
    const handleSelect = vi.fn();
    render(<Sidebar currentModule="dashboard" onSelectModule={handleSelect} appVersion="v1.0.0" />);

    expect(screen.getByText('CRICKET360')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('POS Billing')).toBeInTheDocument();
    expect(screen.getByText('Products & Catalog')).toBeInTheDocument();
    expect(screen.getByText('Inventory & Stock')).toBeInTheDocument();
    expect(screen.getByText('Customers (Khata)')).toBeInTheDocument();
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Click on Products navigation
    const productsBtn = screen.getByText('Products & Catalog');
    fireEvent.click(productsBtn);
    expect(handleSelect).toHaveBeenCalledWith('products');
  });

  it('6. should render Header with page title and quick POS action button', () => {
    const handleOpenPos = vi.fn();
    render(
      <Header
        title="Store Overview"
        subtitle="Live metrics"
        onOpenPos={handleOpenPos}
        shopName="Cricket360 Pro Shop"
      />
    );

    expect(screen.getByText('Store Overview')).toBeInTheDocument();
    expect(screen.getByText('Live metrics')).toBeInTheDocument();
    expect(screen.getByText('Cricket360 Pro Shop')).toBeInTheDocument();

    const quickPosBtn = screen.getByText(/quick pos/i);
    fireEvent.click(quickPosBtn);
    expect(handleOpenPos).toHaveBeenCalledTimes(1);
  });
});
