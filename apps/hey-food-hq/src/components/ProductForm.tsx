"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactElement } from "react";

import { createProductAction, updateProductAction } from "@/app/(app)/menu/actions";

interface FormValues {
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  masterPrice: string;
}

interface Props {
  mode: "create" | "edit";
  productId?: string;
  initial: FormValues;
  /** Existing categories, offered as suggestions so a typo doesn't quietly create a new one. */
  categories: string[];
}

const FIELD_LABELS: Record<keyof FormValues, string> = {
  name: "Name",
  description: "Description",
  category: "Category",
  imageUrl: "Image URL",
  masterPrice: "Master price (RM)",
};

/** "12.5", "12.50", " 12 " -> a number; anything else (empty, "abc", "1,5") -> null. */
function parsePrice(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

const inputClass =
  "mt-1 w-full rounded-md border border-brand-line bg-brand-white px-3 py-2 text-hq-body text-brand-ink aria-[invalid=true]:border-danger-solid";

/**
 * Create / edit a product's MASTER fields (no per-outlet data lives here). It
 * sends only what the user changed when editing, and shows the server's message
 * beside the field it is about. The price is validated by the backend
 * (greater than 0, at most 2 decimals, at most RM999.99): a value with more
 * decimals is rejected and reported, never rounded.
 */
export function ProductForm({ mode, productId, initial, categories }: Props): ReactElement {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initial);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [formMessage, setFormMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormValues) => (event: { target: { value: string } }) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormMessage(null);
    setFieldError(null);

    const price = parsePrice(values.masterPrice);
    if (price === null) {
      setFieldError({ field: "masterPrice", message: "Enter the price as a number, e.g. 12.50." });
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const result = await createProductAction({
          name: values.name,
          description: values.description,
          category: values.category,
          imageUrl: values.imageUrl,
          masterPrice: price,
        });
        if (!result.ok) {
          if (result.field) setFieldError({ field: result.field, message: result.error });
          else setFormMessage({ kind: "error", text: result.error });
          return;
        }
        router.push(`/menu/${encodeURIComponent(result.data.id)}`);
        return;
      }

      // edit: only the fields that actually changed
      const patch: Record<string, string | number> = {};
      for (const key of ["name", "description", "category", "imageUrl"] as const) {
        if (values[key].trim() !== initial[key].trim()) patch[key] = values[key];
      }
      if (price !== Number(initial.masterPrice)) patch.masterPrice = price;
      if (Object.keys(patch).length === 0) {
        setFormMessage({ kind: "ok", text: "Nothing to save — no field was changed." });
        return;
      }

      const result = await updateProductAction(productId ?? "", patch);
      if (!result.ok) {
        if (result.field) setFieldError({ field: result.field, message: result.error });
        else setFormMessage({ kind: "error", text: result.error });
        return;
      }
      setFormMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const invalid = (field: keyof FormValues) => fieldError?.field === field;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4" aria-label={mode === "create" ? "New product" : "Edit product"}>
      {(Object.keys(FIELD_LABELS) as Array<keyof FormValues>).map((key) => {
        const common = { id: `pf-${key}`, value: values[key], onChange: set(key), "aria-invalid": invalid(key), className: inputClass };
        return (
          <div key={key}>
            <label htmlFor={`pf-${key}`} className="text-hq-body font-semibold text-brand-ink">
              {FIELD_LABELS[key]}
            </label>
            {key === "description" ? (
              <textarea {...common} rows={2} />
            ) : key === "masterPrice" ? (
              <input {...common} type="text" inputMode="decimal" placeholder="12.50" />
            ) : key === "category" ? (
              <>
                <input {...common} type="text" list="pf-categories" autoComplete="off" />
                <datalist id="pf-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </>
            ) : (
              <input {...common} type="text" placeholder={key === "imageUrl" ? "https://… (optional)" : undefined} />
            )}
            {invalid(key) && (
              <p role="alert" className="mt-1 text-hq-caption font-semibold text-danger-solid">
                {fieldError?.message}
              </p>
            )}
          </div>
        );
      })}

      {formMessage && (
        <p
          role={formMessage.kind === "error" ? "alert" : "status"}
          className={`text-hq-body font-semibold ${formMessage.kind === "error" ? "text-danger-solid" : "text-brand-teal"}`}
        >
          {formMessage.text}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-md bg-brand-teal px-6 text-hq-body font-semibold text-brand-white transition-colors hover:bg-brand-tealDark disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
