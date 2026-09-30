/**
 * Role-Based Access Control (RBAC) permission helpers
 * Restricts UI views and critical actions based on the assigned user role
 * (Super Admin, Safety Dispatcher, Fleet Manager).
 */

export const checkRolePermission = (role: string | undefined, featureOrTab: string): boolean => {
  if (!role || role === 'Super Admin') return true;

  if (role === 'Safety Dispatcher') {
    // Safety Dispatcher operational domain: Emergency SOS, Live Trips, Bookings, Dashboard, Support, Notifications
    const allowedTabs = ['dashboard', 'emergency', 'live-trips', 'bookings', 'support', 'notifications'];
    if (allowedTabs.includes(featureOrTab)) return true;

    // Critical actions allowed for Safety Dispatcher
    const allowedActions = ['emergency_dispatch', 'ride_dispatch', 'support_reply', 'sos_resolve'];
    if (allowedActions.includes(featureOrTab)) return true;

    return false;
  }

  if (role === 'Fleet Manager') {
    // Fleet Manager operational domain: Drivers, Passengers, Earnings, Reports, Dashboard, Support, Notifications
    const allowedTabs = ['dashboard', 'drivers', 'passengers', 'earnings', 'reports', 'support', 'notifications'];
    if (allowedTabs.includes(featureOrTab)) return true;

    // Critical actions allowed for Fleet Manager
    const allowedActions = ['driver_audit', 'driver_approval', 'report_export', 'support_reply', 'wallet_adjust'];
    if (allowedActions.includes(featureOrTab)) return true;

    return false;
  }

  return true;
};

export const getRoleRestrictedMessage = (role: string, actionName: string): string => {
  if (role === 'Safety Dispatcher') {
    return `Access Restricted: '${actionName}' requires Fleet Manager or Super Admin privileges.`;
  }
  if (role === 'Fleet Manager') {
    return `Access Restricted: '${actionName}' requires Safety Dispatcher or Super Admin clearance.`;
  }
  return `Access Restricted: Insufficient permissions for your role (${role}).`;
};
