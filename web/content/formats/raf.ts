import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "RAF is the RAW photo format of Fujifilm cameras.",
  "bestFor": "Developing Fujifilm photos with their natural colors.",
  "watchOut": "RAW files are large and most apps cannot open them. Fujifilm's special sensor layouts can look slightly different from the camera's own JPG.",
  "faqs": [
    {
      "q": "Does converting change my original file?",
      "a": "No. Your RAF file is never touched. You get a new, developed image to download."
    },
    {
      "q": "Which output format should I choose?",
      "a": "JPG for sharing. PNG or TIFF if you plan to keep editing, and choose 16-bit in the options for the widest tonal range."
    },
    {
      "q": "Is my camera supported?",
      "a": "Most Fujifilm models are supported through the LibRaw engine. Very new camera models can take a while to be added."
    }
  ]
};

export default content;
