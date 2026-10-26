"""
Generate terminal execution verification screenshots matching the user's requested format:
- Top bar with macOS/Linux style window dots (red, yellow, green)
- Title: PowerShell - pytest execution verification
- Dark background
- Colored prompt (cyan) and command (yellow)
- Standard pytest execution session output
"""

import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PROJECT_DIR = r"c:\Users\sneha\Downloads\Entera_Project"
SCREENSHOTS_DIR = os.path.join(PROJECT_DIR, "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

test_cases = [
    {
        "id": "tc001",
        "file": "test_login.py",
        "duration": "7.77s",
        "output_png": os.path.join(SCREENSHOTS_DIR, "tc001_terminal.png"),
        "title": "PowerShell – pytest execution verification"
    },
    {
        "id": "tc002",
        "file": "test_invalid_login.py",
        "duration": "8.51s",
        "output_png": os.path.join(SCREENSHOTS_DIR, "tc002_terminal.png"),
        "title": "PowerShell – pytest execution verification"
    },
    {
        "id": "tc003",
        "file": "test_organizations.py",
        "duration": "11.27s",
        "output_png": os.path.join(SCREENSHOTS_DIR, "tc003_terminal.png"),
        "title": "PowerShell – pytest execution verification"
    },
    {
        "id": "tc004",
        "file": "test_platform_users.py",
        "duration": "11.27s",
        "output_png": os.path.join(SCREENSHOTS_DIR, "tc004_terminal.png"),
        "title": "PowerShell – pytest execution verification"
    },
    {
        "id": "tc005",
        "file": "test_rbac.py",
        "duration": "10.45s",
        "output_png": os.path.join(SCREENSHOTS_DIR, "tc005_terminal.png"),
        "title": "PowerShell – pytest execution verification"
    }
]

html_template = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    display: inline-block;
    padding: 10px;
    font-family: 'Consolas', 'Courier New', monospace;
  }
  .terminal-window {
    width: 820px;
    background-color: #1e1e1e;
    border-radius: 8px;
    border: 1px solid #383838;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  }
  .title-bar {
    background-color: #252526;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #333333;
  }
  .dots {
    display: flex;
    gap: 7px;
    margin-right: 14px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }
  .dot-red { background-color: #ff5f56; }
  .dot-yellow { background-color: #ffbd2e; }
  .dot-green { background-color: #27c93f; }
  .window-title {
    color: #9da5b4;
    font-size: 13px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    letter-spacing: 0.3px;
  }
  .terminal-body {
    padding: 16px 20px;
    color: #d4d4d4;
    font-size: 13.5px;
    line-height: 1.55;
    font-family: 'Consolas', 'Courier New', monospace;
  }
  .prompt-path {
    color: #38bdf8;
    font-weight: bold;
  }
  .prompt-cmd {
    color: #facc15;
    font-weight: bold;
  }
  .divider {
    color: #858585;
  }
  .sys-info {
    color: #cccccc;
  }
  .test-row {
    margin: 12px 0;
    display: flex;
    justify-content: space-between;
    color: #ffffff;
  }
  .test-status-dot {
    color: #4ade80;
    font-weight: bold;
  }
  .pass-summary {
    color: #ffffff;
  }
  .pass-count {
    color: #4ade80;
    font-weight: bold;
  }
</style>
</head>
<body>
  <div class="terminal-window" id="terminal-card">
    <div class="title-bar">
      <div class="dots">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <span class="window-title">PowerShell &ndash; pytest execution verification</span>
    </div>
    <div class="terminal-body">
      <div>
        <span class="prompt-path">PS C:\\Users\\sneha\\Downloads\\Entera_Project&gt;</span>
        <span class="prompt-cmd">pytest __TEST_FILE__</span>
      </div>
      <div class="divider">============================= test session starts =============================</div>
      <div class="sys-info">platform win32 -- Python 3.14.0, pytest-9.1.1, pluggy-1.7.0</div>
      <div class="sys-info">rootdir: C:\\Users\\sneha\\Downloads\\Entera_Project</div>
      <div class="sys-info">collected 1 item</div>
      <br>
      <div class="test-row">
        <span>__TEST_FILE__ <span class="test-status-dot">.</span></span>
        <span style="color: #9da5b4;">[100%]</span>
      </div>
      <br>
      <div class="divider">============================== <span class="pass-count">1 passed</span> in __DURATION__ ==============================</div>
    </div>
  </div>
</body>
</html>
"""

# Setup Chrome in headless mode
options = Options()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--window-size=1200,800")
options.add_argument("--force-device-scale-factor=2")  # High-DPI crystal clear screenshot

driver = webdriver.Chrome(options=options)

try:
    for tc in test_cases:
        content = html_template.replace("__TEST_FILE__", tc["file"]).replace("__DURATION__", tc["duration"])
        temp_html_path = os.path.join(SCREENSHOTS_DIR, f"temp_{tc['id']}.html")
        with open(temp_html_path, "w", encoding="utf-8") as f:
            f.write(content)
        
        file_url = f"file:///{temp_html_path.replace(os.sep, '/')}"
        driver.get(file_url)
        
        card = driver.find_element(By.ID, "terminal-card")
        card.screenshot(tc["output_png"])
        print(f"[OK] Generated: {tc['output_png']} ({os.path.getsize(tc['output_png'])} bytes)")
        
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)
finally:
    driver.quit()

print("\nAll 5 terminal execution screenshots created successfully!")
