# Avisador Opos CAIB

Este proyecto es una herramienta de monitoreo automático para el portal de oposiciones de la CAIB (Govern de les Illes Balears). Está diseñado para detectar cambios en las publicaciones de varios cuerpos y especialidades simultáneamente y enviar notificaciones por correo electrónico de forma inmediata.

## 🚀 Características

- **Monitoreo Multi-objetivo**: Revisa simultáneamente múltiples cuerpos (Cos) y especialidades.
- **Filtros Personalizados**: Configuración flexible mediante variables de entorno.
- **Notificaciones por Email**: Envía alertas automáticas con detalles del cambio y captura de pantalla.
- **Evidencia Visual Individual**: Guarda capturas de pantalla diferenciadas por especialidad.
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
   Edita el archivo `.env` con tus credenciales SMTP y los filtros de oposición.

## ⚙️ Configuración del .env

Para seguir una o varias especialidades, utiliza la variable `MONITOR_TARGETS` siguiendo el formato `CUERPO:ESPECIALIDAD:NOMBRE`. Puedes separar múltiples objetivos usando el carácter pipe (`|`).

### Ejemplo para dos especialidades:
Si quieres seguir "Informática" (0590:107) y "Sistemas y aplicaciones informáticas" (0590:227):

```env
MONITOR_TARGETS=0590:107:Informática|0590:227:Sistemas y aplicaciones informáticas
```

### Variables principales:
- `SMTP_HOST`: Servidor de correo (ej: smtp.gmail.com).
- `SMTP_USER`: Tu dirección de correo.
- `SMTP_PASS`: Tu contraseña de aplicación.
- `EMAIL_TO`: Dirección donde recibirás las alertas.
- `CHECK_INTERVAL_MINUTES`: Frecuencia de revisión (ej: 20).
- `MONITOR_TARGETS`: Lista de especialidades a monitorizar.

## 🚀 Ejecución

Para iniciar la aplicación, ejecuta:

```bash
npm start
```

Aparecerá un menú con las siguientes opciones:

1. **Mandar correo de prueba**: Verifica que tu configuración SMTP sea correcta.
2. **Monitorizar la web (Bucle continuo)**: Inicia el proceso de revisión periódica de todos los objetivos configurados.
3. **Salir**: Cierra la aplicación.

## 📂 Archivos Generados

- `state_CUERPO_ESPECIALIDAD.txt`: Almacena el último estado conocido de cada especialidad.
- `changes.log`: Registro histórico de todos los cambios detectados.
- `last_change_CUERPO_ESPECIALIDAD.png`: Última captura de pantalla donde se detectó un cambio para esa especialidad.

## 📄 Licencia

Este proyecto es de uso personal y educativo.
