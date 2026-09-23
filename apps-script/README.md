# GIS Seguridad — primera entrega operativa

Sistema inicial para coordinación operativa, control de rondas e histórico GPS. Está basado en tres proyectos de Google Apps Script y una PWA instalable para el teléfono de servicio.

## Qué cubre

- Inicio de sesión por empleado, PIN y código de dispositivo; asociación opcional a vehículo y servicio.
- Roles: `ADMIN`, `SUPERVISOR`, `VIGILANTE`.
- Rondas individuales: iniciar y finalizar.
- Posiciones GPS, precisión, velocidad, rumbo, altitud y fecha de recepción.
- Cola local si no hay cobertura, con reenvío al recuperar internet mientras la PWA siga abierta.
- Incidencias geolocalizadas y panel de supervisión con exportación CSV.
- Archivo trimestral: exporta posiciones con más de 90 días a CSV privado en Drive, verifica el archivo y después purga de Sheets.
- Registro de auditoría para inicios, cierres, rondas, incidencias y archivo.

## Límites importantes, para no prometer algo falso

1. **Apps Script + Sheets es válido como piloto o flota pequeña**, no como plataforma de telemetría masiva. Si se manda GPS cada 2–3 segundos, un teléfono genera 28.800–43.200 puntos diarios. Para producción estable, use 10–15 s en movimiento y una base de datos real (PostgreSQL/PostGIS, Firebase o Supabase).
2. Esta PWA permite GPS mientras está abierta. Android/iOS pueden detenerla en segundo plano. Para GPS continuo con pantalla apagada o aplicación cerrada hace falta una **APK Android nativa** con permiso `ACCESS_BACKGROUND_LOCATION`, servicio foreground visible y una política laboral/RGPD aprobada.
3. El PIN incluido utiliza hash SHA-256 porque Apps Script no tiene una librería de contraseñas segura de serie. Antes de producción migraremos a Firebase Authentication, Google Identity o backend con Argon2/bcrypt y HTTPS con controles de tasa.
4. El código QR dinámico/NFC y fotos en Drive están definidos como siguiente módulo: no deben falsificarse con una foto estática; se requiere QR firmado de corta duración o NFC físico.

## Arquitectura de los tres Apps Script

| Proyecto | Carpeta | Función |
|---|---|---|
| API GIS | `apps-script/api` | Login, sesión, GPS, rondas, incidencias y aplicación de teléfono en `?app=mobile`. Se despliega como Web App. |
| Administración GIS | `apps-script/admin` | Crea hojas, usuarios, vehículos, servicios, dispositivos, archivo trimestral. |
| Portal GIS | `apps-script/portal` | Panel de administrador/supervisor y descarga CSV. Se despliega como Web App. |

## Instalación paso a paso

### 1. Crear almacenamiento Google

1. Con una cuenta corporativa GIS, crea un Google Spreadsheet privado llamado `GIS Seguridad - Operación`.
2. Copia el identificador de la URL: la parte entre `/d/` y `/edit`.
3. Crea una carpeta privada de Google Drive llamada `GIS Seguridad - Archivos trimestrales` y copia su ID.
4. No compartas estas dos piezas con trabajadores salvo que su rol lo requiera.

### 2. Instalar y autorizar clasp localmente

En Terminal, desde `/Users/martinc/.cline/data/workspaces/chat/gis-seguridad`, ejecuta:

```bash
npm install -g @google/clasp
clasp login
```

Autoriza la cuenta corporativa de Google cuando se abra el navegador.

### 3. Crear y desplegar Administración GIS

```bash
cd /Users/martinc/.cline/data/workspaces/chat/gis-seguridad/apps-script/admin
clasp create --type standalone --title "GIS Seguridad - Administración"
clasp push
```

En el editor de Apps Script: **Configuración del proyecto → Propiedades de script**, añade:

- `GIS_SPREADSHEET_ID`: ID del Spreadsheet.
- `GIS_ARCHIVE_FOLDER_ID`: ID de la carpeta privada de Drive.

Ejecuta `setupGis` una vez y autoriza. Cambia inmediatamente el PIN temporal `CAMBIAR-ESTE-PIN`, usando `createUser` para crear el administrador definitivo y desactivando el temporal desde la hoja `USERS`.

Crea registros iniciales desde el editor:

```javascript
createDevice('MOVIL-01', 'Teléfono de servicio coche 01');
createVehicle('COCHE-01', '1234-ABC', 'Vehículo de ronda 01');
createService('Servicio Norte', 'Dirección del servicio', 28.9636, -13.5477);
createUser('1001', 'Nombre Vigilante', 'VIGILANTE', 'PIN-PERSONAL-DE-4-A-12-DIGITOS');
```

Cuando ya hayas comprobado la primera exportación, ejecuta `createQuarterlyArchiveTrigger()` para programar el archivo trimestral.

### 4. Crear y desplegar API GIS

```bash
cd /Users/martinc/.cline/data/workspaces/chat/gis-seguridad/apps-script/api
clasp create --type webapp --title "GIS Seguridad - API"
clasp push
clasp deploy --description "API GIS producción inicial"
```

En el proyecto API añade `GIS_SPREADSHEET_ID` como propiedad de script. En **Implementar → Gestionar implementaciones**, configura Web App: ejecutar como propietario; acceso conforme a los teléfonos corporativos. Copia la URL que termina en `/exec`.

> Para la PWA actual, el acceso debe permitir solicitudes desde dispositivos sin sesión de Google. El token de sesión protege las acciones, pero antes de producción se recomienda mover la API a Cloud Run/Firebase y restringir clientes.

### 5. Abrir la aplicación de teléfono

1. En el teléfono corporativo abre la URL `/exec` de la API añadiendo `?app=mobile`.
2. Guárdala como acceso directo desde Chrome. Al estar alojada en el propio Apps Script, usa `google.script.run` y no depende de permisos CORS entre GitHub Pages y Apps Script.
3. Autoriza ubicación precisa. Mantén la aplicación abierta durante la ronda.
4. La carpeta `mobile` conserva una PWA estática de referencia para la futura migración a Firebase/Cloud Run; no se usa en este despliegue inicial con Apps Script.

### 6. Crear y desplegar Portal GIS

```bash
cd /Users/martinc/.cline/data/workspaces/chat/gis-seguridad/apps-script/portal
clasp create --type webapp --title "GIS Seguridad - Portal"
clasp push
clasp deploy --description "Portal GIS producción inicial"
```

Añade `GIS_SPREADSHEET_ID` a las propiedades del proyecto Portal. Despliega Web App y entrega su URL exclusivamente a administradores/supervisores.

## GitHub

Tras iniciar sesión con `gh auth login`, crea el repositorio privado:

```bash
cd /Users/martinc/.cline/data/workspaces/chat/gis-seguridad
git add . && git commit -m "Primera entrega GIS Seguridad"
gh repo create gis-seguridad --private --source=. --push
```

Nunca subas `.clasp.json`, IDs de Sheets/Drive, PINs, URL privadas ni exportaciones GPS. Están ignorados en `.gitignore`.

## Pruebas locales

```bash
cd /Users/martinc/.cline/data/workspaces/chat/gis-seguridad
npm test
npm run check
```

## Prueba funcional de aceptación

1. Inicia sesión en un teléfono con `MOVIL-01` y un usuario de prueba.
2. Comprueba en `SESSIONS` que se crea una sesión.
3. Inicia una ronda y camina unos metros con la PWA abierta.
4. Comprueba registros en `LOCATIONS` y que el Portal muestra la última posición.
5. Activa modo avión, espera a que aparezcan pendientes, restaura conexión y comprueba el reenvío.
6. Crea una incidencia, verifica `INCIDENTS` y el Portal.
7. En una copia de prueba, crea una ubicación de más de 90 días y ejecuta `archiveLocationsOlderThan(90)`; comprueba el CSV en Drive y la fila `ARCHIVE_AND_PURGE` en `AUDIT` antes de usarlo con datos reales.

## Datos/accesos que faltan para despliegue real

- Cuenta Google Workspace/corporativa administradora y autorización para Apps Script, Drive y Sheets.
- ID de Spreadsheet privado y carpeta de archivo Drive.
- Lista inicial: trabajadores, roles, vehículos, teléfonos y servicios.
- Dominio/hosting HTTPS para la PWA y decisión sobre GitHub privado.
- Política firmada de uso de geolocalización, periodos de seguimiento, retención y responsables RGPD.
- Para GPS continuo fiable: decisión de aprobar una APK Android nativa y, preferiblemente, backend PostgreSQL/PostGIS/Firebase en lugar de Sheets.