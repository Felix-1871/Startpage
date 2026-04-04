#!/bin/bash
icons_dir="./img/icons"
output_file="./icons.json"

if [ ! -d "$icons_dir" ]; then
    echo "Error: $icons_dir directory not found."
    exit 1
fi

echo "Generating $output_file..."

echo "[" > "$output_file"
find "$icons_dir" -maxdepth 1 -type f -name "*.svg" -printf "  \"%f\",\n" | sort >> "$output_file"
sed -i '$ s/,$//' "$output_file"
echo "]" >> "$output_file"
icon_count=$(grep -c '"' "$output_file")
echo "Successfully generated $output_file with $icon_count icons."
