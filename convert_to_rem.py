import re

# Read the CSS file
with open(r'c:\Users\sharathkv\Desktop\Frappe Swagger\api_explorer\api_explorer\public\js\styles\main.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Function to convert px to rem (base 13px)
def px_to_rem(match):
    px_value = float(match.group(1))
    rem_value = round(px_value / 13, 2)
    return f'{rem_value}rem'

# Convert all px values to rem except for specific cases
# Keep border widths, specific fixed sizes
css = re.sub(r'(\d+)px(?! solid| !important)', lambda m: px_to_rem(m) if int(m.group(1)) not in [0, 1, 2, 100] else m.group(0), css)

# Write back
with open(r'c:\Users\sharathkv\Desktop\Frappe Swagger\api_explorer\api_explorer\public\js\styles\main.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Conversion complete!")
