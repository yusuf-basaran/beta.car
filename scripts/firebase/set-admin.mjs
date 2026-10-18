import { initializeApp, applicationDefault, getAuth, getFirestore } from './admin.mjs';
const [project, email] = process.argv.slice(2);
if (!project || !email) throw Error('Proje kimliği ve doğrulanmış yönetici e-postası gerekli');
initializeApp({ projectId: project, credential: applicationDefault() });
const user = await getAuth().getUserByEmail(email);
if (!user.emailVerified) throw Error('Yönetici önce e-posta adresini doğrulamalı');
await getFirestore()
  .collection('_yetkiler')
  .doc(user.uid)
  .set({ kullanici_id: user.uid, admin: true, engelli: false });
console.log('Yönetici yetkisi kaydedildi.');
