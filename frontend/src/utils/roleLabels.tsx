/**
 * Etiquetas visibles del rol de un usuario.
 *
 * La autorizacion ya se decide en un solo sitio -`is_admin`, la misma
 * propiedad que aplica el backend en IsAdminRole-, pero el texto que ve el
 * usuario seguia saliendo de `role`. Con un superusuario cuyo `role` era
 * 'user' eso mostraba "Usuario" a alguien que manda en todo: la misma
 * contradiccion que acabamos de quitar de los permisos, pero en pantalla.
 *
 * Estas funciones aceptan el usuario entero para poder mirar `is_admin`
 * cuando esta disponible y caer a `role` cuando no lo esta (por ejemplo en
 * listados antiguos que solo traen el rol).
 */

import React from 'react';

export interface UsuarioConRol {
  role?: string;
  is_admin?: boolean;
}

/** True si el usuario debe presentarse como administrador. */
export function esAdministrador(usuario: UsuarioConRol | null | undefined): boolean {
  if (!usuario) return false;
  if (typeof usuario.is_admin === 'boolean') return usuario.is_admin;
  return usuario.role === 'admin';
}

/** Texto largo: "Administrador" o "Usuario". */
export function etiquetaDeRol(usuario: UsuarioConRol | null | undefined): string {
  return esAdministrador(usuario) ? 'Administrador' : 'Usuario';
}

/** Insignia corta para tablas: "Admin" o "User". */
export const InsigniaDeRol: React.FC<{ usuario: UsuarioConRol }> = ({ usuario }) =>
  esAdministrador(usuario) ? (
    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
      Admin
    </span>
  ) : (
    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
      User
    </span>
  );
