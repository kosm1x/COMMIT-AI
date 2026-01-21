# FTP Deployment Script for COMMIT-AI
# This script builds the app and deploys it to the FTP server

param(
    [string]$FtpServer = "ftp://ftp.app.mycommit.net",
    [string]$FtpUsername = "u379720455.fmoctezumaadmin2",
    [string]$FtpPassword = "Ish1kawaA-"
)

Write-Host "Starting deployment process..." -ForegroundColor Cyan

# Step 1: Build the app
Write-Host "Building production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green

# Step 2: Upload files to FTP
Write-Host "Uploading files to FTP server..." -ForegroundColor Yellow

$distPath = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path $distPath)) {
    Write-Host "dist folder not found! Build may have failed." -ForegroundColor Red
    exit 1
}

# Function to upload a file to FTP
function Upload-File {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Server,
        [string]$Username,
        [string]$Password
    )
    
    try {
        $ftpUri = "$Server/$RemotePath"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftpRequest.UseBinary = $true
        $ftpRequest.UsePassive = $true
        $ftpRequest.KeepAlive = $false
        
        $fileContent = [System.IO.File]::ReadAllBytes($LocalPath)
        $ftpRequest.ContentLength = $fileContent.Length
        
        $requestStream = $ftpRequest.GetRequestStream()
        $requestStream.Write($fileContent, 0, $fileContent.Length)
        $requestStream.Close()
        
        $response = $ftpRequest.GetResponse()
        $response.Close()
        
        return $true
    }
    catch {
        Write-Host "  Warning: Failed to upload: $RemotePath - $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Function to create directory on FTP
function Create-FtpDirectory {
    param(
        [string]$RemotePath,
        [string]$Server,
        [string]$Username,
        [string]$Password
    )
    
    try {
        $ftpUri = "$Server/$RemotePath"
        $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
        $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
        $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $ftpRequest.UsePassive = $true
        
        $response = $ftpRequest.GetResponse()
        $response.Close()
        
        return $true
    }
    catch {
        # Directory might already exist, which is fine
        return $false
    }
}

# Get all files recursively
$files = Get-ChildItem -Path $distPath -Recurse -File
$totalFiles = $files.Count
$uploadedFiles = 0
$failedFiles = 0

Write-Host "Found $totalFiles files to upload" -ForegroundColor Cyan

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($distPath.Length + 1)
    $remotePath = $relativePath.Replace('\', '/')
    
    # Create directory structure if needed
    $remoteDir = Split-Path $remotePath -Parent
    if ($remoteDir) {
        $dirParts = $remoteDir -split '/'
        $currentPath = ""
        foreach ($dirPart in $dirParts) {
            if ($currentPath) {
                $currentPath += "/$dirPart"
            } else {
                $currentPath = $dirPart
            }
            Create-FtpDirectory -RemotePath $currentPath -Server $FtpServer -Username $FtpUsername -Password $FtpPassword | Out-Null
        }
    }
    
    # Upload file
    Write-Host "  Uploading: $remotePath" -ForegroundColor Gray
    if (Upload-File -LocalPath $file.FullName -RemotePath $remotePath -Server $FtpServer -Username $FtpUsername -Password $FtpPassword) {
        $uploadedFiles++
        Write-Host "    Success" -ForegroundColor Green
    } else {
        $failedFiles++
    }
}

Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "  Successfully uploaded: $uploadedFiles files" -ForegroundColor Green
if ($failedFiles -gt 0) {
    Write-Host "  Failed: $failedFiles files" -ForegroundColor Red
}
Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Your app should be live at: https://app.mycommit.net" -ForegroundColor Cyan
