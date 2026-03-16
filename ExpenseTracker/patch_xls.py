import sys

path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\Services\Implementations\TransactionService.cs'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Add usings at the top if not present
if "using ExcelDataReader;" not in text:
    text = text.replace("using Microsoft.Extensions.Logging;", "using Microsoft.Extensions.Logging;\r\nusing ExcelDataReader;\r\nusing System.Data;")

# Find the parsing line
old_code = """var rawRows = MiniExcelLibs.MiniExcel.Query(fileStream, useHeaderRow: false).Cast<IDictionary<string, object>>().ToList();"""
new_code = """IList<IDictionary<string, object>> rawRows = new List<IDictionary<string, object>>();
            if (extension == ".xls")
            {
                using var reader = ExcelReaderFactory.CreateBinaryReader(fileStream);
                var result = reader.AsDataSet(new ExcelDataSetConfiguration() { ConfigureDataTable = (_) => new ExcelDataTableConfiguration() { UseHeaderRow = false } });
                var dataTable = result.Tables[0];
                foreach (System.Data.DataRow r in dataTable.Rows)
                {
                    var dict = new Dictionary<string, object>();
                    for (int i = 0; i < dataTable.Columns.Count; i++)
                        dict[$"Col{i}"] = r[i];
                    rawRows.Add(dict);
                }
            }
            else
            {
                rawRows = MiniExcelLibs.MiniExcel.Query(fileStream, useHeaderRow: false).Cast<IDictionary<string, object>>().ToList();
            }"""

if old_code in text:
    text = text.replace(old_code, new_code)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Patched TransactionService.cs successfully")
else:
    print("Could not find the target code block to replace")
