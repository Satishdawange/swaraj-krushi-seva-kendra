import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { marked } from "marked";

const rootDir = "e:/AI/Swaraj KSK/swaraj-krushi-seva-kendra";
const mdPath = path.join(rootDir, "TRAINING_MANUAL.md");
const htmlPath = path.join(rootDir, "TRAINING_MANUAL.html");
const pdfPath = path.join(
  rootDir,
  "Swaraj_Krushi_Seva_Kendra_Training_Manual.pdf",
);

console.log("Reading markdown from:", mdPath);
const markdown = fs.readFileSync(mdPath, "utf-8");

// Parse markdown to HTML
const contentHtml = marked.parse(markdown);

// HTML Template with print-ready CSS
const fullHtml = `<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <title>स्वराज कृषी सेवा केंद्र - वापरकर्ता व व्यवस्थापक प्रशिक्षण पुस्तिका</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 14mm 18mm 14mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Noto Sans Devanagari', 'Outfit', sans-serif;
      color: #1a241e;
      line-height: 1.65;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    .doc-cover-banner {
      background: linear-gradient(135deg, #123e26, #1b6338);
      color: #ffffff;
      padding: 26px 30px;
      border-radius: 14px;
      margin-bottom: 25px;
      border-bottom: 4px solid #b9dc68;
    }

    .doc-cover-banner h1 {
      margin: 0 0 6px;
      font-size: 26px;
      color: #ffffff;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .doc-cover-banner p {
      margin: 4px 0 0;
      color: #d4f0d9;
      font-size: 13px;
    }

    h1 {
      color: #135c2f;
      font-size: 22px;
      font-weight: 800;
      margin-top: 32px;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 2px solid #c8decb;
      page-break-after: avoid;
      break-after: avoid;
    }

    h2 {
      color: #176b3a;
      font-size: 18px;
      font-weight: 700;
      margin-top: 26px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1.5px solid #e1ebe2;
      page-break-after: avoid;
      break-after: avoid;
    }

    h3 {
      color: #214d2e;
      font-size: 15px;
      font-weight: 700;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
    }

    p {
      margin: 8px 0;
      line-height: 1.7;
    }

    ul, ol {
      margin: 8px 0;
      padding-left: 24px;
    }

    li {
      margin: 4px 0;
      line-height: 1.6;
    }

    blockquote {
      margin: 14px 0;
      padding: 12px 18px;
      background: #f4fbf5;
      border-left: 4px solid #176b3a;
      border-radius: 0 10px 10px 0;
      color: #1b4d2a;
      font-size: 13px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12.5px;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #c9decb;
    }

    th {
      background: #eaf5eb;
      color: #14592f;
      font-weight: 700;
      padding: 10px 12px;
      border-bottom: 2px solid #b7dab9;
      text-align: left;
    }

    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e5eee6;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #fafdfa;
    }

    code {
      font-family: Consolas, 'Courier New', monospace;
      background: #eef6f0;
      color: #176b3a;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 12px;
      border: 1px solid #d0e4d3;
    }

    pre {
      background: #f8faf8;
      border: 1px solid #d2e4d5;
      border-radius: 10px;
      padding: 14px 16px;
      overflow-x: auto;
      font-size: 11.5px;
      line-height: 1.5;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    pre code {
      background: none;
      border: none;
      padding: 0;
      color: #172a1d;
    }

    hr {
      border: 0;
      height: 1px;
      background: #d8e5da;
      margin: 24px 0;
    }

    strong {
      color: #11361c;
    }

    .doc-footer {
      margin-top: 40px;
      padding-top: 14px;
      border-top: 2px solid #dce8de;
      text-align: center;
      font-size: 11px;
      color: #627768;
    }
  </style>
</head>
<body>
  <div class="doc-cover-banner">
    <h1>🌾 स्वराज कृषी सेवा केंद्र</h1>
    <p><strong>अधिकृत वापरकर्ता व व्यवस्थापक प्रशिक्षण पुस्तिका (Training Manual v2.0)</strong></p>
    <p>प्रोप्राईटर: निलेश दवंगे | कानमंडाळे, ता. चांदवड, जि. नाशिक | संपर्क: +91 8459568940</p>
  </div>

  <div class="doc-content">
    ${contentHtml}
  </div>

  <div class="doc-footer">
    स्वराज कृषी सेवा केंद्र • कानमंडाळे, चांदवड • सर्व हक्क राखीव © २०२६
  </div>
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, "utf-8");
console.log("HTML written successfully to:", htmlPath);

// Find Chrome / Edge binary
const browserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

let browserPath = null;
for (const cand of browserCandidates) {
  if (fs.existsSync(cand)) {
    browserPath = cand;
    break;
  }
}

if (!browserPath) {
  console.error("No suitable browser found for headless PDF printing.");
  process.exit(1);
}

console.log("Using browser at:", browserPath);
const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");

const chromeCmd = `"${browserPath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${fileUrl}"`;
console.log("Executing command...");
execSync(chromeCmd, { stdio: "inherit" });

if (fs.existsSync(pdfPath)) {
  const stats = fs.statSync(pdfPath);
  console.log("SUCCESS! PDF generated successfully at:", pdfPath);
  console.log("PDF File Size:", (stats.size / 1024).toFixed(2), "KB");
} else {
  console.error("Failed to generate PDF");
  process.exit(1);
}
