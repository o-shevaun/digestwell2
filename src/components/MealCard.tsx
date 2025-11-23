import Image from "next/image";

export type Meal = {
  label: string;
  image?: string | null;
  // 👇 this is the line you were asking about
  sourceUrl?: string | null;
};

type MealCardProps = {
  slotLabel: string;      // "Breakfast", "Lunch", "Supper"
  meal: Meal | null;
};

export default function MealCard({ slotLabel, meal }: MealCardProps) {
  if (!meal) {
    return (
      <div className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {slotLabel}
          </p>
          <p className="mt-1 text-sm text-gray-500">No meal for this slot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      {meal.image && (
        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-neutral-100">
          <Image
            src={meal.image}
            alt={meal.label}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {slotLabel}
        </p>
        <p className="mt-1 text-base font-semibold text-neutral-900">
          {meal.label}
        </p>

        <div className="mt-3">
          {meal.sourceUrl ? (
            <a
              href={meal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm underline underline-offset-2"
            >
              View recipe
            </a>
          ) : (
            <span className="text-xs text-gray-400">
              No external recipe link
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
