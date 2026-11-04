import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "../../server/firebaseAdmin.js";
import {
  createSuperAccountHandler,
  superAccountService,
} from "../../server/superAccount.js";

export default createSuperAccountHandler({
  verify: (token) => getAuth(getAdminApp()).verifyIdToken(token, true),
  service: () =>
    superAccountService({
      db: getFirestore(getAdminApp()),
      auth: getAuth(getAdminApp()),
    }),
});
