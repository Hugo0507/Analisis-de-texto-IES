/**
 * MainLayout Component
 *
 * Main application layout with Sidebar and content area (no header).
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/organisms';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
