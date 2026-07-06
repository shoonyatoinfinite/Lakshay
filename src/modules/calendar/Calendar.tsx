import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  timeStart?: string;
  timeEnd?: string;
  description?: string;
  color?: string;
}

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Modal / Add event states
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventColor, setEventColor] = useState('#00c3ff');

  const loadEvents = async () => {
    try {
      const data = await db.getAll('events');
      setEvents(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayIndex = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1; // Align to Monday start
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayIndex(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const formattedDate = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    setShowEventModal(true);
    setEventTitle('');
    setEventStart('');
    setEventEnd('');
    setEventDesc('');
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim() || !selectedDate) return;

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: eventTitle,
      date: selectedDate,
      timeStart: eventStart || undefined,
      timeEnd: eventEnd || undefined,
      description: eventDesc || undefined,
      color: eventColor
    };

    try {
      await db.put('events', newEvent);
      await loadEvents();
      setShowEventModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await db.delete('events', id);
      await loadEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  // Generate grid cells
  const calendarCells = [];
  
  // Empty slots for previous month offset
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-day empty" style={{ border: '1px solid var(--glass-border)', opacity: 0.2 }} />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDate(day);
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    calendarCells.push(
      <div
        key={`day-${day}`}
        className={`calendar-day ${isToday ? 'today' : ''}`}
        style={{
          border: '1px solid var(--glass-border)',
          minHeight: '80px',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          background: isToday ? 'rgba(var(--accent-color-rgb), 0.08)' : 'transparent',
          position: 'relative'
        }}
        onClick={() => handleDayClick(day)}
      >
        <span style={{ fontSize: '11px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--accent-color)' : 'inherit' }}>
          {day}
        </span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', overflowY: 'auto' }}>
          {dayEvents.map(e => (
            <div
              key={e.id}
              onClick={(event) => {
                event.stopPropagation();
                if (confirm(`Event: ${e.title}\nDescription: ${e.description || 'None'}\n\nDelete this event?`)) {
                  handleDeleteEvent(e.id);
                }
              }}
              style={{
                fontSize: '9px',
                padding: '2px 4px',
                borderRadius: '3px',
                background: e.color || 'var(--accent-color)',
                color: '#000',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              title={e.title}
            >
              <span>{e.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="module-container">
      {/* Month Picker Header */}
      <div className="module-header">
        <div>
          <h2 style={{ fontSize: '18px' }}>
            📅 {currentDate.toLocaleString('default', { month: 'long' })} {year}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={prevMonth}>◀ Prev</button>
          <button className="btn" onClick={() => setCurrentDate(new Date())}>Today</button>
          <button className="btn" onClick={nextMonth}>Next ▶</button>
        </div>
      </div>

      <div className="module-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
        {/* Day labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }}>
          {weekdays.map(d => (
            <div key={d} style={{ padding: '4px' }}>{d}</div>
          ))}
        </div>

        {/* Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
          {calendarCells}
        </div>
      </div>

      {/* Add Event Modal overlay */}
      {showEventModal && (
        <div className="launcher-overlay" onClick={() => setShowEventModal(false)}>
          <div className="launcher-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
              Add Event for {selectedDate}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Event Title</label>
                <input
                  type="text"
                  className="input-field"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Exam prep, Group meeting"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Start Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>End Time</label>
                  <input
                    type="time"
                    className="input-field"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  placeholder="Details, link bookmarks, etc."
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Theme Tag Color</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#00c3ff', '#10b981', '#f59e0b', '#ef4444', '#7b2cbf'].map(c => (
                    <div
                      key={c}
                      onClick={() => setEventColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: c,
                        cursor: 'pointer',
                        border: eventColor === c ? '2px solid #fff' : '2px solid transparent'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn" onClick={() => setShowEventModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveEvent}>Save Event</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


