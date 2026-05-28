import { useState, useEffect } from "react";
import cgpaService from "../../services/cgpaService";
import { toast } from "react-toastify";

export default function TargetsTab({ onRefresh }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTargets();
  }, []);

  const loadTargets = async () => {
    try {
      const res = await cgpaService.getTargets();
      setTargets(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this target?")) return;
    try {
      await cgpaService.deleteTarget(id);
      toast.success("Target deleted");
      loadTargets();
    } catch (err) {
      toast.error("Failed to delete target");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-surface-800">Academic Goals</h3>
          <p className="text-xs text-surface-500">Set targets and track your progress towards them</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Set Goal
        </button>
      </div>

      {/* Target Form */}
      {showForm && (
        <TargetForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadTargets(); onRefresh(); }}
        />
      )}

      {/* Targets List */}
      {targets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <p className="text-surface-600 font-medium">No goals set yet</p>
          <p className="text-sm text-surface-400 mt-1">Set academic targets to stay motivated and track progress</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targets.map((target) => (
            <TargetCard key={target.id} target={target} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Target Card ───────────────────────────────────────────────────────────────

function TargetCard({ target, onDelete }) {
  const progress = target.progress || { current: 0, target: 0, percentage: 0 };
  const isAchieved = target.is_achieved;

  const typeLabels = { cgpa: "CGPA", sgpa: "SGPA", credits: "Credits" };

  return (
    <div className={`bg-white rounded-xl border p-4 ${isAchieved ? "border-green-200 bg-green-50/30" : "border-surface-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isAchieved ? (
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
          ) : (
            <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-surface-800">
              Target {typeLabels[target.target_type] || target.target_type}: {target.target_value}
            </p>
            {target.target_semester && (
              <p className="text-xs text-surface-500">For Semester {target.target_semester}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(target.id)}
          className="p-1 text-surface-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-surface-500">Progress</span>
          <span className="font-medium text-surface-700">{progress.percentage}%</span>
        </div>
        <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isAchieved ? "bg-green-500" : "bg-primary-500"}`}
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-surface-400 mt-1">
          <span>Current: {progress.current}</span>
          <span>Target: {progress.target}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-surface-400 mt-3 pt-2 border-t border-surface-100">
        {target.deadline && (
          <span>Deadline: {new Date(target.deadline).toLocaleDateString()}</span>
        )}
        {isAchieved && target.achieved_at && (
          <span className="text-green-600 font-medium">
            Achieved {new Date(target.achieved_at).toLocaleDateString()}
          </span>
        )}
        {target.notes && (
          <span className="truncate">{target.notes}</span>
        )}
      </div>
    </div>
  );
}

// ── Target Form ───────────────────────────────────────────────────────────────

function TargetForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    target_type: "cgpa",
    target_value: "",
    target_semester: "",
    deadline: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.target_value) { toast.error("Target value is required"); return; }

    setSaving(true);
    try {
      const payload = {
        target_type: form.target_type,
        target_value: parseFloat(form.target_value),
        target_semester: form.target_semester ? parseInt(form.target_semester) : null,
        deadline: form.deadline || null,
        notes: form.notes,
      };
      await cgpaService.createTarget(payload);
      toast.success("Goal created");
      onSaved();
    } catch (err) {
      toast.error("Failed to create goal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <h4 className="text-sm font-semibold text-surface-800 mb-4">Set New Academic Goal</h4>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Goal Type</label>
          <select
            value={form.target_type}
            onChange={(e) => setForm({ ...form, target_type: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
          >
            <option value="cgpa">Target CGPA</option>
            <option value="sgpa">Target SGPA</option>
            <option value="credits">Target Credits</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Target Value *</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max={form.target_type === "credits" ? "300" : "10"}
            value={form.target_value}
            onChange={(e) => setForm({ ...form, target_value: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
            placeholder={form.target_type === "credits" ? "e.g. 120" : "e.g. 8.5"}
            required
          />
        </div>
        {form.target_type === "sgpa" && (
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">For Semester</label>
            <input
              type="number"
              min="1"
              max="12"
              value={form.target_semester}
              onChange={(e) => setForm({ ...form, target_semester: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
              placeholder="e.g. 5"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Deadline</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
            placeholder="Optional motivation or notes"
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Create Goal"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
