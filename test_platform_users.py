"""
TC_004 — Verify Platform Users Management
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

# Configure UTF-8 console output if supported
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
USERS_URL = f"{BASE_URL}/admin/dashboard/users"
ADMIN_USERNAME = os.getenv("ENTERA_ADMIN_USER", os.getenv("ADMIN_EMAIL", "admin@gmail.com"))
ADMIN_PASSWORD = os.getenv("ENTERA_ADMIN_PASSWORD", os.getenv("INITIAL_ADMIN_PASSWORD", "admin@123"))
HEADLESS_MODE = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
USERS_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc004_platform_users.png")
FAILURE_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc004_test_failure.png")


@pytest.fixture(scope="function")
def driver():
    """
    Initializes and yields a configured Chrome WebDriver instance.
    Guarantees safe teardown and browser termination.
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


def test_tc004_platform_users_management(driver):
    """
    TC_004: Verify that an authorized administrator can access the Platform Users
    module, view registered user records across organizations, and use search filtering.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_004: Verify Platform Users Management")
    print(f"Target URL: {BASE_URL}")
    print(f"Admin User: {ADMIN_USERNAME}")
    print(f"Platform Users Route: {USERS_URL}")
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

        # Step 3: Locate and click Platform Users in sidebar navigation
        print("[Step 3] Locating 'Platform Users' link in sidebar navigation...")
        users_nav_link = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//aside//a[contains(@href, '/admin/dashboard/users') or contains(., 'Platform Users')]")
            ),
            message="Platform Users navigation link not found in sidebar"
        )
        assert users_nav_link.is_displayed(), "Platform Users sidebar link must be displayed"
        users_nav_link.click()

        # Step 4: Verify navigation to Platform Users route
        print("[Step 4] Verifying navigation to Platform Users route...")
        wait.until(
            lambda d: "/admin/dashboard/users" in d.current_url,
            message=f"Expected URL to contain '/admin/dashboard/users', but got: {driver.current_url}"
        )
        print(f"  [OK] Navigation verified. Current URL: {driver.current_url}")

        # Step 5: Verify page heading and subtitle description
        print("[Step 5] Verifying page heading and description...")
        heading = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Platform Users')]")),
            message="Platform Users page heading (h1) not visible"
        )
        assert heading.text.strip() == "Platform Users", f"Unexpected heading: {heading.text}"
        print(f"  [OK] Page heading verified: '{heading.text}'")

        # Step 6: Verify Search bar and Filter controls
        print("[Step 6] Verifying search input and filter dropdowns...")
        search_input = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//input[contains(@placeholder, 'Search users')]")),
            message="Search users input not visible"
        )
        filter_selects = driver.find_elements(By.XPATH, "//select[contains(@class, 'h-10')]")
        assert len(filter_selects) >= 3, f"Expected at least 3 filter dropdowns (Status, Role, Org), found {len(filter_selects)}"
        assert search_input.is_displayed(), "Search input must be displayed"
        print(f"  [OK] Search bar and {len(filter_selects)} filter dropdowns verified (Status, Role, Organization).")

        # Step 7: Verify User Data Table and Headers
        print("[Step 7] Checking Platform Users data table...")
        # Wait for table header to be visible
        table_header = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//table//thead")),
            message="Platform Users table thead not visible"
        )
        headers = [th.text.strip() for th in table_header.find_elements(By.XPATH, ".//th") if th.text.strip()]
        expected_headers = ["USER", "ORGANIZATION", "ROLE", "STATUS", "ACTIONS"]
        for expected in expected_headers:
            assert any(expected in h.upper() for h in headers), f"Header '{expected}' not found in table headers: {headers}"
        print(f"  [OK] Table headers verified: {headers}")

        # Step 8: Verify user rows are populated
        print("[Step 8] Verifying user records in table...")
        user_rows = wait.until(
            EC.presence_of_all_elements_located((By.XPATH, "//table//tbody//tr")),
            message="No user rows found in table tbody"
        )
        assert len(user_rows) > 0, "Expected at least one user record in the platform users table"
        print(f"  [OK] Found {len(user_rows)} user record row(s) displayed.")

        # Read some user names and roles from the table
        user_name_elements = driver.find_elements(By.XPATH, "//table//tbody//tr//p[contains(@class, 'font-medium')]")
        displayed_names = [el.text.strip() for el in user_name_elements if el.text.strip()]
        print(f"  [OK] Sample displayed user names: {displayed_names[:5]}")
        assert any("System Administrator" in name or "admin" in name.lower() for name in displayed_names), (
            "System Administrator was expected in the platform users list"
        )

        # Step 9: Test Search Functionality with known test user
        known_test_user = "John"
        print(f"[Step 9] Testing search filtering for user '{known_test_user}'...")
        search_input.clear()
        search_input.send_keys(known_test_user)
        time.sleep(0.5)

        filtered_name_elements = driver.find_elements(By.XPATH, "//table//tbody//tr//p[contains(@class, 'font-medium')]")
        filtered_names = [el.text.strip() for el in filtered_name_elements if el.text.strip()]
        print(f"  [OK] Filtered user rows after searching '{known_test_user}': {filtered_names}")
        assert any(known_test_user.lower() in name.lower() for name in filtered_names), (
            f"Expected search results to contain '{known_test_user}', but got: {filtered_names}"
        )

        # Step 10: Test Search Functionality with non-matching term
        non_matching_query = "NonExistentUser999XYZ"
        print(f"[Step 10] Testing non-matching search query '{non_matching_query}'...")
        search_input.send_keys(Keys.CONTROL + "a")
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(non_matching_query)
        time.sleep(0.5)

        empty_filter_cell = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//table//tbody//td[contains(text(), 'No users match your filters')]")),
            message="Expected 'No users match your filters' empty feedback not displayed"
        )
        assert empty_filter_cell.is_displayed(), "Empty search feedback message must be visible"
        print("  [OK] Empty filter state verified: 'No users match your filters.'")

        # Clear search input to restore full table
        search_input.send_keys(Keys.CONTROL + "a")
        search_input.send_keys(Keys.BACKSPACE)
        time.sleep(0.5)

        # Step 11: Inspect user details in table row
        print("[Step 11] Verifying user record attributes in table row...")
        first_row = driver.find_element(By.XPATH, "//table//tbody//tr[1]")
        cells = first_row.find_elements(By.XPATH, ".//td")
        assert len(cells) >= 5, "Row must contain at least User, Organization, Role, Status, and Actions"
        user_info = cells[0].text.replace("\n", " - ")
        org_info = cells[1].text
        role_info = cells[2].text
        status_info = cells[3].text
        print(f"  [OK] Verified First User Record: [{user_info}] | Org: [{org_info}] | Role: [{role_info}] | Status: [{status_info}]")

        # Step 12: Capture Evidence Screenshot of Platform Users Page
        print(f"[Step 12] Capturing evidence screenshot: {USERS_SCREENSHOT}...")
        driver.save_screenshot(USERS_SCREENSHOT)
        assert os.path.exists(USERS_SCREENSHOT), "Screenshot file was not saved"
        print(f"  [OK] Screenshot successfully saved ({os.path.getsize(USERS_SCREENSHOT)} bytes).")

        print("=" * 70)
        print("TEST TC_004 STATUS: PASS")
        print("Platform Users module, data table, column verification, and search filtering verified.")
        print("=" * 70)

    except Exception as exc:
        print(f"\n[TEST FAILURE] An exception occurred during TC_004 execution: {exc}")
        try:
            driver.save_screenshot(FAILURE_SCREENSHOT)
            print(f"Saved failure diagnostic screenshot to: {FAILURE_SCREENSHOT}")
        except Exception as scr_err:
            print(f"Could not save failure screenshot: {scr_err}")
        raise exc
