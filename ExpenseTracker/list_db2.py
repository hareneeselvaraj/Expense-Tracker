import sqlite3, codecs

db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
conn = sqlite3.connect(db_path)

with codecs.open('db_ids_utf8.txt', 'w', 'utf-8') as f:
    f.write("=== CATEGORIES ===\n")
    for r in conn.execute("SELECT Id, Name, Type FROM Categories"):
        f.write(f"  {r[0]}  |  {r[1]}  |  {r[2]}\n")

    f.write("\n=== ACCOUNTS ===\n")
    for r in conn.execute("SELECT Id, Name, Type FROM Accounts"):
        f.write(f"  {r[0]}  |  {r[1]}  |  {r[2]}\n")

    f.write("\n=== USERS ===\n")
    for r in conn.execute("SELECT Id, Name FROM Users"):
        f.write(f"  {r[0]}  |  {r[1]}\n")

conn.close()
print("Done writing db_ids_utf8.txt")
