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
 *   FACEBOOK_PAGE_TOKEN — Token de acceso de PÁGINA (no de usuario, no de Usuario del
 *   Sistema) para "Inmobiliaria Fenix EC", con permisos pages_manage_posts +
 *   pages_read_engagement + pages_show_list. Se obtiene desde el Graph API Explorer
 *   (developers.facebook.com/tools/explorer), app "Fenix EC Bot Atencion" → sección
 *   "Tokens de acceso a la página" → elegir la página.
 *
 *   OJO 1: el WHATSAPP_TOKEN que ya existe para el bot NO sirve para esto — sus scopes
 *   son solo de WhatsApp Business, no incluyen permiso para publicar en la Página.
 *
 *   OJO 2 (importante): la Página tiene DOS ids distintos —
 *   `61593225308023` es el id "de perfil" (el que aparece en la URL pública,
 *   facebook.com/profile.php?id=61593225308023), pero el id real que entiende la
 *   Graph API para publicar es `1316143338243282` (FACEBOOK_PAGE_ID abajo). Si
 *   `me/accounts` o el debugger muestran un id distinto al de la URL, es normal —
 *   confirmado que ambos ids redirigen a la misma página real.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const auth = getAuth();

const FACEBOOK_PAGE_TOKEN = defineSecret("FACEBOOK_PAGE_TOKEN");

const GRAPH_API_VERSION = "v21.0";
// Id real de Graph API para "Inmobiliaria Fenix EC" — distinto del id "de perfil"
// (61593225308023) que aparece en la URL pública facebook.com/profile.php?id=...
// Ambos ids son la misma página; este es el que acepta la Graph API para publicar.
const FACEBOOK_PAGE_ID = "1316143338243282";

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
// Autenticación / rol admin (compartido entre todas las funciones callable)
// ---------------------------------------------------------------------------

async function verificarAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const usuarioDoc = await db.collection("User").doc(request.auth.uid).get();
  if (!usuarioDoc.exists || usuarioDoc.data()?.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede hacer esto.");
  }
}

// ---------------------------------------------------------------------------
// Publicar propiedad
// ---------------------------------------------------------------------------

exports.publicarPropiedad = onCall(
  { secrets: [FACEBOOK_PAGE_TOKEN], region: "us-central1", timeoutSeconds: 120 },
  async (request) => {
    await verificarAdmin(request);

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
      const pageToken = FACEBOOK_PAGE_TOKEN.value();
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

// ---------------------------------------------------------------------------
// Gestión de captadores — cuentas simples identificadas por iniciales (PC, CAPT1...)
//
// Firebase Auth exige un email para el login por email/password, así que se arma uno
// interno (no es un correo real, nadie lo necesita recibir) a partir de las iniciales:
// "PC" -> "pc@captacion.fenixec.local". La contraseña la escribe el admin en el
// formulario — nunca pasa por el código ni se guarda en ningún lado además de Auth.
// ---------------------------------------------------------------------------

const DOMINIO_CAPTADORES = "captacion.fenixec.local";

function emailDeIniciales(iniciales) {
  return `${iniciales.trim().toLowerCase()}@${DOMINIO_CAPTADORES}`;
}

exports.listarCaptadores = onCall({ region: "us-central1" }, async (request) => {
  await verificarAdmin(request);
  const snapshot = await db.collection("User").where("rol", "==", "captador").get();
  return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
});

exports.crearCaptador = onCall({ region: "us-central1" }, async (request) => {
  await verificarAdmin(request);

  const iniciales = (request.data?.iniciales || "").trim();
  const password = request.data?.password || "";

  if (!/^[A-Za-z0-9]{2,10}$/.test(iniciales)) {
    throw new HttpsError("invalid-argument", "Las iniciales deben ser solo letras/números, entre 2 y 10 caracteres.");
  }
  if (password.length < 6) {
    throw new HttpsError("invalid-argument", "La contraseña debe tener al menos 6 caracteres.");
  }

  const email = emailDeIniciales(iniciales);

  let usuarioAuth;
  try {
    usuarioAuth = await auth.createUser({ email, password, displayName: iniciales.toUpperCase() });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", `Ya existe un captador con las iniciales "${iniciales.toUpperCase()}".`);
    }
    logger.error("Error al crear captador en Auth:", error);
    throw new HttpsError("internal", `No se pudo crear la cuenta: ${error.message}`);
  }

  await db.collection("User").doc(usuarioAuth.uid).set({
    rol: "captador",
    iniciales: iniciales.toUpperCase(),
    email,
    fechaCreacion: FieldValue.serverTimestamp(),
    creadoPor: request.auth.uid,
  });

  logger.info(`Captador creado: ${iniciales.toUpperCase()} (${usuarioAuth.uid})`);
  return { uid: usuarioAuth.uid, iniciales: iniciales.toUpperCase(), email };
});

exports.actualizarInicialesCaptador = onCall({ region: "us-central1" }, async (request) => {
  await verificarAdmin(request);

  const uid = request.data?.uid;
  const iniciales = (request.data?.iniciales || "").trim();
  if (!uid) throw new HttpsError("invalid-argument", "Falta el uid del captador.");
  if (!/^[A-Za-z0-9]{2,10}$/.test(iniciales)) {
    throw new HttpsError("invalid-argument", "Las iniciales deben ser solo letras/números, entre 2 y 10 caracteres.");
  }

  // Nota: esto solo actualiza la etiqueta que se muestra en la lista — el email con el
  // que ese captador inicia sesión NO cambia (evita romper su acceso ya configurado).
  await db.collection("User").doc(uid).update({ iniciales: iniciales.toUpperCase() });
  return { ok: true };
});

exports.eliminarCaptador = onCall({ region: "us-central1" }, async (request) => {
  await verificarAdmin(request);

  const uid = request.data?.uid;
  if (!uid) throw new HttpsError("invalid-argument", "Falta el uid del captador.");

  const doc = await db.collection("User").doc(uid).get();
  if (doc.exists && doc.data()?.rol !== "captador") {
    throw new HttpsError("failed-precondition", "Esta cuenta no es de un captador — no se elimina por aquí.");
  }

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      logger.error("Error al eliminar captador de Auth:", error);
      throw new HttpsError("internal", `No se pudo eliminar la cuenta: ${error.message}`);
    }
  }
  await db.collection("User").doc(uid).delete();

  return { ok: true };
});
