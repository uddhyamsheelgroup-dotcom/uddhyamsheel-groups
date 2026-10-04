/**
 * Uddhyamsheel Group - Official Brand Assets & Organization Constants
 * Exact recreation of the official "UG" 3D Swoop Logo & Official Mahalakshmi Stamp
 * Established: 2079 B.S. | Lumbini, Nepal
 */

export const DEFAULT_ORG_CONFIG = {
  name: "Uddhyamsheel Group",
  nepaliName: "उद्यमशील समूह",
  tagline: "Empowering Financial Solidarity & Mutual Prosperity",
  establishedBS: "2079 B.S.",
  establishedAD: "2023 A.D.",
  phone: "+977-9743403017",
  email: "uddhyamsheel.group@gmail.com",
  address: "Lumbini, Nepal",
  signatoryTitle: "Authorized Signatory / Chairperson",
  currencySymbol: "Rs.",
  currencyCode: "NPR",
};

/**
 * Official "UG" Modern 3D Logo (Vector SVG)
 * Exact recreation of "U (500 x 500 px) (1).png":
 * - Sculpted dimensional "U" on left with sapphire-to-royal-blue base and vibrant cyan top
 * - Bold dimensional "G" on right with crisp rectangular crossbar
 * - Dynamic aerodynamic crescent swoosh slicing diagonally through the letters from bottom-left to top-right
 * - Specular cyan-to-white razor highlights and deep bevel shadows
 */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <!-- Deep Royal Blue Base Gradient -->
    <linearGradient id="ugNavy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#02428f" />
      <stop offset="45%" stop-color="#005fa6" />
      <stop offset="100%" stop-color="#01244d" />
    </linearGradient>

    <!-- Electric Cyan Gradient for Top and Arc -->
    <linearGradient id="ugCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f2ff" />
      <stop offset="40%" stop-color="#00b4d8" />
      <stop offset="100%" stop-color="#0077b6" />
    </linearGradient>

    <!-- Swoosh Arc Dynamic Gradient -->
    <linearGradient id="arcGlow" x1="0%" y1="70%" x2="100%" y2="30%">
      <stop offset="0%" stop-color="#004e92" />
      <stop offset="25%" stop-color="#0096c7" />
      <stop offset="60%" stop-color="#00b4d8" />
      <stop offset="100%" stop-color="#48cae4" />
    </linearGradient>

    <!-- Razor Crest Highlight Gradient -->
    <linearGradient id="crestHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#e0f7fa" stop-opacity="0.8" />
    </linearGradient>

    <!-- Drop Shadow for Dimensional Realism -->
    <filter id="ugDrop" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#001833" flood-opacity="0.25" />
    </filter>
  </defs>

  <g filter="url(#ugDrop)">
    <!-- ========== LETTER 'U' ========== -->
    <!-- U Main Body with curved bottom bowl and 3D depth -->
    <path d="M 66 118 L 140 118 L 140 274 C 140 324 176 360 222 360 C 268 360 300 324 300 274 L 300 118 L 374 118 L 374 276 C 374 362 304 426 220 426 C 136 426 66 362 66 276 Z" fill="url(#ugNavy)" />

    <!-- U Left Column Cyan Facet -->
    <path d="M 66 118 L 140 118 L 140 200 L 66 170 Z" fill="url(#ugCyan)" opacity="0.92" />

    <!-- U Right Column Cyan Facet -->
    <path d="M 300 118 L 374 118 L 374 220 L 300 202 Z" fill="url(#ugCyan)" opacity="0.95" />

    <!-- U Bottom 3D Bevel Curve -->
    <path d="M 98 336 C 128 382 172 408 220 408 C 268 408 312 382 342 336 C 310 388 262 418 220 418 C 178 418 130 388 98 336 Z" fill="#00b4d8" opacity="0.85" />

    <!-- ========== LETTER 'G' ========== -->
    <!-- G Main Body with thick spine, top arc, and straight horizontal spur -->
    <path d="M 382 134 C 424 134 456 150 478 178 L 422 224 C 410 208 396 200 380 200 C 344 200 320 230 320 274 C 320 318 344 348 380 348 C 398 348 412 340 420 328 L 420 290 L 376 290 L 376 236 L 484 236 L 484 352 C 456 398 422 426 378 426 C 300 426 248 360 248 274 C 248 188 300 134 382 134 Z" fill="url(#ugNavy)" />

    <!-- G Top Curved Face (Cyan 3D Gradient) -->
    <path d="M 382 134 C 424 134 456 150 478 178 L 422 224 C 410 208 396 200 380 200 C 354 200 334 216 326 238 L 304 182 C 324 150 354 134 382 134 Z" fill="url(#ugCyan)" />

    <!-- G Spur and Inner Shelf -->
    <path d="M 376 236 L 484 236 L 484 290 L 420 290 L 420 328 C 412 340 398 348 380 348 L 380 426 C 422 426 456 398 484 352 L 484 236 Z" fill="url(#ugNavy)" />
    <path d="M 420 290 L 484 290 L 484 352 L 420 328 Z" fill="#00b4d8" opacity="0.35" />

    <!-- ========== DYNAMIC SWOOP / ARC ========== -->
    <!-- Precision 3D Arc slicing across U and reaching over G -->
    <path d="M 32 306 C 38 376 136 362 210 286 C 286 206 384 156 498 176 C 414 160 314 200 240 278 C 166 354 80 380 32 306 Z" fill="url(#arcGlow)" />

    <!-- High-Gloss White Crest Razor Highlight -->
    <path d="M 48 326 C 102 372 178 342 248 268 C 320 194 408 162 490 172 C 416 166 332 196 256 272 C 184 344 108 370 48 326 Z" fill="url(#crestHighlight)" />

    <!-- Arc Contact Shadow on Letter Surfaces -->
    <path d="M 118 332 C 156 352 200 332 240 288 C 220 310 178 338 118 332 Z" fill="#001833" opacity="0.45" />
  </g>
</svg>`;

/**
 * Official Mahalakshmi Cooperative Stamp / Seal (Vector SVG)
 * Exact recreation of "ChatGPT Image Oct 3, 2026, 09_28_31 AM.png":
 * - Outer double concentric circular blue border
 * - Top arc: "UDDHYAMSHEEL GROUP" with flanking stars (★)
 * - Bottom arc: "उद्यमशील समूह"
 * - Inner circular border framing the divine Gajalakshmi artwork:
 *   - Goddess Lakshmi crowned and seated in Padmasana on a blossoming sacred lotus
 *   - Upper hands holding blooming lotuses, right hand in blessing mudra, left hand showering continuous coins from Kalasha pot
 *   - Flanked by two royal elephants (Gaja) with ornamental saddle cloths and raised trunks holding lotuses
 *   - Horizontal badge: "— Estd. 2079 B.S. —"
 *   - Contact information: Phone (+977-9743403017), Email (uddhyamsheel.group@gmail.com), Location (Lumbini, Nepal)
 */
export const STAMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <!-- Paths for curved circular text -->
    <path id="stampTopArc" d="M 60, 250 A 190,190 0 0,1 440, 250" />
    <path id="stampBottomArc" d="M 440, 250 A 190,190 0 0,1 60, 250" />
  </defs>

  <!-- Outer Double Circular Borders (Official Royal Blue #002984) -->
  <circle cx="250" cy="250" r="236" fill="none" stroke="#002984" stroke-width="12" />
  <circle cx="250" cy="250" r="222" fill="none" stroke="#002984" stroke-width="3" />
  <circle cx="250" cy="250" r="156" fill="none" stroke="#002984" stroke-width="3" />

  <!-- Top Curved English Text: UDDHYAMSHEEL GROUP -->
  <text font-family="'Plus Jakarta Sans', 'Arial Black', sans-serif" font-size="29.5" font-weight="900" fill="#002984" letter-spacing="3.5">
    <textPath href="#stampTopArc" startOffset="50%" text-anchor="middle">
      UDDHYAMSHEEL GROUP
    </textPath>
  </text>

  <!-- Left Flank Star -->
  <g transform="translate(68, 258) scale(1.15)">
    <polygon points="0,-14 4.3,-4.3 14,-4.3 6,2.5 9,12 0,6 -9,12 -6,2.5 -14,-4.3 -4.3,-4.3" fill="#002984" />
  </g>

  <!-- Right Flank Star -->
  <g transform="translate(432, 258) scale(1.15)">
    <polygon points="0,-14 4.3,-4.3 14,-4.3 6,2.5 9,12 0,6 -9,12 -6,2.5 -14,-4.3 -4.3,-4.3" fill="#002984" />
  </g>

  <!-- Bottom Curved Nepali Text: उद्यमशील समूह -->
  <text font-family="'Mukta', 'Noto Sans Devanagari', 'Arial', sans-serif" font-size="34" font-weight="900" fill="#002984" letter-spacing="4">
    <textPath href="#stampBottomArc" startOffset="50%" text-anchor="middle">
      उद्यमशील समूह
    </textPath>
  </text>

  <!-- ================= CENTER EMBLEM: GAJALAKSHMI ================= -->
  <g id="gajalakshmiCenter" transform="translate(250, 160)">
    <!-- Halo / Prabhavali -->
    <circle cx="0" cy="-35" r="42" fill="none" stroke="#002984" stroke-width="2.5" />
    <circle cx="0" cy="-35" r="46" fill="none" stroke="#002984" stroke-width="1" stroke-dasharray="2 2" />

    <!-- Crown / Mukut -->
    <path d="M -16 -62 L 0 -85 L 16 -62 L 8 -56 L -8 -56 Z" fill="#002984" />
    <circle cx="0" cy="-87" r="3" fill="#002984" />

    <!-- Goddess Face & Bust -->
    <ellipse cx="0" cy="-42" rx="14" ry="17" fill="#ffffff" stroke="#002984" stroke-width="2.2" />
    <path d="M -8 -45 Q -4 -48 0 -45 Q 4 -48 8 -45" stroke="#002984" stroke-width="1.2" fill="none" />
    <circle cx="0" cy="-48" r="1.5" fill="#002984" />
    <path d="M -4 -38 Q 0 -35 4 -38" stroke="#002984" stroke-width="1.2" fill="none" />

    <!-- Goddess Torso & Saree Jewellery -->
    <path d="M -18 -25 L -26 35 L 26 35 L 18 -25 Z" fill="#ffffff" stroke="#002984" stroke-width="2.2" />
    <path d="M -14 -25 Q 0 -5 14 -25" stroke="#002984" stroke-width="2" fill="none" />
    <path d="M -16 -18 Q 0 5 16 -18" stroke="#002984" stroke-width="1.5" fill="none" />
    <path d="M -18 -10 Q 0 16 18 -10" stroke="#002984" stroke-width="1.5" fill="none" />

    <!-- Upper Hands holding Lotuses -->
    <path d="M -22 -20 Q -48 -28 -38 -55" stroke="#002984" stroke-width="3" fill="none" />
    <g transform="translate(-40, -65) scale(0.7)">
      <path d="M 0 0 C -15 -20 0 -40 0 -40 C 0 -40 15 -20 0 0 Z" fill="#002984" />
      <path d="M -8 -5 C -25 -20 -15 -35 -5 -32 Z" fill="#002984" />
      <path d="M 8 -5 C 25 -20 15 -35 5 -32 Z" fill="#002984" />
    </g>

    <path d="M 22 -20 Q 48 -28 38 -55" stroke="#002984" stroke-width="3" fill="none" />
    <g transform="translate(40, -65) scale(0.7)">
      <path d="M 0 0 C -15 -20 0 -40 0 -40 C 0 -40 15 -20 0 0 Z" fill="#002984" />
      <path d="M -8 -5 C -25 -20 -15 -35 -5 -32 Z" fill="#002984" />
      <path d="M 8 -5 C 25 -20 15 -35 5 -32 Z" fill="#002984" />
    </g>

    <!-- Lower Hand Right: Abhaya Mudra (Blessing) -->
    <path d="M -18 0 Q -32 5 -25 22" stroke="#002984" stroke-width="3" fill="none" />
    <circle cx="-25" cy="18" r="4" fill="#002984" />

    <!-- Lower Hand Left: Golden Coin Pot (Dhan Varada Kalasha) -->
    <path d="M 18 0 Q 30 10 24 24" stroke="#002984" stroke-width="3" fill="none" />
    <ellipse cx="26" cy="24" rx="9" ry="8" fill="#002984" />
    <!-- Showering coins stream cascading down -->
    <g fill="#002984">
      <circle cx="22" cy="35" r="2.5" />
      <circle cx="27" cy="40" r="3" />
      <circle cx="18" cy="45" r="2.8" />
      <circle cx="24" cy="50" r="3.2" />
      <circle cx="16" cy="55" r="3.5" />
      <circle cx="26" cy="58" r="3.8" />
    </g>

    <!-- Lotus Throne (Padmasana) -->
    <g transform="translate(0, 42)">
      <path d="M 0 10 C -20 -10 -40 5 0 24 C 40 5 20 -10 0 10 Z" fill="#002984" />
      <path d="M -25 8 C -55 -6 -70 12 -20 25 Z" fill="#002984" />
      <path d="M 25 8 C 55 -6 70 12 20 25 Z" fill="#002984" />
      <path d="M -50 15 C -80 6 -90 26 -35 32 Z" fill="#002984" />
      <path d="M 50 15 C 80 6 90 26 35 32 Z" fill="#002984" />
      <path d="M -75 28 C -30 42 30 42 75 28 C 45 48 -45 48 -75 28 Z" fill="#002984" />
    </g>

    <!-- Left Gajalakshmi Elephant with Raised Trunk Holding Lotus -->
    <g transform="translate(-108, 10) scale(0.6)">
      <path d="M -40 20 C -40 -30 20 -35 35 -10 C 45 10 35 50 20 50 L -25 50 Z" fill="#ffffff" stroke="#002984" stroke-width="3" />
      <path d="M 30 -10 C 45 -40 60 -50 55 -70 C 50 -80 35 -75 40 -60" fill="none" stroke="#002984" stroke-width="4.5" stroke-linecap="round" />
      <circle cx="38" cy="-68" r="6" fill="#002984" />
      <path d="M -15 -10 L 15 -10 L 10 25 L -10 25 Z" fill="#002984" />
      <rect x="-30" y="35" width="10" height="25" fill="#002984" />
      <rect x="15" y="35" width="10" height="25" fill="#002984" />
      <path d="M -5 -20 C -25 -20 -25 10 -5 10 Z" fill="#ffffff" stroke="#002984" stroke-width="2.5" />
    </g>

    <!-- Right Gajalakshmi Elephant with Raised Trunk Holding Lotus -->
    <g transform="translate(108, 10) scale(-0.6, 0.6)">
      <path d="M -40 20 C -40 -30 20 -35 35 -10 C 45 10 35 50 20 50 L -25 50 Z" fill="#ffffff" stroke="#002984" stroke-width="3" />
      <path d="M 30 -10 C 45 -40 60 -50 55 -70 C 50 -80 35 -75 40 -60" fill="none" stroke="#002984" stroke-width="4.5" stroke-linecap="round" />
      <circle cx="38" cy="-68" r="6" fill="#002984" />
      <path d="M -15 -10 L 15 -10 L 10 25 L -10 25 Z" fill="#002984" />
      <rect x="-30" y="35" width="10" height="25" fill="#002984" />
      <rect x="15" y="35" width="10" height="25" fill="#002984" />
      <path d="M -5 -20 C -25 -20 -25 10 -5 10 Z" fill="#ffffff" stroke="#002984" stroke-width="2.5" />
    </g>
  </g>

  <!-- ================= LOWER CONTACT & ESTD BADGE ================= -->
  <!-- Estd. 2079 B.S. with horizontal bars -->
  <line x1="120" y1="262" x2="160" y2="262" stroke="#002984" stroke-width="2.5" />
  <text x="250" y="268" font-family="'Plus Jakarta Sans', sans-serif" font-size="19" font-weight="900" fill="#002984" text-anchor="middle" letter-spacing="1">
    Estd. 2079 B.S.
  </text>
  <line x1="340" y1="262" x2="380" y2="262" stroke="#002984" stroke-width="2.5" />

  <!-- Phone with Telephone Icon (+977-9743403017) -->
  <g transform="translate(168, 282) scale(0.7)">
    <circle cx="10" cy="10" r="12" fill="#002984" />
    <path d="M 6 5 L 8 5 C 9 5 10 6 10 7 L 9 9 C 10 11 11 12 13 13 L 15 12 C 16 12 17 13 17 14 L 17 16 C 17 17 16 18 15 18 C 9 18 4 13 4 7 C 4 6 5 5 6 5 Z" fill="#ffffff" />
  </g>
  <text x="260" y="293" font-family="'Plus Jakarta Sans', monospace" font-size="14.5" font-weight="800" fill="#002984" text-anchor="middle">
    +977-9743403017
  </text>

  <!-- Email with Envelope Icon (uddhyamsheel.group@gmail.com) -->
  <g transform="translate(152, 303) scale(0.7)">
    <rect x="0" y="2" width="20" height="15" rx="2" fill="#002984" />
    <path d="M 0 3 L 10 11 L 20 3" stroke="#ffffff" stroke-width="1.8" fill="none" />
  </g>
  <text x="264" y="315" font-family="'Plus Jakarta Sans', sans-serif" font-size="12.5" font-weight="800" fill="#002984" text-anchor="middle">
    uddhyamsheel.group@gmail.com
  </text>

  <!-- Location with Pin Icon (Lumbini, Nepal) -->
  <g transform="translate(182, 325) scale(0.7)">
    <path d="M 10 0 C 4.5 0 0 4.5 0 10 C 0 16 10 24 10 24 C 10 24 20 16 20 10 C 20 4.5 15.5 0 10 0 Z" fill="#002984" />
    <circle cx="10" cy="9" r="4" fill="#ffffff" />
  </g>
  <text x="264" y="338" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="900" fill="#002984" text-anchor="middle">
    Lumbini, Nepal
  </text>
</svg>`;

export const LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;
export const STAMP_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(STAMP_SVG)}`;

/**
 * Official Gold Foil Notarized Embossed Medallion Seal (Vector SVG)
 * High-end physical certificate gold foil seal with scalloped 36-point starburst,
 * concentric engraved guilloché rings, radiant sunburst, and satin ribbon tails.
 */
export const GOLD_SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="100%" height="100%">
  <defs>
    <!-- Metallic Gold Foil Gradients -->
    <linearGradient id="goldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff3b0" />
      <stop offset="25%" stop-color="#e0a926" />
      <stop offset="50%" stop-color="#ffea79" />
      <stop offset="75%" stop-color="#b8860b" />
      <stop offset="100%" stop-color="#fdf1a9" />
    </linearGradient>

    <linearGradient id="goldDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#996515" />
      <stop offset="50%" stop-color="#d4af37" />
      <stop offset="100%" stop-color="#734d0e" />
    </linearGradient>

    <linearGradient id="ribbonBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#002984" />
      <stop offset="50%" stop-color="#005a9e" />
      <stop offset="100%" stop-color="#01142b" />
    </linearGradient>

    <path id="sealArcTop" d="M 40, 110 A 70,70 0 0,1 180, 110" />
    <path id="sealArcBottom" d="M 180, 110 A 70,70 0 0,1 40, 110" />

    <filter id="sealShadow" x="-15%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#734d0e" flood-opacity="0.35" />
    </filter>
  </defs>

  <g filter="url(#sealShadow)">
    <!-- Blue Satin Ribbon Tails Draping Below -->
    <path d="M 85 170 L 60 260 L 85 242 L 110 260 L 100 170 Z" fill="url(#ribbonBlue)" stroke="#e0a926" stroke-width="1.5" />
    <path d="M 140 170 L 130 260 L 155 242 L 180 260 L 155 170 Z" fill="url(#ribbonBlue)" stroke="#e0a926" stroke-width="1.5" />
    <line x1="85" y1="170" x2="85" y2="242" stroke="#48cae4" stroke-width="1" opacity="0.6" />
    <line x1="155" y1="170" x2="155" y2="242" stroke="#48cae4" stroke-width="1" opacity="0.6" />

    <!-- 36-Point Scalloped Starburst Gold Foil Base -->
    <g transform="translate(110, 110)">
      <path d="
        M 0 -92 L 16 -88 L 31 -90 L 44 -80 L 59 -77 L 69 -63 L 81 -54 L 88 -38 L 94 -26 L 96 -9 L 98 8 L 93 25 L 89 40 L 80 54 L 71 66 L 58 78 L 44 85 L 29 93 L 13 94 L -3 96 L -19 92 L -34 91 L -48 81 L -62 76 L -72 63 L -83 51 L -90 36 L -95 21 L -97 5 L -96 -12 L -92 -28 L -85 -43 L -76 -56 L -64 -67 L -51 -77 L -36 -86 L -20 -90 Z
      " fill="url(#goldFoil)" stroke="#996515" stroke-width="1.5" />

      <circle cx="0" cy="0" r="82" fill="url(#goldDark)" />
      <circle cx="0" cy="0" r="80" fill="url(#goldFoil)" />
      <circle cx="0" cy="0" r="77" fill="none" stroke="#734d0e" stroke-width="1" stroke-dasharray="2 2" />
      <circle cx="0" cy="0" r="63" fill="none" stroke="#734d0e" stroke-width="1.5" />
      <circle cx="0" cy="0" r="60" fill="url(#goldDark)" />
      <circle cx="0" cy="0" r="58" fill="url(#goldFoil)" />

      <!-- Center Divine Lotus / Emblem -->
      <g stroke="#996515" stroke-width="1" opacity="0.7">
        <line x1="0" y1="-50" x2="0" y2="-36" />
        <line x1="35" y1="-35" x2="25" y2="-25" />
        <line x1="50" y1="0" x2="36" y2="0" />
        <line x1="35" y1="35" x2="25" y2="25" />
        <line x1="0" y1="50" x2="0" y2="36" />
        <line x1="-35" y1="35" x2="-25" y2="25" />
        <line x1="-50" y1="0" x2="-36" y2="0" />
        <line x1="-35" y1="-35" x2="-25" y2="-25" />
      </g>

      <path d="M 0 -22 C -8 -5 -18 8 0 18 C 18 8 8 -5 0 -22 Z" fill="#996515" />
      <path d="M -2 -20 C -7 -4 -16 6 0 16 C 16 6 7 -4 -2 -20 Z" fill="#ffe066" />
      <path d="M -12 -8 C -22 2 -20 16 0 18 C -12 14 -16 5 -12 -8 Z" fill="#996515" />
      <path d="M 12 -8 C 22 2 20 16 0 18 C 12 14 16 5 12 -8 Z" fill="#996515" />
      <circle cx="0" cy="-2" r="3" fill="#ffffff" />

      <!-- Year Badge -->
      <rect x="-24" y="24" width="48" height="13" rx="3" fill="#002984" stroke="#ffe066" stroke-width="1" />
      <text x="0" y="33.5" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">
        2079 B.S.
      </text>
    </g>

    <!-- Curved Engraved Lettering inside Ring -->
    <text font-family="'Plus Jakarta Sans', 'Arial', sans-serif" font-size="9" font-weight="900" fill="#4a2e00" letter-spacing="2.2">
      <textPath href="#sealArcTop" startOffset="50%" text-anchor="middle">
        UDDHYAMSHEEL GROUP
      </textPath>
    </text>
    <text font-family="'Plus Jakarta Sans', 'Arial', sans-serif" font-size="8.5" font-weight="900" fill="#4a2e00" letter-spacing="2.5">
      <textPath href="#sealArcBottom" startOffset="50%" text-anchor="middle">
        ★ OFFICIAL CHARTER SEAL ★
      </textPath>
    </text>
  </g>
</svg>`;

export const GOLD_SEAL_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(GOLD_SEAL_SVG)}`;
