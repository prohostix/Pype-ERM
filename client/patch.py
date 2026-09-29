import re

path = "/Users/apple/Documents/ProHostix/Pype-ERM/client/src/components/panels/StudentsPanel.tsx"
with open(path, "r") as f:
    content = f.read()

# Replace isDocReq
old_isdoc = """  const isDocReq = (d: string) => {
    return getEnrollmentConfig().requiredDocuments.includes(d);
  };"""
new_isdoc = """  const isDocReq = (d: string) => {
    return getEnrollmentConfig().requiredDocuments.some((req: string) => req.toLowerCase() === d.toLowerCase());
  };"""

content = content.replace(old_isdoc, new_isdoc)

with open(path, "w") as f:
    f.write(content)
