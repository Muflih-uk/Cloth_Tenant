import type { EditableVariant, FabricRequest } from "@/types/item";
import { fabricApi } from "./api/item";
import { fabricToFormData } from "./form-utils";

/**
 * Build the update payload for a fabric.
 *
 * Three rules the API relies on, all easy to get wrong:
 *  - Every colour has to be sent, because the API treats a colour missing from
 *    the payload as deleted.
 *  - The editable metre field is the opening order-stock base for every colour.
 *    Physical on-hand stock remains owned by the roll endpoints or manual
 *    packing, and is never submitted from this form.
 */
export function buildFabricUpdatePayload(
  common: {
    name: string;
    design_number?: string;
    category?: string;
    description?: string;
    price_per_meter: string;
  },
  variants: EditableVariant[],
): FabricRequest {
  return {
    name: common.name,
    design_number: common.design_number ?? "",
    category: common.category ?? "",
    description: common.description ?? "",
    price_per_meter: common.price_per_meter,
    variants: variants.map((variant) => {
      // Trim: a label of only spaces is an empty label, not the colour "  ".
      const label = variant.displayOrder.trim();
      return {
        // No id means "create this", which is how a just-added colour is sent.
        ...(variant.backendId > 0 ? { id: variant.backendId } : {}),
        display_order: label || null,
        ...(variant.newImage ? { image: variant.newImage } : {}),
        // A cleared photo is signalled by having no URL and no replacement.
        ...(variant.backendId > 0 && !variant.imageUrl && !variant.newImage
          ? { remove_image: true }
          : {}),
        base_opening: variant.baseOpening || "0",
      };
    }),
  };
}

export async function updateFabric(
  fabricId: number,
  common: {
    name: string;
    design_number?: string;
    category?: string;
    description?: string;
    price_per_meter: string;
  },
  variants: EditableVariant[],
): Promise<void> {
  // Multipart, not JSON: a replaced photo is a File, and JSON.stringify turns a
  // File into `{}`, which the API's FileField rejects with "The submitted data
  // was not a file."
  await fabricApi.update(
    fabricId,
    fabricToFormData(buildFabricUpdatePayload(common, variants)),
  );
}
