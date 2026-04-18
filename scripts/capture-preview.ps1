Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Width = 430
$form.Height = 932
$form.StartPosition = 'Manual'
$form.Location = New-Object System.Drawing.Point(-32000,-32000)

$browser = New-Object System.Windows.Forms.WebBrowser
$browser.ScrollBarsEnabled = $false
$browser.ScriptErrorsSuppressed = $true
$browser.Dock = 'Fill'
$form.Controls.Add($browser)

$done = $false
$browser.Add_DocumentCompleted({
  Start-Sleep -Milliseconds 3000
  $bitmap = New-Object System.Drawing.Bitmap($browser.Width, $browser.Height)
  $browser.DrawToBitmap($bitmap, (New-Object System.Drawing.Rectangle(0,0,$browser.Width,$browser.Height)))
  $bitmap.Save('C:\Users\ahmet\OneDrive\Belgeler\New project\preview-home.png', [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
  $script:done = $true
  $form.Close()
})

$browser.Url = 'file:///C:/Users/ahmet/OneDrive/Belgeler/New%20project/index.html'
$form.Show()
while (-not $done) {
  [System.Windows.Forms.Application]::DoEvents()
  Start-Sleep -Milliseconds 100
}
