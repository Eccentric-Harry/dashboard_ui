import { learningLogs } from '../../../dashboard/quantified-self-dashboard/learning-data'
import { mockTasksData } from '../../../dashboard/quantified-self-dashboard/data'

export function LearningDetailsCard({ selectedDate }: { selectedDate: string }) {
  const logsForDate = learningLogs.filter(log => log.date === selectedDate)

  const dayOfMonth = new Date(selectedDate).toString() !== 'Invalid Date' ? new Date(selectedDate).getDate() : null
  const tasksForDate = dayOfMonth && mockTasksData[dayOfMonth] ? mockTasksData[dayOfMonth] : []

  const formattedDate = new Date(selectedDate).toString() !== 'Invalid Date'
    ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : selectedDate

  return (
    <div className="learning-details-card" style={{ background: 'transparent', border: 'none', padding: '0 24px', marginTop: '-4px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#101312', marginBottom: '24px' }}>
        Activity for {formattedDate}
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Learning Logs Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#101312', marginBottom: '16px' }}>
            Learnings
          </h3>
          {logsForDate.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logsForDate.map((log, idx) => (
                <div key={idx} style={{ 
                  padding: '16px 20px', 
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '11px', color: '#106c3d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {log.category}
                    </span>
                    <span style={{ fontSize: '11px', color: '#526057', fontWeight: 500 }}>
                      Intensity: {log.intensity}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, color: '#333b37', margin: 0 }}>
                    {log.topic}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#526057', fontStyle: 'italic', fontSize: '14px', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '16px' }}>
              No learning data logged for this date.
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#101312', marginBottom: '16px' }}>
            Tasks
          </h3>
          {tasksForDate.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasksForDate.map((task, idx) => (
                <div key={idx} style={{ 
                  padding: '16px 20px', 
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#526057', width: '70px' }}>
                    {task.time}
                  </span>
                  <span style={{ fontSize: '14px', color: '#101312', fontWeight: 500 }}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#526057', fontStyle: 'italic', fontSize: '14px', padding: '16px 20px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '16px' }}>
              No tasks scheduled for this date.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
