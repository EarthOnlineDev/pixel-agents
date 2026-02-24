# Pixel Office

A multiplayer pixel art virtual office where people hang out as animated characters in a shared workspace.

Create a room, pick a character, and see your teammates moving around in real time — typing when they're coding, reading when they're reviewing, or just chilling at the office.

![Pixel Office screenshot](webview-ui/public/Screenshot.jpg)

## Try It

**[pixel.earthonline.site](https://pixel.earthonline.site)**

No installation needed — open in any browser.

## Features

- **Multiplayer rooms** — create or join rooms with a 6-character code, share the link with teammates
- **Real-time sync** — see other players' characters moving and animating in real time
- **6 pixel characters** — pick your character from 6 diverse pixel art avatars
- **Status switching** — toggle between Coding, Reading, Idle, and AFK to show what you're up to
- **Office layout editor** — design your office with floors, walls, and furniture (desks, chairs, bookshelves, plants, whiteboards, and more)
- **Sound notifications** — optional chime for activity alerts
- **Zoom & pan** — scroll to zoom (1x–10x), middle-click to pan around

<p align="center">
  <img src="webview-ui/public/characters.png" alt="Pixel Office characters" width="320" height="72" style="image-rendering: pixelated;">
</p>

## Layout Editor

The built-in editor lets you design your office:

- **Floor** — full HSB color control
- **Walls** — auto-tiling walls with color customization
- **Furniture** — desks, chairs, bookshelves, plants, coolers, whiteboards, PCs, lamps
- **Tools** — select, paint, erase, place, eyedropper
- **Undo/Redo** — 50 levels with Ctrl+Z / Ctrl+Y

The grid is expandable up to 64x64 tiles. Click the ghost border outside the current grid to grow it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Rendering | HTML5 Canvas 2D |
| Multiplayer | Supabase Realtime (Presence + Broadcast) |
| Pathfinding | BFS on tile grid |
| Deploy | Vercel |

## Local Development

```bash
git clone https://github.com/EarthOnlineDev/pixel-agents.git
cd pixel-agents
npm install
cd webview-ui && npm install && cd ..
cd webview-ui && npm run dev
```

Create a `.env.local` file in `webview-ui/` with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Acknowledgments

This project is forked from [Pixel Agents](https://github.com/pablodelucca/pixel-agents) by [Pablo De Lucca](https://github.com/pablodelucca) — an original VS Code extension that visualizes AI coding agents as pixel art characters. Pixel Office builds on that foundation and transforms it into a standalone multiplayer web application.

Office furniture assets are based on the [Office Interior Tileset (16x16)](https://donarg.itch.io/officetileset) by **Donarg**.

## License

This project is licensed under the [MIT License](LICENSE).
