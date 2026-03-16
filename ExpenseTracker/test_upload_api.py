"""
Test the actual upload endpoint to see what error comes back.
"""
import http.client
import json
import os

# First, login to get a JWT token
conn = http.client.HTTPConnection("localhost", 5062)

# Login as test2 (test3@gmail.com)
login_data = json.dumps({"email": "test3@gmail.com", "password": "Test@123"})
conn.request("POST", "/api/auth/login", body=login_data, headers={"Content-Type": "application/json"})
resp = conn.getresponse()
body = resp.read().decode("utf-8")
print(f"Login: {resp.status} {resp.reason}")
print(f"Body: {body[:500]}")

if resp.status == 200:
    data = json.loads(body)
    token = data.get("token", "")
    print(f"Token: {token[:50]}...")
    
    # Now try multipart upload
    boundary = "----TestBoundary12345"
    xlsx_path = r"C:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\TestData.xlsx"
    
    with open(xlsx_path, "rb") as f:
        file_data = f.read()
    
    # Get an account ID for test2
    import sqlite3
    db = sqlite3.connect(r"c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db")
    acc = db.execute("SELECT Id FROM Accounts WHERE UserId = '33A9C1A2-AF41-4962-AB67-1C4DC7C6E4D1' LIMIT 1").fetchone()
    if acc:
        account_id = acc[0]
        print(f"AccountId: {account_id}")
    else:
        print("No account found for test2!")
        account_id = "00000000-0000-0000-0000-000000000000"
    db.close()
    
    # Build multipart body
    body_parts = []
    body_parts.append(f"--{boundary}\r\n".encode())
    body_parts.append(f'Content-Disposition: form-data; name="accountId"\r\n\r\n{account_id}\r\n'.encode())
    body_parts.append(f"--{boundary}\r\n".encode())
    body_parts.append(f'Content-Disposition: form-data; name="file"; filename="TestData.xlsx"\r\n'.encode())
    body_parts.append(b'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n')
    body_parts.append(file_data)
    body_parts.append(f"\r\n--{boundary}--\r\n".encode())
    
    full_body = b"".join(body_parts)
    
    conn2 = http.client.HTTPConnection("localhost", 5062)
    conn2.request("POST", "/api/transaction/upload", body=full_body, headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}"
    })
    resp2 = conn2.getresponse()
    upload_body = resp2.read().decode("utf-8")
    print(f"\nUpload: {resp2.status} {resp2.reason}")
    print(f"Response: {upload_body}")
else:
    # Try test2@test.com
    conn2 = http.client.HTTPConnection("localhost", 5062)
    login_data2 = json.dumps({"email": "test2@test.com", "password": "Test@123"})
    conn2.request("POST", "/api/auth/login", body=login_data2, headers={"Content-Type": "application/json"})
    resp2 = conn2.getresponse()
    body2 = resp2.read().decode("utf-8")
    print(f"\nLogin test2@test.com: {resp2.status} {resp2.reason}")
    print(f"Body: {body2[:500]}")
