import React from 'react';

function BottomSheet({ run, onClose, onDelete }) {
  if (!run) return null;

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose}></div>
      <div className="bottom-sheet">
        <div className="drag-handle-container">
          <div className="drag-handle"></div>
        </div>
        
        <div className="sheet-header">
          <div className="sheet-date">{run.date || new Date(run.startTime).toLocaleString()}</div>
          <button className="sheet-close" onClick={onClose}>×</button>
        </div>

        <div className="sheet-body">
          <h2 className="sheet-area">{run.area}</h2>
          <p className="sheet-area-label">Territory Captured</p>

          <div className="stats-row sheet-stats">
            <div className="stat-item">
              <span className="stat-value">{run.distance}</span>
              <span className="stat-label">Distance (km)</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{run.duration}</span>
              <span className="stat-label">Duration</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{run.avgPace}</span>
              <span className="stat-label">Avg Pace</span>
            </div>
          </div>
        </div>

        <button 
          className="delete-run-btn" 
          onClick={() => {
            onDelete(run.id);
            onClose();
          }}
        >
          Delete Run
        </button>
      </div>
    </>
  );
}

export default BottomSheet;
