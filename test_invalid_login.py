"""
TC_002 — Verify Login Rejection with Invalid Credentials
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

# Load environment variables
load_dotenv()

# Test configuration
BASE_URL = os.getenv("ENTERA_BASE_URL", "http://localhost:5173").rstrip("/")
LOGIN_URL = f"{BASE_URL}/login"
PROTECTED_DASHBOARD_URL = f"{BASE_URL}/admin/dashboard"

# Deliberately invalid test credentials
INVALID_USERNAME = os.getenv("ENTERA_INVALID_USER", "unregistered_user@example.com")
INVALID_PASSWORD = os.getenv("ENTERA_INVALID_PASSWORD", "WrongPassword!2026")
HEADLESS_MODE = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
REJECTION_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc002_invalid_login.png")
FAILURE_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc002_test_failure.png")


@pytest.fixture(scope="function")
def driver():
    """
    Initializes and yields a configured Chrome WebDriver instance.
    Guarantees safe browser teardown.
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


def test_tc002_invalid_credentials_rejected(driver):
    """
    TC_002: Verify that Entera.ai rejects invalid login credentials,
    displays an appropriate error message, and prevents unauthorized
    access to protected pages.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_002: Verify Login Rejection with Invalid Credentials")
    print(f"Target URL: {LOGIN_URL}")
    print(f"Invalid Test User: {INVALID_USERNAME}")
    print(f"Invalid Test Password: [PROTECTED - {len(INVALID_PASSWORD)} chars]")
    print(f"Protected Route to Verify: {PROTECTED_DASHBOARD_URL}")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)

    try:
        # Step 1: Navigate to Login Page
        print("[Step 1] Navigating to login page...")
        driver.get(LOGIN_URL)

        # Step 2: Verify login form is visible
        print("[Step 2] Locating login form fields...")
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
        print("  [OK] Login form and input fields verified.")

        # Step 3: Enter invalid credentials
        print("[Step 3] Entering deliberately invalid credentials...")
        username_field.clear()
        username_field.send_keys(INVALID_USERNAME)
        password_field.clear()
        password_field.send_keys(INVALID_PASSWORD)
        print("  [OK] Invalid test credentials entered into form.")

        # Step 4: Click the Login submit button
        print("[Step 4] Submitting login form with invalid credentials...")
        login_button.click()

        # Step 5: Wait for authentication rejection and error alert display
        print("[Step 5] Waiting for authentication rejection feedback...")
        error_alert = wait.until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "div[role='alert']")),
            message="Expected error alert banner (div[role='alert']) did not appear after invalid login"
        )

        error_text = error_alert.text.strip()
        print(f"  [OK] Error alert displayed: '{error_text}'")
        assert "Invalid username or password" in error_text, (
            f"Expected error message to contain 'Invalid username or password', but got: '{error_text}'"
        )

        # Step 6: Verify user remains on login page (no navigation to authenticated dashboard)
        current_url = driver.current_url
        print(f"[Step 6] Verifying user remained on login page: {current_url}")
        assert "/login" in current_url, (
            f"Expected user to remain on /login, but browser redirected to: {current_url}"
        )
        assert "/dashboard" not in current_url, (
            f"Security violation: browser navigated to a dashboard route: {current_url}"
        )
        print("  [OK] Confirmed browser did not navigate to any dashboard route.")

        # Step 7: Verify localStorage has no authenticated user session
        user_session = driver.execute_script("return window.localStorage.getItem('user');")
        assert user_session is None or user_session == "null", (
            f"Security violation: user session found in localStorage after invalid login: {user_session}"
        )
        print("  [OK] Confirmed no authenticated user session stored in browser localStorage.")

        # Step 8: Capture evidence screenshot of the rejected login state with error alert
        print(f"[Step 8] Capturing rejected-login evidence screenshot: {REJECTION_SCREENSHOT}...")
        driver.save_screenshot(REJECTION_SCREENSHOT)
        assert os.path.exists(REJECTION_SCREENSHOT), "Screenshot file was not saved"
        print(f"  [OK] Screenshot successfully saved ({os.path.getsize(REJECTION_SCREENSHOT)} bytes).")

        # Step 9: Attempt direct unauthorized access to protected dashboard route
        print(f"[Step 9] Attempting unauthorized access to protected page: {PROTECTED_DASHBOARD_URL}...")
        driver.get(PROTECTED_DASHBOARD_URL)

        # Step 10: Verify application authentication guard blocks access and redirects to /login
        print("[Step 10] Verifying route guard redirects unauthenticated user back to /login...")
        wait.until(
            lambda d: "/login" in d.current_url,
            message=f"Protected page did not redirect to /login. Current URL: {driver.current_url}"
        )
        final_url = driver.current_url
        print(f"  [OK] Access denied. Browser redirected to: {final_url}")
        assert "/login" in final_url, (
            f"Expected redirection to /login, but remained at: {final_url}"
        )
        assert "/admin/dashboard" not in final_url, (
            f"Security violation: protected route remained accessible: {final_url}"
        )

        print("=" * 70)
        print("TEST TC_002 STATUS: PASS")
        print("Invalid credentials properly rejected, error message shown, and protected route secured.")
        print("=" * 70)

    except Exception as exc:
        print(f"\n[TEST FAILURE] An exception occurred during test execution: {exc}")
        try:
            driver.save_screenshot(FAILURE_SCREENSHOT)
            print(f"Saved failure diagnostic screenshot to: {FAILURE_SCREENSHOT}")
        except Exception as scr_err:
            print(f"Could not save failure screenshot: {scr_err}")
        raise exc
