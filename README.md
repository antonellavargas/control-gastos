# Mi Control de Gastos — Mami y Nella

Web app para GitHub Pages con almacenamiento compartido en Google Sheets, copia local y exportación a Excel.

## 1. Crear la hoja compartida

1. Crea una hoja nueva en Google Sheets.
2. Copia el ID que aparece en la URL entre `/d/` y `/edit`.
3. En la hoja entra a **Extensiones > Apps Script**.
4. Borra el código inicial y pega el contenido de `google-apps-script.gs`.
5. Reemplaza `PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET` con el ID de tu hoja.
6. Guarda el proyecto.

## 2. Publicar Apps Script

1. Pulsa **Implementar > Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Quién tiene acceso: **Cualquier persona**.
5. Autoriza los permisos y copia la URL que termina en `/exec`.

## 3. Conectar la web

Abre `app.js` y reemplaza:

```js
const CLOUD_SCRIPT_URL = 'PEGA_AQUI_TU_URL_DE_APPS_SCRIPT';
```

por tu URL `/exec`. No elimines las comillas.

## 4. Antes de publicar

Como ya tienes movimientos guardados en tu navegador:

1. Abre la versión actual de la web.
2. Ve a **Configuración**.
3. Pega la URL de Apps Script.
4. Pulsa **Subir y sincronizar ahora**.

Esto copia tus movimientos actuales a Google Sheets.

## 5. Publicar en GitHub Pages

Sube a la raíz del repositorio:

- `index.html`
- `styles.css`
- `app.js`

En GitHub: **Settings > Pages > Deploy from a branch > main > /root**.

## Funcionamiento

- Al abrir la web, descarga automáticamente los registros de Google Sheets.
- Al registrar o editar, actualiza Google Sheets y la copia local.
- Al eliminar, elimina también el registro compartido.
- Si no hay internet, muestra la última copia guardada en el dispositivo.

## Privacidad

La web no solicita contraseña. Cualquier persona que conozca la URL de GitHub Pages podría abrirla, y cualquier persona que conozca la URL de Apps Script podría consultar la información. Evita publicar ambas URLs en redes sociales o repositorios ajenos.
