import React, { useState } from 'react';
import { Sparkles, X, Check, RefreshCw, AlertCircle, ChefHat } from 'lucide-react';
import { api } from '../api/client';
import { AIImproveDescriptionResult } from '../types';

interface GemmaDescriptionModalProps {
  isOpen: boolean;
  dishName: string;
  initialDescription?: string;
  onClose: () => void;
  onApply: (improvedDescription: string, suggestedTags?: string[]) => void;
}

export const GemmaDescriptionModal: React.FC<GemmaDescriptionModalProps> = ({
  isOpen,
  dishName,
  initialDescription = '',
  onClose,
  onApply,
}) => {
  const [ingredients, setIngredients] = useState('');
  const [cuisineNotes, setCuisineNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIImproveDescriptionResult | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.improveDescriptionWithGemma({
        dish_name: dishName,
        current_description: initialDescription,
        ingredients: ingredients.trim() || undefined,
        cuisine_notes: cuisineNotes.trim() || undefined,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate description with Gemma AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result.improved_description, result.suggested_tags);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-cream-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-charcoal-900 flex items-center gap-1.5">
                Gemma Copywriter
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Gemma 2
                </span>
              </h3>
              <p className="text-xs text-charcoal-500">
                Craft appetizing menu descriptions for <strong className="text-charcoal-800">{dishName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-charcoal-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Key Ingredients (Optional but recommended)
            </label>
            <input
              type="text"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="e.g. ginger julienne, black pepper, vine tomatoes, desi ghee"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <p className="text-[11px] text-charcoal-400 mt-1">
              Gemma adheres strictly to your ingredients and will never invent allergens.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Cooking Method or Flavor Notes (Optional)
            </label>
            <input
              type="text"
              value={cuisineNotes}
              onChange={(e) => setCuisineNotes(e.target.value)}
              placeholder="e.g. wok-tossed over high heat, mild spice, smoky charcoal aroma"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Generation Failed</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Gemma Suggestion
                </span>
                {result.suggested_tags && result.suggested_tags.length > 0 && (
                  <div className="flex gap-1">
                    {result.suggested_tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-charcoal-800 leading-relaxed font-serif italic">
                "{result.improved_description}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-charcoal-700 font-medium text-xs transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {result ? 'Try Another' : 'Generate'}
            </button>

            {result && (
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                Apply to Dish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
