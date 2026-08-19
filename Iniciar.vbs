Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = appDir & "\node_modules\electron\dist\electron.exe"
If fso.FileExists(exe) Then
  sh.Run """" & exe & """ """ & appDir & """", 1, False
Else
  sh.Run "cmd /c npm start", 1, False
End If
