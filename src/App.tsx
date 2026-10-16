/**
 * SISTEM MONITORING BEDAH RUMAH 2026 — TPM
 * TPM Pemberdayaan: Gamaliel Tumiwa
 * TPM Konstruksi: Valerian Poluan
 */

import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

// Views
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { MapView } from './views/MapView';
import { MonitoringView } from './views/MonitoringView';
import { FieldModeView } from './views/FieldModeView';
import { RecapView } from './views/RecapView';
import { IssuesView } from './views/IssuesView';
import { PaymentsView } from './views/PaymentsView';
import { GalleryView } from './views/GalleryView';
import { MasterDataView } from './views/MasterDataView';
import { ImportExportView } from './views/ImportExportView';
import { SettingsView } from './views/SettingsView';
import { ProfileView } from './views/ProfileView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(store.currentUser);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [viewParams, setViewParams] = useState<Record<string, string>>({});

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setCurrentUser(store.currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleNavigate = (view: string, params?: Record<string, string>) => {
    setCurrentView(view);
    setViewParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user is not logged in, enforce LoginView
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={() => {
          setCurrentUser(store.currentUser);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar currentView={currentView} onNavigate={handleNavigate} />

        {/* Dynamic View Viewport */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}

          {currentView === 'map' && (
            <MapView
              onNavigate={handleNavigate}
              onSelectPBForMonitoring={(pbId) => {
                handleNavigate('monitoring', { pbId });
              }}
            />
          )}

          {currentView === 'monitoring' && (
            <MonitoringView
              initialBeneficiaryId={viewParams.pbId}
              onNavigate={handleNavigate}
              onSuccess={() => handleNavigate('recap')}
            />
          )}

          {currentView === 'field' && (
            <FieldModeView
              onNavigate={handleNavigate}
              onOpenMonitoringForPB={(pbId) => {
                handleNavigate('monitoring', { pbId });
              }}
            />
          )}

          {currentView === 'recap' && (
            <RecapView onNavigate={handleNavigate} filterPbId={viewParams.pbId} />
          )}

          {currentView === 'issues' && (
            <IssuesView onNavigate={handleNavigate} filterPbId={viewParams.pbId} />
          )}

          {currentView === 'payments' && <PaymentsView onNavigate={handleNavigate} />}

          {currentView === 'gallery' && (
            <GalleryView onNavigate={handleNavigate} filterPbId={viewParams.pbId} />
          )}

          {currentView === 'master' && (
            <MasterDataView
              onNavigate={handleNavigate}
              selectedPbIdForDetail={viewParams.pbId}
            />
          )}

          {currentView === 'import' && <ImportExportView />}

          {currentView === 'settings' && <SettingsView />}

          {currentView === 'profil' && (
            <ProfileView
              onLogout={() => {
                store.logout();
                setCurrentUser(null);
                setCurrentView('login');
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav currentView={currentView} onNavigate={handleNavigate} />
    </div>
  );
}
