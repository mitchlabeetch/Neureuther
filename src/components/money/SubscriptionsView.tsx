import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useApp } from '@/lib/store';

interface Subscription {
  id: string;
  name: string;
  paymentDate: string;
  amount: number;
  serviceType: string;
  paidBy: string;
}

interface EditingSub {
  id: string;
  name: string;
  paymentDate: string;
  amount: string;
  serviceType: string;
  paidBy: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(res.statusText);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const SERVICE_TYPES = ['streaming', 'music', 'cloud', 'fitness', 'food', 'other'] as const;
const SERVICE_LABELS: Record<string, string> = {
  streaming: '🎬 Streaming',
  music: '🎵 Music',
  cloud: '☁️ Cloud',
  fitness: '🏋️ Fitness',
  food: '🍕 Food',
  other: '📦 Other',
};

export function SubscriptionsView({ onBack }: { onBack: () => void }) {
  const { state, getUserById } = useApp();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAmount, setNewAmount] = useState('');
  const [newServiceType, setNewServiceType] = useState('other');
  const [newPaidBy, setNewPaidBy] = useState(state.users[0]?.id || '');

  const [editing, setEditing] = useState<EditingSub | null>(null);

  const fetchSubs = useCallback(async () => {
    try {
      const data = await api<Subscription[]>('/api/money/shared-subscriptions');
      setSubs(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const total = subs.reduce((sum, s) => sum + s.amount, 0);

  const handleAdd = async () => {
    if (!newName.trim() || !newAmount || !newPaidBy) return;
    await api('/api/money/shared-subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        name: newName.trim(),
        paymentDate: newPaymentDate,
        amount: parseFloat(newAmount),
        serviceType: newServiceType,
        paidBy: newPaidBy,
      }),
    });
    setNewName('');
    setNewAmount('');
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
    setNewServiceType('other');
    setShowAdd(false);
    fetchSubs();
  };

  const handleDelete = async (id: string) => {
    await api(`/api/money/shared-subscriptions/${id}`, { method: 'DELETE' });
    fetchSubs();
  };

  const startEdit = (s: Subscription) => {
    setEditing({
      id: s.id,
      name: s.name,
      paymentDate: s.paymentDate,
      amount: s.amount.toString(),
      serviceType: s.serviceType,
      paidBy: s.paidBy,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api(`/api/money/shared-subscriptions/${editing.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editing.name,
        paymentDate: editing.paymentDate,
        amount: parseFloat(editing.amount),
        serviceType: editing.serviceType,
        paidBy: editing.paidBy,
      }),
    });
    setEditing(null);
    fetchSubs();
  };

  if (loading) {
    return (
      <div className="px-5 pt-14 pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3">
          <ArrowLeft size={18} /> Back
        </button>
        <p className="text-[#b7c6c2] text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-24">
      <div className="flex items-center justify-between mb-2 animate-fade-in-up">
        <button onClick={onBack} className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium hover:text-[#171e19] transition-colors">
          <ArrowLeft size={18} /> Back
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 rounded-full bg-[#ca0013] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(202,0,19,0.3)] active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-[#171e19] tracking-tight mb-4 animate-fade-in-up">Subscriptions</h2>

      {/* Total Card */}
      <div className="bg-white rounded-[2.5rem] p-6 border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] mb-5 animate-fade-in-up">
        <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em] mb-1">Monthly Total</p>
        <p className="text-4xl font-bold text-[#171e19] tracking-tight">€{total.toFixed(2)}</p>
        <p className="text-sm text-[#b7c6c2] font-medium mt-1">{subs.length} active subscription{subs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-3 animate-fade-in-up">
        <p className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">All Subscriptions</p>
        {subs.length === 0 && (
          <p className="text-sm text-[#b7c6c2] text-center py-8">No subscriptions yet. Tap + to add one.</p>
        )}
        {subs.map(s => {
          const payer = getUserById(s.paidBy);
          const isEditing = editing?.id === s.id;
          return (
            <div key={s.id} className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    value={editing!.name}
                    onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm font-semibold text-[#171e19] bg-white outline-none focus:border-[#ca0013]"
                    placeholder="Name"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editing!.amount}
                      onChange={e => setEditing(prev => prev ? { ...prev, amount: e.target.value } : null)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]"
                      placeholder="Amount"
                    />
                    <input
                      type="date"
                      value={editing!.paymentDate}
                      onChange={e => setEditing(prev => prev ? { ...prev, paymentDate: e.target.value } : null)}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#b7c6c2]/30 text-sm text-[#171e19] bg-white outline-none focus:border-[#ca0013]"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] mb-1.5">Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_TYPES.map(st => (
                        <button
                          key={st}
                          onClick={() => setEditing(prev => prev ? { ...prev, serviceType: st } : null)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            editing!.serviceType === st
                              ? 'bg-[#171e19] text-white'
                              : 'bg-[#eeebe3] text-[#b7c6c2]'
                          }`}
                        >
                          {SERVICE_LABELS[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] mb-1.5">Paid by</p>
                    <div className="flex flex-wrap gap-2">
                      {state.users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setEditing(prev => prev ? { ...prev, paidBy: u.id } : null)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            editing!.paidBy === u.id
                              ? 'bg-[#171e19] text-white'
                              : 'bg-[#eeebe3] text-[#b7c6c2]'
                          }`}
                        >
                          {u.emoji} {u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-2 rounded-full bg-[#ca0013] text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Check size={16} /> Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="py-2 px-4 rounded-full bg-[#eeebe3] text-[#b7c6c2] text-sm font-semibold active:scale-95 transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <span className="text-lg">{SERVICE_LABELS[s.serviceType]?.split(' ')[0] || '📦'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[#171e19] font-semibold text-base truncate">{s.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-[#b7c6c2]">
                        Renews on the {(() => {
                          const day = new Date(s.paymentDate).getDate();
                          const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                          return `${day}${suffix}`;
                        })()}
                      </span>
                      <span className="text-sm font-bold text-[#171e19]">€{s.amount.toFixed(2)}</span>
                    </div>
                    {(() => {
                      const renewalDay = new Date(s.paymentDate).getDate();
                      const today = new Date();
                      let next = new Date(today.getFullYear(), today.getMonth(), renewalDay);
                      if (next < today) next = new Date(today.getFullYear(), today.getMonth() + 1, renewalDay);
                      const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isUrgent = diff <= 3;
                      return (
                        <p className={`text-xs mt-0.5 font-medium ${isUrgent ? 'text-[#ca0013]' : 'text-[#b7c6c2]'}`}>
                          Due in {diff} day{diff !== 1 ? 's' : ''}
                        </p>
                      );
                    })()}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs bg-[#eeebe3] px-2 py-0.5 rounded-full text-[#b7c6c2] font-medium">
                        {SERVICE_LABELS[s.serviceType]}
                      </span>
                      <span className="text-xs text-[#b7c6c2]">
                        Paid by: <span className="font-semibold text-[#171e19]">{payer?.emoji} {payer?.name}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(s)}
                      className="w-9 h-9 rounded-full bg-[#eeebe3] flex items-center justify-center hover:bg-[#b7c6c2]/30 transition-colors"
                    >
                      <Pencil size={15} className="text-[#b7c6c2]" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={15} className="text-[#ca0013]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-6 pb-32 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#171e19]">New Subscription</h3>
              <button onClick={() => setShowAdd(false)} className="w-10 h-10 rounded-full bg-[#eeebe3] flex items-center justify-center">
                <X size={18} className="text-[#b7c6c2]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                  placeholder="e.g. Netflix"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Amount (€)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={newPaymentDate}
                    onChange={e => setNewPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[#b7c6c2]/30 text-[#171e19] bg-white outline-none focus:border-[#ca0013] text-base font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map(st => (
                    <button
                      key={st}
                      onClick={() => setNewServiceType(st)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        newServiceType === st
                          ? 'bg-[#171e19] text-white'
                          : 'bg-[#eeebe3] text-[#b7c6c2]'
                      }`}
                    >
                      {SERVICE_LABELS[st]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-2">Paid by</label>
                <div className="flex flex-wrap gap-2">
                  {state.users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setNewPaidBy(u.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        newPaidBy === u.id
                          ? 'bg-[#171e19] text-white'
                          : 'bg-[#eeebe3] text-[#b7c6c2]'
                      }`}
                    >
                      {u.emoji} {u.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || !newAmount || !newPaidBy}
                className="w-full py-4 rounded-2xl bg-[#ca0013] text-white font-bold text-base disabled:opacity-40 active:scale-[0.98] transition-all mt-2"
              >
                Add Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
