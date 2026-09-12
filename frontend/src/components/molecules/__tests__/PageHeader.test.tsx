/**
 * Estas pruebas fijan el marcado de PageHeader y LoadingPanel.
 *
 * Ambos se extrajeron de bloques que estaban copiados a mano en veintiuna
 * paginas. Comprobar aqui las clases exactas es lo que garantiza que la
 * extraccion no cambio nada de lo que se ve.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageHeader } from '../PageHeader';
import { LoadingPanel } from '../LoadingPanel';
import { IconButton, CheckIcon } from '../../atoms';

describe('PageHeader', () => {
  it('muestra el titulo y el subtitulo', () => {
    render(<PageHeader title="Crear Analisis" subtitle="Bolsa de palabras" />);
    expect(screen.getByRole('heading', { name: 'Crear Analisis' })).toBeInTheDocument();
    expect(screen.getByText('Bolsa de palabras')).toBeInTheDocument();
  });

  it('omite el subtitulo cuando no se pasa', () => {
    const { container } = render(<PageHeader title="Solo titulo" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('no pinta el boton de volver si no hay onBack', () => {
    render(<PageHeader title="Sin volver" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('invoca onBack al pulsar el boton de volver', async () => {
    const onBack = jest.fn();
    render(<PageHeader title="Con volver" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('conserva la barra fija y su borde, que es el aspecto original', () => {
    const { container } = render(<PageHeader title="X" />);
    const barra = container.firstChild as HTMLElement;
    expect(barra).toHaveClass('sticky', 'top-0', 'z-40', 'bg-white', 'border-b', 'border-gray-200');
  });

  it('pinta las acciones de la derecha', () => {
    render(
      <PageHeader
        title="Con acciones"
        actions={<IconButton icon={<CheckIcon />} title="Guardar" variant="success" />}
      />,
    );
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });
});

describe('LoadingPanel', () => {
  it('usa el alto h-96 que tenian las paginas', () => {
    const { container } = render(<LoadingPanel />);
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'justify-center', 'h-96');
  });

  it('permite cambiar el alto', () => {
    const { container } = render(<LoadingPanel height="h-64" />);
    expect(container.firstChild).toHaveClass('h-64');
  });

  it('muestra el mensaje opcional', () => {
    render(<LoadingPanel message="Cargando datasets" />);
    expect(screen.getByText('Cargando datasets')).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('se deshabilita y muestra el spinner mientras carga', () => {
    render(<IconButton icon={<CheckIcon />} title="Guardar" isLoading />);
    const boton = screen.getByRole('button', { name: 'Guardar' });
    expect(boton).toBeDisabled();
    expect(boton.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('no dispara onClick si esta deshabilitado', async () => {
    const onClick = jest.fn();
    render(<IconButton icon={<CheckIcon />} title="Guardar" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('expone el titulo como etiqueta accesible', () => {
    render(<IconButton icon={<CheckIcon />} title="Volver" />);
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveAttribute('title', 'Volver');
  });
});
