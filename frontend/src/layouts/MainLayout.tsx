/**
 * MainLayout Component
 *
 * Main application layout with Header, Sidebar, and content area.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header, Sidebar } from '../components/organisms';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content Area with Sidebar */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
