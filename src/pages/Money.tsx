import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Wallet } from 'lucide-react';

function MoneyPage() {
  const navigate = useNavigate();

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate('/')}
            className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3 hover:text-[#171e19] transition-colors"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <Wallet size={24} className="text-[#ca0013]" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">Money</h1>
            <p className="text-sm text-[#b7c6c2] font-medium">Manage payment balance</p>
          </div>
        </div>
      </div>

      <div className="px-5 flex flex-col items-center justify-center py-20 animate-fade-in-up">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Wallet size={36} className="text-[#ca0013]" />
        </div>
        <p className="text-[#b7c6c2] text-sm font-medium">Coming soon</p>
      </div>

      <BottomNav />
    </div>
  );
}

export default MoneyPage;