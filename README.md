# OMNI Lunar · iPhone PWA

Beta instalable desde Safari (iOS 16.4+ para Web Push).

1. Publicar Pages: Settings > Pages > Deploy from a branch > main > root.
2. Crear secreto OMNI_CONFIG con JSON privado: geminiKey, vapidPublicKey, vapidPrivateKey.
3. Cada participante instala, acepta notificaciones y copia su código privado desde Ajustes. El administrador registra dichos objetos en un array JSON en el secreto OMNI_DEVICES.
4. Actions > OMNI Lunar · Resonancias y avisos > Run workflow, test=true para verificar.

32 horarios aleatorios planificados por día, separación de 15 minutos, más hitos lunares. GitHub Actions puede retrasar u omitir ejecuciones; no garantiza 32 entregas. Registro manual para la beta. No publicar claves ni registros. Sin widgets iOS nativos ni login Google real. Migrar a infraestructura adecuada antes de uso comercial.
