# Thumbnail Maker

Turn a frame of your edit into a YouTube thumbnail.

1. Open **Thumbnail** from the activity bar. The canvas fills the tab; the controls are in the panel on the right, and the tab's sequence is in the Timeline below.
2. With **Follow the playhead** on, scrub the Timeline: the background is the frame under the playhead. Or click **Choose image…**.
3. Type a title; set its size, colour, outline and position. Add a badge ("NEW", "PART 2").
4. Darken, saturate, zoom and vignette the background.
5. **Save PNG to project** writes a 1280×720 PNG to `thumbnails/` in your project folder and adds it to the media. With no project open, it goes to **Downloads › AnyCut › Thumbnail Maker** instead.

You can open several thumbnail tabs at once, each tied to the sequence that was active when you opened it (a 16:9 cut and a 9:16 short, say), each with its own settings.

This extension runs no code of its own outside its pages: it only reads timeline frames, writes into the project folder (or its folder in Downloads) and adds media, which is all its package.json asks for. Its canvas and its controls talk to each other with `anycut.tab` messages.

*Screenshots: Big Buck Bunny, © Blender Foundation, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).*
