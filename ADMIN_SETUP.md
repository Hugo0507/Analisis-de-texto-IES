# 🔐 Configuración de Django Admin

Esta guía te ayudará a configurar el acceso al panel de administración de Django en Hugging Face Spaces.

## 🎯 URL del Admin

Una vez configurado, podrás acceder al panel de administración en:

**https://hugo0507-analisis-ies-backend.hf.space/admin/**

---

## ⚙️ Configurar Credenciales en Hugging Face Spaces

El sistema crea automáticamente un superusuario durante el despliegue usando variables de entorno.

### Paso 1: Ve a Settings de tu Space

1. Abre: https://huggingface.co/spaces/Hugo0507/analisis-ies-backend
2. Haz clic en **Settings** (⚙️ arriba a la derecha)
3. Scroll hasta **"Repository secrets"**

### Paso 2: Agregar las Variables de Entorno

Agrega estas **3 variables secretas**:

#### Variable 1: Username
```
Name:  DJANGO_SUPERUSER_USERNAME
Value: admin
```
(O el nombre de usuario que prefieras)

#### Variable 2: Email
```
Name:  DJANGO_SUPERUSER_EMAIL
Value: tu-email@example.com
```
(Usa tu email real)

#### Variable 3: Password
```
Name:  DJANGO_SUPERUSER_PASSWORD
Value: TuPasswordSeguro123!
```
**IMPORTANTE:**
- Usa una contraseña **fuerte y única**
- **NO uses contraseñas que uses en otros sitios**
- Mínimo 8 caracteres
- Combina letras mayúsculas, minúsculas, números y símbolos

### Paso 3: Guardar y Redesplegar

1. Haz clic en **"Add secret"** para cada variable
2. El Space se **redesplegar automáticamente** (2-3 minutos)
3. Durante el redespliegue, el script creará el superusuario

---

## ✅ Verificar que Funcionó

### 1. Revisa los Logs

Ve a la pestaña **"Logs"** en tu Space de HF y busca:

```
👤 Ensuring superuser exists...
✅ Successfully created superuser "admin"
   Email: tu-email@example.com
   You can now login at /admin/
```

Si ves esto, ¡el superusuario fue creado exitosamente!

### 2. Intenta Iniciar Sesión

1. Ve a: https://hugo0507-analisis-ies-backend.hf.space/admin/
2. Ingresa:
   - **Username:** El valor que pusiste en `DJANGO_SUPERUSER_USERNAME`
   - **Password:** El valor que pusiste en `DJANGO_SUPERUSER_PASSWORD`
3. Haz clic en **"Log in"**

Si todo está correcto, deberías ver el panel de administración de Django.

---

## 🎛️ ¿Qué Puedes Hacer en el Admin?

Una vez dentro, podrás:

- ✅ **Ver todos los documentos** cargados desde Google Drive
- ✅ **Gestionar usuarios** (crear, editar, eliminar)
- ✅ **Ver resultados del pipeline** (análisis, factores, etc.)
- ✅ **Monitorear el sistema** (logs, estadísticas)
- ✅ **Ejecutar acciones administrativas** manualmente

---

## 🔒 Seguridad

### Recomendaciones:

1. **Usa contraseñas fuertes:**
   - Mínimo 12 caracteres
   - Mezcla letras, números y símbolos
   - Usa un generador de contraseñas

2. **No compartas las credenciales:**
   - Las variables de entorno son secretas
   - Solo tú deberías tener acceso

3. **Cambia la contraseña periódicamente:**
   - Cada 3-6 meses
   - Actualiza la variable en HF Spaces
   - El Space se redespliegará

4. **Monitorea el acceso:**
   - Revisa los logs regularmente
   - Busca actividad sospechosa

---

## 🔧 Troubleshooting

### Problema 1: "Please enter a correct username and password"

**Causas posibles:**
- Credenciales incorrectas
- Variables de entorno no configuradas
- Superusuario no fue creado

**Solución:**
1. Verifica que las 3 variables estén configuradas en HF Spaces Settings
2. Revisa los logs para ver si el superusuario fue creado
3. Si los logs muestran error, verifica que `DJANGO_SUPERUSER_PASSWORD` esté configurada
4. Redesplega el Space manualmente

### Problema 2: "No se creó el superusuario"

**Si en los logs ves:**
```
⚠️ No DJANGO_SUPERUSER_PASSWORD environment variable set. Skipping superuser creation.
```

**Solución:**
1. Agrega la variable `DJANGO_SUPERUSER_PASSWORD` en HF Spaces Settings
2. Espera a que se redespliegue (2-3 minutos)
3. Verifica los logs de nuevo

### Problema 3: "El superuser ya existe pero olvidé la contraseña"

**Solución: Cambiar la contraseña**

1. Ve a HF Spaces Settings → Repository secrets
2. Elimina `DJANGO_SUPERUSER_USERNAME` (temporalmente)
3. Cambia `DJANGO_SUPERUSER_PASSWORD` al nuevo password
4. Espera al redespliegue
5. Vuelve a agregar `DJANGO_SUPERUSER_USERNAME` con un nombre DIFERENTE
6. Esto creará un nuevo superusuario con las nuevas credenciales

**Alternativa:** Conectarte a la base de datos directamente (requiere conocimientos avanzados)

---

## 📚 Recursos Adicionales

- [Django Admin Documentation](https://docs.djangoproject.com/en/stable/ref/contrib/admin/)
- [Hugging Face Spaces Secrets](https://huggingface.co/docs/hub/spaces-overview#managing-secrets)
- [Django User Management](https://docs.djangoproject.com/en/stable/topics/auth/)

---

## 💡 Credenciales Recomendadas (Ejemplo)

**Para desarrollo/testing:**
```
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@tesis-analisis.com
DJANGO_SUPERUSER_PASSWORD=TestPassword123!
```

**Para producción:**
```
DJANGO_SUPERUSER_USERNAME=hugo_admin
DJANGO_SUPERUSER_EMAIL=tu-email-real@gmail.com
DJANGO_SUPERUSER_PASSWORD=[Usa un generador de passwords]
```

---

## ✨ Resumen Rápido

1. **Agregar 3 variables en HF Spaces Settings:**
   - `DJANGO_SUPERUSER_USERNAME`
   - `DJANGO_SUPERUSER_EMAIL`
   - `DJANGO_SUPERUSER_PASSWORD`

2. **Esperar redespliegue** (2-3 minutos)

3. **Verificar logs** para confirmar creación

4. **Login en:** https://hugo0507-analisis-ies-backend.hf.space/admin/

¡Listo! 🎉
