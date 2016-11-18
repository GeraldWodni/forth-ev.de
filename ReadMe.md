# Webseite der Forth Gesellschaft e.V.
## Website of the Forth Gesellschaft e.V.

https://forth-ev.de


## Website installieren
0. mysql Datenbank instanzieren, redis-server (für sessions) installieren.
1. kern.js clonen `git clone https://github.com/GeraldWodni/kern.js.git`
2. ins kern.js Verzeichnis absteigen `cd kern.js`
3. npm (back-end-zeugs) - Abhängigkeiten installieren `npm install`
4. bower (front-end-zeugs) - Abhängigkeiten installieren `bower install`
5. ins websiten Verzeichnis absteigen `cd websites`
6. dieses repository clonen `git clone https://github.com/GeraldWodni/forth-ev.de.git`
7. ins repo absteigen `cd forth-ev.de`
8. gravatar-proxy-cache anlegen `mkdir -p proxy/gravatar`
8. config.json in dieses Verzeichnis kopieren (liegt beim Direktorium auf)
9. aufsteigen in kern.js `cd ../..`
10. kern.js starten `npm start`
