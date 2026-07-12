import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

export function Bookings() {
  const navigate = useNavigate();
  const { assetTag } = useParams();
  const { pathname } = useLocation();
  const currentRole = useAuthStore((s) => s.currentRole);
  const user = useAuthStore((s) => s.user);

  // Active view determination
  let view = 'resources';
  if (pathname.includes('/approvals')) {
    view = 'approvals';
  } else if (pathname.includes('/my')) {
    view = 'my';
  } else if (assetTag) {
    view = 'calendar';
  }

  // Common lists states
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch base categories, departments, and members metadata
  const fetchMetadata = async () => {
    try {
      const { data: cats } = await api.get('/categories');
      setCategories(cats);
      const { data: depts } = await api.get('/departments');
      setDepartments(depts);
      
      const isManager = ['Admin', 'Asset Manager'].includes(currentRole);
      if (isManager) {
        const { data: membersList } = await api.get('/org/members');
        setOrgMembers(membersList);
        
        // Fetch pending count for badges
        const { data: pendingList } = await api.get('/bookings/approvals');
        setPendingCount(pendingList.length);
      }
    } catch (err) {
      console.error('Error fetching bookings metadata:', err);
    } finally {
      setMetaLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [currentRole]);

  // ----------------------------------------------------
  // VIEW 1: RESOURCE SELECTION STATE & METHODS
  // ----------------------------------------------------
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  
  const fetchResources = async () => {
    if (view !== 'resources') return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (catFilter) params.append('category_id', catFilter);
      const { data } = await api.get(`/bookings/resources?${params.toString()}`);
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [view, search, catFilter]);

  // ----------------------------------------------------
  // VIEW 2: CALENDAR VIEW STATE & METHODS
  // ----------------------------------------------------
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('day'); // 'day' or 'week'
  const [activeAsset, setActiveAsset] = useState(null);
  const [bookings, setBookings] = useState([]);
  
  // Modals / Drawer toggles
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  
  // Form values
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [bookingBookedFor, setBookingBookedFor] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchCalendarBookings = async () => {
    if (view !== 'calendar' || !assetTag) return;
    try {
      // Load selected asset details
      const { data: assetData } = await api.get(`/assets/${assetTag}`);
      setActiveAsset(assetData);

      // Determine date boundary
      const startBound = new Date(selectedDate);
      startBound.setHours(0, 0, 0, 0);
      const endBound = new Date(selectedDate);
      if (calendarMode === 'week') {
        endBound.setDate(endBound.getDate() + 6);
      }
      endBound.setHours(23, 59, 59, 999);

      const { data } = await api.get(`/bookings`, {
        params: {
          asset_tag: assetTag,
          date_from: startBound.toISOString(),
          date_to: endBound.toISOString()
        }
      });
      setBookings(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCalendarBookings();
  }, [view, assetTag, selectedDate, calendarMode]);

  // Adjust dates helper
  const handlePrevDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (calendarMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (calendarMode === 'week' ? 7 : 1));
    setSelectedDate(d);
  };

  // Calendar click handlers
  const handleSlotClick = (date, hour) => {
    if (activeAsset?.status === 'Under Maintenance') return;
    
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);

    // Format for datetime-local input fields (YYYY-MM-DDTHH:MM)
    const formatDateTimeLocal = (d) => {
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      return local.toISOString().slice(0, 16);
    };

    setBookingStart(formatDateTimeLocal(start));
    setBookingEnd(formatDateTimeLocal(end));
    setBookingBookedFor(user?.name || '');
    setBookingNote('');
    setFormError('');
    setShowBookingModal(true);
  };

  const handleBookingClick = (booking, e) => {
    e.stopPropagation();
    setActiveBooking(booking);
    setShowDetailDrawer(true);
  };

  // ----------------------------------------------------
  // SUBMISSIONS & LIFECYCLE TRANSITIONS HELPERS
  // ----------------------------------------------------
  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await api.post('/bookings', {
        asset_tag: assetTag,
        start_time: new Date(bookingStart).toISOString(),
        end_time: new Date(bookingEnd).toISOString(),
        booked_for: bookingBookedFor,
        booked_for_note: bookingNote
      });
      setShowBookingModal(false);
      fetchCalendarBookings();
      fetchMetadata(); // update count badges
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Error requesting booking.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleApproveBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to approve this request?')) return;
    try {
      await api.patch(`/bookings/${bookingId}/approve`);
      setShowDetailDrawer(false);
      fetchCalendarBookings();
      fetchPendingRequests();
      fetchMetadata();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || err.message);
    }
  };

  const handleRejectBookingSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    try {
      await api.patch(`/bookings/${activeBooking.id}/reject`, { reason: rejectionReason });
      setShowRejectModal(false);
      setRejectionReason('');
      setShowDetailDrawer(false);
      fetchCalendarBookings();
      fetchPendingRequests();
      fetchMetadata();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleWithdrawRequest = async (bookingId) => {
    if (!window.confirm('Are you sure you want to withdraw your booking request?')) return;
    try {
      await api.patch(`/bookings/${bookingId}/withdraw`);
      setShowDetailDrawer(false);
      fetchCalendarBookings();
      fetchMyBookingsList();
      fetchMetadata();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      setShowDetailDrawer(false);
      fetchCalendarBookings();
      fetchMyBookingsList();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.patch(`/bookings/${activeBooking.id}/reschedule`, {
        start_time: new Date(bookingStart).toISOString(),
        end_time: new Date(bookingEnd).toISOString()
      });
      setShowRescheduleModal(false);
      setShowDetailDrawer(false);
      fetchCalendarBookings();
      fetchMyBookingsList();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.message || err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const openRescheduleModal = () => {
    const formatDateTimeLocal = (dStr) => {
      const d = new Date(dStr);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60 * 1000);
      return local.toISOString().slice(0, 16);
    };

    setBookingStart(formatDateTimeLocal(activeBooking.start_time));
    setBookingEnd(formatDateTimeLocal(activeBooking.end_time));
    setFormError('');
    setShowRescheduleModal(true);
  };

  // ----------------------------------------------------
  // VIEW 5: APPROVAL QUEUE STATE & METHODS
  // ----------------------------------------------------
  const [approvalsQueue, setApprovalsQueue] = useState([]);
  
  const fetchPendingRequests = async () => {
    if (view !== 'approvals') return;
    setLoading(true);
    try {
      const { data } = await api.get('/bookings/approvals');
      setApprovalsQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, [view]);

  // ----------------------------------------------------
  // VIEW 7: MY RESERVATIONS LIST STATE & METHODS
  // ----------------------------------------------------
  const [myBookings, setMyBookings] = useState([]);

  const fetchMyBookingsList = async () => {
    if (view !== 'my') return;
    setLoading(true);
    try {
      const { data } = await api.get('/bookings/my');
      setMyBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookingsList();
  }, [view]);

  // ----------------------------------------------------
  // CALENDAR DRAW POSITIONS MATHEMATICS HELPER
  // ----------------------------------------------------
  const getBookingLayoutStyles = (booking) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    
    const dayStartMinutes = 6 * 60; // 06:00
    const dayEndMinutes = 22 * 60;   // 22:00
    const totalMinutes = dayEndMinutes - dayStartMinutes; // 960

    const startMinutes = (start.getHours() * 60 + start.getMinutes()) - dayStartMinutes;
    const duration = (end.getTime() - start.getTime()) / 60000;

    // Constrain to grid boundaries safely
    const top = Math.max(0, (startMinutes / totalMinutes) * 100);
    const height = Math.min(100 - top, (duration / totalMinutes) * 100);

    return {
      top: `${top}%`,
      height: `${height}%`,
      position: 'absolute',
      left: '4px',
      right: '4px',
      zIndex: 2
    };
  };

  // Generate days array for Week View
  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);
    // Align to the start of the week (Monday)
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    current.setDate(diff);

    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  // Generate hours array (06:00 - 22:00)
  const calendarHours = Array.from({ length: 17 }, (_, i) => 6 + i);

  const isApprover = ['Admin', 'Asset Manager'].includes(currentRole);

  return (
    <div className="p-8 flex flex-col flex-1 overflow-y-auto">
      {/* Tab Navigation header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-5 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => navigate('/bookings')}
            className={`pb-3 font-semibold text-sm relative ${view === 'resources' || view === 'calendar' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-neutral-400 hover:text-white'}`}
          >
            Browse Shared Resources
          </button>
          <button
            onClick={() => navigate('/bookings/my')}
            className={`pb-3 font-semibold text-sm relative ${view === 'my' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-neutral-400 hover:text-white'}`}
          >
            My Reservations
          </button>
          {isApprover && (
            <button
              onClick={() => navigate('/bookings/approvals')}
              className={`pb-3 font-semibold text-sm relative flex items-center gap-1.5 ${view === 'approvals' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-neutral-400 hover:text-white'}`}
            >
              Pending Approvals
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-neutral-950 font-bold text-xs rounded-full px-2 py-0.5">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* VIEW 1: RESOURCE SELECTION */}
      {/* ---------------------------------------------------- */}
      {view === 'resources' && (
        <>
          {/* Filters Panel */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Search</label>
              <input
                type="text"
                placeholder="Search resources by name or tag..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3.5 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Category Filter</label>
              <select
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3.5 py-2 text-sm text-white focus:border-primary-500 focus:outline-none"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Resources Grid */}
          {loading ? (
            <div className="text-center py-12 text-neutral-400">Loading bookable resources...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400">
              No shared resources registered in the workspace.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map(res => {
                const isMaint = res.status === 'Under Maintenance';
                return (
                  <div
                    key={res.tag}
                    onClick={() => navigate(`/bookings/${res.tag}`)}
                    className={`bg-neutral-900 border border-neutral-800 rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:border-neutral-500 flex flex-col gap-3.5 ${isMaint ? 'opacity-70 border-amber-500/30' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs text-neutral-400">{res.tag}</span>
                        <h3 className="font-semibold text-base text-white mt-1">{res.name}</h3>
                      </div>
                      <span className={`badge badge-${res.status.replace(' ', '')}`}>{res.status}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Category:</span>
                      <span className="font-medium text-white">{res.Category?.name || 'Unassigned'}</span>
                    </div>

                    <div className="border-t border-neutral-800/80 pt-3 mt-auto flex justify-between items-center text-xs">
                      <span className="text-neutral-400">Availability:</span>
                      <span className={`font-semibold ${res.next_booking_indicator.startsWith('Free') ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {res.next_booking_indicator}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 2: CALENDAR VIEW */}
      {/* ---------------------------------------------------- */}
      {view === 'calendar' && (
        <div className="flex flex-col flex-1">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-neutral-400">{activeAsset?.tag}</span>
                <span className={`badge badge-${activeAsset?.status.replace(' ', '')}`}>{activeAsset?.status}</span>
              </div>
              <h2 className="font-bold text-xl text-white mt-1">{activeAsset?.name}</h2>
              <p className="text-xs text-neutral-400 mt-1">Category: {activeAsset?.Category?.name || 'Shared'}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/bookings')} className="btn btn-secondary py-2 text-xs">
                Back to Resources
              </button>
              
              <button
                onClick={() => {
                  setBookingStart('');
                  setBookingEnd('');
                  setBookingBookedFor(user?.name || '');
                  setBookingNote('');
                  setFormError('');
                  setShowBookingModal(true);
                }}
                disabled={activeAsset?.status === 'Under Maintenance'}
                className="btn btn-primary py-2 text-xs"
              >
                New Booking
              </button>
            </div>
          </div>

          {activeAsset?.status === 'Under Maintenance' && (
            <div className="bg-amber-500/10 border border-amber-500 text-amber-400 rounded-xl p-4 mb-6 text-sm font-semibold">
              Warning: This resource is currently under maintenance. New bookings cannot be approved or scheduled.
            </div>
          )}

          {/* Calendar controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <button onClick={handlePrevDate} className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 p-2 rounded-md">
                ◀
              </button>
              <span className="font-semibold text-sm text-white px-3">
                {calendarMode === 'day' 
                  ? selectedDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : `Week of ${getWeekDays()[0].toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                }
              </span>
              <button onClick={handleNextDate} className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 p-2 rounded-md">
                ▶
              </button>
            </div>

            <div className="flex bg-neutral-900 border border-neutral-800 rounded-md p-1">
              <button
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm ${calendarMode === 'day' ? 'bg-primary-600 text-white' : 'text-neutral-400'}`}
                onClick={() => setCalendarMode('day')}
              >
                Day
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm ${calendarMode === 'week' ? 'bg-primary-600 text-white' : 'text-neutral-400'}`}
                onClick={() => setCalendarMode('week')}
              >
                Week
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 min-h-[500px] border border-neutral-800 rounded-xl bg-neutral-950 flex flex-col overflow-x-auto">
            {calendarMode === 'day' ? (
              /* Day View Grid */
              <div className="flex flex-col flex-1 min-w-[600px] relative">
                {/* Time slot rows */}
                {calendarHours.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => handleSlotClick(selectedDate, hour)}
                    className="flex border-b border-neutral-900 h-16 cursor-pointer hover:bg-neutral-900/40 relative"
                  >
                    <div className="w-16 border-r border-neutral-900 text-xs font-semibold text-neutral-400 p-2 select-none">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <div className="flex-1"></div>
                  </div>
                ))}

                {/* Absolute positioned booking blocks */}
                {bookings.map((booking) => {
                  const borderStyle = booking.status === 'Pending Approval' ? 'border-2 border-dashed border-amber-500 bg-amber-500/5' : '';
                  const glowStyle = booking.status === 'Ongoing' ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-500/20' : '';
                  
                  let bgColor = 'bg-primary-600/30 border-l-4 border-primary-500';
                  if (booking.status === 'Ongoing') bgColor = 'bg-orange-500/20 border-l-4 border-orange-500';
                  if (booking.status === 'Completed') bgColor = 'bg-neutral-700/20 border-l-4 border-neutral-500 text-neutral-400';
                  if (booking.status === 'Pending Approval') bgColor = 'bg-amber-500/10';

                  return (
                    <div
                      key={booking.id}
                      style={getBookingLayoutStyles(booking)}
                      onClick={(e) => handleBookingClick(booking, e)}
                      className={`rounded-md p-2.5 overflow-hidden flex flex-col text-xs cursor-pointer select-none transition-all hover:brightness-110 ${bgColor} ${borderStyle} ${glowStyle}`}
                    >
                      <div className="font-semibold text-white truncate">{booking.BookedBy?.name || 'Requester'}</div>
                      <div className="text-neutral-300 truncate mt-0.5">{booking.booked_for}</div>
                      <div className="font-mono text-[10px] text-neutral-400 mt-auto">
                        {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Week View Grid */
              <div className="flex flex-col flex-1 min-w-[900px]">
                <div className="flex border-b border-neutral-800 bg-neutral-900/50">
                  <div className="w-16 border-r border-neutral-800"></div>
                  {getWeekDays().map((day) => (
                    <div key={day.toISOString()} className="flex-1 text-center py-3 text-xs font-semibold border-r border-neutral-800">
                      <div>{day.toLocaleDateString([], { weekday: 'short' })}</div>
                      <div className="text-neutral-400 mt-1">{day.getDate()}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-1 relative" style={{ height: '700px' }}>
                  {/* Hours axis labels */}
                  <div className="w-16 border-r border-neutral-800 flex flex-col relative h-full">
                    {calendarHours.map((hour, idx) => (
                      <div
                        key={hour}
                        style={{
                          position: 'absolute',
                          top: `${(idx / calendarHours.length) * 100}%`,
                          left: 0,
                          right: 0,
                          height: `${100 / calendarHours.length}%`,
                          padding: '6px',
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          borderBottom: '1px solid var(--border-color)'
                        }}
                      >
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day Grid columns */}
                  {getWeekDays().map((day) => {
                    const dayBookings = bookings.filter(b => new Date(b.start_time).toDateString() === day.toDateString());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className="flex-1 border-r border-neutral-850 h-full relative cursor-pointer hover:bg-neutral-900/10"
                        onClick={() => handleSlotClick(day, 9)}
                      >
                        {/* Hour cells guides */}
                        {calendarHours.map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              position: 'absolute',
                              top: `${(idx / calendarHours.length) * 100}%`,
                              left: 0,
                              right: 0,
                              height: `${100 / calendarHours.length}%`,
                              borderBottom: '1px solid rgba(255,255,255,0.02)'
                            }}
                          ></div>
                        ))}

                        {/* Rendering blocks */}
                        {dayBookings.map((booking) => {
                          const borderStyle = booking.status === 'Pending Approval' ? 'border border-dashed border-amber-500 bg-amber-500/5' : '';
                          const glowStyle = booking.status === 'Ongoing' ? 'ring-1 ring-orange-500 shadow-md shadow-orange-500/20' : '';
                          
                          let bgColor = 'bg-primary-600/30 border-l-2 border-primary-500';
                          if (booking.status === 'Ongoing') bgColor = 'bg-orange-500/20 border-l-2 border-orange-500';
                          if (booking.status === 'Completed') bgColor = 'bg-neutral-700/20 border-l-2 border-neutral-500 text-neutral-400';
                          if (booking.status === 'Pending Approval') bgColor = 'bg-amber-500/10';

                          return (
                            <div
                              key={booking.id}
                              style={getBookingLayoutStyles(booking)}
                              onClick={(e) => handleBookingClick(booking, e)}
                              className={`rounded-md p-1.5 overflow-hidden flex flex-col text-[10px] cursor-pointer select-none transition-all hover:brightness-110 ${bgColor} ${borderStyle} ${glowStyle}`}
                            >
                              <div className="font-semibold text-white truncate">{booking.BookedBy?.name || 'Requester'}</div>
                              <div className="font-mono text-[9px] text-neutral-400 mt-auto">
                                {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Color Code Legend */}
          <div className="flex flex-wrap gap-4 mt-6 text-xs bg-neutral-900 border border-neutral-800 rounded-xl p-4 justify-center">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm border border-dashed border-amber-500 bg-amber-500/10"></span>
              <span className="text-neutral-400">Pending Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-primary-600/40 border-l-2 border-primary-500"></span>
              <span className="text-neutral-400">Upcoming</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-orange-500/30 border-l-2 border-orange-500 ring-1 ring-orange-500/50"></span>
              <span className="text-neutral-400">Ongoing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-neutral-700/30 border-l-2 border-neutral-500"></span>
              <span className="text-neutral-400">Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 5: APPROVAL QUEUE */}
      {/* ---------------------------------------------------- */}
      {view === 'approvals' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="asset-table w-full">
            <thead>
              <tr>
                <th>Requester</th>
                <th>Resource</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Booked For</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-neutral-400">Loading pending requests queue...</td>
                </tr>
              ) : approvalsQueue.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-neutral-400">No pending approval requests.</td>
                </tr>
              ) : (
                approvalsQueue.map(item => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.BookedBy?.name}</td>
                    <td>
                      <span className="font-mono text-xs">{item.asset_tag}</span>
                      <div className="text-xs text-neutral-400">{item.Asset?.name}</div>
                    </td>
                    <td>{new Date(item.start_time).toLocaleString()}</td>
                    <td>{new Date(item.end_time).toLocaleString()}</td>
                    <td>{item.booked_for}</td>
                    <td className="max-w-[150px] truncate text-neutral-400" title={item.booked_for_note}>
                      {item.booked_for_note || '-'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-primary px-3 py-1.5 text-xs"
                          onClick={() => handleApproveBooking(item.id)}
                          disabled={item.booked_by_user_id === user?.id}
                          title={item.booked_by_user_id === user?.id ? 'Self-approval prevention' : 'Approve slot'}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger px-3 py-1.5 text-xs"
                          onClick={() => {
                            setActiveBooking(item);
                            setRejectionReason('');
                            setShowRejectModal(true);
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 7: MY RESERVATIONS LIST */}
      {/* ---------------------------------------------------- */}
      {view === 'my' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="asset-table w-full">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th>Booked For</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-neutral-400">Loading your reservations...</td>
                </tr>
              ) : myBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-neutral-400">You have no active or historical bookings.</td>
                </tr>
              ) : (
                myBookings.map(item => (
                  <tr key={item.id} className="cursor-pointer hover:bg-neutral-800/40" onClick={(e) => handleBookingClick(item, e)}>
                    <td>
                      <span className="font-mono text-xs">{item.asset_tag}</span>
                      <div className="text-xs text-neutral-400">{item.Asset?.name}</div>
                    </td>
                    <td>{new Date(item.start_time).toLocaleString()}</td>
                    <td>{new Date(item.end_time).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${item.status.replace(' ', '')}`}>{item.status}</span>
                    </td>
                    <td>{item.booked_for}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {item.status === 'Pending Approval' && (
                          <button onClick={() => handleWithdrawRequest(item.id)} className="btn btn-secondary px-3 py-1 text-xs text-neutral-400">
                            Withdraw
                          </button>
                        )}
                        {['Upcoming', 'Ongoing'].includes(item.status) && (
                          <button onClick={() => handleCancelBooking(item.id)} className="btn btn-danger px-3 py-1 text-xs">
                            Cancel
                          </button>
                        )}
                        {item.status === 'Upcoming' && (
                          <button onClick={() => { setActiveBooking(item); openRescheduleModal(); }} className="btn btn-secondary px-3 py-1 text-xs">
                            Reschedule
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: CREATE BOOKING MODAL */}
      {/* ---------------------------------------------------- */}
      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title">Request Resource Booking</div>
              <button className="modal-close" onClick={() => setShowBookingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBookingSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 text-xs font-semibold p-3.5 rounded-md mb-5">
                    {formError}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Resource</label>
                  <input type="text" className="form-input" value={`${activeAsset?.name} (${assetTag})`} disabled />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={bookingStart}
                      onChange={(e) => setBookingStart(e.target.value)}
                      required
                      disabled={formLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      required
                      disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Booked For</label>
                  {currentRole === 'Employee' ? (
                    <input type="text" className="form-input" value={bookingBookedFor} disabled />
                  ) : (
                    <select
                      className="form-select"
                      value={bookingBookedFor}
                      onChange={(e) => setBookingBookedFor(e.target.value)}
                      required
                      disabled={formLoading}
                    >
                      <option value={user?.name}>{user?.name} (Self)</option>
                      {/* Dept Head can book for department */}
                      {currentRole === 'Department Head' && departments.map(d => (
                        <option key={d.id} value={`${d.name} Department`}>{d.name} Department</option>
                      ))}
                      {/* Admin/Manager can select any org member or department */}
                      {['Admin', 'Asset Manager'].includes(currentRole) && (
                        <>
                          <optgroup label="Departments">
                            {departments.map(d => (
                              <option key={d.id} value={`${d.name} Department`}>{d.name} Department</option>
                            ))}
                          </optgroup>
                          <optgroup label="Workspace Members">
                            {orgMembers.map(m => (
                              <option key={m.user_id} value={m.User?.name}>{m.User?.name}</option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Note for Approver (Optional)</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Provide purpose description (e.g. engineering sprint review)..."
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    disabled={formLoading}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)} disabled={formLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 4: BOOKING DETAIL DRAWER */}
      {/* ---------------------------------------------------- */}
      {showDetailDrawer && activeBooking && (
        <div className="modal-overlay" onClick={() => setShowDetailDrawer(false)}>
          <div
            className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-neutral-900 border-l border-neutral-800 p-8 shadow-xl flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideInRight 0.25s ease-out' }}
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h3 className="font-bold text-lg text-white">Booking Reservation</h3>
              <button onClick={() => setShowDetailDrawer(false)} className="text-neutral-400 hover:text-white font-semibold text-lg">✕</button>
            </div>

            <div className="flex flex-col gap-4 text-sm flex-1 overflow-y-auto">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Resource</span>
                <span className="font-medium text-white">{activeBooking.Asset?.name || activeBooking.asset_tag}</span>
                <span className="font-mono text-xs text-neutral-500">Tag: {activeBooking.asset_tag}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Status</span>
                <div>
                  <span className={`badge badge-${activeBooking.status.replace(' ', '')}`}>{activeBooking.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400 uppercase font-semibold">Start</span>
                  <span className="text-white">{new Date(activeBooking.start_time).toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400 uppercase font-semibold">End</span>
                  <span className="text-white">{new Date(activeBooking.end_time).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Booker</span>
                <span className="text-white">{activeBooking.BookedBy?.name || 'Workspace member'}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400 uppercase font-semibold">Booked For</span>
                <span className="text-white">{activeBooking.booked_for}</span>
              </div>

              {activeBooking.booked_for_note && (
                <div className="flex flex-col gap-1 bg-neutral-950 p-3 rounded-md border border-neutral-850">
                  <span className="text-[11px] text-neutral-400 uppercase font-semibold">Note / Purpose</span>
                  <span className="text-neutral-300 mt-1">{activeBooking.booked_for_note}</span>
                </div>
              )}

              {/* Status details */}
              {activeBooking.status === 'Approved' && (
                <div className="text-xs text-neutral-400">
                  Approved by {activeBooking.ApprovedBy?.name || 'Manager'}
                </div>
              )}

              {activeBooking.status === 'Rejected' && (
                <div className="flex flex-col gap-1 bg-red-500/5 p-3 rounded-md border border-red-500/20 text-red-400 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Rejection Reason</span>
                  <span className="mt-1">{activeBooking.rejection_reason || 'No reason provided.'}</span>
                </div>
              )}
            </div>

            {/* Actions panel */}
            <div className="border-t border-neutral-800 pt-5 mt-auto flex flex-col gap-2.5">
              {activeBooking.status === 'Pending Approval' && isApprover && (
                <>
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => handleApproveBooking(activeBooking.id)}
                    disabled={activeBooking.booked_by_user_id === user?.id}
                    title={activeBooking.booked_by_user_id === user?.id ? 'Self-approval prevention' : ''}
                  >
                    Approve Request
                  </button>
                  <button
                    className="btn btn-danger w-full"
                    onClick={() => {
                      setRejectionReason('');
                      setShowRejectModal(true);
                    }}
                  >
                    Reject Request
                  </button>
                </>
              )}

              {activeBooking.status === 'Pending Approval' && activeBooking.booked_by_user_id === user?.id && (
                <button className="btn btn-secondary w-full text-neutral-400" onClick={() => handleWithdrawRequest(activeBooking.id)}>
                  Withdraw Request
                </button>
              )}

              {activeBooking.status === 'Upcoming' && (activeBooking.booked_by_user_id === user?.id || isApprover) && (
                <>
                  <button className="btn btn-secondary w-full" onClick={openRescheduleModal}>
                    Reschedule
                  </button>
                  <button className="btn btn-danger w-full" onClick={() => handleCancelBooking(activeBooking.id)}>
                    Cancel Booking
                  </button>
                </>
              )}

              {activeBooking.status === 'Ongoing' && (activeBooking.booked_by_user_id === user?.id || isApprover) && (
                <button className="btn btn-danger w-full" onClick={() => handleCancelBooking(activeBooking.id)}>
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 5: REJECT REASON MODAL */}
      {/* ---------------------------------------------------- */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Reject Booking Request</div>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRejectBookingSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reason for Rejection</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Provide slot conflict details or alternate suggestion..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Confirm Reject</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 6: RESCHEDULE MODAL */}
      {/* ---------------------------------------------------- */}
      {showRescheduleModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title">Reschedule Booking</div>
              <button className="modal-close" onClick={() => setShowRescheduleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 text-xs font-semibold p-3.5 rounded-md mb-5">
                    {formError}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Resource</label>
                  <input type="text" className="form-input" value={`${activeBooking?.Asset?.name || activeBooking?.asset_tag}`} disabled />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">New Start Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={bookingStart}
                      onChange={(e) => setBookingStart(e.target.value)}
                      required
                      disabled={formLoading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New End Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      required
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRescheduleModal(false)} disabled={formLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>Update Time Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
