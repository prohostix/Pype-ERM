import os
import glob

def replace_in_files(pattern):
    for filepath in glob.glob(pattern, recursive=True):
        if not os.path.isfile(filepath):
            continue
        with open(filepath, 'r') as file:
            content = file.read()
        
        new_content = content.replace("'staff'", "'student'")
        new_content = new_content.replace('"staff"', '"student"')
        
        if new_content != content:
            with open(filepath, 'w') as file:
                file.write(new_content)
            print(f"Updated {filepath}")

replace_in_files('server/src/controllers/*.ts')
replace_in_files('server/src/routes/*.ts')
replace_in_files('server/src/utils/*.ts')
replace_in_files('client/src/App.tsx')
replace_in_files('client/src/types/*.ts')
replace_in_files('client/src/hooks/*.tsx')
replace_in_files('client/src/pages/*.tsx')
replace_in_files('client/src/components/**/*.tsx')
