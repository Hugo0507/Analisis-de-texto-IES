/**
 * Forgot Password Page
 *
 * Password recovery interface
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/atoms';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: Implement password recovery service
      console.log('Password recovery for:', email);

      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - White (45%) */}
      <div className="w-[45%] bg-white flex flex-col">
        {/* Logo Section */}
        <div className="p-6">
          <div className="flex items-center gap-4">
            <img
              src="/Logo_tesis.png"
              alt="Transformación Digital - IES"
              className="h-16 w-auto"
            />
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-900 uppercase leading-tight">
                TRANSFORMACIÓN DIGITAL - INSTITUCIONES DE EDUCACIÓN SUPERIOR
              </p>
            </div>
          </div>
        </div>

        {/* Recovery Form */}
        <div className="flex-1 flex items-center justify-center px-12">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Llena el formulario para recuperar tu contraseña
            </p>

            {success ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-semibold mb-2 text-sm">✓ Correo enviado</p>
                <p className="text-xs">
                  Revisa tu bandeja de entrada. Te hemos enviado un enlace para
                  restablecer tu contraseña.
                </p>
                <button
                  onClick={() => navigate('/admin')}
                  className="mt-3 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  ← Volver al login
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    style={{ backgroundColor: '#10968E' }}
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" />
                        <span className="ml-2">Enviando...</span>
                      </>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </button>
                </form>

                {/* Back to Login */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                    disabled={isLoading}
                  >
                    ← Volver al login
                  </button>
                </div>
              </>
            )}
          </div>
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
              Recuperación de contraseña
            </h1>
            <p className="text-base mb-4 leading-relaxed opacity-90">
              Ingresa tu correo electrónico y te enviaremos las instrucciones
              para restablecer tu contraseña de acceso al sistema.
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
