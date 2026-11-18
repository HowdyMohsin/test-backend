import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "PNG stores an image without losing any detail and supports transparency.",
  "bestFor": "Logos, screenshots, graphics with text and anything that needs a transparent background.",
  "watchOut": "Photos saved as PNG are much larger than the same photo as JPG or WebP.",
  "faqs": [
    {
      "q": "Is PNG lossless?",
      "a": "Yes. Converting to PNG never lowers quality, but it cannot bring back detail that an earlier lossy format already removed."
    },
    {
      "q": "Why is my PNG so large?",
      "a": "PNG keeps every pixel exactly. For photos, JPG or WebP are far smaller. For flat graphics you can reduce the number of colors in the options."
    }
  ]
};

export default content;
