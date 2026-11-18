import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "DNG is Adobe's open RAW format, used by many cameras and phones.",
  "bestFor": "Archiving and exchanging RAW photos between programs.",
  "watchOut": "Some DNG files only hold a processed preview, which limits editing.",
  "faqs": [
    {
      "q": "Does converting change my original file?",
      "a": "No. Your DNG file is never touched. You get a new, developed image to download."
    },
    {
      "q": "Which output format should I choose?",
      "a": "JPG for sharing. PNG or TIFF if you plan to keep editing, and choose 16-bit in the options for the widest tonal range."
    },
    {
      "q": "Is my camera supported?",
      "a": "Most DNG models are supported through the LibRaw engine. Very new camera models can take a while to be added."
    }
  ]
};

export default content;
