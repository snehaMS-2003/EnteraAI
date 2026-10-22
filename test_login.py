"""
TC_001 — Verify Login with Valid Administrator Credentials
Automated Test Case for Entera.ai using Python, Selenium WebDriver, and pytest.
"""

import os
import sys
import time
import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Configure UTF-8 output if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Load environment variables from .env
load_dotenv()

# Test configuration and secure credentials
BASE_URL = os.getenv("ENTERA_BASE_URL", "http://localhost:5173").rstrip("/")
LOGIN_URL = f"{BASE_URL}/login"
ADMIN_USERNAME = os.getenv("ENTERA_ADMIN_USER", os.getenv("ADMIN_EMAIL", "admin@gmail.com"))
ADMIN_PASSWORD = os.getenv("ENTERA_ADMIN_PASSWORD", os.getenv("INITIAL_ADMIN_PASSWORD", "admin@123"))
HEADLESS_MODE = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
SUCCESS_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc001_login_success.png")
FAILURE_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc001_login_failure.png")


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
    browser.implicitly_wait(0)  # Rely on explicit waits

    yield browser

    try:
        browser.quit()
    except Exception as e:
        print(f"Warning: error closing browser session: {e}", file=sys.stderr)


def test_tc001_valid_admin_login(driver):
    """
    TC_001: Verify that an authorized administrator can log in to Entera.ai
    using valid credentials and successfully access the administrator dashboard.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_001: Verify Login with Valid Administrator Credentials")
    print(f"Target URL: {LOGIN_URL}")
    print(f"Admin User: {ADMIN_USERNAME}")
    print(f"Admin Password: [PROTECTED - {len(ADMIN_PASSWORD)} chars]")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)

    try:
        # Step 1: Navigate to Login page
        print("[Step 1] Navigating to login page...")
        driver.get(LOGIN_URL)

        # Step 2: Verify login form is visible
        print("[Step 2] Waiting for login form elements...")
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

        assert username_field.is_displayed(), "Username field must be displayed"
        assert password_field.is_displayed(), "Password field must be displayed"
        assert login_button.is_displayed(), "Login button must be displayed"
        print("  [OK] Login form and interactive fields verified.")

        # Step 3: Enter valid administrator credentials
        print("[Step 3] Entering administrator credentials...")
        username_field.clear()
        username_field.send_keys(ADMIN_USERNAME)
        password_field.clear()
        password_field.send_keys(ADMIN_PASSWORD)
        print("  [OK] Credentials entered into form.")

        # Step 4: Click the Login button
        print("[Step 4] Submitting login form...")
        login_button.click()

        # Step 5: Wait for authentication and redirect
        print("[Step 5] Awaiting authentication and post-login redirection...")
        wait.until(
            lambda d: "/login" not in d.current_url,
            message="Browser remained on /login after submitting valid credentials"
        )
        current_url = driver.current_url
        print(f"  [OK] Redirect occurred. Current URL: {current_url}")

        # Step 6: Verify redirection to administrator dashboard
        expected_dashboard_path = "/admin/dashboard"
        assert expected_dashboard_path in current_url, (
            f"Expected redirection to contain '{expected_dashboard_path}', but got '{current_url}'"
        )
        print(f"  [OK] Redirect URL matches expected administrator dashboard: {expected_dashboard_path}")

        # Step 7: Verify absence of any error alert
        error_alerts = driver.find_elements(By.CSS_SELECTOR, "div[role='alert']")
        for alert in error_alerts:
            if alert.is_displayed():
                pytest.fail(f"Unexpected login error alert displayed: {alert.text}")
        print("  [OK] Confirmed no error alerts are present on the page.")

        # Step 8: Verify dashboard UI elements are rendered
        print("[Step 8] Verifying administrator dashboard UI components...")
        dashboard_heading = wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h1[contains(text(), 'System Administrator Dashboard') or contains(text(), 'Dashboard')]")
            ),
            message="Dashboard heading ('System Administrator Dashboard') not visible"
        )
        heading_text = dashboard_heading.text
        print(f"  [OK] Dashboard heading verified: '{heading_text}'")
        assert "Dashboard" in heading_text, f"Unexpected heading text: {heading_text}"

        # Verify Sidebar branding / navigation
        sidebar_brand = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//span[contains(text(), 'Entera.ai')]")),
            message="Sidebar branding 'Entera.ai' not found"
        )
        assert sidebar_brand.is_displayed(), "Sidebar branding must be displayed"
        print("  [OK] Authenticated dashboard sidebar navigation verified.")

        # Verify Logout action is available for authenticated administrator
        logout_button = wait.until(
            EC.presence_of_element_located((By.XPATH, "//button[@title='Logout' or contains(., 'Logout')]")),
            message="Logout button not found in authenticated layout"
        )
        assert logout_button is not None, "Authenticated session must offer Logout option"
        print("  [OK] Authenticated session controls (Logout button) confirmed present.")

        # Step 9: Capture screenshot of successful state
        print(f"[Step 9] Capturing evidence screenshot: {SUCCESS_SCREENSHOT}...")
        driver.save_screenshot(SUCCESS_SCREENSHOT)
        assert os.path.exists(SUCCESS_SCREENSHOT), "Screenshot file was not saved"
        print(f"  [OK] Screenshot successfully saved ({os.path.getsize(SUCCESS_SCREENSHOT)} bytes).")

        print("=" * 70)
        print("TEST TC_001 STATUS: PASS")
        print("Administrator successfully authenticated and accessed the dashboard.")
        print("=" * 70)

    except Exception as exc:
        print(f"\n[TEST FAILURE] An exception occurred during test execution: {exc}")
        try:
            driver.save_screenshot(FAILURE_SCREENSHOT)
            print(f"Saved failure diagnostic screenshot to: {FAILURE_SCREENSHOT}")
        except Exception as scr_err:
            print(f"Could not save failure screenshot: {scr_err}")
        raise exc
