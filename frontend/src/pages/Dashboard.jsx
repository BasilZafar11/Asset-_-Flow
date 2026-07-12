import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  UserCheck,
  Wrench,
  Calendar,
  ArrowRightLeft,
  Undo2,
} from 'lucide-react'
import { Header } from '../components/layout/Header'
import { StatCard } from '../components/dashboard/StatCard'
import { OverduePanel } from '../components/dashboard/OverduePanel'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { QuickActions } from '../components/dashboard/QuickActions'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'

export function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const currentRole = useAuthStore((s) => s.currentRole)
  const activeOrgId = useAuthStore((s) => s.activeOrgId)
  const workspaces = useAuthStore((s) => s.workspaces)

  const activeOrg = workspaces.find((w) => w.org_id === activeOrgId)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      // GET /api/dashboard → real Dashboard payload from backend
      const { data: resData } = await api.get('/dashboard')

      setData({
        kpis: resData.kpis || {},
        overdue_returns: resData.overdue_returns || [],
        overdue_count: resData.overdue_count || 0,
        recent_activity: resData.recent_activity || [],
        quick_actions: resData.quick_actions || [],
      })
    } catch (err) {
      console.error('Dashboard fetch failed:', err)
      // Show empty state on error
      setData({ kpis: {}, overdue_returns: [], overdue_count: 0, recent_activity: [], quick_actions: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [currentRole, activeOrgId])

  // Tab focus re-fetch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [currentRole, activeOrgId])

  const isAdmin = currentRole === 'Admin' || currentRole === 'Asset Manager'
  const isDeptHead = currentRole === 'Department Head'
  const isEmployee = currentRole === 'Employee'

  // Build KPI cards based on role
  const buildKpiCards = () => {
    if (!data?.kpis) return []

    const kpis = data.kpis
    const cards = []

    if (isAdmin) {
      cards.push(
        { label: 'Available', value: kpis.assets_available, icon: Package, color: 'green', path: '/assets?status=Available' },
        { label: 'Allocated', value: kpis.assets_allocated, icon: UserCheck, color: 'blue', path: '/allocations' },
        { label: 'Maint. Today', value: kpis.maintenance_today, icon: Wrench, color: 'orange', path: '/maintenance' },
        { label: 'Active Bookings', value: kpis.active_bookings, icon: Calendar, color: 'purple', path: '/bookings' },
        { label: 'Pending Transfers', value: kpis.pending_transfers, icon: ArrowRightLeft, color: 'yellow', path: '/allocations/transfers' },
        { label: 'Upcoming Returns', value: kpis.upcoming_returns, icon: Undo2, color: 'blue', path: '/allocations?filter=upcoming' },
      )
    }

    if (isDeptHead) {
      cards.push(
        { label: 'Allocated to Dept', value: kpis.assets_allocated, icon: UserCheck, color: 'blue', path: '/allocations' },
        { label: 'Maint. Today', value: kpis.maintenance_today, icon: Wrench, color: 'orange', path: '/maintenance' },
        { label: 'Active Bookings', value: kpis.active_bookings, icon: Calendar, color: 'purple', path: '/bookings' },
        { label: 'Pending Transfers', value: kpis.pending_transfers, icon: ArrowRightLeft, color: 'yellow', path: '/allocations/transfers' },
        { label: 'Upcoming Returns', value: kpis.upcoming_returns, icon: Undo2, color: 'blue', path: '/allocations?filter=upcoming' },
      )
    }

    if (isEmployee) {
      cards.push(
        { label: 'My Assets', value: kpis.my_assets, icon: UserCheck, color: 'blue', path: '/allocations/my' },
        { label: 'Maint. Today', value: kpis.maintenance_today, icon: Wrench, color: 'orange', path: '/maintenance' },
        { label: 'My Bookings', value: kpis.my_active_bookings, icon: Calendar, color: 'purple', path: '/bookings/my' },
      )
    }

    return cards
  }

  const kpiCards = buildKpiCards()
  const showActivityViewAll = isAdmin || isDeptHead

  if (loading && !data) {
    return (
      <>
        <Header breadcrumbs={[activeOrg?.org_name || 'Workspace', 'Dashboard']} />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[88px] rounded-lg border border-neutral-200 bg-white animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 rounded-lg border border-neutral-200 bg-white animate-pulse" />
            <div className="h-48 rounded-lg border border-neutral-200 bg-white animate-pulse" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        breadcrumbs={[activeOrg?.org_name || 'Workspace', 'Dashboard']}
        onRefresh={fetchDashboard}
      />

      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-page-title text-neutral-900">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Here&apos;s what&apos;s happening in{' '}
              <span className="font-medium text-neutral-700">{activeOrg?.org_name}</span> today.
            </p>
          </div>
          {data?.quick_actions && <QuickActions actions={data.quick_actions} />}
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(kpiCards.length, 6)}, minmax(0, 1fr))`,
          }}
        >
          {kpiCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              onClick={() => navigate(card.path)}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OverduePanel
            items={data?.overdue_returns || []}
            overdueCount={data?.overdue_count || 0}
          />
          <ActivityFeed
            items={data?.recent_activity || []}
            showViewAll={showActivityViewAll}
          />
        </div>
      </div>
    </>
  )
}
