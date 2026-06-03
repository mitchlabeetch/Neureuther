import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, ShoppingBasket, Sparkles } from 'lucide-react';

function GroceriesPage() {
  const navigate = useNavigate();

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate('/kitchen')}
          className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3 hover:text-[#171e19] transition-colors"
        >
          <ArrowLeft size={18} /> Kitchen
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#69D2A6]/15 flex items-center justify-center">
            <ShoppingBasket size={24} className="text-[#69D2A6]" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">Groceries</h1>
            <p className="text-sm text-[#b7c6c2] font-medium">Shopping list</p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <div className="px-5 pt-12 pb-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-[#69D2A6]/10 flex items-center justify-center mb-5">
          <Sparkles size={36} className="text-[#69D2A6]" />
        </div>
        <h2 className="text-lg font-semibold text-[#171e19] mb-2">Coming Soon</h2>
        <p className="text-sm text-[#b7c6c2] max-w-xs leading-relaxed">
          Grocery list and shopping management will be available here. Stay tuned!
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

export default GroceriesPage;