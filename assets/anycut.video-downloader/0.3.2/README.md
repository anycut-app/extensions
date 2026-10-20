# Video Downloader

Download videos, sections of videos, or just their audio from YouTube and [1,000+ other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md) with [yt-dlp](https://github.com/yt-dlp/yt-dlp). Everything you download goes into your library, which works in any project, and, if a project is open, straight into its media, remembering where it came from.

## Your library

Click the **Video Downloader** icon in the activity bar: the sidebar lists everything you've downloaded, newest first. It stays open while you switch between sequences and tabs.

- **+ Timeline** copies a download into the open project and puts it at the playhead. **Project** only adds it to the media.
- The files live in **Downloads › AnyCut › Video Downloader**, so they're there with no project open, and stay if you uninstall the extension. Click the folder at the bottom to open it.
- Adding to a project copies the file into the project folder, so the project works on any computer. On the same drive the copy takes no extra space.

## Download

- Click **+** in the sidebar (or the window icon beside its title) to open the downloader tab. Paste a link and **Look up**.
- Pick a quality (up to 4K, or audio only as MP3). Fill in **From**/**To** to grab just a section, which is handy for reference clips.
- The panel on the right lists every format with its size, and whether it also goes into the project (and where in its folder).
- **Download**. The **Downloads** tab below shows progress, with **Cancel**, **Reveal** and **Add to timeline**; click a download to see its details on the right. The **Log** tab shows yt-dlp's own output, for when a site breaks.

## After downloading

- Select the media (in Media, or its clip on the timeline): the Inspector shows a **Source** section with the original link, channel and upload date.
- Right-click it in Media, then **Download again in higher quality…** to fetch a better copy next to the first. Your timeline doesn't change.

## Ask Claude

With the extension installed, Claude gets two tools:

- `video_downloader_get_info`: looks up a link (title, channel, duration, resolutions) without downloading.
- `video_downloader_download`: downloads it (optionally one section) into your library and adds it to the project.

Try: *"Download the first 30 seconds of https://youtu.be/… in 1080p and put it on V2 at the playhead."*

## yt-dlp

The first time, click **Install yt-dlp**: it fetches yt-dlp from AnyCut's own copy (an unmodified mirror of [yt-dlp's releases](https://github.com/yt-dlp/yt-dlp/releases), each checked against yt-dlp's SHA-256 sums) into this extension's own data folder, and checks it against the SHA-256 again. It looks for a newer one once a day, because sites change; **Video Downloader: Update yt-dlp** in the Command Palette checks now. Only this copy is used, never another yt-dlp on your computer, so the Video Downloader works the same everywhere.

AnyCut's ffmpeg is used to merge video and audio.

Section downloads (**From**/**To**) go through ffmpeg, which YouTube throttles: a few seconds of a long video can take minutes, with no progress shown. A whole short video is usually faster. **Cancel** stops yt-dlp and ffmpeg.

Only download what you have the right to use, and respect each site's terms.

*Screenshots: Big Buck Bunny, © Blender Foundation, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).*
