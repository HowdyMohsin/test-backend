import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "GIF is an old format best known for short looping animations.",
  "bestFor": "Simple animations and small graphics.",
  "watchOut": "It is limited to 256 colors, so photos look grainy, and transparency is only on or off.",
  "faqs": [
    {
      "q": "Why do photos look grainy as GIF?",
      "a": "GIF can show only 256 colors at once. For photos use JPG or WebP instead."
    },
    {
      "q": "Does animation survive conversion?",
      "a": "Animated GIF to WebP keeps the animation. Other formats keep only the first frame."
    }
  ]
};

export default content;
