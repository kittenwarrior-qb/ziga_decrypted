# Tai song song toan bo asset Cocos2d cua zigavn.com (danh sach trong download_list.txt)
# Chay: powershell -ExecutionPolicy Bypass -File download_assets.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# -Z: tai song song, 16 file cung luc; --create-dirs: tu tao thu muc; -f: bo qua file 404
curl.exe -Z --parallel-max 16 --create-dirs -f -sS --retry 2 -K download_list.txt

$files = Get-ChildItem -Recurse -File ziga_assets
"Da tai {0} file, tong {1:N1} MB vao thu muc ziga_assets" -f $files.Count, (($files | Measure-Object Length -Sum).Sum / 1MB)
