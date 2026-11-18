import type { FormatContent } from "../types";

const content: FormatContent = {
  "about": "MOV is Apple's QuickTime video format.",
  "bestFor": "Editing on a Mac and recording on iPhones.",
  "watchOut": "Some Windows players and websites do not accept MOV.",
  "faqs": [
    {
      "q": "Why won't my MOV play on Windows?",
      "a": "It often contains a codec Windows does not include. Converting to MP4 makes it play anywhere."
    },
    {
      "q": "Is quality lost from MOV to MP4?",
      "a": "If the video inside is already H.264, it is copied across without re-encoding."
    }
  ]
};

export default content;
