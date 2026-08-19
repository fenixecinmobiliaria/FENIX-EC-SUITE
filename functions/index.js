/**
 * Cloud Functions de Fenix EC Suite (proyecto Firebase `finalinmobiliaria`).
 *
 * Codebase separado ("fenixecsuite") del que usa `inmobiliaria_fenix/functions`
 * ("default", el bot de WhatsApp) — mismo proyecto Firebase, deploys independientes,
 * para no tocar el repo viejo hasta que todo esté listo.
 *
 * Función principal: `publicarPropiedad` — se llama desde la pantalla de aprobación
 * real (/real/aprobar/:id) cuando un admin le da clic a "Aprobar y publicar". Hace,
 * en el servidor (no en el navegador, para no exponer el token de la Página):
 *   1. Verifica que quien llama es un admin autenticado.
 *   2. Publica las fotos + una descripción armada en la Página de Facebook real.
 *   3. Cambia Estado de "Borrador" a "Venta"/"Renta" — recién ahí queda visible en
 *      el sitio público y el bot de WhatsApp puede recomendarla.
 *
 * Secreto requerido (configurar con `firebase functions:secrets:set FACEBOOK_PAGE_TOKEN`):
 *   FACEBOOK_PAGE_TOKEN — Token de acceso de la PÁGINA de Facebook "Inmobiliaria Fenix EC"
 *   (id 61593225308023), con permisos pages_manage_posts + pages_read_engagement.
 *   OJO: el WHATSAPP_TOKEN que ya existe para el bot NO sirve para esto — sus scopes
 *   son solo de WhatsApp Business (business_management, whatsapp_business_management,
 *   whatsapp_business_messaging), no incluyen permiso para publicar en la Página.
 *   Hay que generar un token de Página nuevo desde Meta Business Suite (con el mismo
 *   Usuario del Sistema "Employee", una vez que tenga asignado el rol de "Editor de
 *   contenido" o similar sobre la Página) y guardarlo como este secreto.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const FACEBOOK_PAGE_TOKEN = defineSecret("FACEBOOK_PAGE_TOKEN");

const GRAPH_API_VERSION = "v21.0";
const FACEBOOK_PAGE_ID = "61593225308023"; // Página "Inmobiliaria Fenix EC"

const NEGOCIO = {
  telefonoHumano: "098 092 9669",
  sitioWeb: "https://www.inmobiliariafenix.com",
};

// ---------------------------------------------------------------------------
// Texto del post
// ---------------------------------------------------------------------------

function construirDescripcion(propiedad) {
  const modalidad = propiedad.Precio_Venta ? "VENTA" : "RENTA";
  const precio = propiedad.Precio_Venta
    ? `$${propiedad.Precio_Venta}`
    : `$${propiedad.Precio_Renta}/mes`;

  const detalles = [
    propiedad.HAB && propiedad.HAB !== "0" ? `🛏️ ${propiedad.HAB} habitaciones` : null,
    propiedad.BNO && propiedad.BNO !== "0" ? `🛁 ${propiedad.BNO} baños` : null,
    propiedad.AreaCons && propiedad.AreaCons !== "0" ? `📐 ${propiedad.AreaCons} m² construidos` : null,
    propiedad.AreaTerreno && propiedad.AreaTerreno !== "0" ? `🌳 ${propiedad.AreaTerreno} m² terreno` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const partes = [
    `🏠 ${propiedad.TipoPropiedad} en ${modalidad} — ${propiedad.Direccion_Sector}, ${propiedad.CIUDAD}`,
    `💰 ${precio}`,
    detalles || null,
    propiedad.Extras || null,
    `📞 Contáctanos: ${NEGOCIO.telefonoHumano}`,
    `🌐 ${NEGOCIO.sitioWeb}`,
    `Código: ${propiedad.IPD}`,
  ].filter(Boolean);

  return partes.join("\n\n");
}

// ---------------------------------------------------------------------------
// Facebook Graph API
// ---------------------------------------------------------------------------

async function llamarGraphApi(path, params) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      `Graph API (${path}) falló: ${data.error?.message || res.statusText} (código ${data.error?.code ?? res.status})`
    );
  }
  return data;
}

/**
 * El secreto FACEBOOK_PAGE_TOKEN guarda el token del Usuario del Sistema "Employee"
 * (el que tiene asignado permiso de "Contenido" sobre la Página). Facebook NO deja
 * publicar en una Página usando ese token directo — hay que cambiarlo por el token
 * específico de la Página, que se obtiene con esta llamada. Se hace en cada
 * publicación (no se cachea) para no depender de que alguien lo regenere a mano.
 */
async function obtenerTokenDePagina(tokenSistema) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${FACEBOOK_PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(tokenSistema)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(
      `No se pudo obtener el token de la Página a partir del Usuario del Sistema: ${data.error?.message || res.statusText} (código ${data.error?.code ?? res.status}). Revisa que "Employee" siga teniendo el permiso de Contenido asignado sobre la Página.`
    );
  }
  return data.access_token;
}

/** Sube una foto sin publicarla todavía (Facebook la descarga directo de la URL de Storage). */
async function subirFotoSinPublicar(pageToken, imageUrl) {
  const data = await llamarGraphApi(`${FACEBOOK_PAGE_ID}/photos`, {
    url: imageUrl,
    published: false,
    access_token: pageToken,
  });
  return data.id;
}

/** Crea el post final adjuntando todas las fotos ya subidas. */
async function crearPostConFotos(pageToken, mensaje, photoIds) {
  const data = await llamarGraphApi(`${FACEBOOK_PAGE_ID}/feed`, {
    message: mensaje,
    attached_media: photoIds.map((id) => ({ media_fbid: id })),
    access_token: pageToken,
  });
  return data.id; // formato "{page-id}_{post-id}"
}

function urlDelPost(postId) {
  const [, soloId] = postId.split("_");
  return soloId ? `https://www.facebook.com/${FACEBOOK_PAGE_ID}/posts/${soloId}` : null;
}

// ---------------------------------------------------------------------------
// Función callable
// ---------------------------------------------------------------------------

exports.publicarPropiedad = onCall(
  { secrets: [FACEBOOK_PAGE_TOKEN], region: "us-central1", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión para publicar.");
    }

    const usuarioDoc = await db.collection("User").doc(request.auth.uid).get();
    if (!usuarioDoc.exists || usuarioDoc.data()?.rol !== "admin") {
      throw new HttpsError("permission-denied", "Solo un administrador puede aprobar y publicar.");
    }

    const propiedadId = request.data?.propiedadId;
    if (!propiedadId) {
      throw new HttpsError("invalid-argument", "Falta el id de la propiedad.");
    }

    const docRef = db.collection("Propiedades").doc(propiedadId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Esta propiedad ya no existe en Firestore.");
    }

    const propiedad = snap.data();
    const esBorrador = propiedad.Estado === "Borrador";

    const imagenes = propiedad.imagenes || [];
    if (imagenes.length === 0) {
      throw new HttpsError("failed-precondition", "La propiedad no tiene fotos para publicar.");
    }

    // Dos orígenes posibles para este mismo botón:
    //  - Borrador (pantalla de aprobación de Fenix EC Suite): al publicar en Facebook
    //    con éxito, activa la propiedad (Estado -> Venta/Renta).
    //  - Ya activa (botón "Facebook" del panel Mantenimiento del sitio, para una
    //    propiedad que ya está en Venta/Renta/etc.): solo vuelve a publicar en
    //    Facebook, sin tocar su Estado actual.
    const nuevoEstado = esBorrador ? (propiedad.Precio_Venta ? "Venta" : "Renta") : propiedad.Estado;
    const mensaje = construirDescripcion(propiedad);

    let postId;
    try {
      const pageToken = await obtenerTokenDePagina(FACEBOOK_PAGE_TOKEN.value());
      logger.info(`Publicando ${imagenes.length} fotos en Facebook para ${propiedadId}...`);
      const photoIds = [];
      for (const url of imagenes) {
        photoIds.push(await subirFotoSinPublicar(pageToken, url));
      }
      postId = await crearPostConFotos(pageToken, mensaje, photoIds);
    } catch (error) {
      logger.error(`Fallo al publicar en Facebook la propiedad ${propiedadId}:`, error);
      const notaEstado = esBorrador
        ? "La propiedad sigue en Borrador, nada se publicó todavía."
        : "El Estado de la propiedad no se modificó.";
      throw new HttpsError("internal", `No se pudo publicar en Facebook: ${error.message}. ${notaEstado}`);
    }

    // Recién aquí, con el post de Facebook ya confirmado, la dejamos visible en
    // el sitio y el bot — así nunca queda "publicada" a medias.
    await docRef.update({
      Estado: nuevoEstado,
      facebookPostId: postId,
      facebookPostUrl: urlDelPost(postId),
    });

    logger.info(`Propiedad ${propiedadId} publicada. Estado -> ${nuevoEstado}. Post: ${postId}`);

    return { ok: true, estado: nuevoEstado, facebookPostUrl: urlDelPost(postId) };
  }
);
