import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, peekCache } from "../../api/axios";
import { fmtDate } from "../../utils/formErrors";
import Swal from "sweetalert2";

const ICON = "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z";

export default function PlanningCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      // Fetch meetings
      const meetingsRes = await get('/meetings', { 
        params: { 
          start_date: `${year}-${month.toString().padStart(2, '0')}-01`,
          end_date: `${year}-${month.toString().padStart(2, '0')}-31`
        } 
      });
      const meetings = meetingsRes.data?.data || meetingsRes.data || [];
      
      // Fetch plans with their items
      const plansRes = await get('/planning/plans');
      const plans = plansRes.data?.data || plansRes.data || [];
      
      // Convert plans to calendar events
      const planEvents = plans.flatMap(plan => {
        if (plan.start_date) {
          return {
            id: `plan-${plan.id}`,
            title: plan.title || 'Plan',
            type: 'plan',
            date: plan.start_date,
            status: plan.status,
            description: plan.description || '',
            data: plan
          };
        }
        return [];
      });

      // Convert meetings to calendar events
      const meetingEvents = meetings.map(meeting => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title || 'Meeting',
        type: 'meeting',
        date: meeting.start_time ? meeting.start_time.split('T')[0] : null,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        location: meeting.location,
        status: meeting.status,
        description: meeting.description || '',
        data: meeting
      }));

      setEvents([...planEvents, ...meetingEvents].filter(e => e.date));
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDay = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const handleDayClick = (date) => {
    if (!date) return;
    const dayEvents = getEventsForDay(date);
    setSelectedDay(date);
    setShowModal(true);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleEditEvent = async (event) => {
    if (event.type === 'meeting') {
      navigate(`/hr/meetings/edit/${event.data.id}`);
    } else if (event.type === 'plan') {
      navigate(`/planning/plans/show/${event.data.id}`);
    }
    setShowModal(false);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = getDaysInMonth(currentDate);

  const getEventColor = (type) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'plan': return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planning Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your planned meetings and events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={handlePreviousMonth}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 bg-gray-50">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDay(date) : [];
              const isToday = date && new Date().toDateString() === date.toDateString();
              
              return (
                <div
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-2 cursor-pointer transition-colors ${
                    !date ? 'bg-gray-50' : 'hover:bg-gray-50'
                  } ${isToday ? 'bg-teal-50/50' : ''}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-teal-600 font-bold' : 'text-gray-700'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => handleEventClick(event, e)}
                            className={`px-2 py-1 rounded text-[10px] font-medium truncate border ${getEventColor(event.type)}`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-500 font-medium">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showModal && selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {fmtDate(selectedDay)}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedDay.toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedDay(null);
                  setEditingEvent(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {editingEvent ? (
                <div>
                  <div className="mb-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getEventColor(editingEvent.type)}`}>
                      {editingEvent.type === 'meeting' ? 'Meeting' : 'Plan'}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-2">{editingEvent.title}</h4>
                  {editingEvent.description && (
                    <p className="text-sm text-gray-600 mb-4">{editingEvent.description}</p>
                  )}
                  {editingEvent.startTime && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Time:</span> {new Date(editingEvent.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {editingEvent.endTime && ` - ${new Date(editingEvent.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  )}
                  {editingEvent.location && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Location:</span> {editingEvent.location}
                    </div>
                  )}
                  {editingEvent.status && (
                    <div className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">Status:</span> {editingEvent.status}
                    </div>
                  )}
                  <button
                    onClick={() => handleEditEvent(editingEvent)}
                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
                  >
                    Edit {editingEvent.type === 'meeting' ? 'Meeting' : 'Plan'}
                  </button>
                  <button
                    onClick={() => setEditingEvent(null)}
                    className="w-full px-4 py-2 mt-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Back to all events
                  </button>
                </div>
              ) : (
                <>
                  {getEventsForDay(selectedDay).length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">No events scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getEventsForDay(selectedDay).map((event, idx) => (
                        <div
                          key={idx}
                          onClick={() => setEditingEvent(event)}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${getEventColor(event.type)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-semibold uppercase opacity-70">
                                  {event.type}
                                </span>
                                {event.startTime && (
                                  <span className="text-[10px] opacity-70">
                                    {new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold text-sm">{event.title}</h4>
                              {event.location && (
                                <p className="text-xs opacity-70 mt-1">{event.location}</p>
                              )}
                            </div>
                            <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}