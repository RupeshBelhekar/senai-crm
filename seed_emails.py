import json
import time
import requests

BACKEND_URL = "http://localhost:8000/api/ingest"
DATASET_PATH = "email-data-advanced.json"

def seed_data():
    print(f"Loading dataset from {DATASET_PATH}...")
    try:
        with open(DATASET_PATH, "r", encoding="utf-8") as f:
            emails = json.load(f)
    except FileNotFoundError:
        print(f"Error: {DATASET_PATH} not found in the current directory.")
        return

    print(f"Found {len(emails)} emails. Starting ingestion...")
    
    success_count = 0
    duplicate_count = 0
    error_count = 0

    for i, email in enumerate(emails, start=1):
        try:
            print(f"[{i}/{len(emails)}] Sending email: {email['message_id']} - {email['subject'][:40]}...")
            
            response = requests.post(BACKEND_URL, json=email, timeout=10)
            if response.status_code == 200:
                res_data = response.json()
                if res_data.get("status") == "accepted":
                    success_count += 1
                elif res_data.get("status") == "ignored":
                    duplicate_count += 1
                    print(f"  -> Ignored (Reason: {res_data.get('reason')})")
            else:
                error_count += 1
                print(f"  -> Error: Received status code {response.status_code}")
                print(response.text)
                
        except requests.exceptions.RequestException as e:
            error_count += 1
            print(f"  -> Connection Error: {e}")
        
        # Small delay to mimic a real-time stream and avoid slamming the API / embedding rate limits
        time.sleep(0.5)

    print("\n--- Seeding Complete ---")
    print(f"Successfully Ingested: {success_count}")
    print(f"Duplicates Ignored:   {duplicate_count}")
    print(f"Errors Encountered:   {error_count}")

if __name__ == "__main__":
    seed_data()
