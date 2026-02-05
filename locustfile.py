import os
import random
import json
import logging
import time
from locust import HttpUser, task, between, events, tag
from locust.exception import StopUser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurable items via environment variables
REFRESH_TOKENS_ENV = os.environ.get("LOCUST_REFRESH_TOKENS", "")
ACCESS_TOKENS_ENV = os.environ.get("LOCUST_ACCESS_TOKENS", "")
LOAD_TEST_SECRET = os.environ.get("LOCUST_LOAD_TEST_SECRET", "") # Recommended for scalable testing

DEFAULT_HOST = "https://trivia-back-end.vercel.app"

# Parse token lists
REFRESH_TOKENS = [t.strip() for t in REFRESH_TOKENS_ENV.split(",") if t.strip()]
ACCESS_TOKENS = [t.strip() for t in ACCESS_TOKENS_ENV.split(",") if t.strip()]

class MobileAppUser(HttpUser):
    """
    Simulates a mobile app user for TriviaCoin.
    Supports three Auth Strategies:
    1. LOAD_TEST_SECRET: Bypass header (Recommended for major load)
    2. ACCESS_TOKENS: Pre-existing valid Session JWTs
    3. REFRESH_TOKENS: Exchange for Session JWTs via /auth/refresh
    """
    
    # Wait between 0.5 and 2 seconds between tasks for testing/local runs.
    # In full production tests, you might increase this to 1-5 seconds.
    wait_time = between(0.5, 2)
    
    access_token = None
    refresh_token = None
    auth_strategy = "anonymous"
    
    def on_start(self):
        """
        Setup user state and authentication strategy.
        """
        # 1. Check for Bypass Secret (Highest priority/Scalable)
        if LOAD_TEST_SECRET:
            self.auth_strategy = "bypass"
            logger.debug("User starting with Load Test Bypass strategy")
            return

        # 2. Check for Manual Access Tokens
        if ACCESS_TOKENS:
            self.auth_strategy = "access_token"
            self.access_token = random.choice(ACCESS_TOKENS)
            logger.debug("User starting with manual Access Token")
            return

        # 3. Check for Refresh Tokens
        if REFRESH_TOKENS:
            self.auth_strategy = "refresh_token"
            self.refresh_token = random.choice(REFRESH_TOKENS)
            self.authenticate_via_refresh()
            return

        logger.warning("No auth configuration found. Running tasks in 'anonymous' mode.")

    def authenticate_via_refresh(self):
        """
        Exchanges refresh token for access token (Strategy 3).
        """
        try:
            response = self.client.post(
                "/auth/refresh",
                headers={"Authorization": f"Bearer {self.refresh_token}"},
                name="/auth/refresh"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
            else:
                logger.error(f"Refresh failed: {response.status_code}")
        except Exception as e:
            logger.error(f"Auth exception: {e}")

    @property
    def headers(self):
        """
        Constructs headers based on active auth strategy.
        """
        h = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "TriviaCoin-LoadTest/2.0"
        }
        
        if self.auth_strategy == "bypass":
            # Add the secret header to bypass Descope logic on server side
            h["X-Load-Test-Secret"] = LOAD_TEST_SECRET
            # Optionally pass a dummy user ID to simulate different users
            h["X-Mock-User-ID"] = f"load-test-user-{random.randint(1, 10000)}"
        elif self.access_token:
            h["Authorization"] = f"Bearer {self.access_token}"
            
        return h

    # --- Tasks ---

    @task(10)
    @tag('startup')
    def app_launch_flow(self):
        self.client.get("/health", name="/health")
        self.client.get("/countries", headers=self.headers, name="/countries")

    @task(8)
    @tag('protected')
    def view_home_content(self):
        # Only run if we are in an authenticated state (bypass or has token)
        if self.auth_strategy == "anonymous" and not self.access_token:
            return
            
        self.client.get("/draw/next", headers=self.headers, name="/draw/next")
        self.client.get("/recent-winners", headers=self.headers, name="/recent-winners")

    @task(5)
    @tag('protected')
    def browse_leaderboard(self):
        if self.auth_strategy == "anonymous" and not self.access_token:
            return
            
        today = time.strftime("%Y-%m-%d")
        self.client.get(
            f"/trivia/free-mode/leaderboard?draw_date={today}", 
            headers=self.headers, 
            name="/trivia/free-mode/leaderboard"
        )

    @task(3)
    @tag('protected')
    def view_wallet_stats(self):
        if self.auth_strategy == "anonymous" and not self.access_token:
            return
            
        self.client.get("/api/v1/wallet/me", headers=self.headers, name="/api/v1/wallet/me")
        self.client.get("/api/v1/wallet/transactions?page=1&limit=20", headers=self.headers, name="/api/v1/wallet/transactions")

    @task(2)
    @tag('protected')
    def submit_gameplay(self):
        if self.auth_strategy == "anonymous" and not self.access_token:
            return
            
        payload = {
            "question_id": f"q_{random.randint(1, 500)}",
            "answer_index": random.randint(0, 3),
            "time_taken": random.randint(1000, 8000)
        }
        
        with self.client.post("/trivia/submit", json=payload, headers=self.headers, name="/trivia/submit", catch_response=True) as response:
            if response.status_code in [200, 201, 400, 404]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    if not any([REFRESH_TOKENS, ACCESS_TOKENS, LOAD_TEST_SECRET]):
        print("⚠️ WARNING: No authentication tokens or bypass secrets found. Protected APIs will be SKIPPED.")
    else:
        print(f"🚀 Load test starting with configuration: Refresh:{len(REFRESH_TOKENS)}, Access:{len(ACCESS_TOKENS)}, Bypass:{bool(LOAD_TEST_SECRET)}")
