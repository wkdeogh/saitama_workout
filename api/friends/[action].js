import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getAdminApp } from "../../server/firebaseAdmin.js";
import { friendsService } from "../../server/friendsService.js";
import { createFriendsHandler } from "../../server/friendsHandler.js";
import { virtualService } from "../../server/virtualService.js";
export default createFriendsHandler({
  virtual: () => virtualService(getFirestore(getAdminApp())),
  verify: (token) => getAuth(getAdminApp()).verifyIdToken(token, true),
  service: () =>
    friendsService(getFirestore(getAdminApp()), getMessaging(getAdminApp())),
});
