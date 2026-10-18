export async function createClient(cfg) {
  let config = cfg.firebase;
  if (!config?.projectId) {
    try {
      const r = await fetch('/__/firebase/init.json');
      if (r.ok) config = await r.json();
    } catch {}
  }
  if (!config?.projectId) return null;
  const base = 'https://www.gstatic.com/firebasejs/13.0.0/';
  const [appSdk, authSdk, fs, storageSdk] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js'),
    import(base + 'firebase-storage.js'),
  ]);
  const app = appSdk.initializeApp(config);
  const auth = authSdk.getAuth(app);
  const db = fs.getFirestore(app);
  const storage = storageSdk.getStorage(app);
  if (cfg.emulators) {
    authSdk.connectAuthEmulator(auth, `http://${cfg.emulators.host}:9099`, {
      disableWarnings: true,
    });
    fs.connectFirestoreEmulator(db, cfg.emulators.host, 8085);
    storageSdk.connectStorageEmulator(storage, cfg.emulators.host, 9199);
  }
  await auth.authStateReady();
  if (auth.currentUser) {
    await authSdk.reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
  }
  const user = () =>
    auth.currentUser && { id: auth.currentUser.uid, email: auth.currentUser.email };
  async function call(data) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const r = await fetch(cfg.api || '/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (!r.ok || result.error) throw Error(result.error?.message || 'İşlem tamamlanamadı');
      return result;
    } catch (error) {
      return { data: null, error };
    }
  }
  const result = async (fn) => {
    try {
      return { data: await fn(), error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
  let verification;
  const client = {
    projectId: config.projectId,
    auth: {
      getUser: async () => ({ data: { user: auth.currentUser?.emailVerified ? user() : null } }),
      signOut: () => result(() => authSdk.signOut(auth)),
      signInWithPassword: ({ email, password }) =>
        result(async () => {
          await authSdk.signInWithEmailAndPassword(auth, email, password);
          if (!auth.currentUser.emailVerified) {
            await authSdk.signOut(auth);
            throw Error('E-posta adresinizi doğrulayın');
          }
          return { user: user() };
        }),
      signUp: ({ email, password, options }) =>
        result(async () => {
          try {
            await authSdk.createUserWithEmailAndPassword(auth, email, password);
          } catch (error) {
            if (error.code !== 'auth/email-already-in-use') throw error;
            await authSdk.signInWithEmailAndPassword(auth, email, password);
            if (auth.currentUser.emailVerified) throw error;
          }
          const r = await call({ name: 'profil_kaydet', data: options.data });
          if (r.error) throw r.error;
          await authSdk.sendEmailVerification(auth.currentUser, { url: options.emailRedirectTo });
          return { user: user() };
        }),
      resetPasswordForEmail: (email, options) =>
        result(() => authSdk.sendPasswordResetEmail(auth, email, { url: options.redirectTo })),
      updateUser: (data) =>
        result(async () => {
          if (data.password) return authSdk.updatePassword(auth.currentUser, data.password);
          if (data.phone) {
            let node = document.getElementById('firebase-recaptcha');
            if (!node) {
              node = document.createElement('div');
              node.id = 'firebase-recaptcha';
              document.body.append(node);
            }
            const verifier = new authSdk.RecaptchaVerifier(auth, node, { size: 'invisible' });
            try {
              verification = await new authSdk.PhoneAuthProvider(auth).verifyPhoneNumber(
                data.phone,
                verifier,
              );
            } finally {
              verifier.clear();
            }
          }
        }),
      verifyOtp: ({ token }) =>
        result(async () => {
          if (!verification) throw Error('Önce doğrulama kodu isteyin');
          await authSdk.updatePhoneNumber(
            auth.currentUser,
            authSdk.PhoneAuthProvider.credential(verification, token),
          );
          verification = null;
        }),
    },
    rpc: (name, data = {}) => call({ name, data }),
    from(name) {
      const data = { table: name, op: 'read', filters: [], order: [] };
      let pending;
      const q = {
        select(cols = '*', options = {}) {
          data.cols = cols;
          data.head = !!options.head;
          return q;
        },
        eq(k, v) {
          data.filters.push([k, 'eq', v]);
          return q;
        },
        neq(k, v) {
          data.filters.push([k, 'neq', v]);
          return q;
        },
        in(k, v) {
          data.filters.push([k, 'in', v]);
          return q;
        },
        or(value) {
          data.or = value;
          return q;
        },
        order(k, options = {}) {
          data.order.push([k, options.ascending !== false]);
          return q;
        },
        limit(n) {
          data.limit = n;
          return q;
        },
        single() {
          data.one = 'required';
          return q;
        },
        maybeSingle() {
          data.one = 'optional';
          return q;
        },
        insert(value) {
          data.op = 'insert';
          data.value = value;
          return q;
        },
        upsert(value, options = {}) {
          data.op = 'upsert';
          data.value = value;
          data.ignoreDuplicates = !!options.ignoreDuplicates;
          return q;
        },
        update(value) {
          data.op = 'update';
          data.value = value;
          return q;
        },
        delete() {
          data.op = 'delete';
          return q;
        },
        then(ok, fail) {
          pending ||= call({ query: data });
          return pending.then(ok, fail);
        },
      };
      return q;
    },
    storage: {
      from(bucket) {
        return {
          upload: (name, file) =>
            result(async () => {
              await storageSdk.uploadBytes(storageSdk.ref(storage, `${bucket}/${name}`), file, {
                contentType: file.type,
              });
              return { path: name };
            }),
          getPublicUrl: (name) => ({
            data: {
              publicUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${encodeURIComponent(bucket + '/' + name)}?alt=media`,
            },
          }),
          createSignedUrl: async (name) => {
            const r = await call({ name: 'dosya_url', data: { bucket, file: name } });
            return r.error ? r : { data: { signedUrl: r.data }, error: null };
          },
        };
      },
    },
    channel() {
      const subscriptions = [],
        stops = [];
      const channel = {
        on(event, options, fn) {
          subscriptions.push({ options, fn });
          return channel;
        },
        subscribe() {
          for (const { options, fn } of subscriptions) {
            let target;
            const filters = [];
            if (options.filter) {
              const [field, value] = options.filter.split('=eq.');
              if (field === 'id') target = fs.doc(db, options.table, value);
              else filters.push(fs.where(field, '==', value));
            }
            if (options.table === 'mesajlar')
              filters.push(fs.where('katilimcilar', 'array-contains', auth.currentUser.uid));
            if (options.table === 'bildirimler' && !options.filter)
              filters.push(fs.where('kullanici_id', '==', auth.currentUser.uid));
            target ||= fs.query(fs.collection(db, options.table), ...filters);
            let initial = true;
            stops.push(
              fs.onSnapshot(
                target,
                (snap) => {
                  if (initial) {
                    initial = false;
                    return;
                  }
                  fn({ new: typeof snap.data === 'function' ? snap.data() : null });
                },
                (error) => console.error(error.code),
              ),
            );
          }
          return channel;
        },
        unsubscribe() {
          stops.splice(0).forEach((stop) => stop());
        },
      };
      return channel;
    },
    removeChannel: (channel) => channel.unsubscribe(),
  };
  return client;
}
