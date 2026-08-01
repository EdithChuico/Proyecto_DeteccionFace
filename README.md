# Smart Assistance

Sistema distribuido para el registro de asistencia laboral mediante reconocimiento facial, geolocalización y geocercas. La aplicación permite a los administradores gestionar empleados, configurar el perímetro de trabajo, consultar asistencias y enviar reportes; los trabajadores registran sus marcaciones con validación biométrica.

## Componentes

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| Frontend | React | Panel administrativo, vista del empleado, cámara, GPS, OAuth y TOTP. |
| Backend | Java 17 y Spring Boot | API REST, JWT, WebSocket, reglas de asistencia, reportes y correo. |
| IA | Python, Flask y DeepFace | Verificación facial. |
| Pasarela | Node.js y Express | Integración de pagos en Sandbox y procesamiento de eventos. |
| Datos | PostgreSQL (Neon) y PocketBase | Datos transaccionales y almacenamiento privado de fotografías. |
| Orquestación | Docker Swarm | Réplicas, red overlay y balanceo de solicitudes. |

## Funcionalidades principales

- Registro de asistencia con cámara, geolocalización y validación facial.
- Administración de empleados, geocerca y estados de cuenta.
- Autenticación con JWT, Google OAuth 2.0, OTP por correo y TOTP con código QR.
- Actualizaciones en tiempo real mediante WebSocket.
- Reportes PDF personalizados enviados por correo como tarea en segundo plano.
- Pagos en entorno Sandbox para liquidar multas.
- Almacenamiento de fotografías biométricas en PocketBase.
- Ejecución distribuida en Docker Swarm con tres réplicas del backend, dos del frontend, dos de la pasarela y una de IA.

## Requisitos

- Docker Desktop con Docker Swarm habilitado.
- Java 17 o superior y Node.js 20, solo para la ejecución sin contenedores.
- Una base de datos PostgreSQL configurada.
- Instancia de PocketBase disponible.
- Credenciales de Gmail SMTP, Google OAuth y pasarelas de pago Sandbox.
- Ollama con el modelo `phi3`, si se desea usar el análisis de estadísticas.

## Configuración segura

1. Revisa [`.env.example`](.env.example) y crea archivos locales con los valores reales. Nunca publiques los archivos `.env`, contraseñas, tokens, secretos TOTP ni claves de Sandbox.
2. La pasarela Node usa `pasarela-mensajes-node/.env`; se incluye una plantilla en `pasarela-mensajes-node/.env.example`.
3. El backend consume actualmente sus propiedades desde `proyecto-backEnd/src/main/resources/application.properties`. Antes de subir el proyecto a un repositorio público, mueve sus valores sensibles a una configuración local o a variables de entorno.

## Ejecución con Docker Swarm

Desde la raíz del proyecto, construye las imágenes:

```powershell
docker build -t asistencia-backend:latest .\proyecto-backEnd
docker build -t asistencia-frontend:latest .\proyecto-frontEnd
docker build -t asistencia-node:latest .\pasarela-mensajes-node
docker build -t asistencia-ia:latest .\proyecto-ia
```

Comprueba el estado de Swarm. Ejecuta la inicialización únicamente si su resultado no es `active`:

```powershell
docker info --format '{{.Swarm.LocalNodeState}}'
docker swarm init
```

Despliega o actualiza el stack:

```powershell
docker stack deploy -c docker-compose.yml sistema_asistencia
docker service ls
```

La evidencia esperada es:

```text
sistema_asistencia_backend          3/3
sistema_asistencia_frontend         2/2
sistema_asistencia_node-pasarela    2/2
sistema_asistencia_python-ia        1/1
```

Para verificar una réplica o consultar sus registros:

```powershell
docker service ps sistema_asistencia_backend
docker service logs sistema_asistencia_backend
docker service update --force sistema_asistencia_python-ia
```

La aplicación queda disponible en `http://localhost:3000`. Los servicios publicados son backend `8080`, pasarela Node `4000` e IA `5000`.

## Ejecución local para desarrollo

### Backend

```powershell
Set-Location .\proyecto-backEnd
.\mvnw.cmd spring-boot:run
```

### Frontend

```powershell
Set-Location .\proyecto-frontEnd
npm install
npm start
```

### Pasarela Node

Configura `PORT=4000` en `pasarela-mensajes-node/.env` cuando se use junto con el stack y luego ejecuta:

```powershell
Set-Location .\pasarela-mensajes-node
npm install
npm run dev
```

### Servicio de IA

```powershell
Set-Location .\proyecto-ia
pip install -r requirements.txt
python app.py
```

## Verificación

```powershell
Set-Location .\proyecto-backEnd
.\mvnw.cmd test
```

También se pueden verificar las réplicas con `docker service ls`, los eventos del worker en los logs de la pasarela, los correos recibidos, el código QR de TOTP, las transacciones Sandbox y los registros creados en PostgreSQL y PocketBase.

## Estructura del repositorio

```text
proyecto-backEnd/          API Spring Boot, seguridad, correo y reportes
proyecto-frontEnd/         Interfaz React de administrador y empleado
proyecto-ia/               Servicio Flask con DeepFace
pasarela-mensajes-node/    Pasarela de pagos y worker de eventos
docker-compose.yml         Definición del stack Docker Swarm
.env.example               Referencia de variables sensibles
```
