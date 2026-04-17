# Generate icon PNGs for the ArcPay Chrome extension.
# Usage: powershell -NoProfile -File generate.ps1
Add-Type -AssemblyName System.Drawing

function New-ArcPayIcon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Indigo→Pink diagonal gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(99, 102, 241),   # #6366f1
        [System.Drawing.Color]::FromArgb(217, 70, 239),   # #d946ef
        45.0
    )
    $g.FillRectangle($brush, $rect)

    # Rounded-corner mask effect: draw 4 rounded rectangles cutouts (optional). Skip for simplicity.

    # Draw "💸" emoji centered. Segoe UI Emoji is the color emoji font on Win10+
    $fontSize = [Math]::Floor($size * 0.6)
    $font = New-Object System.Drawing.Font('Segoe UI Emoji', $fontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $brushWhite = [System.Drawing.Brushes]::White
    $g.DrawString('💸', $font, $brushWhite, $textRect, $fmt)

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Wrote $outPath ($size x $size)"
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
New-ArcPayIcon 16  (Join-Path $here 'icon-16.png')
New-ArcPayIcon 48  (Join-Path $here 'icon-48.png')
New-ArcPayIcon 128 (Join-Path $here 'icon-128.png')
