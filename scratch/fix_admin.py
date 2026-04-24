
import os

file_path = r'c:\Users\Rigo\NewHopeGGN\newhopeggn\src\app\admin\admin-panel-client.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 2645 to 2661 (1-indexed)
# 0-indexed: 2644 to 2660
new_lines = lines[:2644] + lines[2661:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File fixed successfully.")
