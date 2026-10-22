"""
TC_005 — Role-Based Access Control (RBAC)
Automated Test Suite for Entera.ai using Python, Selenium WebDriver, and pytest.

Test Cases:
  TC_005_01: Authorized Page Access
  TC_005_02: Restricted Page Access
  TC_005_03: Navigation Permission Checks
  TC_005_04: Direct URL Access Enforcement
  TC_005_05: Backend Authorization API Enforcement
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
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
API_URL = os.getenv("ENTERA_API_URL", "http://localhost:5000").rstrip("/")
LOGIN_URL = f"{BASE_URL}/login"

USER_EMAIL = os.getenv("ENTERA_TEST_USER_EMAIL", "tom123@gmail.com")
USER_PASSWORD = os.getenv("ENTERA_TEST_USER_PASSWORD", "tom@123")
USER_ROLE = "user"

ADMIN_EMAIL = os.getenv("ENTERA_ADMIN_USER", os.getenv("ADMIN_EMAIL", "admin@gmail.com"))
ADMIN_PASSWORD = os.getenv("ENTERA_ADMIN_PASSWORD", os.getenv("INITIAL_ADMIN_PASSWORD", "admin@123"))

HEADLESS_MODE = os.getenv("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")

SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
AUTHORIZED_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc005_rbac_authorized.png")
RESTRICTED_SCREENSHOT = os.path.join(SCREENSHOT_DIR, "tc005_rbac_restricted.png")


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


def login_user(driver, username, password):
    """Helper function to perform login and await redirection away from /login."""
    wait = WebDriverWait(driver, 15)
    driver.get(LOGIN_URL)
    u_field = wait.until(EC.visibility_of_element_located((By.ID, "login-username")))
    p_field = wait.until(EC.visibility_of_element_located((By.ID, "login-password")))
    submit = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']")))

    u_field.clear()
    u_field.send_keys(username)
    p_field.clear()
    p_field.send_keys(password)
    submit.click()

    wait.until(lambda d: "/login" not in d.current_url, message="Login failed or remained on /login")


def test_tc005_01_authorized_page_access(driver):
    """
    TC_005_01: Verify that an authorized user can access pages permitted
    for their assigned role (Standard User -> /user/dashboard).
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_005_01: Authorized Page Access")
    print(f"Test User: {USER_EMAIL} (Role: {USER_ROLE})")
    print(f"Target Route: {BASE_URL}/user/dashboard")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)
    login_user(driver, USER_EMAIL, USER_PASSWORD)

    # Verify redirection to authorized dashboard
    wait.until(
        lambda d: "/user/dashboard" in d.current_url,
        message=f"Expected URL to contain '/user/dashboard', but got: {driver.current_url}"
    )
    print(f"  [OK] Redirection verified. Current URL: {driver.current_url}")

    # Verify welcome heading
    heading = wait.until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(., 'Welcome back')]")),
        message="Authorized user dashboard heading not visible"
    )
    assert "Welcome back" in heading.text, f"Unexpected heading text: {heading.text}"
    print(f"  [OK] Welcome heading displayed: '{heading.text}'")

    # Verify role badge display
    role_badge = wait.until(
        EC.visibility_of_element_located((By.XPATH, "//span[contains(., 'Role:')]")),
        message="Role indicator badge not found on user dashboard"
    )
    assert "user" in role_badge.text.lower(), f"Unexpected role badge text: {role_badge.text}"
    print(f"  [OK] Role badge verified: '{role_badge.text}'")

    # Capture evidence screenshot of authorized access
    print(f"  [OK] Capturing authorized access screenshot: {AUTHORIZED_SCREENSHOT}...")
    driver.save_screenshot(AUTHORIZED_SCREENSHOT)
    assert os.path.exists(AUTHORIZED_SCREENSHOT), "Authorized screenshot was not saved"
    print(f"  [OK] Saved authorized screenshot ({os.path.getsize(AUTHORIZED_SCREENSHOT)} bytes).")

    print("TC_005_01 STATUS: PASS")


def test_tc005_02_restricted_page_access(driver):
    """
    TC_005_02: Verify that attempting to access an unauthorized route
    (Standard User -> /admin/dashboard) is rejected and displays Access Denied.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_005_02: Restricted Page Access")
    print(f"Test User: {USER_EMAIL} (Role: {USER_ROLE})")
    print(f"Restricted Route Attempted: {BASE_URL}/admin/dashboard")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)
    login_user(driver, USER_EMAIL, USER_PASSWORD)
    wait.until(lambda d: "/user/dashboard" in d.current_url)

    # Attempt navigation to restricted System Admin route
    restricted_url = f"{BASE_URL}/admin/dashboard"
    print(f"  Navigating directly to restricted route: {restricted_url}...")
    driver.get(restricted_url)

    # Verify AccessDenied component is rendered
    access_denied_heading = wait.until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Access Denied')]")),
        message="Expected 'Access Denied' heading not displayed on restricted route"
    )
    assert access_denied_heading.is_displayed(), "Access Denied heading must be visible"

    forbidden_badge = wait.until(
        EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'HTTP 403 Forbidden') or contains(text(), '403')]")),
        message="HTTP 403 Forbidden indicator not displayed"
    )
    assert forbidden_badge.is_displayed(), "HTTP 403 Forbidden badge must be visible"
    print("  [OK] Access Denied component rendered with HTTP 403 Forbidden indicator.")

    # Verify explanation mentions role
    explanation = driver.find_element(By.XPATH, "//p[contains(text(), 'permission to access this page')]")
    assert "USER" in explanation.text.upper(), f"Explanation should mention current role: {explanation.text}"
    print(f"  [OK] Role-specific explanation verified: '{explanation.text}'")

    # Capture evidence screenshot of restricted access state
    print(f"  [OK] Capturing restricted access screenshot: {RESTRICTED_SCREENSHOT}...")
    driver.save_screenshot(RESTRICTED_SCREENSHOT)
    assert os.path.exists(RESTRICTED_SCREENSHOT), "Restricted screenshot was not saved"
    print(f"  [OK] Saved restricted screenshot ({os.path.getsize(RESTRICTED_SCREENSHOT)} bytes).")

    print("TC_005_02 STATUS: PASS")


def test_tc005_03_navigation_permission_checks(driver):
    """
    TC_005_03: Verify that the navigation sidebar only renders options
    permitted for the logged-in user's role and hides restricted options.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_005_03: Navigation Permission Checks")
    print(f"Test User: {USER_EMAIL} (Role: {USER_ROLE})")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)
    login_user(driver, USER_EMAIL, USER_PASSWORD)
    wait.until(lambda d: "/user/dashboard" in d.current_url)

    sidebar = wait.until(EC.visibility_of_element_located((By.TAG_NAME, "aside")))
    sidebar_links = sidebar.find_elements(By.TAG_NAME, "a")
    link_texts = [a.text.strip() for a in sidebar_links if a.text.strip()]
    print(f"  [OK] Sidebar links displayed for user '{USER_EMAIL}': {link_texts}")

    # Permitted links for 'user' role
    assert any("Dashboard" in t for t in link_texts), "User should have 'Dashboard' in sidebar"
    assert any("Applications" in t for t in link_texts), "User should have 'My Applications' in sidebar"

    # Restricted admin links must NOT be present
    assert not any("Organizations" in t for t in link_texts), (
        f"Security violation: 'Organizations' link visible to standard user: {link_texts}"
    )
    assert not any("Platform Users" in t for t in link_texts), (
        f"Security violation: 'Platform Users' link visible to standard user: {link_texts}"
    )
    assert not any("Database Schemas" in t for t in link_texts), (
        f"Security violation: 'Database Schemas' link visible to standard user: {link_texts}"
    )
    assert not any("REST APIs" in t for t in link_texts), (
        f"Security violation: 'REST APIs' link visible to standard user: {link_texts}"
    )
    print("  [OK] Confirmed restricted links (Organizations, Platform Users, Schemas, APIs) are hidden.")

    print("TC_005_03 STATUS: PASS")


def test_tc005_04_direct_url_access_blocked(driver):
    """
    TC_005_04: Verify that direct URL manipulation to a privileged sub-route
    (/admin/dashboard/users) is blocked, and user can return to authorized dashboard.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_005_04: Direct URL Access Enforcement")
    print(f"Test User: {USER_EMAIL} (Role: {USER_ROLE})")
    print(f"Direct Target: {BASE_URL}/admin/dashboard/users")
    print("=" * 70)

    wait = WebDriverWait(driver, 15)
    login_user(driver, USER_EMAIL, USER_PASSWORD)
    wait.until(lambda d: "/user/dashboard" in d.current_url)

    # Bypass sidebar by navigating directly to privileged route
    driver.get(f"{BASE_URL}/admin/dashboard/users")

    # Assert AccessDenied component intercepts direct URL
    heading = wait.until(
        EC.visibility_of_element_located((By.XPATH, "//h1[contains(text(), 'Access Denied')]")),
        message="Route guard failed to intercept direct URL access"
    )
    assert heading.is_displayed(), "Direct URL navigation must be blocked by Access Denied"
    print("  [OK] Direct URL access intercepted by authorization guard.")

    # Verify 'Return to Authorized Dashboard' button functions
    return_btn = wait.until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Return to Authorized Dashboard')]")),
        message="'Return to Authorized Dashboard' button not clickable"
    )
    return_btn.click()

    wait.until(
        lambda d: "/user/dashboard" in d.current_url,
        message=f"Failed to return to authorized dashboard. Current URL: {driver.current_url}"
    )
    print(f"  [OK] Safely returned to authorized user dashboard: {driver.current_url}")

    print("TC_005_04 STATUS: PASS")


def test_tc005_05_backend_authorization_enforced():
    """
    TC_005_05: Verify that backend REST APIs enforce role-based authorization
    and reject unauthorized user requests with HTTP 403 Forbidden.
    """
    print("\n" + "=" * 70)
    print("STARTING TEST TC_005_05: Backend Authorization API Enforcement")
    print(f"Test User: {USER_EMAIL} (Role: {USER_ROLE})")
    print(f"Target API: {API_URL}/api/sysadmin/users")
    print("=" * 70)

    # 1. Authenticate user to obtain credentials/session details
    login_payload = json.dumps({"username": USER_EMAIL, "password": USER_PASSWORD}).encode("utf-8")
    login_req = urllib.request.Request(
        f"{API_URL}/api/login",
        data=login_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(login_req) as resp:
        user_data = json.loads(resp.read().decode("utf-8"))["user"]

    assert user_data["role"] == "user", f"Expected user role 'user', got: {user_data['role']}"
    print(f"  [OK] Authenticated user retrieved: ID={user_data['id']}, Role={user_data['role']}")

    # 2. Issue request to privileged System Admin endpoint using standard user headers
    headers = {
        "x-user-id": str(user_data["id"]),
        "x-user-email": user_data["email"],
        "x-user-role": user_data["role"],
        "x-org-id": str(user_data.get("organization_id") or 0),
        "Content-Type": "application/json"
    }

    protected_api_req = urllib.request.Request(f"{API_URL}/api/sysadmin/users", headers=headers)

    try:
        urllib.request.urlopen(protected_api_req)
        pytest.fail("Security violation: Backend allowed unauthorized user to access /api/sysadmin/users")
    except urllib.error.HTTPError as err:
        assert err.code == 403, f"Expected HTTP 403 Forbidden, got: {err.code}"
        body = json.loads(err.read().decode("utf-8"))
        assert "Forbidden" in body.get("error", ""), f"Unexpected error response: {body}"
        print(f"  [OK] Backend correctly rejected unauthorized API request with HTTP {err.code}: {body}")

    print("TC_005_05 STATUS: PASS")
