import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "welcome": "Welcome to V.A.I.",
      "verification": "Verification",
      "getStarted": "Get Started",
      "benefits": {
        "title": "Why Choose V.A.I.?",
        "secure": "Bank-Level Security",
        "secureDesc": "Your data is encrypted and protected with industry-leading security measures",
        "fast": "Quick Verification",
        "fastDesc": "Complete your verification in minutes, not days",
        "trusted": "Trusted Platform",
        "trustedDesc": "Join thousands of verified users in our trusted community",
        "support": "24/7 Support",
        "supportDesc": "Our team is here to help you every step of the way"
      },
      "payment": {
        "title": "Choose Your Plan",
        "subtitle": "Select the verification tier that's right for you"
      },
      "success": {
        "title": "V.A.I. Created Successfully! 🎉",
        "subtitle": "Your Verified Anonymous Identity is ready to use",
        "referral": {
          "title": "Have a Referral Code?",
          "description": "Enter your 7-character referral code to unlock special benefits",
          "placeholder": "ABC1234",
          "submit": "Submit Code"
        }
      }
    }
  },
  es: {
    translation: {
      "welcome": "Bienvenido a V.A.I.",
      "verification": "Verificación",
      "getStarted": "Comenzar",
      "benefits": {
        "title": "¿Por qué elegir V.A.I.?",
        "secure": "Seguridad de Nivel Bancario",
        "secureDesc": "Tus datos están encriptados y protegidos con medidas de seguridad líderes en la industria",
        "fast": "Verificación Rápida",
        "fastDesc": "Completa tu verificación en minutos, no en días",
        "trusted": "Plataforma Confiable",
        "trustedDesc": "Únete a miles de usuarios verificados en nuestra comunidad confiable",
        "support": "Soporte 24/7",
        "supportDesc": "Nuestro equipo está aquí para ayudarte en cada paso del camino"
      },
      "payment": {
        "title": "Elige tu Plan",
        "subtitle": "Selecciona el nivel de verificación adecuado para ti"
      },
      "success": {
        "title": "¡Verificación Completa!",
        "subtitle": "Tu identidad ha sido verificada exitosamente",
        "referral": {
          "title": "¿Tienes un Código de Referido?",
          "description": "Ingresa tu código de referido de 7 caracteres para desbloquear beneficios especiales",
          "placeholder": "ABC1234",
          "submit": "Enviar Código"
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
