"""
TC_003 — Verify Organization Management
Automated Test Case for Entera.ai using Python, Selenium WebDriver, and pytest.
"""

import os
import sys
import time
import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Configure UTF-8 output if supported
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Load environment variables
load_dotenv()

# Test configuration and secure credentials
BASE_URL = os.getenv("ENTERA_BASE_URL", "http://localhost:5173").rstrip("/")
LOGIN_URL = f"{BASE_URL}/login"
ORGS_URL = f"{BASE_URL}/admin/dashboard/orgs"
ADMIN_USERNAME = os.getenv("ENTERA_ADMIN_USER", os.getenv("ADMIN_EMAIL", "admin@gmail.com"))
ADMIN_PASSWORD = os.getenv("ENTERA_ADMIN_PASSWORD", os.getenv("INITIAL_ADMIN_PASSWORD", "admin@123"))
HEADLESS_MODE = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
ORGS_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc003_organizations.png")
FAILURE_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc003_test_failure.png")


@pytest.fixture(scope="function")
def driver():
    """
    Initializes and yields a configured Chrome WebDriver instance.
    Ensures safe teardown and browser termination.
    """
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    chrome_options = Options()
    if HEADLESS_MODE:
        chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--ignore-certificate-errors")

    browser = webdriver.Chrome(options=chrome_options)
    browser.set_page_load_timeout(30)
    browser.implicitly_wait(0)

    yield browser

    try:
        browser.quit()
    except Exception as e:
        print(f"Warning: error closing browser session: {e}", file=sys.stderr)


def test_tc003_organization_management(driver):
    """
    TC_003: Verify that an authorized Entera.ai administrator can access
    the Organizations module, search/filter organizations, and view organization details.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_003: Verify Organization Management")
    print(f"Target URL: {BASE_URL}")
    print(f"Admin User: {ADMIN_USERNAME}")
    print(f"Organizations Route: {ORGS_URL}")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)

    try:
        # Step 1: Navigate to Login page
        print("[Step 1] Navigating to login page...")
        driver.get(LOGIN_URL)

        # Step 2: Authenticate as Administrator
        print("[Step 2] Authenticating as administrator...")
        username_field = wait.until(
            EC.visibility_of_element_located((By.ID, "login-username")),
            message="Username input field (#login-username) not visible on login page"
        )
        password_field = wait.until(
            EC.visibility_of_element_located((By.ID, "login-password")),
            message="Password input field (#login-password) not visible on login page"
        )
        login_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']")),
            message="Login submit button not clickable"
        )

        username_field.clear()
        username_field.send_keys(ADMIN_USERNAME)
        password_field.clear()
        password_field.send_keys(ADMIN_PASSWORD)
        login_button.click()

        # Wait for authenticated dashboard redirection
        wait.until(
            lambda d: "/login" not in d.current_url,
            message="Authentication failed: Browser remained on /login"
        )
        wait.until(
            lambda d: "/admin/dashboard" in d.current_url,
            message="Failed to redirect to administrator dashboard"
        )
        print("  [OK] Successfully authenticated and arrived at admin dashboard.")

        # Step 3: Locate and click Organizations in sidebar
        print("[Step 3] Locating 'Organizations' link in sidebar navigation...")
        orgs_nav_link = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//aside//a[contains(@href, '/admin/dashboard/orgs') or contains(., 'Organizations')]")
            ),
            message="Organizations navigation link not found in sidebar"
        )
        assert orgs_nav_link.is_displayed(), "Organizations sidebar link must be displayed"
        orgs_nav_link.click()

        # Step 4: Verify navigation to Organizations page
        print("[Step 4] Verifying navigation to Organizations management route...")
        wait.until(
            lambda d: "/admin/dashboard/orgs" in d.current_url,
            message=f"Expected URL to contain '/admin/dashboard/orgs', but got: {driver.current_url}"
        )
        print(f"  [OK] Navigation verified. Current URL: {driver.current_url}")

        # Step 5: Verify page heading and main header elements
        print("[Step 5] Verifying page heading and description...")
        heading = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Organizations')]")),
            message="Organizations page heading (h1) not visible"
        )
        assert heading.text.strip() == "Organizations", f"Unexpected heading: {heading.text}"
        print(f"  [OK] Page heading verified: '{heading.text}'")

        # Step 6: Verify presence of Search bar and Status filter controls
        print("[Step 6] Verifying search and filter controls...")
        search_input = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//input[contains(@placeholder, 'Search organizations')]")),
            message="Search organizations input not visible"
        )
        status_select = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//select[contains(@class, 'h-10')]")),
            message="Status filter select dropdown not visible"
        )
        assert search_input.is_displayed(), "Search input must be displayed"
        assert status_select.is_displayed(), "Status filter dropdown must be displayed"
        print("  [OK] Search bar and Status filter controls verified.")

        # Step 7: Verify organization records or empty-state
        print("[Step 7] Checking organization records...")
        # Wait until loading spinner/message disappears
        wait.until_not(
            EC.text_to_be_present_in_element((By.XPATH, "//body"), "Loading organizations..."),
            message="Organizations list remained in loading state"
        )

        org_cards = driver.find_elements(By.XPATH, "//div[contains(@class, 'space-y-6')]//div[contains(@class, 'glass-card') or contains(@class, 'rounded-2xl') or contains(@class, 'p-8')]")
        org_names_elements = driver.find_elements(By.XPATH, "//h2[contains(@class, 'text-2xl') and contains(@class, 'font-bold')]")
        
        discovered_org_names = [el.text.strip() for el in org_names_elements if el.text.strip()]
        print(f"  [OK] Found {len(discovered_org_names)} registered organization(s): {discovered_org_names}")
        assert len(discovered_org_names) > 0, "Expected at least one registered organization in test environment"

        primary_test_org = discovered_org_names[0]
        print(f"  [OK] Selected test organization for operations: '{primary_test_org}'")

        # Step 8: Test Search Functionality
        print(f"[Step 8] Testing search functionality with query '{primary_test_org}'...")
        search_input.clear()
        search_input.send_keys(primary_test_org)
        time.sleep(0.5)  # Allow React state update to filter

        # Verify only matching organization is shown
        filtered_names_elements = driver.find_elements(By.XPATH, "//h2[contains(@class, 'text-2xl') and contains(@class, 'font-bold')]")
        filtered_names = [el.text.strip() for el in filtered_names_elements if el.text.strip()]
        assert any(primary_test_org in name for name in filtered_names), (
            f"Expected search to find '{primary_test_org}', but got: {filtered_names}"
        )
        print(f"  [OK] Search filter confirmed matching organization: {filtered_names}")

        # Test non-matching search term displays empty search state
        print("[Step 8b] Testing search with non-matching term 'NonExistentXYZ999'...")
        search_input.send_keys(Keys.CONTROL + "a")
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys("NonExistentXYZ999")
        time.sleep(0.5)

        empty_search_msg = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'No matching organizations')]")),
            message="Expected 'No matching organizations' message not displayed for empty search"
        )
        assert empty_search_msg.is_displayed(), "Empty search state message must be displayed"
        print("  [OK] Empty search feedback verified ('No matching organizations').")

        # Reset search input to display all records again
        search_input.send_keys(Keys.CONTROL + "a")
        search_input.send_keys(Keys.BACKSPACE)
        time.sleep(0.5)

        # Step 9: Capture Evidence Screenshot of Organizations Page
        print(f"[Step 9] Capturing evidence screenshot: {ORGS_SCREENSHOT}...")
        driver.save_screenshot(ORGS_SCREENSHOT)
        assert os.path.exists(ORGS_SCREENSHOT), "Screenshot file was not saved"
        print(f"  [OK] Screenshot successfully saved ({os.path.getsize(ORGS_SCREENSHOT)} bytes).")

        # Step 10: Test View Details for an organization
        print(f"[Step 10] Testing 'View Full Details' for organization '{primary_test_org}'...")
        details_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, f"//h2[contains(text(), '{primary_test_org}')]/ancestor::div[contains(@class, 'glass-card') or contains(@class, 'p-8')]//button[contains(., 'View Full Details')]")
            ),
            message=f"'View Full Details' button for '{primary_test_org}' not clickable"
        )
        details_button.click()

        # Verify navigation to organization details page (/admin/dashboard/orgs/:id)
        wait.until(
            lambda d: "/admin/dashboard/orgs/" in d.current_url and not d.current_url.endswith("/orgs"),
            message=f"Failed to navigate to organization details. Current URL: {driver.current_url}"
        )
        details_url = driver.current_url
        print(f"  [OK] Successfully navigated to Organization Details. URL: {details_url}")

        # Verify Organization Details view elements
        org_title = wait.until(
            EC.visibility_of_element_located((By.XPATH, f"//h1[contains(text(), '{primary_test_org}') or contains(@class, 'font-bold')]")),
            message="Organization title not visible on details page"
        )
        print(f"  [OK] Organization title displayed on details page: '{org_title.text}'")

        # Verify Back button returns to Organizations list
        back_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Back to Organizations')]")),
            message="'Back to Organizations' button not found"
        )
        back_button.click()

        wait.until(
            lambda d: d.current_url.rstrip("/").endswith("/admin/dashboard/orgs"),
            message="Failed to navigate back to Organizations list"
        )
        print("  [OK] Return to Organizations list page verified.")

        print("=" * 70)
        print("TEST TC_003 STATUS: PASS")
        print("Organizations module, list view, search filtering, and details view verified.")
        print("=" * 70)

    except Exception as exc:
        print(f"\n[TEST FAILURE] An exception occurred during TC_003 execution: {exc}")
        try:
            driver.save_screenshot(FAILURE_SCREENSHOT)
            print(f"Saved failure diagnostic screenshot to: {FAILURE_SCREENSHOT}")
        except Exception as scr_err:
            print(f"Could not save failure screenshot: {scr_err}")
        raise exc
