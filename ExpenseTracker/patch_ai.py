import sys

path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\Services\Implementations\TransactionService.cs'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure we don't duplicate
if 'UploadAsync' in text:
    print('UploadAsync already exists!')
    sys.exit(0)

# We want to inject right before the last closing brace of the class
# Find the last closing brace
last_brace_idx = text.rfind('}')
if last_brace_idx == -1:
    print('Could not find end of class')
    sys.exit(1)

code_to_inject = """

    // ── AI Helper: Categorize based on keywords ──
    private (string CategoryName, TransactionType Type) CategorizeTransaction(string remarks, bool isDeposit)
    {
        var lower = remarks.ToLower();

        if (isDeposit)
        {
            if (lower.Contains("salary") || lower.Contains("neft/sal") || lower.Contains("cred/sal")) return ("Salary", TransactionType.Income);
            if (lower.Contains("interest") || lower.Contains("int.")) return ("Interest", TransactionType.Income);
            if (lower.Contains("dividend")) return ("Dividends", TransactionType.Income);
            if (lower.Contains("refund") || lower.Contains("reversal")) return ("Refunds", TransactionType.Income);
            return ("Other Income", TransactionType.Income);
        }

        // Expense categories based on keywords
        if (lower.Contains("swiggy") || lower.Contains("zomato") || lower.Contains("kfc") || lower.Contains("mcdonald") || lower.Contains("food") || lower.Contains("restaurant") || lower.Contains("bakery")) 
            return ("Food", TransactionType.Expense);
        
        if (lower.Contains("uber") || lower.Contains("ola") || lower.Contains("rapido") || lower.Contains("irctc") || lower.Contains("petrol") || lower.Contains("fuel") || lower.Contains("transport") || lower.Contains("metro") || lower.Contains("namma"))
            return ("transportation", TransactionType.Expense);

        if (lower.Contains("amazon") || lower.Contains("flipkart") || lower.Contains("myntra") || lower.Contains("shopping") || lower.Contains("dmart") || lower.Contains("reliance") || lower.Contains("retail") || lower.Contains("mall"))
            return ("Shopping", TransactionType.Expense);

        if (lower.Contains("netflix") || lower.Contains("spotify") || lower.Contains("prime") || lower.Contains("hotstar") || lower.Contains("movie") || lower.Contains("cinema") || lower.Contains("bookmyshow"))
            return ("Entertainment", TransactionType.Expense);

        if (lower.Contains("bill") || lower.Contains("recharge") || lower.Contains("airtel") || lower.Contains("jio") || lower.Contains("vi") || lower.Contains("electricity") || lower.Contains("water") || lower.Contains("bescom"))
            return ("Bills & Utilities", TransactionType.Expense);

        if (lower.Contains("pharmacy") || lower.Contains("apollo") || lower.Contains("1mg") || lower.Contains("hospital") || lower.Contains("clinic") || lower.Contains("health"))
            return ("Health", TransactionType.Expense);

        if (lower.Contains("auragold") || lower.Contains("nsdl") || lower.Contains("groww") || lower.Contains("zerodha") || lower.Contains("upstox") || lower.Contains("mutual fund") || lower.Contains("sip") || lower.Contains("investment"))
            return ("Investment", TransactionType.Investment);
            
        if (lower.Contains("emi") || lower.Contains("loan") || lower.Contains("bajaj") || lower.Contains("muthoot"))
            return ("Loan / EMI", TransactionType.Expense);

        if (lower.Contains("atm") || lower.Contains("cash withdraw"))
            return ("Cash", TransactionType.Withdraw);

        return ("Shopping", TransactionType.Expense); // Standard fallback
    }

    // ── AI Helper: Clean up raw bank descriptions ──
    private string GenerateSmartDescription(string remarks)
    {
        var clean = remarks;
        
        // Remove common messy prefixes/suffixes
        if (clean.StartsWith("UPI/"))
        {
            var parts = clean.Split('/');
            if (parts.Length >= 3)
            {
                // Typical format: UPI/Name/VPA/Bank/...
                // Or: UPI/Name/merchant@bank/...
                clean = "UPI Payment to " + parts[1];
                if (parts.Length > 3 && !parts[3].Contains("BANK", StringComparison.OrdinalIgnoreCase))
                {
                    clean += " - " + parts[3];
                }
            }
        }
        else if (clean.StartsWith("BIL/INFT/"))
        {
            var parts = clean.Split('/');
            if (parts.Length >= 4) clean = "IMPS Transfer - " + parts[3];
        }
        else if (clean.StartsWith("NEFT/"))
        {
            var parts = clean.Split('/');
            if (parts.Length >= 3) clean = "NEFT Transfer - " + parts[2];
        }
        else if (clean.StartsWith("EBA/"))
        {
            var parts = clean.Split('/');
            if (parts.Length >= 2) clean = "Bank Transfer - " + parts[1];
        }

        // Clean up excessive spaces and newlines
        clean = clean.Replace("\\n", " ").Replace("\\r", "").Trim();
        if (clean.Length > 200) clean = clean.Substring(0, 197) + "...";
        
        return clean;
    }

    // ── Helper: Get or Create Category ──
    private async Task<Guid> GetOrCreateCategoryAsync(Guid userId, string categoryName, TransactionType catType)
    {
        var existing = await _context.Categories
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Name.ToLower() == categoryName.ToLower());
        
        if (existing != null) return existing.Id;

        // Auto-create category
        var newCat = new Category
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = categoryName,
            Type = catType == TransactionType.Withdraw ? CategoryType.Expense : (CategoryType)Enum.Parse(typeof(CategoryType), catType.ToString()),
            Icon = "HelpCircle"
        };
        _context.Categories.Add(newCat);
        await _context.SaveChangesAsync();
        _logger.LogInformation("[AI] Created category '{Name}' ({Type}) for user {UserId}", categoryName, catType, userId);
        return newCat.Id;
    }

    public async Task<int> UploadAsync(Guid userId, Guid accountId, Stream fileStream, string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLower();
        int count = 0;

        _logger.LogWarning("[UPLOAD] Starting upload for user={UserId}, account={AccountId}, file={FileName}", userId, accountId, fileName);

        if (extension == ".xlsx" || extension == ".xls" || extension == ".csv")
        {
            // useHeaderRow: false is crucial for bank statements with top metadata rows
            var rawRows = MiniExcelLibs.MiniExcel.Query(fileStream, useHeaderRow: false).Cast<IDictionary<string, object>>().ToList();
            _logger.LogWarning("[UPLOAD] MiniExcel parsed {Count} raw rows", rawRows.Count);

            bool headerFound = false;
            var columnMap = new Dictionary<string, string>(); 
            var mappedRows = new List<IDictionary<string, object>>();

            foreach (var row in rawRows)
            {
                if (!headerFound)
                {
                    var values = row.Values.Select(v => v?.ToString()?.Trim() ?? "").ToList();
                    var stringVals = string.Join(" | ", values).ToLower();

                    // Detect target header row (ICICI or Standard)
                    if ((stringVals.Contains("date") || stringVals.Contains("value date") || stringVals.Contains("transaction date")) 
                        && (stringVals.Contains("remarks") || stringVals.Contains("description") || stringVals.Contains("particulars") || stringVals.Contains("narration")))
                    {
                        foreach (var kvp in row)
                        {
                            var val = kvp.Value?.ToString()?.Trim() ?? "";
                            if (!string.IsNullOrEmpty(val))
                            {
                                columnMap[kvp.Key] = val; 
                            }
                        }
                        headerFound = true;
                        _logger.LogInformation("[UPLOAD] Header row found at line. Keys mapped: {Keys}", string.Join(", ", columnMap.Values));
                    }
                    continue; // Skip the header row itself
                }

                // Create a mapped row using the columnMap
                var mappedRow = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
                foreach (var kvp in row)
                {
                    if (columnMap.TryGetValue(kvp.Key, out var actualHeaderName))
                    {
                        mappedRow[actualHeaderName] = kvp.Value;
                    }
                }
                
                // Only add if it has some data in the known columns
                if (mappedRow.Values.Any(v => v != null && !string.IsNullOrWhiteSpace(v.ToString())))
                {
                    mappedRows.Add(mappedRow);
                }
            }

            foreach (var row in mappedRows)
            {
                try
                {
                    // Helper to find column by partial name match
                    object? GetFuzzy(string partial)
                    {
                        var key = row.Keys.FirstOrDefault(k => k != null && k.Contains(partial, StringComparison.OrdinalIgnoreCase));
                        return key != null ? row[key] : null;
                    }

                    // ── 1. Parse Date ──
                    DateTime date = DateTime.UtcNow;
                    bool dateFound = false;

                    var dateVal = GetFuzzy("Date");
                    if (dateVal is DateTime dtDirect) { date = dtDirect; dateFound = true; }
                    else if (dateVal != null)
                    {
                        var dateStr = dateVal.ToString()!.Trim();
                        if (!string.IsNullOrEmpty(dateStr))
                        {
                            string[] formats = { "dd.MM.yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yy" };
                            foreach (var fmt in formats)
                            {
                                if (DateTime.TryParseExact(dateStr, fmt, null, System.Globalization.DateTimeStyles.None, out var d))
                                { date = d; dateFound = true; break; }
                            }
                            if (!dateFound && DateTime.TryParse(dateStr, out var dp))
                            { date = dp; dateFound = true; }
                        }
                    }

                    if (!dateFound) { _logger.LogWarning("[UPLOAD] Skipping row: no valid date found"); continue; }

                    // ── 2. Determine Format ──
                    var remarks = GetFuzzy("Remarks")?.ToString()?.Trim() ?? GetFuzzy("Description")?.ToString()?.Trim() ?? GetFuzzy("Narration")?.ToString()?.Trim();
                    if (string.IsNullOrEmpty(remarks)) continue;

                    var typeStr = GetFuzzy("Type")?.ToString();
                    
                    if (string.IsNullOrEmpty(typeStr))
                    {
                        // ══ BANK STATEMENT FORMAT (ICICI, HDFC, etc.) ══
                        var withdrawalStr = GetFuzzy("Withdrawal")?.ToString() ?? GetFuzzy("Debit")?.ToString();
                        var depositStr = GetFuzzy("Deposit")?.ToString() ?? GetFuzzy("Credit")?.ToString();

                        decimal withdrawal = 0, deposit = 0;
                        if (!string.IsNullOrEmpty(withdrawalStr)) decimal.TryParse(withdrawalStr, out withdrawal);
                        if (!string.IsNullOrEmpty(depositStr)) decimal.TryParse(depositStr, out deposit);

                        bool isDeposit = deposit > 0;
                        decimal amount = isDeposit ? deposit : withdrawal;
                        if (amount <= 0) continue;

                        var description = GenerateSmartDescription(remarks);
                        var (categoryName, txType) = CategorizeTransaction(remarks, isDeposit);
                        var categoryId = await GetOrCreateCategoryAsync(userId, categoryName, txType);

                        var bankMode = remarks.Contains("UPI", StringComparison.OrdinalIgnoreCase) ? BankMode.GPay : BankMode.Other;
                        var onlineOffline = remarks.Contains("UPI", StringComparison.OrdinalIgnoreCase) ? OnlineOffline.Online : OnlineOffline.Offline;

                        var transaction = new Transaction
                        {
                            Id = Guid.NewGuid(),
                            UserId = userId,
                            AccountId = accountId,
                            CategoryId = categoryId,
                            Amount = Math.Abs(amount),
                            Type = txType,
                            OnlineOffline = onlineOffline,
                            BankMode = bankMode,
                            Description = description,
                            Date = date,
                            IsMonitor = false,
                            IsAutoDebit = false
                        };

                        _context.Transactions.Add(transaction);
                        count++;
                        _logger.LogWarning("[UPLOAD DB] Added Rs.{Amount} | {Type}", amount, txType);
                    }
                    else
                    {
                        // ══ STANDARD FORMAT (has Type column) ══
                        var amountStr = GetFuzzy("Amount")?.ToString();
                        var categoryStr = GetFuzzy("Category")?.ToString() ?? "Shopping";

                        if (!string.IsNullOrEmpty(amountStr) && decimal.TryParse(amountStr, out var amount) && amount > 0)
                        {
                            var type = Enum.TryParse<TransactionType>(typeStr, true, out var t) ? t : TransactionType.Expense;
                            var categoryId = await GetOrCreateCategoryAsync(userId, categoryStr, type);

                            var transaction = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                UserId = userId,
                                AccountId = accountId,
                                CategoryId = categoryId,
                                Amount = Math.Abs(amount),
                                Type = type,
                                OnlineOffline = OnlineOffline.Online,
                                BankMode = BankMode.Other,
                                Description = remarks,
                                Date = date,
                                IsMonitor = false,
                                IsAutoDebit = false
                            };

                            _context.Transactions.Add(transaction);
                            count++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[UPLOAD] Failed to process row");
                }
            }

            if (count > 0)
            {
                await _context.SaveChangesAsync();
            }
        }
        else
        {
            throw new InvalidOperationException("Unsupported file format. Please upload .xlsx or .csv");
        }

        return count;
    }
"""

new_text = text[:last_brace_idx] + code_to_inject + text[last_brace_idx:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Successfully injected UploadAsync and AI methods!")
