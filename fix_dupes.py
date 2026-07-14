import os
import re

directories = [
    'client/src/pages',
    'client/src/components/panels'
]

replacements = [
    (r'sm:grid-cols-2 sm:grid-cols-2', r'sm:grid-cols-2'),
    (r'sm:grid-cols-2 sm:grid-cols-3', r'sm:grid-cols-3'),
    (r'sm:grid-cols-2 sm:grid-cols-4', r'sm:grid-cols-4'),
    (r'sm:grid-cols-2 sm:flex', r'sm:flex'),
    (r'md:grid-cols-3 md:grid-cols-5', r'md:grid-cols-5'),
]

for directory in directories:
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.jsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                new_content = content
                for old, new in replacements:
                    new_content = re.sub(old, new, new_content)
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Fixed dupes in {filepath}")

print("Done fixing dupes")
