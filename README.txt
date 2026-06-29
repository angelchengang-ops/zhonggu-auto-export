ZHONGGU AUTO EXPORT - MEDIA FILE GUIDE
======================================

FOLDER STRUCTURE
----------------
images/hero/
  Homepage hero/banner images.
  Main homepage image: images/hero/hero-car.jpg

images/cars/
  All vehicle inventory photos.
  Naming rule: brand-model-year-01.jpg
  Use lowercase English letters and hyphens. Do not use spaces.
  Examples:
    images/cars/geely-monjaro-2024-01.jpg
    images/cars/saic-roewe-rx5-2024-01.jpg
    images/cars/aion-y-2023-01.jpg

images/company/
  Company-owned office, delivery, inspection, and loading photos.
  Current page positions:
    images/company/office1.jpg
    images/company/delivery1.jpg
    images/company/delivery2.jpg
    images/company/loading1.jpg

videos/
  Company-owned delivery and loading videos.
  Current page positions:
    videos/delivery1.mp4
    videos/delivery2.mp4

HOW TO REPLACE IMAGES
---------------------
1. Prepare JPG images using the exact filename shown in the HTML or cars.json file.
2. Place each file in its matching folder.
3. Replace an existing file while keeping the same filename to update it without editing code.
4. To use a different filename, update both index.html and cars.json for vehicle images.
5. Use only company-owned photos or manufacturer-authorized images.
6. Keep vehicle images at a consistent aspect ratio. A landscape image around 1200 x 750 pixels is recommended.

MISSING FILE FALLBACKS
----------------------
Vehicle and company images automatically display a built-in placeholder when a file is missing.
If images/hero/hero-car.jpg is missing, the homepage keeps its professional gradient background.
Missing videos keep the video area in place and do not break the page layout.

REUPLOAD TO NETLIFY
-------------------
Manual deployment:
1. Test the site by opening index.html.
2. Confirm the new images use the exact required filenames.
3. Open the Netlify dashboard and select the Zhonggu Auto Export site.
4. Open the Deploys page.
5. Drag the complete ZhongguAutoExport project folder into the manual deploy area.
6. Wait for the deploy to finish, then open the published site and refresh the browser cache.

Git-based deployment:
1. Add the changed images and project files to the connected Git repository.
2. Commit and push the changes.
3. Netlify will automatically build and publish the updated site.

MEDIA MANAGER UPLOAD CHANNEL
----------------------------
The Company page now reads the six Company Strength Display / Company Videos slots from:
  data/media-config.json

Run the local media server:
  start-media-server.bat

Or from a terminal:
  npm run media-server

Or directly:
  node server.js

The server binds to 0.0.0.0 and prints both addresses:
  Local:   http://127.0.0.1:3001/admin/media.html
  Network: http://YOUR-LAN-IP:3001/admin/media.html
  Health:  http://127.0.0.1:3001/api/health

Open the Network address on a phone connected to the same Wi-Fi, then open:
  http://YOUR-LAN-IP:3001/admin/media.html

Set the upload password through an environment variable when needed:
  ZHONGGU_MEDIA_PASSWORD=your-password

If no environment variable is set, the local default is used by server.js. Default local media password: zg2026. The password is checked by /api/media-login and upload APIs and is not printed in the admin page UI.

Uploaded files are saved without overwriting old files:
  uploads/company/vehicle-preparation/
  uploads/company/pre-shipment-inspection/
  uploads/company/customer-delivery/
  uploads/company/export-loading/
  uploads/company/videos/pre-shipment-inspection/
  uploads/company/videos/export-loading/

New uploads are added to the relevant media-config.json items list and become active automatically. Older assets remain in the history list and can be selected again from the admin page.
