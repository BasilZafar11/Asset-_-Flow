import { Search, Bell, RefreshCw } from 'lucide-react'
import { Button } from '../common/Button'

export function Header({ title, breadcrumbs = [], onRefresh }) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-neutral-300">/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-neutral-900">{crumb}</span>
            ) : (
              <span className="text-neutral-500">{crumb}</span>
            )}
          </span>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" title="Search">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger-500" />
        </Button>
      </div>
    </header>
  )
}
