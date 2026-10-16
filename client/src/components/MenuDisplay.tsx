import { useState } from "react";
import { ImageOff, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import { dietaryLabelName, formatPrice, getLanguage, isRtl, resolveField, type Menu } from "@shared";
import { cx } from "./ui";

function DishImage({ url, alt, rounded }: { url: string | null; alt: string; rounded: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className={cx("flex items-center justify-center bg-cream-100 text-charcoal-400", rounded)} aria-hidden>
        <ImageOff className="size-5" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={cx("object-cover", rounded)} onError={() => setFailed(true)} />;
}

export function MenuDisplay({
  menu,
  language,
  onLanguageChange,
}: {
  menu: Menu;
  language: string;
  onLanguageChange?: (language: string) => void;
}) {
  const lang = getLanguage(language);
  const rtl = isRtl(language);
  const classic = menu.theme === "classic";
  const restaurantName = menu.restaurant.name;
  const description = menu.restaurant.description;

  return (
    <article dir={rtl ? "rtl" : "ltr"} lang={language} className={cx("mx-auto", classic ? "max-w-3xl" : "max-w-5xl")}>
      <header
        className={cx(
          "overflow-hidden",
          classic ? "rounded-3xl border border-charcoal-900/8 bg-white shadow-card" : "rounded-3xl bg-charcoal-950 text-white shadow-lift",
        )}
      >
        <div className={cx("h-2", classic ? "bg-brand-600" : "bg-brand-400")} />
        <div className={cx("px-6 py-8 sm:px-10", !classic && "bg-[radial-gradient(60%_80%_at_100%_0%,rgb(16_185_129_/_0.35),transparent)]")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {menu.restaurant.logoUrl && (
                <DishImage url={menu.restaurant.logoUrl} alt="" rounded="mb-4 size-16 rounded-2xl" />
              )}
              <p className={cx("text-xs font-semibold tracking-[0.18em] uppercase", classic ? "text-brand-700" : "text-brand-300")}>
                {menu.name}
              </p>
              <h2 className={cx("mt-2 text-4xl font-semibold sm:text-5xl", classic ? "text-charcoal-950" : "text-white")}>{restaurantName}</h2>
              {description && <p className={cx("mt-3 max-w-xl text-base", classic ? "text-charcoal-600" : "text-white/75")}>{description}</p>}
              <div className={cx("mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm", classic ? "text-charcoal-500" : "text-white/70")}>
                {menu.restaurant.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden /> {menu.restaurant.address}
                  </span>
                )}
                {menu.restaurant.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" aria-hidden /> <span className="price">{menu.restaurant.phone}</span>
                  </span>
                )}
              </div>
            </div>
            {menu.availableLanguages.length > 1 && onLanguageChange && (
              <div className={cx("flex rounded-full p-1 text-sm", classic ? "bg-cream-100" : "bg-white/10")} role="group" aria-label="Menu language">
                {menu.availableLanguages.map((code) => {
                  const info = getLanguage(code);
                  const active = code === language;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onLanguageChange(code)}
                      className={cx(
                        "rounded-full px-3 py-1 font-medium transition",
                        code === "ur" && "font-urdu",
                        active
                          ? classic
                            ? "bg-white text-charcoal-900 shadow-sm"
                            : "bg-white text-charcoal-900"
                          : classic
                            ? "text-charcoal-600 hover:text-charcoal-900"
                            : "text-white/80 hover:text-white",
                      )}
                      aria-pressed={active}
                    >
                      {info.nativeName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {menu.categories.length > 0 && (
        <nav className="no-print sticky top-16 z-10 -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 py-2" aria-label="Categories">
          {menu.categories.map((category) => (
            <a
              key={category.id}
              href={`#category-${category.id}`}
              className="shrink-0 rounded-full border border-charcoal-900/10 bg-white px-3.5 py-1.5 text-sm font-medium text-charcoal-700 shadow-sm hover:border-brand-300 hover:text-brand-800"
            >
              {resolveField(category.name, category.translations, "name", language, menu.defaultLanguage)}
            </a>
          ))}
        </nav>
      )}

      {menu.categories.length === 0 ? (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <UtensilsCrossed className="size-8 text-brand-600" aria-hidden />
          <p className="mt-3 font-semibold text-charcoal-800">This menu has no dishes yet.</p>
        </div>
      ) : (
        <div className={cx("mt-4", classic ? "space-y-8" : "space-y-10")}>
          {menu.categories.map((category) => {
            const categoryName = resolveField(category.name, category.translations, "name", language, menu.defaultLanguage);
            return (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-28">
                <h3 className={cx("text-2xl font-semibold", classic ? "border-b border-charcoal-900/10 pb-2 text-charcoal-900" : "text-charcoal-950")}>
                  {categoryName}
                </h3>
                <div className={cx(classic ? "mt-2 divide-y divide-charcoal-900/8" : "mt-4 grid gap-4 sm:grid-cols-2")}>
                  {category.dishes.map((dish) => {
                    const name = resolveField(dish.name, dish.translations, "name", language, menu.defaultLanguage);
                    const description = resolveField(dish.description, dish.translations, "description", language, menu.defaultLanguage);
                    return (
                      <div key={dish.id} className={cx(classic ? "py-4" : "card overflow-hidden", !dish.isAvailable && "opacity-60")}>
                        {!classic && <DishImage url={dish.imageUrl} alt={dish.imageUrl ? name : ""} rounded="aspect-[16/9] w-full rounded-none" />}
                        <div className={cx(!classic && "p-4")}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {classic && dish.imageUrl && <DishImage url={dish.imageUrl} alt="" rounded="size-12 rounded-xl" />}
                                <h4 className="text-lg font-semibold text-charcoal-900">{name}</h4>
                                {!dish.isAvailable && <span className="rounded-full bg-charcoal-900/6 px-2 py-0.5 text-xs text-charcoal-500">Unavailable</span>}
                              </div>
                              {description && <p className="mt-1 text-sm leading-relaxed text-charcoal-600">{description}</p>}
                              {dish.labels.length > 0 && (
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                  {dish.labels.map((label) => (
                                    <li key={label} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                                      {dietaryLabelName(label, language)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <p className="price shrink-0 text-base font-semibold text-brand-700">{formatPrice(dish.price, menu.currency)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-charcoal-400">
        {menu.isDemo ? "Sample menu for the fictional restaurant Saffron Garden. Prices are illustrative. " : ""}
        Shown in {lang.name}.
      </p>
    </article>
  );
}
