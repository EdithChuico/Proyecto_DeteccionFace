# Smart Assistance

Smart Assistance es un sistema distribuido orientado al registro de asistencia laboral mediante reconocimiento facial, geolocalización y geocercas. La solución permite que el personal administrativo gestione empleados, configure el perímetro de trabajo, consulte las asistencias y envíe reportes. Por su parte, los empleados registran sus marcaciones mediante validación biométrica.

## Componentes de la solución

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| Frontend | React | Proporciona el panel administrativo, la vista del empleado, el acceso a cámara, GPS, OAuth y TOTP. |
| Backend | Java 17 y Spring Boot | Expone la API REST, administra JWT y WebSocket, aplica reglas de asistencia, genera reportes y envía correos. |
| IA | Python, Flask y DeepFace | Ejecuta la verificación facial. |
| Pasarela | Node.js y Express | Gestiona los pagos en Sandbox y el procesamiento de eventos. |
| Datos | PostgreSQL (Neon) y PocketBase | Mantiene los datos transaccionales y las fotografías biométricas privadas. |
| Orquestación | Docker Swarm | Ejecuta las réplicas, la red overlay y el balanceo de solicitudes. |

## Funcionalidades implementadas

El sistema incorpora registro de asistencia con cámara, geolocalización y reconocimiento facial. Posteriormente, los datos pueden ser gestionados desde un módulo administrativo que incluye empleados, geocerca, asistencias y estados de cuenta.

La seguridad se implementa mediante JWT, Google OAuth 2.0, OTP enviado por correo y TOTP con código QR. Adicionalmente, los cambios de configuración se notifican en tiempo real mediante WebSocket. El sistema también genera reportes PDF personalizados, los envía por correo como tarea en segundo plano, permite liquidar multas mediante pagos Sandbox y almacena fotografías biométricas en PocketBase.

Finalmente, la solución se ejecuta en Docker Swarm con tres réplicas del backend, dos del frontend, dos de la pasarela Node y una del servicio de inteligencia artificial.

## Requisitos previos

Inicialmente, se debe disponer de los siguientes recursos:

- Docker Desktop con Docker Swarm habilitado.
- Java 17 o superior y Node.js 20, únicamente para la ejecución sin contenedores.
- Una base de datos PostgreSQL configurada.
- Una instancia disponible de PocketBase.
- Credenciales de Gmail SMTP, Google OAuth y pasarelas de pago en ambiente Sandbox.
- Ollama con el modelo `phi3`, cuando se requiera el análisis de estadísticas.

## Configuración segura

Inicialmente, se debe revisar el archivo [`.env.example`](.env.example), el cual contiene la referencia de las variables necesarias sin valores sensibles. Posteriormente, cada entorno local debe disponer de sus propios archivos `.env` o variables de entorno con las credenciales reales.

La pasarela Node utiliza el archivo `pasarela-mensajes-node/.env`; para este componente se proporciona la plantilla `pasarela-mensajes-node/.env.example`. El backend mantiene actualmente sus propiedades en `proyecto-backEnd/src/main/resources/application.properties`. Antes de publicar el repositorio, los valores sensibles deben trasladarse a una configuración local o a variables de entorno.

En ningún caso deben publicarse archivos `.env`, contraseñas, tokens, secretos TOTP ni claves de Sandbox.

## Ejecución mediante Docker Swarm

Inicialmente, desde la raíz del proyecto se deben construir las imágenes de cada componente:

```powershell
docker build -t asistencia-backend:latest .\proyecto-backEnd
docker build -t asistencia-frontend:latest .\proyecto-frontEnd
docker build -t asistencia-node:latest .\pasarela-mensajes-node
docker build -t asistencia-ia:latest .\proyecto-ia
```

Posteriormente, se debe comprobar el estado de Docker Swarm. La inicialización solo se realiza si el resultado no es `active`:

```powershell
docker info --format '{{.Swarm.LocalNodeState}}'
docker swarm init
```

Una vez habilitado Swarm, se despliega o actualiza el stack mediante el siguiente comando:

```powershell
docker stack deploy -c docker-compose.yml sistema_asistencia
docker service ls
```

Después del despliegue, se debe verificar que las réplicas se encuentren activas. La evidencia esperada es la siguiente:

```text
sistema_asistencia_backend          3/3
sistema_asistencia_frontend         2/2
sistema_asistencia_node-pasarela    2/2
sistema_asistencia_python-ia        1/1
```

Para consultar la distribución de una réplica y sus registros, se utilizan los siguientes comandos:

```powershell
docker service ps sistema_asistencia_backend
docker service logs sistema_asistencia_backend
docker service update --force sistema_asistencia_python-ia
```

Finalmente, la aplicación queda disponible en `http://localhost:3000`. Los servicios publicados corresponden al backend en el puerto `8080`, la pasarela Node en el puerto `4000` y la IA en el puerto `5000`.

## Ejecución local para desarrollo

Cuando no se utilicen contenedores, los componentes pueden iniciarse de manera independiente. Inicialmente se debe configurar la base de datos, PocketBase, las credenciales de correo y los servicios externos requeridos.

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

Previamente, se debe configurar `PORT=4000` en `pasarela-mensajes-node/.env` cuando la pasarela se utilice junto con el stack. Posteriormente, se ejecuta:

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

Finalmente, la compilación y el contexto principal del backend se verifican mediante la ejecución de pruebas:

```powershell
Set-Location .\proyecto-backEnd
.\mvnw.cmd test
```

Como evidencia funcional, también se deben verificar las réplicas con `docker service ls`, los eventos del worker en los logs de la pasarela, los correos recibidos, el código QR de TOTP, las transacciones Sandbox y los registros creados en PostgreSQL y PocketBase.

## Estructura del repositorio

```text
proyecto-backEnd/          API Spring Boot, seguridad, correo y reportes
proyecto-frontEnd/         Interfaz React de administrador y empleado
proyecto-ia/               Servicio Flask con DeepFace
pasarela-mensajes-node/    Pasarela de pagos y worker de eventos
docker-compose.yml         Definición del stack Docker Swarm
.env.example               Referencia de variables sensibles
```
