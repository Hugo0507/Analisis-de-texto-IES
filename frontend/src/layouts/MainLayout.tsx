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
      {/* Sidebar - Fixed position */}
      <Sidebar className="fixed left-0 top-0 h-screen" />

      {/* Page Content - With left margin to compensate for fixed sidebar */}
      <main className="flex-1 ml-64 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};
