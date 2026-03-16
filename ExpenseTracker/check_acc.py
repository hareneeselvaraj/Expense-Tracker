import sqlite3

conn = sqlite3.connect('expense.db')
print("Accounts for test2 users:")
for row in conn.execute("SELECT Id, Name, UserId FROM Accounts WHERE UserId IN ('56D6B348-8A2E-4ADF-9758-C2770DD5855E', '33A9C1A2-AF41-4962-AB67-1C4DC7C6E4D1')"):
    print(row)
conn.close()
