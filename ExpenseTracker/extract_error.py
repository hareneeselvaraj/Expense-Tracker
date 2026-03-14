import codecs

lines = codecs.open('crash_log.txt', 'r', 'utf-16le', errors='ignore').readlines()
error_block = []
in_error = False

for i, line in enumerate(lines):
    if 'fail:' in line or 'Microsoft.EntityFrameworkCore.Database.Command' in line and '[20102]' in line:
        in_error = True
        error_block.append(line)
        continue
    if in_error:
        if line.startswith('info:') or line.startswith('warn:'):
            in_error = False
        else:
            error_block.append(line)

codecs.open('extracted_error.txt', 'w', 'utf-8').writelines(error_block)
