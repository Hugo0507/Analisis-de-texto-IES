/**
 * Login Page
 *
 * Custom admin login interface with split-screen design
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/atoms';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: Implement authentication service
      console.log('Login attempt:', { email, password });

      // Simulated login for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to admin dashboard
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - White (45%) */}
      <div className="w-[45%] bg-white flex flex-col">
        {/* Logo Section */}
        <div className="px-12 pt-8 pb-4">
          <div className="flex items-start gap-4">
            <img
              src="/Logo_tesis.png"
              alt="Transformación Digital - IES"
              className="h-14 w-auto mt-1"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900 uppercase leading-tight">
                TRANSFORMACIÓN DIGITAL
              </p>
              <p className="text-xs font-light text-gray-900 uppercase leading-tight mt-0.5">
                INSTITUCIONES DE EDUCACIÓN SUPERIOR
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-12">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Ingresar
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="ejemplo@correo.com"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/admin/forgot-password')}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  disabled={isLoading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                style={{ backgroundColor: '#10968E' }}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" />
                    <span className="ml-2">Ingresando...</span>
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← Volver al dashboard público
          </button>
        </div>
      </div>

      {/* Right Panel - Navy Blue (55%) */}
      <div
        className="w-[55%] relative overflow-hidden"
        style={{ backgroundColor: '#1B263B' }}
      >
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-40 right-32 w-48 h-48 border-2 border-white rounded-full"></div>
          <div className="absolute top-1/2 right-20 w-32 h-32 border-2 border-white rounded-full"></div>

          {/* Dot Pattern */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-12 text-white">
          <div className="max-w-lg">
            <h1 className="text-3xl font-bold mb-6 leading-tight">
              Bienvenidos a la aplicación de análisis automático de contenido textual
            </h1>
            <p className="text-base mb-4 leading-relaxed opacity-90">
              A partir de métodos de Procesamiento de Lenguaje Natural (PLN) para la
              identificación de factores relevantes en la transformación digital en
              educación superior
            </p>

            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-xs opacity-70">
                Versión 1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
