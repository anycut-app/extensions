# Thumbnail Maker

Turn a frame of your edit into a YouTube thumbnail: pick a style, type a title, save.

## Make one

1. Open **Thumbnail** from the activity bar. The canvas fills the tab, the controls are on the right, and the tab's sequence is in the Timeline below.
2. **Pick a frame.** With **Follow the playhead** on, scrub the Timeline and the background follows. Or click **Choose image…**, or drop an image on the canvas.
3. **Pick a style.** Eight looks (Punch, Tilted, Boxed, Glow, Comic, Clean, Marker, Shout), each previewed on your own frame. A style sets the title's look and place and the background's mood; it never touches your text, frame or stickers.
4. **Type the title.** Put `*stars*` around words to highlight them: `I TRIED *THIS*`. Choose from six bundled thumbnail fonts (or Impact), and outline, shadow, glow or boxed text, with size, tilt, width and spacing.
5. **Place things on the canvas.** Drag the title, the badge ("NEW", "PART 2") and the arrow or circle stickers; scroll over one to resize it (the arrow turns). Drag the picture to move it, scroll on it to zoom. Things snap to the middle.
6. **Check it small.** Below the canvas, it's shown at YouTube's sizes (home, search, up next, in dark or light), and the **Safe area** guide shows where the video's length covers the corner.
7. **Save.** A 1280×720 PNG, or a JPG under YouTube's 2 MB limit, into `thumbnails/` in your project folder (added to the media), or **Downloads › AnyCut › Thumbnail Maker** with no project open.

You can open several thumbnail tabs at once, each tied to the sequence that was active when you opened it (a 16:9 cut and a 9:16 short, say), each with its own settings.

This extension runs no code of its own outside its pages: it only reads timeline frames, writes into the project folder (or its folder in Downloads) and adds media, which is all its package.json asks for. Its canvas and its controls talk to each other with `anycut.tab` messages.

*Fonts: Anton, Bebas Neue, Archivo Black and Bangers (SIL Open Font License), Luckiest Guy and Permanent Marker (Apache 2.0); see `ui/fonts`. Screenshots: Big Buck Bunny, © Blender Foundation, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).*
