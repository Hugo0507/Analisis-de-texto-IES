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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Page Content - Independent Scroll */}
      <main className="flex-1 h-screen overflow-y-auto scrollbar-hide" style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
};
