import React, { useState, useEffect } from 'react';
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
  const { dispatchEmergencyUnit, drivers, passengers, bookings } = useRealtimeDb();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Collapsible Sidebar state with persistent local preference (Desktop)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('swiftride_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile off-canvas drawer state (< 768px)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const notifyLayoutResize = () => {
    const startTime = performance.now();
    const duration = 320;
    const step = (now: number) => {
      window.dispatchEvent(new Event('resize'));
      if (now - startTime < duration) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen((prev) => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('swiftride_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      notifyLayoutResize();
      return next;
    });
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

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
  const liveInspectingDriver = inspectingDriver
    ? drivers.find((d) => d.id === inspectingDriver.id) || inspectingDriver
    : null;

  // Passenger Details Modal
  const [inspectingPassenger, setInspectingPassenger] = useState<Passenger | null>(null);
  const liveInspectingPassenger = inspectingPassenger
    ? passengers.find((p) => p.id === inspectingPassenger.id) || inspectingPassenger
    : null;

  // Trip Invoice Modal
  const [inspectingBooking, setInspectingBooking] = useState<Booking | null>(null);
  const liveInspectingBooking = inspectingBooking
    ? bookings.find((b) => b.id === inspectingBooking.id) || inspectingBooking
    : null;

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for search, Cmd+B / Ctrl+B for sidebar toggle)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Idle session timeout (15 minutes = 900,000 ms)
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      const timeoutId = setTimeout(() => {
        setIsAuthenticated(false);
      }, 15 * 60 * 1000);
      return timeoutId;
    };

    let currentTimeout = resetTimer();
    const handleActivity = () => {
      clearTimeout(currentTimeout);
      currentTimeout = resetTimer();
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      clearTimeout(currentTimeout);
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated]);

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
    <div className="flex h-screen w-screen bg-[#070b13] text-slate-100 overflow-hidden font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* Collapsible & Off-Canvas Responsive Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={() => setIsAuthenticated(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenGlobalSearch={() => setIsSearchOpen(true)}
          onLogout={() => setIsAuthenticated(false)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
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

      {liveInspectingDriver && (
        <DriverInspectionModal
          isOpen={!!liveInspectingDriver}
          driver={liveInspectingDriver}
          onClose={() => setInspectingDriver(null)}
          onOpenCall={(name, phone) => handleOpenCall(name, phone, 'DRIVER')}
        />
      )}

      {liveInspectingPassenger && (
        <PassengerDetailsModal
          isOpen={!!liveInspectingPassenger}
          passenger={liveInspectingPassenger}
          onClose={() => setInspectingPassenger(null)}
          onOpenCall={(name, phone) => handleOpenCall(name, phone, 'PASSENGER')}
        />
      )}

      {liveInspectingBooking && (
        <TripInvoiceModal
          isOpen={!!liveInspectingBooking}
          booking={liveInspectingBooking}
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
        onInspectDriver={(drv) => setInspectingDriver(drv)}
        onInspectPassenger={(pas) => setInspectingPassenger(pas)}
        onInspectBooking={(b) => setInspectingBooking(b)}
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
