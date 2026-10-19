# Changelog

## 0.3.1

- A colour icon, and a new cover.

## 0.3.0

- A library in the sidebar: everything you download, ready to add to any project (**+ Timeline** or **Project**). It stays open while you switch tabs.
- Downloads go to **Downloads › AnyCut › Video Downloader**, so they work with no project open. Adding one to a project copies it into the project folder. What the library knows about each file (title, channel, link) is kept beside them, in a hidden `.library.json`, so it stays with the files.
- yt-dlp comes from AnyCut's own mirror of yt-dlp's releases (checked against yt-dlp's SHA-256 sums, and again on download), never from a third party, and updates itself once a day.
- Asks for `downloads` (its own folder in Downloads) instead of `workspace.read`.

## 0.2.0

- The tab has its own properties panel and Panel tabs: every format with its size and where it will be saved on the right, and **Downloads** and **Log** (yt-dlp's own output) below.
- Downloads can be revealed in File Explorer or added to the timeline from the Downloads tab. Click one to see its details.
- Downloaded media remembers where it came from. Select it and the Inspector shows a **Source** section with the original link, channel and upload date.
- Right-click downloaded media and choose **Download again in higher quality…** to fetch a better copy next to the first.
- Size estimates match the format yt-dlp actually picks.
- Asks for `project.edit`, which "Add to timeline" needs.

## 0.1.0

- First version: look up a link, pick a quality or a section, download into the project folder and its media. Claude gets `get_info` and `download` tools.
