import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Utensils, Check } from 'lucide-react';
import { Dish } from '../types';
import { GemmaDescriptionModal } from './GemmaDescriptionModal';

interface DishFormModalProps {
  isOpen: boolean;
  categoryName: string;
  currency: string;
  initialData?: Dish | null;
  onClose: () => void;
  onSubmit: (dishData: {
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    dietary_tags?: string[];
    is_available?: number;
  }) => Promise<void>;
}

const AVAILABLE_TAGS = [
  'halal',
  'spicy',
  'chef-special',
  'vegetarian',
  'popular',
  'refreshing',
  'mild',
  'gluten-free',
  'vegan',
];

const PRESET_IMAGES = [
  { name: 'Biryani / Rice', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80' },
  { name: 'Karahi / Curry', url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80' },
  { name: 'Fish Fry / Starters', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80' },
  { name: 'Samosas / Appetizer', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
  { name: 'Lentils / Daal', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80' },
  { name: 'Beverage / Lassi', url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
  { name: 'Dessert / Sweet', url: 'https://images.unsplash.com/photo-1593701461250-d7b22dfd3a77?auto=format&fit=crop&w=600&q=80' },
];

export const DishFormModal: React.FC<DishFormModalProps> = ({
  isOpen,
  categoryName,
  currency,
  initialData,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData ? String(initialData.price) : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [dietaryTags, setDietaryTags] = useState<string[]>(() => {
    if (!initialData) return ['halal'];
    if (initialData.parsed_dietary_tags) return initialData.parsed_dietary_tags;
    try {
      return JSON.parse(initialData.dietary_tags || '[]');
    } catch {
      return [];
    }
  });
  const [isAvailable, setIsAvailable] = useState<boolean>(initialData ? initialData.is_available === 1 : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGemmaCopywriterOpen, setIsGemmaCopywriterOpen] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Dish name is required');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please enter a valid price (greater than or equal to 0)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        price: numPrice,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        dietary_tags: dietaryTags,
        is_available: isAvailable ? 1 : 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save dish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-charcoal-900">
                {initialData ? 'Edit Dish' : 'Add New Dish'}
              </h3>
              <p className="text-xs text-charcoal-500">
                Category: <strong className="text-emerald-800">{categoryName}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-charcoal-700 hover:bg-stone-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken Karahi"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Price ({currency}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1250"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                />
              </div>
            </div>

            {/* Description + Gemma Enhancer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-charcoal-700">
                  Dish Description
                </label>
                <button
                  type="button"
                  onClick={() => setIsGemmaCopywriterOpen(true)}
                  disabled={!name.trim()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 hover:underline"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  ✨ Enhance with Gemma AI
                </button>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Succulent bone-in chicken simmered with ripe tomatoes, cracked black pepper, and julienned ginger..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none leading-relaxed"
              />
            </div>

            {/* Image URL & Preset Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-charcoal-700">
                Dish Photo URL (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                {imageUrl && (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-stone-300 shrink-0">
                    <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Quick Preset Selector */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-charcoal-400 py-0.5">Quick presets:</span>
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className="text-[10px] px-2 py-0.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-charcoal-600 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Tags */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Dietary & Highlight Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const selected = dietaryTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                        selected
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-stone-100 text-charcoal-600 hover:bg-stone-200'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 inline mr-1" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <span className="text-xs font-semibold text-charcoal-800">Dish Available in Menu</span>
                <p className="text-[11px] text-charcoal-500">
                  Unchecking will hide this dish from the public customer menu.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Live Preview Snippet */}
            <div className="border border-stone-200 rounded-xl p-3 bg-stone-50/50 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-charcoal-400">Card Preview</span>
              <div className="bg-white p-3 rounded-lg border border-stone-200 flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Utensils className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-sm text-charcoal-900 truncate">
                      {name || 'Untitled Dish'}
                    </h5>
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      {currency} {price || '0'}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-500 line-clamp-1 mt-0.5">
                    {description || 'No description entered'}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {dietaryTags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-stone-100 text-charcoal-600">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-charcoal-700 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : initialData ? 'Update Dish' : 'Add Dish'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Gemma Copywriter Modal */}
      <GemmaDescriptionModal
        isOpen={isGemmaCopywriterOpen}
        dishName={name}
        initialDescription={description}
        onClose={() => setIsGemmaCopywriterOpen(false)}
        onApply={(improved, tags) => {
          setDescription(improved);
          if (tags && tags.length > 0) {
            setDietaryTags((prev) => Array.from(new Set([...prev, ...tags])));
          }
        }}
      />
    </>
  );
};
