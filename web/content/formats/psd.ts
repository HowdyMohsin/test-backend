import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "PSD is Adobe Photoshop's working file and can hold many layers.",
  "bestFor": "Sharing a flat preview of a design.",
  "watchOut": "All layers are merged into one image, so you cannot edit them afterwards.",
  "faqs": [
    {
      "q": "Are my layers kept?",
      "a": "No. All visible layers are merged into a single image. Keep your original PSD for editing."
    },
    {
      "q": "Is transparency kept?",
      "a": "Yes when you convert to PNG, WebP, AVIF or TIFF. JPG has no transparency, so a background color is used instead."
    }
  ]
};

export default content;
