' Rol de Turnos: inicia el servidor local sin ventana y abre el navegador.
' Si ya estaba abierto, solo abre la pagina.
Option Explicit

Dim shell, fso, raiz, datos, comando
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

raiz = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
datos = raiz & "\datos"
If Not fso.FolderExists(datos) Then fso.CreateFolder(datos)

shell.CurrentDirectory = raiz & "\backend"
comando = "cmd /c node --disable-warning=ExperimentalWarning dist\server.js --abrir >> """ & datos & "\servidor.log"" 2>&1"
shell.Run comando, 0, False
