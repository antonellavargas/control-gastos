# Control de gastos familiar

Web app estática para GitHub Pages con:

- Registro de ingresos, egresos, ahorros, dinero físico y tarjeta de crédito.
- Usuarios Mami y Nella.
- Resumen mensual y filtro por usuario.
- Saldos por Yape, efectivo, tarjetas y otros medios.
- Historial editable.
- Exportación mensual o completa a Excel.
- Respaldo y restauración JSON.
- Sincronización opcional con Google Sheets mediante Apps Script.

## Publicar en GitHub Pages

1. Crea un repositorio, por ejemplo `control-gastos`.
2. Sube `index.html`, `styles.css` y `app.js` a la raíz.
3. En GitHub entra a **Settings > Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige la rama `main` y la carpeta `/root`.
6. Guarda. Tu URL será parecida a:
   `https://TU-USUARIO.github.io/control-gastos/`

## Importante sobre los datos

Sin Google Sheets, los movimientos se guardan en `localStorage`, es decir, solo en el navegador y dispositivo donde se registraron. Usa la exportación o el respaldo JSON con frecuencia.

Para compartir datos entre dispositivos y usuarios, configura el archivo `google-apps-script.gs` siguiendo sus instrucciones y pega la URL resultante en **Configuración > Google Sheets**.

## Recomendación de privacidad

No publiques claves, contraseñas ni información bancaria. La URL de Apps Script permite agregar registros a la hoja vinculada; úsala solo con personas de confianza.
