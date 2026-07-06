# Hook: chay khi Claude Code hoan thanh 1 luot tra loi va dang cho input tiep theo.
# Phat am thanh + hien desktop notification (balloon tip), khong can cai module ngoai.

$soundPath = 'C:\Users\pc\Music\Tuturu.mp3'

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    $player = New-Object System.Windows.Media.MediaPlayer
    $player.Open([Uri]$soundPath)
    $player.Play()
} catch {}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.Visible = $true
$notify.ShowBalloonTip(5000, 'Claude Code', 'Da hoan thanh, dang cho ban nhap tiep.', [System.Windows.Forms.ToolTipIcon]::Info)

Start-Sleep -Seconds 5
$notify.Dispose()
