# DCUKUR Assets & Image Guide

This document guides you on where to place your images and the recommended specifications for each to maintain the premium **dcukur** aesthetic.

## Folder Structure
All images and videos should be placed in:
`src/assets/`

## Recommended Assets

| Filename | Recommended Resolution | Component | Description |
|----------|-----------------------|-----------|-------------|
| `hero-video.mp4` | 1080p (Lightweight) | `Hero.jsx` | Silent, looped cinematic video of barbering. |
| `hero-bg.webp` | 2000 x 1200 px | `Hero.jsx` | Cinematic dark-toned barbershop fallback background. |
| `service-1.webp` | 800 x 800 px | `Services.jsx` | Close-up image of a precision haircut/fade. |
| `service-2.webp` | 800 x 800 px | `Services.jsx` | Image showing a hot towel shave session. |
| `service-3.webp` | 800 x 800 px | `Services.jsx` | Close-up of beard grooming or tools. |
| `service-4.webp` | 800 x 800 px | `Services.jsx` | Overall studio atmosphere or premium treatment. |
| `logo-gold.svg` | Vector | `Navbar.jsx` | Your gold-colored logo (replaces the text logo). |

## Integration Tips
1. **Format**: Use `.webp` for the best balance between quality and performance.
2. **Naming**: Keep names lowercase and use hyphens (e.g., `fade-cut.webp`).
3. **Brightness**: Since the website is **Black & Gold**, ensure your images are slightly underexposed or have a dark filter to prevent the white/gold text from becoming unreadable.

## Placeholder Logic
The code is currently set to look for these files in `src/assets/`. If the files are missing, it will display a dark gold placeholder box with the filename labeled.
