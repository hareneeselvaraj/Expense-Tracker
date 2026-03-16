import sqlite3
import uuid

conn = sqlite3.connect('expense.db')
c = conn.cursor()

# 1. Define the new categories
# Types: 0 = Income, 1 = Expense, 2 = Investment
new_categories_def = [
    # Income (0)
    ("cashback", 0, "💰"),
    ("wife", 0, "👩"),
    ("Salary", 0, "💸"),

    # Expense (1)
    ("SMS charges", 1, "📱"),
    ("water", 1, "💧"),
    ("electricity", 1, "⚡"),
    ("household", 1, "🏠"),
    ("groceries", 1, "🛒"),
    ("travel", 1, "✈️"),
    ("transportation", 1, "🚌"),
    ("outsidefood", 1, "🍔"),
    ("personal", 1, "👤"),
    ("stationary", 1, "✏️"),
    ("gasbill", 1, "🔥"),
    ("clothing", 1, "👕"),
    ("entertainment", 1, "🎬"),
    ("vehicle", 1, "🚗"),
    ("petrol", 1, "⛽"),
    ("office", 1, "💼"),
    ("missing", 1, "❓"),
    ("others", 1, "📦"),
    ("TV", 1, "📺"),
    ("electronics", 1, "💻"),
    ("Jewellery/ornament", 1, "💎"),
    ("tax", 1, "🏛️"),
    ("phone recharge", 1, "🔋"),
    ("gifts", 1, "🎁"),
    ("education", 1, "🎓"),
    ("temple", 1, "🛕"),
    ("wife", 1, "👩"),

    # Investment (2)
    ("interest", 2, "📈"),
    ("SGB", 2, "🥇"),
    ("Mutual fund", 2, "📊"),
    ("Stocks", 2, "📉"),
    ("FD", 2, "🏦"),
    ("RD", 2, "⏳"),
    ("PPF", 2, "🛡️"),
    ("NPS", 2, "👴")
]

# 2. Get all users
c.execute("SELECT Id, Email FROM Users")
users = c.fetchall()

for user_id, email in users:
    print(f"Migrating categories for user: {email} ({user_id})")
    
    # a. Get old categories to map them to new IDs if possible
    c.execute("SELECT Id, Name FROM Categories WHERE UserId = ?", (user_id,))
    old_categories = {row[1].lower(): row[0] for row in c.fetchall()}
    
    # b. Delete existing categories for this user
    c.execute("DELETE FROM Categories WHERE UserId = ?", (user_id,))
    
    # c. Insert new categories and keep track of their new IDs
    new_cat_map = {} # name.lower() -> new_id
    for name, cat_type, icon in new_categories_def:
        new_id = str(uuid.uuid4()).upper()
        c.execute("INSERT INTO Categories (Id, UserId, Name, Type, Icon) VALUES (?, ?, ?, ?, ?)",
                  (new_id, user_id, name, cat_type, icon))
        new_cat_map[name.lower()] = new_id

    # d. Update Transactions to point to new IDs
    # Mapping old names to new ones if they match
    # Example: if transaction was 'Food' and we now have 'outsidefood' as the closest match?
    # Actually, let's just map by exact name match first.
    # For common ones:
    name_replacements = {
        "food": "outsidefood",
        "transport": "transportation",
        "utilities": "electricity",
        "shopping": "clothing",
        "investments": "Stocks",
        "freelance": "Salary",
        "housing": "household",
        "crypto": "Stocks",
        "other income": "Salary"
    }

    # Map old CategoryIds to new ones
    for old_name_lower, old_id in old_categories.items():
        target_name = old_name_lower
        if old_name_lower in name_replacements:
            target_name = name_replacements[old_name_lower].lower()
        
        if target_name in new_cat_map:
            new_id = new_cat_map[target_name]
            # Update transactions that used the old ID
            c.execute("UPDATE Transactions SET CategoryId = ? WHERE CategoryId = ?", (new_id, old_id))
            # Also update Budgets etc if they exist
            c.execute("UPDATE Budgets SET CategoryId = ? WHERE CategoryId = ?", (new_id, old_id))

conn.commit()
conn.close()
print("Mass migration completed successfully!")
