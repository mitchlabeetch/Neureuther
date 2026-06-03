import { useState } from 'react';
import { useApp, User } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { Plus, Pencil, Trash2, Users, X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const USER_COLORS = ['#FDA172', '#FF6B6B', '#A78BFA', '#69D2A6', '#FBBF24', '#FB7185', '#38BDF8', '#F472B6', '#818CF8', '#34D399'];
const EMOJIS = ['🦊', '🐸', '🦄', '🐱', '🐶', '🐼', '🐨', '🦁', '🐰', '🐙', '🦉', '🦋', '🐝', '🐳', '🦭', '🐧', '🐯', '🐮', '🐷', '🐵'];

function SettingsPage() {
  const { state, addUser, updateUser, removeUser } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#FDA172');
  const [newEmoji, setNewEmoji] = useState('🦊');

  const openEdit = (user: User) => {
    setEditingUser(user.id);
    setNewName(user.name);
    setNewColor(user.color);
    setNewEmoji(user.emoji);
    setShowDialog(true);
  };

  const openNew = () => {
    setEditingUser(null);
    setNewName('');
    setNewColor(USER_COLORS[state.users.length % USER_COLORS.length]);
    setNewEmoji(EMOJIS[state.users.length % EMOJIS.length]);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    if (editingUser) {
      updateUser(editingUser, { name: newName.trim(), color: newColor, emoji: newEmoji });
    } else {
      addUser({ name: newName.trim(), color: newColor, emoji: newEmoji });
    }
    setShowDialog(false);
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-3xl font-extrabold text-[#2D2B2A]">Settings</h1>
        <p className="text-sm text-gray-400 font-semibold mt-1">Manage your household</p>
      </div>

      {/* Users section */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={14} /> People ({state.users.length})
          </h3>
          <button
            onClick={openNew}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-cantaloupe bg-cantaloupe-lighter hover:bg-cantaloupe hover:text-white transition-all active:scale-90"
          >
            <Plus size={14} /> Add Person
          </button>
        </div>
        <div className="space-y-2">
          {state.users.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-orange-100 shadow-sm"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: user.color + '30' }}
              >
                {user.emoji}
              </div>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-[#2D2B2A]">{user.name}</div>
                <div className="w-4 h-4 rounded-full mt-1" style={{ backgroundColor: user.color }} />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => openEdit(user)}
                    className="p-2.5 rounded-full text-gray-400 hover:text-cantaloupe hover:bg-orange-50 transition-all active:scale-90"
                  >
                    <Pencil size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                  Edit {user.name}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="p-2.5 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                  Remove {user.name}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      {/* About section */}
      <div className="px-5 mb-4">
        <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm">
          <h3 className="text-sm font-extrabold text-[#2D2B2A] mb-2">About Neureuther</h3>
          <p className="text-sm text-gray-400 font-semibold leading-relaxed">
            Your fun household companion! Manage chores, spin the wheel, earn points, and keep your home running smoothly.
          </p>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400 font-bold">
            <span className="px-2 py-1 bg-orange-50 rounded-full text-cantaloupe">v1.0</span>
            <span>Built with ❤️</span>
          </div>
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-3xl max-w-[380px] mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-extrabold text-[#2D2B2A]">
              {editingUser ? 'Edit Person' : 'Add Person'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Name</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Alex"
                className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emoji</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90 ${
                      newEmoji === emoji ? 'bg-cantaloupe-lighter ring-2 ring-cantaloupe scale-110' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Color</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {USER_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-9 h-9 rounded-full transition-all active:scale-90 ${
                      newColor === color ? 'ring-3 ring-offset-2 ring-[#2D2B2A] scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="w-full py-3 rounded-xl font-extrabold text-white bg-[#2D2B2A] hover:bg-[#3D3B3A] disabled:bg-gray-300 disabled:text-gray-500 transition-all active:scale-[0.98]"
            >
              {editingUser ? 'Save Changes' : 'Add Person'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

export default SettingsPage;
