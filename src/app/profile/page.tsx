"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const DIGESTIVE_DISORDERS = [
  { id: "gerd", label: "GERD (acid reflux)" },
  { id: "ibs", label: "Irritable Bowel Syndrome (IBS)" },
  { id: "functional_dyspepsia", label: "Functional dyspepsia" },
  { id: "functional_constipation", label: "Functional constipation" },
  { id: "functional_diarrhea", label: "Functional diarrhea" },
  { id: "lactose_intolerance", label: "Lactose intolerance" },
  { id: "celiac_disease", label: "Celiac disease" },
  {
    id: "sibo",
    label: "SIBO (small intestinal bacterial overgrowth)",
  },
  { id: "diverticulosis", label: "Diverticulosis (prevention)" },
  { id: "hemorrhoids_fissures", label: "Hemorrhoids / Anal fissures" },
];

function parseList(input: string): string[] {
  return input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDisorders, setSelectedDisorders] = useState<string[]>([]);
  const [dislikesInput, setDislikesInput] = useState("");
  const [allergiesInput, setAllergiesInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load profile when authenticated
  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const data = await res.json();
        if (data.profile) {
          setSelectedDisorders(data.profile.digestiveDisorders || []);
          setDislikesInput((data.profile.dislikedFoods || []).join(", "));
          setAllergiesInput((data.profile.allergies || []).join(", "));
        }
      } catch (e) {
        console.error(e);
        setError("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  const toggleDisorder = (id: string) => {
    setSelectedDisorders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const dislikedFoods = parseList(dislikesInput);
      const allergies = parseList(allergiesInput);

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          digestiveDisorders: selectedDisorders,
          dislikedFoods,
          allergies,
        }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      setMessage("Profile saved successfully. Your future meal plans will avoid these triggers.");
    } catch (err) {
      console.error(err);
      setError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p>Loading your profile…</p>
      </div>
    );
  }

  if (!session?.user) {
    // Redirect will already be in progress
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2 text-neutral-900">
        Your Digestive Health Profile
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Select your digestive conditions, foods you dislike, and allergies.
        We’ll use this to recommend safer, more comfortable meals for you.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6"
      >
        {/* Digestive disorders */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">
            Digestive disorders
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Choose all that apply. We will avoid meals known to trigger these conditions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DIGESTIVE_DISORDERS.map((d) => (
              <label
                key={d.id}
                className="flex items-start gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm hover:border-primary/60 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedDisorders.includes(d.id)}
                  onChange={() => toggleDisorder(d.id)}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Disliked foods */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">
            Foods you dislike
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Separate items with commas (e.g. <span className="italic">onions, mushrooms, tuna</span>).
          </p>
          <textarea
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={2}
            value={dislikesInput}
            onChange={(e) => setDislikesInput(e.target.value)}
            placeholder="e.g. onions, mushrooms, spicy foods"
          />
        </div>

        {/* Allergies */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">
            Allergies / intolerances
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Separate items with commas (e.g.{" "}
            <span className="italic">lactose, gluten, peanuts</span>).
          </p>
          <textarea
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={2}
            value={allergiesInput}
            onChange={(e) => setAllergiesInput(e.target.value)}
            placeholder="e.g. lactose, gluten, peanuts"
          />
        </div>

        {/* Messages */}
        {(message || error) && (
          <div className="text-sm">
            {message && (
              <p className="text-green-600 mb-1">{message}</p>
            )}
            {error && <p className="text-red-500">{error}</p>}
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
