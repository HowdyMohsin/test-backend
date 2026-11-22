# User ko kab kya dikhta hai

**Koi popup nahi.** Limit ka message tool ke andar (inline) aata hai, aur plan lene ka raasta Pricing / Account page se hai.

| # | Pal | User kya dekhta hai |
|---|---|---|
| 1 | Home kholta hai | Neela hero: "Convert any file in seconds", From -> To chunne wala picker, "Start converting". Neeche "All converters" explorer |
| 2 | Converter chunta hai | Us format ka page: neela hero (JPG -> PNG tiles) aur uske neeche tool |
| 3 | File daalta hai | Left: "Your files" me row (thumbnail, naam, format, size). Location data ho to peela chip "Remove it" |
| 4 | Options dekhta hai | Right: Output (presets, resize, quality), Rename, Tools tabs |
| 5 | Convert dabata hai | Progress bar, intezar ho to "2 ahead", Stop button |
| 6 | Conversion poora | Download, bachat (-62%), Preview: original aur converted ka slider, "Download all (ZIP)" |
| 7 | Limit poori (quota, badi file, zyada files, lambi video) | Tool ke andar peela notice: wajah + "Create a free account" / "See plans" ke buttons |
| 8 | Account page (`/account`) | Email aur password se Sign in / Create account tabs. Sign in ke baad: plan, aaj ka usage, History, password change aur Pricing ke links |
| 9 | Pricing page (`/pricing`) | Free, Basic, Pro. Basic/Pro par "Choose" dabao to neeche email wali waiting list (payment abhi OFF) |
| 10 | History page (`/history`) | Pichhli conversions: file, converter, size, kab, status, Download (file 1 ghante tak) |
| 11 | Pro user | Koi upsell nahi, koi ad nahi |
| 12 | File kharab | Row me laal message aur Retry |
| 13 | Server band | Tool ke upar laal box |

Sab messages aur plans (limits, price) **Admin -> Plans & Messages** se badalte hain, website ko chhue baghair.

## Accuracy: kya pakka hai aur kya nahi

"100%" ka matlab: **jo file milti hai wo kabhi chupke se ghalat nahi hoti.**

Pakka (har converter live hone se pehle check hota hai, Admin -> Formats me nateeja likha hota hai):
- Lossless image conversion: **pixel-for-pixel barabar**. Lossy image: quality PSNR ke minimum se upar.
- Audio: pitch aur level sahi, khamosh nahi. WAV, FLAC, AIFF ke beech **sample-exact**.
- Video: tasveer asli se milti hai, audio track bacha hua, duration barabar.
- Har output khol kar dekha jata hai. Fail ho to user ko "success" nahi dikhta. Check me fail converter site par aata hi nahi.

Qudrati hadein: JPG, MP3 jaise lossy format me kuch detail kam hoti hai. PNG -> SVG tracing andaza hai, exact copy nahi.
GIF sirf 256 rang. PSD aur 7 camera RAW formats ke liye asli file chahiye (`api/data/samples/<format>/`).
