# The Hive Reunion artwork

Original game illustrations generated with OpenAI's built-in image generation tool on 2026-11-13. Editable PNGs live in `sources/`; exact production prompts and tool provenance live in [prompts.json](prompts.json). Original artwork is distributed under the repository's [MIT license](../../../LICENSE).

The official `binagora-logo.png` (474×132) and `binagora-icon.png` (192×192) are faithful, unmodified company marks downloaded from [Binagora's logo](https://binagora.com/images/logo.png) and [icon](https://binagora.com/favicons/android-icon-192x192.png). They remain Binagora's property, packaged for this company event game at the user's direction, and are excluded from the original-art MIT grant. Do not reuse them as a generic art pack. No third-party marketing photography is included in the game.

The hotel illustration references the [official hotel](https://www.hermitagehotel.com.ar/) and [MPMC exterior gallery](https://mpmcarquitectos.com/hotel-hermitage/), including its [facade photograph](https://mpmcarquitectos.com/wp-content/gallery/hotel-hermitage/Hermitage-02.jpg). The illustrated hotel preserves the stepped three-part massing, red walls, cream trim, slate mansard roofs, pale base and one readable hotel sign. Coastal plates interpret El Puerto, Playa Grande, Torreón del Monje and the Rambla as a stylized montage. Food references imply no sponsorship.

## Runtime contracts

| File | Contract |
| --- | --- |
| `courier.webp` | 1024×1024 transparent sheet, four complete 512×512 bee cels: glide, thrust, delight, glide alternate |
| `objects.webp` | 1024×1024 transparent atlas: top-left alfajor, top-right churros, bottom-left duck, bottom-right gull |
| `coast.webp`, `beach.webp`, `central.webp` | 1536×1024 opaque coastal chapters, mirrored scrolling plates |
| `hotel.webp` | 1536×1024 transparent, complete hotel elevation |
| `binagora-logo.png` | Official 474×132 full company mark, menu and required-art gate |
| `binagora-icon.png` | Official 192×192 bee-and-hash mark, favicon |

The bee uses a 94-unit square anchored at 55% across and 60% down. Wing animation switches complete cels, with a brief delighted cel on collection. The body/bag pickup envelope is owned by `content.ts`, independently of the forgiving 16-unit hazard radius. Food/duck images draw at 34 units with the same 13×13-unit diamond collection envelope. The gull draws at 94 units around its unchanged 35-unit collision radius. Wings and beak extend beyond its forgiving contact body.

Solid stone structures fill the actual top/bottom collision regions. Their terracotta caps and cream warning stripes mark dangerous edges. Event beacons are Canvas-authored orange hash badges with a one-time activation bloom. Crowd members repeat the complete bee cels with bounded pose, direction, cup and scarf variants. The decorative reviewer, table, captions and confetti are Canvas-owned, without simulation rules.

## Repacking

Run `pnpm art:pack`. The 1254×1254 bee/object sources resize as whole sheets to 1024×1024, preserving alpha and fixed cell boundaries. Do not independently trim bee frames. Chapter plates and the hotel resize to 1536×1024 and encode as WebP. Original PNGs remain authoring inputs and do not enter the browser build. `art.ts` validates decoded dimensions before play; `presentation.ts` owns footprints, cells and pivots. All runtime paths are static and relative.
