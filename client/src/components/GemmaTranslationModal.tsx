import React, { useState, useEffect } from 'react';
import { Sparkles, Check, AlertCircle, RefreshCw, X, ArrowRight, Languages, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { MenuWithFullDetails, AIMenuTranslationResult, AIProviderStatus } from '../types';

interface GemmaTranslationModalProps {
  menu: MenuWithFullDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GemmaTranslationModal: React.FC<GemmaTranslationModalProps> = ({
  menu,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ur');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIProviderStatus | null>(null);
  const [translationResult, setTranslationResult] = useState<AIMenuTranslationResult | null>(null);

  // Editable local state for the translated output
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCategories, setEditedCategories] = useState<
    Array<{
      id: string;
      original_name: string;
      translated_name: string;
      dishes: Array<{
        id: string;
        original_name: string;
        translated_name: string;
        original_description?: string | null;
        translated_description?: string | null;
      }>;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      api.getAIStatus().then(setAiStatus).catch(console.error);
      setError(null);
      setTranslationResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.translateMenuWithGemma(menu.id, sourceLang, targetLang);
      setTranslationResult(result);
      setEditedTitle(result.menu_title?.translated || menu.title);
      setEditedCategories(result.categories);
    } catch (err: any) {
      setError(err.message || 'Translation failed with Gemma AI. Please check your API key configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryNameChange = (catIndex: number, value: string) => {
    const updated = [...editedCategories];
    updated[catIndex].translated_name = value;
    setEditedCategories(updated);
  };

  const handleDishNameChange = (catIndex: number, dishIndex: number, value: string) => {
    const updated = [...editedCategories];
    updated[catIndex].dishes[dishIndex].translated_name = value;
    setEditedCategories(updated);
  };

  const handleDishDescChange = (catIndex: number, dishIndex: number, value: string) => {
    const updated = [...editedCategories];
    updated[catIndex].dishes[dishIndex].translated_description = value;
    setEditedCategories(updated);
  };

  const handleSaveTranslations = async () => {
    setSaving(true);
    setError(null);
    try {
      const translationsToSave: Array<{
        entity_type: 'menu' | 'category' | 'dish';
        entity_id: string;
        language_code: string;
        field_name: 'title' | 'name' | 'description';
        translation: string;
        status?: 'pending_review' | 'approved' | 'rejected';
      }> = [];

      // Menu title
      if (editedTitle.trim()) {
        translationsToSave.push({
          entity_type: 'menu',
          entity_id: menu.id,
          language_code: targetLang,
          field_name: 'title',
          translation: editedTitle.trim(),
          status: 'approved',
        });
      }

      // Categories and Dishes
      for (const cat of editedCategories) {
        if (cat.translated_name.trim()) {
          translationsToSave.push({
            entity_type: 'category',
            entity_id: cat.id,
            language_code: targetLang,
            field_name: 'name',
            translation: cat.translated_name.trim(),
            status: 'approved',
          });
        }

        for (const dish of cat.dishes) {
          if (dish.translated_name?.trim()) {
            translationsToSave.push({
              entity_type: 'dish',
              entity_id: dish.id,
              language_code: targetLang,
              field_name: 'name',
              translation: dish.translated_name.trim(),
              status: 'approved',
            });
          }
          if (dish.translated_description?.trim()) {
            translationsToSave.push({
              entity_type: 'dish',
              entity_id: dish.id,
              language_code: targetLang,
              field_name: 'description',
              translation: dish.translated_description.trim(),
              status: 'approved',
            });
          }
        }
      }

      await api.saveTranslations(menu.id, translationsToSave);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save translations to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-cream-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-charcoal-900 flex items-center gap-2">
                Gemma AI Translation Studio
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Gemma 2 Open Weights
                </span>
              </h3>
              <p className="text-xs text-charcoal-500">
                AI-powered culinary translation with authentic cultural context and Nastaliq script
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-charcoal-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Provider status banner */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  aiStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="font-semibold text-charcoal-900">
                  Provider: <span className="text-emerald-800 font-mono">{aiStatus?.provider || 'Google AI Studio'}</span>
                  {' • '}
                  Model: <span className="text-emerald-800 font-mono">{aiStatus?.model || 'gemma-2-9b-it'}</span>
                </p>
                <p className="text-charcoal-500 text-[11px] mt-0.5">
                  {aiStatus?.hint || 'Gemma is specialized in South Asian & international culinary terminology.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-charcoal-700 font-medium">
              <Languages className="w-4 h-4 text-emerald-700" />
              <span>English ➔ Urdu (اردو)</span>
            </div>
          </div>

          {/* Action trigger before generation */}
          {!translationResult && (
            <div className="text-center py-10 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-300 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <Languages className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-base sm:text-lg text-charcoal-900">
                  Translate Entire Menu into Authentic Urdu
                </h4>
                <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
                  Gemma AI translates all {menu.categories?.length || 0} categories and{' '}
                  {menu.categories?.reduce((acc, c) => acc + (c.dishes?.length || 0), 0) || 0} dishes into natural Pakistani culinary Urdu with Nastaliq typography. You can review and edit every item before saving.
                </p>
              </div>

              {error && (
                <div className="max-w-md mx-auto p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 text-left">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">AI Translation Error</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleTranslate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Translating with Gemma AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Gemma AI Translation
                  </>
                )}
              </button>
            </div>
          )}

          {/* Generated Results Review & Edit */}
          {translationResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-sm text-charcoal-900">Review & Refine Translations</span>
                </div>
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>

              {/* Menu Title Translation */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wider">
                  Menu Title Translation
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-charcoal-500 font-medium">Original (English):</span>
                    <p className="text-sm font-semibold text-charcoal-900 mt-1">{menu.title}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-800 font-medium">Urdu Translation (Editable):</span>
                    <input
                      type="text"
                      dir="rtl"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="mt-1 w-full px-3 py-1.5 rounded-lg border border-stone-300 font-urdu text-base text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Categories & Dishes review */}
              <div className="space-y-4">
                {editedCategories.map((cat, catIdx) => (
                  <div key={cat.id} className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Category Header */}
                    <div className="bg-stone-100/70 p-3.5 border-b border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-charcoal-500">Category (EN):</span>
                        <p className="text-sm font-bold text-charcoal-900">{cat.original_name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700">Category (UR):</span>
                        <input
                          type="text"
                          dir="rtl"
                          value={cat.translated_name}
                          onChange={(e) => handleCategoryNameChange(catIdx, e.target.value)}
                          className="w-full px-3 py-1 rounded-lg border border-stone-300 font-urdu text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Dishes in category */}
                    <div className="p-3.5 divide-y divide-stone-100 space-y-3">
                      {cat.dishes.map((dish, dishIdx) => (
                        <div key={dish.id} className="pt-3 first:pt-0 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                            {/* Original */}
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-charcoal-900">{dish.original_name}</span>
                              {dish.original_description && (
                                <p className="text-xs text-charcoal-500 leading-relaxed">
                                  {dish.original_description}
                                </p>
                              )}
                            </div>

                            {/* Translated */}
                            <div className="space-y-1.5" dir="rtl">
                              <input
                                type="text"
                                value={dish.translated_name}
                                onChange={(e) => handleDishNameChange(catIdx, dishIdx, e.target.value)}
                                placeholder="نام (Urdu name)"
                                className="w-full px-3 py-1 rounded-lg border border-stone-300 font-urdu text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                              />
                              <textarea
                                rows={2}
                                value={dish.translated_description || ''}
                                onChange={(e) => handleDishDescChange(catIdx, dishIdx, e.target.value)}
                                placeholder="وضاحت (Urdu description)"
                                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 font-urdu text-xs text-right focus:ring-2 focus:ring-emerald-500 outline-none text-charcoal-700 leading-loose"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-charcoal-700 font-medium text-xs sm:text-sm transition-colors"
          >
            Cancel
          </button>

          {translationResult && (
            <button
              type="button"
              onClick={handleSaveTranslations}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Approve & Save Translations
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
