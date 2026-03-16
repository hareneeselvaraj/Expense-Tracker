import sqlite3, codecs

conn = sqlite3.connect(r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db')
rows = conn.execute(
    "SELECT Date, Description, Amount, Type FROM Transactions WHERE UserId='BC4C63CB-A94D-4BE8-823A-B52A0EB42C1A' ORDER BY Date DESC LIMIT 10"
).fetchall()

with codecs.open('verify.txt', 'w', 'utf-8') as f:
    f.write(f"Found {len(rows)} transactions:\n\n")
    for r in rows:
        f.write(f"  {r[0]}  |  {r[1]}  |  {r[2]}  |  {r[3]}\n")

conn.close()
print("Written to verify.txt")
