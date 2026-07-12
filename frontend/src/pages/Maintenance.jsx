import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

export function Maintenance() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const currentRole = useAuthStore((s) => s.currentRole);

  const isManager = ['Admin', 'Asset Manager'].includes(currentRole);
  const isListView = pathname.includes('/list');

  // ── Shared state ──────────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters (list view)
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assetSearch, setAssetSearch] = useState('');

  // Modals
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTechModal, setShowTechModal] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [detailData, setDetailData] = useState(null);

  // Raise form state
  const [raiseAssetTag, setRaiseAssetTag] = useState('');
  const [raiseDescription, setRaiseDescription] = useState('');
  const [raisePriority, setRaisePriority] = useState('Medium');
  const [raisePhotoUrl, setRaisePhotoUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Reject/Tech form state
  const [rejectReason, setRejectReason] = useState('');
  const [techName, setTechName] = useState('');
  const [techNotes, setTechNotes] = useState('');

  // ── Fetch requests ────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (assetSearch) params.append('asset_tag', assetSearch);
      const { data } = await api.get(`/maintenance?${params.toString()}`);
      setRequests(data);
    } catch (err) {
      console.error('Error fetching maintenance requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, assetSearch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Fetch detail ──────────────────────────────────────────────────────
  const openDetail = async (req) => {
    setActiveRequest(req);
    try {
      const { data } = await api.get(`/maintenance/${req.id}`);
      setDetailData(data);
      setShowDetailDrawer(true);
    } catch (err) {
      console.error(err);
      setDetailData(req);
      setShowDetailDrawer(true);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────
  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/maintenance', {
        asset_tag: raiseAssetTag.trim(),
        issue_description: raiseDescription,
        priority: raisePriority,
        photo_url: raisePhotoUrl || null
      });
      setShowRaiseModal(false);
      setRaiseAssetTag('');
      setRaiseDescription('');
      setRaisePriority('Medium');
      setRaisePhotoUrl('');
      fetchRequests();
    } catch (err) {
      setFormError(err.response?.data?.error || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this maintenance request? The asset will be marked Under Maintenance.')) return;
    try {
      await api.patch(`/maintenance/${id}/approve`);
      setShowDetailDrawer(false);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/maintenance/${activeRequest.id}/reject`, { reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
      setShowDetailDrawer(false);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleStartSubmit = async (e) => {
    e.preventDefault();
    if (!techName.trim()) return;
    try {
      await api.patch(`/maintenance/${activeRequest.id}/start`, {
        technician_name: techName,
        notes: techNotes
      });
      setShowTechModal(false);
      setTechName('');
      setTechNotes('');
      setShowDetailDrawer(false);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleResolve = async () => {
    try {
      await api.patch(`/maintenance/${activeRequest.id}/resolve`);
      setShowResolveConfirm(false);
      setShowDetailDrawer(false);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  // ── Kanban helpers ────────────────────────────────────────────────────
  const kanbanStatuses = ['Pending', 'Approved', 'In Progress', 'Resolved'];
  const kanbanColors = {
    'Pending': { border: 'border-amber-500/40', bg: 'bg-amber-500/5', header: 'text-amber-400', dot: 'bg-amber-500' },
    'Approved': { border: 'border-blue-500/40', bg: 'bg-blue-500/5', header: 'text-blue-400', dot: 'bg-blue-500' },
    'In Progress': { border: 'border-orange-500/40', bg: 'bg-orange-500/5', header: 'text-orange-400', dot: 'bg-orange-500' },
    'Resolved': { border: 'border-emerald-500/40', bg: 'bg-emerald-500/5', header: 'text-emerald-400', dot: 'bg-emerald-500' }
  };

  const priorityColors = {
    'Low': 'bg-blue-500/20 text-blue-400',
    'Medium': 'bg-amber-500/20 text-amber-400',
    'High': 'bg-orange-500/20 text-orange-400',
    'Critical': 'bg-red-500/20 text-red-400'
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // ── Drag & Drop for Kanban ────────────────────────────────────────────
  const [dragItem, setDragItem] = useState(null);

  const allowedTransitions = {
    'Pending': ['Approved'],
    'Approved': ['In Progress'],
    'In Progress': ['Resolved']
  };

  const handleDragStart = (e, request) => {
    setDragItem(request);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!dragItem) return;

    const allowed = allowedTransitions[dragItem.status] || [];
    if (!allowed.includes(targetStatus)) {
      setDragItem(null);
      return;
    }

    // Trigger the correct action
    setActiveRequest(dragItem);
    if (targetStatus === 'Approved') {
      handleApprove(dragItem.id);
    } else if (targetStatus === 'In Progress') {
      setTechName('');
      setTechNotes('');
      setShowTechModal(true);
    } else if (targetStatus === 'Resolved') {
      setShowResolveConfirm(true);
    }
    setDragItem(null);
  };

  // ── Collapsed state for Resolved column ───────────────────────────────
  const [resolvedCollapsed, setResolvedCollapsed] = useState(true);

  return (
    <div className="p-8 flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-6">
        <div className="flex gap-6 items-center">
          <h1 className="text-xl font-bold text-white">Maintenance</h1>

          {isManager && (
            <div className="flex bg-neutral-900 border border-neutral-800 rounded-md p-1 ml-4">
              <button
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm ${!isListView ? 'bg-primary-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => navigate('/maintenance')}
              >
                Kanban
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm ${isListView ? 'bg-primary-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                onClick={() => navigate('/maintenance/list')}
              >
                List
              </button>
            </div>
          )}
        </div>

        <button
          className="btn btn-primary py-2 text-sm"
          onClick={() => {
            setRaiseAssetTag('');
            setRaiseDescription('');
            setRaisePriority('Medium');
            setRaisePhotoUrl('');
            setFormError('');
            setShowRaiseModal(true);
          }}
        >
          Raise Request
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* KANBAN VIEW (Admin / Asset Manager default)                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {!isListView && isManager && (
        <div className="grid grid-cols-4 gap-5 flex-1 min-h-[500px]">
          {kanbanStatuses.map((status) => {
            const color = kanbanColors[status];
            const cards = requests.filter(r => r.status === status);
            const isResolved = status === 'Resolved';
            const visibleCards = isResolved && resolvedCollapsed ? cards.slice(0, 3) : cards;

            return (
              <div
                key={status}
                className={`flex flex-col rounded-xl border ${color.border} ${color.bg} overflow-hidden`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`}></span>
                    <span className={`font-semibold text-sm ${color.header}`}>{status}</span>
                  </div>
                  <span className="bg-neutral-800 text-neutral-300 text-xs font-bold px-2 py-0.5 rounded-full">{cards.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px]">
                  {visibleCards.map((req) => (
                    <div
                      key={req.id}
                      draggable={!['Resolved', 'Rejected'].includes(req.status)}
                      onDragStart={(e) => handleDragStart(e, req)}
                      onClick={() => openDetail(req)}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 cursor-pointer hover:border-neutral-600 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {/* Asset info */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-white truncate">{req.Asset?.name || req.asset_tag}</div>
                          <div className="font-mono text-[11px] text-neutral-500">{req.asset_tag}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${priorityColors[req.priority]}`}>
                          {req.priority}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{req.issue_description}</p>

                      {/* Photo indicator */}
                      {req.photo_url && (
                        <div className="text-[10px] text-neutral-500 mb-2 flex items-center gap-1">
                          📷 Photo attached
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex justify-between items-center text-[11px] text-neutral-500 border-t border-neutral-800 pt-2 mt-1">
                        <span>{req.RaisedBy?.name || 'User'}</span>
                        <span>{timeAgo(req.created_at)}</span>
                      </div>
                    </div>
                  ))}

                  {isResolved && resolvedCollapsed && cards.length > 3 && (
                    <button
                      onClick={() => setResolvedCollapsed(false)}
                      className="w-full text-center text-xs text-neutral-400 hover:text-white py-2 border border-dashed border-neutral-700 rounded-md"
                    >
                      Show {cards.length - 3} more resolved...
                    </button>
                  )}

                  {cards.length === 0 && (
                    <div className="text-center text-xs text-neutral-500 py-6">No requests</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* LIST VIEW (all roles, or non-manager default)                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {(isListView || !isManager) && (
        <>
          {/* Filters */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Asset Tag Search</label>
              <input
                type="text"
                placeholder="Search by asset tag..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3.5 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</label>
              <select
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3.5 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Priority</label>
              <select
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3.5 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <table className="asset-table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Asset</th>
                  <th>Raised By</th>
                  <th>Issue</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-12 text-neutral-400">Loading requests...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-12 text-neutral-400">No maintenance requests found.</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="cursor-pointer hover:bg-neutral-800/40" onClick={() => openDetail(req)}>
                      <td className="font-mono text-xs">#{req.id}</td>
                      <td>
                        <div className="font-semibold text-sm">{req.Asset?.name || '-'}</div>
                        <div className="font-mono text-[11px] text-neutral-500">{req.asset_tag}</div>
                      </td>
                      <td>{req.RaisedBy?.name || '-'}</td>
                      <td className="max-w-[200px] truncate text-neutral-400 text-xs">{req.issue_description}</td>
                      <td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[req.priority]}`}>
                          {req.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${req.status.replace(' ', '')}`}>{req.status}</span>
                      </td>
                      <td className="text-xs text-neutral-400">{new Date(req.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* RAISE REQUEST MODAL                                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showRaiseModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title">Raise Maintenance Request</div>
              <button className="modal-close" onClick={() => setShowRaiseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRaiseSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 text-xs font-semibold p-3.5 rounded-md mb-5">
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Asset Tag</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AF-0012"
                    value={raiseAssetTag}
                    onChange={(e) => setRaiseAssetTag(e.target.value)}
                    required
                    disabled={formLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue Description (min 10 chars)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe the issue in detail..."
                    value={raiseDescription}
                    onChange={(e) => setRaiseDescription(e.target.value)}
                    required
                    minLength={10}
                    disabled={formLoading}
                    rows={4}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <div className="flex gap-3 flex-wrap">
                    {['Low', 'Medium', 'High', 'Critical'].map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value={p}
                          checked={raisePriority === p}
                          onChange={() => setRaisePriority(p)}
                          disabled={formLoading}
                        />
                        <span className={`text-sm font-semibold ${priorityColors[p]} px-2 py-0.5 rounded-full`}>{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Photo URL (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://..."
                    value={raisePhotoUrl}
                    onChange={(e) => setRaisePhotoUrl(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRaiseModal(false)} disabled={formLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* REQUEST DETAIL DRAWER                                             */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showDetailDrawer && detailData && (
        <div className="modal-overlay" onClick={() => setShowDetailDrawer(false)}>
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-[440px] bg-neutral-900 border-l border-neutral-800 p-8 shadow-xl flex flex-col gap-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s ease-out' }}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg text-white">Request #{detailData.id}</h3>
                <span className={`badge badge-${detailData.status.replace(' ', '')}`}>{detailData.status}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[detailData.priority]}`}>{detailData.priority}</span>
              </div>
              <button onClick={() => setShowDetailDrawer(false)} className="text-neutral-400 hover:text-white font-semibold text-lg">✕</button>
            </div>

            {/* Asset section */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Asset</span>
              <span className="font-semibold text-white">{detailData.Asset?.name || detailData.asset_tag}</span>
              <span className="font-mono text-xs text-neutral-500">Tag: {detailData.asset_tag}</span>
              {detailData.Asset?.status && (
                <span className="text-xs text-neutral-400 mt-1">Current Asset Status: <span className={`badge badge-${detailData.Asset.status.replace(' ', '')}`}>{detailData.Asset.status}</span></span>
              )}
            </div>

            {/* Request section */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Issue Description</span>
              <p className="text-sm text-neutral-300 bg-neutral-950 p-3 rounded-md border border-neutral-800">{detailData.issue_description}</p>
            </div>

            {detailData.photo_url && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Photo</span>
                <img src={detailData.photo_url} alt="Issue" className="w-full rounded-md border border-neutral-800 max-h-48 object-cover" />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Raised By</span>
              <span className="text-sm text-white">{detailData.RaisedBy?.name || 'User'}</span>
              <span className="text-xs text-neutral-500">{new Date(detailData.created_at).toLocaleString()}</span>
            </div>

            {/* Technician section */}
            {detailData.technician_name && (
              <div className="flex flex-col gap-1 bg-orange-500/5 border border-orange-500/20 p-3 rounded-md">
                <span className="text-[10px] text-orange-400 uppercase font-semibold tracking-wider">Assigned Technician</span>
                <span className="text-sm text-white font-semibold">{detailData.technician_name}</span>
              </div>
            )}

            {/* Timeline section */}
            {detailData.timeline && detailData.timeline.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">Timeline</span>
                <div className="space-y-3 border-l-2 border-neutral-800 pl-4">
                  {detailData.timeline.map((log, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-700 border-2 border-neutral-900"></div>
                      <div className="text-xs text-neutral-400">{log.User?.name || 'System'} — {new Date(log.created_at).toLocaleString()}</div>
                      <div className="text-xs text-neutral-300 mt-0.5">{log.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {isManager && (
              <div className="border-t border-neutral-800 pt-5 mt-auto flex flex-col gap-2.5">
                {detailData.status === 'Pending' && (
                  <>
                    <button className="btn btn-primary w-full" onClick={() => handleApprove(detailData.id)}>
                      Approve Request
                    </button>
                    <button
                      className="btn btn-danger w-full"
                      onClick={() => {
                        setActiveRequest(detailData);
                        setRejectReason('');
                        setShowRejectModal(true);
                      }}
                    >
                      Reject Request
                    </button>
                  </>
                )}

                {detailData.status === 'Approved' && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => {
                      setActiveRequest(detailData);
                      setTechName('');
                      setTechNotes('');
                      setShowTechModal(true);
                    }}
                  >
                    Assign Technician & Start Work
                  </button>
                )}

                {detailData.status === 'In Progress' && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => {
                      setActiveRequest(detailData);
                      setShowResolveConfirm(true);
                    }}
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* REJECT REASON MODAL                                               */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Reject Maintenance Request</div>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Rejection Reason (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Provide reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Confirm Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TECHNICIAN ASSIGNMENT MODAL                                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showTechModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Assign Technician & Start Work</div>
              <button className="modal-close" onClick={() => setShowTechModal(false)}>✕</button>
            </div>
            <form onSubmit={handleStartSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Technician Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Name of internal/external technician"
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Any additional instructions..."
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTechModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Assign & Start</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* RESOLVE CONFIRMATION MODAL                                        */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {showResolveConfirm && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Resolve Maintenance Request</div>
              <button className="modal-close" onClick={() => setShowResolveConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-neutral-300">
                Mark this maintenance request as resolved? The asset status will be automatically restored
                to <strong className="text-white">Allocated</strong> (if an active allocation exists) or <strong className="text-white">Available</strong>.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResolveConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResolve}>Confirm Resolve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
