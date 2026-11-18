import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "AVIF is a newer image format that produces very small files at high quality.",
  "bestFor": "Web pages where every kilobyte counts.",
  "watchOut": "Encoding is slower, and some older software cannot open AVIF.",
  "faqs": [
    {
      "q": "Is AVIF better than WebP?",
      "a": "It is usually smaller at the same quality, but it takes longer to create and fewer older apps can open it."
    },
    {
      "q": "Why does AVIF take longer?",
      "a": "Its compression is more complex. Lowering the effort option makes it faster at the cost of a slightly larger file."
    }
  ]
};

export default content;
