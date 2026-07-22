import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  fetchGiftCardById, updateGiftCard,
  clearSaveStatus, clearCurrent,
} from '../store/giftCardsSlice.js';
import { GiftCardForm } from './GiftCardCreate.jsx';

export default function GiftCardEdit() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();

  const { current, currentStatus, currentError, saveStatus, saveError } =
    useSelector((s) => s.giftCards);

  // Load card on mount
  useEffect(() => {
    dispatch(clearSaveStatus());
    dispatch(fetchGiftCardById(id));
    return () => { dispatch(clearCurrent()); };
  }, [id, dispatch]);

  // Navigate away after successful save
  useEffect(() => {
    if (saveStatus === 'succeeded') {
      dispatch(clearSaveStatus());
      navigate('/gift-cards');
    }
  }, [saveStatus, dispatch, navigate]);

  const handleSubmit = (body) => {
    dispatch(updateGiftCard({ id, ...body }));
  };

  // ── Loading state ──────────────────────────────────────────────────────
  if (currentStatus === 'idle' || currentStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-[13px] text-neutral-500">Loading gift card…</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (currentStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-[15px] font-bold text-neutral-800">Failed to load gift card</p>
        <p className="text-[12px] text-neutral-400 mt-1">{currentError}</p>
        <button
          onClick={() => navigate('/gift-cards')}
          className="mt-5 px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-semibold hover:opacity-90 transition"
        >
          Back to Gift Cards
        </button>
      </div>
    );
  }

  return (
    <GiftCardForm
      title="Edit Gift Card"
      breadcrumb="Edit"
      initialValues={current ?? {}}
      onSubmit={handleSubmit}
      saving={saveStatus === 'loading'}
      saveError={saveError}
    />
  );
}
