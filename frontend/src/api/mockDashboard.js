/**
 * Mock Dashboard API
 *
 * Returns role-scoped dashboard data: KPIs, overdue, activity, quick actions.
 * Swap with real GET /api/dashboard when backend ready.
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const ADMIN_DATA = {
  kpis: {
    assets_available: 142,
    assets_allocated: 87,
    maintenance_today: 5,
    active_bookings: 12,
    pending_transfers: 3,
    upcoming_returns: 8,
  },
  overdue_returns: [
    {
      allocation_id: 87,
      asset_tag: 'AF-0042',
      asset_name: 'Dell XPS 15',
      holder_name: 'Priya Sharma',
      expected_return_date: '2026-07-08',
      days_overdue: 4,
    },
    {
      allocation_id: 91,
      asset_tag: 'AF-0017',
      asset_name: 'Canon EOS R5',
      holder_name: 'Raj Kumar',
      expected_return_date: '2026-07-10',
      days_overdue: 2,
    },
    {
      allocation_id: 103,
      asset_tag: 'AF-0031',
      asset_name: 'Epson Projector EB-L200',
      holder_name: 'Rahul Verma',
      expected_return_date: '2026-07-09',
      days_overdue: 3,
    },
    {
      allocation_id: 110,
      asset_tag: 'AF-0055',
      asset_name: 'Sony A7 IV',
      holder_name: 'Anita Desai',
      expected_return_date: '2026-07-11',
      days_overdue: 1,
    },
  ],
  overdue_count: 4,
  recent_activity: [
    {
      id: 1542,
      action_type: 'ASSET_ALLOCATED',
      description: "Allocated 'Canon EOS R5' (AF-0017) to Raj Kumar",
      user_name: 'Devyash Rasela',
      created_at: '2026-07-12T06:30:00Z',
    },
    {
      id: 1540,
      action_type: 'BOOKING_CREATED',
      description: "Booked 'Conference Room A' (AF-0100) — Jul 12, 14:00–15:00",
      user_name: 'Mayank Padhi',
      created_at: '2026-07-12T05:15:00Z',
    },
    {
      id: 1538,
      action_type: 'MAINTENANCE_APPROVED',
      description: "Maintenance approved for 'HP LaserJet Pro' (AF-0023)",
      user_name: 'Devyash Rasela',
      created_at: '2026-07-12T03:00:00Z',
    },
    {
      id: 1535,
      action_type: 'TRANSFER_REQUESTED',
      description: "Transfer requested for 'MacBook Pro 16' (AF-0008) — Engineering → Marketing",
      user_name: 'Priya Sharma',
      created_at: '2026-07-11T10:45:00Z',
    },
    {
      id: 1530,
      action_type: 'ASSET_REGISTERED',
      description: "Registered new asset 'Dell Monitor U2723QE' (AF-0062)",
      user_name: 'Devyash Rasela',
      created_at: '2026-07-11T09:00:00Z',
    },
    {
      id: 1528,
      action_type: 'BOOKING_CANCELLED',
      description: "Cancelled booking for 'Projector Room B' (AF-0101)",
      user_name: 'Anita Desai',
      created_at: '2026-07-11T07:30:00Z',
    },
  ],
  quick_actions: [
    'register_asset',
    'book_resource',
    'raise_maintenance',
    'create_audit',
    'invite_member',
  ],
}

const DEPT_HEAD_DATA = {
  kpis: {
    assets_allocated: 23,
    maintenance_today: 2,
    active_bookings: 5,
    pending_transfers: 1,
    upcoming_returns: 3,
  },
  overdue_returns: [
    {
      allocation_id: 103,
      asset_tag: 'AF-0031',
      asset_name: 'Epson Projector EB-L200',
      holder_name: 'Rahul Verma',
      expected_return_date: '2026-07-09',
      days_overdue: 3,
    },
  ],
  overdue_count: 1,
  recent_activity: [
    {
      id: 1540,
      action_type: 'BOOKING_CREATED',
      description: "Booked 'Conference Room A' (AF-0100) — Jul 12, 14:00–15:00",
      user_name: 'Mayank Padhi',
      created_at: '2026-07-12T05:15:00Z',
    },
    {
      id: 1536,
      action_type: 'MAINTENANCE_REQUESTED',
      description: "Maintenance requested for 'Printer HP-3020' (AF-0029)",
      user_name: 'Rahul Verma',
      created_at: '2026-07-12T02:00:00Z',
    },
    {
      id: 1533,
      action_type: 'TRANSFER_REQUESTED',
      description: "Transfer requested for 'Dell Monitor' (AF-0045) — Engineering → Design",
      user_name: 'Rahul Verma',
      created_at: '2026-07-11T10:00:00Z',
    },
  ],
  quick_actions: ['book_resource', 'raise_maintenance'],
}

const EMPLOYEE_DATA = {
  kpis: {
    my_assets: 3,
    maintenance_today: 1,
    my_active_bookings: 2,
  },
  overdue_returns: [
    {
      allocation_id: 102,
      asset_tag: 'AF-0055',
      asset_name: 'Sony Camera A7 IV',
      expected_return_date: '2026-07-08',
      days_overdue: 4,
    },
  ],
  overdue_count: 1,
  recent_activity: [
    {
      id: 1540,
      action_type: 'BOOKING_CREATED',
      description: "Booked 'Conference Room A' (AF-0100) — Jul 12, 14:00–15:00",
      user_name: 'Mayank Padhi',
      created_at: '2026-07-12T05:15:00Z',
    },
    {
      id: 1537,
      action_type: 'MAINTENANCE_REQUESTED',
      description: "Maintenance requested for 'Logitech Webcam' (AF-0044)",
      user_name: 'Mayank Padhi',
      created_at: '2026-07-12T01:30:00Z',
    },
    {
      id: 1529,
      action_type: 'ASSET_ALLOCATED',
      description: "Allocated 'Dell Monitor U2723QE' (AF-0062) to you",
      user_name: 'Devyash Rasela',
      created_at: '2026-07-10T08:00:00Z',
    },
  ],
  quick_actions: ['book_resource', 'raise_maintenance'],
}

/**
 * GET /api/dashboard — returns role-scoped payload
 */
export async function mockGetDashboard(role) {
  await delay(500)

  switch (role) {
    case 'Department Head':
      return DEPT_HEAD_DATA
    case 'Employee':
      return EMPLOYEE_DATA
    default:
      // Admin + Asset Manager get full org view
      return ADMIN_DATA
  }
}

/**
 * GET /api/dashboard/kpis — lightweight refresh
 */
export async function mockGetKpis(role) {
  await delay(200)
  const data = await mockGetDashboard(role)
  return data.kpis
}
