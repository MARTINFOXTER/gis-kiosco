# GIS online: GitHub Pages + Google Sheets

Hoja: https://docs.google.com/spreadsheets/d/1YBgE7Ol1dddNhOmqm6KqxZqf6lH4F32Z_Z6KKb6psKE/edit  
Kiosco: https://martinfoxter.github.io/gis-kiosco/

La Web App que hay ahora responde **403**. Hay que **pegar el código nuevo y volver a implementar** (mismo enlace `/exec` si editas la implementación).

## Pasos (hazlos en este orden)

1. Abre la [hoja](https://docs.google.com/spreadsheets/d/1YBgE7Ol1dddNhOmqm6KqxZqf6lH4F32Z_Z6KKb6psKE/edit).
2. Extensiones → **Apps Script**.
3. Borra el contenido de `Codigo.gs` y pega `apps-script/Codigo.gs` de esta carpeta.
4. Si no existe el archivo HTML, créalo con nombre exacto **Index** y pega `apps-script/Index.html`.
5. Guarda. En el desplegable de funciones elige `inicializarHojas` → Ejecutar → **Autorizar** (cuenta Google de GIS).
6. Vuelve a la hoja: menú **GIS Seguridad → Inicializar hojas y datos demo**.
7. Apps Script → **Implementar → Administrar implementaciones → Editar (lápiz) → Nueva versión**.
   - Tipo: Aplicación web  
   - Ejecutar como: **Yo**  
   - Quién tiene acceso: **Cualquiera** (o Cualquiera con la URL)  
   - Implementar.
8. Copia la URL que termina en `/exec`. Si cambió, dímela y se actualiza `github-pages/config.js`.
9. Recarga https://martinfoxter.github.io/gis-kiosco/ (kiosco), `/mapa.html` y `/oficina.html`.

## Alta de un vigilante (QR automático)

En la pestaña **Empleados**, una fila:

| ID_Empleado | Nombre | Codigo_QR | Servicio_Asignado | Activo | PIN_4 |
|-------------|---------|-----------|-------------------|--------|-------|
| 1003 | Ana López | *(se rellena solo)* | S1 | TRUE | 4312 |

Al escribir el **Nombre**, Apps Script pone el QR. Imprimir: menú GIS Seguridad → Generar QRs.

## Uso en el móvil de trabajo

https://martinfoxter.github.io/gis-kiosco/ → pestaña Inicio → nº + PIN de 4 dígitos **o** cámara al QR físico. GPS cada 2–3 s cae en la pestaña **GPS**. El mapa los pinta.

Demo tras inicializar: `1001`/`1234` y `1002`/`5678`.
