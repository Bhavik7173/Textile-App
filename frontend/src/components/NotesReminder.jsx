// src/components/NotesReminder.jsx
import { useState, useCallback } from 'react';
import { StickyNote, Bell, Check, Trash2, Plus } from 'lucide-react';
import { invoiceBulkAPI, analyticsAPI } from '../services/api';
import { formatDate } from '../utils/formatters';

// Outside component — no cursor loss
function NotesTextarea({ value, onChange }) {
  return (
    <textarea
      className="input h-24 resize-none text-xs"
      placeholder="Add notes, follow-up details, or remarks..."
      value={value}
      onChange={onChange}
    />
  );
}

function ReminderDateInput({ value, onChange }) {
  return (
    <input type="date" className="input text-sm" value={value} onChange={onChange}/>
  );
}

function ReminderNoteInput({ value, onChange }) {
  return (
    <input type="text" className="input text-sm" placeholder="Reminder note (optional)" value={value} onChange={onChange}/>
  );
}

export default function NotesReminder({ invoice, onUpdate }) {
  const [notes, setNotes]         = useState(invoice.notes || '');
  const [notesSaved, setNotesSaved]= useState(false);
  const [remDate, setRemDate]     = useState('');
  const [remNote, setRemNote]     = useState('');
  const [reminders, setReminders] = useState([]);
  const [savingNotes, setSavingNotes] = useState(false);
  const [addingRem, setAddingRem] = useState(false);
  const [showRemForm, setShowRemForm] = useState(false);

  const handleNotesChange   = useCallback((e) => setNotes(e.target.value), []);
  const handleRemDateChange = useCallback((e) => setRemDate(e.target.value), []);
  const handleRemNoteChange = useCallback((e) => setRemNote(e.target.value), []);

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await invoiceBulkAPI.updateNotes(invoice._id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      onUpdate && onUpdate({ ...invoice, notes });
    } catch {} finally { setSavingNotes(false); }
  };

  const addReminder = async () => {
    if (!remDate) return;
    setAddingRem(true);
    try {
      const { data } = await analyticsAPI.createReminder({
        invoiceId:    invoice._id,
        invoiceNo:    invoice.invoiceNo,
        customerName: invoice.billedToLine1,
        amount:       invoice.totalAmount,
        reminderDate: remDate,
        note:         remNote || null,
      });
      setReminders(prev => [...prev, data.reminder]);
      setRemDate(''); setRemNote(''); setShowRemForm(false);
    } catch {} finally { setAddingRem(false); }
  };

  const doneReminder = async (id) => {
    try {
      await analyticsAPI.doneReminder(id);
      setReminders(prev => prev.filter(r => r._id !== id));
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Notes */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote size={14} className="text-amber-500"/>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Notes</p>
        </div>
        <NotesTextarea value={notes} onChange={handleNotesChange}/>
        <button onClick={saveNotes} disabled={savingNotes}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50">
          {notesSaved
            ? <><Check size={12} className="text-green-500"/> Saved!</>
            : <>{savingNotes ? 'Saving...' : 'Save notes'}</>
          }
        </button>
      </div>

      {/* Reminders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-indigo-500"/>
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Reminders</p>
          </div>
          {!showRemForm && (
            <button onClick={() => setShowRemForm(true)}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              <Plus size={12}/> Add
            </button>
          )}
        </div>

        {showRemForm && (
          <div className="bg-indigo-50 rounded-xl p-3 mb-3 space-y-2">
            <ReminderDateInput value={remDate} onChange={handleRemDateChange}/>
            <ReminderNoteInput value={remNote} onChange={handleRemNoteChange}/>
            <div className="flex gap-2">
              <button onClick={addReminder} disabled={addingRem || !remDate}
                className="btn-primary text-xs py-1.5 px-3 flex-1 justify-center">
                <Bell size={12}/> {addingRem ? 'Setting...' : 'Set reminder'}
              </button>
              <button onClick={() => setShowRemForm(false)}
                className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
            </div>
          </div>
        )}

        {reminders.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No reminders set</p>
        ) : (
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r._id} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                <Bell size={12} className="text-amber-500 mt-0.5 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{formatDate(r.reminderDate)}</p>
                  {r.note && <p className="text-xs text-gray-500">{r.note}</p>}
                </div>
                <button onClick={() => doneReminder(r._id)} title="Mark done"
                  className="p-1 rounded hover:bg-green-100 text-green-500 transition-colors">
                  <Check size={12}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
