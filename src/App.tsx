import React, { useState } from 'react';
import { RealtimeDbProvider, useRealtimeDb } from './context/RealtimeDbContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/views/DashboardView';
import { EmergencySOSView } from './components/views/EmergencySOSView';
import { DriversView } from './components/views/DriversView';
import { PassengersView } from './components/views/PassengersView';
import { LiveTripsView } from './components/views/LiveTripsView';
import { BookingsView } from './components/views/BookingsView';
import { EarningsView } from './components/views/EarningsView';
import { ReportsView } from './components/views/ReportsView';
import { SupportView } from './components/views/SupportView';
import { NotificationsView } from './components/views/NotificationsView';
import { SettingsView } from './components/views/SettingsView';
import { LoginView } from './components/views/LoginView';

// Modals
import { CallUserModal } from './components/modals/CallUserModal';
import { EmergencyDispatchModal } from './components/modals/EmergencyDispatchModal';
import { DriverInspectionModal } from './components/modals/DriverInspectionModal';
import { PassengerDetailsModal } from './components/modals/PassengerDetailsModal';
import { TripInvoiceModal } from './components/modals/TripInvoiceModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';

import { NavTab, Driver, Passenger, Booking, EmergencyAlert } from './types';

function MainAppContent() {
  const { dispatchEmergencyUnit } = useRealtimeDb();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Call Modal state
  const [callModalData, setCallModalData] = useState<{
    isOpen: boolean;
    name: string;
    phone: string;
    role: string;
  }>({
    isOpen: false,
    name: '',
    phone: '',
    role: '',
  });

  // Emergency Dispatch Modal
  const [dispatchModalAlert, setDispatchModalAlert] = useState<EmergencyAlert | null>(null);

  // Driver Inspection Modal
  const [inspectingDriver, setInspectingDriver] = useState<Driver | null>(null);

  // Passenger Details Modal
  const [inspectingPassenger, setInspectingPassenger] = useState<Passenger | null>(null);

  // Trip Invoice Modal
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(null);

  const handleOpenCall = (name: string, phone: string, role: string = 'USER') => {
    setCallModalData({
      isOpen: true,
      name,
      phone,
      role,
    });
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#070b13] text-slate-100 overflow-hidden font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenGlobalSearch={() => setIsSearchOpen(true)}
          onLogout={() => setIsAuthenticated(false)}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveTab}
              onInspectDriver={setInspectingDriver}
            />
          )}

          {activeTab === 'emergency' && (
            <EmergencySOSView
              onOpenCall={handleOpenCall}
              onOpenDispatch={setDispatchModalAlert}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversView
              onInspectDriver={setInspectingDriver}
              onOpenCall={handleOpenCall}
            />
          )}

          {activeTab === 'passengers' && (
            <PassengersView
              onInspectPassenger={setInspectingPassenger}
              onOpenCall={handleOpenCall}
            />
          )}

          {activeTab === 'live-trips' && (
            <LiveTripsView
              onInspectDriver={setInspectingDriver}
              onOpenCall={handleOpenCall}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsView onInspectBooking={setInspectingBooking} />
          )}

          {activeTab === 'earnings' && <EarningsView />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'support' && <SupportView onOpenCall={handleOpenCall} />}

          {activeTab === 'notifications' && (
            <NotificationsView onNavigate={(tab) => setActiveTab(tab)} />
          )}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Interactive Modals */}
      {callModalData.isOpen && (
        <CallUserModal
          isOpen={callModalData.isOpen}
          onClose={() => setCallModalData({ ...callModalData, isOpen: false })}
          userName={callModalData.name}
          userPhone={callModalData.phone}
          userRole={callModalData.role}
        />
      )}

      {dispatchModalAlert && (
        <EmergencyDispatchModal
          isOpen={!!dispatchModalAlert}
          sosId={dispatchModalAlert.id}
          locationName={dispatchModalAlert.location.name}
          incidentLog={dispatchModalAlert.incidentLog}
          onClose={() => setDispatchModalAlert(null)}
          onConfirmDispatch={(unitName) => {
            dispatchEmergencyUnit(dispatchModalAlert.id, unitName);
            setDispatchModalAlert(null);
          }}
        />
      )}

      {inspectingDriver && (
        <DriverInspectionModal
          isOpen={!!inspectingDriver}
          driver={inspectingDriver}
          onClose={() => setInspectingDriver(null)}
          onOpenCall={(name, phone) => handleOpenCall(name, phone, 'DRIVER')}
        />
      )}

      {inspectingPassenger && (
        <PassengerDetailsModal
          isOpen={!!inspectingPassenger}
          passenger={inspectingPassenger}
          onClose={() => setInspectingPassenger(null)}
          onOpenCall={(name, phone) => handleOpenCall(name, phone, 'PASSENGER')}
        />
      )}

      {inspectingBooking && (
        <TripInvoiceModal
          isOpen={!!inspectingBooking}
          booking={inspectingBooking}
          onClose={() => setInspectingBooking(null)}
        />
      )}

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <RealtimeDbProvider>
      <MainAppContent />
    </RealtimeDbProvider>
  );
}
