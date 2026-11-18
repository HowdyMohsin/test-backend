import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "TIFF is a high-quality format used in printing, scanning and archives.",
  "bestFor": "Print work and archiving where nothing may be lost.",
  "watchOut": "Files are very large and web browsers cannot display them.",
  "faqs": [
    {
      "q": "Is TIFF lossless?",
      "a": "TIFF with LZW or Deflate compression is lossless. The JPEG option inside TIFF is smaller but lossy."
    },
    {
      "q": "Can I show a TIFF on a website?",
      "a": "Browsers do not display TIFF. Convert it to JPG or PNG to share it online."
    }
  ]
};

export default content;
