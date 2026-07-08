import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { EventBinding, LvglEventType } from '../../types';
import EventEditDialog from './EventEditDialog';
import './EventPanel.css';

// LVGL Event type definitions
// eslint-disable-next-line react-refresh/only-export-components
export const LVGL_EVENTS: { type: LvglEventType; label: string; description: string }[] = [
  { type: 'LV_EVENT_CLICKED', label: 'Click', description: 'On click' },
  { type: 'LV_EVENT_PRESSED', label: 'Pressed', description: 'On press' },
  { type: 'LV_EVENT_RELEASED', label: 'Release', description: 'On release' },
  { type: 'LV_EVENT_LONG_PRESSED', label: 'Long press', description: 'On long press' },
  { type: 'LV_EVENT_VALUE_CHANGED', label: 'Value changed', description: 'On value changed' },
  { type: 'LV_EVENT_FOCUSED', label: 'Focus', description: 'On focus' },
  { type: 'LV_EVENT_DEFOCUSED', label: 'Blur', description: 'On blur' },
  { type: 'LV_EVENT_READY', label: 'Ready', description: 'On ready' },
  { type: 'LV_EVENT_CANCEL', label: 'Cancel', description: 'On cancel' },
];

const EventPanel: React.FC = () => {
  const { selection, getComponentById, updateComponent } = useEditorStore();
  const [editingEvent, setEditingEvent] = useState<EventBinding | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedId = selection.selectedIds[0];
  const component = selectedId ? getComponentById(selectedId) : undefined;

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setIsCreating(true);
    setIsDialogOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: EventBinding) => {
    setEditingEvent(event);
    setIsCreating(false);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    if (!selectedId || !component) return;
    const newEvents = component.events.filter(e => e.id !== eventId);
    updateComponent(selectedId, { events: newEvents });
  }, [selectedId, component, updateComponent]);

  const handleSaveEvent = useCallback((event: EventBinding) => {
    if (!selectedId || !component) return;
    
    if (isCreating) {
      // Add new event
      updateComponent(selectedId, { 
        events: [...component.events, event] 
      });
    } else {
      // Update existing event
      const newEvents = component.events.map(e => 
        e.id === event.id ? event : e
      );
      updateComponent(selectedId, { events: newEvents });
    }
    
    setIsDialogOpen(false);
    setEditingEvent(null);
  }, [selectedId, component, updateComponent, isCreating]);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  }, []);

  const getEventLabel = (eventType: LvglEventType): string => {
    const event = LVGL_EVENTS.find(e => e.type === eventType);
    return event?.label || eventType;
  };

  const getHandlerDescription = (event: EventBinding): string => {
    if (event.handlerType === 'custom') {
      return 'Custom code';
    }
    if (event.action) {
      switch (event.action.type) {
        case 'navigate':
          return `Navigate to: ${event.action.targetPage || 'Not set'}`;
        case 'setProperty':
          return `Set property: ${event.action.property || 'Not set'}`;
        case 'show':
          return `Show: ${event.action.targetComponent || 'Not set'}`;
        case 'hide':
          return `Hide: ${event.action.targetComponent || 'Not set'}`;
        case 'enable':
          return `Enable: ${event.action.targetComponent || 'Not set'}`;
        case 'disable':
          return `Disable: ${event.action.targetComponent || 'Not set'}`;
        case 'setText':
          return `Set text: "${event.action.value || ''}"`;
        case 'setValue':
          return `Set value: ${event.action.value ?? 'Not set'}`;
        default:
          return 'Built-in actions';
      }
    }
    return 'Not configured';
  };

  if (!component) {
    return (
      <div className="event-panel">
        <div className="panel-header">
          <h3>Events</h3>
        </div>
        <div className="no-selection">
          <p>No component selected</p>
          <p className="hint">Select a component to add events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-panel">
      <div className="panel-header">
        <h3>Events</h3>
        <button className="add-event-btn" onClick={handleAddEvent} title="Add event">
          <span>+</span>
        </button>
      </div>

      <div className="event-list">
        {component.events.length === 0 ? (
          <div className="no-events">
            <p>No events</p>
            <button className="add-first-event" onClick={handleAddEvent}>
              + Add event
            </button>
          </div>
        ) : (
          component.events.map(event => (
            <div key={event.id} className="event-item">
              <div className="event-info" onClick={() => handleEditEvent(event)}>
                <div className="event-type">
                  <span className="event-icon">⚡</span>
                  {getEventLabel(event.eventType)}
                </div>
                <div className="event-handler">
                  {getHandlerDescription(event)}
                </div>
              </div>
              <div className="event-actions">
                <button 
                  className="event-edit-btn" 
                  onClick={() => handleEditEvent(event)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button 
                  className="event-delete-btn" 
                  onClick={() => handleDeleteEvent(event.id)}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isDialogOpen && (
        <EventEditDialog
          event={editingEvent}
          isCreating={isCreating}
          onSave={handleSaveEvent}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
};

export default EventPanel;
