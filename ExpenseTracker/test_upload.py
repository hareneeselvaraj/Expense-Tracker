import requests
import json
import sqlite3

def check_accounts():
    db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT Id, Name FROM Accounts LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row

account = check_accounts()
if not account:
    print("Error: No accounts found to upload against.")
    exit(1)

account_id = account[0]
print(f"Using account {account[1]} (ID: {account_id})")

url = 'http://localhost:5062/api/transaction/upload'
files = {'file': ('sample.csv', open('sample.csv', 'rb'), 'text/csv')}
data = {'accountId': account_id}

print("Uploading to", url)
try:
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print("Failed request:", e)
