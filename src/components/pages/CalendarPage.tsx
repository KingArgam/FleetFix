import React, { useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';

const CalendarPage: React.FC = () => {
  const { state, getCalendarEvents } = useAppContext();
  const { trucks, maintenance } = state;
  

  const calendarEvents = useMemo(() => getCalendarEvents(), [getCalendarEvents]);
  

  const currentDate = useMemo(() => new Date(), []);
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay()); 
  
  const calendarDays = [];
  const currentCalendarDate = new Date(startDate);
  
  for (let i = 0; i < 42; i++) { 
    calendarDays.push(new Date(currentCalendarDate));
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
  }


  const maintenanceByDate = useMemo(() => {
    const dateMap: { [key: string]: typeof calendarEvents } = {};
    
  calendarEvents?.forEach((event: any) => {
      const dateKey = new Date(event.date).toDateString();
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = [];
      }
      dateMap[dateKey].push(event);
    });
    
    return dateMap;
  }, [calendarEvents]);


  const upcomingMaintenance = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return calendarEvents
  ?.filter((event: any) => {
        const entryDate = new Date(event.date);
        return entryDate >= currentDate && entryDate <= thirtyDaysFromNow;
      })
  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, 10); 
  }, [calendarEvents, currentDate]);



  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar-page">
      <div className="page-header">
        <h1>Maintenance Calendar</h1>
        <p className="text-gray-600">
          {monthNames[currentMonth]} {currentYear}
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="calendar-view">
            
            <div className="calendar-header">
              {dayNames.map(day => (
                <div key={day} className="calendar-day-header">
                  {day}
                </div>
              ))}
            </div>
            
            
            <div className="calendar-grid">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isToday = day.toDateString() === currentDate.toDateString();
                const dayMaintenance = maintenanceByDate[day.toDateString()] || [];
                
                return (
                  <div 
                    key={index} 
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div className="day-number">{day.getDate()}</div>
                    {dayMaintenance.length > 0 && (
                      <div className="maintenance-indicators">
                        {dayMaintenance.slice(0, 3).map((event: any, idx: number) => {
                          return (
                            <div 
                              key={idx}
                              className="maintenance-dot"
                              title={`${event.title} - ${event.truckInfo || 'Unknown Truck'}`}
                            >
                              🔧
                            </div>
                          );
                        })}
                        {dayMaintenance.length > 3 && (
                          <div className="maintenance-more">+{dayMaintenance.length - 3}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">Upcoming Maintenance</h3>
        </div>
        <div className="card-body">
          {upcomingMaintenance && upcomingMaintenance.length > 0 ? (
            <div className="upcoming-maintenance-list">
              {upcomingMaintenance.map((entry: any) => {
                const truck = trucks?.find((t: any) => t.id === entry.truckId);
                const entryDate = new Date(entry.date);
                
                return (
                  <div key={entry.id} className="maintenance-reminder">
                    <div className="reminder-date">
                      {entryDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="reminder-details">
                      <strong>{entry.type}</strong> - {truck?.nickname || truck?.licensePlate || 'Unknown Truck'}
                      <div className="reminder-info">
                        {entry.notes && <span>{entry.notes}</span>}
                        {entry.cost > 0 && <span className="cost-info">${entry.cost}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No upcoming maintenance scheduled</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
