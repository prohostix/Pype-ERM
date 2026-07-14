import os
import re

directories = [
    'client/src/pages',
    'client/src/components/panels'
]

replacements = [
    (r'className="grid grid-cols-2( |")', r'className="grid grid-cols-1 sm:grid-cols-2\1'),
    (r'className="grid grid-cols-3( |")', r'className="grid grid-cols-1 md:grid-cols-3\1'),
    (r'className="grid grid-cols-4( |")', r'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4\1'),
    (r'className="grid grid-cols-5( |")', r'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5\1'),
    
    # Dialog overflow fixes
    (r'<DialogContent className="max-w-lg">', r'<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">'),
    (r'<DialogContent className="max-w-xl">', r'<DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">'),
    (r'<DialogContent className="max-w-2xl">', r'<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">'),
    (r'<DialogContent className="max-w-3xl">', r'<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">'),
    (r'<DialogContent className="max-w-4xl">', r'<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">'),
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
                
                # Also fix custom tables that just use "overflow-hidden" for wrapper
                new_content = new_content.replace('className="border rounded-lg overflow-hidden"', 'className="border rounded-lg overflow-x-auto"')
                
                if new_content != content:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")

print("Done")
