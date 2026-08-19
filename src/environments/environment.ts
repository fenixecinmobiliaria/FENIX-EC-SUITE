/**
 * Config de Firebase del proyecto REAL `finalinmobiliaria` — el mismo que usan
 * `inmobiliaria_fenix` (sitio público + panel admin) y el bot de WhatsApp.
 *
 * No es un secreto: es la config pública de cliente web de Firebase, protegida por las
 * reglas de seguridad de Firestore/Storage, no por ocultar estos valores. Se copió tal
 * cual de `inmobiliaria_fenix/src/app/app.config.ts` para apuntar a los mismos datos.
 */
export const environment = {
  production: false,
  firebase: {
    projectId: 'finalinmobiliaria',
    appId: '1:961419030404:web:51f12231b7121f9f2577d1',
    apiKey: 'AIzaSyCQOl7UQEncSw_aAoZINPCxM-6VVb8SY3A',
    storageBucket: 'finalinmobiliaria.firebasestorage.app',
    authDomain: 'finalinmobiliaria.firebaseapp.com',
    messagingSenderId: '961419030404',
    measurementId: 'G-CCDE50PM7L',
  },
};
