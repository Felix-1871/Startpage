#!/bin/bash
# Generate icons.json from img/icons directory
icons_dir="./img/icons"
output_file="./icons.json"

if [ ! -d "$icons_dir" ]; then
    echo "Error: $icons_dir directory not found."
    exit 1
fi

echo "[" > "$output_file"
first=true

# Use find to get only files, sorted alphabetically
find "$icons_dir" -maxdepth 1 -type f -name "*.svg" | sort | while read -r icon_path; do
    icon=$(basename "$icon_path")
    if [ "$first" = true ]; then
        echo "  \"$icon\"" >> "$output_file"
        first=false
    else
        sed -i '$ s/$/ ,/' "$output_file"
        echo "  \"$icon\"" >> "$output_file"
    fi
done

# Fix trailing comma if any (simpler way than sed -i above might be needed for cross-platform)
# Actually let's use a simpler approach for the comma

# Restarting output_file generation for a cleaner approach
echo "[" > "$output_file"
find "$icons_dir" -maxdepth 1 -type f -name "*.svg" -printf "%f\n" | sort | while read -r icon; do
    echo "\"$icon\"," >> "$output_file"
done
# Remove trailing comma from last line and close bracket
sed -i '$ s/,$//' "$output_file"
echo "]" >> "$output_file"

echo "Generated icons.json with $(grep -c '"' "$output_file") icons."
