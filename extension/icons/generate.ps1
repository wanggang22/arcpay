# Generate icon PNGs for the ArcPay Chrome extension.
# Usage: powershell -NoProfile -File generate.ps1
#
# Palette is aligned to the landing redesign (2026-04-21):
#   - Background ink  #0a0a0f  (matches ArcPay dark surfaces)
#   - Accent          #2d4a3e  (deep forest green)
#   - Highlight       #b8a47e  (antique gold — for subtle rim)
#   - Bolt            #f7f4ee  (warm ivory, same as landing paper)

Add-Type -AssemblyName System.Drawing

function New-ArcPayIcon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Rounded-rect clipping path so corners are soft like a modern app icon
    $radius = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $radius*2, $radius*2, 180, 90)
    $path.AddArc($size - $radius*2, 0, $radius*2, $radius*2, 270, 90)
    $path.AddArc($size - $radius*2, $size - $radius*2, $radius*2, $radius*2, 0, 90)
    $path.AddArc(0, $size - $radius*2, $radius*2, $radius*2, 90, 90)
    $path.CloseFigure()
    $g.SetClip($path)

    # Forest-green base with a subtle darker-to-slightly-lighter diagonal gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(31, 58, 46),
        [System.Drawing.Color]::FromArgb(45, 74, 62),
        135.0
    )
    $g.FillRectangle($brush, $rect)

    # Lightning bolt polygon (normalized 0..1, then scaled)
    $pts = @(
        @(0.56, 0.08),
        @(0.22, 0.56),
        @(0.44, 0.56),
        @(0.36, 0.92),
        @(0.74, 0.42),
        @(0.52, 0.42),
        @(0.62, 0.08)
    )
    $poly = @()
    foreach ($p in $pts) {
        $poly += New-Object System.Drawing.PointF(($p[0] * $size), ($p[1] * $size))
    }

    # Soft drop shadow
    $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
    $shadowPoly = @()
    $offset = [Math]::Max(1, [int]($size * 0.02))
    foreach ($pt in $poly) {
        $shadowPoly += New-Object System.Drawing.PointF(($pt.X + $offset), ($pt.Y + $offset))
    }
    $g.FillPolygon($shadow, $shadowPoly)

    # Ivory bolt
    $ivory = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(247, 244, 238))
    $g.FillPolygon($ivory, $poly)

    # Gold hairline on leading edge for a minted look
    if ($size -ge 48) {
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, 184, 164, 126), [float]([Math]::Max(1, $size * 0.008)))
        $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        $p0 = New-Object System.Drawing.PointF -ArgumentList @([float]($pts[0][0] * $size), [float]($pts[0][1] * $size))
        $p6 = New-Object System.Drawing.PointF -ArgumentList @([float]($pts[6][0] * $size), [float]($pts[6][1] * $size))
        $p5 = New-Object System.Drawing.PointF -ArgumentList @([float]($pts[5][0] * $size), [float]($pts[5][1] * $size))
        [System.Drawing.PointF[]]$leading = @($p0, $p6, $p5)
        $g.DrawLines($pen, $leading)
        $pen.Dispose()
    }

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Wrote $outPath ($size x $size)"
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
New-ArcPayIcon 16  (Join-Path $here 'icon-16.png')
New-ArcPayIcon 48  (Join-Path $here 'icon-48.png')
New-ArcPayIcon 128 (Join-Path $here 'icon-128.png')
New-ArcPayIcon 440 (Join-Path $here 'promo-440x280-icon.png')
