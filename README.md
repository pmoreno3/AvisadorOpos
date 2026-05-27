# Avisador Opos CAIB

Este proyecto es una herramienta de monitoreo automático para el portal de oposiciones de la CAIB (Govern de les Illes Balears). Está diseñado para detectar cambios en las publicaciones de cuerpos y especialidades específicas y enviar notificaciones por correo electrónico de forma inmediata.

## 🚀 Características

- **Monitoreo Automático**: Revisa periódicamente el portal de la CAIB.
- **Filtros Personalizados**: Configura el Cuerpo (Cos) y la Especialidad que te interesa seguir.
- **Notificaciones por Email**: Envía alertas automáticas con detalles del cambio.
- **Evidencia Visual**: Adjunta una captura de pantalla (screenshot) de la página web al detectar un cambio.
- **Normalización de Contenido**: Evita falsos positivos ignorando cambios irrelevantes en el formato o espacios en blanco.
- **Menú Interactivo**: Interfaz sencilla por línea de comandos para gestionar el servicio.

## 🛠️ Requisitos

- [Node.js](https://nodejs.org/) (versión 16 o superior recomendada)
- Una cuenta de correo con soporte SMTP (ej. Gmail con "Contraseñas de aplicación")

## 📦 Instalación

1. **Clonar el repositorio** (o descargar los archivos):
   ```bash
   git clone <url-del-repositorio>
   cd AvisadorOpos
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Instalar el navegador necesario (Playwright)**:
   ```bash
   npx playwright install chromium
   ```

4. **Configurar el entorno**:
   Copia el archivo de ejemplo `.env.example` a un nuevo archivo `.env`:
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus credenciales SMTP y los filtros de oposición que deseas monitorizar:
   - `SMTP_HOST`: Servidor de correo (ej: smtp.gmail.com).
   - `SMTP_USER`: Tu dirección de correo.
   - `SMTP_PASS`: Tu contraseña o contraseña de aplicación.
   - `CHECK_INTERVAL_MINUTES`: Cada cuántos minutos quieres que revise la web.
   - `COS_VALUE` y `ESPECIALITAT_VALUE`: Códigos correspondientes al cuerpo y especialidad en el portal.

## ⚙️ Ejecución

Para iniciar la aplicación, ejecuta:

```bash
npm start
```

Aparecerá un menú con las siguientes opciones:

1. **Mandar correo de prueba**: Verifica que tu configuración SMTP sea correcta enviando un email de prueba.
2. **Monitorizar la web (Bucle continuo)**: Inicia el proceso de revisión periódica.
3. **Salir**: Cierra la aplicación.

## 📂 Archivos Generados

- `state.txt`: Almacena el último estado conocido de la web para comparar cambios.
- `changes.log`: Registro histórico de los cambios detectados con fecha y hora.
- `last_change.png`: Captura de pantalla de la última vez que se detectó un cambio o de la carga inicial.

## 📄 Licencia

Este proyecto es de uso personal y educativo.
